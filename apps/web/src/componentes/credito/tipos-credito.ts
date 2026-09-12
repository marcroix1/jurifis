import type {
  ActoConEfectoPosible, ActoExpediente, AnalisisExtincion, BloqueExtincion, DesgloseCredito,
  EstimacionCredito, FactorActualizacion, MesDeRecargo, PasoTrazaCredito, PeriodoRecargos,
} from '@jurifis/core/src/credito/index.js';
import type { Fundamento } from '@jurifis/core';

/**
 * Tipos de la interfaz de crédito. Se reexportan los del motor en lugar de redibujarlos:
 * si el motor cambia la forma de su salida, la pantalla deja de compilar en vez de
 * quedarse mostrando un campo que ya no existe.
 *
 * Son importaciones de solo tipo: no meten el motor en el paquete del navegador.
 */
export type {
  ActoConEfectoPosible, ActoExpediente, AnalisisExtincion, BloqueExtincion, DesgloseCredito,
  EstimacionCredito, FactorActualizacion, Fundamento, MesDeRecargo, PasoTrazaCredito, PeriodoRecargos,
};

export interface ErrorApi {
  error: string;
  detalles?: string[];
}

/** Renglón del formulario para un pago registrado. Todo es texto hasta que sale del navegador. */
export interface FilaPago {
  fecha: string;
  importe: string;
  concepto: string;
}

/** Renglón del formulario para una multa. */
export interface FilaMulta {
  concepto: string;
  importe: string;
  fechaExigibilidad: string;
}

/** Renglón del formulario para un acto de la línea de tiempo. */
export interface FilaActo {
  tipo: string;
  fecha: string;
  descripcion: string;
  notificadoAlDeudor: string;
  constaEn: string;
}
