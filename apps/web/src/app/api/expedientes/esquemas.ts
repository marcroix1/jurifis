/**
 * Validacion de la entrada de los expedientes.
 *
 * Aqui no se decide derecho: se comprueba la forma del dato y que las claves
 * que llegan existan de verdad en el corpus. Una regla inventada se rechaza en
 * la puerta, para que el expediente nunca guarde un plazo que apunta a la nada.
 */
import { z } from 'zod';

import { ESTADOS, TIPOS_EVENTO } from '@jurifis/core/src/expediente/index.js';

import { existeRegla, formasDelCorpus } from '@/lib/corpus';

const FORMAS = formasDelCorpus();

export const fecha = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Se espera una fecha civil con formato AAAA-MM-DD.');

export const estado = z.enum(ESTADOS as unknown as [string, ...string[]], {
  message: `Etapa fuera de la maquina de estados. Las validas son: ${ESTADOS.join(', ')}.`,
});

export const tipoEvento = z.enum(TIPOS_EVENTO as unknown as [string, ...string[]], {
  message: `Tipo de evento desconocido. Los validos son: ${TIPOS_EVENTO.join(', ')}.`,
});

const disparador = z.object({
  reglaId: z
    .string()
    .min(1, 'Indica la regla del corpus que se va a aplicar.')
    .refine((v) => existeRegla(v), {
      message: 'Esa regla no esta cargada en el corpus. El expediente no inventa reglas.',
    }),
  formaNotificacion: z.string().refine((v) => FORMAS.includes(v), {
    message: `Forma de notificacion fuera del corpus. Las cargadas son: ${FORMAS.join(', ')}.`,
  }),
  descripcion: z.string().trim().min(3, 'Describe el plazo que echa a andar esta notificacion.').max(160),
});

const suspension = z.object({
  hasta: fecha,
  motivo: z.string().trim().min(3, 'La suspension necesita motivo.').max(200),
  fundamento: z.string().trim().min(3, 'La suspension necesita fundamento.').max(200),
});

export const esquemaExpediente = z.object({
  caratula: z.string().trim().min(5, 'Escribe la caratula del asunto.').max(240),
  clienteNombre: z.string().trim().min(2, 'Escribe el nombre del cliente.').max(200),
  registroFederalDeContribuyentes: z
    .string()
    .trim()
    .max(13, 'El registro federal de contribuyentes no pasa de trece caracteres.')
    .optional(),
  autoridad: z.string().trim().min(3, 'Escribe la autoridad demandada o emisora.').max(200),
  tipoProcedimiento: z.string().trim().min(3, 'Escribe el tipo de procedimiento.').max(160),
  numeroExpediente: z.string().trim().max(80).optional(),
  numeroCredito: z.string().trim().max(80).optional(),
  ejercicio: z
    .number()
    .int('El ejercicio es un anio entero.')
    .min(1990, 'El ejercicio queda fuera del rango que esta version atiende.')
    .max(2100)
    .optional(),
  monto: z.number().nonnegative('El monto no puede ser negativo.').max(1e15).optional(),
  moneda: z.string().trim().length(3, 'La moneda va en tres letras, por ejemplo MXN.').optional(),
  responsable: z.string().trim().min(2, 'Escribe quien responde por el asunto.').max(140),
  abiertoEn: fecha.optional(),
});

export const esquemaEvento = z
  .object({
    tipo: tipoEvento,
    titulo: z.string().trim().min(3, 'Escribe el titulo de la actuacion.').max(200),
    descripcion: z.string().trim().max(2000).optional(),
    ocurridoEn: fecha,
    registradoPor: z.string().trim().max(140).optional(),
    disparaPlazo: disparador.optional(),
    suspension: suspension.optional(),
    cumplePlazoId: z.string().trim().max(120).optional(),
  })
  .refine((v) => v.suspension === undefined || v.suspension.hasta >= v.ocurridoEn, {
    message: 'La suspension no puede terminar antes de la fecha en que se registro.',
    path: ['suspension', 'hasta'],
  })
  .refine((v) => v.tipo !== 'suspension' || v.suspension !== undefined, {
    message: 'Un evento de suspension necesita el periodo, el motivo y el fundamento.',
    path: ['suspension'],
  });

export const esquemaCambioDeEstado = z.object({
  hacia: estado,
  fecha: fecha.optional(),
  nota: z.string().trim().max(500).optional(),
  registradoPor: z.string().trim().max(140).optional(),
});

/** Respuesta de error uniforme, con el campo que fallo y por que. */
export function errorDeValidacion(error: z.ZodError, encabezado: string): Response {
  return Response.json(
    {
      error: encabezado,
      detalles: error.issues.map((i) => {
        const campo = i.path.length > 0 ? i.path.join('.') : 'cuerpo';
        return `${campo}: ${i.message}`;
      }),
    },
    { status: 400 },
  );
}

export async function cuerpoJson(peticion: Request): Promise<{ ok: true; valor: unknown } | { ok: false; respuesta: Response }> {
  try {
    return { ok: true, valor: await peticion.json() };
  } catch {
    return {
      ok: false,
      respuesta: Response.json({ error: 'El cuerpo de la peticion no es JSON valido.' }, { status: 400 }),
    };
  }
}
