import { NextResponse } from 'next/server';
import { z } from 'zod';

import { FechaInvalida } from '@jurifis/core';
import {
  EntradaCreditoInvalida, ImporteInvalido, TasaFueraDelCorpus, aCentavos, estimar,
} from '@jurifis/core/src/credito/index.js';
import type {
  ActoExpediente, Constancia, EntradaCredito, MultaRegistrada, PagoRegistrado, TipoActo, TipoRecargo,
} from '@jurifis/core/src/credito/index.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Estimación de un crédito fiscal. La validación no decide derecho: comprueba la forma
 * de la entrada y convierte los importes a centavos enteros. Todo lo demás lo resuelve
 * el motor, y su resultado se devuelve tal cual, con desglose, traza, fuentes y el
 * sello de estimación que viene en el propio tipo.
 */

const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha civil con formato AAAA-MM-DD.');

/**
 * Los importes viajan como texto en pesos, no como número. Multiplicar por cien un
 * flotante pierde centavos, y aquí el centavo es la unidad en la que se discute.
 */
const importe = z
  .string()
  .regex(/^\d{1,15}(\.\d{1,2})?$/, 'Se espera una cantidad en pesos, con hasta dos decimales y sin signo.');

const TIPOS_RECARGO = [
  'mora',
  'prorroga',
  'parcialidadesHastaDoceMeses',
  'parcialidadesDeMasDeDoceYHastaVeinticuatroMeses',
  'parcialidadesSuperioresAVeinticuatroMesesYPagoDiferido',
] as const satisfies readonly TipoRecargo[];

const TIPOS_ACTO = [
  'nacimiento_del_credito',
  'exigibilidad',
  'notificacion_del_credito',
  'requerimiento_de_pago',
  'acto_del_procedimiento_administrativo_de_ejecucion',
  'embargo',
  'convenio_de_pago_a_plazos',
  'pago',
  'reconocimiento_expreso_o_tacito',
  'recurso_administrativo',
  'juicio',
  'suspension_del_procedimiento_administrativo_de_ejecucion',
  'domicilio_fiscal_desocupado_o_incorrecto',
  'ejercicio_de_facultades_de_comprobacion',
  'otro',
] as const satisfies readonly TipoActo[];

const CONSTANCIAS = ['si', 'no', 'no_consta'] as const satisfies readonly Constancia[];

const esquemaPago = z.object({
  fecha,
  importe,
  concepto: z.string().min(1, 'El pago necesita concepto.').max(300),
});

const esquemaMulta = z.object({
  concepto: z.string().min(1, 'La multa necesita concepto.').max(300),
  importe,
  fechaExigibilidad: fecha.optional(),
});

const esquemaActo = z.object({
  tipo: z.enum(TIPOS_ACTO),
  fecha,
  descripcion: z.string().min(1, 'El acto necesita descripción.').max(500),
  notificadoAlDeudor: z.enum(CONSTANCIAS).optional(),
  fechaFin: fecha.optional(),
  constaEn: z.string().max(300).optional(),
});

const esquemaEntrada = z.object({
  concepto: z.string().min(1, 'Indica qué se está estimando.').max(300),
  ejercicio: z.number().int().min(1980).max(2100),
  importeOriginal: importe,
  fechaCausacion: fecha.optional(),
  fechaExigibilidad: fecha,
  fechaCalculo: fecha,
  tipoRecargo: z.enum(TIPOS_RECARGO).optional(),
  pagos: z.array(esquemaPago).max(200).optional(),
  multas: z.array(esquemaMulta).max(50).optional(),
  lineaDeTiempo: z.array(esquemaActo).max(200).optional(),
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

  const d = analisis.data;

  try {
    const pagos: PagoRegistrado[] = (d.pagos ?? []).map((p) => ({
      fecha: p.fecha,
      importe: aCentavos(p.importe),
      concepto: p.concepto,
    }));
    const multas: MultaRegistrada[] = (d.multas ?? []).map((m) => ({
      concepto: m.concepto,
      importe: aCentavos(m.importe),
      ...(m.fechaExigibilidad !== undefined ? { fechaExigibilidad: m.fechaExigibilidad } : {}),
    }));
    const lineaDeTiempo: ActoExpediente[] = (d.lineaDeTiempo ?? []).map((a) => ({
      tipo: a.tipo,
      fecha: a.fecha,
      descripcion: a.descripcion,
      ...(a.notificadoAlDeudor !== undefined ? { notificadoAlDeudor: a.notificadoAlDeudor } : {}),
      ...(a.fechaFin !== undefined ? { fechaFin: a.fechaFin } : {}),
      ...(a.constaEn !== undefined ? { constaEn: a.constaEn } : {}),
    }));

    const entrada: EntradaCredito = {
      concepto: d.concepto,
      ejercicio: d.ejercicio,
      importeOriginal: aCentavos(d.importeOriginal),
      fechaExigibilidad: d.fechaExigibilidad,
      fechaCalculo: d.fechaCalculo,
      ...(d.fechaCausacion !== undefined ? { fechaCausacion: d.fechaCausacion } : {}),
      ...(d.tipoRecargo !== undefined ? { tipoRecargo: d.tipoRecargo } : {}),
      ...(pagos.length > 0 ? { pagos } : {}),
      ...(multas.length > 0 ? { multas } : {}),
      ...(d.lineaDeTiempo !== undefined ? { lineaDeTiempo } : {}),
    };

    return NextResponse.json(estimar(entrada));
  } catch (e) {
    if (e instanceof EntradaCreditoInvalida || e instanceof ImporteInvalido || e instanceof FechaInvalida) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    if (e instanceof TasaFueraDelCorpus) {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    const mensaje = e instanceof Error ? e.message : 'Error desconocido en el motor.';
    return NextResponse.json(
      { error: `El motor no pudo completar la estimación. ${mensaje}` },
      { status: 500 },
    );
  }
}
