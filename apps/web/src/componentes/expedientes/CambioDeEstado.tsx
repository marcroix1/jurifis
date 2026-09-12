'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import type { ErrorApi } from '@/lib/tipos-ui';

import { etiquetaEstado, tonoEstado } from './etiquetas';

/**
 * Cambio de etapa acotado por la maquina de estados.
 *
 * En pantalla solo aparecen las transiciones que el modulo declara validas: la
 * interfaz no ofrece un salto que el servidor va a rechazar, y el servidor lo
 * vuelve a verificar de todos modos.
 */
export function CambioDeEstado({
  expedienteId,
  estadoActual,
  posibles,
  hoy,
}: {
  expedienteId: string;
  estadoActual: string;
  posibles: readonly string[];
  hoy: string;
}) {
  const router = useRouter();
  const [hacia, setHacia] = useState<string>(posibles[0] ?? '');
  const [fecha, setFecha] = useState<string>(hoy);
  const [nota, setNota] = useState('');
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/expedientes/${expedienteId}/estado`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hacia,
          fecha,
          ...(nota.trim() !== '' ? { nota: nota.trim() } : {}),
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo as ErrorApi);
        return;
      }
      setNota('');
      router.refresh();
    } catch {
      setError({ error: 'No se pudo contactar al servidor. Revisa la conexión e inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-texto">Etapa procesal</h3>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Insignia tono={tonoEstado(estadoActual)}>{etiquetaEstado(estadoActual)}</Insignia>
        </div>
      </div>

      {error !== null ? (
        <Aviso tono="alto" titulo="No se pudo cambiar la etapa">
          <p>{error.error}</p>
          {error.detalles !== undefined && error.detalles.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </Aviso>
      ) : null}

      {posibles.length === 0 ? (
        <p className="text-sm leading-relaxed text-tenue">
          Esta etapa es final. Desde aquí la máquina de estados no admite ninguna transición.
        </p>
      ) : (
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <label className="jf-etiqueta" htmlFor="estado-hacia">
              Pasar a
            </label>
            <select
              id="estado-hacia"
              className="jf-campo"
              value={hacia}
              onChange={(e) => setHacia(e.target.value)}
            >
              {posibles.map((p) => (
                <option key={p} value={p}>
                  {etiquetaEstado(p)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-tenue">
              Solo aparecen las transiciones que la máquina de estados declara válidas desde{' '}
              {etiquetaEstado(estadoActual).toLocaleLowerCase('es')}.
            </p>
          </div>

          <div>
            <label className="jf-etiqueta" htmlFor="estado-fecha">
              Fecha del cambio
            </label>
            <input
              id="estado-fecha"
              type="date"
              className="jf-campo"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>

          <div>
            <label className="jf-etiqueta" htmlFor="estado-nota">
              Nota
            </label>
            <input
              id="estado-nota"
              className="jf-campo"
              maxLength={500}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Opcional, queda en la línea de tiempo"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-xl border border-borde-fuerte bg-superficie-2 px-4 py-2.5 text-sm font-semibold text-texto transition hover:border-marca hover:text-marca disabled:cursor-progress disabled:opacity-70"
          >
            {enviando ? 'Cambiando' : 'Cambiar la etapa'}
          </button>
        </form>
      )}
    </div>
  );
}
