import type { Metadata } from 'next';

import { revisarTextos } from '@jurifis/core';

import { Cuestionario } from '@/componentes/diagnostico/Cuestionario';
import { ETIQUETAS_URGENCIA } from '@/componentes/diagnostico/formato';
import { COPIA } from '@/componentes/diagnostico/textos';

export const metadata: Metadata = {
  title: '¿Puedo impugnar?',
  description:
    'Cuestionario preliminar guiado que devuelve posibles vías por revisar, plazos que deben verificarse, documentos, información faltante y líneas de análisis.',
};

/**
 * El guardian de lenguaje del motor tambien corre sobre la copia de esta interfaz.
 * Si un rotulo de pantalla llegara a leerse como promesa de resultado, la pagina
 * falla aqui, al cargarse, en vez de publicarlo.
 */
revisarTextos(COPIA, 'copia de la interfaz del cuestionario');
revisarTextos(ETIQUETAS_URGENCIA, 'etiquetas de urgencia del cuestionario');

export default function PaginaDiagnostico() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">{COPIA.ojo}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          {COPIA.titulo}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">{COPIA.entrada}</p>
        <p className="mt-3 text-sm leading-relaxed text-tenue">{COPIA.entradaSegunda}</p>
      </header>

      <div className="mt-8 sm:mt-10">
        <Cuestionario />
      </div>
    </div>
  );
}
