'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import type { ErrorApi } from '@/lib/tipos-ui';

interface Campos {
  caratula: string;
  clienteNombre: string;
  registroFederalDeContribuyentes: string;
  autoridad: string;
  tipoProcedimiento: string;
  numeroExpediente: string;
  numeroCredito: string;
  ejercicio: string;
  monto: string;
  moneda: string;
  responsable: string;
  abiertoEn: string;
}

const VACIO: Campos = {
  caratula: '',
  clienteNombre: '',
  registroFederalDeContribuyentes: '',
  autoridad: '',
  tipoProcedimiento: '',
  numeroExpediente: '',
  numeroCredito: '',
  ejercicio: '',
  monto: '',
  moneda: 'MXN',
  responsable: '',
  abiertoEn: '',
};

/** Alta de expediente. Nace en la etapa "nuevo" y sin plazos. */
export function FormularioExpediente({ hoy }: { hoy: string }) {
  const router = useRouter();
  const [campos, setCampos] = useState<Campos>({ ...VACIO, abiertoEn: hoy });
  const [error, setError] = useState<ErrorApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  function cambiar<C extends keyof Campos>(campo: C, valor: string) {
    setCampos((previos) => ({ ...previos, [campo]: valor }));
  }

  function opcional(valor: string): string | undefined {
    const v = valor.trim();
    return v === '' ? undefined : v;
  }

  function numero(valor: string): number | undefined {
    const v = valor.trim();
    if (v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const respuesta = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          caratula: campos.caratula.trim(),
          clienteNombre: campos.clienteNombre.trim(),
          autoridad: campos.autoridad.trim(),
          tipoProcedimiento: campos.tipoProcedimiento.trim(),
          responsable: campos.responsable.trim(),
          ...(opcional(campos.registroFederalDeContribuyentes) !== undefined
            ? { registroFederalDeContribuyentes: campos.registroFederalDeContribuyentes.trim() }
            : {}),
          ...(opcional(campos.numeroExpediente) !== undefined
            ? { numeroExpediente: campos.numeroExpediente.trim() }
            : {}),
          ...(opcional(campos.numeroCredito) !== undefined
            ? { numeroCredito: campos.numeroCredito.trim() }
            : {}),
          ...(numero(campos.ejercicio) !== undefined ? { ejercicio: numero(campos.ejercicio) } : {}),
          ...(numero(campos.monto) !== undefined ? { monto: numero(campos.monto) } : {}),
          ...(opcional(campos.moneda) !== undefined
            ? { moneda: campos.moneda.trim().toUpperCase() }
            : {}),
          ...(opcional(campos.abiertoEn) !== undefined ? { abiertoEn: campos.abiertoEn } : {}),
        }),
      });
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo as ErrorApi);
        return;
      }
      const creado = cuerpo as { expediente: { id: string } };
      router.push(`/expedientes/${creado.expediente.id}`);
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
      {error !== null ? (
        <Aviso tono="alto" titulo="No se pudo dar de alta">
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

      <div>
        <label className="jf-etiqueta" htmlFor="caratula">
          Carátula del asunto
        </label>
        <input
          id="caratula"
          className="jf-campo"
          required
          minLength={5}
          maxLength={240}
          value={campos.caratula}
          onChange={(e) => cambiar('caratula', e.target.value)}
          placeholder="Cliente contra autoridad"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="jf-etiqueta" htmlFor="clienteNombre">
            Cliente
          </label>
          <input
            id="clienteNombre"
            className="jf-campo"
            required
            minLength={2}
            maxLength={200}
            value={campos.clienteNombre}
            onChange={(e) => cambiar('clienteNombre', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="rfc">
            Registro federal de contribuyentes
          </label>
          <input
            id="rfc"
            className="jf-campo"
            maxLength={13}
            value={campos.registroFederalDeContribuyentes}
            onChange={(e) =>
              cambiar('registroFederalDeContribuyentes', e.target.value.toUpperCase())
            }
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="autoridad">
            Autoridad
          </label>
          <input
            id="autoridad"
            className="jf-campo"
            required
            minLength={3}
            maxLength={200}
            value={campos.autoridad}
            onChange={(e) => cambiar('autoridad', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="tipoProcedimiento">
            Tipo de procedimiento
          </label>
          <input
            id="tipoProcedimiento"
            className="jf-campo"
            required
            minLength={3}
            maxLength={160}
            value={campos.tipoProcedimiento}
            onChange={(e) => cambiar('tipoProcedimiento', e.target.value)}
            placeholder="Juicio contencioso administrativo federal"
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="numeroExpediente">
            Número de expediente
          </label>
          <input
            id="numeroExpediente"
            className="jf-campo"
            maxLength={80}
            value={campos.numeroExpediente}
            onChange={(e) => cambiar('numeroExpediente', e.target.value)}
            placeholder="Opcional, si el tribunal ya lo asignó"
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="numeroCredito">
            Número de crédito
          </label>
          <input
            id="numeroCredito"
            className="jf-campo"
            maxLength={80}
            value={campos.numeroCredito}
            onChange={(e) => cambiar('numeroCredito', e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="ejercicio">
            Ejercicio revisado
          </label>
          <input
            id="ejercicio"
            className="jf-campo"
            type="number"
            min={1990}
            max={2100}
            step={1}
            value={campos.ejercicio}
            onChange={(e) => cambiar('ejercicio', e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <div>
            <label className="jf-etiqueta" htmlFor="monto">
              Monto
            </label>
            <input
              id="monto"
              className="jf-campo"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={campos.monto}
              onChange={(e) => cambiar('monto', e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="jf-etiqueta" htmlFor="moneda">
              Moneda
            </label>
            <input
              id="moneda"
              className="jf-campo"
              maxLength={3}
              value={campos.moneda}
              onChange={(e) => cambiar('moneda', e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="responsable">
            Responsable
          </label>
          <input
            id="responsable"
            className="jf-campo"
            required
            minLength={2}
            maxLength={140}
            value={campos.responsable}
            onChange={(e) => cambiar('responsable', e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="abiertoEn">
            Fecha de apertura
          </label>
          <input
            id="abiertoEn"
            className="jf-campo"
            type="date"
            value={campos.abiertoEn}
            onChange={(e) => cambiar('abiertoEn', e.target.value)}
          />
        </div>
      </div>

      <p className="text-xs leading-relaxed text-tenue">
        El expediente nace en la etapa nuevo y sin plazos. Los plazos empiezan a correr cuando
        registras la notificación en la línea de tiempo y eliges la regla del corpus que le toca.
      </p>

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-xl bg-marca px-4 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70 sm:w-auto"
      >
        {enviando ? 'Guardando' : 'Dar de alta el expediente'}
      </button>
    </form>
  );
}
