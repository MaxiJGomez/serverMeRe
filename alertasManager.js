export const agregarAlertas = (data, codigoSala, estado) => {
  const existe = estado.listaAlertas.some((el) => el.idUsu === data.idUsu);
  if (!existe) {
    estado.listaAlertas.push({
      idUsu: data.idUsu,
      nombre: data.nombre,
      apellido: data.apellido,
      codigoSala,
      latitud: data.latitudInicial,
      longitud: data.longitudInicial,
    });
    estado.listaPolicias[data.idUsu] = { codigoSala, policias: {} };
  }
};

export const eliminarAlertas = (codigoSala, estado, io) => {
  const idUsuario = obtenerIdUsu(codigoSala, estado);
  io.in(codigoSala).socketsLeave(codigoSala);
  estado.listaAlertas = estado.listaAlertas.filter(
    (alerta) => alerta.codigoSala !== codigoSala
  );
  if (idUsuario) delete estado.listaPolicias[idUsuario];
};

export const obtenerIdUsu = (codigoSala, estado) => {
  const objetoEncontrado = estado.listaAlertas.find(
    (item) => item.codigoSala === codigoSala
  );
  return objetoEncontrado ? objetoEncontrado.idUsu : null;
};

export const obtenerUbiInicial = (codigoSala, estado) => {
  return estado.listaAlertas.find((item) => item.codigoSala === codigoSala);
};
