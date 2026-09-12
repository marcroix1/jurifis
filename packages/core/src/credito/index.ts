/**
 * Modulo de credito fiscal: estimacion del principal, su actualizacion, los recargos,
 * las multas, los pagos y el saldo, con la traza de donde sale cada cifra.
 *
 * Lo que este modulo produce es una ESTIMACION y lo dice en el tipo de retorno, no en
 * un renglon de la pantalla. No determina creditos, no liquida y no sustituye ni a la
 * autoridad ni al abogado responsable.
 *
 * Las dos negativas que definen el modulo:
 *
 * 1. Sin indice de precios no hay cifra de actualizacion. Si falta el indice de
 *    cualquiera de los dos meses que el articulo 17-A exige, se devuelve insuficiente
 *    y se escribe cual mes falta, por su nombre. Con una serie de tres meses cargados
 *    eso ocurre casi siempre, y ese es el comportamiento correcto.
 *
 * 2. Nunca se concluye prescripcion por el transcurso de cinco anios. El submodulo de
 *    prescripcion y caducidad devuelve siempre el mismo veredicto, porque su tipo tiene
 *    un solo valor posible: el analisis requiere verificar los actos que pudieron
 *    interrumpir o suspender el plazo.
 */
export * from './tipos.js';
export { ImporteInvalido, aCentavos, pesos, redondearCentavos, sumar } from './dinero.js';
export {
  MesInvalido, aMes, aOrdinal, anioDelMes, mesAnterior, mesDe, mesesOFraccion, nombreMes,
} from './mes.js';
export { IndiceDePrecios } from './indice.js';
export { TasaFueraDelCorpus, explicacionTasaMora, resolverTasa, tasaMoraMensual } from './tasas.js';
export type { TasaResuelta } from './tasas.js';
export { MESES_DEL_TOPE, NOTA_TOPE, periodoDeRecargos } from './recargos.js';
export { analizarExtincion } from './prescripcion.js';
export type { EntradaExtincion } from './prescripcion.js';
export { EntradaCreditoInvalida, desgloseCuadra, estimarCredito } from './motor.js';
export type { CorpusCredito } from './motor.js';
export {
  EJERCICIOS_CON_TASA, INDICE, NORMA_EXTINCION, SERIE_INPC, TASAS,
  hayTasasDelEjercicio, tasasDelEjercicio,
} from './registro.js';

import { estimarCredito } from './motor.js';
import { analizarExtincion } from './prescripcion.js';
import { EJERCICIOS_CON_TASA, INDICE, NORMA_EXTINCION, TASAS } from './registro.js';
import type { CorpusCredito } from './motor.js';
import type { EntradaExtincion } from './prescripcion.js';
import type { AnalisisExtincion, EntradaCredito, EstimacionCredito, TasasEjercicio } from './tipos.js';

/** Corpus cargado, para no repetir el cableado en cada llamada. */
export const CORPUS_CREDITO: CorpusCredito = {
  indice: INDICE,
  tasasDe: (ejercicio: number): TasasEjercicio | undefined => TASAS.find((t) => t.ejercicio === ejercicio),
  ejerciciosConTasa: EJERCICIOS_CON_TASA,
  norma: NORMA_EXTINCION,
};

/** Punto de entrada unico del modulo. Resuelve contra el corpus cargado y estima. */
export function estimar(entrada: EntradaCredito): EstimacionCredito {
  return estimarCredito(entrada, CORPUS_CREDITO);
}

/** Analisis de prescripcion y caducidad por separado, sin pasar por el dinero. */
export function analizar(entrada: EntradaExtincion): AnalisisExtincion {
  return analizarExtincion(entrada, NORMA_EXTINCION);
}
