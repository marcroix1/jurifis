import type { FechaISO } from '../fecha.js';
import type { Confianza, Fundamento, NivelFuente } from '../tipos.js';

/**
 * Tipos del modulo de credito fiscal.
 *
 * Regla que gobierna todo el modulo: esto estima, no determina. La palabra vive en el
 * tipo de retorno y no en un comentario de la interfaz, para que ninguna salida de este
 * motor pueda circular como determinacion oficial sin que el compilador la delate.
 */

/**
 * Importe en centavos de peso mexicano, siempre entero.
 *
 * Motivo: el mismo que llevo a proscribir el objeto Date en el motor de plazos. Un
 * credito fiscal se discute al centavo y los flotantes con decimales acumulan derrapes
 * que despues nadie puede explicar. Aqui el dinero es entero y el redondeo se declara.
 */
export type Centavos = number;

/** Mes civil en formato AAAA-MM. Sin dia, porque la actualizacion no corre por fracciones de mes. */
export type MesISO = string;

/**
 * Sello de naturaleza. Es un literal fijo, no una bandera que alguien pueda apagar:
 * cualquier resultado de este motor lo lleva y el tipo obliga a que sea ese valor.
 */
export const ESTIMACION = 'ESTIMACION';
export type SelloEstimacion = 'ESTIMACION';

export const LEYENDA_ESTIMACION =
  'ESTIMACION. Este calculo no es determinacion oficial de credito fiscal, no sustituye la liquidacion de la autoridad ni la verificacion del abogado responsable.';

// ---------------------------------------------------------------------------
// Datos economicos del corpus
// ---------------------------------------------------------------------------

/** Un valor del indice de precios, con el nivel de la fuente de la que se tomo. */
export interface ValorIndice {
  mes: MesISO;
  valor: number;
  nivelFuente: NivelFuente;
  fuente: string;
  consultadoEl: FechaISO;
}

export interface SerieIndice {
  id: string;
  nombre: string;
  serie: string;
  cuadro: string;
  base: string;
  /** Quien calcula el indice por mandato de ley. */
  emisorLegal: string;
  /** Publicacion que surte efectos fiscales. */
  publicacionQueSurteEfectos: string;
  /** Quien nada mas replica la serie, si es el caso. */
  replicador: string | null;
  advertenciaDeFuente: string;
  consultadoEl: FechaISO;
  fundamento: Fundamento;
  valores: ValorIndice[];
  huecosDeclarados: string;
}

/** Clave de la tasa de recargos que el ejercicio fija por ley. */
export type ClaveTasaLey =
  | 'prorroga'
  | 'parcialidadesHastaDoceMeses'
  | 'parcialidadesDeMasDeDoceYHastaVeinticuatroMeses'
  | 'parcialidadesSuperioresAVeinticuatroMesesYPagoDiferido';

/**
 * Tipo de recargo que se va a estimar.
 *
 * mora no es una tasa de ley: es la de prorroga incrementada en cincuenta por ciento
 * conforme al articulo 21 del Codigo Fiscal de la Federacion. Por eso se separa.
 */
export type TipoRecargo = 'mora' | ClaveTasaLey;

export interface TasasEjercicio {
  ejercicio: number;
  nombre: string;
  vigenteDesde: FechaISO;
  vigenteHasta: FechaISO;
  nivelFuente: NivelFuente;
  verificadoEl: FechaISO;
  nota: string;
  tasasMensuales: Record<ClaveTasaLey, number>;
  fundamento: Fundamento;
  fundamentoPorTasa: Record<ClaveTasaLey, Fundamento>;
  mora: {
    explicacion: string;
    tasaBase: ClaveTasaLey;
    fundamento: Fundamento;
  };
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------

export interface PagoRegistrado {
  fecha: FechaISO;
  importe: Centavos;
  concepto: string;
}

export interface MultaRegistrada {
  concepto: string;
  importe: Centavos;
  /**
   * Fecha en que debio pagarse la multa. Cuando se registra, la multa se actualiza en
   * los terminos del articulo 70 del Codigo Fiscal de la Federacion. Cuando falta, no
   * se actualiza y el motor declara por que.
   */
  fechaExigibilidad?: FechaISO;
}

export interface EntradaCredito {
  /** Que se esta estimando, en palabras del expediente. */
  concepto: string;
  /** Ejercicio o periodo al que corresponde la contribucion omitida. */
  ejercicio: number;
  importeOriginal: Centavos;
  /** Fecha del acto que dio origen al credito, si consta. Informativa. */
  fechaCausacion?: FechaISO;
  /** Fecha en que el pago pudo ser legalmente exigido. Es la que abre los computos. */
  fechaExigibilidad: FechaISO;
  /** Hasta que dia se estima. Se pide siempre: este motor no consulta ningun reloj. */
  fechaCalculo: FechaISO;
  tipoRecargo?: TipoRecargo;
  pagos?: PagoRegistrado[];
  multas?: MultaRegistrada[];
  /** Actos del expediente para el analisis de prescripcion y caducidad. */
  lineaDeTiempo?: ActoExpediente[];
}

// ---------------------------------------------------------------------------
// Traza
// ---------------------------------------------------------------------------

/** Mismo contrato que la traza del motor de plazos, mas el importe que el paso produjo. */
export interface PasoTrazaCredito {
  paso: number;
  concepto: string;
  fecha?: FechaISO;
  importe?: Centavos;
  detalle: string;
  fundamento?: Fundamento | string;
}

// ---------------------------------------------------------------------------
// Actualizacion
// ---------------------------------------------------------------------------

export interface FactorActualizacion {
  /** Cociente del articulo 17-A, sin redondear. */
  factor: number;
  mesMasAntiguo: MesISO;
  mesMasReciente: MesISO;
  mesAnteriorAlMasAntiguo: MesISO;
  mesAnteriorAlMasReciente: MesISO;
  indiceAntiguo: ValorIndice;
  indiceReciente: ValorIndice;
  /** El quinto parrafo del articulo 17-A ordena usar 1 cuando el cociente baja de la unidad. */
  aplicoPisoUnitario: boolean;
}

export type ResultadoFactor =
  /** El periodo no abarca un mes completo posterior. No hay que actualizar y no falta nada. */
  | { estado: 'sin_actualizacion'; razon: string }
  | { estado: 'calculado'; factor: FactorActualizacion }
  | { estado: 'insuficiente'; mesesFaltantes: MesISO[]; explicacion: string[] };

// ---------------------------------------------------------------------------
// Recargos
// ---------------------------------------------------------------------------

export interface MesDeRecargo {
  numero: number;
  desde: FechaISO;
  hasta: FechaISO;
  ejercicio: number;
  /** Tasa mensual en por ciento. */
  tasa: number;
  fundamento: Fundamento;
}

export interface PeriodoRecargos {
  meses: MesDeRecargo[];
  /** Suma de las tasas mensuales, en por ciento. */
  tasaAcumulada: number;
  /** Meses que quedaron fuera por el tope de cinco anios del articulo 21. */
  mesesFueraDelTope: number;
}

export type ResultadoRecargos =
  | { estado: 'sin_recargos'; razon: string }
  | { estado: 'calculado'; periodo: PeriodoRecargos }
  | { estado: 'insuficiente'; ejerciciosFaltantes: number[]; explicacion: string[] };

// ---------------------------------------------------------------------------
// Prescripcion y caducidad
// ---------------------------------------------------------------------------

export type TipoActo =
  | 'nacimiento_del_credito'
  | 'exigibilidad'
  | 'notificacion_del_credito'
  | 'requerimiento_de_pago'
  | 'acto_del_procedimiento_administrativo_de_ejecucion'
  | 'embargo'
  | 'convenio_de_pago_a_plazos'
  | 'pago'
  | 'reconocimiento_expreso_o_tacito'
  | 'recurso_administrativo'
  | 'juicio'
  | 'suspension_del_procedimiento_administrativo_de_ejecucion'
  | 'domicilio_fiscal_desocupado_o_incorrecto'
  | 'ejercicio_de_facultades_de_comprobacion'
  | 'otro';

/** Si, no, o no consta. La tercera nunca se colapsa en las otras dos. */
export type Constancia = 'si' | 'no' | 'no_consta';

export interface ActoExpediente {
  tipo: TipoActo;
  fecha: FechaISO;
  descripcion: string;
  /** Si el acto se notifico o se hizo saber al deudor. Decisivo para el articulo 146. */
  notificadoAlDeudor?: Constancia;
  /** Fecha en que termino, para los actos que abarcan un periodo. */
  fechaFin?: FechaISO;
  /** Foja, oficio o documento del expediente donde consta. */
  constaEn?: string;
}

/** Supuesto de interrupcion o de suspension, tal como el corpus lo carga. */
export interface SupuestoExtincion {
  clave: string;
  descripcion: string;
  requiereVerificar: string[];
  fundamento?: Fundamento;
}

export interface NormaPrescripcion {
  descripcion: string;
  plazoAnios: number;
  inicio: string;
  topeAnios: number;
  notaTope: string;
  fundamento: Fundamento;
  fundamentoInterrupcion: Fundamento;
  fundamentoTope: Fundamento;
  interrumpenSiSeAcreditan: SupuestoExtincion[];
  suspendenSiSeAcreditan: SupuestoExtincion[];
}

export interface NormaCaducidad {
  descripcion: string;
  plazoAnios: number;
  plazoAmpliadoAnios: number;
  notaPlazoAmpliado: string;
  sujetaAInterrupcion: boolean;
  notaInterrupcion: string;
  fundamento: Fundamento;
  fundamentoSuspension: Fundamento;
  suspendenSiSeAcreditan: SupuestoExtincion[];
  notaCatalogoIncompleto: string;
}

export interface NormaExtincion {
  id: string;
  nombre: string;
  nivelFuente: NivelFuente;
  verificadoEl: FechaISO;
  prescripcion: NormaPrescripcion;
  caducidad: NormaCaducidad;
}

export interface ActoConEfectoPosible {
  acto: ActoExpediente;
  /** Efecto que la ley le atribuye si se acredita. Nunca se afirma que ya se acredito. */
  efectoPosible: 'interrupcion' | 'suspension';
  porQue: string;
  requiereVerificar: string[];
  fundamento: Fundamento;
}

/**
 * Conclusion del submodulo. Es un literal fijo y unico a proposito.
 *
 * El tipo hace imposible que este modulo devuelva "prescrito" o "no prescrito": el
 * transcurso de cinco anios por si solo no extingue nada mientras no se descarte cada
 * gestion de cobro notificada y cada causa de suspension.
 */
export type ConclusionExtincion = 'requiere_verificacion_de_actos_interruptores';

export const CONCLUSION_EXTINCION: ConclusionExtincion = 'requiere_verificacion_de_actos_interruptores';

export interface BloqueExtincion {
  figura: 'prescripcion' | 'caducidad';
  conclusion: ConclusionExtincion;
  plazoAnios: number;
  /** Dato informativo: dias naturales corridos. No es computo de plazo ni conclusion. */
  diasNaturalesCorridos: number | null;
  aniosNaturalesCorridos: number | null;
  /** Fecha en que se cumplirian los anios del plazo si nada lo hubiera tocado. Referencia, no vencimiento. */
  fechaDeReferenciaSinInterrupciones: FechaISO | null;
  actosConEfectoPosible: ActoConEfectoPosible[];
  requiereVerificar: string[];
  advertencias: string[];
  fuentes: Fundamento[];
}

export interface AnalisisExtincion {
  clase: SelloEstimacion;
  leyenda: string;
  conclusion: ConclusionExtincion;
  prescripcion: BloqueExtincion;
  caducidad: BloqueExtincion;
  /** Actos registrados a los que este modulo no atribuye efecto. Se declaran, no se ocultan. */
  actosSinEfectoAtribuido: ActoExpediente[];
  traza: PasoTrazaCredito[];
  advertencias: string[];
}

// ---------------------------------------------------------------------------
// Salida del motor
// ---------------------------------------------------------------------------

/**
 * Desglose obligatorio. Seis renglones separados, nunca un total suelto.
 *
 * principal, multas y pagos son cifras que vienen del expediente y se devuelven siempre.
 * actualizacion, recargos y saldo son estimacion: valen nulo cuando el motor no las
 * puede sostener, y entonces no hay cifra en ninguna parte de la salida.
 */
export interface DesgloseCredito {
  principal: Centavos;
  actualizacion: Centavos | null;
  recargos: Centavos | null;
  multas: Centavos;
  pagos: Centavos;
  saldo: Centavos | null;
}

/** Como se aplicaron los pagos, en el orden del articulo 20 del Codigo Fiscal de la Federacion. */
export interface ImputacionPagos {
  aRecargos: Centavos;
  aMultas: Centavos;
  aPrincipalActualizado: Centavos;
  /** Lo que sobro despues de cubrir todo lo estimado. */
  excedente: Centavos;
  fundamento: Fundamento;
}

export interface DetalleEstimacion {
  factor: FactorActualizacion | null;
  actualizacionDelPrincipal: Centavos | null;
  actualizacionDeMultas: Centavos | null;
  principalActualizado: Centavos | null;
  periodoRecargos: PeriodoRecargos | null;
  tipoRecargo: TipoRecargo;
  tasaMensualAplicada: number | null;
  imputacion: ImputacionPagos | null;
}

export interface EstimacionCredito {
  /** Sello de naturaleza. Literal fijo: esto estima, no determina. */
  clase: SelloEstimacion;
  leyenda: string;
  confianza: Confianza;
  entrada: EntradaCredito;
  desglose: DesgloseCredito;
  detalle: DetalleEstimacion;
  traza: PasoTrazaCredito[];
  fuentes: Fundamento[];
  faltantes: string[];
  advertencias: string[];
  /** Analisis de prescripcion y caducidad, cuando la entrada trae linea de tiempo. */
  extincion: AnalisisExtincion | null;
}
