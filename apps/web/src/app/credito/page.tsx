import { credito } from '@jurifis/core';

export const metadata = { title: 'Crédito fiscal | JURIFIS' };
export const dynamic = 'force-dynamic';

function money(c: number | null): string {
  return c === null ? 'sin cifra' : credito.pesos(c);
}

export default async function Pagina({
  searchParams,
}: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const importe = sp.importe ?? '';
  const exigible = sp.exigible ?? '';
  const hasta = sp.hasta ?? '';
  const multa = sp.multa ?? '';
  const pago = sp.pago ?? '';

  let resultado: ReturnType<typeof credito.estimarCredito> | null = null;
  let error: string | null = null;

  if (importe !== '' && exigible !== '' && hasta !== '') {
    try {
      resultado = credito.estimarCredito(
        {
          concepto: sp.concepto ?? 'Contribución omitida',
          ejercicio: Number(exigible.slice(0, 4)),
          importeOriginal: credito.aCentavos(importe),
          fechaExigibilidad: exigible,
          fechaCalculo: hasta,
          ...(multa !== '' ? { multas: [{ concepto: 'Multa', importe: credito.aCentavos(multa) }] } : {}),
          ...(pago !== '' ? { pagos: [{ fecha: hasta, importe: credito.aCentavos(pago), concepto: 'Pago' }] } : {}),
        },
        credito.CORPUS_CREDITO,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : 'Entrada no válida.';
    }
  }

  const campo = 'w-full rounded-lg border border-borde bg-superficie px-3 py-2.5 text-sm outline-none focus:border-acento';
  const etiqueta = 'block text-xs font-semibold uppercase tracking-wider text-tenue';

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-acento">Herramienta</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Crédito fiscal</h1>
      <p className="mt-4 max-w-2xl text-tenue">
        Estimación de actualización, recargos y saldo. Nunca es una determinación oficial, y el
        sistema lo declara en el propio resultado, no solo en la pantalla.
      </p>

      <form className="mt-8 grid gap-4 sm:grid-cols-3" action="/credito">
        <div className="sm:col-span-3">
          <label className={etiqueta} htmlFor="concepto">Concepto</label>
          <input id="concepto" name="concepto" defaultValue={sp.concepto ?? 'Contribución omitida'} className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="importe">Importe original</label>
          <input id="importe" name="importe" defaultValue={importe} placeholder="1000000.00" className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="exigible">Fecha de exigibilidad</label>
          <input id="exigible" name="exigible" type="date" defaultValue={exigible} className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="hasta">Estimar hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={hasta} className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="multa">Multas</label>
          <input id="multa" name="multa" defaultValue={multa} placeholder="0.00" className={campo} />
        </div>
        <div>
          <label className={etiqueta} htmlFor="pago">Pagos</label>
          <input id="pago" name="pago" defaultValue={pago} placeholder="0.00" className={campo} />
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded-lg bg-acento px-5 py-2.5 text-sm font-semibold text-white">
            Estimar
          </button>
        </div>
      </form>

      {error !== null && (
        <p className="mt-6 rounded-lg border border-borde bg-superficie p-4 text-sm text-tenue">{error}</p>
      )}

      {resultado !== null && (
        <>
          <div className="mt-8 rounded-xl border-l-4 border-l-acento border border-borde bg-superficie p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-acento">{resultado.clase}</p>
            <p className="mt-2 text-sm text-tenue">{resultado.leyenda}</p>
          </div>

          <section className="mt-6 overflow-x-auto rounded-xl border border-borde bg-superficie">
            <table className="w-full text-sm">
              <tbody>
                {([
                  ['Principal', resultado.desglose.principal],
                  ['Actualización', resultado.desglose.actualizacion],
                  ['Recargos', resultado.desglose.recargos],
                  ['Multas', resultado.desglose.multas],
                  ['Pagos', resultado.desglose.pagos === 0 ? 0 : -resultado.desglose.pagos],
                ] as [string, number | null][]).map(([k, v]) => (
                  <tr key={k} className="border-b border-borde">
                    <td className="px-5 py-3">{k}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{money(v)}</td>
                  </tr>
                ))}
                <tr>
                  <td className="px-5 py-4 font-bold">Saldo estimado</td>
                  <td className="px-5 py-4 text-right font-mono text-lg font-bold tabular-nums">
                    {money(resultado.desglose.saldo)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {resultado.faltantes.length > 0 && (
            <section className="mt-6 rounded-xl border border-borde bg-superficie p-5">
              <h2 className="text-sm font-bold uppercase tracking-wider">Sin cifra: qué falta</h2>
              <ul className="mt-3 space-y-2 text-sm text-tenue">
                {resultado.faltantes.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </section>
          )}

          <section className="mt-6 rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider">Traza del cálculo</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {resultado.traza.map((p) => (
                <li key={`${p.paso}-${p.concepto}`} className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="font-mono text-xs text-acento">{p.paso}</span>
                  <span>
                    <span className="font-semibold">{p.concepto}</span>
                    <span className="block text-tenue">{p.detalle}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6 rounded-xl border border-borde bg-superficie p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider">Fuentes</h2>
            <ul className="mt-3 space-y-2 font-mono text-xs text-tenue">
              {resultado.fuentes.map((f, i) => (
                <li key={i}>
                  {f.ordenamiento}, artículo {f.articulo}
                  {f.fraccion !== undefined ? `, fracción ${f.fraccion}` : ''} · {f.archivo}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
