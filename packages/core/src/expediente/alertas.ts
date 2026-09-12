/**
 * Motor de alertas del expediente.
 *
 * La urgencia se lee del resultado del motor de plazos y de ningun otro lado.
 * Aqui no se restan fechas para saber cuanto falta: los dias habiles restantes
 * los cuenta el motor, con su calendario y sus suspensiones, y este archivo
 * solo los traduce a un nivel y a un orden.
 *
 * El caso que manda el diseno es el plazo que no se puede computar. Cuando la
 * confianza es insuficiente o esta bloqueada por la fuente, la alerta no dice
 * ninguna fecha, dice que hace falta, y sube al primer lugar de la lista. Un
 * plazo que nadie puede calcular es mas peligroso que uno que si, porque nadie
 * sabe cuanto tiempo queda.
 */
import { comparar, type FechaISO } from '../fecha.js';

import type { Alerta, Expediente, NivelUrgencia, PlazoExpediente } from './tipos.js';

/** Entre mas alto, mas arriba va la alerta. */
const CRITICIDAD: Record<NivelUrgencia, number> = {
  no_computable: 100,
  vencido: 80,
  critico: 60,
  alto: 45,
  medio: 30,
  bajo: 15,
  cumplido: 0,
};

/** Dias habiles restantes, segun el motor, que abren cada nivel. */
const UMBRALES: { hasta: number; nivel: NivelUrgencia }[] = [
  { hasta: 2, nivel: 'critico' },
  { hasta: 5, nivel: 'alto' },
  { hasta: 10, nivel: 'medio' },
];

export function criticidadDe(nivel: NivelUrgencia): number {
  return CRITICIDAD[nivel];
}

const ETIQUETAS: Record<NivelUrgencia, string> = {
  no_computable: 'Plazo que no se puede computar',
  vencido: 'Plazo vencido',
  critico: 'Vencimiento inmediato',
  alto: 'Vencimiento proximo',
  medio: 'Vencimiento en la quincena',
  bajo: 'Vencimiento con holgura',
  cumplido: 'Plazo cumplido',
};

export function etiquetaUrgencia(nivel: NivelUrgencia): string {
  return ETIQUETAS[nivel];
}

function nivelPorDias(restantes: number): NivelUrgencia {
  for (const u of UMBRALES) if (restantes <= u.hasta) return u.nivel;
  return 'bajo';
}

function plural(n: number, singular: string, plural_: string): string {
  return `${n} ${n === 1 ? singular : plural_}`;
}

/**
 * Alerta de un plazo. Nunca devuelve fecha cuando el motor no la sostiene, ni
 * siquiera "aproximada": el campo vence se queda nulo y el detalle explica que
 * falta.
 */
export function alertaDePlazo(
  expediente: Expediente,
  plazo: PlazoExpediente,
  hoy: FechaISO,
): Alerta {
  const c = plazo.computo;
  const base = {
    plazoId: plazo.id,
    expedienteId: expediente.id,
    caratula: expediente.caratula,
    responsable: expediente.responsable,
    confianza: c.confianza,
  };

  const sinComputo =
    c.confianza === 'insuficiente' ||
    c.confianza === 'bloqueada_por_fuente' ||
    c.vence === null ||
    c.diasRestantes === null;

  if (sinComputo) {
    const faltantes =
      c.faltantes.length > 0
        ? [...c.faltantes]
        : [
            'El motor no devolvio fecha ni explico que falta. Revisa la regla y el calendario del corpus antes de confiar en este plazo.',
          ];
    return {
      ...base,
      nivel: 'no_computable',
      criticidad: CRITICIDAD.no_computable,
      titulo: `Sin computo: ${plazo.descripcion}`,
      detalle:
        c.confianza === 'bloqueada_por_fuente'
          ? 'Este plazo no se puede computar porque la regla se apoya en una fuente de nivel B sin declaracion de vigencia. No hay fecha de vencimiento que mostrar.'
          : 'Este plazo no se puede computar con lo que hay cargado. No hay fecha de vencimiento que mostrar, y por eso encabeza la lista.',
      accion:
        'Resuelve lo que falta y vuelve a computar. Mientras tanto, trata el plazo como si venciera hoy.',
      vence: null,
      diasHabilesRestantes: null,
      faltantes,
    };
  }

  // A partir de aqui el motor si sostiene una fecha.
  const vence = c.vence as FechaISO;
  const restantes = c.diasRestantes as number;

  if (plazo.cumplidoEn !== null) {
    return {
      ...base,
      nivel: 'cumplido',
      criticidad: CRITICIDAD.cumplido,
      titulo: `Cumplido: ${plazo.descripcion}`,
      detalle: `Se cumplio el ${plazo.cumplidoEn}. El plazo vencia el ${vence}.`,
      accion: 'Sin accion pendiente.',
      vence,
      diasHabilesRestantes: restantes,
      faltantes: [...c.faltantes],
    };
  }

  if (comparar(vence, hoy) < 0) {
    return {
      ...base,
      nivel: 'vencido',
      criticidad: CRITICIDAD.vencido,
      titulo: `Vencido: ${plazo.descripcion}`,
      detalle: `El plazo vencio el ${vence} y no hay constancia de que se haya cumplido.`,
      accion: 'Verifica si hubo presentacion y registrala, o valora la via que quede.',
      vence,
      diasHabilesRestantes: 0,
      faltantes: [...c.faltantes],
    };
  }

  const nivel = nivelPorDias(restantes);
  const cuenta =
    restantes === 0
      ? 'Hoy es el ultimo dia habil para presentar.'
      : `Quedan ${plural(restantes, 'dia habil', 'dias habiles')}, segun el motor de plazos.`;
  const notaFuente =
    c.confianza === 'parcial'
      ? ' El computo se sostiene en parte con fuente de nivel B: revisa las advertencias antes de usar la fecha.'
      : '';

  return {
    ...base,
    nivel,
    criticidad: CRITICIDAD[nivel],
    titulo: `${plazo.descripcion}`,
    // La fecha no se repite en el detalle: viaja en el campo vence, y quien
    // pinta la alerta ya la muestra una vez.
    detalle: `${cuenta}${notaFuente}`,
    accion:
      restantes <= 2
        ? 'Prepara y presenta ya. No queda margen para otra revision.'
        : 'Agenda la presentacion y confirma la fecha con el abogado responsable.',
    vence,
    diasHabilesRestantes: restantes,
    faltantes: [...c.faltantes],
  };
}

/**
 * Ordena de mas critico a menos. Dentro del mismo nivel manda el que tiene
 * menos dias habiles restantes, y el que no tiene cuenta va antes que el que si,
 * por la misma razon que encabeza la lista.
 */
export function ordenarAlertas(alertas: readonly Alerta[]): Alerta[] {
  return [...alertas].sort((a, b) => {
    if (a.criticidad !== b.criticidad) return b.criticidad - a.criticidad;
    if (a.diasHabilesRestantes === null && b.diasHabilesRestantes !== null) return -1;
    if (a.diasHabilesRestantes !== null && b.diasHabilesRestantes === null) return 1;
    if (a.diasHabilesRestantes !== null && b.diasHabilesRestantes !== null) {
      const porDias = a.diasHabilesRestantes - b.diasHabilesRestantes;
      if (porDias !== 0) return porDias;
    }
    if (a.vence !== null && b.vence !== null) {
      const porFecha = comparar(a.vence, b.vence);
      if (porFecha !== 0) return porFecha;
    }
    return a.plazoId.localeCompare(b.plazoId);
  });
}

export interface OpcionesAlertas {
  hoy: FechaISO;
  /** Falso deja fuera los plazos ya cumplidos. Por omision se incluyen. */
  incluirCumplidos?: boolean;
}

/** Alertas de un expediente, de la mas critica a la menos. */
export function alertasDelExpediente(
  expediente: Expediente,
  plazos: readonly PlazoExpediente[],
  opciones: OpcionesAlertas,
): Alerta[] {
  const incluirCumplidos = opciones.incluirCumplidos ?? true;
  const alertas = plazos
    .map((p) => alertaDePlazo(expediente, p, opciones.hoy))
    .filter((a) => incluirCumplidos || a.nivel !== 'cumplido');
  return ordenarAlertas(alertas);
}

/** Alertas de varios expedientes en una sola lista, ordenada por criticidad. */
export function alertasDeCartera(
  entradas: readonly { expediente: Expediente; plazos: readonly PlazoExpediente[] }[],
  opciones: OpcionesAlertas,
): Alerta[] {
  const todas: Alerta[] = [];
  for (const entrada of entradas) {
    todas.push(...alertasDelExpediente(entrada.expediente, entrada.plazos, opciones));
  }
  return ordenarAlertas(todas);
}
