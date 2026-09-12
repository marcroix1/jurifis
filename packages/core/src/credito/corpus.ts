/**
 * Ensambla el corpus economico que el motor necesita. Unico lugar donde el
 * modulo de credito conoce archivos: el motor recibe datos y no los busca.
 */
import recargos2026 from '../../datos/economicos/recargos-lif-2026.json' with { type: 'json' };
import serieInpc from '../../datos/economicos/inpc-sp1-cp154.json' with { type: 'json' };
import normaJson from '../../datos/economicos/prescripcion-caducidad-cff.json' with { type: 'json' };
import { IndiceDePrecios } from './indice.js';
import type { CorpusCredito } from './motor.js';
import type { NormaExtincion, SerieIndice, TasasEjercicio } from './tipos.js';

export const TASAS_CARGADAS: TasasEjercicio[] = [recargos2026 as unknown as TasasEjercicio];
export const INDICE = new IndiceDePrecios(serieInpc as unknown as SerieIndice);
export const NORMA_EXTINCION = normaJson as unknown as NormaExtincion;

export const CORPUS_CREDITO: CorpusCredito = {
  indice: INDICE,
  tasasDe: (ejercicio: number) => TASAS_CARGADAS.find((t) => t.ejercicio === ejercicio),
  ejerciciosConTasa: TASAS_CARGADAS.map((t) => t.ejercicio),
  norma: NORMA_EXTINCION,
};
