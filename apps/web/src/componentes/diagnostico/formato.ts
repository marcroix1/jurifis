/**
 * Formato de presentacion del cuestionario. No decide nada: traduce a texto legible
 * lo que el motor ya resolvio, y las etiquetas de las opciones salen del propio
 * archivo de preguntas, nunca de una lista escrita a mano aqui.
 */
import type { NivelUrgencia, Pregunta, Respuesta } from '@jurifis/core';

import { fechaLarga } from '@/lib/formato';
import type { Tono } from '@/lib/formato';

import { COPIA } from './textos';

/** Rotulo y tono de cada nivel de urgencia que el motor puede devolver. */
export const ETIQUETAS_URGENCIA: Record<NivelUrgencia, { titulo: string; tono: Tono }> = {
  inmediata: { titulo: 'Urgencia inmediata', tono: 'alto' },
  alta: { titulo: 'Urgencia alta', tono: 'alto' },
  media: { titulo: 'Urgencia media', tono: 'aviso' },
  por_definir: { titulo: 'Urgencia por definir', tono: 'neutro' },
};

/** Etiqueta de una opcion tal como la trae el cuestionario. */
export function etiquetaOpcion(pregunta: Pregunta, valor: string): string {
  return (pregunta.opciones ?? []).find((o) => o.valor === valor)?.etiqueta ?? valor;
}

export function textoMonto(valor: number, moneda: string | undefined): string {
  try {
    if (moneda === undefined) return new Intl.NumberFormat('es-MX').format(valor);
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda }).format(valor);
  } catch {
    return String(valor);
  }
}

/** Respuesta capturada, en texto, para la lista de repaso y para el resumen. */
export function textoRespuesta(pregunta: Pregunta, respuesta: Respuesta): string {
  switch (respuesta.tipo) {
    case 'no_se':
      return COPIA.noSe;
    case 'opcion_unica':
      return etiquetaOpcion(pregunta, respuesta.valor);
    case 'opcion_multiple':
      return respuesta.valores.map((v) => etiquetaOpcion(pregunta, v)).join('; ');
    case 'fecha':
      return fechaLarga(respuesta.valor);
    case 'monto':
      return textoMonto(respuesta.valor, pregunta.moneda);
  }
}

/** Enlace a la calculadora de plazos con la regla ya elegida por parametro. */
export function enlacePlazos(reglaId: string): string {
  return `/plazos?regla=${encodeURIComponent(reglaId)}`;
}
