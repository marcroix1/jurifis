import { CALENDARIOS, REGLAS } from '@jurifis/core';

import type { CalendarioResumen, ReglaResumen } from './tipos-ui';

/**
 * Lectura del corpus para la interfaz. Aqui no se decide nada de derecho:
 * se reduce el dato que el paquete del motor ya carga y verifica.
 */

function resumirCalendario(cal: (typeof CALENDARIOS)[number]): CalendarioResumen {
  return {
    id: cal.id,
    nombre: cal.nombre,
    nivelFuente: cal.nivelFuente,
    aniosCubiertos: [...cal.aniosCubiertos].sort((a, b) => a - b),
    fuente: cal.fuente,
    consultadoEl: cal.consultadoEl,
    finesDeSemanaInhabiles: cal.finesDeSemanaInhabiles,
    diasEnumerados: cal.dias.length,
    huecos: (cal.huecos ?? []).map((h) => ({
      descripcion: h.descripcion,
      desde: h.desde,
      hasta: h.hasta,
    })),
  };
}

export function calendariosResumidos(): CalendarioResumen[] {
  return CALENDARIOS.map(resumirCalendario).sort((a, b) => a.id.localeCompare(b.id));
}

function ordenArticulo(valor: string): number {
  const n = Number.parseInt(valor, 10);
  return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
}

export function reglasResumidas(): ReglaResumen[] {
  const reglas = REGLAS.map((regla): ReglaResumen => {
    const calendarios: CalendarioResumen[] = [];
    const calendariosFaltantes: string[] = [];
    for (const id of regla.calendarios) {
      const cal = CALENDARIOS.find((c) => c.id === id);
      if (cal === undefined) calendariosFaltantes.push(id);
      else calendarios.push(resumirCalendario(cal));
    }
    return {
      id: regla.id,
      procedimiento: regla.procedimiento,
      descripcion: regla.descripcion,
      plazo: { cantidad: regla.plazo.cantidad, unidad: regla.plazo.unidad },
      nivelFuente: regla.nivelFuente,
      vigenciaDeclaradaPor: regla.vigenciaDeclaradaPor ?? null,
      vigenteDesde: regla.vigenteDesde,
      vigenteHasta: regla.vigenteHasta,
      verificadoEl: regla.verificadoEl,
      prorrogaSiVenceInhabil: regla.prorrogaSiVenceInhabil,
      fundamento: regla.fundamento,
      formas: regla.surtimiento.map((s) => s.forma),
      calendarios,
      calendariosFaltantes,
    };
  });

  return reglas.sort((a, b) => {
    const porOrdenamiento = a.fundamento.ordenamiento.localeCompare(b.fundamento.ordenamiento, 'es');
    if (porOrdenamiento !== 0) return porOrdenamiento;
    const porArticulo = ordenArticulo(a.fundamento.articulo) - ordenArticulo(b.fundamento.articulo);
    if (porArticulo !== 0) return porArticulo;
    return a.id.localeCompare(b.id, 'es');
  });
}

/** Formas de notificacion que alguna regla del corpus sabe atender. */
export function formasDelCorpus(): string[] {
  const formas = new Set<string>();
  for (const regla of REGLAS) for (const s of regla.surtimiento) formas.add(s.forma);
  return [...formas].sort();
}

export function existeRegla(id: string): boolean {
  return REGLAS.some((r) => r.id === id);
}
