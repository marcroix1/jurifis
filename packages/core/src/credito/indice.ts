import type { NivelFuente } from '../tipos.js';
import { aOrdinal, mesAnterior, nombreMes } from './mes.js';
import type { MesISO, ResultadoFactor, SerieIndice, ValorIndice } from './tipos.js';

/**
 * Indice de precios y factor de actualizacion.
 *
 * Regla dura del archivo: si falta el indice de cualquiera de los dos meses que el
 * calculo necesita, no hay cifra. Ni se interpola, ni se proyecta, ni se toma el mes
 * vecino. Se devuelve insuficiente y se escribe cual mes falta, por su nombre.
 */
export class IndiceDePrecios {
  private readonly indice = new Map<MesISO, ValorIndice>();

  constructor(readonly serie: SerieIndice) {
    for (const v of serie.valores) {
      // Se valida el mes al cargar, para que un dato mal escrito falle aqui y no a la
      // mitad de un calculo.
      aOrdinal(v.mes);
      this.indice.set(v.mes, v);
    }
  }

  valor(mes: MesISO): ValorIndice | undefined {
    return this.indice.get(mes);
  }

  /** Meses cargados, en orden. Sirve para decirle al usuario con que se cuenta. */
  get mesesCargados(): MesISO[] {
    return [...this.indice.keys()].sort((a, b) => aOrdinal(a) - aOrdinal(b));
  }

  get nivelMinimo(): NivelFuente {
    return this.serie.valores.some((v) => v.nivelFuente === 'B') ? 'B' : 'A';
  }

  /**
   * Factor de actualizacion del articulo 17-A, primer parrafo, del Codigo Fiscal de la
   * Federacion: el indice del mes anterior al mas reciente del periodo, dividido entre
   * el indice del mes anterior al mas antiguo del periodo.
   *
   * El quinto parrafo del mismo articulo ordena aplicar 1 cuando el cociente resulta
   * menor a la unidad, y eso se declara en la salida en lugar de esconderlo.
   */
  factor(mesMasAntiguo: MesISO, mesMasReciente: MesISO): ResultadoFactor {
    if (aOrdinal(mesMasReciente) <= aOrdinal(mesMasAntiguo)) {
      return {
        estado: 'sin_actualizacion',
        razon: `El periodo no abarca un mes completo posterior a ${nombreMes(mesMasAntiguo)}. El articulo 17-A del Codigo Fiscal de la Federacion no actualiza por fracciones de mes.`,
      };
    }

    const mesAntiguo = mesAnterior(mesMasAntiguo);
    const mesReciente = mesAnterior(mesMasReciente);
    const indiceAntiguo = this.indice.get(mesAntiguo);
    const indiceReciente = this.indice.get(mesReciente);

    const faltantes: MesISO[] = [];
    const explicacion: string[] = [];
    if (indiceAntiguo === undefined) {
      faltantes.push(mesAntiguo);
      explicacion.push(
        `Falta el Indice Nacional de Precios al Consumidor de ${nombreMes(mesAntiguo)}, que es el mes anterior al mas antiguo del periodo.`,
      );
    }
    if (indiceReciente === undefined) {
      faltantes.push(mesReciente);
      explicacion.push(
        `Falta el Indice Nacional de Precios al Consumidor de ${nombreMes(mesReciente)}, que es el mes anterior al mas reciente del periodo.`,
      );
    }
    if (indiceAntiguo === undefined || indiceReciente === undefined) {
      explicacion.push(
        `La serie cargada solo cubre ${this.mesesCargados.map(nombreMes).join(', ')}. El motor no completa la serie con ningun valor que no venga verificado.`,
      );
      explicacion.push(
        'Si el indice de ese mes no fue publicado por el Instituto Nacional de Estadistica y Geografia, el segundo parrafo del articulo 17-A del Codigo Fiscal de la Federacion permite aplicar el ultimo indice mensual publicado. El motor no aplica esa regla por su cuenta: no puede distinguir un indice que no existe de uno que existe y no esta cargado, y esa distincion la hace el abogado responsable.',
      );
      return { estado: 'insuficiente', mesesFaltantes: faltantes, explicacion };
    }

    const crudo = indiceReciente.valor / indiceAntiguo.valor;
    const aplicoPisoUnitario = crudo < 1;
    return {
      estado: 'calculado',
      factor: {
        factor: aplicoPisoUnitario ? 1 : crudo,
        mesMasAntiguo,
        mesMasReciente,
        mesAnteriorAlMasAntiguo: mesAntiguo,
        mesAnteriorAlMasReciente: mesReciente,
        indiceAntiguo,
        indiceReciente,
        aplicoPisoUnitario,
      },
    };
  }
}
