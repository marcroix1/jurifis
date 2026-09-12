import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  CUESTIONARIO,
  RespuestaInvalida,
  avanzar,
  lenguajePrudente,
  preguntasAplicables,
} from '@jurifis/core';
import type { Diagnostico, Respuestas } from '@jurifis/core';

import { ETIQUETAS_URGENCIA, textoRespuesta } from '@/componentes/diagnostico/formato';
import type { Capturada, PasoUI } from '@/componentes/diagnostico/tipos';
import { existeRegla } from '@/lib/corpus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Recorrido del cuestionario preliminar.
 *
 * El arbol vive en el servidor a proposito: la interfaz no debe poder decidir que
 * pregunta sigue ni que rama se abre. Aqui solo se valida la forma de lo que llega y
 * se le entrega al motor; la respuesta del motor se devuelve tal cual, mas lo que la
 * pantalla necesita para repasar y para armar el prospecto.
 */

/** Tope del resumen que se adjunta al prospecto. El campo del prospecto admite 2000. */
const LIMITE_RESUMEN = 1500;

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha civil con formato AAAA-MM-DD.');

const respuesta = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('opcion_unica'), valor: z.string().min(1).max(120) }),
  z.object({
    tipo: z.literal('opcion_multiple'),
    valores: z.array(z.string().min(1).max(120)).min(1).max(60),
  }),
  z.object({ tipo: z.literal('fecha'), valor: fecha }),
  z.object({ tipo: z.literal('monto'), valor: z.number().finite().min(0).max(1e15) }),
  z.object({ tipo: z.literal('no_se') }),
]);

const esquemaEntrada = z.object({
  respuestas: z.record(z.string().min(1).max(120), respuesta).default({}),
  /** Fecha de referencia del navegador. Sin ella el motor no mide tiempo transcurrido. */
  hoy: fecha.optional(),
});

function capturadas(respuestas: Respuestas): Capturada[] {
  const lista: Capturada[] = [];
  for (const pregunta of preguntasAplicables(CUESTIONARIO, respuestas)) {
    const r = respuestas[pregunta.id];
    if (r !== undefined) lista.push({ pregunta, respuesta: r });
  }
  return lista;
}

/**
 * Resumen del diagnostico para adjuntarlo al prospecto. Se arma por lineas completas
 * y se corta entre lineas, nunca a media palabra, y despues pasa por el guardian de
 * lenguaje del motor. Ningun texto de aqui valora el caso.
 */
function resumenParaProspecto(diagnostico: Diagnostico, lista: Capturada[]): string {
  const lineas: string[] = [
    `Diagnóstico preliminar del cuestionario versión ${diagnostico.version}.`,
    `Nivel de urgencia que devolvió el motor: ${ETIQUETAS_URGENCIA[diagnostico.urgencia].titulo}.`,
  ];

  if (diagnostico.diasNaturalesDesdeNotificacion !== null) {
    lineas.push(
      `Días naturales desde la notificación, como dato informativo: ${diagnostico.diasNaturalesDesdeNotificacion}.`,
    );
  }

  if (lista.length > 0) {
    lineas.push('Respuestas capturadas:');
    for (const c of lista) lineas.push(`- ${c.pregunta.texto}: ${textoRespuesta(c.pregunta, c.respuesta)}`);
  }

  if (diagnostico.vias.length > 0) {
    lineas.push('Posibles vías por revisar, con el identificador de la regla de plazo:');
    for (const v of diagnostico.vias) lineas.push(`- ${v.nombre} (regla ${v.reglaPlazoId})`);
  }

  if (diagnostico.plazosPorVerificar.length > 0) {
    lineas.push(`Reglas de plazo por computar: ${diagnostico.plazosPorVerificar.join(', ')}.`);
  }

  if (diagnostico.informacionFaltante.length > 0) {
    lineas.push('Información faltante que declaró el motor:');
    for (const f of diagnostico.informacionFaltante) lineas.push(`- ${f}`);
  }

  // Se corta entre lineas y se reserva desde el principio el espacio del aviso de
  // corte, para que el resumen nunca quede truncado en silencio.
  const cierre = 'Aquí se adjunta lo que cabe; el diagnóstico completo queda en la herramienta.';
  const tope = LIMITE_RESUMEN - cierre.length - 1;
  const cortadas: string[] = [];
  let total = 0;
  let completo = true;
  for (const linea of lineas) {
    if (total + linea.length + 1 > tope) {
      completo = false;
      break;
    }
    cortadas.push(linea);
    total += linea.length + 1;
  }
  if (!completo) cortadas.push(cierre);

  return lenguajePrudente(cortadas.join('\n'), 'resumen para el prospecto');
}

export async function POST(peticion: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es JSON válido.' }, { status: 400 });
  }

  const analisis = esquemaEntrada.safeParse(cuerpo);
  if (!analisis.success) {
    return NextResponse.json(
      {
        error: 'Las respuestas recibidas no tienen la forma que el cuestionario admite.',
        detalles: analisis.error.issues.map((i) => {
          const campo = i.path.length > 0 ? i.path.join('.') : 'cuerpo';
          return `${campo}: ${i.message}`;
        }),
      },
      { status: 400 },
    );
  }

  const respuestas = analisis.data.respuestas as Respuestas;
  const hoy = analisis.data.hoy;

  try {
    const paso = avanzar(CUESTIONARIO, respuestas, hoy === undefined ? {} : { hoy });
    const lista = capturadas(respuestas);
    const comun = { version: CUESTIONARIO.version, titulo: CUESTIONARIO.titulo, capturadas: lista };

    if (paso.estado === 'pregunta') {
      const salida: PasoUI = {
        estado: 'pregunta',
        ...comun,
        pregunta: paso.pregunta,
        respondidas: paso.respondidas,
        aplicables: paso.aplicables,
      };
      return NextResponse.json(salida);
    }

    const salida: PasoUI = {
      estado: 'diagnostico',
      ...comun,
      diagnostico: paso.diagnostico,
      resumenParaProspecto: resumenParaProspecto(paso.diagnostico, lista),
      reglasEnCorpus: paso.diagnostico.plazosPorVerificar.filter((id) => existeRegla(id)),
    };
    return NextResponse.json(salida);
  } catch (e) {
    if (e instanceof RespuestaInvalida) {
      return NextResponse.json({ error: e.message, detalles: e.errores }, { status: 400 });
    }
    const mensaje = e instanceof Error ? e.message : 'Error desconocido en el motor.';
    return NextResponse.json(
      { error: `El motor de diagnóstico no pudo avanzar. ${mensaje}` },
      { status: 500 },
    );
  }
}
