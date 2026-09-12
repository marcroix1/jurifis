import { Aviso } from '@/componentes/Aviso';
import { Insignia } from '@/componentes/Insignia';

import { CitaFuente, CitaTrazaCredito } from './CitaFuente';
import { SelloEstimacion } from './SelloEstimacion';
import {
  estadoCifra, etiquetaConstancia, etiquetaTipoActo, etiquetaTipoRecargo, fechaLarga, mesLargo,
  pesos,
} from './formato-credito';
import type { AnalisisExtincion, BloqueExtincion, EstimacionCredito } from './tipos-credito';

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-borde pt-6">
      <h3 className="text-xs font-semibold tracking-[0.14em] text-tenue uppercase">{titulo}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Renglon({
  concepto,
  importe,
  nota,
  signo,
  destacado,
}: {
  concepto: string;
  importe: number | null;
  nota?: string;
  signo?: '+' | '-';
  destacado?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 ${
        destacado === true ? 'border-t-2 border-borde-fuerte' : 'border-t border-borde'
      }`}
    >
      <div className="min-w-0">
        <p className={`text-sm ${destacado === true ? 'font-semibold text-texto' : 'text-texto'}`}>
          {signo !== undefined ? <span className="mr-1 font-mono text-tenue">{signo}</span> : null}
          {concepto}
        </p>
        {nota !== undefined ? <p className="mt-0.5 text-xs leading-relaxed text-tenue">{nota}</p> : null}
      </div>
      {importe === null ? (
        <span className="shrink-0 rounded-md border border-alto/35 bg-alto-tenue px-2 py-0.5 text-xs font-semibold text-alto">
          Sin cifra
        </span>
      ) : (
        <span
          className={`shrink-0 font-mono tabular-nums ${
            destacado === true ? 'text-xl font-semibold text-texto' : 'text-sm text-texto'
          }`}
        >
          {pesos(importe)}
        </span>
      )}
    </div>
  );
}

function BloqueExtincionVista({ bloque }: { bloque: BloqueExtincion }) {
  const titulo = bloque.figura === 'prescripcion' ? 'Prescripción del crédito' : 'Caducidad de las facultades';
  return (
    <div className="rounded-xl border border-borde bg-superficie-2/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-texto">{titulo}</p>
        <Insignia tono="aviso">Requiere verificación</Insignia>
        <Insignia>{bloque.plazoAnios} años</Insignia>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-tenue">Tiempo corrido, dato informativo</dt>
          <dd className="text-sm text-texto">
            {bloque.diasNaturalesCorridos === null
              ? 'No se midió, falta la fecha de inicio'
              : `${bloque.diasNaturalesCorridos} días naturales, cerca de ${bloque.aniosNaturalesCorridos} años`}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-tenue">Fecha de referencia sin interrupciones</dt>
          <dd className="text-sm text-texto">
            {bloque.fechaDeReferenciaSinInterrupciones === null
              ? 'No aplica'
              : fechaLarga(bloque.fechaDeReferenciaSinInterrupciones)}
          </dd>
        </div>
      </dl>

      {bloque.actosConEfectoPosible.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold tracking-[0.1em] text-marca uppercase">
            Actos registrados que podrían interrumpir o suspender el plazo
          </p>
          <ul className="mt-3 space-y-3">
            {bloque.actosConEfectoPosible.map((a, i) => (
              <li key={`${a.acto.tipo}-${a.acto.fecha}-${i}`} className="rounded-lg border border-borde bg-superficie px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia tono={a.efectoPosible === 'interrupcion' ? 'alto' : 'aviso'}>
                    {a.efectoPosible === 'interrupcion' ? 'Posible interrupción' : 'Posible suspensión'}
                  </Insignia>
                  <span className="font-mono text-xs text-tenue">{a.acto.fecha}</span>
                  <span className="text-sm text-texto">{etiquetaTipoActo(a.acto.tipo)}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-texto">{a.acto.descripcion}</p>
                <p className="mt-1 text-xs leading-relaxed text-tenue">{a.porQue}</p>
                <p className="mt-1 text-xs text-tenue">
                  Notificación al deudor: {etiquetaConstancia(a.acto.notificadoAlDeudor)}
                  {a.acto.constaEn !== undefined ? `. Consta en ${a.acto.constaEn}` : ''}
                </p>
                <ul className="mt-2 space-y-1">
                  {a.requiereVerificar.map((v) => (
                    <li key={v} className="flex gap-2 text-xs leading-relaxed text-texto">
                      <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-aviso" />
                      {v}
                    </li>
                  ))}
                </ul>
                <div className="mt-2">
                  <CitaFuente fundamento={a.fundamento} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-tenue">
          Ninguno de los actos capturados encaja en los supuestos de esta figura. Que no aparezcan
          aquí no significa que no existan: significa que no se capturaron.
        </p>
      )}

      <div className="mt-5">
        <p className="text-xs font-semibold tracking-[0.1em] text-marca uppercase">
          Lo que hay que verificar antes de concluir nada
        </p>
        <ul className="mt-2 space-y-1.5">
          {bloque.requiereVerificar.map((v) => (
            <li key={v} className="flex gap-2.5 text-sm leading-relaxed text-texto">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alto" />
              {v}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 space-y-2">
        {bloque.advertencias.map((a) => (
          <p key={a} className="text-xs leading-relaxed text-tenue">
            {a}
          </p>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {bloque.fuentes.map((f, i) => (
          <li key={`${f.articulo}-${f.parrafo ?? ''}-${i}`}>
            <CitaFuente fundamento={f} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Extincion({ analisis }: { analisis: AnalisisExtincion }) {
  return (
    <Seccion titulo="Prescripción y caducidad">
      <Aviso tono="alto" titulo="El análisis no concluye, y no puede concluir">
        <p>
          El transcurso de cinco años no extingue el crédito por sí solo. Esta pantalla no dice si
          prescribió: dice qué actos del expediente hay que verificar porque pudieron interrumpir o
          suspender el plazo.
        </p>
      </Aviso>
      <div className="mt-4 space-y-4">
        <BloqueExtincionVista bloque={analisis.prescripcion} />
        <BloqueExtincionVista bloque={analisis.caducidad} />
      </div>
      {analisis.actosSinEfectoAtribuido.length > 0 ? (
        <div className="mt-4 rounded-xl border border-borde bg-superficie-2/40 px-4 py-3">
          <p className="text-xs font-semibold text-tenue">
            Actos capturados a los que el motor no atribuye efecto sobre estas figuras
          </p>
          <ul className="mt-2 space-y-1">
            {analisis.actosSinEfectoAtribuido.map((a, i) => (
              <li key={`${a.tipo}-${a.fecha}-${i}`} className="text-xs leading-relaxed text-texto">
                <span className="font-mono text-tenue">{a.fecha}</span> {etiquetaTipoActo(a.tipo)}.{' '}
                {a.descripcion}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mt-4 space-y-2">
        {analisis.advertencias.map((a) => (
          <p key={a} className="text-sm leading-relaxed text-tenue">
            {a}
          </p>
        ))}
      </div>
    </Seccion>
  );
}

export function ResultadoCredito({ resultado }: { resultado: EstimacionCredito }) {
  const estado = estadoCifra(resultado.confianza);
  const d = resultado.desglose;
  const detalle = resultado.detalle;
  // Regla dura de producto: sin cifra en pantalla cuando el motor no la sostiene.
  const conCifra = estado.muestraCifra && d.saldo !== null;

  return (
    <article className="space-y-6 rounded-2xl border border-borde bg-superficie p-6 shadow-tarjeta sm:p-8">
      <SelloEstimacion leyenda={resultado.leyenda} />

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Insignia tono={estado.tono}>{estado.titulo}</Insignia>
          <Insignia>{etiquetaTipoRecargo(detalle.tipoRecargo)}</Insignia>
          <Insignia>Ejercicio {resultado.entrada.ejercicio}</Insignia>
        </div>
        <p className="text-sm leading-relaxed text-tenue">{estado.resumen}</p>
      </header>

      {!conCifra ? (
        <div className="rounded-xl border border-alto/30 bg-alto-tenue p-5 sm:p-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-alto uppercase">
            Sin cifra en pantalla
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-texto">
            El motor no llegó a una cifra que pueda sostener, así que esta pantalla no muestra
            ninguna actualización, ningún recargo y ningún saldo. Esto es lo que falta.
          </p>
          <ul className="mt-4 space-y-2">
            {resultado.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-alto" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Seccion titulo="Desglose">
        <div>
          <Renglon
            concepto="Principal, importe original del crédito"
            importe={d.principal}
            nota={`${resultado.entrada.concepto}. Exigible desde el ${fechaLarga(resultado.entrada.fechaExigibilidad)}.`}
          />
          <Renglon
            concepto="Actualización"
            importe={conCifra ? d.actualizacion : null}
            signo="+"
            nota={
              detalle.factor === null
                ? 'Factor de precios del artículo 17-A del Código Fiscal de la Federación.'
                : `Índice de ${mesLargo(detalle.factor.mesAnteriorAlMasReciente)} entre índice de ${mesLargo(detalle.factor.mesAnteriorAlMasAntiguo)}.`
            }
          />
          <Renglon
            concepto="Recargos"
            importe={conCifra ? d.recargos : null}
            signo="+"
            nota={
              detalle.periodoRecargos === null
                ? 'Artículo 21 del Código Fiscal de la Federación, mes a mes.'
                : `${detalle.periodoRecargos.meses.length} meses o fracciones, tasa acumulada ${detalle.periodoRecargos.tasaAcumulada.toFixed(2)} por ciento.`
            }
          />
          <Renglon
            concepto="Multas"
            importe={d.multas}
            signo="+"
            nota="Las multas no generan recargos: el segundo párrafo del artículo 21 las excluye de la base."
          />
          <Renglon concepto="Pagos" importe={d.pagos} signo="-" />
          <Renglon
            concepto="Saldo estimado"
            importe={conCifra ? d.saldo : null}
            destacado
            nota={`Al ${fechaLarga(resultado.entrada.fechaCalculo)}.`}
          />
        </div>
      </Seccion>

      {conCifra && detalle.factor !== null ? (
        <Seccion titulo="Factor de actualización">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-tenue">
                Índice de {mesLargo(detalle.factor.mesAnteriorAlMasReciente)}
              </dt>
              <dd className="font-mono text-sm text-texto">{detalle.factor.indiceReciente.valor}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">
                Índice de {mesLargo(detalle.factor.mesAnteriorAlMasAntiguo)}
              </dt>
              <dd className="font-mono text-sm text-texto">{detalle.factor.indiceAntiguo.valor}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Factor, sin redondear</dt>
              <dd className="font-mono text-sm break-all text-marca">{detalle.factor.factor}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Principal actualizado</dt>
              <dd className="font-mono text-sm text-texto">{pesos(detalle.principalActualizado)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs leading-relaxed text-tenue">{detalle.factor.indiceReciente.fuente}</p>
        </Seccion>
      ) : null}

      {conCifra && detalle.periodoRecargos !== null ? (
        <Seccion titulo={`Recargos mes a mes, ${detalle.periodoRecargos.meses.length}`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-borde text-left text-xs text-tenue">
                  <th className="py-2 pr-3 font-medium">Mes</th>
                  <th className="py-2 pr-3 font-medium">Del</th>
                  <th className="py-2 pr-3 font-medium">Al</th>
                  <th className="py-2 pr-3 font-medium">Ejercicio</th>
                  <th className="py-2 font-medium">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {detalle.periodoRecargos.meses.map((m) => (
                  <tr key={m.numero} className="border-b border-borde/60">
                    <td className="py-2 pr-3 font-mono text-xs text-tenue">{m.numero}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-texto">{m.desde}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-texto">{m.hasta}</td>
                    <td className="py-2 pr-3 text-xs text-texto">{m.ejercicio}</td>
                    <td className="py-2 font-mono text-xs text-texto">{m.tasa.toFixed(2)} por ciento</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detalle.periodoRecargos.mesesFueraDelTope > 0 ? (
            <p className="mt-3 text-xs leading-relaxed text-alto">
              Quedaron fuera {detalle.periodoRecargos.mesesFueraDelTope} meses por el tope de cinco
              años del segundo párrafo del artículo 21.
            </p>
          ) : null}
        </Seccion>
      ) : null}

      {conCifra && detalle.imputacion !== null ? (
        <Seccion titulo="Aplicación de los pagos">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-tenue">A recargos</dt>
              <dd className="font-mono text-sm text-texto">{pesos(detalle.imputacion.aRecargos)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">A multas</dt>
              <dd className="font-mono text-sm text-texto">{pesos(detalle.imputacion.aMultas)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Al principal actualizado</dt>
              <dd className="font-mono text-sm text-texto">
                {pesos(detalle.imputacion.aPrincipalActualizado)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-tenue">Excedente</dt>
              <dd className="font-mono text-sm text-texto">{pesos(detalle.imputacion.excedente)}</dd>
            </div>
          </dl>
          <div className="mt-3">
            <CitaFuente fundamento={detalle.imputacion.fundamento} />
          </div>
        </Seccion>
      ) : null}

      {conCifra && resultado.faltantes.length > 0 ? (
        <Seccion titulo="Lo que falta para subir de confianza">
          <ul className="space-y-2">
            {resultado.faltantes.map((f) => (
              <li key={f} className="flex gap-2.5 text-sm leading-relaxed text-texto">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aviso" />
                {f}
              </li>
            ))}
          </ul>
        </Seccion>
      ) : null}

      <Seccion titulo="Advertencias">
        <Aviso tono={estado.tono === 'ok' ? 'neutro' : estado.tono}>
          <ul className="space-y-2">
            {resultado.advertencias.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Aviso>
      </Seccion>

      <Seccion titulo={`Traza de la estimación, ${resultado.traza.length} pasos`}>
        <ol className="space-y-4">
          {resultado.traza.map((p) => (
            <li key={`${p.paso}-${p.concepto}`} className="flex gap-4">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-borde bg-superficie-2 font-mono text-xs text-tenue">
                {p.paso}
              </span>
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-semibold tracking-[0.1em] text-marca uppercase">
                  {p.concepto}
                </p>
                {p.importe !== undefined ? (
                  <p className="font-mono text-sm font-medium text-texto">{pesos(p.importe)}</p>
                ) : null}
                {p.fecha !== undefined ? (
                  <p className="text-sm font-medium text-texto">
                    {fechaLarga(p.fecha)} <span className="font-mono text-xs text-tenue">{p.fecha}</span>
                  </p>
                ) : null}
                <p className="text-sm leading-relaxed text-tenue">{p.detalle}</p>
                {p.fundamento !== undefined ? <CitaTrazaCredito fundamento={p.fundamento} /> : null}
              </div>
            </li>
          ))}
        </ol>
      </Seccion>

      <Seccion titulo="Fuentes">
        <ul className="space-y-3">
          {resultado.fuentes.map((f, i) => (
            <li
              key={`${f.ordenamiento}-${f.articulo}-${f.parrafo ?? ''}-${i}`}
              className="rounded-xl border border-borde bg-superficie-2/50 px-4 py-3"
            >
              <CitaFuente fundamento={f} />
            </li>
          ))}
        </ul>
      </Seccion>

      {resultado.extincion !== null ? <Extincion analisis={resultado.extincion} /> : null}
    </article>
  );
}
