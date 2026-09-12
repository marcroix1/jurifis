'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';

import { FormularioRevision } from './FormularioRevision';
import { ETIQUETAS_URGENCIA, enlacePlazos } from './formato';
import { COPIA } from './textos';
import type { PasoDiagnostico } from './tipos';

/**
 * Pantalla del diagnostico preliminar. Muestra lo que devolvio armarDiagnostico y
 * nada mas: ni una via, ni un documento, ni una linea de analisis se agrega aqui.
 */

function Seccion({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
      <h3 className="text-base font-semibold text-texto">{titulo}</h3>
      {detalle !== undefined ? (
        <p className="mt-1.5 text-xs leading-relaxed text-tenue">{detalle}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Lista({ elementos }: { elementos: readonly string[] }) {
  return (
    <ul className="space-y-2.5">
      {elementos.map((t) => (
        <li key={t} className="flex gap-2.5 text-sm leading-relaxed text-texto/90">
          <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-marca" />
          <span className="min-w-0">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function PanelDiagnostico({
  paso,
  onReiniciar,
}: {
  paso: PasoDiagnostico;
  onReiniciar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const d = paso.diagnostico;
  const urgencia = ETIQUETAS_URGENCIA[d.urgencia];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-marca">
            {COPIA.diagnosticoOjo}
          </p>
          <Insignia tono={urgencia.tono}>{urgencia.titulo}</Insignia>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-texto sm:text-3xl">
          {COPIA.diagnosticoTitulo}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-texto/90">{d.resumen}</p>

        <div className="mt-5 rounded-xl border border-borde bg-superficie-2/60 p-4">
          <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
            {COPIA.urgenciaRotulo}
          </p>
          <div className="mt-2.5">
            <Lista elementos={d.motivosUrgencia} />
          </div>
        </div>

        {d.diasNaturalesDesdeNotificacion !== null ? (
          <div className="mt-4 rounded-xl border border-borde bg-superficie-2/60 p-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
              {COPIA.diasRotulo}
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-texto">
              {d.diasNaturalesDesdeNotificacion}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-tenue">{COPIA.diasDetalle}</p>
          </div>
        ) : null}

        <p className="mt-4 text-xs text-tenue">
          {COPIA.versionRotulo}: <span className="font-mono">{d.version}</span>
        </p>
      </section>

      <Seccion titulo={COPIA.viasRotulo}>
        {d.vias.length === 0 ? (
          <p className="text-sm leading-relaxed text-tenue">{COPIA.viasVacio}</p>
        ) : (
          <div className="space-y-4">
            {d.vias.map((v) => {
              const enCorpus = paso.reglasEnCorpus.includes(v.reglaPlazoId);
              return (
                <article key={v.clave} className="rounded-xl border border-borde bg-superficie-2/50 p-4">
                  <h4 className="text-sm font-semibold leading-snug text-texto">{v.nombre}</h4>
                  <p className="mt-2 text-sm leading-relaxed text-texto/85">
                    <span className="font-semibold text-tenue">{COPIA.porQueRotulo}: </span>
                    {v.porQue}
                  </p>
                  <p className="mt-3 text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
                    {COPIA.verificarRotulo}
                  </p>
                  <div className="mt-2">
                    <Lista elementos={v.requiereVerificar} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-lg border border-borde bg-superficie px-2.5 py-1 font-mono text-xs text-tenue">
                      {v.reglaPlazoId}
                    </span>
                    {enCorpus ? (
                      <Link
                        href={enlacePlazos(v.reglaPlazoId)}
                        className="rounded-lg bg-marca px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-marca-viva"
                      >
                        {COPIA.irAPlazos}
                      </Link>
                    ) : (
                      <span className="text-xs leading-relaxed text-tenue">{COPIA.reglaSinFicha}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Seccion>

      <Seccion titulo={COPIA.plazosRotulo} detalle={COPIA.plazosDetalle}>
        {d.plazosPorVerificar.length === 0 ? (
          <p className="text-sm leading-relaxed text-tenue">{COPIA.plazosVacio}</p>
        ) : (
          <ul className="flex flex-wrap gap-2.5">
            {d.plazosPorVerificar.map((id) =>
              paso.reglasEnCorpus.includes(id) ? (
                <li key={id}>
                  <Link
                    href={enlacePlazos(id)}
                    className="inline-flex items-center gap-2 rounded-lg border border-borde-fuerte bg-superficie px-3 py-2 font-mono text-xs text-texto transition hover:border-marca hover:text-marca"
                  >
                    {id}
                  </Link>
                </li>
              ) : (
                <li
                  key={id}
                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-borde-fuerte px-3 py-2 font-mono text-xs text-tenue"
                >
                  {id}
                </li>
              ),
            )}
          </ul>
        )}
      </Seccion>

      <Seccion titulo={COPIA.faltanteRotulo}>
        {d.informacionFaltante.length === 0 ? (
          <p className="text-sm leading-relaxed text-tenue">{COPIA.faltanteVacio}</p>
        ) : (
          <Lista elementos={d.informacionFaltante} />
        )}
      </Seccion>

      <Seccion titulo={COPIA.documentosRotulo}>
        <Lista elementos={d.documentos} />
      </Seccion>

      <Seccion titulo={COPIA.lineasRotulo}>
        <Lista elementos={d.lineasDeAnalisis} />
      </Seccion>

      <div className="space-y-3">
        {d.advertencias.map((a) => (
          <Aviso key={a} tono="aviso">
            {a}
          </Aviso>
        ))}
      </div>

      <section className="rounded-2xl border border-marca/30 bg-marca-tenue p-5 shadow-tarjeta sm:p-7">
        <h3 className="text-lg font-semibold tracking-tight text-texto">{COPIA.llamadaTitulo}</h3>
        <p className="mt-2 text-sm leading-relaxed text-texto/85">{COPIA.llamadaDetalle}</p>
        {abierto ? (
          <div className="mt-5">
            <FormularioRevision resumen={paso.resumenParaProspecto} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="mt-5 w-full rounded-xl bg-marca px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-marca-viva sm:w-auto"
          >
            {COPIA.llamada}
          </button>
        )}
      </section>

      <div className="pt-1">
        <button
          type="button"
          onClick={onReiniciar}
          className="text-sm font-semibold text-tenue underline underline-offset-4 transition hover:text-texto"
        >
          {COPIA.reiniciar}
        </button>
      </div>
    </div>
  );
}
