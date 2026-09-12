import { jurisprudencia } from '@jurifis/core';

export const metadata = { title: 'Buscador jurídico | JURIFIS' };
export const dynamic = 'force-dynamic';

export default async function Pagina({
  searchParams,
}: { searchParams: Promise<{ q?: string; registro?: string }> }) {
  const sp = await searchParams;
  const consulta = (sp.q ?? '').trim();
  const registro = (sp.registro ?? '').trim();
  const estado = jurisprudencia.estadoAcervo();
  const resultado =
    consulta !== '' || registro !== ''
      ? jurisprudencia.buscarCriterios(registro !== '' ? { registroDigital: registro } : { texto: consulta })
      : null;

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-acento">Herramienta</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Buscador jurídico</h1>
      <p className="mt-4 max-w-2xl text-tenue">
        Busca por lenguaje natural o por registro digital en el acervo de criterios del despacho.
        El buscador solo responde con lo que está cargado y verificado.
      </p>

      <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]" action="/jurisprudencia">
        <input
          name="q" defaultValue={consulta}
          placeholder="prescripción de crédito fiscal cuando existió embargo de cuentas bancarias"
          className="w-full rounded-lg border border-borde bg-superficie px-4 py-3 text-sm outline-none focus:border-acento"
        />
        <button type="submit" className="rounded-lg bg-acento px-5 py-3 text-sm font-semibold text-white">
          Buscar
        </button>
      </form>

      <section className="mt-10 rounded-xl border border-borde bg-superficie p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider">Estado del acervo</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wider text-tenue">Criterios cargados</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{estado.criteriosCargados}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-tenue">Verificados y citables</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">{estado.criteriosVerificados}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-tenue">Orígenes declarados</dt>
            <dd className="mt-1 text-2xl font-bold tabular-nums">
              {estado.origenes.length}
            </dd>
          </div>
        </dl>
      </section>

      {resultado !== null && (
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Resultados: {resultado.coincidencias.length}
          </h2>
          {resultado.coincidencias.length === 0 && (
            <div className="mt-4 rounded-xl border-l-4 border-l-acento border border-borde bg-superficie p-6">
              <p className="font-semibold">Cero resultados, y eso es la respuesta correcta.</p>
              <p className="mt-3 text-sm text-tenue">
                El acervo no tiene ningún criterio verificado todavía. Este buscador no completa con
                criterios recordados ni generados: si no está cargado y revisado por una persona, no
                existe. Una cita inventada en un escrito es el único error del que un despacho no se
                recupera.
              </p>
              <p className="mt-3 text-sm text-tenue">
                Los criterios entrarán de la Suprema Corte de Justicia de la Nación, del Semanario
                Judicial de la Federación y del Tribunal Federal de Justicia Administrativa, y cada
                uno pasará por las cuatro etapas de ingesta, incluida la revisión humana.
              </p>
            </div>
          )}
          <ul className="mt-4 space-y-4">
            {resultado.coincidencias.map((c) => (
              <li key={c.criterio.id} className="rounded-xl border border-borde bg-superficie p-5">
                <p className="text-xs uppercase tracking-wider text-acento">
                  {jurisprudencia.etiquetaTipoCriterio(c.criterio.tipoCriterio)}
                </p>
                <p className="mt-2 font-semibold">{c.criterio.rubro}</p>
                <p className="mt-2 font-mono text-xs text-tenue">
                  Registro digital {c.criterio.registroDigital ?? 'sin registro'} · {c.criterio.organo ?? 'órgano no declarado'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10 rounded-xl border border-borde bg-superficie p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider">Guardián de citas</h2>
        <p className="mt-3 text-sm text-tenue">
          Todo texto que salga del sistema pasa por un guardián que comprueba cada registro digital
          contra el acervo. Si una cita no existe, no la corrige: bloquea la respuesta completa.
          Hoy, con el acervo vacío, eso significa que ninguna cita puede pasar, que es exactamente
          lo que debe ocurrir.
        </p>
      </section>
    </main>
  );
}
