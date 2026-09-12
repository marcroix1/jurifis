import type { Metadata } from 'next';
import Link from 'next/link';

import { Aviso } from '@/componentes/Aviso';
import { FormularioExpediente } from '@/componentes/expedientes/FormularioExpediente';
import { PERSISTENCIA_EXPEDIENTES, fechaDeHoy } from '@/lib/almacen-expedientes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Alta de expediente',
  description: 'Alta de un expediente en la cartera, con cliente, autoridad, procedimiento y responsable.',
};

export default function PaginaNuevoExpediente() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-marca">CARTERA</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-texto sm:text-4xl">
          Alta de expediente
        </h1>
        <p className="mt-4 text-base leading-relaxed text-tenue">
          Los datos del asunto. Los plazos vienen después: nacen de las notificaciones que registres
          en la línea de tiempo.
        </p>
      </header>

      <div className="mt-8">
        <Aviso tono="aviso" titulo={PERSISTENCIA_EXPEDIENTES.titulo}>
          {PERSISTENCIA_EXPEDIENTES.detalle}
        </Aviso>
      </div>

      <div className="mt-6">
        <FormularioExpediente hoy={fechaDeHoy()} />
      </div>

      <p className="mt-6 text-sm text-tenue">
        <Link href="/expedientes" className="text-marca underline-offset-4 hover:underline">
          Volver a la cartera
        </Link>
      </p>
    </div>
  );
}
