'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Insignia } from '@/componentes/Insignia';
import { fechaLarga } from '@/lib/formato';
import type { Alerta, EstadoExpediente, Expediente } from '@/lib/almacen-expedientes';

import {
  diasLegibles,
  etiquetaEstado,
  etiquetaUrgencia,
  montoLegible,
  tonoEstado,
  tonoUrgencia,
} from './etiquetas';

export interface RenglonLista {
  expediente: Expediente;
  alertaPrincipal: Alerta | null;
  plazosAbiertos: number;
  plazosSinComputar: number;
}

/**
 * Lista de la cartera con filtro por etapa y por responsable.
 *
 * El orden lo manda la criticidad de la alerta que cada expediente trae, que
 * es la que el motor de alertas ya calculo. La lista no vuelve a decidir que
 * urge: solo respeta el orden.
 */
export function ListaExpedientes({
  renglones,
  responsables,
}: {
  renglones: RenglonLista[];
  responsables: string[];
}) {
  const [estado, setEstado] = useState<string>('todos');
  const [responsable, setResponsable] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');

  const estados = useMemo(() => {
    const vistos = new Set<EstadoExpediente>();
    for (const r of renglones) vistos.add(r.expediente.estado);
    return [...vistos];
  }, [renglones]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLocaleLowerCase('es');
    return renglones
      .filter((r) => estado === 'todos' || r.expediente.estado === estado)
      .filter((r) => responsable === 'todos' || r.expediente.responsable === responsable)
      .filter((r) => {
        if (texto === '') return true;
        const e = r.expediente;
        const campos = [
          e.caratula,
          e.cliente.nombre,
          e.cliente.registroFederalDeContribuyentes ?? '',
          e.numeroExpediente ?? '',
          e.numeroCredito ?? '',
          e.autoridad,
          e.tipoProcedimiento,
        ];
        return campos.some((c) => c.toLocaleLowerCase('es').includes(texto));
      })
      .sort((a, b) => {
        const ca = a.alertaPrincipal?.criticidad ?? -1;
        const cb = b.alertaPrincipal?.criticidad ?? -1;
        if (ca !== cb) return cb - ca;
        return a.expediente.caratula.localeCompare(b.expediente.caratula, 'es');
      });
  }, [renglones, estado, responsable, busqueda]);

  return (
    <div className="space-y-5">
      <form
        className="grid gap-4 rounded-2xl border border-borde bg-superficie p-4 shadow-tarjeta sm:grid-cols-2 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_minmax(0,13rem)]"
        onSubmit={(e) => e.preventDefault()}
      >
        <div>
          <label className="jf-etiqueta" htmlFor="busqueda">
            Buscar
          </label>
          <input
            id="busqueda"
            type="search"
            className="jf-campo"
            placeholder="Carátula, cliente, número o autoridad"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="filtro-estado">
            Etapa
          </label>
          <select
            id="filtro-estado"
            className="jf-campo"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
          >
            <option value="todos">Todas las etapas</option>
            {estados.map((s) => (
              <option key={s} value={s}>
                {etiquetaEstado(s)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="jf-etiqueta" htmlFor="filtro-responsable">
            Responsable
          </label>
          <select
            id="filtro-responsable"
            className="jf-campo"
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
          >
            <option value="todos">Todos los responsables</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p className="text-xs text-tenue">
        {visibles.length} de {renglones.length}{' '}
        {renglones.length === 1 ? 'expediente' : 'expedientes'}
      </p>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde-fuerte bg-superficie/40 p-8 text-center">
          <p className="text-sm font-medium text-texto">Ningún expediente coincide</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-tenue">
            Cambia la etapa, el responsable o el texto de búsqueda.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {visibles.map(({ expediente: e, alertaPrincipal, plazosAbiertos, plazosSinComputar }) => (
            <li key={e.id}>
              <Link
                href={`/expedientes/${e.id}`}
                className="block h-full rounded-2xl border border-borde bg-superficie p-5 shadow-tarjeta transition hover:border-borde-fuerte hover:bg-superficie-2/40"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Insignia tono={tonoEstado(e.estado)}>{etiquetaEstado(e.estado)}</Insignia>
                  {alertaPrincipal !== null && alertaPrincipal.nivel !== 'cumplido' ? (
                    <Insignia tono={tonoUrgencia(alertaPrincipal.nivel)}>
                      {etiquetaUrgencia(alertaPrincipal.nivel)}
                    </Insignia>
                  ) : null}
                  {e.esEjemplo ? <Insignia>Ejemplo</Insignia> : null}
                </div>

                <h3 className="mt-3 text-base leading-snug font-semibold text-texto">
                  {e.caratula}
                </h3>

                <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-tenue">Cliente</dt>
                    <dd className="truncate text-texto">{e.cliente.nombre}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-tenue">Responsable</dt>
                    <dd className="truncate text-texto">{e.responsable}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-tenue">Autoridad</dt>
                    <dd className="truncate text-texto">{e.autoridad}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-tenue">Monto</dt>
                    <dd className="truncate text-texto">{montoLegible(e.monto)}</dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-borde pt-3">
                  {alertaPrincipal === null ? (
                    <p className="text-sm text-tenue">
                      Sin plazos registrados. Agrega una notificación para que el motor compute.
                    </p>
                  ) : alertaPrincipal.vence === null ? (
                    <p className="text-sm leading-relaxed text-alto">
                      Este expediente tiene un plazo que no se puede computar. Ábrelo para ver qué
                      falta.
                    </p>
                  ) : (
                    <p className="text-sm text-texto">
                      Vence el {fechaLarga(alertaPrincipal.vence)}.{' '}
                      <span className="text-tenue">
                        {diasLegibles(alertaPrincipal.diasHabilesRestantes)}.
                      </span>
                    </p>
                  )}
                  <p className="mt-1.5 text-xs text-tenue">
                    {plazosAbiertos} {plazosAbiertos === 1 ? 'plazo abierto' : 'plazos abiertos'}
                    {plazosSinComputar > 0 ? `, ${plazosSinComputar} sin poder computarse` : ''}
                    {e.numeroExpediente !== null ? ` · ${e.numeroExpediente}` : ''}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
