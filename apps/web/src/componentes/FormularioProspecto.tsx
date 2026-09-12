'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import type { ErrorApi } from '@/lib/tipos-ui';

const VACIO = {
  nombre: '',
  correo: '',
  telefono: '',
  organizacion: '',
  situacion: '',
};

export function FormularioProspecto({ origen }: { origen: string }) {
  const [datos, setDatos] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<ErrorApi | null>(null);

  function actualizar(campo: keyof typeof VACIO, valor: string) {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/prospectos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...datos, origen }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo as ErrorApi);
        return;
      }
      setEnviado(true);
      setDatos(VACIO);
    } catch {
      setError({ error: 'No se pudo enviar. Revisa la conexión e inténtalo de nuevo.' });
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <Aviso tono="ok" titulo="Datos recibidos">
        <p>
          Quedaron registrados en esta instancia. El equipo de NOVA LEGAL, S.C. da seguimiento por
          el correo que dejaste.
        </p>
        <button
          type="button"
          className="mt-3 text-sm font-semibold text-marca underline underline-offset-4"
          onClick={() => setEnviado(false)}
        >
          Registrar otro contacto
        </button>
      </Aviso>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="space-y-5 rounded-2xl border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="jf-etiqueta" htmlFor="nombre">
            Nombre de contacto
          </label>
          <input
            id="nombre"
            name="nombre"
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
          <label className="jf-etiqueta" htmlFor="correo">
            Correo electrónico
          </label>
          <input
            id="correo"
            name="correo"
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
          <label className="jf-etiqueta" htmlFor="telefono">
            Teléfono, opcional
          </label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            className="jf-campo"
            autoComplete="tel"
            maxLength={40}
            value={datos.telefono}
            onChange={(e) => actualizar('telefono', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="organizacion">
            Empresa o despacho, opcional
          </label>
          <input
            id="organizacion"
            name="organizacion"
            className="jf-campo"
            autoComplete="organization"
            maxLength={140}
            value={datos.organizacion}
            onChange={(e) => actualizar('organizacion', e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="jf-etiqueta" htmlFor="situacion">
          Qué te gustaría revisar, opcional
        </label>
        <textarea
          id="situacion"
          name="situacion"
          className="jf-campo min-h-28 resize-y"
          maxLength={2000}
          value={datos.situacion}
          onChange={(e) => actualizar('situacion', e.target.value)}
        />
        <p className="mt-2 text-xs leading-relaxed text-tenue">
          Escribe solo lo que quieras compartir por este medio. No adjuntes documentos ni datos
          sensibles del expediente.
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

      <button
        type="submit"
        disabled={enviando}
        className="rounded-xl bg-marca px-5 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70"
      >
        {enviando ? 'Enviando' : 'Enviar mis datos'}
      </button>
    </form>
  );
}
