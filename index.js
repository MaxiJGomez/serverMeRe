const http = require("http");

const server = http.createServer();

const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

var listaAlertas = []; // ===> Lista de todas las salas privadas de cada alerta


io.on("connection", (socket) => {
  socket.on("creacion_sala", (data) => {
    if (data.tipoApp === "victima") {
      const codigoSala =generarCodigoUnico(listaAlertas)
      socket.join(data.idUsu); // ===> Crea sala privada de la victima
      socket.join(codigoSala)
      agregarAlertas({...data, codigoSala}); // ===> Agrega las salas creadas a la listas de Salas
      io.to(data.idUsu).emit("codigoSala", codigoSala)
    } else {
      const existeSala = listaAlertas.some((el) => el.codigoSala === data.codigoSala); // ===> Comprueba que exista una sala ya creada
      if (existeSala) {
        socket.join(data.codigoSala); // ===> Se une a sala de victima APP policia
        socket.join(`${data.codigoSala}policia`); // ===> Se une o crea sala paralela a una existente APP policia
        io.to(data.codigoSala).emit("ubicacionPrivada", obtenerUbiInicial(data.codigoSala))
      } else {
        socket.join(data.idUsu); // ===> Al no coincidir con el código de la sala de la vícitima, crea una sala  nueva para emitir un mensaje de error y después eliminar la misma sala
        io.to(data.idUsu).emit("ubicacionPrivada", "Código inexistente"); // ===> envía mensaje de error
        eliminarAlertas(data.idUsu);
      }
    }
  });

  socket.on("ubicacion_actual", (data) => {
    console.log(data)
    if(data.tipoApp === "victima"){
      io.to(data.codigoSala).emit("ubicacionPrivada", data); // ===> envía los datos (lat, long, etc.) del usu a una sala de alerta
    }else if(data.tipoApp === "policia"){

      io.to(data.codigoSala).emit("ubicacionPrivadaPolicias", data); // ===> envía los datos (lat, long, etc.) del policia a una sala de alerta
    }
  });

  socket.on("get_room_list", () => {
    io.emit("room_list", listaAlertas); // ===> envío de todas las Salas activas
  });

  socket.on("eliminar_sala", (data) => {
    // ===> Filtrar el array para mantener solo las alertas que no tienen el idSala que deseas eliminar
    eliminarAlertas(data);
  });

  const eliminarAlertas = (codigoSala) => {
    listarAlertas = listaAlertas.filter((alerta) => alerta.codigoSala !== codigoSala); // ===> Funcion para eliminar una Sala
    console.log(listaAlertas);
  };
  const agregarAlertas = (nombreAlerta) => {
    const existe = listaAlertas.some((el) => el.idUsu === nombreAlerta.idUsu); // ===>controla que el idSala del objeto nuevo no se repita en algún elemento del array listaAlertas

    if (!existe || !listaAlertas) {
      listaAlertas.push({
        idUsu: nombreAlerta.idUsu,
        nombre: nombreAlerta.nombre,
        apellido: nombreAlerta.apellido,
        codigoSala: nombreAlerta.codigoSala,
        latitud: nombreAlerta.latitudInicial,
        longitud: nombreAlerta.longitudInicial
      }); // ===> agrega el objeto nuevo al array listaAlertas en caso de que no exista uno con el mismo idSala
      console.log(listaAlertas);
    }
  };
});


const generarCodigoSala =() => {
  // Generar un número de 4 dígitos al azar
  const codigoSala = Math.floor(1000 + Math.random() * 9000).toString();

  return codigoSala;
}

const generarCodigoUnico=(array)=>{
  let nuevoCodigo;
  let existeCodigo = false

  do {
    // Generar un nuevo código de sala
    nuevoCodigo = generarCodigoSala();

    // Verificar si el nuevo código ya existe en el array
    existeCodigo = array.some(item => item.codigoSala === nuevoCodigo);

    // Repetir el proceso si el código ya existe
  } while (existeCodigo);

  return nuevoCodigo;
}

const obtenerUbiInicial =(codigoSala)=>{
  // Buscar el objeto con el código de sala dado
  const objetoEncontrado = listaAlertas.find(item => item.codigoSala === codigoSala);

  // Devolver el idUsu si se encontró el objeto, o null si no se encontró
  return objetoEncontrado;
}


server.listen(5050, () => console.log(server.address()));
