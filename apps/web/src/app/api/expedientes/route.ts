import { NextResponse } from 'next/server';

import { crearExpediente, vistaDeCartera } from '@/lib/almacen-expedientes';

import { cuerpoJson, errorDeValidacion, esquemaExpediente } from './esquemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Cartera de expedientes. Devuelve tambien las alertas ya ordenadas por
 * criticidad, porque la urgencia la calcula el motor y no el cliente.
 */
export async function GET(): Promise<Response> {
  const vista = vistaDeCartera();
  return NextResponse.json({
    persistencia: 'memoria',
    hoy: vista.hoy,
    total: vista.renglones.length,
    expedientes: vista.renglones.map((r) => ({
      ...r.expediente,
      plazosAbiertos: r.plazosAbiertos,
      plazosSinComputar: r.plazosSinComputar,
      alertaPrincipal: r.alertaPrincipal,
    })),
    alertas: vista.alertas,
  });
}

/** Alta de expediente. Nace en la etapa "nuevo" y sin eventos. */
export async function POST(peticion: Request): Promise<Response> {
  const cuerpo = await cuerpoJson(peticion);
  if (!cuerpo.ok) return cuerpo.respuesta;

  const analisis = esquemaExpediente.safeParse(cuerpo.valor);
  if (!analisis.success) {
    return errorDeValidacion(analisis.error, 'Los datos del expediente no son validos.');
  }

  const expediente = crearExpediente(analisis.data);
  return NextResponse.json({ expediente, persistencia: 'memoria' }, { status: 201 });
}
