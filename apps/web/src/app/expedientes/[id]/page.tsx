import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import { CambioDeEstado } from '@/componentes/expedientes/CambioDeEstado';
import { DocumentosExpediente } from '@/componentes/expedientes/DocumentosExpediente';
import { FormularioEvento } from '@/componentes/expedientes/FormularioEvento';
import { LineaTiempo } from '@/componentes/expedientes/LineaTiempo';
import { PanelAlertas } from '@/componentes/expedientes/PanelAlertas';
import { PlazosExpediente } from '@/componentes/expedientes/PlazosExpediente';
import { etiquetaEstado, montoLegible, tonoEstado } from '@/componentes/expedientes/etiquetas';
import { PERSISTENCIA_EXPEDIENTES, vistaDeExpediente } from '@/lib/almacen-expedientes';
import { reglasResumidas } from '@/lib/corpus';
import { fechaLarga } from '@/lib/formato';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vista = vistaDeExpediente(id);
  return {
    title: vista === null ? 'Expediente' : vista.expediente.caratula,
    description:
      'Expediente con línea de tiempo, plazos computados con su traza, documentos y etapa procesal.',
  };
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-tenue">{etiqueta}</dt>
      <dd className="text-sm break-words text-texto">{valor}</dd>
    </div>
  );
}

function Seccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-borde pt-8">
      <h2 className="text-lg font-semibold tracking-tight text-texto">{titulo}</h2>
      {descripcion !== undefined ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-tenue">{descripcion}</p>
      ) : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function PaginaExpediente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vista = vistaDeExpediente(id);
  if (vista === null) notFound();

  const { expediente: e, plazos, linea, alertas, fechas, transicionesPosibles, hoy } = vista;
  const reglas = reglasResumidas();
  const vivas = alertas.filter((a) => a.nivel !== 'cumplido');

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="text-sm">
        <Link href="/expedientes" className="text-marca underline-offset-4 hover:underline">
          Cartera de expedientes
        </Link>
      </p>

      <header className="mt-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tono={tonoEstado(e.estado)}>{etiquetaEstado(e.estado)}</Insignia>
          {e.esEjemplo ? <Insignia>Dato de ejemplo</Insignia> : null}
          {e.numeroExpediente !== null ? <Insignia>{e.numeroExpediente}</Insignia> : null}
        </div>
        <h1 className="mt-4 text-2xl leading-tight font-semibold tracking-tight text-texto sm:text-3xl">
          {e.caratula}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-tenue">
          Fecha de referencia de esta pantalla: {fechaLarga(hoy)}.
        </p>
      </header>

      <div className="mt-6 space-y-5">
        {e.esEjemplo ? (
          <Aviso tono="aviso" titulo="Expediente de demostración">
            Este expediente es un ejemplo inventado para probar la pantalla. El cliente, el número
            de crédito y el monto no corresponden a ningún asunto real.
          </Aviso>
        ) : null}
        <Aviso tono="neutro" titulo={PERSISTENCIA_EXPEDIENTES.titulo}>
          {PERSISTENCIA_EXPEDIENTES.detalle}
        </Aviso>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] lg:items-start">
        <div className="min-w-0 space-y-8">
          <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
            <h2 className="text-base font-semibold text-texto">Datos del asunto</h2>
            <dl className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <Dato etiqueta="Cliente" valor={e.cliente.nombre} />
              <Dato
                etiqueta="Registro federal de contribuyentes"
                valor={e.cliente.registroFederalDeContribuyentes ?? 'No aplica o no capturado'}
              />
              <Dato etiqueta="Autoridad" valor={e.autoridad} />
              <Dato etiqueta="Tipo de procedimiento" valor={e.tipoProcedimiento} />
              <Dato etiqueta="Número de expediente" valor={e.numeroExpediente ?? 'Sin asignar'} />
              <Dato etiqueta="Número de crédito" valor={e.numeroCredito ?? 'Sin número de crédito'} />
              <Dato
                etiqueta="Ejercicio revisado"
                valor={e.ejercicio === null ? 'No capturado' : String(e.ejercicio)}
              />
              <Dato etiqueta="Monto" valor={montoLegible(e.monto)} />
              <Dato etiqueta="Responsable" valor={e.responsable} />
              <Dato etiqueta="Apertura" valor={fechaLarga(e.abiertoEn)} />
              {e.cerradoEn !== null ? (
                <Dato etiqueta="Cierre" valor={fechaLarga(e.cerradoEn)} />
              ) : null}
            </dl>
          </section>

          <Seccion
            titulo="Línea de tiempo"
            descripcion="Cada actuación en orden cronológico, con lo que le hizo a los plazos del expediente."
          >
            <LineaTiempo renglones={linea} />
          </Seccion>

          <Seccion
            titulo="Plazos"
            descripcion="El cómputo íntegro del motor: traza paso a paso, nivel de fuente de la regla y de sus calendarios, días inhábiles descartados y fuentes."
          >
            <PlazosExpediente plazos={plazos} reglas={reglas} />
          </Seccion>

          <Seccion titulo="Documentos">
            <DocumentosExpediente documentos={e.documentos} />
          </Seccion>

          <Seccion titulo="Registrar una actuación">
            <FormularioEvento expedienteId={e.id} reglas={reglas} plazos={plazos} hoy={hoy} />
          </Seccion>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24">
          <PanelAlertas alertas={vivas} conEnlace={false} titulo="Alertas del expediente" />

          <CambioDeEstado
            expedienteId={e.id}
            estadoActual={e.estado}
            posibles={transicionesPosibles}
            hoy={hoy}
          />

          <section className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
            <h3 className="text-base font-semibold text-texto">Fechas importantes</h3>
            {fechas.length === 0 ? (
              <p className="mt-2 text-sm text-tenue">Todavía no hay fechas registradas.</p>
            ) : (
              <ul className="mt-3.5 space-y-3">
                {fechas.map((f, i) => (
                  <li key={`${f.fecha}-${f.etiqueta}-${i}`} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-marca">{f.fecha}</span>
                    <span className="min-w-0 text-sm leading-snug text-texto">{f.etiqueta}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs leading-relaxed text-tenue">
              Un plazo que el motor no puede computar no aporta ninguna fecha a esta lista. El
              silencio es el dato.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
