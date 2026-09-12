import { aDias, type FechaISO } from '../fecha.js';
import type { Confianza, Fundamento, NivelFuente } from '../tipos.js';
import { pesos, redondearCentavos, sumar } from './dinero.js';
import { IndiceDePrecios } from './indice.js';
import { mesDe, nombreMes } from './mes.js';
import { NOTA_TOPE, periodoDeRecargos } from './recargos.js';
import { analizarExtincion } from './prescripcion.js';
import { resolverTasa } from './tasas.js';
import {
  ESTIMACION,
  LEYENDA_ESTIMACION,
  type AnalisisExtincion,
  type Centavos,
  type DesgloseCredito,
  type DetalleEstimacion,
  type EntradaCredito,
  type EstimacionCredito,
  type FactorActualizacion,
  type ImputacionPagos,
  type NormaExtincion,
  type PasoTrazaCredito,
  type PeriodoRecargos,
  type TasasEjercicio,
  type TipoRecargo,
} from './tipos.js';

/**
 * Motor de estimacion del credito fiscal.
 *
 * Misma filosofia que el motor de plazos: si algo falta, no se estima. Se devuelve
 * confianza degradada, sin cifra, y la lista de lo que hace falta escrita con el nombre
 * del mes o del ejercicio que no esta cargado.
 *
 * Diferencia de fondo con aquel motor: alli el resultado es una fecha y aqui es dinero,
 * de modo que la salida lleva ademas un sello de naturaleza en el propio tipo. Este
 * modulo estima. No determina, no liquida y no sustituye a la autoridad.
 */

const AVISO_BASE = LEYENDA_ESTIMACION;

const AVISO_DECIMALES_DEL_FACTOR =
  'El factor de actualizacion se aplica sin redondear. El articulo 17-A del Codigo Fiscal de la Federacion no fija cuantos decimales se conservan y el corpus no tiene cargada la regla de la Resolucion Miscelanea Fiscal que lo hace, asi que el motor no inventa un truncamiento. Frente a una liquidacion oficial la diferencia aparece en los ultimos centavos.';

const AVISO_IMPUTACION =
  'Los pagos se aplican al final del periodo, en el orden del articulo 20 del Codigo Fiscal de la Federacion. La estimacion no recalcula los recargos sobre saldos que van bajando pago a pago, de modo que puede quedar por encima de una determinacion que si lo haga.';

/** Fundamento del orden de aplicacion de los pagos. Se cita donde se usa. */
const FUNDAMENTO_IMPUTACION: Fundamento = {
  ordenamiento: 'Codigo Fiscal de la Federacion',
  articulo: '20',
  parrafo: 'penultimo',
  publicacion: 'Texto vigente, ultima reforma DOF 09-04-2026',
  archivo: 'CFF.md',
  linea: 2090,
};

/** Fundamento de que la actualizacion viaja con la naturaleza del principal. */
const FUNDAMENTO_NATURALEZA: Fundamento = {
  ordenamiento: 'Codigo Fiscal de la Federacion',
  articulo: '17-A',
  parrafo: 'cuarto',
  publicacion: 'Texto vigente, ultima reforma DOF 09-04-2026',
  archivo: 'CFF.md',
  linea: 1081,
};

/** Fundamento de la actualizacion de las multas no pagadas. */
const FUNDAMENTO_MULTAS: Fundamento = {
  ordenamiento: 'Codigo Fiscal de la Federacion',
  articulo: '70',
  parrafo: 'segundo',
  publicacion: 'Texto vigente, ultima reforma DOF 09-04-2026',
  archivo: 'CFF.md',
  linea: 9860,
};

/** Fundamento de que los recargos no se calculan sobre las multas. */
const FUNDAMENTO_BASE_RECARGOS: Fundamento = {
  ordenamiento: 'Codigo Fiscal de la Federacion',
  articulo: '21',
  parrafo: 'segundo',
  publicacion: 'Texto vigente, ultima reforma DOF 09-04-2026',
  archivo: 'CFF.md',
  linea: 2265,
};

export interface CorpusCredito {
  indice: IndiceDePrecios;
  tasasDe: (ejercicio: number) => TasasEjercicio | undefined;
  ejerciciosConTasa: number[];
  norma: NormaExtincion;
}

export class EntradaCreditoInvalida extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'EntradaCreditoInvalida';
  }
}

function sinCifra(
  entrada: EntradaCredito,
  tipoRecargo: TipoRecargo,
  totalMultas: Centavos,
  totalPagos: Centavos,
  traza: PasoTrazaCredito[],
  fuentes: Fundamento[],
  faltantes: string[],
  advertencias: string[],
  extincion: AnalisisExtincion | null,
  factor: FactorActualizacion | null,
): EstimacionCredito {
  return {
    clase: ESTIMACION,
    leyenda: LEYENDA_ESTIMACION,
    confianza: 'insuficiente',
    entrada,
    desglose: {
      principal: entrada.importeOriginal,
      actualizacion: null,
      recargos: null,
      multas: totalMultas,
      pagos: totalPagos,
      saldo: null,
    },
    detalle: {
      factor,
      actualizacionDelPrincipal: null,
      actualizacionDeMultas: null,
      principalActualizado: null,
      periodoRecargos: null,
      tipoRecargo,
      tasaMensualAplicada: null,
      imputacion: null,
    },
    traza,
    fuentes,
    faltantes,
    advertencias: [AVISO_BASE, ...advertencias],
    extincion,
  };
}

/**
 * Estima el credito fiscal y devuelve el desglose con la traza de como se obtuvo.
 *
 * El desglose sale siempre con sus seis renglones separados. principal, multas y pagos
 * son cifras del expediente y se devuelven aunque el calculo se detenga; actualizacion,
 * recargos y saldo valen nulo en cuanto falta un dato, y entonces no hay cifra alguna
 * de esos conceptos en ninguna parte de la salida.
 */
export function estimarCredito(entrada: EntradaCredito, corpus: CorpusCredito): EstimacionCredito {
  const traza: PasoTrazaCredito[] = [];
  const fuentes: Fundamento[] = [];
  const faltantes: string[] = [];
  const advertencias: string[] = [];
  const razonesParciales: string[] = [];

  const tipoRecargo: TipoRecargo = entrada.tipoRecargo ?? 'mora';
  const multas = entrada.multas ?? [];
  const pagos = entrada.pagos ?? [];
  const totalMultas = sumar(...multas.map((m) => m.importe));
  const totalPagos = sumar(...pagos.map((p) => p.importe));

  if (!Number.isSafeInteger(entrada.importeOriginal) || entrada.importeOriginal < 0) {
    throw new EntradaCreditoInvalida(
      `El importe original debe venir en centavos enteros no negativos. Se recibio ${entrada.importeOriginal}.`,
    );
  }
  if (aDias(entrada.fechaCalculo) < aDias(entrada.fechaExigibilidad)) {
    throw new EntradaCreditoInvalida(
      `La fecha hasta la que se estima, ${entrada.fechaCalculo}, es anterior a la fecha de exigibilidad, ${entrada.fechaExigibilidad}.`,
    );
  }

  // Analisis de prescripcion y caducidad, cuando hay linea de tiempo. Corre aparte del
  // dinero a proposito: una cosa es cuanto se debe y otra si el credito sigue vivo.
  const extincion: AnalisisExtincion | null =
    entrada.lineaDeTiempo === undefined
      ? null
      : analizarExtincion(
          {
            fechaExigibilidad: entrada.fechaExigibilidad,
            fechaCalculo: entrada.fechaCalculo,
            lineaDeTiempo: entrada.lineaDeTiempo,
          },
          corpus.norma,
        );

  // Paso 1. La entrada, tal como llego.
  traza.push({
    paso: 1,
    concepto: 'entrada del expediente',
    fecha: entrada.fechaExigibilidad,
    importe: entrada.importeOriginal,
    detalle: `${entrada.concepto}. Ejercicio ${entrada.ejercicio}. Importe original ${pesos(entrada.importeOriginal)}, exigible desde el ${entrada.fechaExigibilidad}, estimado al ${entrada.fechaCalculo}.`,
  });

  // Paso 2. Actualizacion del principal, articulo 17-A.
  const mesMasAntiguo = mesDe(entrada.fechaExigibilidad);
  const mesMasReciente = mesDe(entrada.fechaCalculo);
  const resultadoFactor = corpus.indice.factor(mesMasAntiguo, mesMasReciente);
  fuentes.push(corpus.indice.serie.fundamento);

  if (resultadoFactor.estado === 'insuficiente') {
    traza.push({
      paso: 2,
      concepto: 'actualizacion',
      detalle: `El periodo va de ${nombreMes(mesMasAntiguo)} a ${nombreMes(mesMasReciente)} y falta el indice de precios que el articulo 17-A exige. El motor se detiene aqui en lugar de estimar una cifra que no puede sostener.`,
      fundamento: corpus.indice.serie.fundamento,
    });
    return sinCifra(
      entrada,
      tipoRecargo,
      totalMultas,
      totalPagos,
      traza,
      fuentes,
      resultadoFactor.explicacion,
      advertencias,
      extincion,
      null,
    );
  }

  let factor: FactorActualizacion | null = null;
  let principalActualizado: Centavos = entrada.importeOriginal;
  let actualizacionDelPrincipal: Centavos = 0;

  if (resultadoFactor.estado === 'sin_actualizacion') {
    traza.push({
      paso: 2,
      concepto: 'actualizacion',
      importe: 0,
      detalle: `${resultadoFactor.razon} El principal se conserva en ${pesos(entrada.importeOriginal)}.`,
      fundamento: FUNDAMENTO_NATURALEZA,
    });
  } else {
    factor = resultadoFactor.factor;
    principalActualizado = redondearCentavos(entrada.importeOriginal * factor.factor);
    actualizacionDelPrincipal = principalActualizado - entrada.importeOriginal;
    razonesParciales.push(AVISO_DECIMALES_DEL_FACTOR);
    faltantes.push(
      'Regla de la Resolucion Miscelanea Fiscal sobre el numero de decimales del factor de actualizacion, sin cargar en el corpus.',
    );
    if (corpus.indice.nivelMinimo === 'B') {
      razonesParciales.push(corpus.indice.serie.advertenciaDeFuente);
      faltantes.push(
        `Publicacion del Indice Nacional de Precios al Consumidor de ${nombreMes(factor.mesAnteriorAlMasAntiguo)} y ${nombreMes(factor.mesAnteriorAlMasReciente)} en el ${corpus.indice.serie.publicacionQueSurteEfectos}, para cotejar los valores tomados de ${corpus.indice.serie.replicador ?? 'la fuente cargada'}.`,
      );
    }
    traza.push({
      paso: 2,
      concepto: 'factor de actualizacion',
      importe: actualizacionDelPrincipal,
      detalle: `Indice de ${nombreMes(factor.mesAnteriorAlMasReciente)} igual a ${factor.indiceReciente.valor}, entre indice de ${nombreMes(factor.mesAnteriorAlMasAntiguo)} igual a ${factor.indiceAntiguo.valor}, da un factor de ${factor.factor}. Aplicado a ${pesos(entrada.importeOriginal)} arroja ${pesos(principalActualizado)}, de los cuales ${pesos(actualizacionDelPrincipal)} son actualizacion.${factor.aplicoPisoUnitario ? ' El cociente resulto menor a la unidad, asi que se aplico el factor 1 que ordena el quinto parrafo del articulo 17-A.' : ''}`,
      fundamento: {
        ordenamiento: 'Codigo Fiscal de la Federacion',
        articulo: '17-A',
        parrafo: 'primero',
        publicacion: 'Texto vigente, ultima reforma DOF 09-04-2026',
        archivo: 'CFF.md',
        linea: 1065,
      },
    });
  }

  // Paso 3. Actualizacion de las multas, articulo 70.
  let actualizacionDeMultas: Centavos = 0;
  const multasSinFecha: string[] = [];
  for (const multa of multas) {
    if (multa.fechaExigibilidad === undefined) {
      multasSinFecha.push(multa.concepto);
      continue;
    }
    const r = corpus.indice.factor(mesDe(multa.fechaExigibilidad), mesMasReciente);
    if (r.estado === 'insuficiente') {
      traza.push({
        paso: 3,
        concepto: 'actualizacion de multas',
        detalle: `La multa "${multa.concepto}" es exigible desde el ${multa.fechaExigibilidad} y falta el indice de precios de su periodo. El motor se detiene en lugar de estimar.`,
        fundamento: FUNDAMENTO_MULTAS,
      });
      return sinCifra(
        entrada,
        tipoRecargo,
        totalMultas,
        totalPagos,
        traza,
        fuentes,
        r.explicacion,
        advertencias,
        extincion,
        factor,
      );
    }
    if (r.estado === 'calculado') {
      actualizacionDeMultas += redondearCentavos(multa.importe * r.factor.factor) - multa.importe;
    }
  }
  // El paso se emite siempre, aunque no haya multas: una traza con huecos en la
  // numeracion se lee como una traza incompleta.
  traza.push({
    paso: 3,
    concepto: 'actualizacion de multas',
    importe: actualizacionDeMultas,
    detalle:
      multas.length === 0
        ? 'No aplico. No se registraron multas en el expediente.'
        : multasSinFecha.length === multas.length
          ? `Las multas suman ${pesos(totalMultas)} y no se actualizaron: no se registro la fecha en que debieron pagarse.`
          : `Las multas suman ${pesos(totalMultas)} y su actualizacion asciende a ${pesos(actualizacionDeMultas)}.`,
    fundamento: FUNDAMENTO_MULTAS,
  });
  if (multas.length > 0) {
    fuentes.push(FUNDAMENTO_MULTAS);
    if (multasSinFecha.length > 0) {
      advertencias.push(
        `Sin actualizar por falta de la fecha en que debieron pagarse: ${multasSinFecha.join('; ')}. El segundo parrafo del articulo 70 del Codigo Fiscal de la Federacion las actualiza desde ese mes.`,
      );
    }
  }

  // Paso 4. Recargos mes a mes, articulo 21.
  const resultadoRecargos = periodoDeRecargos(
    entrada.fechaExigibilidad,
    entrada.fechaCalculo,
    tipoRecargo,
    corpus.tasasDe,
  );
  if (resultadoRecargos.estado === 'insuficiente') {
    traza.push({
      paso: 4,
      concepto: 'recargos',
      detalle: `El periodo de mora recorre ejercicios cuya tasa no esta cargada. El motor no toma la tasa de otro ano ni la proyecta. Ejercicios con tasa cargada: ${corpus.ejerciciosConTasa.join(', ')}.`,
      fundamento: FUNDAMENTO_BASE_RECARGOS,
    });
    return sinCifra(
      entrada,
      tipoRecargo,
      totalMultas,
      totalPagos,
      traza,
      fuentes,
      resultadoRecargos.explicacion,
      advertencias,
      extincion,
      factor,
    );
  }

  let periodo: PeriodoRecargos | null = null;
  let recargos: Centavos = 0;
  let tasaMensualAplicada: number | null = null;

  if (resultadoRecargos.estado === 'sin_recargos') {
    traza.push({
      paso: 4,
      concepto: 'recargos',
      importe: 0,
      detalle: resultadoRecargos.razon,
      fundamento: FUNDAMENTO_BASE_RECARGOS,
    });
  } else {
    periodo = resultadoRecargos.periodo;
    // La base son las contribuciones actualizadas. El segundo parrafo del articulo 21
    // deja fuera las multas por infraccion a disposiciones fiscales, y por eso el
    // renglon de multas no genera recargos en esta estimacion.
    recargos = redondearCentavos((principalActualizado * periodo.tasaAcumulada) / 100);
    const primero = periodo.meses[0];
    if (primero !== undefined) {
      tasaMensualAplicada = primero.tasa;
      fuentes.push(primero.fundamento);
    }
    const tasas = corpus.tasasDe(primero?.ejercicio ?? entrada.ejercicio);
    const explicacion = tasas === undefined ? '' : ` ${resolverTasa(tipoRecargo, tasas).explicacion}`;
    traza.push({
      paso: 4,
      concepto: 'recargos mes a mes',
      importe: recargos,
      detalle: `Se recorrieron ${periodo.meses.length} meses o fracciones de mes, del ${primero?.desde ?? entrada.fechaExigibilidad} al ${entrada.fechaCalculo}.${explicacion} La suma de las tasas mensuales da ${periodo.tasaAcumulada.toFixed(2)} por ciento, aplicado sobre el principal actualizado de ${pesos(principalActualizado)}: ${pesos(recargos)}.`,
      fundamento: primero?.fundamento ?? FUNDAMENTO_BASE_RECARGOS,
    });
    traza.push({
      paso: 5,
      concepto: 'base de los recargos',
      detalle: `Los recargos se calcularon sobre el principal actualizado y no sobre las multas: el segundo parrafo del articulo 21 excluye de la base las multas por infraccion a disposiciones fiscales, los propios recargos y los gastos de ejecucion.`,
      fundamento: FUNDAMENTO_BASE_RECARGOS,
    });
    fuentes.push(FUNDAMENTO_BASE_RECARGOS);
    if (periodo.mesesFueraDelTope > 0) {
      advertencias.push(
        `Quedaron fuera ${periodo.mesesFueraDelTope} meses por el tope de cinco anios. ${NOTA_TOPE}`,
      );
      faltantes.push(
        'Verificar si el caso encuadra en los supuestos del articulo 67 del Codigo Fiscal de la Federacion, en los que los recargos se causan mas alla de cinco anios.',
      );
    }
  }

  // Paso 6. Aplicacion de los pagos, articulo 20.
  const actualizacionTotal = actualizacionDelPrincipal + actualizacionDeMultas;
  let imputacion: ImputacionPagos | null = null;
  if (totalPagos === 0) {
    traza.push({
      paso: 6,
      concepto: 'aplicacion de los pagos',
      importe: 0,
      detalle: 'No aplico. No se registraron pagos en el expediente.',
      fundamento: FUNDAMENTO_IMPUTACION,
    });
  } else {
    let resto = totalPagos;
    const aRecargos = Math.min(resto, recargos);
    resto -= aRecargos;
    const baseMultas = totalMultas + actualizacionDeMultas;
    const aMultas = Math.min(resto, baseMultas);
    resto -= aMultas;
    const aPrincipalActualizado = Math.min(resto, principalActualizado);
    resto -= aPrincipalActualizado;
    imputacion = {
      aRecargos,
      aMultas,
      aPrincipalActualizado,
      excedente: resto,
      fundamento: FUNDAMENTO_IMPUTACION,
    };
    fuentes.push(FUNDAMENTO_IMPUTACION);
    advertencias.push(AVISO_IMPUTACION);
    traza.push({
      paso: 6,
      concepto: 'aplicacion de los pagos',
      importe: totalPagos,
      detalle: `Se registraron ${pagos.length} pagos por ${pesos(totalPagos)}. Aplicados en el orden del articulo 20: ${pesos(aRecargos)} a recargos, ${pesos(aMultas)} a multas y ${pesos(aPrincipalActualizado)} al principal actualizado.${resto > 0 ? ` Sobran ${pesos(resto)} por encima de lo estimado.` : ''} La actualizacion no se imputa aparte porque conserva la naturaleza juridica del principal.`,
      fundamento: FUNDAMENTO_IMPUTACION,
    });
  }

  // Paso 7. Desglose. La identidad tiene que cerrar sola.
  const saldo =
    entrada.importeOriginal + actualizacionTotal + recargos + totalMultas - totalPagos;

  const desglose: DesgloseCredito = {
    principal: entrada.importeOriginal,
    actualizacion: actualizacionTotal,
    recargos,
    multas: totalMultas,
    pagos: totalPagos,
    saldo,
  };

  traza.push({
    paso: 7,
    concepto: 'desglose',
    importe: saldo,
    detalle: `Principal ${pesos(desglose.principal)}, mas actualizacion ${pesos(actualizacionTotal)}, mas recargos ${pesos(recargos)}, mas multas ${pesos(totalMultas)}, menos pagos ${pesos(totalPagos)}, da un saldo estimado de ${pesos(saldo)}.`,
  });

  if (saldo < 0) {
    advertencias.push(
      `Los pagos registrados superan lo estimado en ${pesos(-saldo)}. Un saldo negativo aqui no es un saldo a favor: significa que la estimacion quedo por debajo de lo pagado y hay que revisar las cifras del expediente.`,
    );
  }

  const nivelIndice: NivelFuente = corpus.indice.nivelMinimo;
  const tasasDelPrimerMes = periodo?.meses[0] === undefined ? undefined : corpus.tasasDe(periodo.meses[0].ejercicio);
  if (tasasDelPrimerMes !== undefined && tasasDelPrimerMes.nivelFuente === 'B') {
    razonesParciales.push('Las tasas de recargos cargadas son de nivel B.');
    faltantes.push('Texto oficial de la Ley de Ingresos del ejercicio que fija la tasa de recargos.');
  }

  const confianza: Confianza = razonesParciales.length > 0 ? 'parcial' : 'verificada';
  for (const r of razonesParciales) advertencias.push(r);

  traza.push({
    paso: 8,
    concepto: 'traza emitida',
    importe: saldo,
    detalle: `Saldo estimado ${pesos(saldo)} al ${entrada.fechaCalculo}. Confianza: ${confianza}. Naturaleza: ${ESTIMACION}. Nivel minimo del indice aplicado: ${nivelIndice}.`,
  });

  const detalle: DetalleEstimacion = {
    factor,
    actualizacionDelPrincipal,
    actualizacionDeMultas,
    principalActualizado,
    periodoRecargos: periodo,
    tipoRecargo,
    tasaMensualAplicada,
    imputacion,
  };

  return {
    clase: ESTIMACION,
    leyenda: LEYENDA_ESTIMACION,
    confianza,
    entrada,
    desglose,
    detalle,
    traza,
    fuentes,
    faltantes,
    advertencias: [AVISO_BASE, ...advertencias],
    extincion,
  };
}

/** La identidad del desglose, expuesta para que las pruebas y la interfaz la comprueben. */
export function desgloseCuadra(d: DesgloseCredito): boolean {
  if (d.actualizacion === null || d.recargos === null || d.saldo === null) {
    return d.actualizacion === null && d.recargos === null && d.saldo === null;
  }
  return d.saldo === d.principal + d.actualizacion + d.recargos + d.multas - d.pagos;
}
