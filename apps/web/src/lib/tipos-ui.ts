import type { DiaInhabil, Fundamento, PasoTraza, ResultadoComputo } from '@jurifis/core';

export type { DiaInhabil, Fundamento, PasoTraza, ResultadoComputo };

/** Calendario del corpus, reducido a lo que la interfaz necesita mostrar. */
export interface CalendarioResumen {
  id: string;
  nombre: string;
  nivelFuente: 'A' | 'B';
  aniosCubiertos: number[];
  fuente: string;
  consultadoEl: string;
  finesDeSemanaInhabiles: boolean;
  diasEnumerados: number;
  huecos: { descripcion: string; desde: string; hasta: string }[];
}

/** Regla de plazo del corpus, reducida a lo que la interfaz necesita mostrar. */
export interface ReglaResumen {
  id: string;
  procedimiento: string;
  descripcion: string;
  plazo: { cantidad: number; unidad: string };
  nivelFuente: 'A' | 'B';
  vigenciaDeclaradaPor: { persona: string; fecha: string; nota: string } | null;
  vigenteDesde: string;
  vigenteHasta: string | null;
  verificadoEl: string;
  prorrogaSiVenceInhabil: boolean;
  fundamento: Fundamento;
  /** Formas de notificacion para las que esta regla tiene surtimiento cargado. */
  formas: string[];
  calendarios: CalendarioResumen[];
  /** Calendarios que la regla exige y que el corpus no tiene cargados. */
  calendariosFaltantes: string[];
}

export interface ErrorApi {
  error: string;
  detalles?: string[];
}
