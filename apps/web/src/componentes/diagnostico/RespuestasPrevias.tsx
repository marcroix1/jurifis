'use client';

import { textoRespuesta } from './formato';
import { COPIA } from './textos';
import type { Capturada } from './tipos';

/**
 * Repaso de lo capturado. Solo aparecen las preguntas que siguen aplicando: si una
 * respuesta cerro una rama, el motor deja de considerarla y aqui tampoco se muestra.
 */
export function RespuestasPrevias({
  capturadas,
  ocupado,
  editando,
  onCambiar,
}: {
  capturadas: Capturada[];
  ocupado: boolean;
  editando: string | null;
  onCambiar: (id: string) => void;
}) {
  if (capturadas.length === 0) {
    return <p className="text-sm leading-relaxed text-tenue">{COPIA.previasVacio}</p>;
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-tenue">{COPIA.previasDetalle}</p>
      <ul className="mt-3 divide-y divide-borde overflow-hidden rounded-xl border border-borde bg-superficie">
        {capturadas.map((c) => (
          <li
            key={c.pregunta.id}
            className={`flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${
              editando === c.pregunta.id ? 'bg-marca-tenue' : ''
            }`}
          >
            <div className="min-w-0">
              <p className="text-sm leading-snug text-tenue">{c.pregunta.texto}</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-texto">
                {textoRespuesta(c.pregunta, c.respuesta)}
              </p>
            </div>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => onCambiar(c.pregunta.id)}
              className="shrink-0 self-start rounded-lg border border-borde-fuerte px-3 py-1.5 text-xs font-semibold text-texto transition hover:border-marca hover:text-marca disabled:opacity-60"
            >
              {COPIA.cambiar}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
