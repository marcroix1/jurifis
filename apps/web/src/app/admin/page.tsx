import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import { CitaFundamento } from '@/componentes/plazos/CitaFundamento';
import { PERSISTENCIA, listarProspectos } from '@/lib/almacen';
import { calendariosResumidos, reglasResumidas } from '@/lib/corpus';
import { etiquetaForma, etiquetaUnidad, selloLegible } from '@/lib/formato';

export const metadata: Metadata = {
  title: 'Panel',
  description: 'Prospectos recibidos, corpus de reglas y calendarios cargados.',
};

export const dynamic = 'force-dynamic';

const PESTANAS = [
  { clave: 'prospectos', texto: 'Prospectos' },
  { clave: 'reglas', texto: 'Corpus de reglas' },
  { clave: 'calendarios', texto: 'Calendarios cargados' },
] as const;

type Clave = (typeof PESTANAS)[number]['clave'];

function esClave(valor: string | undefined): valor is Clave {
  return PESTANAS.some((p) => p.clave === valor);
}

export default async function PaginaAdmin({
  searchParams,
}: {
  searchParams: Promise<{ pestana?: string }>;
}) {
  const { pestana } = await searchParams;
  const activa: Clave = esClave(pestana) ? pestana : 'prospectos';

  const prospectos = listarProspectos();
  const reglas = reglasResumidas();
  const calendarios = calendariosResumidos();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">INTERNO</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">Panel</h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Lo que hay cargado hoy: los prospectos recibidos en esta instancia, las reglas de plazo del
          corpus y los calendarios de días inhábiles con su nivel de fuente.
        </p>
      </header>

      <div className="mt-8">
        <Aviso tono="aviso" titulo={PERSISTENCIA.titulo}>
          <p>{PERSISTENCIA.detalle}</p>
          <p className="mt-2">
            Las reglas y los calendarios sí son permanentes: se leen del corpus versionado del motor,
            no de una base de datos.
          </p>
        </Aviso>
      </div>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-borde pb-3">
        {PESTANAS.map((p) => {
          const activo = p.clave === activa;
          return (
            <Link
              key={p.clave}
              href={`/admin?pestana=${p.clave}`}
              aria-current={activo ? 'page' : undefined}
              className={
                activo
                  ? 'rounded-lg bg-marca px-3.5 py-2 text-sm font-semibold text-white'
                  : 'rounded-lg px-3.5 py-2 text-sm font-medium text-tenue transition hover:bg-superficie-2 hover:text-texto'
              }
            >
              {p.texto}
              <span className="ml-2 font-mono text-xs opacity-70">
                {p.clave === 'prospectos'
                  ? prospectos.length
                  : p.clave === 'reglas'
                    ? reglas.length
                    : calendarios.length}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-8">
        {activa === 'prospectos' ? (
          prospectos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-10 text-center">
              <p className="text-sm font-medium text-texto">Todavía no hay prospectos</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
                Los que se registren desde la página de diagnóstico aparecen aquí mientras el
                servidor siga en pie.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {prospectos.map((p) => (
                <li
                  key={p.id}
                  className="space-y-3 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-texto">{p.nombre}</span>
                    <Insignia>{p.origen}</Insignia>
                  </div>
                  <dl className="space-y-1 text-sm text-tenue">
                    <div className="flex gap-2">
                      <dt className="font-medium text-texto">Correo</dt>
                      <dd className="min-w-0 break-all">{p.correo}</dd>
                    </div>
                    {p.telefono !== null ? (
                      <div className="flex gap-2">
                        <dt className="font-medium text-texto">Teléfono</dt>
                        <dd>{p.telefono}</dd>
                      </div>
                    ) : null}
                    {p.organizacion !== null ? (
                      <div className="flex gap-2">
                        <dt className="font-medium text-texto">Organización</dt>
                        <dd>{p.organizacion}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {p.situacion !== null ? (
                    <p className="rounded-lg border border-borde bg-superficie-2/60 px-3 py-2 text-sm leading-relaxed text-texto">
                      {p.situacion}
                    </p>
                  ) : null}
                  <p className="font-mono text-[11px] text-tenue">{selloLegible(p.creadoEl)}</p>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {activa === 'reglas' ? (
          <div className="overflow-x-auto rounded-2xl border border-borde bg-superficie shadow-tarjeta">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-borde text-xs tracking-[0.1em] text-tenue uppercase">
                  <th className="px-4 py-3 font-semibold">Regla</th>
                  <th className="px-4 py-3 font-semibold">Plazo</th>
                  <th className="px-4 py-3 font-semibold">Nivel</th>
                  <th className="px-4 py-3 font-semibold">Fundamento</th>
                  <th className="px-4 py-3 font-semibold">Calendarios</th>
                  <th className="px-4 py-3 font-semibold">Formas cargadas</th>
                </tr>
              </thead>
              <tbody>
                {reglas.map((r) => (
                  <tr key={r.id} className="border-b border-borde align-top last:border-0">
                    <td className="px-4 py-4">
                      <p className="font-medium text-texto">{r.descripcion}</p>
                      <p className="mt-1 font-mono text-[11px] text-tenue">{r.id}</p>
                      <p className="mt-1 text-[11px] text-tenue">
                        Vigente desde {r.vigenteDesde}. Verificado el {r.verificadoEl}.
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-texto">
                      {r.plazo.cantidad} {etiquetaUnidad(r.plazo.unidad)}
                    </td>
                    <td className="px-4 py-4">
                      <Insignia tono={r.nivelFuente === 'A' ? 'ok' : 'aviso'}>
                        {r.nivelFuente}
                      </Insignia>
                    </td>
                    <td className="max-w-xs px-4 py-4">
                      <CitaFundamento fundamento={r.fundamento} />
                    </td>
                    <td className="px-4 py-4">
                      <ul className="space-y-1">
                        {r.calendarios.map((c) => (
                          <li key={c.id} className="font-mono text-[11px] text-tenue">
                            {c.id} <span className="text-texto">nivel {c.nivelFuente}</span>
                          </li>
                        ))}
                        {r.calendariosFaltantes.map((id) => (
                          <li key={id} className="font-mono text-[11px] text-alto">
                            {id} sin cargar
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-4">
                      <ul className="space-y-1 text-[11px] text-tenue">
                        {r.formas.map((f) => (
                          <li key={f}>{etiquetaForma(f)}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activa === 'calendarios' ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {calendarios.map((c) => (
              <li
                key={c.id}
                className="space-y-3 rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-tenue">{c.id}</span>
                  <Insignia tono={c.nivelFuente === 'A' ? 'ok' : 'aviso'}>
                    Nivel {c.nivelFuente}
                  </Insignia>
                </div>
                <p className="text-sm font-medium text-texto">{c.nombre}</p>
                <dl className="grid grid-cols-2 gap-2 text-xs text-tenue">
                  <div>
                    <dt className="font-medium text-texto">Años cubiertos</dt>
                    <dd className="font-mono">{c.aniosCubiertos.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-texto">Días enumerados</dt>
                    <dd className="font-mono">{c.diasEnumerados}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-texto">Fines de semana</dt>
                    <dd>{c.finesDeSemanaInhabiles ? 'inhábiles' : 'hábiles'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-texto">Consultado el</dt>
                    <dd className="font-mono">{c.consultadoEl}</dd>
                  </div>
                </dl>
                <p className="text-xs leading-relaxed text-tenue">{c.fuente}</p>
                {c.huecos.map((h) => (
                  <p
                    key={`${h.desde}-${h.hasta}`}
                    className="rounded-lg border border-alto/30 bg-alto-tenue px-3 py-2 text-xs leading-relaxed text-texto"
                  >
                    Hueco declarado del {h.desde} al {h.hasta}. {h.descripcion}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
