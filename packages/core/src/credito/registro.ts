/**
 * Registro de los datos economicos. Unico lugar del modulo que conoce los archivos.
 *
 * Aqui no se decide nada: se carga lo que el acervo ya verifico, como dato y no como
 * codigo. La unica cifra que este modulo no encontrara nunca en un archivo es la tasa
 * de recargos por mora, porque esa se deriva con la formula del articulo 21 del Codigo
 * Fiscal de la Federacion y capturarla seria inventarla.
 */
import { IndiceDePrecios } from './indice.js';
import { TasaFueraDelCorpus } from './tasas.js';
import type { NormaExtincion, SerieIndice, TasasEjercicio } from './tipos.js';

import tasas2026 from '../../datos/economicos/recargos-lif-2026.json' with { type: 'json' };
import serieInpc from '../../datos/economicos/inpc-sp1-cp154.json' with { type: 'json' };
import normaExtincion from '../../datos/economicos/prescripcion-caducidad-cff.json' with { type: 'json' };

export const TASAS: TasasEjercicio[] = [tasas2026] as unknown as TasasEjercicio[];

export const SERIE_INPC: SerieIndice = serieInpc as unknown as SerieIndice;

export const NORMA_EXTINCION: NormaExtincion = normaExtincion as unknown as NormaExtincion;

/** Indice ya resuelto, listo para consultar mes por mes. */
export const INDICE = new IndiceDePrecios(SERIE_INPC);

/** Ejercicios con tasas cargadas, en orden. Para poder decir con que se cuenta. */
export const EJERCICIOS_CON_TASA: number[] = TASAS.map((t) => t.ejercicio).sort((a, b) => a - b);

export function tasasDelEjercicio(ejercicio: number): TasasEjercicio {
  const t = TASAS.find((x) => x.ejercicio === ejercicio);
  if (t === undefined) throw new TasaFueraDelCorpus([ejercicio]);
  return t;
}

export function hayTasasDelEjercicio(ejercicio: number): boolean {
  return TASAS.some((t) => t.ejercicio === ejercicio);
}
