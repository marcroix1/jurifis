/**
 * Linea de tiempo del expediente y los plazos que nacen de ella.
 *
 * Dos reglas gobiernan el modulo:
 *
 * 1. Aqui no se cuenta un solo dia. Cuando una notificacion dispara un plazo,
 *    el computo lo hace el motor de plazos y su resultado se guarda integro,
 *    con traza, fuentes, confianza y faltantes. Este archivo no reimplementa
 *    ni corrige nada de eso.
 * 2. El motor entra inyectado, no importado. Asi el modulo queda sin acoplarse
 *    al corpus, la prueba puede sustituirlo y el paquete no cae en un ciclo
 *    cuando el indice del paquete reexporta este modulo. Quien llama pasa la
 *    funcion "calcular" de @jurifis/core, que es la unica que sabe resolver la
 *    regla y sus calendarios.
 */
import { comparar, type FechaISO } from '../fecha.js';
import type { EntradaComputo, ResultadoComputo } from '../tipos.js';

import type {
  EfectoEnPlazos,
  EventoExpediente,
  Expediente,
  FechaClave,
  PlazoExpediente,
  RenglonLinea,
} from './tipos.js';

/** La funcion "calcular" de @jurifis/core, inyectada. */
export type CalculadorDePlazos = (entrada: EntradaComputo) => ResultadoComputo;

export interface OpcionesLinea {
  /** Fecha de referencia para los dias transcurridos y restantes. */
  hoy: FechaISO;
  calcular: CalculadorDePlazos;
}

const AVISO_BASE =
  'Este computo no sustituye la verificacion del abogado responsable ni constituye computo oficial.';

/**
 * Resultado vacio para cuando el motor ni siquiera pudo arrancar, por ejemplo
 * porque el expediente apunta a una regla que el corpus no tiene. No estima
 * nada: declara que no se puede computar y que hace falta, igual que el motor.
 */
function computoNoDisponible(concepto: string, faltante: string): ResultadoComputo {
  return {
    confianza: 'insuficiente',
    vence: null,
    surteEfectos: null,
    inicioComputo: null,
    diasTranscurridos: null,
    diasRestantes: null,
    inhabilesAplicados: [],
    traza: [{ paso: 1, concepto, detalle: faltante }],
    fuentes: [],
    advertencias: [AVISO_BASE],
    faltantes: [faltante],
  };
}

/** Identificador estable del plazo que nace de un evento. */
export function idDePlazo(eventoId: string): string {
  return `plazo:${eventoId}`;
}

/**
 * Ordena por fecha civil ascendente. Dos actuaciones del mismo dia conservan el
 * orden en que se capturaron: la fecha no distingue horas y adivinarlas seria
 * inventar.
 */
export function ordenarEventos(eventos: readonly EventoExpediente[]): EventoExpediente[] {
  return eventos
    .map((evento, indice) => ({ evento, indice }))
    .sort((a, b) => {
      const porFecha = comparar(a.evento.ocurridoEn, b.evento.ocurridoEn);
      return porFecha !== 0 ? porFecha : a.indice - b.indice;
    })
    .map((x) => x.evento);
}

/** Suspensiones asentadas en el expediente. Ninguna se infiere. */
export function suspensionesRegistradas(
  eventos: readonly EventoExpediente[],
): { desde: FechaISO; hasta: FechaISO; motivo: string; fundamento: string }[] {
  const lista: { desde: FechaISO; hasta: FechaISO; motivo: string; fundamento: string }[] = [];
  for (const evento of eventos) {
    const s = evento.suspension;
    if (s === null) continue;
    // Un periodo invertido es captura rota, no una suspension de cero dias:
    // se descarta en lugar de aplicarse al reves.
    if (comparar(s.hasta, evento.ocurridoEn) < 0) continue;
    lista.push({
      desde: evento.ocurridoEn,
      hasta: s.hasta,
      motivo: s.motivo,
      fundamento: s.fundamento,
    });
  }
  return lista;
}

/**
 * Calcula todos los plazos que el expediente tiene vivos, uno por cada
 * notificacion que declara disparador. Las suspensiones registradas entran al
 * computo de todos ellos, porque suspenden el procedimiento, no un plazo suelto.
 */
export function plazosDelExpediente(
  expediente: Expediente,
  opciones: OpcionesLinea,
): PlazoExpediente[] {
  const eventos = ordenarEventos(expediente.eventos);
  const suspensiones = suspensionesRegistradas(eventos);

  const cumplidores = new Map<string, EventoExpediente>();
  for (const evento of eventos) {
    if (evento.cumplePlazoId !== null && !cumplidores.has(evento.cumplePlazoId)) {
      cumplidores.set(evento.cumplePlazoId, evento);
    }
  }

  const plazos: PlazoExpediente[] = [];
  for (const evento of eventos) {
    const disparador = evento.disparaPlazo;
    if (disparador === null) continue;

    const entrada: EntradaComputo = {
      reglaId: disparador.reglaId,
      fechaNotificacion: evento.ocurridoEn,
      formaNotificacion: disparador.formaNotificacion,
      hoy: opciones.hoy,
      ...(suspensiones.length > 0 ? { suspensiones } : {}),
    };

    let computo: ResultadoComputo;
    try {
      computo = opciones.calcular(entrada);
    } catch (e) {
      const detalle = e instanceof Error ? e.message : 'El motor de plazos no pudo arrancar.';
      computo = computoNoDisponible('regla aplicable', detalle);
    }

    const id = idDePlazo(evento.id);
    const cumplidor = cumplidores.get(id);
    plazos.push({
      id,
      expedienteId: expediente.id,
      eventoId: evento.id,
      descripcion: disparador.descripcion,
      reglaId: disparador.reglaId,
      formaNotificacion: disparador.formaNotificacion,
      fechaNotificacion: evento.ocurridoEn,
      computo,
      cumplidoEn: cumplidor === undefined ? null : cumplidor.ocurridoEn,
      cumplidoPorEventoId: cumplidor === undefined ? null : cumplidor.id,
    });
  }

  return plazos;
}

function resumenDelEfecto(
  efecto: EfectoEnPlazos,
  evento: EventoExpediente,
  plazo: PlazoExpediente | null,
): string {
  if (efecto === 'dispara') {
    if (plazo === null) return 'Esta notificacion declara un plazo que aun no se ha computado.';
    const c = plazo.computo;
    if (c.vence === null) {
      return `Dispara el plazo de ${plazo.descripcion}, y el motor no lo pudo computar. Sin fecha en pantalla.`;
    }
    return `Dispara el plazo de ${plazo.descripcion}. Surte efectos el ${c.surteEfectos ?? 'sin dato'}, corre desde el ${c.inicioComputo ?? 'sin dato'} y vence el ${c.vence}.`;
  }
  if (efecto === 'suspende') {
    const s = evento.suspension;
    if (s === null) return 'Suspension registrada sin periodo.';
    return `Suspende el computo del ${evento.ocurridoEn} al ${s.hasta}. Motivo: ${s.motivo}.`;
  }
  if (efecto === 'cumple') {
    if (plazo === null) {
      return 'Da por cumplido un plazo que ya no existe en el expediente. Revisa la captura.';
    }
    return `Da por cumplido el plazo de ${plazo.descripcion}.`;
  }
  return 'No mueve ningun plazo.';
}

/**
 * Renglon por evento, en orden cronologico, con el efecto que cada actuacion
 * tuvo sobre los plazos y el plazo al que quedo amarrada.
 */
export function lineaDeTiempo(expediente: Expediente, opciones: OpcionesLinea): RenglonLinea[] {
  const eventos = ordenarEventos(expediente.eventos);
  const plazos = plazosDelExpediente(expediente, opciones);
  const porEvento = new Map(plazos.map((p) => [p.eventoId, p]));
  const porId = new Map(plazos.map((p) => [p.id, p]));

  return eventos.map((evento, indice) => {
    let efecto: EfectoEnPlazos = 'ninguno';
    let plazo: PlazoExpediente | null = null;

    if (evento.disparaPlazo !== null) {
      efecto = 'dispara';
      plazo = porEvento.get(evento.id) ?? null;
    } else if (evento.suspension !== null) {
      efecto = 'suspende';
    } else if (evento.cumplePlazoId !== null) {
      efecto = 'cumple';
      plazo = porId.get(evento.cumplePlazoId) ?? null;
    }

    return {
      orden: indice + 1,
      evento,
      fecha: evento.ocurridoEn,
      tipo: evento.tipo,
      efectoEnPlazos: efecto,
      resumenEfecto: resumenDelEfecto(efecto, evento, plazo),
      plazo,
    };
  });
}

/**
 * Fechas importantes del expediente, reunidas de todas sus fuentes y ordenadas.
 * Un plazo sin fecha computable no aporta ninguna: el silencio es el dato.
 */
export function fechasClave(
  expediente: Expediente,
  plazos: readonly PlazoExpediente[],
): FechaClave[] {
  const fechas: FechaClave[] = [
    { etiqueta: 'Apertura del expediente', fecha: expediente.abiertoEn, origen: 'expediente' },
  ];
  if (expediente.cerradoEn !== null) {
    fechas.push({ etiqueta: 'Cierre del expediente', fecha: expediente.cerradoEn, origen: 'expediente' });
  }
  for (const evento of ordenarEventos(expediente.eventos)) {
    if (evento.disparaPlazo !== null || evento.tipo === 'resolucion' || evento.tipo === 'audiencia') {
      fechas.push({ etiqueta: evento.titulo, fecha: evento.ocurridoEn, origen: 'evento' });
    }
  }
  for (const plazo of plazos) {
    if (plazo.computo.vence !== null) {
      fechas.push({ etiqueta: `Vence: ${plazo.descripcion}`, fecha: plazo.computo.vence, origen: 'plazo' });
    }
  }
  return fechas.sort((a, b) => comparar(a.fecha, b.fecha));
}
