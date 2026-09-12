/**
 * Maquina de estados del expediente.
 *
 * Regla del modulo: solo lo declarado como valido es valido. Lo que no esta en
 * la tabla se rechaza con el motivo y la lista de lo que si se puede hacer, en
 * lugar de dejar pasar un salto de etapa que despues nadie sabe explicar.
 *
 * El grafo no admite marcha atras. Corregir una etapa mal capturada es un acto
 * consciente de quien administra el expediente, no una transicion mas.
 */
import type { EstadoExpediente, EventoExpediente } from './tipos.js';
import { ESTADOS } from './tipos.js';

/**
 * Transiciones permitidas desde cada etapa.
 *
 * concluido cuelga de todas las demas porque un asunto se cierra en cualquier
 * momento: por desistimiento, por convenio o porque el cliente se retira.
 * Desde concluido no sale nada.
 */
const TRANSICIONES: Record<EstadoExpediente, readonly EstadoExpediente[]> = {
  nuevo: ['en_analisis', 'concluido'],
  en_analisis: ['plazo_corriendo', 'concluido'],
  plazo_corriendo: ['demanda_presentada', 'concluido'],
  demanda_presentada: ['contestacion', 'sentencia', 'concluido'],
  contestacion: ['alegatos', 'sentencia', 'concluido'],
  alegatos: ['sentencia', 'concluido'],
  sentencia: ['cumplimiento', 'concluido'],
  cumplimiento: ['concluido'],
  concluido: [],
};

/** Por que existe cada transicion, para que la interfaz no la invente. */
const MOTIVOS: Partial<Record<`${EstadoExpediente}>${EstadoExpediente}`, string>> = {
  'nuevo>en_analisis': 'Se abrio el estudio del acto y de la via.',
  'en_analisis>plazo_corriendo': 'Se registro la notificacion y el plazo empezo a correr.',
  'plazo_corriendo>demanda_presentada': 'Se presento la demanda dentro del plazo.',
  'demanda_presentada>contestacion': 'La autoridad contesto la demanda.',
  'demanda_presentada>sentencia': 'El asunto llego a sentencia sin contestacion registrada.',
  'contestacion>alegatos': 'Se abrio el periodo de alegatos.',
  'contestacion>sentencia': 'El asunto llego a sentencia sin alegatos registrados.',
  'alegatos>sentencia': 'Se dicto sentencia.',
  'sentencia>cumplimiento': 'La sentencia entro a la fase de cumplimiento.',
  'cumplimiento>concluido': 'Se cumplio la sentencia y el asunto quedo cerrado.',
};

export class TransicionInvalida extends Error {
  readonly desde: EstadoExpediente;
  readonly hacia: EstadoExpediente;
  readonly permitidas: readonly EstadoExpediente[];

  constructor(desde: EstadoExpediente, hacia: EstadoExpediente) {
    const permitidas = TRANSICIONES[desde];
    super(
      permitidas.length === 0
        ? `El expediente esta en "${desde}" y desde ahi no sale ninguna transicion. No se puede pasar a "${hacia}".`
        : `No se puede pasar de "${desde}" a "${hacia}". Desde "${desde}" solo procede: ${permitidas.join(', ')}.`,
    );
    this.name = 'TransicionInvalida';
    this.desde = desde;
    this.hacia = hacia;
    this.permitidas = permitidas;
  }
}

/** Etapas a las que se puede pasar desde la actual. Vacio significa terminal. */
export function transicionesDesde(estado: EstadoExpediente): readonly EstadoExpediente[] {
  return TRANSICIONES[estado];
}

export function transicionValida(desde: EstadoExpediente, hacia: EstadoExpediente): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

export function esEstadoTerminal(estado: EstadoExpediente): boolean {
  return TRANSICIONES[estado].length === 0;
}

/** Motivo declarado de la transicion. Cadena vacia cuando no esta declarado. */
export function motivoTransicion(desde: EstadoExpediente, hacia: EstadoExpediente): string {
  if (hacia === 'concluido' && desde !== 'cumplimiento') {
    return 'El asunto se cerro antes de agotar la etapa en curso.';
  }
  return MOTIVOS[`${desde}>${hacia}`] ?? '';
}

/** El grafo completo, para que la interfaz lo pueda explicar sin copiarlo. */
export function grafoDeEstados(): { estado: EstadoExpediente; hacia: readonly EstadoExpediente[] }[] {
  return ESTADOS.map((estado) => ({ estado, hacia: TRANSICIONES[estado] }));
}

export type ResultadoTransicion =
  | { ok: true; estado: EstadoExpediente; evento: EventoExpediente }
  | { ok: false; motivo: string; permitidas: readonly EstadoExpediente[] };

export interface DatosTransicion {
  /** Fecha civil del cambio. Entra desde afuera: este modulo no lee el reloj. */
  fecha: string;
  /** Identificador del evento que deja constancia. Entra desde afuera. */
  eventoId: string;
  nota?: string;
  registradoPor?: string;
}

/**
 * Verifica la transicion y, si procede, devuelve la etapa nueva junto con el
 * evento que la deja asentada en la linea de tiempo. No muta el expediente:
 * quien lo guarda decide como aplicarlo.
 */
export function cambiarEstado(
  desde: EstadoExpediente,
  hacia: EstadoExpediente,
  datos: DatosTransicion,
): ResultadoTransicion {
  if (desde === hacia) {
    return {
      ok: false,
      motivo: `El expediente ya esta en "${desde}".`,
      permitidas: TRANSICIONES[desde],
    };
  }
  if (!transicionValida(desde, hacia)) {
    return {
      ok: false,
      motivo: new TransicionInvalida(desde, hacia).message,
      permitidas: TRANSICIONES[desde],
    };
  }

  const explicacion = motivoTransicion(desde, hacia);
  const partes = [`El expediente paso de "${desde}" a "${hacia}".`];
  if (explicacion !== '') partes.push(explicacion);
  if (datos.nota !== undefined && datos.nota.trim() !== '') partes.push(datos.nota.trim());

  return {
    ok: true,
    estado: hacia,
    evento: {
      id: datos.eventoId,
      tipo: 'cambio_de_estado',
      titulo: `Cambio de etapa: ${hacia.replace(/_/g, ' ')}`,
      descripcion: partes.join(' '),
      ocurridoEn: datos.fecha,
      disparaPlazo: null,
      suspension: null,
      cumplePlazoId: null,
      registradoPor: datos.registradoPor ?? null,
    },
  };
}
