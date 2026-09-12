/**
 * Contrato entre la ruta del cuestionario y la interfaz. Los tipos del motor se
 * reexportan tal cual: la interfaz no define una forma propia del diagnostico.
 */
import type { Diagnostico, Pregunta, Respuesta, Respuestas } from '@jurifis/core';

export type { Diagnostico, Pregunta, Respuesta, Respuestas };

/** Una pregunta que ya aplica y que ya tiene respuesta, para poder repasarla. */
export interface Capturada {
  pregunta: Pregunta;
  respuesta: Respuesta;
}

interface Comun {
  version: string;
  titulo: string;
  /** Solo las que siguen aplicando con lo respondido, en el orden del cuestionario. */
  capturadas: Capturada[];
}

export interface PasoPregunta extends Comun {
  estado: 'pregunta';
  pregunta: Pregunta;
  respondidas: number;
  aplicables: number;
}

export interface PasoDiagnostico extends Comun {
  estado: 'diagnostico';
  diagnostico: Diagnostico;
  /** Resumen ya recortado y revisado por el guardian de lenguaje, para el prospecto. */
  resumenParaProspecto: string;
  /** De los identificadores de regla, los que la calculadora de plazos tiene cargados. */
  reglasEnCorpus: string[];
}

export type PasoUI = PasoPregunta | PasoDiagnostico;
