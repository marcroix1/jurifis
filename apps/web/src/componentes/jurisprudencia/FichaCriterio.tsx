import { Insignia } from '@/componentes/Insignia';
import { fechaLarga } from '@/lib/formato';

import type { Coincidencia, Criterio } from './datos';
import { etiquetaEstrategia } from './datos';

/**
 * Ficha de un criterio. La misma pieza sirve para dos cosas: mostrar un
 * resultado cuando lo haya, y mostrar la plantilla vacía mientras no lo haya.
 * En modo plantilla cada campo dice qué va a contener y de dónde saldrá, y
 * ningún hueco se rellena con un ejemplo que pudiera confundirse con un
 * criterio real.
 */

const ETIQUETAS_TIPO: Record<string, string> = {
  jurisprudencia: 'Jurisprudencia',
  tesis_aislada: 'Tesis aislada',
  precedente: 'Precedente',
  sentencia: 'Sentencia',
  criterio_administrativo: 'Criterio administrativo',
  legislacion: 'Legislación',
};

interface CampoProps {
  etiqueta: string;
  valor: string | null;
  plantilla: string;
  ancho?: 'normal' | 'ancho';
}

function Campo({ etiqueta, valor, plantilla, ancho = 'normal' }: CampoProps) {
  const hayDato = valor !== null && valor !== '';
  return (
    <div className={ancho === 'ancho' ? 'sm:col-span-2' : undefined}>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-tenue">
        {etiqueta}
      </p>
      {hayDato ? (
        <p className="mt-1 text-sm leading-relaxed text-texto">{valor}</p>
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-tenue/80 italic">{plantilla}</p>
      )}
    </div>
  );
}

export function FichaCriterio({
  criterio,
  coincidencia,
}: {
  criterio: Criterio | null;
  coincidencia?: Coincidencia;
}) {
  const plantilla = criterio === null;

  return (
    <article
      className={`rounded-2xl border bg-superficie p-5 shadow-tarjeta sm:p-6 ${
        plantilla ? 'border-dashed border-borde-fuerte' : 'border-borde'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono={plantilla ? 'neutro' : 'ok'}>
          {criterio === null
            ? 'Tipo de criterio'
            : (ETIQUETAS_TIPO[criterio.tipoCriterio] ?? criterio.tipoCriterio)}
        </Insignia>
        {criterio !== null && criterio.verificado ? (
          <Insignia tono="ok">Revisado por {criterio.revisadoPor}</Insignia>
        ) : null}
        {criterio !== null ? (
          <Insignia tono={criterio.nivelFuente === 'A' ? 'ok' : 'aviso'}>
            {criterio.nivelFuente === 'A' ? 'Nivel A, texto oficial' : 'Nivel B, fuente derivada'}
          </Insignia>
        ) : null}
        {coincidencia !== undefined ? (
          <span className="text-xs text-tenue">
            {coincidencia.por.map((p) => etiquetaEstrategia(p)).join(' y ')}
          </span>
        ) : null}
      </div>

      <h3
        className={`mt-4 text-base font-semibold leading-snug sm:text-lg ${
          plantilla ? 'text-tenue/80 italic' : 'text-texto'
        }`}
      >
        {criterio?.rubro ??
          'Aquí va el rubro, transcrito íntegro tal como lo publica la fuente oficial.'}
      </h3>

      <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-borde pt-5 sm:grid-cols-2">
        <Campo
          etiqueta="Registro digital"
          valor={criterio?.registroDigital ?? null}
          plantilla="Llave de cita. Es lo que el guardián comprueba antes de dejar salir un escrito."
        />
        <Campo
          etiqueta="Clave de control"
          valor={criterio?.claveControl ?? null}
          plantilla="Clave con la que el órgano identifica la tesis o el precedente."
        />
        <Campo
          etiqueta="Órgano"
          valor={criterio?.organo ?? null}
          plantilla="Pleno, Sala o Tribunal que lo emitió, con su nombre desarrollado."
        />
        <Campo
          etiqueta="Época"
          valor={criterio?.epoca ?? null}
          plantilla="Época del Semanario Judicial de la Federación en que se publicó."
        />
        <Campo
          etiqueta="Materia"
          valor={criterio?.materia ?? null}
          plantilla="Materia que declara la publicación oficial."
        />
        <Campo
          etiqueta="Fecha de publicación"
          valor={criterio === null ? null : fechaLarga(criterio.fechaPublicacion)}
          plantilla="Fecha en que se publicó, tal como la trae el documento."
        />
      </dl>

      <div className="mt-5 border-t border-borde pt-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-tenue">
          Texto
        </p>
        {criterio === null ? (
          <p className="mt-2 text-sm leading-relaxed text-tenue/80 italic">
            Aquí va el texto completo del criterio, sin resumir y sin corregir la redacción del
            original. Debajo aparecen los fragmentos donde coincidió la búsqueda.
          </p>
        ) : (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-texto/90">
            {criterio.texto}
          </p>
        )}
        {coincidencia !== undefined && coincidencia.fragmentos.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {coincidencia.fragmentos.map((f) => (
              <li
                key={f}
                className="rounded-lg border border-borde bg-superficie-2 px-3 py-2 text-xs leading-relaxed text-tenue"
              >
                {f}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mt-5 border-t border-borde pt-5">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-tenue">
          Precedentes
        </p>
        {criterio === null || criterio.precedentes === null ? (
          <p className="mt-2 text-sm leading-relaxed text-tenue/80 italic">
            Aquí van los asuntos que integran el criterio, con su número de expediente y su fecha,
            copiados de la publicación oficial.
          </p>
        ) : (
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-texto/90">
            {criterio.precedentes}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-borde pt-4 text-xs text-tenue">
        {criterio === null ? (
          <span>
            Al pie de cada ficha quedará la trazabilidad: origen, documento, fecha de consulta,
            quién revisó, cuándo y con qué versión se publicó.
          </span>
        ) : (
          <>
            <span>Origen: {criterio.origen}</span>
            <span>Documento: {criterio.documento}</span>
            <span>Consultado el {fechaLarga(criterio.consultadoEl)}</span>
            <span>
              Revisión de {criterio.revisadoPor}, {fechaLarga(criterio.revisadoEl)}
            </span>
            <span>Versión {criterio.version}</span>
          </>
        )}
      </div>
    </article>
  );
}
