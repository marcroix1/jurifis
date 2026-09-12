import type { FechaISO } from '../fecha.js';

/**
 * Tipos del cuestionario preliminar "puedo impugnar".
 *
 * Regla que gobierna todo el modulo: el cuestionario es dato, no codigo. Aqui solo
 * se declara la forma que ese dato debe tener para que el arbol lo pueda recorrer.
 */

export type TipoPregunta = 'opcion_unica' | 'opcion_multiple' | 'fecha' | 'monto';

export interface Opcion {
  valor: string;
  etiqueta: string;
}

/**
 * Condicion de ramificacion. Se evalua contra las respuestas ya capturadas y solo
 * puede mirar preguntas anteriores, nunca posteriores.
 */
export type Condicion =
  | { operador: 'siempre' }
  /** La pregunta se respondio con esa opcion unica. */
  | { operador: 'igual'; pregunta: string; valor: string }
  /** La opcion unica esta dentro del conjunto. */
  | { operador: 'en'; pregunta: string; valores: string[] }
  /** La opcion multiple incluye ese valor. */
  | { operador: 'contiene'; pregunta: string; valor: string }
  /** Hay cualquier respuesta util, distinta de "no lo se". */
  | { operador: 'respondida'; pregunta: string }
  /** Se respondio expresamente "no lo se", o todavia no se responde. */
  | { operador: 'no_se'; pregunta: string }
  | { operador: 'y'; condiciones: Condicion[] }
  | { operador: 'o'; condiciones: Condicion[] }
  | { operador: 'no'; condicion: Condicion };

export interface Pregunta {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  /** Aclaracion de donde se saca el dato. Nunca orienta hacia una respuesta. */
  ayuda?: string;
  /** Obligatorias en opcion_unica y opcion_multiple, prohibidas en fecha y monto. */
  opciones?: Opcion[];
  /** Si falta, la pregunta se hace siempre. */
  condicion?: Condicion;
  /** Permite responder "no lo se" en lugar de suponer. */
  permiteNoSe?: boolean;
  /** Unidad del monto, para que la interfaz no la invente. */
  moneda?: string;
}

export interface Cuestionario {
  version: string;
  titulo: string;
  preguntas: Pregunta[];
}

export type Respuesta =
  | { tipo: 'opcion_unica'; valor: string }
  | { tipo: 'opcion_multiple'; valores: string[] }
  | { tipo: 'fecha'; valor: FechaISO }
  | { tipo: 'monto'; valor: number }
  /** Declarar la ignorancia es una respuesta valida. Suponer no lo es. */
  | { tipo: 'no_se' };

/** Respuestas capturadas, indexadas por identificador de pregunta. */
export type Respuestas = Record<string, Respuesta>;

/** Si, no, o no se sabe. La tercera no se colapsa nunca en las otras dos. */
export type Ternario = 'si' | 'no' | 'no_se';

/**
 * inmediata: hay un acto de ejecucion en curso sobre el patrimonio.
 * alta: hay ejecucion iniciada o la notificacion no es reciente.
 * media: hay acto notificado y una via posible que revisar.
 * por_definir: falta informacion basica para siquiera graduar la urgencia.
 */
export type NivelUrgencia = 'inmediata' | 'alta' | 'media' | 'por_definir';

export interface ViaPosible {
  clave: string;
  /** Nombre desarrollado, sin siglas. */
  nombre: string;
  /**
   * Identificador de la regla del motor de plazos que hay que consultar. Este modulo
   * no calcula ni enuncia plazos: entrega el identificador y el motor da la fecha.
   */
  reglaPlazoId: string;
  /** Por que se menciona la via, en lenguaje que no anticipa resultado. */
  porQue: string;
  /** Lo que hay que revisar antes de considerarla siquiera procedente. */
  requiereVerificar: string[];
}

export interface Diagnostico {
  /** Version del cuestionario con el que se armo. */
  version: string;
  resumen: string;
  urgencia: NivelUrgencia;
  motivosUrgencia: string[];
  vias: ViaPosible[];
  /** Identificadores de reglas del motor de plazos, sin repetir. */
  plazosPorVerificar: string[];
  documentos: string[];
  /** Lo que falta por saber. Nunca se sustituye por una suposicion. */
  informacionFaltante: string[];
  lineasDeAnalisis: string[];
  advertencias: string[];
  /**
   * Dias naturales entre la notificacion y la fecha de referencia. Dato informativo
   * y nada mas: no es computo de plazo ni fecha de vencimiento.
   */
  diasNaturalesDesdeNotificacion: number | null;
}

export interface OpcionesDiagnostico {
  /** Fecha de referencia. Sin ella no se mide el tiempo transcurrido. */
  hoy?: FechaISO;
}

/** Lo que el arbol devuelve en cada vuelta: la siguiente pregunta, o el diagnostico. */
export type Paso =
  | {
      estado: 'pregunta';
      pregunta: Pregunta;
      respondidas: number;
      aplicables: number;
    }
  | { estado: 'diagnostico'; diagnostico: Diagnostico };
