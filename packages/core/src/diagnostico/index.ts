/**
 * Modulo de diagnostico preliminar: el cuestionario "puedo impugnar".
 *
 * Orienta, no promete. No cita preceptos, tesis ni plazos: para cada via posible
 * entrega el identificador de la regla que el motor de plazos debe computar, y lo que
 * no se sabe se declara como informacion faltante en lugar de suponerse.
 */
export * from './tipos.js';
export {
  FRASES_PROHIBIDAS, LenguajeImprudente, frasesProhibidasEn, lenguajePrudente, revisarTextos,
} from './lenguaje.js';
export {
  CuestionarioInvalido, RespuestaInvalida, avanzar, evaluarCondicion, preguntasAplicables,
  siguientePregunta, validarCuestionario, validarRespuesta,
} from './arbol.js';
export { armarDiagnostico } from './resultado.js';
export { CUESTIONARIO } from './registro.js';

import { avanzar } from './arbol.js';
import { CUESTIONARIO } from './registro.js';
import type { OpcionesDiagnostico, Paso, Respuestas } from './tipos.js';

/**
 * Punto de entrada unico del modulo. Resuelve contra el cuestionario cargado y
 * devuelve la siguiente pregunta o el diagnostico preliminar.
 */
export function diagnosticar(respuestas: Respuestas, opciones: OpcionesDiagnostico = {}): Paso {
  return avanzar(CUESTIONARIO, respuestas, opciones);
}
