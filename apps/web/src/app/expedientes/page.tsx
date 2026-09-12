import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@/componentes/Aviso';
import { ListaExpedientes } from '@/componentes/expedientes/ListaExpedientes';
import { PanelAlertas } from '@/componentes/expedientes/PanelAlertas';
import { PERSISTENCIA_EXPEDIENTES, vistaDeCartera } from '@/lib/almacen-expedientes';
import { fechaLarga } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Expedientes',
  description:
    'Cartera de expedientes con línea de tiempo, plazos computados por el motor y alertas ordenadas por urgencia.',
};

export default function PaginaExpedientes() {
  const vista = vistaDeCartera();
  const sinComputar = vista.alertas.filter((a) => a.nivel === 'no_computable').length;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">CARTERA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          Expedientes
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Cada expediente lleva su línea de tiempo, sus plazos con la traza de cómo se calcularon y
          su nivel de fuente. La urgencia sale de los días hábiles que el motor de plazos cuenta, no
          de una cuenta aparte.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Fecha de referencia de este tablero: {fechaLarga(vista.hoy)}.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/expedientes/nuevo"
          className="rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-marca-viva"
        >
          Dar de alta un expediente
        </Link>
        <Link
          href="/plazos"
          className="rounded-xl border border-borde-fuerte px-4 py-2.5 text-sm font-medium text-texto transition hover:border-marca hover:text-marca"
        >
          Calculadora de plazos
        </Link>
      </div>

      <div className="mt-8 space-y-5">
        <Aviso tono="aviso" titulo={PERSISTENCIA_EXPEDIENTES.titulo}>
          {PERSISTENCIA_EXPEDIENTES.detalle}
        </Aviso>

        {sinComputar > 0 ? (
          <Aviso tono="alto" titulo="Hay plazos que no se pueden computar">
            {sinComputar === 1
              ? 'Un plazo de la cartera no se puede computar con lo que hay cargado, así que no se muestra ninguna fecha para él. Va hasta arriba de los vencimientos: un plazo que nadie puede calcular es más peligroso que uno que sí.'
              : `${sinComputar} plazos de la cartera no se pueden computar con lo que hay cargado, así que no se muestra ninguna fecha para ellos. Van hasta arriba de los vencimientos: un plazo que nadie puede calcular es más peligroso que uno que sí.`}
          </Aviso>
        ) : null}
      </div>

      <div className="mt-8">
        <PanelAlertas alertas={vista.alertas} />
      </div>

      <div className="mt-10">
        <h2 className="text-base font-semibold text-texto">Todos los expedientes</h2>
        <div className="mt-4">
          <ListaExpedientes renglones={vista.renglones} responsables={vista.responsables} />
        </div>
      </div>
    </div>
  );
}
