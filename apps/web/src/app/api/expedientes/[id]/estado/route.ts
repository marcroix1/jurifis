import { NextResponse } from 'next/server';

import type { EstadoExpediente } from '@jurifis/core/src/expediente/index.js';

import { cambiarEstadoExpediente, obtenerExpediente, vistaDeExpediente } from '@/lib/almacen-expedientes';

import { cuerpoJson, errorDeValidacion, esquemaCambioDeEstado } from '../../esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cambio de etapa.
 *
 * La maquina de estados manda: una transicion que no esta declarada se rechaza
 * con la lista de las que si proceden, en lugar de dejar el expediente en una
 * etapa que despues nadie sabe explicar.
 */
export async function POST(
  peticion: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await contexto.params;
  const cuerpo = await cuerpoJson(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const analisis = esquemaCambioDeEstado.safeParse(cuerpo.valor);
  if (!analisis.success) {
    return errorDeValidacion(analisis.error, 'El cambio de etapa no es valido.');
  }

  if (obtenerExpediente(id) === null) {
    return NextResponse.json({ error: `No existe el expediente "${id}".` }, { status: 404 });
  }

  const d = analisis.data;
  const resultado = cambiarEstadoExpediente(id, {
    hacia: d.hacia as EstadoExpediente,
    ...(d.fecha !== undefined ? { fecha: d.fecha } : {}),
    ...(d.nota !== undefined ? { nota: d.nota } : {}),
    ...(d.registradoPor !== undefined ? { registradoPor: d.registradoPor } : {}),
  });

  if (!resultado.ok) {
    return NextResponse.json(
      { error: resultado.motivo, detalles: resultado.detalles ?? [] },
      { status: 409 },
    );
  }

  const vista = vistaDeExpediente(id);
  return NextResponse.json({
    expediente: resultado.valor,
    transicionesPosibles: vista?.transicionesPosibles ?? [],
    persistencia: 'memoria',
  });
}
