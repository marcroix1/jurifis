import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import { estadoConfianza, etiquetaForma, fechaLarga, nivelFuenteTexto } from '@/lib/formato';
import type { DiaInhabil, ReglaResumen, ResultadoComputo } from '@/lib/tipos-ui';

import { CitaFundamento, CitaTraza } from './CitaFundamento';

function agruparInhabiles(dias: DiaInhabil[]): { motivo: string; veces: number }[] {
  const cuenta = new Map<string, number>();
  for (const d of dias) cuenta.set(d.motivo, (cuenta.get(d.motivo) ?? 0) + 1);
  return [...cuenta.entries()]
    .map(([motivo, veces]) => ({ motivo, veces }))
    .sort((a, b) => b.veces - a.veces);
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-borde pt-6">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">{titulo}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ResultadoPlazo({
  resultado,
  regla,
  forma,
}: {
  resultado: ResultadoComputo;
  regla: ReglaResumen;
  forma: string;
}) {
  const estado = estadoConfianza(resultado.confianza);
  // Regla dura de producto: sin fecha en pantalla cuando el motor no la sostiene.
  const conFecha = estado.muestraFecha && resultado.vence !== null;
  const grupos = agruparInhabiles(resultado.inhabilesAplicados);

  return (
    <article className="space-y-6 rounded-2xl border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tono={estado.tono}>{estado.titulo}</Insignia>
          <Insignia>{etiquetaForma(forma)}</Insignia>
        </div>
        <p className="text-sm leading-relaxed text-tenue">{estado.resumen}</p>
      </header>

      {conFecha ? (
        <div className="rounded-xl border border-borde bg-superficie-2/60 p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">
            Fecha de vencimiento
          </p>
          <p className="mt-2 text-3xl leading-tight font-semibold tracking-tight text-texto sm:text-4xl">
            {fechaLarga(resultado.vence)}
          </p>
          <p className="mt-1 font-mono text-sm text-marca">{resultado.vence}</p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-tenue">Surte efectos</dt>
              <dd className="text-sm text-texto">
                {fechaLarga(resultado.surteEfectos)}{' '}
                <span className="font-mono text-xs text-tenue">{resultado.surteEfectos}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Primer día del cómputo</dt>
              <dd className="text-sm text-texto">
                {fechaLarga(resultado.inicioComputo)}{' '}
                <span className="font-mono text-xs text-tenue">{resultado.inicioComputo}</span>
              </dd>
            </div>
            {resultado.diasTranscurridos !== null ? (
              <div>
                <dt className="text-xs font-medium text-tenue">Días hábiles transcurridos</dt>
                <dd className="text-sm text-texto">{resultado.diasTranscurridos}</dd>
              </div>
            ) : null}
            {resultado.diasRestantes !== null ? (
              <div>
                <dt className="text-xs font-medium text-tenue">Días hábiles restantes</dt>
                <dd className="text-sm text-texto">{resultado.diasRestantes}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : (
        <div className="rounded-xl border border-alto/30 bg-alto-tenue p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-alto uppercase">
            Sin fecha en pantalla
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto">
            El motor no llegó a una fecha que pueda sostener, así que esta pantalla no muestra
            ninguna. Esto es lo que hace falta para completar el cómputo.
          </p>
          <ul className="mt-4 space-y-2">
            {resultado.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alto" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Seccion titulo="Nivel de fuente">
        <div className="flex flex-wrap gap-2">
          <Insignia tono={regla.nivelFuente === 'A' ? 'ok' : 'aviso'}>
            Regla {regla.id}: {nivelFuenteTexto(regla.nivelFuente)}
          </Insignia>
          {regla.calendarios.map((c) => (
            <Insignia key={c.id} tono={c.nivelFuente === 'A' ? 'ok' : 'aviso'}>
              Calendario {c.id}: {nivelFuenteTexto(c.nivelFuente)}
            </Insignia>
          ))}
        </div>
      </Seccion>

      {conFecha && resultado.faltantes.length > 0 ? (
        <Seccion titulo="Lo que falta para subir de confianza">
          <ul className="space-y-2">
            {resultado.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aviso" />
                {f}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <Seccion titulo="Advertencias">
        <Aviso tono={estado.tono === 'ok' ? 'neutro' : estado.tono}>
          <ul className="space-y-2">
            {resultado.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Aviso>
      </Seccion>

      {conFecha ? (
        <Seccion titulo={`Traza del cómputo, ${resultado.traza.length} pasos`}>
          <ol className="space-y-4">
            {resultado.traza.map((p) => (
              <li key={`${p.paso}-${p.concepto}`} className="flex gap-4">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-borde bg-superficie-2 font-mono text-xs text-tenue">
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
        </Seccion>
      ) : (
        <Seccion titulo="Hasta dónde llegó el cómputo">
          <ol className="space-y-2">
            {resultado.traza.map((p) => (
              <li key={`${p.paso}-${p.concepto}`} className="flex gap-3 text-sm text-tenue">
                <span className="font-mono text-xs">{p.paso}</span>
                <span className="text-texto">{p.concepto}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-tenue">
            El detalle de cada paso queda fuera de pantalla porque contiene fechas de un cómputo que
            no llegó a término.
          </p>
        </Seccion>
      )}

      {conFecha ? (
        <Seccion titulo={`Días inhábiles descartados, ${resultado.inhabilesAplicados.length}`}>
          {resultado.inhabilesAplicados.length === 0 ? (
            <p className="text-sm text-tenue">
              El cómputo no descartó ningún día dentro del periodo.
            </p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {grupos.map((g) => (
                  <li key={g.motivo} className="flex justify-between gap-4 text-sm">
                    <span className="text-texto">{g.motivo}</span>
                    <span className="shrink-0 font-mono text-xs text-tenue">
                      {g.veces} {g.veces === 1 ? 'día' : 'días'}
                    </span>
                  </li>
                ))}
              </ul>
              <details className="mt-4 rounded-xl border border-borde bg-superficie-2/50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-texto">
                  Ver los {resultado.inhabilesAplicados.length} días uno por uno
                </summary>
                <ul className="mt-3 space-y-2">
                  {resultado.inhabilesAplicados.map((d, i) => (
                    <li key={`${d.fecha}-${i}`} className="text-xs leading-relaxed">
                      <span className="font-mono text-tenue">{d.fecha}</span>{' '}
                      <span className="text-texto">{d.motivo}</span>
                      <span className="text-tenue">. {d.fundamento}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </Seccion>
      ) : null}

      <Seccion titulo="Fuentes">
        <ul className="space-y-3">
          {resultado.fuentes.map((f, i) => (
            <li key={`${f.ordenamiento}-${f.articulo}-${i}`} className="rounded-xl border border-borde bg-superficie-2/50 px-4 py-3">
              <CitaFundamento fundamento={f} />
            </li>
          ))}
        </ul>
      </Seccion>
    </article>
  );
}
