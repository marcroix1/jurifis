/**
 * Expediente juridico digital: la forma del dato.
 *
 * Aqui no se decide nada de derecho ni se calcula nada. Se declara que captura
 * el despacho, que devuelve el motor de plazos y como se nombra cada cosa. El
 * vocabulario sigue al de la base de datos (tablas cases, case_events,
 * deadlines y documents) para que la persistencia no obligue a traducir.
 */
import type { FechaISO } from '../fecha.js';
import type { Confianza, FormaNotificacion, ResultadoComputo } from '../tipos.js';

/**
 * Etapa procesal del expediente. Es la misma enumeracion que la base de datos
 * declara como estado_expediente, en el mismo orden.
 */
export type EstadoExpediente =
  | 'nuevo'
  | 'en_analisis'
  | 'plazo_corriendo'
  | 'demanda_presentada'
  | 'contestacion'
  | 'alegatos'
  | 'sentencia'
  | 'cumplimiento'
  | 'concluido';

export const ESTADOS: readonly EstadoExpediente[] = [
  'nuevo',
  'en_analisis',
  'plazo_corriendo',
  'demanda_presentada',
  'contestacion',
  'alegatos',
  'sentencia',
  'cumplimiento',
  'concluido',
];

export function esEstado(valor: string): valor is EstadoExpediente {
  return (ESTADOS as readonly string[]).includes(valor);
}

/** Naturaleza de la actuacion que se registra en la linea de tiempo. */
export type TipoEvento =
  | 'notificacion'
  | 'presentacion'
  | 'acuerdo'
  | 'requerimiento'
  | 'audiencia'
  | 'resolucion'
  | 'suspension'
  | 'documento'
  | 'cambio_de_estado'
  | 'nota';

export const TIPOS_EVENTO: readonly TipoEvento[] = [
  'notificacion',
  'presentacion',
  'acuerdo',
  'requerimiento',
  'audiencia',
  'resolucion',
  'suspension',
  'documento',
  'cambio_de_estado',
  'nota',
];

export function esTipoEvento(valor: string): valor is TipoEvento {
  return (TIPOS_EVENTO as readonly string[]).includes(valor);
}

/** Que le hace el evento a los plazos del expediente. */
export type EfectoEnPlazos = 'dispara' | 'suspende' | 'cumple' | 'ninguno';

/**
 * Lo que convierte una notificacion en el disparador de un computo. El
 * expediente no describe la regla: la elige del corpus por su clave, y el
 * motor de plazos hace el resto.
 */
export interface DisparadorPlazo {
  reglaId: string;
  formaNotificacion: FormaNotificacion;
  descripcion: string;
}

/** Suspension del computo. Siempre registrada por una persona, nunca inferida. */
export interface SuspensionRegistrada {
  hasta: FechaISO;
  motivo: string;
  fundamento: string;
}

export interface EventoExpediente {
  id: string;
  tipo: TipoEvento;
  titulo: string;
  descripcion: string | null;
  /** Fecha civil de la actuacion, sin hora y sin zona horaria. */
  ocurridoEn: FechaISO;
  /** Nulo salvo en la notificacion que echa a andar un plazo. */
  disparaPlazo: DisparadorPlazo | null;
  /** Nulo salvo en el evento que registra una suspension del computo. */
  suspension: SuspensionRegistrada | null;
  /** Identificador del plazo que esta actuacion da por cumplido. */
  cumplePlazoId: string | null;
  registradoPor: string | null;
}

export interface DocumentoExpediente {
  id: string;
  nombre: string;
  tipo: string | null;
  /** Huella del archivo. Si cambia sin aviso, el documento dejo de ser el mismo. */
  sha256: string | null;
  paginas: number | null;
  incorporadoEl: FechaISO;
}

export interface ClienteExpediente {
  nombre: string;
  /** Registro federal de contribuyentes. Nulo cuando el asunto no lo exige. */
  registroFederalDeContribuyentes: string | null;
}

export interface MontoExpediente {
  /** Cantidad en la unidad menor no fraccionada de la moneda, con centavos. */
  cantidad: number;
  moneda: string;
}

export interface Expediente {
  id: string;
  /** Numero que le asigna el tribunal o la autoridad. Nulo mientras no exista. */
  numeroExpediente: string | null;
  caratula: string;
  cliente: ClienteExpediente;
  autoridad: string;
  tipoProcedimiento: string;
  /** Numero del credito fiscal combatido, cuando el acto lo tiene. */
  numeroCredito: string | null;
  /** Ejercicio fiscal revisado. */
  ejercicio: number | null;
  monto: MontoExpediente | null;
  responsable: string;
  estado: EstadoExpediente;
  abiertoEn: FechaISO;
  cerradoEn: FechaISO | null;
  eventos: EventoExpediente[];
  documentos: DocumentoExpediente[];
  /**
   * Verdadero cuando el renglon es dato de demostracion y no un asunto real.
   * La interfaz lo declara en pantalla para que nadie lo confunda con cartera.
   */
  esEjemplo: boolean;
}

/**
 * Plazo del expediente. Guarda el resultado integro del motor, no un extracto:
 * la traza es la defensa del computo y viaja con el.
 */
export interface PlazoExpediente {
  id: string;
  expedienteId: string;
  /** Evento de notificacion que lo disparo. */
  eventoId: string;
  descripcion: string;
  reglaId: string;
  formaNotificacion: FormaNotificacion;
  fechaNotificacion: FechaISO;
  computo: ResultadoComputo;
  /** Fecha del evento que lo dio por cumplido. Nulo mientras siga corriendo. */
  cumplidoEn: FechaISO | null;
  cumplidoPorEventoId: string | null;
}

/** Un renglon de la linea de tiempo: el evento y lo que le hizo a los plazos. */
export interface RenglonLinea {
  /** Posicion cronologica, empezando en uno. */
  orden: number;
  evento: EventoExpediente;
  fecha: FechaISO;
  tipo: TipoEvento;
  efectoEnPlazos: EfectoEnPlazos;
  resumenEfecto: string;
  /** El plazo que este evento disparo o dio por cumplido. */
  plazo: PlazoExpediente | null;
}

/** Fecha importante del expediente, ya reunida de todas sus fuentes. */
export interface FechaClave {
  etiqueta: string;
  fecha: FechaISO;
  origen: 'expediente' | 'evento' | 'plazo';
}

/**
 * Urgencia de una alerta.
 *
 * no_computable esta arriba de todo a proposito: un plazo que el motor no
 * puede sostener es mas peligroso que uno que si, porque nadie sabe cuanto
 * tiempo queda. Nunca baja la urgencia, la sube.
 */
export type NivelUrgencia =
  | 'no_computable'
  | 'vencido'
  | 'critico'
  | 'alto'
  | 'medio'
  | 'bajo'
  | 'cumplido';

export interface Alerta {
  plazoId: string;
  expedienteId: string;
  caratula: string;
  responsable: string;
  nivel: NivelUrgencia;
  /** Solo sirve para ordenar. Entre mas alto, mas arriba va la alerta. */
  criticidad: number;
  titulo: string;
  detalle: string;
  accion: string;
  confianza: Confianza;
  /** Nulo siempre que el plazo no se pueda computar. */
  vence: FechaISO | null;
  /** Dias habiles restantes segun el motor. Nunca una cuenta propia. */
  diasHabilesRestantes: number | null;
  /** Que hace falta para poder computar o para subir de confianza. */
  faltantes: string[];
}
