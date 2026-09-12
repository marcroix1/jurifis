'use client';

import { useEffect, useRef, useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import type { ErrorApi } from '@/lib/tipos-ui';

import { BarraAvance } from './BarraAvance';
import { CampoPregunta } from './CampoPregunta';
import { PanelDiagnostico } from './PanelDiagnostico';
import { RespuestasPrevias } from './RespuestasPrevias';
import { COPIA } from './textos';
import type { PasoUI, Respuesta, Respuestas } from './tipos';

/**
 * Recorrido del cuestionario.
 *
 * Este componente no sabe que pregunta sigue ni cuando termina: cada vez que cambian
 * las respuestas se las manda a la ruta del motor y pinta lo que el motor conteste.
 * Lo unico que administra por su cuenta es lo que la interfaz debe administrar: que
 * hay en pantalla, que se esta cambiando y que se guarda en este navegador.
 */

const CLAVE_ALMACEN = 'jurifis-diagnostico';

interface Guardado {
  version: string;
  respuestas: Respuestas;
}

interface FallaUI {
  tipo: 'datos' | 'motor';
  api: ErrorApi | null;
}

/** Fecha civil del navegador, sin pasar por la zona horaria del servidor. */
function hoyLocal(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

function leerGuardado(): Respuestas {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    if (crudo === null) return {};
    const dato = JSON.parse(crudo) as Partial<Guardado>;
    if (dato.respuestas === undefined || dato.respuestas === null) return {};
    return dato.respuestas;
  } catch {
    return {};
  }
}

export function Cuestionario() {
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [hidratado, setHidratado] = useState(false);
  const [paso, setPaso] = useState<PasoUI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [falla, setFalla] = useState<FallaUI | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [verPrevias, setVerPrevias] = useState(false);
  const [intento, setIntento] = useState(0);

  const peticion = useRef(0);
  const version = useRef('');
  const tarjeta = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRespuestas(leerGuardado());
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (!hidratado) return;
    try {
      const guardado: Guardado = { version: version.current, respuestas };
      window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(guardado));
    } catch {
      // Un navegador sin almacenamiento local no impide usar el cuestionario.
    }

    const turno = peticion.current + 1;
    peticion.current = turno;
    setCargando(true);
    setFalla(null);

    void (async () => {
      try {
        const respuesta = await fetch('/api/diagnostico', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ respuestas, hoy: hoyLocal() }),
        });
        const cuerpo: unknown = await respuesta.json();
        if (turno !== peticion.current) return;
        if (!respuesta.ok) {
          setFalla({ tipo: respuesta.status === 400 ? 'datos' : 'motor', api: cuerpo as ErrorApi });
          return;
        }
        const nuevo = cuerpo as PasoUI;
        version.current = nuevo.version;
        setPaso(nuevo);
      } catch {
        if (turno !== peticion.current) return;
        setFalla({ tipo: 'motor', api: null });
      } finally {
        if (turno === peticion.current) setCargando(false);
      }
    })();
  }, [respuestas, hidratado, intento]);

  function responder(id: string, respuesta: Respuesta) {
    setEditando(null);
    setRespuestas((previo) => ({ ...previo, [id]: respuesta }));
  }

  function cambiar(id: string) {
    setEditando(id);
    setVerPrevias(false);
    window.requestAnimationFrame(() => {
      tarjeta.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function vaciar() {
    try {
      window.localStorage.removeItem(CLAVE_ALMACEN);
    } catch {
      // Sin almacenamiento local no hay nada que borrar.
    }
    setEditando(null);
    setVerPrevias(false);
    setPaso(null);
    setRespuestas({});
  }

  function reiniciar() {
    if (!window.confirm(COPIA.reiniciarConfirma)) return;
    vaciar();
  }

  if (falla !== null && falla.tipo === 'datos') {
    return (
      <Aviso tono="alto" titulo={COPIA.errorDatosTitulo}>
        <p>{COPIA.errorDatosDetalle}</p>
        {falla.api?.detalles !== undefined ? (
          <ul className="mt-2 space-y-1">
            {falla.api.detalles.map((d) => (
              <li key={d} className="font-mono text-xs">
                {d}
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={vaciar}
          className="mt-3 rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-viva"
        >
          {COPIA.reiniciar}
        </button>
      </Aviso>
    );
  }

  if (falla !== null) {
    return (
      <Aviso tono="alto" titulo={COPIA.errorMotorTitulo}>
        <p>{falla.api?.error ?? COPIA.errorMotorDetalle}</p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-3 rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-viva"
        >
          {COPIA.reintentar}
        </button>
      </Aviso>
    );
  }

  if (paso === null) {
    return (
      <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-10 text-center">
        <p className="text-sm font-medium text-tenue">{COPIA.cargando}</p>
      </div>
    );
  }

  const enEdicion = editando !== null;
  const capturada = enEdicion ? paso.capturadas.find((c) => c.pregunta.id === editando) : undefined;
  const preguntaActual =
    capturada !== undefined ? capturada.pregunta : paso.estado === 'pregunta' ? paso.pregunta : null;
  const ultima = paso.capturadas[paso.capturadas.length - 1];

  return (
    <div className="space-y-5">
      {paso.estado === 'pregunta' && !enEdicion ? (
        <BarraAvance respondidas={paso.respondidas} aplicables={paso.aplicables} />
      ) : null}

      <div ref={tarjeta} className="scroll-mt-24">
        {preguntaActual !== null ? (
          <CampoPregunta
            key={`${preguntaActual.id}-${enEdicion ? 'cambio' : 'nueva'}`}
            pregunta={preguntaActual}
            respuestaPrevia={capturada?.respuesta}
            enEdicion={enEdicion}
            ocupado={cargando}
            onResponder={(r) => responder(preguntaActual.id, r)}
            onCancelar={() => setEditando(null)}
          />
        ) : paso.estado === 'diagnostico' ? (
          <PanelDiagnostico paso={paso} onReiniciar={reiniciar} />
        ) : null}
      </div>

      {paso.capturadas.length > 0 ? (
        <div className="rounded-2xl border border-borde bg-superficie-2/40 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
              {COPIA.previasRotulo}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              {!enEdicion && ultima !== undefined && paso.estado === 'pregunta' ? (
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => cambiar(ultima.pregunta.id)}
                  className="text-xs font-semibold text-marca underline underline-offset-4 disabled:opacity-60"
                >
                  {COPIA.regresar}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setVerPrevias((v) => !v)}
                className="text-xs font-semibold text-marca underline underline-offset-4"
              >
                {verPrevias ? COPIA.ocultarPrevias : COPIA.mostrarPrevias}
              </button>
              {paso.estado === 'pregunta' ? (
                <button
                  type="button"
                  onClick={reiniciar}
                  className="text-xs font-semibold text-tenue underline underline-offset-4 transition hover:text-texto"
                >
                  {COPIA.reiniciar}
                </button>
              ) : null}
            </div>
          </div>
          {verPrevias ? (
            <div className="mt-4">
              <RespuestasPrevias
                capturadas={paso.capturadas}
                ocupado={cargando}
                editando={editando}
                onCambiar={cambiar}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
