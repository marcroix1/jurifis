import type { FechaISO } from '../fecha.js';
import type { NivelFuente } from '../tipos.js';

/**
 * Tipos del acervo de criterios.
 *
 * Regla que gobierna todo el modulo: el criterio es dato verificado por una
 * persona, nunca texto que el codigo componga. Aqui solo se declara la forma
 * que ese dato debe tener para poder citarse.
 *
 * Los nombres de campo siguen la tabla jurisprudence de @jurifis/db. Donde el
 * nombre cambia se anota la columna equivalente.
 */

/**
 * Naturaleza del criterio. Enumeracion cerrada e identica al tipo tipo_criterio
 * de la base de datos. No admite texto libre: lo que no esta en esta lista no
 * entra al acervo.
 */
export const TIPOS_CRITERIO = [
  'jurisprudencia',
  'tesis_aislada',
  'precedente',
  'sentencia',
  'criterio_administrativo',
  'legislacion',
] as const;

export type TipoCriterio = (typeof TIPOS_CRITERIO)[number];

/** Origen oficial del que puede provenir un criterio. Lista cerrada por acervo. */
export interface OrigenOficial {
  clave: string;
  /** Nombre desarrollado, sin siglas. */
  nombre: string;
  /** Que se espera obtener de ese origen. */
  aporta: string;
  /** Direccion o referencia del documento de origen. Nulo mientras no se documente. */
  direccion: string | null;
}

/**
 * Criterio publicado en el acervo. Solo llega aqui lo que recorrio las cuatro
 * etapas de ingesta, incluida la revision humana.
 */
export interface Criterio {
  /** Identificador interno derivado de la huella del contenido normalizado. */
  id: string;
  tipoCriterio: TipoCriterio;
  rubro: string;
  texto: string;
  organo: string | null;
  epoca: string | null;
  /** Identidad de cita. Es la llave que el guardian de citas comprueba. */
  registroDigital: string | null;
  materia: string | null;
  precedentes: string | null;
  claveControl: string | null;
  instancia: string | null;
  fechaPublicacion: FechaISO | null;
  /** Clave del origen oficial declarado. Columna fuente_id en la base de datos. */
  origen: string;
  /** Documento concreto del que se tomo el texto. */
  documento: string;
  /** Fecha en que se consulto el origen. */
  consultadoEl: FechaISO;
  /** Columna nivel en la base de datos. */
  nivelFuente: NivelFuente;
  /** Candado de citacion. Ningun escrito cita un renglon con esto en falso. */
  verificado: boolean;
  /** Columna verificado_por. Quien reviso a mano. Nunca un proceso automatico. */
  revisadoPor: string | null;
  /** Columna verificado_en. */
  revisadoEl: FechaISO | null;
  /** Nota de la revision humana. */
  notaRevision: string | null;
  /** Version de publicacion, empieza en uno y sube con cada correccion. */
  version: number;
  publicadoEl: FechaISO | null;
  /** Huella del contenido normalizado. Si el texto cambia, la revision caduca. */
  huella: string;
}

/** Archivo del acervo tal como vive en datos/jurisprudencia/acervo.json. */
export interface Acervo {
  /** Version del formato del archivo, no del contenido. */
  esquema: number;
  /** Version del contenido. Sube cada vez que se publica o corrige un criterio. */
  version: string;
  actualizadoEl: FechaISO;
  /** Origenes de los que podran venir los criterios. Lista cerrada. */
  origenes: OrigenOficial[];
  /** Lo que hace falta para cargar el primer criterio. */
  requisitosDeCarga: string[];
  notas: string[];
  criterios: Criterio[];
}

/** Valores presentes en el acervo para cada filtro. Vacios mientras no haya criterios. */
export interface FacetasAcervo {
  tipos: TipoCriterio[];
  organos: string[];
  epocas: string[];
  materias: string[];
}

/** Estado del acervo, tal como la interfaz necesita declararlo. */
export interface EstadoAcervo {
  vacio: boolean;
  criteriosCargados: number;
  criteriosVerificados: number;
  version: string;
  esquema: number;
  actualizadoEl: FechaISO;
  origenes: OrigenOficial[];
  requisitosDeCarga: string[];
  notas: string[];
  facetas: FacetasAcervo;
}

/** Resumen minimo del acervo que acompaña a toda respuesta del modulo. */
export interface ResumenAcervo {
  vacio: boolean;
  criteriosCargados: number;
  version: string;
}

/* -------------------------------------------------------------------------- */
/* Busqueda                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * registro_digital: coincidencia exacta por la llave de cita.
 * clave_control: coincidencia exacta por la clave de la tesis o del precedente.
 * texto: coincidencia lexica sobre rubro, texto, materia y precedentes.
 * significado: busqueda por vectores. Declarada y todavia sin motor.
 */
export type ClaveEstrategia = 'registro_digital' | 'clave_control' | 'texto' | 'significado';

/**
 * aplicada: la estrategia corrio.
 * omitida: la consulta no traia el dato que esa estrategia necesita.
 * no_disponible: la estrategia existe en el diseño y todavia no tiene motor.
 */
export type EstadoEstrategia = 'aplicada' | 'omitida' | 'no_disponible';

export interface Estrategia {
  clave: ClaveEstrategia;
  estado: EstadoEstrategia;
  detalle: string;
  coincidencias: number;
}

export interface Coincidencia {
  criterio: Criterio;
  /** Uno en la coincidencia exacta por registro digital, menor en la lexica. */
  puntaje: number;
  /** Estrategias que trajeron este criterio. */
  por: ClaveEstrategia[];
  /** Fragmentos del criterio donde coincidio el texto buscado. */
  fragmentos: string[];
}

export interface ConsultaBusqueda {
  /** Lenguaje natural. Se compara palabra por palabra, sin interpretar. */
  texto?: string;
  registroDigital?: string;
  claveControl?: string;
  tipos?: TipoCriterio[];
  organo?: string;
  epoca?: string;
  materia?: string;
  limite?: number;
  desplazamiento?: number;
}

export interface ResultadoBusqueda {
  /** La consulta ya normalizada, para que la interfaz muestre lo que se busco. */
  consulta: ConsultaBusqueda;
  total: number;
  coincidencias: Coincidencia[];
  estrategias: Estrategia[];
  acervo: ResumenAcervo;
  advertencias: string[];
  /** Que hace falta para que la busqueda pueda devolver algo. */
  faltantes: string[];
}

/* -------------------------------------------------------------------------- */
/* Guardian de citas                                                          */
/* -------------------------------------------------------------------------- */

/**
 * registro_digital: el texto cita un registro digital.
 * clave_control: el texto cita la clave de una tesis o de un precedente.
 * mencion_sin_registro: el texto invoca un criterio sin dar con que ubicarlo.
 */
export type ClaseCita = 'registro_digital' | 'clave_control' | 'mencion_sin_registro';

/**
 * registro_inexistente: se cita un registro digital que el acervo no tiene.
 * clave_inexistente: se cita una clave que el acervo no tiene.
 * criterio_sin_verificar: el criterio existe pero no paso la revision humana.
 * cita_sin_registro: se invoca un criterio sin registro digital que lo ubique.
 */
export type ClaseIncidente =
  | 'registro_inexistente'
  | 'clave_inexistente'
  | 'criterio_sin_verificar'
  | 'cita_sin_registro';

export interface CitaDetectada {
  clase: ClaseCita;
  /** El valor citado, tal como aparece en el texto. */
  valor: string;
  desde: number;
  hasta: number;
  /** Contexto alrededor de la cita, para que se vea de donde salio. */
  fragmento: string;
}

export interface IncidenteCita {
  clase: ClaseIncidente;
  cita: CitaDetectada;
  motivo: string;
  /** Que hay que hacer. Nunca es corregir el numero. */
  remedio: string;
}

export interface OpcionesGuardia {
  /**
   * Trata como cita toda mencion de un criterio acompañada de su rubro, aunque
   * no traiga registro digital. Encendido por omision.
   */
  exigirRegistroEnMenciones?: boolean;
  /**
   * Trata como rubro cualquier tramo largo en mayusculas. Apagado por omision
   * porque los titulos de un escrito tambien van en mayusculas.
   */
  detectarRubrosEnMayusculas?: boolean;
}

export interface RevisionCitas {
  /** Verdadero en cuanto hay un solo incidente. El guardian no gradua. */
  bloqueada: boolean;
  /** El texto recibido, intacto. Nulo cuando la salida esta bloqueada. */
  salida: string | null;
  citas: CitaDetectada[];
  incidentes: IncidenteCita[];
  resumen: string;
  acervo: ResumenAcervo;
}

/* -------------------------------------------------------------------------- */
/* Ingesta                                                                    */
/* -------------------------------------------------------------------------- */

export type ClaveEtapa =
  | 'origen_oficial'
  | 'normalizacion'
  | 'revision_humana'
  | 'publicacion_versionada';

export interface Etapa {
  numero: 1 | 2 | 3 | 4;
  clave: ClaveEtapa;
  nombre: string;
  descripcion: string;
  /** La etapa la ejecuta una persona y no hay forma de saltarla. */
  humana: boolean;
}

/** Lo que el origen oficial entrega. Todavia sin normalizar ni revisar. */
export interface EntradaOrigen {
  origen: string;
  /** Documento concreto del que se tomo el texto. */
  documento: string;
  consultadoEl: FechaISO;
  nivelFuente: NivelFuente;
  /** Tipo declarado por el origen. El modulo no lo infiere jamas. */
  tipoCriterio: TipoCriterio;
  rubro: string;
  texto: string;
  organo?: string;
  epoca?: string;
  registroDigital?: string;
  materia?: string;
  precedentes?: string;
  claveControl?: string;
  instancia?: string;
  fechaPublicacion?: FechaISO;
}

/** Datos que la revision humana debe aportar. Sin esto no hay publicacion. */
export interface Revision {
  /** Persona que leyo el criterio contra el documento oficial. */
  revisadoPor: string;
  revisadoEl: FechaISO;
  nota: string;
  /**
   * Huella del texto que la persona tuvo enfrente. Si no coincide con la del
   * criterio normalizado, la revision no ampara este contenido.
   */
  huellaRevisada: string;
}

export interface Publicacion {
  publicadoEl: FechaISO;
  /** Version de publicacion. Uno la primera vez, y sube con cada correccion. */
  version?: number;
}
