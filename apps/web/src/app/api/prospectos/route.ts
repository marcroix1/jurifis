import { NextResponse } from 'next/server';
import { z } from 'zod';

import { guardarProspecto } from '@/lib/almacen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const esquemaProspecto = z.object({
  nombre: z.string().trim().min(2, 'Escribe el nombre de contacto.').max(140),
  correo: z
    .string()
    .trim()
    .min(5, 'Escribe un correo electrónico.')
    .max(180)
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), {
      message: 'El correo electrónico no tiene un formato válido.',
    }),
  telefono: z.string().trim().max(40).optional(),
  organizacion: z.string().trim().max(140).optional(),
  situacion: z.string().trim().max(2000).optional(),
  origen: z.string().trim().max(60).default('diagnostico'),
});

export async function POST(peticion: Request): Promise<Response> {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: 'El cuerpo de la petición no es JSON válido.' }, { status: 400 });
  }

  const analisis = esquemaProspecto.safeParse(cuerpo);
  if (!analisis.success) {
    return NextResponse.json(
      {
        error: 'Los datos de contacto no son válidos.',
        detalles: analisis.error.issues.map((i) => {
          const campo = i.path.length > 0 ? i.path.join('.') : 'cuerpo';
          return `${campo}: ${i.message}`;
        }),
      },
      { status: 400 },
    );
  }

  const prospecto = guardarProspecto(analisis.data);
  return NextResponse.json(
    { id: prospecto.id, creadoEl: prospecto.creadoEl, persistencia: 'memoria' },
    { status: 201 },
  );
}
