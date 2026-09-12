/**
 * Etiquetas de la interfaz de expedientes.
 *
 * Traduce las claves del motor a texto legible en espanol, con acentos y sin
 * siglas. Aqui no se calcula nada ni se decide nada: si una clave no esta
 * mapeada, se muestra tal cual en lugar de inventarle un nombre.
 */
import type { Tono } from '@/lib/formato';
import type {
  EstadoExpediente,
  NivelUrgencia,
  TipoEvento,
} from '@jurifis/core/src/expediente/index.js';
import type { EfectoEnPlazos } from '@jurifis/core/src/expediente/index.js';

const ESTADOS: Record<EstadoExpediente, string> = {
  nuevo: 'Nuevo',
  en_analisis: 'En análisis',
  plazo_corriendo: 'Plazo corriendo',
  demanda_presentada: 'Demanda presentada',
  contestacion: 'Contestación',
  alegatos: 'Alegatos',
  sentencia: 'Sentencia',
  cumplimiento: 'Cumplimiento',
  concluido: 'Concluido',
};

export function etiquetaEstado(estado: string): string {
  return ESTADOS[estado as EstadoExpediente] ?? estado.replace(/_/g, ' ');
}

const TONO_ESTADO: Record<EstadoExpediente, Tono> = {
  nuevo: 'neutro',
  en_analisis: 'neutro',
  plazo_corriendo: 'aviso',
  demanda_presentada: 'neutro',
  contestacion: 'neutro',
  alegatos: 'neutro',
  sentencia: 'neutro',
  cumplimiento: 'aviso',
  concluido: 'ok',
};

export function tonoEstado(estado: string): Tono {
  return TONO_ESTADO[estado as EstadoExpediente] ?? 'neutro';
}

const TIPOS: Record<TipoEvento, string> = {
  notificacion: 'Notificación',
  presentacion: 'Presentación',
  acuerdo: 'Acuerdo',
  requerimiento: 'Requerimiento',
  audiencia: 'Audiencia',
  resolucion: 'Resolución',
  suspension: 'Suspensión',
  documento: 'Documento',
  cambio_de_estado: 'Cambio de etapa',
  nota: 'Nota',
};

export function etiquetaTipoEvento(tipo: string): string {
  return TIPOS[tipo as TipoEvento] ?? tipo.replace(/_/g, ' ');
}

const EFECTOS: Record<EfectoEnPlazos, string> = {
  dispara: 'Dispara un plazo',
  suspende: 'Suspende el cómputo',
  cumple: 'Cumple un plazo',
  ninguno: 'Sin efecto en los plazos',
};

export function etiquetaEfecto(efecto: string): string {
  return EFECTOS[efecto as EfectoEnPlazos] ?? efecto;
}

const URGENCIAS: Record<NivelUrgencia, { titulo: string; tono: Tono }> = {
  no_computable: { titulo: 'No se puede computar', tono: 'alto' },
  vencido: { titulo: 'Vencido', tono: 'alto' },
  critico: { titulo: 'Crítico', tono: 'alto' },
  alto: { titulo: 'Urgente', tono: 'aviso' },
  medio: { titulo: 'Atención', tono: 'aviso' },
  bajo: { titulo: 'Con holgura', tono: 'neutro' },
  cumplido: { titulo: 'Cumplido', tono: 'ok' },
};

export function etiquetaUrgencia(nivel: string): string {
  return URGENCIAS[nivel as NivelUrgencia]?.titulo ?? nivel.replace(/_/g, ' ');
}

export function tonoUrgencia(nivel: string): Tono {
  return URGENCIAS[nivel as NivelUrgencia]?.tono ?? 'alto';
}

/** Cantidad con centavos, en la moneda que declara el expediente. */
export function montoLegible(monto: { cantidad: number; moneda: string } | null): string {
  if (monto === null) return 'Sin monto registrado';
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: monto.moneda,
      minimumFractionDigits: 2,
    }).format(monto.cantidad);
  } catch {
    return `${monto.cantidad.toFixed(2)} ${monto.moneda}`;
  }
}

/** Cuenta de días hábiles, en palabras, sin abreviar. */
export function diasLegibles(dias: number | null): string {
  if (dias === null) return 'Sin cuenta de días';
  if (dias === 0) return 'Hoy es el último día hábil';
  return `${dias} ${dias === 1 ? 'día hábil restante' : 'días hábiles restantes'}`;
}
