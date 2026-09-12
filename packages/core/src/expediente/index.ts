/**
 * Expediente juridico digital: estados, linea de tiempo y alertas.
 *
 * Modulo puro. No lee archivos, no toca la red y no consulta el reloj: la
 * fecha de referencia y la funcion de computo entran desde afuera. El derecho
 * sigue viviendo en el corpus y el conteo de dias en el motor de plazos; aqui
 * solo se ordena el expediente y se traduce el resultado a urgencia.
 */
export * from './tipos.js';
export {
  TransicionInvalida,
  cambiarEstado,
  esEstadoTerminal,
  grafoDeEstados,
  motivoTransicion,
  transicionValida,
  transicionesDesde,
  type DatosTransicion,
  type ResultadoTransicion,
} from './estados.js';
export {
  fechasClave,
  idDePlazo,
  lineaDeTiempo,
  ordenarEventos,
  plazosDelExpediente,
  suspensionesRegistradas,
  type CalculadorDePlazos,
  type OpcionesLinea,
} from './linea-tiempo.js';
export {
  alertaDePlazo,
  alertasDeCartera,
  alertasDelExpediente,
  criticidadDe,
  etiquetaUrgencia,
  ordenarAlertas,
  type OpcionesAlertas,
} from './alertas.js';
