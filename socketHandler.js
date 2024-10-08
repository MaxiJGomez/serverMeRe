import {
  agregarAlertas,
  eliminarAlertas,
  obtenerIdUsu,
  obtenerUbiInicial,
} from "./alertasManager.js";

export const manejarConexiones = (socket, io, estado) => {
  socket.on("creacion_sala", (data) => {
    if (data.tipoApp === "victima") {
      const codigoSala = generarCodigoUnico(estado.listaAlertas);
      socket.join(data.idUsu);
      socket.join(codigoSala);
      agregarAlertas(data, codigoSala, estado);
      io.to(data.idUsu).emit("codigoSala", codigoSala);
      io.in(data.idUsu).socketsLeave(data.idUsu);
    } else {
      const existeSala = estado.listaAlertas.some(
        (el) => el.codigoSala === data.codigoSala
      );
      if (existeSala) {
        socket.join(data.codigoSala);
        socket.join(`${data.codigoSala}policia`);
        const idUsuario = obtenerIdUsu(data.codigoSala, estado);
        if (idUsuario) {
          estado.listaPolicias[idUsuario].policias[data.idDispo] = {
            ubicacionInicial: {
              latitud: data.latitud,
              longitud: data.longitud,
            },
            ubicacionFinal: { latitud: data.latitud, longitud: data.longitud },
          };
        }
        io.to(data.codigoSala).emit(
          "ubicacionPrivada",
          obtenerUbiInicial(data.codigoSala, estado)
        );
        io.to(`${data.codigoSala}policia`).emit(
          "ubicacionPrivadaPolicias",
          estado.listaPolicias[idUsuario].policias
        );
      } else {
        socket.join(data.idUsu);
        io.to(data.idUsu).emit("ubicacionPrivada", "Código inexistente");
        eliminarAlertas(data.idUsu, estado, io);
      }
    }
  });

  socket.on("existe_sala", (data, existeSala) => {
    const existeSala2 = listaAlertas.some((el) => el.codigoSala === data);
    existeSala(existeSala2);
  });

  socket.on("ubicacion_actual", (data) => {
    if (data.tipoApp === "victima") {
      io.to(data.codigoSala).emit("ubicacionPrivada", data); // ===> envía los datos (lat, long, etc.) del usu a una sala de alerta
    } else if (data.tipoApp === "policia") {
      idUsuario = obtenerIdUsu(data.codigoSala);
      idUsuario !== null
        ? (listaPolicias[idUsuario].policias[data.idDispo].ubicacionFinal = {
            latitud: data.latitud,
            longitud: data.longitud,
          })
        : console.log("error");
      io.to(`${data.codigoSala}policia`).emit(
        "ubicacionPrivadaPolicias",
        listaPolicias[obtenerIdUsu(data.codigoSala)].policias
      ); // ===> envía los datos (lat, long, etc.) del policia a una sala de alerta
    }
  });

  socket.on("get_room_list", () => {
    // const sala = io.sockets.adapter.rooms;
    // console.log(sala);
    io.emit("room_list", listaAlertas); // ===> envío de todas las Salas activas
  });

  socket.on("eliminar_sala", (data) => {
    // ===> Filtrar el array para mantener solo las alertas que no tienen el idSala que deseas eliminar
    eliminarAlertas(data);
    io.to(data).emit("finalizarAlerta", {
      msj: "Se ha dado de baja su alerta",
      accion: "baja",
    });
  });
};
