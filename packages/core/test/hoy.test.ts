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
