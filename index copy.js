import { rateLimit } from "express-rate-limit";
import http from "http";
import { promises as fs } from "fs";
import { Server } from "socket.io";

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: "*" },
});
const PORT = process.env.PORT || 10000;

const cargarDatos = async () => {
  try {
    const fileExists = await fs.stat("listas.json").catch(() => false);
    if (fileExists) {
      const datos = await fs.readFile("listas.json", "utf-8");
      if (datos) {
        const { alertas, policias } = JSON.parse(datos);
        estado.listaAlertas = alertas || [];
        estado.listaPolicias = policias || {};
      } else {
        console.log("Archivo vacío, inicializando datos.");
        estado.listaAlertas = [];
        estado.listaPolicias = {};
      }
    } else {
      console.log("Archivo no encontrado, creando archivo con estado inicial.");
      estado.listaAlertas = [];
      estado.listaPolicias = {};
      guardarDatos();
    }
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
};

const guardarDatos = async () => {
  try {
    const datos = {
      alertas: estado.listaAlertas,
      policias: estado.listaPolicias,
    };
    await fs.writeFile("listas.json", JSON.stringify(datos, null, 2));
  } catch (error) {
    console.error("Error al guardar datos:", error);
  }
};

// Creación del Servidor
// const server = http.createServer();
cargarDatos();

//Limitador de consultas
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-7", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});
// Apply the rate limiting middleware to all requests.
// app.use(limiter);

let estado = {
  listaAlertas: [],
  listaPolicias: {},
};

io.on("connection", (socket) => {
  socket.on("creacion_sala", (data) => {
    if (data.tipoApp === "victima") {
      const codigoSala = generarCodigoUnico(listaAlertas);
      socket.join(data.idUsu); // ===> Crea sala privada de la victima
      socket.join(codigoSala);
      agregarAlertas({ ...data, codigoSala }); // ===> Agrega las salas creadas a la listas de Salas
      console.log(listaAlertas);
      io.to(data.idUsu).emit("codigoSala", codigoSala);
      io.in(data.idUsu).socketsLeave(data.idUsu); //Elimina la sala inicial del usuario
    } else {
      const existeSala = listaAlertas.some(
        (el) => el.codigoSala === data.codigoSala
      ); // ===> Comprueba que exista una sala ya creada
      if (existeSala) {
        socket.join(data.codigoSala); // ===> Se une a sala de victima APP policia
        socket.join(`${data.codigoSala}policia`); // ===> Se une o crea sala paralela a una existente APP policia
        idUsuario = obtenerIdUsu(data.codigoSala);
        data.tipoApp === "policia" && idUsuario !== null
          ? (listaPolicias[idUsuario].policias[data.idDispo] = {
              ubicacionInicial: {
                latitud: data.latitud,
                longitud: data.longitud,
              },
              ubicacionFinal: {
                latitud: data.latitud,
                longitud: data.longitud,
              },
            })
          : () => {};
        io.to(data.codigoSala).emit(
          "ubicacionPrivada",
          obtenerUbiInicial(data.codigoSala)
        );
        io.to(`${data.codigoSala}policia`).emit(
          "ubicacionPrivadaPolicias",
          listaPolicias[obtenerIdUsu(data.codigoSala)].policias
        );
      } else {
        socket.join(data.idUsu); // ===> Al no coincidir con el código de la sala de la vícitima, crea una sala  nueva para emitir un mensaje de error y después eliminar la misma sala
        io.to(data.idUsu).emit("ubicacionPrivada", "Código inexistente"); // ===> envía mensaje de error
        eliminarAlertas(data.idUsu);
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

  const eliminarAlertas = async (codigoSala) => {
    idUsuario = await obtenerIdUsu(codigoSala);
    io.in(codigoSala).socketsLeave(codigoSala); // Eliminar Sala del socket
    listaAlertas = listaAlertas.filter(
      (alerta) => alerta.codigoSala !== codigoSala
    ); // ===> Funcion para eliminar una Sala de la lista local
    idUsuario !== null && delete listaPolicias[idUsuario]; //  ===> Funcion para eliminar lista de policias
    guardarDatos();
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
        longitud: nombreAlerta.longitudInicial,
      });
      const id = nombreAlerta.idUsu;
      listaPolicias[id] = { codigoSala: nombreAlerta.codigoSala, policias: {} };
    }
    guardarDatos();
  };
});

const generarCodigoSala = () => {
  // Generar un número de 4 dígitos al azar
  const codigoSala = Math.floor(1000 + Math.random() * 9000).toString();
  return codigoSala;
};

const generarCodigoUnico = (array) => {
  let nuevoCodigo;
  let existeCodigo = false;
  do {
    // Generar un nuevo código de sala
    nuevoCodigo = generarCodigoSala();
    // Verificar si el nuevo código ya existe en el array
    existeCodigo = array.some((item) => item.codigoSala === nuevoCodigo);
    // Repetir el proceso si el código ya existe
  } while (existeCodigo);
  return nuevoCodigo;
};

const obtenerUbiInicial = (codigoSala) => {
  // Buscar el objeto con el código de sala dado
  const objetoEncontrado = listaAlertas.find(
    (item) => item.codigoSala === codigoSala
  );
  // Devolver el objeto completo con la ubicación inicial
  return objetoEncontrado;
};

const obtenerIdUsu = (codigoSala) => {
  // Buscar el objeto con el código de sala dado
  const objetoEncontrado = listaAlertas.find(
    (item) => item.codigoSala == codigoSala
  );
  // Devolver el idUsu si se encontró el objeto, o null si no se encontró
  if (objetoEncontrado) {
    // Devolver el idUsu si se encontró el objeto
    return objetoEncontrado.idUsu;
  } else {
    // Devolver null si no se encontró el objeto
    return null;
  }
};


// manejador strapi

// const baseUrlStrapi = 'http://192.168.96.4:1337/api';

// const fetchAbrirSala = async(data, codigoSala)=>{
//         const historialUrlStrapi = `${baseUrlStrapi}/eventos`;

//         const consulta = {
//           method: 'POST',
//           headers: {
//             "Content-Type": "application/json"
//           },
//           body:JSON.stringify({
//             data:{
//               victima: data.idVictima,
//               ubicacion: {"latitude": data.latitudInicial,
//                               "longitude": data.longitudInicial},
//               estado: true,
//               urgente: true,
//               multimediaTipo: "Alerta",
//               textoPredStr: "Ha enviado una alerta",
//               datosSocket:{"nombre": data.nombre, "apellido": data.apellido,"codigoSala": codigoSala
//               }
//             }
//           })
//         };

//         try {
//              const resp = await fetch(historialUrlStrapi, consulta);
//              const data = await resp.json();
//              if (!resp.ok) throw new Error(`${resp.status}`);
//         } catch (error) {
//             console.log(error);
//         }
// }


// const fetchCerrarSala = async(codigoSala)=>{
//   const historialUrlStrapi = `${baseUrlStrapi}/eventos?filters[$and][datosSocket][codigoSala][$eq]=${codigoSala}&filters[estado][$eq]=true&filters[urgente][$eq]=true`;
//   const dataSala = await fetch(historialUrlStrapi);
//   const dataSalaJson = await dataSala.json()
//    const bajaUrlStrapi = `${baseUrlStrapi}/eventos/${dataSalaJson.data[0].id}`;
//    const consulta = {
//      method: 'PUT',
//      headers: {
//        "Content-Type": "application/json"
//      },
//      body:JSON.stringify({
//        data:{
//          estado: false,
//          urgente: false,
//        }
//      })
//    };
//    try {
//         const resp = await fetch(bajaUrlStrapi, consulta);
//         const data = await resp.json();
//         if (!resp.ok) throw new Error(`${resp.status}`);
//    } catch (error) {
//        console.log("Este error es",error);
//    }

// }

process.on("exit", guardarDatos);
process.on("SIGINT", guardarDatos); // Captura el evento de cierre por Ctrl + C
server.listen(PORT, () => console.log(server.address()));
