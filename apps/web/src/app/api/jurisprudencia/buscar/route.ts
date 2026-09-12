import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  TIPOS_CRITERIO,
  buscarCriterios,
  estadoAcervo,
  esTipoCriterio,
} from '@jurifis/core/src/jurisprudencia/index.js';
import type { ConsultaBusqueda, TipoCriterio } from '@jurifis/core/src/jurisprudencia/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Búsqueda en el acervo de criterios. La validación comprueba la forma de la
 * consulta y nada más: el resultado lo arma el núcleo y se devuelve tal cual,
 * con las estrategias que corrieron y lo que falta para que devuelva algo.
 *
 * Con el acervo vacío esta ruta responde doscientos con cero coincidencias. No
 * es un error: es el estado real del acervo y así se declara.
 */

const texto = (max: number) => z.string().trim().max(max);

const esquema = z.object({
  texto: texto(400).optional(),
  registro: texto(60).optional(),
  clave: texto(60).optional(),
  tipo: z
    .array(z.string())
    .max(TIPOS_CRITERIO.length)
    .optional()
    .refine((v) => v === undefined || v.every((t) => esTipoCriterio(t)), {
      message: `Tipo de criterio fuera de la enumeración. Los admitidos son: ${TIPOS_CRITERIO.join(', ')}.`,
    }),
  organo: texto(200).optional(),
  epoca: texto(120).optional(),
  materia: texto(160).optional(),
  limite: z.coerce
    .number({ error: 'El límite de resultados debe ser un número.' })
    .int('El límite de resultados debe ser un número entero.')
    .min(1, 'El límite de resultados no puede ser menor que uno.')
    .max(100, 'El límite de resultados no puede pasar de cien por página.')
    .optional(),
  desplazamiento: z.coerce
    .number({ error: 'El desplazamiento debe ser un número.' })
    .int('El desplazamiento debe ser un número entero.')
    .min(0, 'El desplazamiento no puede ser negativo.')
    .max(10_000, 'El desplazamiento no puede pasar de diez mil.')
    .optional(),
});

function sinVacio(valor: string | undefined): string | undefined {
  return valor === undefined || valor === '' ? undefined : valor;
}

export function GET(peticion: Request): Response {
  const parametros = new URL(peticion.url).searchParams;
  const crudo = {
    texto: parametros.get('texto') ?? undefined,
    registro: parametros.get('registro') ?? undefined,
    clave: parametros.get('clave') ?? undefined,
    tipo: parametros.getAll('tipo').length > 0 ? parametros.getAll('tipo') : undefined,
    organo: parametros.get('organo') ?? undefined,
    epoca: parametros.get('epoca') ?? undefined,
    materia: parametros.get('materia') ?? undefined,
    limite: parametros.get('limite') ?? undefined,
    desplazamiento: parametros.get('desplazamiento') ?? undefined,
  };

  const analisis = esquema.safeParse(crudo);
  if (!analisis.success) {
    return NextResponse.json(
      {
        error: 'La consulta no es válida.',
        detalles: analisis.error.issues.map((i) => {
          const campo = i.path.length > 0 ? i.path.join('.') : 'consulta';
          return `${campo}: ${i.message}`;
        }),
      },
      { status: 400 },
    );
  }

  const d = analisis.data;
  const tipos = (d.tipo ?? []).filter((t): t is TipoCriterio => esTipoCriterio(t));
  const consulta: ConsultaBusqueda = {
    ...(sinVacio(d.texto) !== undefined ? { texto: d.texto } : {}),
    ...(sinVacio(d.registro) !== undefined ? { registroDigital: d.registro } : {}),
    ...(sinVacio(d.clave) !== undefined ? { claveControl: d.clave } : {}),
    ...(tipos.length > 0 ? { tipos } : {}),
    ...(sinVacio(d.organo) !== undefined ? { organo: d.organo } : {}),
    ...(sinVacio(d.epoca) !== undefined ? { epoca: d.epoca } : {}),
    ...(sinVacio(d.materia) !== undefined ? { materia: d.materia } : {}),
    ...(d.limite !== undefined ? { limite: d.limite } : {}),
    ...(d.desplazamiento !== undefined ? { desplazamiento: d.desplazamiento } : {}),
  };

  const resultado = buscarCriterios(consulta);
  return NextResponse.json({ ...resultado, estado: estadoAcervo() });
}
