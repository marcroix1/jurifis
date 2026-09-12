import { NextResponse } from 'next/server';

import { vistaDeExpediente } from '@/lib/almacen-expedientes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Detalle del expediente: los plazos con su traza integra, la linea de tiempo
 * con el efecto de cada actuacion y las alertas ya ordenadas por criticidad.
 */
export async function GET(
  _peticion: Request,
  contexto: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await contexto.params;
  const vista = vistaDeExpediente(id);
  if (vista === null) {
    return NextResponse.json({ error: `No existe el expediente "${id}".` }, { status: 404 });
  }
  return NextResponse.json({
    persistencia: 'memoria',
    hoy: vista.hoy,
    expediente: vista.expediente,
    plazos: vista.plazos,
    linea: vista.linea,
    alertas: vista.alertas,
    fechas: vista.fechas,
    transicionesPosibles: vista.transicionesPosibles,
  });
}
