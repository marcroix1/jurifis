import { describe, expect, it } from 'vitest';
import { calcular, REGLAS } from '../src/index.js';
describe('el producto responde HOY', () => {
  it('una notificacion del 12 de septiembre de 2026 produce fecha en las reglas con calendario', () => {
    const sin: string[] = [];
    for (const r of REGLAS) {
      const forma = r.surtimiento[0]?.forma;
      if (forma === undefined) continue;
      const res = calcular({ reglaId: r.id, fechaNotificacion: '2026-09-12', formaNotificacion: forma });
      if (res.vence === null) sin.push(`${r.id}: ${res.confianza} :: ${res.faltantes[0] ?? ''}`);
    }
    if (sin.length) console.log('SIN FECHA:\n  ' + sin.join('\n  '));
    expect(sin.length).toBe(0);
  });
});

import { buscarRegla } from '../src/index.js';
describe('dias transcurridos y restantes', () => {
  it('nunca suman mas que el plazo, aun si la referencia es previa al inicio', () => {
    for (const id of ['lfpca-13-I-a', 'cff-121', 'rri-6', 'lfpa-85', 'lamp-17']) {
      const regla = buscarRegla(id);
      const forma = regla.surtimiento[0]!.forma;
      for (const hoy of ['2026-09-12', '2026-09-20', '2026-10-01']) {
        const r = calcular({ reglaId: id, fechaNotificacion: '2026-09-12', formaNotificacion: forma, hoy });
        if (r.vence === null) continue;
        expect(r.diasTranscurridos! + r.diasRestantes!).toBe(regla.plazo.cantidad);
      }
    }
  });
});
