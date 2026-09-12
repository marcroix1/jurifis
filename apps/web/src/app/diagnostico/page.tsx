import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@/componentes/Aviso';
import { FormularioProspecto } from '@/componentes/FormularioProspecto';

export const metadata: Metadata = {
  title: '¿Puedo impugnar?',
  description:
    'Ruta guiada para ubicar la vía y los tiempos frente a un acto de autoridad fiscal o administrativa.',
};

export default function PaginaDiagnostico() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">HERRAMIENTA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          ¿Puedo impugnar?
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Esta herramienta llevará un cuestionario guiado para ubicar la vía y los tiempos que
          corren frente a un acto de autoridad.
        </p>
      </header>

      <div className="mt-8">
        <Aviso tono="aviso" titulo="El cuestionario entra en la siguiente iteración">
          <p>
            El motor de diagnóstico todavía se está construyendo. Mientras tanto, esta página no
            hace preguntas jurídicas ni emite ninguna valoración sobre tu caso: solo recibe tus
            datos de contacto para que el equipo te busque.
          </p>
          <p className="mt-2">
            Si lo que necesitas hoy es el cómputo de un plazo, la{' '}
            <Link href="/plazos" className="font-semibold text-marca underline underline-offset-4">
              calculadora de plazos
            </Link>{' '}
            ya funciona con el corpus verificado.
          </p>
        </Aviso>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-texto">Deja tus datos de contacto</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-tenue">
          Con esto se genera un prospecto en el panel interno de NOVA LEGAL, S.C. No sustituye una
          consulta ni implica que exista una relación profesional.
        </p>
        <div className="mt-6">
          <FormularioProspecto origen="diagnostico" />
        </div>
      </section>
    </div>
  );
}
