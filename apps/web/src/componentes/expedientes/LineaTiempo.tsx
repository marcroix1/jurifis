import { Insignia } from '@/componentes/Insignia';
import { etiquetaForma, fechaLarga } from '@/lib/formato';
import type { RenglonLinea } from '@/lib/almacen-expedientes';

import { etiquetaEfecto, etiquetaTipoEvento } from './etiquetas';

const TONO_EFECTO = {
  dispara: 'aviso',
  suspende: 'neutro',
  cumple: 'ok',
  ninguno: 'neutro',
} as const;

/**
 * Linea de tiempo vertical. Un renglon por actuacion, en orden cronologico,
 * con lo que cada una le hizo a los plazos. El renglon de una notificacion que
 * disparo un plazo que el motor no pudo computar no muestra fecha de
 * vencimiento: dice que no se pudo.
 */
export function LineaTiempo({ renglones }: { renglones: RenglonLinea[] }) {
  if (renglones.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-8 text-center">
        <p className="text-sm font-medium text-texto">La línea de tiempo está vacía</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
          Registra la primera actuación. Si es una notificación, puedes pedirle al motor que compute
          el plazo que echa a andar.
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l border-borde pl-6 sm:pl-8">
      {renglones.map((r) => (
        <li key={r.evento.id} className="relative">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[1.6rem] h-3 w-3 rounded-full border-2 border-superficie sm:-left-[2.1rem] ${
              r.efectoEnPlazos === 'dispara'
                ? 'bg-aviso'
                : r.efectoEnPlazos === 'cumple'
                  ? 'bg-ok'
                  : 'bg-borde-fuerte'
            }`}
          />

          <div className="rounded-2xl border border-borde bg-superficie p-4 shadow-tarjeta sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-tenue">{r.fecha}</span>
              <Insignia>{etiquetaTipoEvento(r.tipo)}</Insignia>
              <Insignia tono={TONO_EFECTO[r.efectoEnPlazos]}>
                {etiquetaEfecto(r.efectoEnPlazos)}
              </Insignia>
            </div>

            <p className="mt-2.5 text-sm font-semibold text-texto">{r.evento.titulo}</p>
            <p className="text-xs text-tenue">{fechaLarga(r.fecha)}</p>

            {r.evento.descripcion !== null ? (
              <p className="mt-2 text-sm leading-relaxed text-tenue">{r.evento.descripcion}</p>
            ) : null}

            {r.efectoEnPlazos !== 'ninguno' ? (
              <p className="mt-3 rounded-xl border border-borde bg-superficie-2/50 px-3.5 py-2.5 text-xs leading-relaxed text-texto">
                {r.plazo !== null && r.plazo.computo.vence === null
                  ? `Dispara el plazo de ${r.plazo.descripcion} y el motor no lo pudo computar. Esta pantalla no muestra ninguna fecha de vencimiento.`
                  : r.resumenEfecto}
              </p>
            ) : null}

            {r.evento.disparaPlazo !== null ? (
              <p className="mt-2 text-xs text-tenue">
                Regla del corpus{' '}
                <span className="font-mono text-[11px] text-marca">
                  {r.evento.disparaPlazo.reglaId}
                </span>
                , {etiquetaForma(r.evento.disparaPlazo.formaNotificacion).toLocaleLowerCase('es')}.
              </p>
            ) : null}

            {r.evento.registradoPor !== null ? (
              <p className="mt-2 text-xs text-tenue">Lo registró {r.evento.registradoPor}.</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
