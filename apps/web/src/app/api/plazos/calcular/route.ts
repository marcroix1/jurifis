import { NextResponse } from 'next/server';
import { z } from 'zod';

import { FechaInvalida, ReglaDesconocida, calcular } from '@jurifis/core';
import type { EntradaComputo } from '@jurifis/core';

import { formasDelCorpus } from '@/lib/corpus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cómputo de un plazo. La validación no decide derecho: solo comprueba la forma
 * de la entrada contra lo que el corpus sabe atender. Todo lo demás lo resuelve
 * el motor, y su resultado se devuelve tal cual, con traza, fuentes y confianza.
 */

const FORMAS = formasDelCorpus();

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha civil con formato AAAA-MM-DD.');

const suspension = z.object({
  desde: fecha,
  hasta: fecha,
  motivo: z.string().min(1, 'La suspensión necesita motivo.'),
  fundamento: z.string().min(1, 'La suspensión necesita fundamento.'),
});

const esquemaEntrada = z.object({
  reglaId: z.string().min(1, 'Indica la regla del corpus que se va a aplicar.'),
  fechaNotificacion: fecha,
  formaNotificacion: z
    .string()
    .min(1, 'Indica la forma en que se practicó la notificación.')
    .refine((v) => FORMAS.includes(v), {
      message: `Forma de notificación fuera del corpus. Las cargadas son: ${FORMAS.join(', ')}.`,
    }),
  hoy: fecha.optional(),
  suspensiones: z.array(suspension).max(50).optional(),
});

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
        error: 'La entrada no es válida.',
        detalles: analisis.error.issues.map((i) => {
          const campo = i.path.length > 0 ? i.path.join('.') : 'cuerpo';
          return `${campo}: ${i.message}`;
        }),
      },
      { status: 400 },
    );
  }

  const datos = analisis.data;
  const entrada: EntradaComputo = {
    reglaId: datos.reglaId,
    fechaNotificacion: datos.fechaNotificacion,
    formaNotificacion: datos.formaNotificacion as EntradaComputo['formaNotificacion'],
    ...(datos.hoy !== undefined ? { hoy: datos.hoy } : {}),
    ...(datos.suspensiones !== undefined ? { suspensiones: datos.suspensiones } : {}),
  };

  try {
    return NextResponse.json(calcular(entrada));
  } catch (e) {
    if (e instanceof ReglaDesconocida) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof FechaInvalida) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    const mensaje = e instanceof Error ? e.message : 'Error desconocido en el motor.';
    return NextResponse.json({ error: `El motor no pudo completar el cómputo. ${mensaje}` }, { status: 500 });
  }
}
