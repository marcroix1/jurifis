/**
 * Modulo de jurisprudencia: acervo de criterios, buscador hibrido, guardian de
 * citas y tuberia de ingesta.
 *
 * El acervo esta vacio y asi se queda hasta que un criterio recorra las cuatro
 * etapas de ingesta con revision humana. El modulo entrega valor con cero
 * criterios: un buscador que declara que no tiene nada y un guardian que impide
 * que un escrito cite lo que nadie verifico.
 */
export * from './tipos.js';
export {
  EtiquetaIndebida, TipoCriterioInvalido, esJurisprudencia, esTipoCriterio, etiquetaTipoCriterio,
  etiquetarComo, exigirJurisprudencia, exigirTipoCriterio,
} from './tipo-criterio.js';
export type { Etiquetable } from './tipo-criterio.js';
export { huellaDeCampos, huellaDeCriterio, sha256 } from './huella.js';
export type { ContenidoCriterio } from './huella.js';
export {
  ACERVO, AcervoInvalido, CRITERIOS, acervoVacio, estadoAcervo, facetas, origenDeclarado,
  origenesDeclarados, resumenAcervo, validarAcervo,
} from './registro.js';
export {
  BusquedaSemanticaNoDisponible, DIMENSION_EMBEDDING, buscarCriterios, buscarPorClave,
  buscarPorRegistro, buscarPorSignificado, haySemantica, motorSemanticoRegistrado,
  normalizarConsulta, normalizarLlave, plegar, registrarMotorSemantico,
} from './buscador.js';
export type { MotorSemantico } from './buscador.js';
export {
  CitasBloqueadas, exigirCitasVerificadas, extraerCitas, registrosCitados, revisarCitas,
} from './citation-guard.js';
export {
  ETAPAS_INGESTA, EntradaIncompleta, HuellaAlterada, OrigenNoOficial, RevisionFaltante, ingerir,
  normalizar, proyectarAcervo, publicar, recibir, revisar,
} from './ingesta.js';
export type { CriterioEnOrigen, CriterioNormalizado, CriterioRevisado } from './ingesta.js';
