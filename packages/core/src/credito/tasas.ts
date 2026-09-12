import type { Fundamento } from '../tipos.js';
import type { ClaveTasaLey, TasasEjercicio, TipoRecargo } from './tipos.js';

/**
 * Tasas de recargos.
 *
 * La unica tasa que este archivo produce por cuenta propia es la de mora, y la produce
 * con la formula del articulo 21 del Codigo Fiscal de la Federacion, nunca capturada
 * como constante: esa cifra no esta escrita en ninguna ley, se deriva de la que el
 * Congreso de la Union fija cada ano, y capturarla a mano seria inventar un dato.
 */

export class TasaFueraDelCorpus extends Error {
  readonly ejercicios: number[];
  constructor(ejercicios: number[]) {
    super(
      `No hay tasas de recargos cargadas para el ejercicio ${ejercicios.join(', ')}. El motor no inventa tasas.`,
    );
    this.name = 'TasaFueraDelCorpus';
    this.ejercicios = ejercicios;
  }
}

/**
 * Tasa mensual de recargos por mora, en por ciento.
 *
 * Articulo 21, primer parrafo, del Codigo Fiscal de la Federacion: la tasa de cada mes
 * de mora es la que resulte de incrementar en cincuenta por ciento la que mediante ley
 * fije anualmente el Congreso de la Union. La tasa se considera hasta la centesima y se
 * ajusta a la centesima inmediata superior cuando el digito de la milesima es igual o
 * mayor a cinco; cuando la milesima es menor a cinco se conserva la centesima que
 * resulto.
 *
 * La aritmetica corre en enteros a proposito: la tasa de ley llega con dos decimales,
 * se lleva a centesimas enteras y se multiplica por quince para obtener milesimas. Asi
 * el ajuste mira un digito real y no el residuo de un flotante.
 */
export function tasaMoraMensual(tasaDeLey: number): number {
  if (!Number.isFinite(tasaDeLey) || tasaDeLey < 0) {
    throw new Error(`Tasa de ley invalida: ${tasaDeLey}. Se espera un por ciento mensual no negativo.`);
  }
  const centesimas = Math.round(tasaDeLey * 100);
  if (Math.abs(centesimas - tasaDeLey * 100) > 1e-6) {
    throw new Error(
      `La tasa de ley ${tasaDeLey} trae mas de dos decimales. El articulo 21 razona sobre una tasa considerada hasta la centesima.`,
    );
  }
  // centesimas por 1.5, expresado por quince para quedarse en milesimas enteras.
  const milesimas = centesimas * 15;
  const centesimasResultado = Math.floor(milesimas / 10);
  const digitoMilesima = milesimas - centesimasResultado * 10;
  const ajustada = digitoMilesima >= 5 ? centesimasResultado + 1 : centesimasResultado;
  return ajustada / 100;
}

/** Explicacion literal del ajuste, para que la traza muestre el digito que lo decidio. */
export function explicacionTasaMora(tasaDeLey: number): string {
  const centesimas = Math.round(tasaDeLey * 100);
  const milesimas = centesimas * 15;
  const crudo = (milesimas / 1000).toFixed(3);
  const digitoMilesima = milesimas - Math.floor(milesimas / 10) * 10;
  const resultado = tasaMoraMensual(tasaDeLey).toFixed(2);
  const ajuste =
    digitoMilesima >= 5
      ? `la milesima es ${digitoMilesima}, igual o mayor a cinco, de modo que sube a la centesima inmediata superior`
      : `la milesima es ${digitoMilesima}, menor a cinco, de modo que se conserva la centesima que resulto`;
  return `${tasaDeLey.toFixed(2)} por ciento mensual incrementado en cincuenta por ciento da ${crudo} por ciento; ${ajuste}, con lo que la tasa aplicable es ${resultado} por ciento mensual.`;
}

export interface TasaResuelta {
  /** Tasa mensual en por ciento. */
  tasa: number;
  tipo: TipoRecargo;
  ejercicio: number;
  fundamento: Fundamento;
  /** Como se obtuvo, para la traza. */
  explicacion: string;
}

/** Resuelve la tasa mensual que corresponde al tipo de recargo y al ejercicio. */
export function resolverTasa(tipo: TipoRecargo, tasas: TasasEjercicio): TasaResuelta {
  if (tipo === 'mora') {
    const base = tasas.tasasMensuales[tasas.mora.tasaBase];
    return {
      tasa: tasaMoraMensual(base),
      tipo,
      ejercicio: tasas.ejercicio,
      fundamento: tasas.mora.fundamento,
      explicacion: explicacionTasaMora(base),
    };
  }
  const clave: ClaveTasaLey = tipo;
  const tasa = tasas.tasasMensuales[clave];
  return {
    tasa,
    tipo,
    ejercicio: tasas.ejercicio,
    fundamento: tasas.fundamentoPorTasa[clave],
    explicacion: `Tasa que el Congreso de la Union fijo para el ejercicio ${tasas.ejercicio}: ${tasa.toFixed(2)} por ciento mensual.`,
  };
}
