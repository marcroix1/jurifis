import { describe, expect, it } from 'vitest';
import { calcular, buscarRegla, REGLAS, CALENDARIOS } from '../src/index.js';
import { aFecha, aDias, diaSemana, nombreDiaSemana, sumarMeses } from '../src/fecha.js';

describe('aritmetica de fechas sin Date nativo', () => {
  it('ida y vuelta en 40 anios', () => {
    for (let d = aDias('2000-01-01'); d <= aDias('2040-01-01'); d += 1) {
      expect(aDias(aFecha(d))).toBe(d);
    }
  });
  it('conoce los dias de la semana reales', () => {
    expect(nombreDiaSemana('2026-01-01')).toBe('jueves');
    expect(nombreDiaSemana('2026-09-12')).toBe('sabado');
    expect(nombreDiaSemana('2026-02-02')).toBe('lunes');
  });
  it('bisiestos y dia inexistente en el mes destino', () => {
    expect(aFecha(aDias('2024-02-29'))).toBe('2024-02-29');
    expect(() => aDias('2026-02-29')).toThrow();
    expect(sumarMeses('2026-01-31', 1)).toEqual({ fecha: '2026-02-28', diaInexistente: true });
  });
});

describe('juicio de nulidad, demanda, 30 dias habiles', () => {
  it('doble desfase: notificacion en viernes surte el lunes y el plazo corre el martes', () => {
    const r = calcular({ reglaId: 'lfpca-13-I-a', fechaNotificacion: '2026-02-06', formaNotificacion: 'personal' });
    expect(nombreDiaSemana('2026-02-06')).toBe('viernes');
    expect(r.surteEfectos).toBe('2026-02-09');
    expect(nombreDiaSemana(r.surteEfectos!)).toBe('lunes');
    expect(r.inicioComputo).toBe('2026-02-10');
    expect(r.vence).not.toBeNull();
    expect(r.confianza).toBe('parcial'); // el calendario del Tribunal es nivel B
  });

  it('descuenta el periodo vacacional del Tribunal', () => {
    const r = calcular({ reglaId: 'lfpca-13-I-a', fechaNotificacion: '2026-06-15', formaNotificacion: 'personal' });
    const vacaciones = r.inhabilesAplicados.filter((d) => d.motivo.includes('Primer periodo vacacional'));
    expect(vacaciones.length).toBeGreaterThan(0);
    expect(aDias(r.vence!)).toBeGreaterThan(aDias('2026-07-31'));
  });

  it('nunca vence en dia inhabil', () => {
    for (let d = aDias('2026-01-05'); d <= aDias('2026-06-30'); d++) {
      const r = calcular({ reglaId: 'lfpca-13-I-a', fechaNotificacion: aFecha(d), formaNotificacion: 'personal' });
      if (r.vence === null) continue;
      expect(diaSemana(r.vence)).toBeLessThan(6);
    }
  });
});

describe('la negativa a estimar', () => {
  it('devuelve insuficiente cuando el calendario no cubre el periodo', () => {
    const r = calcular({ reglaId: 'cff-121', fechaNotificacion: '2026-11-20', formaNotificacion: 'buzon_tributario' });
    expect(r.confianza).toBe('insuficiente');
    expect(r.vence).toBeNull();
    expect(r.faltantes.join(' ')).toContain('segundo periodo general de vacaciones');
  });

  it('devuelve insuficiente si no hay regla de surtimiento para esa forma', () => {
    const r = calcular({ reglaId: 'lfpca-17', fechaNotificacion: '2026-03-02', formaNotificacion: 'personal' });
    expect(r.confianza).toBe('insuficiente');
    expect(r.vence).toBeNull();
  });

  it('rechaza una regla que no existe en el corpus', () => {
    expect(() => calcular({ reglaId: 'inventada-1', fechaNotificacion: '2026-03-02', formaNotificacion: 'personal' }))
      .toThrow(/no inventa reglas/);
  });
});

describe('el surtimiento es dato, no constante', () => {
  it('la notificacion personal del procedimiento administrativo surte el mismo dia', () => {
    const r = calcular({ reglaId: 'lfpa-85', fechaNotificacion: '2026-03-03', formaNotificacion: 'personal' });
    expect(r.surteEfectos).toBe('2026-03-03');
    expect(r.inicioComputo).toBe('2026-03-04');
    expect(r.confianza).toBe('verificada');
  });

  it('la fiscal surte al dia habil siguiente, un dia despues que la administrativa', () => {
    const fiscal = calcular({ reglaId: 'cff-121', fechaNotificacion: '2026-03-03', formaNotificacion: 'personal' });
    const admin = calcular({ reglaId: 'lfpa-85', fechaNotificacion: '2026-03-03', formaNotificacion: 'personal' });
    expect(aDias(fiscal.surteEfectos!) - aDias(admin.surteEfectos!)).toBe(1);
  });

  it('por estrados ante el Instituto surte al quinto dia habil', () => {
    const r = calcular({ reglaId: 'rri-6', fechaNotificacion: '2026-03-03', formaNotificacion: 'lista_o_estrados' });
    expect(r.surteEfectos).toBe('2026-03-10');
  });
});

describe('nivel de fuente', () => {
  it('el modulo del Instituto calcula, pero declarado como parcial y con su faltante', () => {
    const r = calcular({ reglaId: 'rri-6', fechaNotificacion: '2026-03-03', formaNotificacion: 'personal' });
    expect(r.vence).not.toBeNull();
    expect(r.confianza).toBe('parcial');
    expect(r.advertencias.join(' ')).toContain('Marco');
    expect(r.faltantes.join(' ')).toContain('Texto oficial');
  });

  it('toda regla de nivel B trae declaracion de vigencia', () => {
    for (const r of REGLAS) {
      if (r.nivelFuente === 'B') expect(r.vigenciaDeclaradaPor).toBeDefined();
    }
  });
});

describe('integridad del corpus', () => {
  it('cada regla cita archivo y ordenamiento', () => {
    for (const r of REGLAS) {
      expect(r.fundamento.archivo.length).toBeGreaterThan(0);
      expect(r.fundamento.ordenamiento.length).toBeGreaterThan(0);
      expect(r.plazo.cantidad).toBeGreaterThan(0);
    }
  });
  it('los catalogos de ley no son intercambiables', () => {
    const dias = (id: string) => new Set(CALENDARIOS.find((c) => c.id === id)!.dias.map((d) => d.fecha));
    expect(dias('cff-12-2026')).not.toEqual(dias('amparo-19-2026'));
    expect(dias('amparo-19-2026').has('2026-10-12')).toBe(true);
    expect(dias('cff-12-2026').has('2026-10-12')).toBe(false);
  });
  it('toda regla apunta a un calendario que existe', () => {
    const ids = new Set(CALENDARIOS.map((c) => c.id));
    for (const r of REGLAS) for (const c of r.calendarios) expect(ids.has(c)).toBe(true);
  });
});

describe('la traza', () => {
  it('trae los ocho pasos con su fundamento', () => {
    const r = calcular({ reglaId: 'cff-121', fechaNotificacion: '2026-02-10', formaNotificacion: 'buzon_tributario', hoy: '2026-03-02' });
    expect(r.traza.map((p) => p.paso)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(r.diasTranscurridos).toBeGreaterThan(0);
    expect(r.diasRestantes).toBeGreaterThan(0);
    expect(r.diasTranscurridos! + r.diasRestantes!).toBe(30);
    expect(r.fuentes.length).toBeGreaterThanOrEqual(2);
  });
});
