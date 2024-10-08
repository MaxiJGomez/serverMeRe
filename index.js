import express from "express";
import http from "http";
import { Server } from "socket.io";
import { cargarDatos, guardarDatos } from "./dataHandler.js";
import { manejarConexiones } from "./socketHandler.js";
import { rateLimit } from "express-rate-limit";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 10000;
let estado = { listaAlertas: [], listaPolicias: {} };

cargarDatos(estado);

// Limitador de consultas
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
});
app.use(limiter);

io.on("connection", (socket) => manejarConexiones(socket, io, estado));

// Guardar datos al salir
process.on("exit", () => guardarDatos(estado));
process.on("SIGINT", () => guardarDatos(estado));

server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
