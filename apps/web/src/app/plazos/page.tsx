import type { Metadata } from 'next';

import { CalculadoraPlazos } from '@/componentes/plazos/CalculadoraPlazos';
import { reglasResumidas } from '@/lib/corpus';

export const metadata: Metadata = {
  title: 'Calculadora de plazos',
  description:
    'Cómputo de plazos con traza paso a paso, días inhábiles descartados, fuentes y estado de confianza.',
};

export default function PaginaPlazos() {
  const reglas = reglasResumidas();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">HERRAMIENTA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          Calculadora de plazos
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Elige la regla cargada en el corpus, la fecha de la notificación y la forma en que se
          practicó. El resultado llega con la traza de cada paso, los días inhábiles que se
          descartaron y las fuentes con su artículo y su archivo de origen.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Cuando el motor no puede sostener una fecha, esta pantalla no la muestra: en su lugar
          aparece lo que falta para completar el cómputo.
        </p>
      </header>

      <div className="mt-10">
        <CalculadoraPlazos reglas={reglas} />
      </div>
    </div>
  );
}
