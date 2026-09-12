import Link from 'next/link';

import { Insignia } from '@/componentes/Insignia';
import { fechaLarga } from '@/lib/formato';
import type { Alerta } from '@/lib/almacen-expedientes';

import { diasLegibles, etiquetaUrgencia, tonoUrgencia } from './etiquetas';

/**
 * Vencimientos proximos, del mas critico al menos.
 *
 * La regla dura de producto vale igual aqui que en la calculadora: cuando el
 * motor no sostiene una fecha, esta tarjeta no muestra ninguna. En su lugar
 * dice que falta, y ese plazo va hasta arriba.
 */
export function PanelAlertas({
  alertas,
  conEnlace = true,
  titulo = 'Vencimientos próximos',
}: {
  alertas: Alerta[];
  conEnlace?: boolean;
  titulo?: string;
}) {
  if (alertas.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-6 text-center">
        <p className="text-sm font-medium text-texto">Sin plazos abiertos</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
          Ningún expediente tiene un plazo corriendo. Registra una notificación para que el motor
          empiece a computar.
        </p>
      </section>
    );
  }

  const sinComputo = alertas.filter((a) => a.nivel === 'no_computable').length;

  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-texto">{titulo}</h2>
        <p className="text-xs text-tenue">
          {alertas.length} {alertas.length === 1 ? 'plazo' : 'plazos'}
          {sinComputo > 0 ? `, ${sinComputo} sin poder computarse` : ''}
        </p>
      </header>

      <ul className="mt-4 space-y-3">
        {alertas.map((a) => (
          <li
            key={`${a.expedienteId}-${a.plazoId}`}
            className="rounded-xl border border-borde bg-superficie-2/50 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Insignia tono={tonoUrgencia(a.nivel)}>{etiquetaUrgencia(a.nivel)}</Insignia>
              {a.vence === null ? (
                <span className="text-xs font-medium text-alto">Sin fecha en pantalla</span>
              ) : (
                <span className="text-xs text-tenue">
                  {diasLegibles(a.diasHabilesRestantes)}
                </span>
              )}
            </div>

            <p className="mt-2.5 text-sm font-semibold text-texto">{a.titulo}</p>

            {conEnlace ? (
              <Link
                href={`/expedientes/${a.expedienteId}`}
                className="mt-1 block text-xs font-medium text-marca underline-offset-4 hover:underline"
              >
                {a.caratula}
              </Link>
            ) : null}

            {a.vence !== null ? (
              <p className="mt-2 text-sm text-texto">
                Vence el {fechaLarga(a.vence)}{' '}
                <span className="font-mono text-xs text-tenue">{a.vence}</span>
              </p>
            ) : null}

            <p className="mt-2 text-sm leading-relaxed text-tenue">{a.detalle}</p>

            {a.vence === null && a.faltantes.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {a.faltantes.map((f) => (
                  <li key={f} className="flex gap-2.5 text-xs leading-relaxed text-texto">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-alto"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            ) : null}

            <p className="mt-3 text-xs leading-relaxed text-tenue">
              <span className="font-medium text-texto">Qué sigue. </span>
              {a.accion}
            </p>
            <p className="mt-1 text-xs text-tenue">Responsable: {a.responsable}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
