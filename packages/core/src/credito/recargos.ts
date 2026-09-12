import { aDias, anio, sumarMeses, type FechaISO } from '../fecha.js';
import { mesesOFraccion } from './mes.js';
import { resolverTasa } from './tasas.js';
import type { MesDeRecargo, ResultadoRecargos, TasasEjercicio, TipoRecargo } from './tipos.js';

/**
 * Recargos mes a mes.
 *
 * El articulo 21, sexto parrafo, del Codigo Fiscal de la Federacion los causa por cada
 * mes o fraccion que transcurra desde el dia en que debio hacerse el pago y hasta que
 * se efectue: un solo dia de retraso ya cuenta como mes. El primer parrafo del mismo
 * articulo manda sumar las tasas aplicables en cada ano para cada uno de los meses
 * transcurridos, y por eso el periodo se recorre mes por mes en lugar de multiplicar
 * una sola tasa por un numero de meses.
 */

/** Tope del segundo parrafo del articulo 21: los recargos se causan hasta por cinco anios. */
export const MESES_DEL_TOPE = 60;

export const NOTA_TOPE =
  'El segundo parrafo del articulo 21 del Codigo Fiscal de la Federacion causa los recargos hasta por cinco anios, salvo en los casos del articulo 67 del mismo Codigo, en los que se causan hasta que se extingan las facultades de la autoridad. El motor aplica el tope de cinco anios y no decide por su cuenta si el caso cae en la excepcion: eso lo verifica el abogado responsable.';

/**
 * Arma el periodo de recargos.
 *
 * El ejercicio de cada mes se toma del ano en que ese mes empieza. Es un criterio y se
 * declara: cuando un mes de recargos cruza el cambio de ano, la tasa aplicada es la del
 * ejercicio en que arranco.
 */
export function periodoDeRecargos(
  fechaExigibilidad: FechaISO,
  fechaCalculo: FechaISO,
  tipo: TipoRecargo,
  tasasDe: (ejercicio: number) => TasasEjercicio | undefined,
): ResultadoRecargos {
  if (aDias(fechaCalculo) < aDias(fechaExigibilidad)) {
    return {
      estado: 'insuficiente',
      ejerciciosFaltantes: [],
      explicacion: [
        `La fecha hasta la que se estima, ${fechaCalculo}, es anterior a la fecha de exigibilidad, ${fechaExigibilidad}. Con ese orden no hay periodo de mora que recorrer.`,
      ],
    };
  }

  const total = mesesOFraccion(fechaExigibilidad, fechaCalculo);
  if (total === 0) {
    return {
      estado: 'sin_recargos',
      razon: `El pago se estima al ${fechaCalculo}, sin que hubiera transcurrido un solo dia desde la exigibilidad. No hay mes ni fraccion de mes que cause recargos.`,
    };
  }

  const contados = Math.min(total, MESES_DEL_TOPE);
  const meses: MesDeRecargo[] = [];
  const faltantes = new Set<number>();

  for (let k = 1; k <= contados; k++) {
    const desde = sumarMeses(fechaExigibilidad, k - 1).fecha;
    const finTeorico = sumarMeses(fechaExigibilidad, k).fecha;
    const hasta = aDias(finTeorico) > aDias(fechaCalculo) ? fechaCalculo : finTeorico;
    const ejercicio = anio(desde);
    const tasas = tasasDe(ejercicio);
    if (tasas === undefined) {
      faltantes.add(ejercicio);
      continue;
    }
    const resuelta = resolverTasa(tipo, tasas);
    meses.push({
      numero: k,
      desde,
      hasta,
      ejercicio,
      tasa: resuelta.tasa,
      fundamento: resuelta.fundamento,
    });
  }

  if (faltantes.size > 0) {
    const lista = [...faltantes].sort((a, b) => a - b);
    return {
      estado: 'insuficiente',
      ejerciciosFaltantes: lista,
      explicacion: lista.map(
        (e) =>
          `Falta la tasa de recargos del ejercicio ${e}. Hace falta cargar el articulo de recargos de la Ley de Ingresos de la Federacion de ese ejercicio, porque el periodo de mora recorre meses de ${e}.`,
      ),
    };
  }

  // Se suma en centesimas enteras para que la tasa acumulada no arrastre el residuo
  // de sumar decenas de flotantes de dos decimales.
  const acumuladaEnCentesimas = meses.reduce((suma, m) => suma + Math.round(m.tasa * 100), 0);

  return {
    estado: 'calculado',
    periodo: {
      meses,
      tasaAcumulada: acumuladaEnCentesimas / 100,
      mesesFueraDelTope: total - contados,
    },
  };
}
