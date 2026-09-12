import Link from 'next/link';

import { Insignia } from '@/componentes/Insignia';
import { calendariosResumidos, reglasResumidas } from '@/lib/corpus';

const MODULOS = [
  {
    titulo: 'Calcular un plazo',
    descripcion:
      'Cómputo con la traza completa de cómo se obtuvo la fecha, los días inhábiles descartados y el fundamento de cada paso.',
    href: '/plazos',
    disponible: true,
  },
  {
    titulo: '¿Puedo impugnar?',
    descripcion:
      'Ruta guiada para ubicar la vía y los tiempos de un acto de autoridad. Por ahora recibe los datos de contacto.',
    href: '/diagnostico',
    disponible: true,
  },
  {
    titulo: 'Buscar jurisprudencia',
    descripcion:
      'Consulta de criterios publicados, con su clave y sus datos de localización. Entra en una siguiente entrega.',
    href: null,
    disponible: false,
  },
  {
    titulo: 'Calcular crédito fiscal',
    descripcion:
      'Cálculo de los accesorios de un crédito fiscal con la memoria del cálculo. Entra en una siguiente entrega.',
    href: null,
    disponible: false,
  },
];

const AUDIENCIAS = [
  {
    titulo: 'Para abogados',
    descripcion:
      'Cómputo verificable paso a paso, con el artículo, la publicación y el archivo del acervo donde se leyó cada regla, para revisarlo antes de presentar.',
  },
  {
    titulo: 'Para empresas',
    descripcion:
      'Visibilidad de los tiempos que corren tras un acto de autoridad, para coordinar al área jurídica, a la contable y a la dirección con la misma información.',
  },
  {
    titulo: 'Para contribuyentes',
    descripcion:
      'Lenguaje claro sobre qué se notificó, desde cuándo corre el tiempo y qué información hace falta para tener una respuesta confiable.',
  },
];

export default function Inicio() {
  const reglas = reglasResumidas();
  const calendarios = calendariosResumidos();

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <section className="pt-16 pb-14 sm:pt-24 sm:pb-20">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">
          NOVA LEGAL, S.C.
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-[-0.03em] text-texto sm:text-7xl">
          JURIFIS
        </h1>
        <p className="mt-6 max-w-2xl text-xl leading-snug text-texto sm:text-2xl">
          Inteligencia y herramientas jurídicas para la defensa fiscal y administrativa.
        </p>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-tenue">
          El derecho vive aquí como dato verificado, no como texto suelto. Cada resultado llega con
          su fundamento, su fuente y su nivel de confianza. Cuando falta la fuente o el calendario,
          la herramienta lo dice en lugar de estimar.
        </p>
        <p className="mt-6 text-sm text-tenue">
          <span className="font-medium text-texto">{reglas.length}</span> reglas de plazo y{' '}
          <span className="font-medium text-texto">{calendarios.length}</span> calendarios de días
          inhábiles cargados en el corpus.
        </p>
      </section>

      <section aria-labelledby="modulos" className="pb-8">
        <h2 id="modulos" className="sr-only">
          Herramientas
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MODULOS.map((m) =>
            m.disponible && m.href !== null ? (
              <Link
                key={m.titulo}
                href={m.href}
                className="group flex flex-col justify-between gap-6 rounded-2xl border border-borde bg-superficie p-6 shadow-tarjeta transition duration-200 hover:-translate-y-0.5 hover:border-marca sm:p-7"
              >
                <div className="space-y-2.5">
                  <h3 className="text-lg font-semibold text-texto">{m.titulo}</h3>
                  <p className="text-sm leading-relaxed text-tenue">{m.descripcion}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-marca">
                  Abrir
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
                  </svg>
                </span>
              </Link>
            ) : (
              <div
                key={m.titulo}
                aria-disabled="true"
                className="flex flex-col justify-between gap-6 rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-6 sm:p-7"
              >
                <div className="space-y-2.5">
                  <h3 className="text-lg font-semibold text-tenue">{m.titulo}</h3>
                  <p className="text-sm leading-relaxed text-tenue">{m.descripcion}</p>
                </div>
                <span>
                  <Insignia>Próximamente</Insignia>
                </span>
              </div>
            ),
          )}
        </div>
      </section>

      <section aria-labelledby="audiencias" className="py-16 sm:py-20">
        <h2 id="audiencias" className="text-2xl font-semibold tracking-tight text-texto">
          Quién lo usa
        </h2>
        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {AUDIENCIAS.map((a) => (
            <div key={a.titulo} className="border-t border-borde pt-5">
              <h3 className="text-base font-semibold text-marca">{a.titulo}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-tenue">{a.descripcion}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
