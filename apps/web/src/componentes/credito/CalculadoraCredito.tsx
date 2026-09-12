'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';

import { ResultadoCredito } from './ResultadoCredito';
import { CONSTANCIAS, TIPOS_ACTO, TIPOS_RECARGO } from './formato-credito';
import type { ErrorApi, EstimacionCredito, FilaActo, FilaMulta, FilaPago } from './tipos-credito';

/**
 * Formulario de estimación del crédito fiscal.
 *
 * Los importes se capturan y se envían como texto en pesos. El navegador no los
 * convierte a número en ningún punto: la conversión a centavos enteros la hace el motor,
 * una sola vez y sin pasar por flotantes.
 */

const RE_IMPORTE = /^\d{1,15}(\.\d{1,2})?$/;

function Campo({
  id,
  etiqueta,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="jf-etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      {children}
      {ayuda !== undefined ? (
        <p className="mt-2 text-xs leading-relaxed text-tenue">{ayuda}</p>
      ) : null}
    </div>
  );
}

function BotonQuitar({ onClick, etiqueta }: { onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      className="shrink-0 rounded-lg border border-borde px-2.5 py-1 text-xs font-medium text-tenue transition hover:border-alto/40 hover:text-alto"
    >
      Quitar
    </button>
  );
}

function BotonAgregar({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-dashed border-borde-fuerte px-3 py-2 text-xs font-medium text-tenue transition hover:border-marca hover:text-marca"
    >
      {children}
    </button>
  );
}

export function CalculadoraCredito() {
  const [concepto, setConcepto] = useState('');
  const [ejercicio, setEjercicio] = useState('2026');
  const [importeOriginal, setImporteOriginal] = useState('');
  const [fechaCausacion, setFechaCausacion] = useState('');
  const [fechaExigibilidad, setFechaExigibilidad] = useState('');
  const [fechaCalculo, setFechaCalculo] = useState('');
  const [tipoRecargo, setTipoRecargo] = useState('mora');
  const [pagos, setPagos] = useState<FilaPago[]>([]);
  const [multas, setMultas] = useState<FilaMulta[]>([]);
  const [usarLinea, setUsarLinea] = useState(false);
  const [actos, setActos] = useState<FilaActo[]>([]);

  const [resultado, setResultado] = useState<EstimacionCredito | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(false);

  function validar(): string[] {
    const problemas: string[] = [];
    if (concepto.trim() === '') problemas.push('Indica qué se está estimando.');
    if (!RE_IMPORTE.test(importeOriginal)) {
      problemas.push('El importe original va en pesos, con hasta dos decimales y sin signo.');
    }
    if (fechaExigibilidad === '') problemas.push('Indica la fecha de exigibilidad.');
    if (fechaCalculo === '') problemas.push('Indica hasta qué día se estima.');
    for (const [i, p] of pagos.entries()) {
      if (p.fecha === '' || !RE_IMPORTE.test(p.importe) || p.concepto.trim() === '') {
        problemas.push(`El pago ${i + 1} necesita fecha, importe en pesos y concepto.`);
      }
    }
    for (const [i, m] of multas.entries()) {
      if (!RE_IMPORTE.test(m.importe) || m.concepto.trim() === '') {
        problemas.push(`La multa ${i + 1} necesita concepto e importe en pesos.`);
      }
    }
    if (usarLinea) {
      for (const [i, a] of actos.entries()) {
        if (a.fecha === '' || a.descripcion.trim() === '') {
          problemas.push(`El acto ${i + 1} de la línea de tiempo necesita fecha y descripción.`);
        }
      }
    }
    return problemas;
  }

  async function estimar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const problemas = validar();
    if (problemas.length > 0) {
      setResultado(null);
      setError({ error: 'Faltan datos para estimar.', detalles: problemas });
      return;
    }
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/credito/estimar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          concepto: concepto.trim(),
          ejercicio: Number(ejercicio),
          importeOriginal,
          fechaExigibilidad,
          fechaCalculo,
          tipoRecargo,
          ...(fechaCausacion !== '' ? { fechaCausacion } : {}),
          ...(pagos.length > 0
            ? { pagos: pagos.map((p) => ({ fecha: p.fecha, importe: p.importe, concepto: p.concepto.trim() })) }
            : {}),
          ...(multas.length > 0
            ? {
                multas: multas.map((m) => ({
                  concepto: m.concepto.trim(),
                  importe: m.importe,
                  ...(m.fechaExigibilidad !== '' ? { fechaExigibilidad: m.fechaExigibilidad } : {}),
                })),
              }
            : {}),
          ...(usarLinea
            ? {
                lineaDeTiempo: actos.map((a) => ({
                  tipo: a.tipo,
                  fecha: a.fecha,
                  descripcion: a.descripcion.trim(),
                  ...(a.notificadoAlDeudor !== '' ? { notificadoAlDeudor: a.notificadoAlDeudor } : {}),
                  ...(a.constaEn.trim() !== '' ? { constaEn: a.constaEn.trim() } : {}),
                })),
              }
            : {}),
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setResultado(null);
        setError(cuerpo as ErrorApi);
        return;
      }
      setResultado(cuerpo as EstimacionCredito);
    } catch {
      setResultado(null);
      setError({ error: 'No se pudo contactar al motor. Revisa la conexión e inténtalo de nuevo.' });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] lg:gap-8">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <form
          onSubmit={estimar}
          className="space-y-5 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6"
        >
          <Campo id="concepto" etiqueta="Concepto">
            <input
              id="concepto"
              type="text"
              className="jf-campo"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Impuesto sobre la renta del ejercicio, determinado en la resolución"
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="importe" etiqueta="Importe original">
              <input
                id="importe"
                type="text"
                inputMode="decimal"
                className="jf-campo font-mono"
                value={importeOriginal}
                onChange={(e) => setImporteOriginal(e.target.value)}
                placeholder="100000.00"
              />
            </Campo>
            <Campo id="ejercicio" etiqueta="Ejercicio">
              <input
                id="ejercicio"
                type="number"
                min={1980}
                max={2100}
                className="jf-campo"
                value={ejercicio}
                onChange={(e) => setEjercicio(e.target.value)}
              />
            </Campo>
          </div>

          <Campo
            id="causacion"
            etiqueta="Fecha del acto, opcional"
            ayuda="La del acto que dio origen al crédito, si consta. Es informativa y no entra a ningún cómputo."
          >
            <input
              id="causacion"
              type="date"
              className="jf-campo"
              value={fechaCausacion}
              onChange={(e) => setFechaCausacion(e.target.value)}
            />
          </Campo>

          <Campo
            id="exigibilidad"
            etiqueta="Fecha de exigibilidad"
            ayuda="El día en que el pago pudo ser legalmente exigido. Desde aquí corren la actualización y los recargos."
          >
            <input
              id="exigibilidad"
              type="date"
              className="jf-campo"
              value={fechaExigibilidad}
              onChange={(e) => setFechaExigibilidad(e.target.value)}
            />
          </Campo>

          <Campo
            id="calculo"
            etiqueta="Estimado hasta el día"
            ayuda="La eliges tú. El motor no consulta ningún reloj, por la misma razón por la que no usa el objeto de fecha del navegador."
          >
            <input
              id="calculo"
              type="date"
              className="jf-campo"
              value={fechaCalculo}
              onChange={(e) => setFechaCalculo(e.target.value)}
            />
          </Campo>

          <Campo id="tipo-recargo" etiqueta="Tipo de recargo">
            <select
              id="tipo-recargo"
              className="jf-campo"
              value={tipoRecargo}
              onChange={(e) => setTipoRecargo(e.target.value)}
            >
              {TIPOS_RECARGO.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </Campo>

          <fieldset className="rounded-xl border border-borde bg-superficie-2/50 p-4">
            <legend className="px-1 text-xs font-semibold text-tenue">Multas</legend>
            <div className="space-y-3">
              {multas.map((m, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-borde bg-superficie p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      aria-label={`Concepto de la multa ${i + 1}`}
                      className="jf-campo"
                      value={m.concepto}
                      onChange={(e) =>
                        setMultas(multas.map((x, j) => (j === i ? { ...x, concepto: e.target.value } : x)))
                      }
                      placeholder="Multa por declaración presentada a requerimiento"
                    />
                    <BotonQuitar onClick={() => setMultas(multas.filter((_, j) => j !== i))} etiqueta={`Quitar la multa ${i + 1}`} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Importe de la multa ${i + 1}`}
                      className="jf-campo font-mono"
                      value={m.importe}
                      onChange={(e) =>
                        setMultas(multas.map((x, j) => (j === i ? { ...x, importe: e.target.value } : x)))
                      }
                      placeholder="5000.00"
                    />
                    <input
                      type="date"
                      aria-label={`Fecha en que debió pagarse la multa ${i + 1}`}
                      className="jf-campo"
                      value={m.fechaExigibilidad}
                      onChange={(e) =>
                        setMultas(
                          multas.map((x, j) => (j === i ? { ...x, fechaExigibilidad: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                  <p className="text-xs leading-relaxed text-tenue">
                    Sin la fecha en que debió pagarse, la multa no se actualiza y el resultado lo
                    declara.
                  </p>
                </div>
              ))}
              <BotonAgregar
                onClick={() => setMultas([...multas, { concepto: '', importe: '', fechaExigibilidad: '' }])}
              >
                Agregar una multa
              </BotonAgregar>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-borde bg-superficie-2/50 p-4">
            <legend className="px-1 text-xs font-semibold text-tenue">Pagos</legend>
            <div className="space-y-3">
              {pagos.map((p, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-borde bg-superficie p-3">
                  <div className="flex items-start gap-2">
                    <input
                      type="text"
                      aria-label={`Concepto del pago ${i + 1}`}
                      className="jf-campo"
                      value={p.concepto}
                      onChange={(e) =>
                        setPagos(pagos.map((x, j) => (j === i ? { ...x, concepto: e.target.value } : x)))
                      }
                      placeholder="Pago parcial"
                    />
                    <BotonQuitar onClick={() => setPagos(pagos.filter((_, j) => j !== i))} etiqueta={`Quitar el pago ${i + 1}`} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Importe del pago ${i + 1}`}
                      className="jf-campo font-mono"
                      value={p.importe}
                      onChange={(e) =>
                        setPagos(pagos.map((x, j) => (j === i ? { ...x, importe: e.target.value } : x)))
                      }
                      placeholder="20000.00"
                    />
                    <input
                      type="date"
                      aria-label={`Fecha del pago ${i + 1}`}
                      className="jf-campo"
                      value={p.fecha}
                      onChange={(e) =>
                        setPagos(pagos.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)))
                      }
                    />
                  </div>
                </div>
              ))}
              <BotonAgregar onClick={() => setPagos([...pagos, { fecha: '', importe: '', concepto: '' }])}>
                Agregar un pago
              </BotonAgregar>
            </div>
          </fieldset>

          <div className="rounded-xl border border-borde bg-superficie-2/50 p-4">
            <label className="flex items-start gap-3 text-sm text-texto">
              <input
                type="checkbox"
                aria-label="Analizar prescripción y caducidad"
                className="mt-0.5 h-4 w-4 accent-[var(--jf-marca)]"
                checked={usarLinea}
                onChange={(e) => setUsarLinea(e.target.checked)}
              />
              <span>
                Analizar prescripción y caducidad
                <span className="mt-1 block text-xs leading-relaxed text-tenue">
                  Captura los actos del expediente. El análisis no concluye si prescribió: lista los
                  actos que hay que verificar porque pudieron interrumpir o suspender el plazo.
                </span>
              </span>
            </label>

            {usarLinea ? (
              <div className="mt-3 space-y-3">
                {actos.map((a, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-borde bg-superficie p-3">
                    <div className="flex items-start gap-2">
                      <select
                        aria-label={`Tipo del acto ${i + 1}`}
                        className="jf-campo"
                        value={a.tipo}
                        onChange={(e) =>
                          setActos(actos.map((x, j) => (j === i ? { ...x, tipo: e.target.value } : x)))
                        }
                      >
                        {TIPOS_ACTO.map((t) => (
                          <option key={t.valor} value={t.valor}>
                            {t.etiqueta}
                          </option>
                        ))}
                      </select>
                      <BotonQuitar onClick={() => setActos(actos.filter((_, j) => j !== i))} etiqueta={`Quitar el acto ${i + 1}`} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        aria-label={`Fecha del acto ${i + 1}`}
                        className="jf-campo"
                        value={a.fecha}
                        onChange={(e) =>
                          setActos(actos.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)))
                        }
                      />
                      <select
                        aria-label={`Notificación al deudor del acto ${i + 1}`}
                        className="jf-campo"
                        value={a.notificadoAlDeudor}
                        onChange={(e) =>
                          setActos(
                            actos.map((x, j) => (j === i ? { ...x, notificadoAlDeudor: e.target.value } : x)),
                          )
                        }
                      >
                        <option value="">Notificación al deudor</option>
                        {CONSTANCIAS.map((c) => (
                          <option key={c.valor} value={c.valor}>
                            {c.etiqueta}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      aria-label={`Descripción del acto ${i + 1}`}
                      className="jf-campo"
                      value={a.descripcion}
                      onChange={(e) =>
                        setActos(actos.map((x, j) => (j === i ? { ...x, descripcion: e.target.value } : x)))
                      }
                      placeholder="Requerimiento de pago diligenciado en el domicilio fiscal"
                    />
                    <input
                      type="text"
                      aria-label={`Dónde consta el acto ${i + 1}`}
                      className="jf-campo"
                      value={a.constaEn}
                      onChange={(e) =>
                        setActos(actos.map((x, j) => (j === i ? { ...x, constaEn: e.target.value } : x)))
                      }
                      placeholder="Foja 12 del expediente"
                    />
                  </div>
                ))}
                <BotonAgregar
                  onClick={() =>
                    setActos([
                      ...actos,
                      { tipo: 'requerimiento_de_pago', fecha: '', descripcion: '', notificadoAlDeudor: '', constaEn: '' },
                    ])
                  }
                >
                  Agregar un acto del expediente
                </BotonAgregar>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-marca px-4 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70"
          >
            {cargando ? 'Estimando' : 'Estimar el crédito'}
          </button>
        </form>
      </div>

      <div className="min-w-0 space-y-6">
        {error !== null ? (
          <Aviso tono="alto" titulo="No se pudo estimar">
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

        {resultado === null ? (
          <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-8 text-center">
            <p className="text-sm font-medium text-texto">Aquí aparece la estimación</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
              Con el desglose separado en principal, actualización, recargos, multas, pagos y saldo,
              la traza de cada paso, las fuentes con su artículo y su archivo, y el sello de
              estimación.
            </p>
          </div>
        ) : (
          <ResultadoCredito resultado={resultado} />
        )}
      </div>
    </div>
  );
}
