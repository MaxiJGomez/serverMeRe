import { promises as fs } from "fs";

export const cargarDatos = async (estado) => {
  try {
    const fileExists = await fs.stat("listas.json").catch(() => false);
    if (fileExists) {
      const datos = await fs.readFile("listas.json", "utf-8");
      const { alertas, policias } = datos ? JSON.parse(datos) : {};
      estado.listaAlertas = alertas || [];
      estado.listaPolicias = policias || {};
    } else {
      console.log("Archivo no encontrado, inicializando datos.");
      estado.listaAlertas = [];
      estado.listaPolicias = {};
      guardarDatos(estado);
    }
  } catch (error) {
    console.error("Error al cargar datos:", error);
  }
};

export const guardarDatos = async (estado) => {
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
