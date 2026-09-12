import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import { CitaFundamento, CitaTraza } from '@/componentes/plazos/CitaFundamento';
import { estadoConfianza, etiquetaForma, fechaLarga, nivelFuenteTexto } from '@/lib/formato';
import type { PlazoExpediente } from '@/lib/almacen-expedientes';
import type { ReglaResumen } from '@/lib/tipos-ui';

import { diasLegibles } from './etiquetas';

/**
 * Plazos del expediente con su traza y su nivel de fuente.
 *
 * Vale la misma regla dura que en la calculadora: si el motor no sostiene la
 * fecha, aqui no aparece ninguna, ni siquiera dentro de la traza. Lo que se
 * muestra en su lugar es la lista de lo que falta.
 */
export function PlazosExpediente({
  plazos,
  reglas,
}: {
  plazos: PlazoExpediente[];
  reglas: ReglaResumen[];
}) {
  if (plazos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-8 text-center">
        <p className="text-sm font-medium text-texto">Sin plazos computados</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
          Los plazos nacen de las notificaciones registradas en la línea de tiempo. Agrega una y
          elige la regla del corpus que le corresponde.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {plazos.map((p) => (
        <TarjetaPlazo key={p.id} plazo={p} regla={reglas.find((r) => r.id === p.reglaId) ?? null} />
      ))}
    </div>
  );
}

function TarjetaPlazo({ plazo, regla }: { plazo: PlazoExpediente; regla: ReglaResumen | null }) {
  const c = plazo.computo;
  const estado = estadoConfianza(c.confianza);
  const conFecha = estado.muestraFecha && c.vence !== null;

  return (
    <article className="space-y-5 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
      <header className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tono={estado.tono}>{estado.titulo}</Insignia>
          <Insignia>{etiquetaForma(plazo.formaNotificacion)}</Insignia>
          {plazo.cumplidoEn !== null ? <Insignia tono="ok">Cumplido</Insignia> : null}
        </div>
        <h3 className="text-base font-semibold text-texto">
          Plazo para {plazo.descripcion}
        </h3>
        <p className="text-sm leading-relaxed text-tenue">{estado.resumen}</p>
      </header>

      {conFecha ? (
        <div className="rounded-xl border border-borde bg-superficie-2/60 p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
            Fecha de vencimiento
          </p>
          <p className="mt-1.5 text-2xl leading-tight font-semibold tracking-tight text-texto sm:text-3xl">
            {fechaLarga(c.vence)}
          </p>
          <p className="mt-1 font-mono text-sm text-marca">{c.vence}</p>

          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-tenue">Notificación</dt>
              <dd className="text-sm text-texto">{fechaLarga(plazo.fechaNotificacion)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Surte efectos</dt>
              <dd className="text-sm text-texto">{fechaLarga(c.surteEfectos)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Primer día del cómputo</dt>
              <dd className="text-sm text-texto">{fechaLarga(c.inicioComputo)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Días hábiles</dt>
              <dd className="text-sm text-texto">
                {c.diasTranscurridos ?? 0} transcurridos, {diasLegibles(c.diasRestantes)}
              </dd>
            </div>
            {plazo.cumplidoEn !== null ? (
              <div>
                <dt className="text-xs font-medium text-tenue">Cumplido el</dt>
                <dd className="text-sm text-texto">{fechaLarga(plazo.cumplidoEn)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <div className="rounded-xl border border-alto/30 bg-alto-tenue p-4 sm:p-5">
          <p className="text-xs font-semibold tracking-[0.14em] text-alto uppercase">
            Sin fecha en pantalla
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto">
            El motor no llegó a una fecha que pueda sostener, así que esta pantalla no muestra
            ninguna. Trata el plazo como si venciera hoy hasta que se resuelva lo siguiente.
          </p>
          <ul className="mt-3.5 space-y-2">
            {c.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alto" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="border-t border-borde pt-5">
        <h4 className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
          Nivel de fuente
        </h4>
        <div className="mt-3 flex flex-wrap gap-2">
          {regla === null ? (
            <Insignia tono="alto">
              La regla {plazo.reglaId} no está en el corpus de esta versión
            </Insignia>
          ) : (
            <>
              <Insignia tono={regla.nivelFuente === 'A' ? 'ok' : 'aviso'}>
                Regla {regla.id}: {nivelFuenteTexto(regla.nivelFuente)}
              </Insignia>
              {regla.calendarios.map((cal) => (
                <Insignia key={cal.id} tono={cal.nivelFuente === 'A' ? 'ok' : 'aviso'}>
                  Calendario {cal.id}: {nivelFuenteTexto(cal.nivelFuente)}
                </Insignia>
              ))}
            </>
          )}
        </div>
      </section>

      {conFecha && c.faltantes.length > 0 ? (
        <section className="border-t border-borde pt-5">
          <h4 className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
            Lo que falta para subir de confianza
          </h4>
          <ul className="mt-3 space-y-2">
            {c.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aviso" />
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-borde pt-5">
        <h4 className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
          Advertencias
        </h4>
        <div className="mt-3">
          <Aviso tono={estado.tono === 'ok' ? 'neutro' : estado.tono}>
            <ul className="space-y-2">
              {c.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Aviso>
        </div>
      </section>

      <details className="rounded-xl border border-borde bg-superficie-2/50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-texto">
          Traza del cómputo, {c.traza.length} {c.traza.length === 1 ? 'paso' : 'pasos'}
        </summary>
        {conFecha ? (
          <ol className="mt-4 space-y-4">
            {c.traza.map((p) => (
              <li key={`${p.paso}-${p.concepto}`} className="flex gap-3.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-borde bg-superficie font-mono text-xs text-tenue">
                  {p.paso}
                </span>
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-semibold tracking-[0.1em] text-marca uppercase">
                    {p.concepto}
                  </p>
                  {p.fecha !== undefined ? (
                    <p className="text-sm font-medium text-texto">
                      {fechaLarga(p.fecha)}{' '}
                      <span className="font-mono text-xs text-tenue">{p.fecha}</span>
                    </p>
                  ) : null}
                  <p className="text-sm leading-relaxed text-tenue">{p.detalle}</p>
                  {p.fundamento !== undefined ? <CitaTraza fundamento={p.fundamento} /> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <ol className="mt-4 space-y-2">
              {c.traza.map((p) => (
                <li key={`${p.paso}-${p.concepto}`} className="flex gap-3 text-sm text-tenue">
                  <span className="font-mono text-xs">{p.paso}</span>
                  <span className="text-texto">{p.concepto}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs leading-relaxed text-tenue">
              El detalle de cada paso queda fuera de pantalla porque contiene fechas de un cómputo
              que no llegó a término.
            </p>
          </>
        )}
      </details>

      {c.fuentes.length > 0 ? (
        <details className="rounded-xl border border-borde bg-superficie-2/50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-texto">
            Fuentes, {c.fuentes.length}
          </summary>
          <ul className="mt-3 space-y-3">
            {c.fuentes.map((f, i) => (
              <li
                key={`${f.ordenamiento}-${f.articulo}-${i}`}
                className="rounded-lg border border-borde bg-superficie px-3.5 py-2.5"
              >
                <CitaFundamento fundamento={f} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {conFecha && c.inhabilesAplicados.length > 0 ? (
        <details className="rounded-xl border border-borde bg-superficie-2/50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-texto">
            Días inhábiles descartados, {c.inhabilesAplicados.length}
          </summary>
          <ul className="mt-3 space-y-2">
            {c.inhabilesAplicados.map((d, i) => (
              <li key={`${d.fecha}-${i}`} className="text-xs leading-relaxed">
                <span className="font-mono text-tenue">{d.fecha}</span>{' '}
                <span className="text-texto">{d.motivo}</span>
                <span className="text-tenue">. {d.fundamento}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  );
}
