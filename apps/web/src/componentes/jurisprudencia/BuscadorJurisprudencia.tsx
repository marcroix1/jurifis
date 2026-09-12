'use client';

import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';

import type { DatosPagina, ResultadoBusqueda } from './datos';
import { estadoEstrategia, etiquetaEstrategia } from './datos';
import { FichaCriterio } from './FichaCriterio';

interface ErrorApi {
  error: string;
  detalles?: string[];
}

/** Filtro de un solo valor. Cuando el acervo no tiene valores, se declara. */
function FiltroLista({
  id,
  etiqueta,
  valores,
  valor,
  alCambiar,
  vacio,
}: {
  id: string;
  etiqueta: string;
  valores: { valor: string; etiqueta: string }[];
  valor: string;
  alCambiar: (v: string) => void;
  vacio: string;
}) {
  const sinValores = valores.length === 0;
  return (
    <div>
      <label className="jf-etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <select
        id={id}
        className="jf-campo disabled:cursor-not-allowed disabled:opacity-60"
        value={valor}
        disabled={sinValores}
        onChange={(e) => alCambiar(e.target.value)}
      >
        <option value="">{sinValores ? vacio : 'Cualquiera'}</option>
        {valores.map((v) => (
          <option key={v.valor} value={v.valor}>
            {v.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BuscadorJurisprudencia({ acervo, tipos }: Pick<DatosPagina, 'acervo' | 'tipos'>) {
  const [texto, setTexto] = useState('');
  const [registro, setRegistro] = useState('');
  const [tipo, setTipo] = useState('');
  const [organo, setOrgano] = useState('');
  const [epoca, setEpoca] = useState('');
  const [materia, setMateria] = useState('');
  const [resultado, setResultado] = useState<ResultadoBusqueda | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [cargando, setCargando] = useState(false);

  const listaDe = (valores: string[]) => valores.map((v) => ({ valor: v, etiqueta: v }));

  async function buscar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (texto.trim() === '' && registro.trim() === '' && tipo === '' && organo === '' && epoca === '' && materia === '') {
      setError({
        error: 'Escribe qué buscas o elige al menos un filtro.',
      });
      setResultado(null);
      return;
    }
    setCargando(true);
    setError(null);
    const parametros = new URLSearchParams();
    if (texto.trim() !== '') parametros.set('texto', texto.trim());
    if (registro.trim() !== '') parametros.set('registro', registro.trim());
    if (tipo !== '') parametros.set('tipo', tipo);
    if (organo !== '') parametros.set('organo', organo);
    if (epoca !== '') parametros.set('epoca', epoca);
    if (materia !== '') parametros.set('materia', materia);

    try {
      const respuesta = await fetch(`/api/jurisprudencia/buscar?${parametros.toString()}`);
      const cuerpo: unknown = await respuesta.json();
      if (!respuesta.ok) {
        setResultado(null);
        setError(cuerpo as ErrorApi);
        return;
      }
      setResultado(cuerpo as ResultadoBusqueda);
    } catch {
      setResultado(null);
      setError({ error: 'No se pudo contactar al buscador. Revisa la conexión e inténtalo otra vez.' });
    } finally {
      setCargando(false);
    }
  }

  function limpiar() {
    setTexto('');
    setRegistro('');
    setTipo('');
    setOrgano('');
    setEpoca('');
    setMateria('');
    setResultado(null);
    setError(null);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={buscar}
        className="space-y-5 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6"
      >
        <div>
          <label className="jf-etiqueta" htmlFor="texto">
            Qué buscas
          </label>
          <textarea
            id="texto"
            className="jf-campo min-h-24 resize-y"
            placeholder="Escríbelo como se lo dirías a un colega. Por ejemplo: caducidad de las facultades de comprobación cuando la visita se suspende."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <p className="mt-2 text-xs leading-relaxed text-tenue">
            Hoy se comparan las palabras que escribes contra el rubro y el texto de cada criterio.
            La búsqueda por significado está diseñada y todavía no tiene motor de vectores, así que
            el buscador la declara apagada en lugar de fingir que la usa.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="jf-etiqueta" htmlFor="registro">
              Registro digital
            </label>
            <input
              id="registro"
              className="jf-campo"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Coincidencia exacta"
              value={registro}
              onChange={(e) => setRegistro(e.target.value)}
            />
          </div>
          <div>
            <label className="jf-etiqueta" htmlFor="tipo">
              Tipo de criterio
            </label>
            <select
              id="tipo"
              className="jf-campo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              <option value="">Cualquiera</option>
              {tipos.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <FiltroLista
            id="organo"
            etiqueta="Órgano"
            valores={listaDe(acervo.facetas.organos)}
            valor={organo}
            alCambiar={setOrgano}
            vacio="Sin órganos en el acervo"
          />
          <FiltroLista
            id="epoca"
            etiqueta="Época"
            valores={listaDe(acervo.facetas.epocas)}
            valor={epoca}
            alCambiar={setEpoca}
            vacio="Sin épocas en el acervo"
          />
          <FiltroLista
            id="materia"
            etiqueta="Materia"
            valores={listaDe(acervo.facetas.materias)}
            valor={materia}
            alCambiar={setMateria}
            vacio="Sin materias en el acervo"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={cargando}
            className="rounded-lg bg-marca px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-viva disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cargando ? 'Buscando...' : 'Buscar en el acervo'}
          </button>
          <button
            type="button"
            onClick={limpiar}
            className="rounded-lg border border-borde-fuerte px-4 py-2.5 text-sm font-medium text-tenue transition hover:bg-superficie-2 hover:text-texto"
          >
            Limpiar
          </button>
          <p className="text-xs text-tenue">
            El tipo de criterio es una lista cerrada de seis valores, la misma de la base de datos.
            Los demás filtros solo ofrecen valores que el acervo tenga cargados.
          </p>
        </div>
      </form>

      {error !== null ? (
        <Aviso tono="alto" titulo="No se pudo buscar">
          <p>{error.error}</p>
          {error.detalles !== undefined && error.detalles.length > 0 ? (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {error.detalles.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : null}
        </Aviso>
      ) : null}

      {resultado !== null ? (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-texto">
              {resultado.total === 0
                ? 'Ningún criterio coincide'
                : `${resultado.total} ${resultado.total === 1 ? 'criterio' : 'criterios'}`}
            </h2>
            <p className="text-xs text-tenue">
              Buscado sobre {resultado.acervo.criteriosCargados}{' '}
              {resultado.acervo.criteriosCargados === 1 ? 'criterio cargado' : 'criterios cargados'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {resultado.estrategias.map((e) => {
              const estado = estadoEstrategia(e.estado);
              return (
                <div
                  key={e.clave}
                  className="rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-texto">{etiquetaEstrategia(e.clave)}</p>
                    <Insignia tono={estado.tono}>{estado.texto}</Insignia>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-tenue">{e.detalle}</p>
                </div>
              );
            })}
          </div>

          {resultado.total === 0 ? (
            <Aviso tono="aviso" titulo="Cero resultados, y por qué">
              <ul className="mt-2 list-disc space-y-1.5 pl-5">
                {resultado.advertencias.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              {resultado.faltantes.length > 0 ? (
                <>
                  <p className="mt-3 font-semibold">Lo que falta</p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-5">
                    {resultado.faltantes.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Aviso>
          ) : (
            <div className="space-y-5">
              {resultado.coincidencias.map((c) => (
                <FichaCriterio key={c.criterio.id} criterio={c.criterio} coincidencia={c} />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
