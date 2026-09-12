'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import { etiquetaForma, etiquetaUnidad } from '@/lib/formato';
import type { PlazoExpediente } from '@/lib/almacen-expedientes';
import type { ErrorApi, ReglaResumen } from '@/lib/tipos-ui';

import { etiquetaTipoEvento } from './etiquetas';

const TIPOS = [
  'notificacion',
  'presentacion',
  'acuerdo',
  'requerimiento',
  'audiencia',
  'resolucion',
  'suspension',
  'documento',
  'nota',
] as const;

/**
 * Alta de una actuacion.
 *
 * Cuando es una notificacion, se puede pedir que dispare el computo: se elige
 * la regla del corpus y la forma en que se practico, y el motor hace el resto.
 * Este formulario no calcula ninguna fecha.
 */
export function FormularioEvento({
  expedienteId,
  reglas,
  plazos,
  hoy,
}: {
  expedienteId: string;
  reglas: ReglaResumen[];
  plazos: PlazoExpediente[];
  hoy: string;
}) {
  const router = useRouter();
  const primera = reglas[0];

  const [tipo, setTipo] = useState<string>('notificacion');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ocurridoEn, setOcurridoEn] = useState(hoy);
  const [registradoPor, setRegistradoPor] = useState('');

  const [conPlazo, setConPlazo] = useState(true);
  const [reglaId, setReglaId] = useState<string>(primera?.id ?? '');
  const [forma, setForma] = useState<string>(primera?.formas[0] ?? '');
  const [descripcionPlazo, setDescripcionPlazo] = useState('');

  const [hastaSuspension, setHastaSuspension] = useState('');
  const [motivoSuspension, setMotivoSuspension] = useState('');
  const [fundamentoSuspension, setFundamentoSuspension] = useState('');

  const [cumplePlazoId, setCumplePlazoId] = useState('');

  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);

  const regla = useMemo(() => reglas.find((r) => r.id === reglaId) ?? null, [reglas, reglaId]);
  const grupos = useMemo(() => {
    const mapa = new Map<string, ReglaResumen[]>();
    for (const r of reglas) {
      const lista = mapa.get(r.fundamento.ordenamiento) ?? [];
      lista.push(r);
      mapa.set(r.fundamento.ordenamiento, lista);
    }
    return [...mapa.entries()];
  }, [reglas]);

  const abiertos = plazos.filter((p) => p.cumplidoEn === null);
  const disparaPlazo = tipo === 'notificacion' && conPlazo && regla !== null;
  const esSuspension = tipo === 'suspension';
  const puedeCumplir = tipo === 'presentacion' && abiertos.length > 0;

  function cambiarRegla(id: string) {
    const nueva = reglas.find((r) => r.id === id);
    setReglaId(id);
    if (nueva !== undefined && !nueva.formas.includes(forma)) setForma(nueva.formas[0] ?? '');
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setListo(null);
    try {
      const respuesta = await fetch(`/api/expedientes/${expedienteId}/eventos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tipo,
          titulo: titulo.trim(),
          ocurridoEn,
          ...(descripcion.trim() !== '' ? { descripcion: descripcion.trim() } : {}),
          ...(registradoPor.trim() !== '' ? { registradoPor: registradoPor.trim() } : {}),
          ...(disparaPlazo && regla !== null
            ? {
                disparaPlazo: {
                  reglaId: regla.id,
                  formaNotificacion: forma,
                  descripcion:
                    descripcionPlazo.trim() === '' ? regla.descripcion : descripcionPlazo.trim(),
                },
              }
            : {}),
          ...(esSuspension
            ? {
                suspension: {
                  hasta: hastaSuspension,
                  motivo: motivoSuspension.trim(),
                  fundamento: fundamentoSuspension.trim(),
                },
              }
            : {}),
          ...(puedeCumplir && cumplePlazoId !== '' ? { cumplePlazoId } : {}),
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo as ErrorApi);
        return;
      }
      setTitulo('');
      setDescripcion('');
      setDescripcionPlazo('');
      setHastaSuspension('');
      setMotivoSuspension('');
      setFundamentoSuspension('');
      setCumplePlazoId('');
      setListo(
        disparaPlazo
          ? 'Se registró la actuación y el motor computó el plazo que dispara.'
          : 'Se registró la actuación en la línea de tiempo.',
      );
      router.refresh();
    } catch {
      setError({ error: 'No se pudo contactar al servidor. Revisa la conexión e inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-5 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6"
    >
      <div>
        <h3 className="text-base font-semibold text-texto">Registrar una actuación</h3>
        <p className="mt-1 text-sm leading-relaxed text-tenue">
          Una notificación puede echar a andar un plazo. Elige la regla del corpus y el motor lo
          computa con su traza.
        </p>
      </div>

      {error !== null ? (
        <Aviso tono="alto" titulo="No se pudo registrar">
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

      {listo !== null ? (
        <Aviso tono="ok" titulo="Listo">
          {listo}
        </Aviso>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="jf-etiqueta" htmlFor="ev-tipo">
            Tipo de actuación
          </label>
          <select
            id="ev-tipo"
            className="jf-campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {etiquetaTipoEvento(t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="ev-fecha">
            Fecha en que ocurrió
          </label>
          <input
            id="ev-fecha"
            type="date"
            className="jf-campo"
            required
            value={ocurridoEn}
            onChange={(e) => setOcurridoEn(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="jf-etiqueta" htmlFor="ev-titulo">
          Título
        </label>
        <input
          id="ev-titulo"
          className="jf-campo"
          required
          minLength={3}
          maxLength={200}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Notificación personal de la resolución"
        />
      </div>

      <div>
        <label className="jf-etiqueta" htmlFor="ev-descripcion">
          Descripción
        </label>
        <textarea
          id="ev-descripcion"
          className="jf-campo"
          rows={3}
          maxLength={2000}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div>
        <label className="jf-etiqueta" htmlFor="ev-registrado">
          Quién lo registra
        </label>
        <input
          id="ev-registrado"
          className="jf-campo"
          maxLength={140}
          value={registradoPor}
          onChange={(e) => setRegistradoPor(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      {tipo === 'notificacion' ? (
        <div className="space-y-4 rounded-xl border border-borde bg-superficie-2/50 p-4">
          <label className="flex items-start gap-3 text-sm text-texto">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--jf-marca)]"
              checked={conPlazo}
              onChange={(e) => setConPlazo(e.target.checked)}
            />
            <span>
              Esta notificación echa a andar un plazo
              <span className="mt-1 block text-xs leading-relaxed text-tenue">
                El cómputo lo hace el motor de plazos con la regla del corpus que elijas, no este
                formulario.
              </span>
            </span>
          </label>

          {conPlazo ? (
            <>
              <div>
                <label className="jf-etiqueta" htmlFor="ev-regla">
                  Regla del corpus
                </label>
                <select
                  id="ev-regla"
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
                {regla !== null ? (
                  <p className="mt-2 text-xs leading-relaxed text-tenue">
                    {regla.plazo.cantidad} {etiquetaUnidad(regla.plazo.unidad)} según el corpus
                    cargado.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="jf-etiqueta" htmlFor="ev-forma">
                  Forma de la notificación
                </label>
                <select
                  id="ev-forma"
                  className="jf-campo"
                  value={forma}
                  onChange={(e) => setForma(e.target.value)}
                >
                  {(regla?.formas ?? []).map((f) => (
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

              <div>
                <label className="jf-etiqueta" htmlFor="ev-descripcion-plazo">
                  Cómo se llama este plazo
                </label>
                <input
                  id="ev-descripcion-plazo"
                  className="jf-campo"
                  maxLength={160}
                  value={descripcionPlazo}
                  onChange={(e) => setDescripcionPlazo(e.target.value)}
                  placeholder={regla?.descripcion ?? 'Descripción del plazo'}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {esSuspension ? (
        <div className="space-y-4 rounded-xl border border-borde bg-superficie-2/50 p-4">
          <p className="text-xs leading-relaxed text-tenue">
            La suspensión entra al cómputo de todos los plazos del expediente. El motor no infiere
            ninguna: solo aplica las que quedan asentadas aquí.
          </p>
          <div>
            <label className="jf-etiqueta" htmlFor="ev-susp-hasta">
              Suspendido hasta
            </label>
            <input
              id="ev-susp-hasta"
              type="date"
              className="jf-campo"
              required
              value={hastaSuspension}
              onChange={(e) => setHastaSuspension(e.target.value)}
            />
          </div>
          <div>
            <label className="jf-etiqueta" htmlFor="ev-susp-motivo">
              Motivo
            </label>
            <input
              id="ev-susp-motivo"
              className="jf-campo"
              required
              minLength={3}
              maxLength={200}
              value={motivoSuspension}
              onChange={(e) => setMotivoSuspension(e.target.value)}
            />
          </div>
          <div>
            <label className="jf-etiqueta" htmlFor="ev-susp-fundamento">
              Fundamento
            </label>
            <input
              id="ev-susp-fundamento"
              className="jf-campo"
              required
              minLength={3}
              maxLength={200}
              value={fundamentoSuspension}
              onChange={(e) => setFundamentoSuspension(e.target.value)}
              placeholder="Acuerdo que la ordena"
            />
          </div>
        </div>
      ) : null}

      {puedeCumplir ? (
        <div className="rounded-xl border border-borde bg-superficie-2/50 p-4">
          <label className="jf-etiqueta" htmlFor="ev-cumple">
            Da por cumplido un plazo
          </label>
          <select
            id="ev-cumple"
            className="jf-campo"
            value={cumplePlazoId}
            onChange={(e) => setCumplePlazoId(e.target.value)}
          >
            <option value="">No cumple ningún plazo</option>
            {abiertos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.descripcion}, notificado el {p.fechaNotificacion}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-marca px-4 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70 sm:w-auto"
      >
        {enviando ? 'Registrando' : 'Registrar la actuación'}
      </button>
    </form>
  );
}
