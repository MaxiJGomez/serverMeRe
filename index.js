const http = require("http");

const server = http.createServer();

const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

var listaAlertas = []; // ===> Lista de todas las salas privadas de cada alerta

io.on("connection", (socket) => {
  socket.on("ubicacion_privada", (data) => {
    if (data.tipoApp === "victima") {
      socket.join(data.idSala); // ===> Crea una sala APP victima
      agregarAlertas(data); // ===> Agrega las salas creadas a la listas de Salas
    } else {
      const existeSala = listaAlertas.some((el) => el.idSala === data.idSala); // ===> Comprueba que exista una sala ya creada
      if (existeSala) {
        socket.join(data.idSala); // ===> Se une a una sala existente APP policia
      } else {
        socket.join(data.idSala); // ===> Al no coincidir con el código de la sala de la vícitima, crea una sala  nueva para emitir un mensaje de error y después eliminar la misma sala
        io.to(data.idSala).emit("ubicacionPrivada", "Código inexistente"); // ===> envía mensaje de error
        eliminarAlertas(data.idSala);
      }
    }
  });
  socket.on("ubicacion_actual", (data) => {
    console.log(data);
    io.to(data.idSala).emit("ubicacionPrivada", data); // ===> envía los datos (lat, long, etc.) del usu a una sala de alerta
  });

  socket.on("get_room_list", () => {
    io.emit("room_list", listaAlertas); // ===> envío de todas las Salas activas
  });

  socket.on("eliminar_sala", (data) => {
    // ===> Filtrar el array para mantener solo las alertas que no tienen el idSala que deseas eliminar
    eliminarAlertas(data);
  });

  const eliminarAlertas = (idSala) => {
    listarAlertas = listaAlertas.filter((alerta) => alerta.idSala !== idSala); // ===> Funcion para eliminar una Sala
    console.log(listaAlertas);
  };
  const agregarAlertas = (nombreAlerta) => {
    const existe = listaAlertas.some((el) => el.idSala === nombreAlerta.idSala); // ===>controla que el idSala del objeto nuevo no se repita en algún elemento del array listaAlertas

    if (!existe || !listaAlertas) {
      listaAlertas.push({
        idSala: nombreAlerta.idSala,
        nombre: nombreAlerta.nombre,
      }); // ===> agrega el objeto nuevo al array listaAlertas en caso de que no exista uno con el mismo idSala
      console.log(listaAlertas);
    }
  };
});

server.listen(5050, () => console.log(server.address()));
