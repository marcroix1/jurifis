'use client';

import { useMemo, useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import { etiquetaForma, etiquetaUnidad } from '@/lib/formato';
import type { ErrorApi, ReglaResumen, ResultadoComputo } from '@/lib/tipos-ui';

import { FichaRegla } from './FichaRegla';
import { ResultadoPlazo } from './ResultadoPlazo';

interface Calculo {
  resultado: ResultadoComputo;
  regla: ReglaResumen;
  forma: string;
}

export function CalculadoraPlazos({ reglas, reglaSolicitada }: { reglas: ReglaResumen[]; reglaSolicitada?: string }) {
  // Regla inicial: la que llega por parametro de consulta cuando existe en el
  // corpus, y si no, la primera. Asi el diagnostico puede enlazar directo a la
  // regla que corresponde sin que el usuario la vuelva a buscar.
  const inicial = reglas.find((r) => r.id === reglaSolicitada) ?? reglas[0];
  const primera = inicial;
  const [reglaId, setReglaId] = useState<string>(inicial?.id ?? '');
  const [fechaNotificacion, setFechaNotificacion] = useState('');
  const [forma, setForma] = useState<string>(inicial?.formas[0] ?? '');
  const [usarReferencia, setUsarReferencia] = useState(false);
  const [fechaReferencia, setFechaReferencia] = useState('');
  const [calculo, setCalculo] = useState<Calculo | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(false);

  const regla = useMemo(
    () => reglas.find((r) => r.id === reglaId) ?? primera,
    [reglas, reglaId, primera],
  );

  const grupos = useMemo(() => {
    const mapa = new Map<string, ReglaResumen[]>();
    for (const r of reglas) {
      const clave = r.fundamento.ordenamiento;
      const lista = mapa.get(clave) ?? [];
      lista.push(r);
      mapa.set(clave, lista);
    }
    return [...mapa.entries()];
  }, [reglas]);

  if (regla === undefined) {
    return (
      <Aviso tono="alto" titulo="El corpus está vacío">
        No hay reglas de plazo cargadas en el motor, así que no hay nada que calcular.
      </Aviso>
    );
  }

  function cambiarRegla(id: string) {
    const nueva = reglas.find((r) => r.id === id);
    setReglaId(id);
    if (nueva !== undefined && !nueva.formas.includes(forma)) {
      setForma(nueva.formas[0] ?? '');
    }
  }

  async function calcular(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (regla === undefined) return;
    if (fechaNotificacion === '') {
      setError({ error: 'Indica la fecha en que se practicó la notificación.' });
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/plazos/calcular', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reglaId: regla.id,
          fechaNotificacion,
          formaNotificacion: forma,
          ...(usarReferencia && fechaReferencia !== '' ? { hoy: fechaReferencia } : {}),
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setCalculo(null);
        setError(cuerpo as ErrorApi);
        return;
      }
      setCalculo({ resultado: cuerpo as ResultadoComputo, regla, forma });
    } catch {
      setCalculo(null);
      setError({
        error: 'No se pudo contactar al motor. Revisa la conexión e inténtalo de nuevo.',
      });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-8">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <form
          onSubmit={calcular}
          className="space-y-5 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6"
        >
          <div>
            <label className="jf-etiqueta" htmlFor="regla">
              Regla del corpus
            </label>
            <select
              id="regla"
              className="jf-campo"
              value={reglaId}
              onChange={(e) => cambiarRegla(e.target.value)}
            >
              {grupos.map(([ordenamiento, lista]) => (
                <optgroup key={ordenamiento} label={ordenamiento}>
                  {lista.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.descripcion}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-tenue">
              {regla.plazo.cantidad} {etiquetaUnidad(regla.plazo.unidad)} según el corpus cargado.
            </p>
          </div>

          <div>
            <label className="jf-etiqueta" htmlFor="fecha">
              Fecha de la notificación
            </label>
            <input
              id="fecha"
              type="date"
              className="jf-campo"
              value={fechaNotificacion}
              onChange={(e) => setFechaNotificacion(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="jf-etiqueta" htmlFor="forma">
              Forma de la notificación
            </label>
            <select
              id="forma"
              className="jf-campo"
              value={forma}
              onChange={(e) => setForma(e.target.value)}
            >
              {regla.formas.map((f) => (
                <option key={f} value={f}>
                  {etiquetaForma(f)}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs leading-relaxed text-tenue">
              Solo aparecen las formas para las que esta regla tiene cargado el surtimiento de
              efectos.
            </p>
          </div>

          <div className="rounded-xl border border-borde bg-superficie-2/50 p-4">
            <label className="flex items-start gap-3 text-sm text-texto">
              <input
                type="checkbox"
                aria-label="Contar días transcurridos y restantes"
                className="mt-0.5 h-4 w-4 accent-[var(--jf-marca)]"
                checked={usarReferencia}
                onChange={(e) => setUsarReferencia(e.target.checked)}
              />
              <span>
                Contar días transcurridos y restantes
                <span className="mt-1 block text-xs leading-relaxed text-tenue">
                  Contra una fecha de referencia que tú eliges, para no depender del reloj del
                  servidor.
                </span>
              </span>
            </label>
            {usarReferencia ? (
              <input
                type="date"
                aria-label="Fecha de referencia"
                className="jf-campo mt-3"
                value={fechaReferencia}
                onChange={(e) => setFechaReferencia(e.target.value)}
              />
            ) : null}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-marca px-4 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70"
          >
            {cargando ? 'Calculando' : 'Calcular el plazo'}
          </button>
        </form>

        <div className="mt-5">
          <FichaRegla regla={regla} />
        </div>
      </div>

      <div className="min-w-0 space-y-6">
        {error !== null ? (
          <Aviso tono="alto" titulo="No se pudo calcular">
            <p>{error.error}</p>
            {error.detalles !== undefined ? (
              <ul className="mt-2 space-y-1">
                {error.detalles.map((d) => (
                  <li key={d} className="font-mono text-xs">
                    {d}
                  </li>
                ))}
              </ul>
            ) : null}
          </Aviso>
        ) : null}

        {calculo === null ? (
          <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-8 text-center">
            <p className="text-sm font-medium text-texto">Aquí aparece el cómputo</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
              Con la traza de cada paso, los días inhábiles descartados, las fuentes con su artículo
              y su archivo, y el estado de confianza del resultado.
            </p>
          </div>
        ) : (
          <ResultadoPlazo
            resultado={calculo.resultado}
            regla={calculo.regla}
            forma={calculo.forma}
          />
        )}
      </div>
    </div>
  );
}
