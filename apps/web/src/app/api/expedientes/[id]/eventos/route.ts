import { DEMO_PUBLICA, respuestaApagada } from '@/lib/demo';
import { NextResponse } from 'next/server';

import type { FormaNotificacion } from '@jurifis/core';
import type { TipoEvento } from '@jurifis/core/src/expediente/index.js';

import { agregarEvento, vistaDeExpediente } from '@/lib/almacen-expedientes';

import { cuerpoJson, errorDeValidacion, esquemaEvento } from '../../esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Alta de una actuacion en la linea de tiempo.
 *
 * Cuando el evento trae disparador, el plazo lo computa el motor al leer el
 * expediente, no esta ruta: aqui solo se guarda el hecho. La respuesta ya
 * devuelve el expediente recalculado para que la pantalla vea el efecto.
 */
export async function POST(
  peticion: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (DEMO_PUBLICA) return respuestaApagada();
  const { id } = await contexto.params;
  const cuerpo = await cuerpoJson(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const analisis = esquemaEvento.safeParse(cuerpo.valor);
  if (!analisis.success) {
    return errorDeValidacion(analisis.error, 'Los datos de la actuacion no son validos.');
  }

  const d = analisis.data;
  const resultado = agregarEvento(id, {
    tipo: d.tipo as TipoEvento,
    titulo: d.titulo,
    ocurridoEn: d.ocurridoEn,
    ...(d.descripcion !== undefined ? { descripcion: d.descripcion } : {}),
    ...(d.registradoPor !== undefined ? { registradoPor: d.registradoPor } : {}),
    ...(d.cumplePlazoId !== undefined ? { cumplePlazoId: d.cumplePlazoId } : {}),
    ...(d.suspension !== undefined ? { suspension: d.suspension } : {}),
    ...(d.disparaPlazo !== undefined
      ? {
          disparaPlazo: {
            reglaId: d.disparaPlazo.reglaId,
            formaNotificacion: d.disparaPlazo.formaNotificacion as FormaNotificacion,
            descripcion: d.disparaPlazo.descripcion,
          },
        }
      : {}),
  });

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.motivo }, { status: 404 });
  }

  const vista = vistaDeExpediente(id);
  return NextResponse.json(
    {
      evento: resultado.valor,
      estado: vista?.expediente.estado ?? null,
      plazos: vista?.plazos ?? [],
      alertas: vista?.alertas ?? [],
      persistencia: 'memoria',
    },
    { status: 201 },
  );
}
