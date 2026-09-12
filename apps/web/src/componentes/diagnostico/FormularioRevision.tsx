'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import type { ErrorApi } from '@/lib/tipos-ui';

import { COPIA } from './textos';

/**
 * Alta del prospecto con el resumen del diagnostico adjunto.
 *
 * El resumen llega ya armado y ya revisado por el guardian de lenguaje del motor:
 * esta pantalla no lo redacta, solo lo muestra y lo envia.
 */

/** Tope del campo "situacion" del prospecto, tal como lo valida su ruta. */
const LIMITE_SITUACION = 2000;

const VACIO = { nombre: '', correo: '', telefono: '', organizacion: '', nota: '' };

export function FormularioRevision({ resumen }: { resumen: string }) {
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [verResumen, setVerResumen] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);

  const espacioNota = Math.max(0, LIMITE_SITUACION - resumen.length - 2);

  function actualizar(campo: keyof typeof VACIO, valor: string) {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    const nota = datos.nota.trim().slice(0, espacioNota);
    const situacion = (nota === '' ? resumen : `${nota}\n\n${resumen}`).slice(0, LIMITE_SITUACION);
    try {
      const respuesta = await fetch('/api/prospectos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre: datos.nombre,
          correo: datos.correo,
          telefono: datos.telefono,
          organizacion: datos.organizacion,
          situacion,
          origen: 'diagnostico-cuestionario',
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo as ErrorApi);
        return;
      }
      setEnviado(true);
    } catch {
      setError({ error: COPIA.errorMotorDetalle });
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Aviso tono="ok" titulo={COPIA.enviadoTitulo}>
        <p>{COPIA.enviadoDetalle}</p>
      </Aviso>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-5 rounded-xl border border-borde bg-superficie p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="jf-etiqueta" htmlFor="revision-nombre">
            {COPIA.campoNombre}
          </label>
          <input
            id="revision-nombre"
            className="jf-campo"
            autoComplete="name"
            required
            minLength={2}
            maxLength={140}
            value={datos.nombre}
            onChange={(e) => actualizar('nombre', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="revision-correo">
            {COPIA.campoCorreo}
          </label>
          <input
            id="revision-correo"
            type="email"
            className="jf-campo"
            autoComplete="email"
            required
            maxLength={180}
            value={datos.correo}
            onChange={(e) => actualizar('correo', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="revision-telefono">
            {COPIA.campoTelefono}
          </label>
          <input
            id="revision-telefono"
            type="tel"
            className="jf-campo"
            autoComplete="tel"
            maxLength={40}
            value={datos.telefono}
            onChange={(e) => actualizar('telefono', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="revision-organizacion">
            {COPIA.campoOrganizacion}
          </label>
          <input
            id="revision-organizacion"
            className="jf-campo"
            autoComplete="organization"
            maxLength={140}
            value={datos.organizacion}
            onChange={(e) => actualizar('organizacion', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="jf-etiqueta" htmlFor="revision-nota">
          {COPIA.campoNota}
        </label>
        <textarea
          id="revision-nota"
          className="jf-campo min-h-24 resize-y"
          maxLength={espacioNota}
          value={datos.nota}
          onChange={(e) => actualizar('nota', e.target.value)}
        />
        <p className="mt-2 text-xs leading-relaxed text-tenue">
          {COPIA.notaDetalle} {COPIA.notaEspacio} {espacioNota - datos.nota.length}.
        </p>
      </div>

      <div className="rounded-xl border border-borde bg-superficie-2/60 p-4">
        <button
          type="button"
          onClick={() => setVerResumen((v) => !v)}
          className="text-xs font-semibold text-marca underline underline-offset-4"
        >
          {verResumen ? COPIA.ocultarResumen : COPIA.verResumen}
        </button>
        {verResumen ? (
          <>
            <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
              {COPIA.resumenAdjuntoRotulo}
            </p>
            <pre className="mt-2 overflow-x-auto text-xs leading-relaxed whitespace-pre-wrap text-texto/85">
              {resumen}
            </pre>
          </>
        ) : null}
      </div>

      {error !== null ? (
        <Aviso tono="alto" titulo={COPIA.errorEnvioTitulo}>
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

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-marca px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70 sm:w-auto"
      >
        {enviando ? COPIA.enviando : COPIA.enviar}
      </button>
    </form>
  );
}
