import { COPIA } from './textos';

/**
 * Avance del recorrido. Los dos numeros vienen del motor: cuantas preguntas aplican
 * con lo respondido y cuantas de esas ya tienen respuesta.
 */
export function BarraAvance({
  respondidas,
  aplicables,
}: {
  respondidas: number;
  aplicables: number;
}) {
  const total = Math.max(aplicables, 1);
  const porcentaje = Math.min(100, Math.round((respondidas / total) * 100));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
          {COPIA.avanceRotulo}
        </p>
        <p className="text-sm font-medium tabular-nums text-texto">
          {respondidas} {COPIA.avanceDe} {aplicables}
        </p>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-superficie-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={aplicables}
        aria-valuenow={respondidas}
        aria-label={COPIA.avanceRotulo}
      >
        <div
          className="h-full rounded-full bg-marca transition-[width] duration-300 ease-out"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-tenue">{COPIA.avanceDetalle}</p>
    </div>
  );
}
