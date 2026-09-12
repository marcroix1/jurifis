import { TIPOS_CRITERIO, type TipoCriterio } from './tipos.js';

/**
 * Guardias del tipo de criterio.
 *
 * Por que existe este archivo: llamar jurisprudencia a una tesis aislada cambia
 * la fuerza con la que se invoca en un escrito. El modulo no deduce el tipo del
 * rubro, de la clave ni del organo: lo toma como lo declara el origen oficial y
 * rechaza cualquier ascenso posterior.
 */

const ETIQUETAS: Record<TipoCriterio, string> = {
  jurisprudencia: 'Jurisprudencia',
  tesis_aislada: 'Tesis aislada',
  precedente: 'Precedente',
  sentencia: 'Sentencia',
  criterio_administrativo: 'Criterio administrativo',
  legislacion: 'Legislacion',
};

export class TipoCriterioInvalido extends Error {
  readonly recibido: unknown;
  constructor(recibido: unknown) {
    const visto = typeof recibido === 'string' ? `"${recibido}"` : String(recibido);
    super(
      `Tipo de criterio fuera de la enumeracion: ${visto}. Los unicos admitidos son ${TIPOS_CRITERIO.join(', ')}.`,
    );
    this.name = 'TipoCriterioInvalido';
    this.recibido = recibido;
  }
}

export class EtiquetaIndebida extends Error {
  readonly declarado: TipoCriterio;
  readonly pretendido: TipoCriterio;
  constructor(declarado: TipoCriterio, pretendido: TipoCriterio, referencia: string) {
    super(
      `${referencia} esta declarado como ${ETIQUETAS[declarado].toLowerCase()} y se pretende tratar como ${ETIQUETAS[pretendido].toLowerCase()}. El tipo lo fija el origen oficial, no el escrito que lo cita.`,
    );
    this.name = 'EtiquetaIndebida';
    this.declarado = declarado;
    this.pretendido = pretendido;
  }
}

export function esTipoCriterio(valor: unknown): valor is TipoCriterio {
  return typeof valor === 'string' && (TIPOS_CRITERIO as readonly string[]).includes(valor);
}

/** Convierte texto en tipo de criterio, o falla. Nunca devuelve un valor por omision. */
export function exigirTipoCriterio(valor: unknown): TipoCriterio {
  if (!esTipoCriterio(valor)) throw new TipoCriterioInvalido(valor);
  return valor;
}

export function etiquetaTipoCriterio(tipo: TipoCriterio): string {
  return ETIQUETAS[tipo];
}

/** Lo minimo que un objeto necesita para que estas guardias lo puedan revisar. */
export interface Etiquetable {
  tipoCriterio: TipoCriterio;
  registroDigital?: string | null;
  claveControl?: string | null;
  rubro?: string;
}

function referenciaDe(criterio: Etiquetable): string {
  if (typeof criterio.registroDigital === 'string' && criterio.registroDigital !== '') {
    return `El criterio con registro digital ${criterio.registroDigital}`;
  }
  if (typeof criterio.claveControl === 'string' && criterio.claveControl !== '') {
    return `El criterio con clave ${criterio.claveControl}`;
  }
  return 'El criterio';
}

export function esJurisprudencia(criterio: Etiquetable): boolean {
  return criterio.tipoCriterio === 'jurisprudencia';
}

/**
 * Unica puerta para afirmar que un criterio es de cierto tipo. Compara lo que
 * el acervo declara con lo que el escrito pretende y rechaza la diferencia.
 * Devuelve el mismo objeto, sin tocarlo, cuando la etiqueta coincide.
 */
export function etiquetarComo<T extends Etiquetable>(criterio: T, pretendido: TipoCriterio): T {
  const tipo = exigirTipoCriterio(criterio.tipoCriterio);
  const destino = exigirTipoCriterio(pretendido);
  if (tipo !== destino) throw new EtiquetaIndebida(tipo, destino, referenciaDe(criterio));
  return criterio;
}

/**
 * Atajo del caso que mas daño hace: invocar como jurisprudencia lo que el origen
 * oficial publico como tesis aislada, precedente o cualquier otra cosa.
 */
export function exigirJurisprudencia<T extends Etiquetable>(criterio: T): T {
  return etiquetarComo(criterio, 'jurisprudencia');
}
