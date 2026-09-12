import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';
import { fechaLarga } from '@/lib/formato';

import type { DatosPagina } from './datos';

/**
 * Estado honesto del acervo. Contesta tres preguntas antes de que alguien las
 * haga: cuántos criterios hay, de dónde van a venir y por qué cero resultados
 * no significa que el criterio no exista.
 */
export function EstadoDelAcervo({ acervo, etapas }: Pick<DatosPagina, 'acervo' | 'etapas'>) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta sm:p-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <p className="text-5xl font-semibold tracking-tight text-texto tabular-nums sm:text-6xl">
            {acervo.criteriosCargados}
          </p>
          <div>
            <p className="text-base font-semibold text-texto">
              {acervo.criteriosCargados === 1 ? 'criterio cargado' : 'criterios cargados'}
            </p>
            <p className="text-sm text-tenue">
              {acervo.criteriosVerificados}{' '}
              {acervo.criteriosVerificados === 1 ? 'verificado' : 'verificados'} contra su fuente
              oficial
            </p>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Insignia tono={acervo.vacio ? 'aviso' : 'ok'}>
              {acervo.vacio ? 'Acervo vacío' : 'Acervo con contenido'}
            </Insignia>
            <Insignia tono="neutro">Versión {acervo.version}</Insignia>
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-texto/85">
          {acervo.vacio
            ? 'El acervo está vacío a propósito. Todavía no hay ni un solo criterio verificado, y el buscador prefiere decirlo a completar el hueco con algo que suene bien. Cero resultados significa que no hay nada cargado, no que el criterio no exista.'
            : 'El buscador solo devuelve criterios cargados y verificados contra su fuente oficial.'}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-texto/85">
          Este buscador no redacta criterios, no completa rubros y no sugiere el registro digital
          más parecido. Cualquier escrito que cite un registro que no esté en este acervo queda
          bloqueado antes de salir.
        </p>
        <p className="mt-4 text-xs text-tenue">
          Última actualización del acervo: {fechaLarga(acervo.actualizadoEl)}.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-texto">De dónde vendrán los criterios</h2>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Solo de estos tres orígenes, y siempre con el documento guardado y la fecha en que se
          consultó.
        </p>
        <ul className="mt-4 grid gap-4 sm:grid-cols-3">
          {acervo.origenes.map((o) => (
            <li
              key={o.clave}
              className="rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta"
            >
              <p className="text-sm font-semibold leading-snug text-texto">{o.nombre}</p>
              <p className="mt-2 text-xs leading-relaxed text-tenue">{o.aporta}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-texto">Por dónde tiene que pasar cada uno</h2>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Cuatro etapas, en un solo sentido. La tercera la hace una persona y no se puede saltar.
        </p>
        <ol className="mt-4 space-y-3">
          {etapas.map((e) => (
            <li
              key={e.numero}
              className="flex gap-4 rounded-xl border border-borde bg-superficie p-4 shadow-tarjeta"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-borde-fuerte text-sm font-semibold text-tenue tabular-nums">
                {e.numero}
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-texto">
                  {e.nombre}
                  {e.humana ? <Insignia tono="aviso">La hace una persona</Insignia> : null}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-tenue">{e.descripcion}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {acervo.requisitosDeCarga.length > 0 ? (
        <Aviso tono="aviso" titulo="Lo que falta para cargar el primer criterio">
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {acervo.requisitosDeCarga.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Aviso>
      ) : null}
    </section>
  );
}
