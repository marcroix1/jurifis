'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';

import { COPIA } from './textos';
import type { Pregunta, Respuesta } from './tipos';

/**
 * Captura de una pregunta. Soporta los cuatro tipos que el arbol admite y no sabe
 * nada de ramificacion: entrega la respuesta y el motor decide que sigue.
 *
 * El componente se monta con clave nueva por cada pregunta, de modo que su estado
 * interno arranca limpio y no arrastra lo tecleado en la anterior.
 */

const BOTON_PRINCIPAL =
  'w-full rounded-xl bg-marca px-5 py-3 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-progress disabled:opacity-70 sm:w-auto';

const BOTON_SECUNDARIO =
  'w-full rounded-xl border border-borde-fuerte bg-superficie px-5 py-3 text-sm font-semibold text-texto transition hover:border-marca hover:text-marca disabled:opacity-60 sm:w-auto';

export function CampoPregunta({
  pregunta,
  respuestaPrevia,
  enEdicion,
  ocupado,
  onResponder,
  onCancelar,
}: {
  pregunta: Pregunta;
  respuestaPrevia: Respuesta | undefined;
  enEdicion: boolean;
  ocupado: boolean;
  onResponder: (respuesta: Respuesta) => void;
  onCancelar: () => void;
}) {
  const [unica, setUnica] = useState<string | null>(
    respuestaPrevia !== undefined && respuestaPrevia.tipo === 'opcion_unica'
      ? respuestaPrevia.valor
      : null,
  );
  const [multiple, setMultiple] = useState<string[]>(
    respuestaPrevia !== undefined && respuestaPrevia.tipo === 'opcion_multiple'
      ? respuestaPrevia.valores
      : [],
  );
  const [fecha, setFecha] = useState(
    respuestaPrevia !== undefined && respuestaPrevia.tipo === 'fecha' ? respuestaPrevia.valor : '',
  );
  const [monto, setMonto] = useState(
    respuestaPrevia !== undefined && respuestaPrevia.tipo === 'monto'
      ? String(respuestaPrevia.valor)
      : '',
  );
  const [aviso, setAviso] = useState<string | null>(null);

  const opciones = pregunta.opciones ?? [];

  function alternarMultiple(valor: string) {
    setAviso(null);
    setMultiple((previo) =>
      previo.includes(valor) ? previo.filter((v) => v !== valor) : [...previo, valor],
    );
  }

  function enviar() {
    if (ocupado) return;
    if (pregunta.tipo === 'opcion_unica') {
      if (unica === null) {
        setAviso(COPIA.eligeUna);
        return;
      }
      onResponder({ tipo: 'opcion_unica', valor: unica });
      return;
    }
    if (pregunta.tipo === 'opcion_multiple') {
      if (multiple.length === 0) {
        setAviso(COPIA.faltaElegir);
        return;
      }
      onResponder({ tipo: 'opcion_multiple', valores: multiple });
      return;
    }
    if (pregunta.tipo === 'fecha') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        setAviso(COPIA.faltaFecha);
        return;
      }
      onResponder({ tipo: 'fecha', valor: fecha });
      return;
    }
    const numero = Number(monto.replace(/[\s,]/g, ''));
    if (monto.trim() === '' || !Number.isFinite(numero)) {
      setAviso(COPIA.faltaMonto);
      return;
    }
    if (numero < 0) {
      setAviso(COPIA.montoNegativo);
      return;
    }
    onResponder({ tipo: 'monto', valor: numero });
  }

  /** En opcion unica la eleccion avanza sola; en edicion, guarda el cambio. */
  function elegirUnica(valor: string) {
    if (ocupado) return;
    setUnica(valor);
    setAviso(null);
    onResponder({ tipo: 'opcion_unica', valor });
  }

  const necesitaBoton = pregunta.tipo !== 'opcion_unica';

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-7">
      {enEdicion ? (
        <p className="mb-3 text-xs font-semibold tracking-[0.14em] text-marca uppercase">
          {COPIA.cambiandoRespuesta}
        </p>
      ) : null}

      <h2 className="text-xl font-semibold leading-snug tracking-tight text-texto sm:text-2xl">
        {pregunta.texto}
      </h2>

      {pregunta.ayuda !== undefined ? (
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          <span className="font-semibold">{COPIA.ayudaRotulo}: </span>
          {pregunta.ayuda}
        </p>
      ) : null}

      {pregunta.tipo === 'opcion_unica' ? (
        <div className="mt-5 grid gap-2.5">
          {opciones.map((o) => (
            <button
              key={o.valor}
              type="button"
              disabled={ocupado}
              onClick={() => elegirUnica(o.valor)}
              aria-pressed={unica === o.valor}
              className={`min-h-12 w-full rounded-xl border px-4 py-3 text-left text-sm leading-relaxed transition disabled:opacity-60 ${
                unica === o.valor
                  ? 'border-marca bg-marca-tenue font-semibold text-texto'
                  : 'border-borde-fuerte bg-superficie text-texto hover:border-marca hover:bg-marca-tenue/40'
              }`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      ) : null}

      {pregunta.tipo === 'opcion_multiple' ? (
        <div className="mt-5">
          <p className="mb-2.5 text-xs font-medium text-tenue">{COPIA.eligeVarias}</p>
          <div className="grid gap-2.5">
            {opciones.map((o) => (
              <label
                key={o.valor}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm leading-relaxed transition ${
                  multiple.includes(o.valor)
                    ? 'border-marca bg-marca-tenue text-texto'
                    : 'border-borde-fuerte bg-superficie text-texto hover:border-marca'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--jf-marca)]"
                  checked={multiple.includes(o.valor)}
                  disabled={ocupado}
                  onChange={() => alternarMultiple(o.valor)}
                />
                <span>{o.etiqueta}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {pregunta.tipo === 'fecha' ? (
        <div className="mt-5 max-w-xs">
          <label className="jf-etiqueta" htmlFor={`campo-${pregunta.id}`}>
            {pregunta.texto}
          </label>
          <input
            id={`campo-${pregunta.id}`}
            type="date"
            className="jf-campo"
            value={fecha}
            disabled={ocupado}
            onChange={(e) => {
              setAviso(null);
              setFecha(e.target.value);
            }}
          />
        </div>
      ) : null}

      {pregunta.tipo === 'monto' ? (
        <div className="mt-5 max-w-xs">
          <label className="jf-etiqueta" htmlFor={`campo-${pregunta.id}`}>
            {pregunta.moneda === undefined ? pregunta.texto : `${pregunta.texto}, en ${pregunta.moneda}`}
          </label>
          <input
            id={`campo-${pregunta.id}`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="jf-campo"
            value={monto}
            disabled={ocupado}
            onChange={(e) => {
              setAviso(null);
              setMonto(e.target.value);
            }}
          />
        </div>
      ) : null}

      {aviso !== null ? (
        <div className="mt-4">
          <Aviso tono="alto">{aviso}</Aviso>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        {necesitaBoton ? (
          <button type="button" className={BOTON_PRINCIPAL} disabled={ocupado} onClick={enviar}>
            {ocupado ? COPIA.cargando : enEdicion ? COPIA.guardarCambio : COPIA.continuar}
          </button>
        ) : null}

        {pregunta.permiteNoSe === true ? (
          <button
            type="button"
            className={BOTON_SECUNDARIO}
            disabled={ocupado}
            onClick={() => onResponder({ tipo: 'no_se' })}
          >
            {COPIA.noSe}
          </button>
        ) : null}

        {enEdicion ? (
          <button
            type="button"
            className="w-full rounded-xl px-5 py-3 text-sm font-semibold text-tenue underline underline-offset-4 transition hover:text-texto sm:w-auto"
            disabled={ocupado}
            onClick={onCancelar}
          >
            {COPIA.cancelarCambio}
          </button>
        ) : null}
      </div>

      {pregunta.permiteNoSe === true ? (
        <p className="mt-3 text-xs leading-relaxed text-tenue">{COPIA.noSeDetalle}</p>
      ) : null}
    </div>
  );
}
