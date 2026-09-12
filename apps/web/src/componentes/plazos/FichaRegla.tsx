import { Insignia } from '@/componentes/Insignia';
import { etiquetaUnidad, nivelFuenteTexto } from '@/lib/formato';
import type { ReglaResumen } from '@/lib/tipos-ui';

import { CitaFundamento } from './CitaFundamento';

/** Lo que el corpus sabe de la regla elegida. Nada de esto se escribe a mano. */
export function FichaRegla({ regla }: { regla: ReglaResumen }) {
  return (
    <div className="space-y-4 rounded-2xl border border-borde bg-superficie-2/60 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Insignia tono={regla.nivelFuente === 'A' ? 'ok' : 'aviso'}>
          Regla: {nivelFuenteTexto(regla.nivelFuente)}
        </Insignia>
        <Insignia>
          {regla.plazo.cantidad} {etiquetaUnidad(regla.plazo.unidad)}
        </Insignia>
        <Insignia>
          <span className="font-mono text-[11px]">{regla.id}</span>
        </Insignia>
      </div>

      <CitaFundamento fundamento={regla.fundamento} />

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-tenue">
        <div>
          <dt className="font-medium text-texto">Vigente desde</dt>
          <dd className="font-mono">{regla.vigenteDesde}</dd>
        </div>
        <div>
          <dt className="font-medium text-texto">Vigente hasta</dt>
          <dd className="font-mono">{regla.vigenteHasta ?? 'sin fecha de término'}</dd>
        </div>
        <div>
          <dt className="font-medium text-texto">Verificado el</dt>
          <dd className="font-mono">{regla.verificadoEl}</dd>
        </div>
        <div>
          <dt className="font-medium text-texto">Prórroga si vence inhábil</dt>
          <dd>{regla.prorrogaSiVenceInhabil ? 'sí' : 'no'}</dd>
        </div>
      </dl>

      {regla.vigenciaDeclaradaPor !== null ? (
        <p className="rounded-lg border border-aviso/30 bg-aviso-tenue px-3 py-2 text-xs leading-relaxed text-texto">
          Vigencia declarada por {regla.vigenciaDeclaradaPor.persona} el{' '}
          {regla.vigenciaDeclaradaPor.fecha}. {regla.vigenciaDeclaradaPor.nota}
        </p>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-texto">Calendarios que exige la regla</p>
        {regla.calendarios.map((c) => (
          <div key={c.id} className="rounded-lg border border-borde bg-superficie px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-tenue">{c.id}</span>
              <Insignia tono={c.nivelFuente === 'A' ? 'ok' : 'aviso'}>
                Nivel {c.nivelFuente}
              </Insignia>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-texto">{c.nombre}</p>
            <p className="mt-1 text-[11px] text-tenue">
              Años cubiertos: {c.aniosCubiertos.join(', ')}. Días inhábiles enumerados:{' '}
              {c.diasEnumerados}.
            </p>
            {c.huecos.map((h) => (
              <p key={h.desde} className="mt-1 text-[11px] leading-relaxed text-alto">
                Hueco declarado del {h.desde} al {h.hasta}. {h.descripcion}
              </p>
            ))}
          </div>
        ))}
        {regla.calendariosFaltantes.map((id) => (
          <p key={id} className="text-[11px] text-alto">
            El corpus no tiene cargado el calendario <span className="font-mono">{id}</span>.
          </p>
        ))}
      </div>
    </div>
  );
}
