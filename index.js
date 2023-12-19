const http = require("http");
const PORT = process.env.PORT || 10000

const server = http.createServer();


const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

var listaAlertas = []; // ===> Lista de todas las salas privadas de cada alerta
var listaPolicias = {}

io.on("connection", (socket) => {
  socket.on("creacion_sala", (data) => {
    if (data.tipoApp === "victima") {
      const codigoSala =generarCodigoUnico(listaAlertas)
      socket.join(data.idUsu); // ===> Crea sala privada de la victima
      socket.join(codigoSala)
      agregarAlertas({...data, codigoSala}); // ===> Agrega las salas creadas a la listas de Salas
      console.log(listaAlertas)
      io.to(data.idUsu).emit("codigoSala", codigoSala)
    } else {
      const existeSala = listaAlertas.some((el) => el.codigoSala === data.codigoSala); // ===> Comprueba que exista una sala ya creada
      if (existeSala) {
        socket.join(data.codigoSala); // ===> Se une a sala de victima APP policia
        socket.join(`${data.codigoSala}policia`); // ===> Se une o crea sala paralela a una existente APP policia
        data.tipoApp === "policia" ? listaPolicias[obtenerIdUsu(data.codigoSala)].policias[data.idDispo] = {ubicacion: []} : ()=>{}
        
        io.to(data.codigoSala).emit("ubicacionPrivada", obtenerUbiInicial(data.codigoSala))
      } else {
        socket.join(data.idUsu); // ===> Al no coincidir con el código de la sala de la vícitima, crea una sala  nueva para emitir un mensaje de error y después eliminar la misma sala
        io.to(data.idUsu).emit("ubicacionPrivada", "Código inexistente"); // ===> envía mensaje de error
        eliminarAlertas(data.idUsu);
      }
    }
  });

  socket.on("ubicacion_actual", (data) => {
    if(data.tipoApp === "victima"){
      io.to(data.codigoSala).emit("ubicacionPrivada", data); // ===> envía los datos (lat, long, etc.) del usu a una sala de alerta
    }else if(data.tipoApp === "policia"){
      listaPolicias[obtenerIdUsu(data.codigoSala)].policias[data.idDispo].ubicacion.push({latitud: data.latitud, longitud: data.longitud})
      const ultimasUbis = ultimaUbiPolicia(data.codigoSala)
      io.to(`${data.codigoSala}policia`).emit("ubicacionPrivadaPolicias", ultimasUbis); // ===> envía los datos (lat, long, etc.) del policia a una sala de alerta
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
      }); 
      const id = nombreAlerta.idUsu
      listaPolicias[id] = {codigoSala: nombreAlerta.codigoSala, policias: {}}
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
  // Devolver el objeto completo con la ubicación inicial
  return objetoEncontrado;
}

const obtenerIdUsu =(codigoSala)=>{
 // Buscar el objeto con el código de sala dado
  const objetoEncontrado = listaAlertas.find(item => item.codigoSala === codigoSala);
 // Devolver el idUsu si se encontró el objeto, o null si no se encontró
  return objetoEncontrado.idUsu;
}

const ultimaUbiPolicia = (codigoSala)=>{
  let resultado = [];
  const objeto = listaPolicias[obtenerIdUsu(codigoSala)]
    // Verificar si el objeto tiene las propiedades esperadas
    if (objeto && objeto.policias) {
      // Iterar sobre las propiedades del objeto "policias"
      for (const idDispo in objeto.policias) {
          if (objeto.policias.hasOwnProperty(idDispo)) {
              const policia = objeto.policias[idDispo];
              // Verificar si el objeto policia tiene la propiedad "ubicacion" y es un array
              if (policia && policia.ubicacion && Array.isArray(policia.ubicacion)) {
                  // Obtener el último elemento del array "ubicacion"
                  const ubicacion = policia.ubicacion.length > 0 ? policia.ubicacion[policia.ubicacion.length - 1] : null;
                  if (ubicacion && typeof ubicacion === 'object') {
                    // Extraer las propiedades deseadas y agregar un nuevo objeto con "idDispo" al resultado
                    const latitud = ubicacion.latitud !== undefined ? ubicacion.latitud : null;
                    const longitud = ubicacion.longitud !== undefined ? ubicacion.longitud : null;
                    resultado.push({ idDispo, latitud, longitud });
                }
              }
          }
      }
  } else {
      console.error('El objeto proporcionado no tiene la estructura esperada.');
  }
  return resultado;
}



server.listen(PORT, () => console.log(server.address()));
