const http = require("http");

const server = http.createServer();

const io = require("socket.io")(server, {
  cors: { origin: "*" },
});

const listaAlertas = []; // ===> Lista de todas las salas privadas de cada alerta

io.on("connection", (socket) => {
  socket.on("ubicacion_privada", (data) => {
    socket.join(data.idSala); // ===> Para crear / unirse a una sala
    agregarAlertas(data); // ===> Agrega las salas creadas a la listas de Salas
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
    listaAlertas = listaAlertas.filter(
      (alerta) => alerta.idSala !== data.idSala
    );
    eliminarAlertas(data);
  });

  const eliminarAlertas = (nombreAlerta) => {
    console.log(`Elimino sala: ${nombreAlerta}`);
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
