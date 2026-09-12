import type { Metadata } from 'next';

import { BuscadorJurisprudencia } from '@/componentes/jurisprudencia/BuscadorJurisprudencia';
import { EstadoDelAcervo } from '@/componentes/jurisprudencia/EstadoDelAcervo';
import { FichaCriterio } from '@/componentes/jurisprudencia/FichaCriterio';
import { datosDeLaPagina } from '@/componentes/jurisprudencia/datos';

export const metadata: Metadata = {
  title: 'Buscador de criterios',
  description:
    'Búsqueda de jurisprudencia, tesis, precedentes y criterios administrativos sobre un acervo verificado. Cuando no hay criterios cargados, el buscador lo dice.',
};

export default function PaginaJurisprudencia() {
  const { acervo, tipos, etapas } = datosDeLaPagina();

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">HERRAMIENTA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          Buscador de criterios
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Jurisprudencia, tesis aisladas, precedentes, sentencias, criterios administrativos y
          legislación, buscados sobre un acervo donde cada renglón lo revisó una persona contra su
          fuente oficial.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Hoy el acervo está vacío, y esta pantalla lo dice en lugar de rellenarlo. Un buscador
          jurídico que devuelve nada cuando no tiene nada vale más que uno que devuelve algo
          siempre.
        </p>
      </header>

      <div className="mt-10">
        <BuscadorJurisprudencia acervo={acervo} tipos={tipos} />
      </div>

      <div className="mt-12">
        <EstadoDelAcervo acervo={acervo} etapas={etapas} />
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-semibold text-texto">Así se verá cada resultado</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tenue">
          La ficha ya está construida y espera datos. Los huecos dicen qué va en cada uno y de
          dónde saldrá: ninguno se llena con un ejemplo que pudiera confundirse con un criterio
          real.
        </p>
        <div className="mt-5">
          <FichaCriterio criterio={null} />
        </div>
      </section>
    </div>
  );
}
