import { NextResponse } from 'next/server';
import { z } from 'zod';

import { buscarPorRegistro, estadoAcervo } from '@jurifis/core/src/jurisprudencia/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Consulta de un criterio por su registro digital, que es la llave con la que
 * se cita. Cuando no existe, la respuesta es cuatrocientos cuatro y dice
 * cuántos criterios hay cargados: nunca devuelve el criterio más parecido.
 */

const esquema = z
  .string()
  .trim()
  .min(1, 'Indica el registro digital del criterio.')
  .max(60, 'El registro digital no puede tener más de sesenta caracteres.')
  .regex(
    /^[0-9A-Za-z./\-]+$/,
    'El registro digital solo admite números, letras, puntos, diagonales y guiones.',
  );

export async function GET(
  _peticion: Request,
  contexto: { params: Promise<{ registro: string }> },
): Promise<Response> {
  const { registro } = await contexto.params;
  const analisis = esquema.safeParse(decodeURIComponent(registro));
  if (!analisis.success) {
    return NextResponse.json(
      {
        error: 'El registro digital no es válido.',
        detalles: analisis.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }

  const estado = estadoAcervo();
  const criterio = buscarPorRegistro(analisis.data);
  if (criterio === null) {
    return NextResponse.json(
      {
        error: `No hay ningún criterio con registro digital ${analisis.data} en el acervo.`,
        registroDigital: analisis.data,
        estado,
        faltantes: estado.vacio ? estado.requisitosDeCarga : [],
        advertencia:
          'La ausencia significa que el criterio no está cargado y verificado, no que no exista. Este servicio no devuelve criterios parecidos ni recordados.',
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ criterio, estado });
}
