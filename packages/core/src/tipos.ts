import type { FechaISO } from './fecha.js';

/** A: texto oficial integro y vigente. B: derivado, resumen o pagina no oficial. */
export type NivelFuente = 'A' | 'B';

export type UnidadPlazo = 'dias_habiles' | 'dias_naturales' | 'meses' | 'anios';

/**
 * verificada: regla y calendario de nivel A, cobertura completa.
 * parcial: calcula, pero algo la sostiene con nivel B declarado por un abogado.
 * insuficiente: falta calendario para el periodo. No se devuelve fecha.
 * bloqueada_por_fuente: la regla se apoya en nivel B sin declaracion. No se devuelve fecha.
 */
export type Confianza = 'verificada' | 'parcial' | 'insuficiente' | 'bloqueada_por_fuente';

export type FormaNotificacion =
  | 'personal'
  | 'oficio'
  | 'lista_o_estrados'
  | 'boletin_jurisdiccional'
  | 'buzon_tributario'
  | 'correo_certificado'
  | 'edictos'
  | 'acto_autoaplicativo';

export interface Fundamento {
  ordenamiento: string;
  articulo: string;
  fraccion?: string;
  inciso?: string;
  parrafo?: string;
  /** Publicacion o reforma que da el texto vigente citado. */
  publicacion: string;
  /** Archivo del acervo donde se leyo, y linea si se conoce. */
  archivo: string;
  linea?: number;
}

export interface ReglaSurtimiento {
  forma: FormaNotificacion;
  /** Cuantos dias despues de la diligencia surte efectos. Cero es el mismo dia. */
  desplazamiento: number;
  unidad: 'dias_habiles' | 'dias_naturales';
  fundamento: Fundamento;
}

export interface ReglaPlazo {
  id: string;
  procedimiento: string;
  descripcion: string;
  plazo: { cantidad: number; unidad: UnidadPlazo };
  /** Primer dia del computo, contado desde el surtimiento de efectos. */
  inicio: { primerDia: 'siguiente_habil' | 'siguiente_natural' | 'mismo_dia' };
  surtimiento: ReglaSurtimiento[];
  /** Identificadores de los calendarios que esta regla exige. */
  calendarios: string[];
  /** Si el ultimo dia cae inhabil, se recorre al siguiente habil. */
  prorrogaSiVenceInhabil: boolean;
  /** El dia del vencimiento cuenta como dia habil de presentacion. */
  incluyeDiaVencimiento: boolean;
  fundamento: Fundamento;
  vigenteDesde: FechaISO;
  vigenteHasta: FechaISO | null;
  nivelFuente: NivelFuente;
  /** Obligatorio cuando nivelFuente es B: quien declara la vigencia y cuando. */
  vigenciaDeclaradaPor?: { persona: string; fecha: FechaISO; nota: string };
  verificadoEl: FechaISO;
}

export interface DiaInhabil {
  fecha: FechaISO;
  motivo: string;
  fundamento: string;
}

export interface Calendario {
  id: string;
  nombre: string;
  /** Anios que este calendario declara cubrir de forma completa. */
  aniosCubiertos: number[];
  nivelFuente: NivelFuente;
  fuente: string;
  consultadoEl: FechaISO;
  /** Fines de semana inhabiles por regla, sin necesidad de enumerarlos. */
  finesDeSemanaInhabiles: boolean;
  dias: DiaInhabil[];
  /** Hueco conocido y declarado, para no fingir cobertura que no existe. */
  huecos?: { descripcion: string; desde: FechaISO; hasta: FechaISO }[];
}

export interface PasoTraza {
  paso: number;
  concepto: string;
  fecha?: FechaISO;
  detalle: string;
  fundamento?: Fundamento | string;
}

export interface EntradaComputo {
  reglaId: string;
  fechaNotificacion: FechaISO;
  formaNotificacion: FormaNotificacion;
  /** Fecha contra la que se calculan dias transcurridos y restantes. */
  hoy?: FechaISO;
  /** Suspensiones registradas como eventos del expediente. Nunca inferidas. */
  suspensiones?: { desde: FechaISO; hasta: FechaISO; motivo: string; fundamento: string }[];
}

export interface ResultadoComputo {
  confianza: Confianza;
  /** Nulo siempre que la confianza sea insuficiente o bloqueada_por_fuente. */
  vence: FechaISO | null;
  surteEfectos: FechaISO | null;
  inicioComputo: FechaISO | null;
  diasTranscurridos: number | null;
  diasRestantes: number | null;
  inhabilesAplicados: DiaInhabil[];
  traza: PasoTraza[];
  fuentes: Fundamento[];
  advertencias: string[];
  /** Que hace falta para subir de confianza. Vacio cuando ya esta verificada. */
  faltantes: string[];
}
