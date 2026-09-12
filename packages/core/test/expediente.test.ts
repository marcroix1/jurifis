import { describe, expect, it } from 'vitest';

import { calcular } from '../src/index.js';
import type { EntradaComputo, ResultadoComputo } from '../src/tipos.js';
import {
  alertasDeCartera,
  alertasDelExpediente,
  cambiarEstado,
  esEstadoTerminal,
  fechasClave,
  idDePlazo,
  lineaDeTiempo,
  ordenarEventos,
  plazosDelExpediente,
  suspensionesRegistradas,
  transicionValida,
  transicionesDesde,
  type CalculadorDePlazos,
  type EstadoExpediente,
  type EventoExpediente,
  type Expediente,
} from '../src/expediente/index.js';

/* -------------------------------------------------------------------------- */
/* Utileria de prueba                                                         */
/* -------------------------------------------------------------------------- */

function evento(parcial: Partial<EventoExpediente> & { id: string; ocurridoEn: string }): EventoExpediente {
  return {
    tipo: 'nota',
    titulo: `Evento ${parcial.id}`,
    descripcion: null,
    disparaPlazo: null,
    suspension: null,
    cumplePlazoId: null,
    registradoPor: null,
    ...parcial,
  };
}

function expediente(eventos: EventoExpediente[], estado: EstadoExpediente = 'plazo_corriendo'): Expediente {
  return {
    id: 'exp-prueba',
    numeroExpediente: null,
    caratula: 'Expediente de prueba',
    cliente: { nombre: 'Cliente de prueba', registroFederalDeContribuyentes: null },
    autoridad: 'Autoridad de prueba',
    tipoProcedimiento: 'juicio contencioso administrativo',
    numeroCredito: null,
    ejercicio: null,
    monto: null,
    responsable: 'Responsable de prueba',
    estado,
    abiertoEn: '2026-08-01',
    cerradoEn: null,
    eventos,
    documentos: [],
    esEjemplo: true,
  };
}

/** Motor de mentira, para probar la traduccion sin depender del corpus. */
function motorFingido(respuesta: Partial<ResultadoComputo>): {
  calcular: CalculadorDePlazos;
  entradas: EntradaComputo[];
} {
  const entradas: EntradaComputo[] = [];
  const calcular: CalculadorDePlazos = (entrada) => {
    entradas.push(entrada);
    return {
      confianza: 'verificada',
      vence: null,
      surteEfectos: null,
      inicioComputo: null,
      diasTranscurridos: null,
      diasRestantes: null,
      inhabilesAplicados: [],
      traza: [],
      fuentes: [],
      advertencias: [],
      faltantes: [],
      ...respuesta,
    };
  };
  return { calcular, entradas };
}

const HOY = '2026-09-12';

/* -------------------------------------------------------------------------- */
/* Maquina de estados                                                         */
/* -------------------------------------------------------------------------- */

describe('maquina de estados del expediente', () => {
  it('admite el camino ordinario del juicio, etapa por etapa', () => {
    const camino: EstadoExpediente[] = [
      'nuevo',
      'en_analisis',
      'plazo_corriendo',
      'demanda_presentada',
      'contestacion',
      'alegatos',
      'sentencia',
      'cumplimiento',
      'concluido',
    ];
    for (let i = 0; i + 1 < camino.length; i++) {
      const desde = camino[i]!;
      const hacia = camino[i + 1]!;
      expect(transicionValida(desde, hacia), `${desde} a ${hacia}`).toBe(true);
    }
  });

  it('permite cerrar el asunto desde cualquier etapa que no sea la final', () => {
    for (const estado of ['nuevo', 'en_analisis', 'plazo_corriendo', 'sentencia'] as EstadoExpediente[]) {
      expect(transicionValida(estado, 'concluido')).toBe(true);
    }
  });

  it('rechaza los saltos de etapa', () => {
    expect(transicionValida('nuevo', 'sentencia')).toBe(false);
    expect(transicionValida('nuevo', 'demanda_presentada')).toBe(false);
    expect(transicionValida('en_analisis', 'alegatos')).toBe(false);
    expect(transicionValida('plazo_corriendo', 'cumplimiento')).toBe(false);
  });

  it('rechaza la marcha atras', () => {
    expect(transicionValida('sentencia', 'alegatos')).toBe(false);
    expect(transicionValida('demanda_presentada', 'plazo_corriendo')).toBe(false);
    expect(transicionValida('en_analisis', 'nuevo')).toBe(false);
  });

  it('concluido es terminal y no sale de ahi', () => {
    expect(esEstadoTerminal('concluido')).toBe(true);
    expect(transicionesDesde('concluido')).toHaveLength(0);
    for (const estado of transicionesDesde('nuevo')) {
      expect(transicionValida('concluido', estado)).toBe(false);
    }
  });

  it('el cambio valido devuelve la etapa nueva y el evento que la asienta', () => {
    const r = cambiarEstado('plazo_corriendo', 'demanda_presentada', {
      fecha: '2026-09-12',
      eventoId: 'ev-cambio',
      nota: 'Se presento por el juicio en linea.',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.estado).toBe('demanda_presentada');
    expect(r.evento.tipo).toBe('cambio_de_estado');
    expect(r.evento.ocurridoEn).toBe('2026-09-12');
    expect(r.evento.descripcion).toContain('Se presento por el juicio en linea.');
    expect(r.evento.disparaPlazo).toBeNull();
  });

  it('el cambio invalido explica el motivo y lo que si procede, sin lanzar', () => {
    const r = cambiarEstado('nuevo', 'sentencia', { fecha: '2026-09-12', eventoId: 'ev-x' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toContain('nuevo');
    expect(r.motivo).toContain('sentencia');
    expect(r.permitidas).toEqual(['en_analisis', 'concluido']);
  });

  it('quedarse en la misma etapa no es una transicion', () => {
    const r = cambiarEstado('contestacion', 'contestacion', { fecha: '2026-09-12', eventoId: 'ev-y' });
    expect(r.ok).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Linea de tiempo                                                            */
/* -------------------------------------------------------------------------- */

describe('linea de tiempo', () => {
  it('ordena por fecha aunque se capture al reves', () => {
    const exp = expediente([
      evento({ id: 'c', ocurridoEn: '2026-09-01' }),
      evento({ id: 'a', ocurridoEn: '2026-07-15' }),
      evento({ id: 'b', ocurridoEn: '2026-08-20' }),
    ]);
    expect(ordenarEventos(exp.eventos).map((e) => e.id)).toEqual(['a', 'b', 'c']);

    const motor = motorFingido({});
    const renglones = lineaDeTiempo(exp, { hoy: HOY, calcular: motor.calcular });
    expect(renglones.map((r) => r.evento.id)).toEqual(['a', 'b', 'c']);
    expect(renglones.map((r) => r.orden)).toEqual([1, 2, 3]);
  });

  it('dos actuaciones del mismo dia conservan el orden de captura', () => {
    const exp = expediente([
      evento({ id: 'primera', ocurridoEn: '2026-08-20' }),
      evento({ id: 'segunda', ocurridoEn: '2026-08-20' }),
      evento({ id: 'anterior', ocurridoEn: '2026-08-19' }),
    ]);
    expect(ordenarEventos(exp.eventos).map((e) => e.id)).toEqual(['anterior', 'primera', 'segunda']);
  });

  it('un renglon declara el tipo del evento y su efecto sobre los plazos', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-20',
        disparaPlazo: {
          reglaId: 'lfpca-13-I-a',
          formaNotificacion: 'personal',
          descripcion: 'demanda de nulidad',
        },
      }),
      evento({
        id: 'ev-susp',
        tipo: 'suspension',
        ocurridoEn: '2026-08-24',
        suspension: { hasta: '2026-08-26', motivo: 'Suspension de labores', fundamento: 'Acuerdo del pleno' },
      }),
      evento({ id: 'ev-nota', tipo: 'nota', ocurridoEn: '2026-08-28' }),
      evento({
        id: 'ev-presenta',
        tipo: 'presentacion',
        ocurridoEn: '2026-09-05',
        cumplePlazoId: idDePlazo('ev-notif'),
      }),
    ]);

    const renglones = lineaDeTiempo(exp, { hoy: HOY, calcular });
    expect(renglones.map((r) => r.efectoEnPlazos)).toEqual(['dispara', 'suspende', 'ninguno', 'cumple']);
    expect(renglones.map((r) => r.tipo)).toEqual(['notificacion', 'suspension', 'nota', 'presentacion']);
    expect(renglones[0]!.plazo?.id).toBe(idDePlazo('ev-notif'));
    expect(renglones[3]!.plazo?.id).toBe(idDePlazo('ev-notif'));
    expect(renglones[1]!.resumenEfecto).toContain('Suspende el computo');
    expect(renglones[2]!.resumenEfecto).toContain('No mueve');
  });

  it('la notificacion dispara el computo llamando al motor de plazos', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: {
          reglaId: 'cff-121',
          formaNotificacion: 'buzon_tributario',
          descripcion: 'recurso de revocacion',
        },
      }),
    ]);

    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular });
    expect(plazos).toHaveLength(1);
    const plazo = plazos[0]!;
    // El expediente no recalcula: guarda lo que el motor devolvio, tal cual.
    const directo = calcular({
      reglaId: 'cff-121',
      fechaNotificacion: '2026-08-25',
      formaNotificacion: 'buzon_tributario',
      hoy: HOY,
    });
    expect(plazo.computo.vence).toBe(directo.vence);
    expect(plazo.computo.confianza).toBe(directo.confianza);
    expect(plazo.computo.traza.length).toBe(directo.traza.length);
    expect(plazo.computo.diasRestantes).toBe(directo.diasRestantes);
    expect(plazo.cumplidoEn).toBeNull();
  });

  it('las suspensiones registradas entran al computo y ninguna se infiere', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: { reglaId: 'cff-121', formaNotificacion: 'buzon_tributario', descripcion: 'recurso' },
      }),
      evento({
        id: 'ev-susp',
        tipo: 'suspension',
        ocurridoEn: '2026-09-01',
        suspension: { hasta: '2026-09-04', motivo: 'Suspension de labores', fundamento: 'Acuerdo' },
      }),
      evento({
        id: 'ev-susp-rota',
        tipo: 'suspension',
        ocurridoEn: '2026-09-10',
        suspension: { hasta: '2026-09-02', motivo: 'Captura invertida', fundamento: 'Sin fundamento' },
      }),
    ]);

    const registradas = suspensionesRegistradas(exp.eventos);
    expect(registradas).toHaveLength(1);
    expect(registradas[0]!.desde).toBe('2026-09-01');

    const motor = motorFingido({ vence: '2026-10-08', diasRestantes: 18, confianza: 'verificada' });
    plazosDelExpediente(exp, { hoy: HOY, calcular: motor.calcular });
    expect(motor.entradas[0]!.suspensiones).toHaveLength(1);
    expect(motor.entradas[0]!.hoy).toBe(HOY);

    // Sin evento de suspension, el motor no recibe ninguna.
    const limpio = motorFingido({ vence: '2026-10-08', diasRestantes: 18 });
    plazosDelExpediente(expediente([exp.eventos[0]!]), { hoy: HOY, calcular: limpio.calcular });
    expect(limpio.entradas[0]!.suspensiones).toBeUndefined();
  });

  it('una regla que el corpus no tiene no rompe el expediente, se declara faltante', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: {
          reglaId: 'regla-que-no-existe',
          formaNotificacion: 'personal',
          descripcion: 'plazo sin regla',
        },
      }),
    ]);
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular });
    expect(plazos[0]!.computo.confianza).toBe('insuficiente');
    expect(plazos[0]!.computo.vence).toBeNull();
    expect(plazos[0]!.computo.faltantes.join(' ')).toContain('regla-que-no-existe');
  });

  it('las fechas importantes salen ordenadas y el plazo sin fecha no aporta ninguna', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-11-20',
        disparaPlazo: {
          reglaId: 'cff-121',
          formaNotificacion: 'buzon_tributario',
          descripcion: 'recurso de revocacion',
        },
      }),
    ]);
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular });
    expect(plazos[0]!.computo.vence).toBeNull();

    const fechas = fechasClave(exp, plazos);
    expect(fechas.some((f) => f.origen === 'plazo')).toBe(false);
    for (let i = 0; i + 1 < fechas.length; i++) {
      expect(fechas[i]!.fecha <= fechas[i + 1]!.fecha).toBe(true);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Motor de alertas                                                           */
/* -------------------------------------------------------------------------- */

describe('motor de alertas', () => {
  it('un plazo sin fecha genera alerta de atencion, no silencio', () => {
    // Noviembre de 2026 cae en el hueco declarado del calendario del Servicio
    // de Administracion Tributaria: el motor se niega a estimar.
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-11-20',
        disparaPlazo: {
          reglaId: 'cff-121',
          formaNotificacion: 'buzon_tributario',
          descripcion: 'recurso de revocacion',
        },
      }),
    ]);
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular });
    expect(plazos[0]!.computo.confianza).toBe('insuficiente');

    const alertas = alertasDelExpediente(exp, plazos, { hoy: HOY });
    expect(alertas).toHaveLength(1);
    const alerta = alertas[0]!;
    expect(alerta.nivel).toBe('no_computable');
    expect(alerta.vence).toBeNull();
    expect(alerta.diasHabilesRestantes).toBeNull();
    expect(alerta.faltantes.length).toBeGreaterThan(0);
    expect(alerta.detalle).toContain('no se puede computar');
    // Y sobre todo: la alerta no filtra ninguna fecha por la puerta de atras.
    expect(`${alerta.titulo} ${alerta.detalle} ${alerta.accion}`).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('la confianza bloqueada por fuente tampoco dice fecha y tambien escala', () => {
    const exp = expediente([
      evento({
        id: 'ev-notif',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: { reglaId: 'r', formaNotificacion: 'personal', descripcion: 'plazo bloqueado' },
      }),
    ]);
    const motor = motorFingido({
      confianza: 'bloqueada_por_fuente',
      vence: null,
      diasRestantes: null,
      faltantes: ['Texto oficial integro y vigente del ordenamiento.'],
    });
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular: motor.calcular });
    const alerta = alertasDelExpediente(exp, plazos, { hoy: HOY })[0]!;
    expect(alerta.nivel).toBe('no_computable');
    expect(alerta.vence).toBeNull();
    expect(alerta.detalle).toContain('nivel B');
    expect(alerta.faltantes).toContain('Texto oficial integro y vigente del ordenamiento.');
  });

  it('el plazo que no se puede computar va arriba del que si, incluso del vencido', () => {
    const exp = expediente([
      evento({
        id: 'ev-computable',
        tipo: 'notificacion',
        ocurridoEn: '2026-09-07',
        disparaPlazo: {
          reglaId: 'ley-aduanera-150',
          formaNotificacion: 'personal',
          descripcion: 'pruebas y alegatos',
        },
      }),
      evento({
        id: 'ev-roto',
        tipo: 'notificacion',
        ocurridoEn: '2026-11-20',
        disparaPlazo: {
          reglaId: 'cff-121',
          formaNotificacion: 'buzon_tributario',
          descripcion: 'recurso de revocacion',
        },
      }),
    ]);
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular });
    const alertas = alertasDelExpediente(exp, plazos, { hoy: HOY });
    expect(alertas[0]!.nivel).toBe('no_computable');
    expect(alertas[0]!.criticidad).toBeGreaterThan(alertas[1]!.criticidad);
  });

  it('la urgencia sale de los dias restantes del motor, no de una cuenta propia', () => {
    const exp = expediente([
      evento({
        id: 'ev',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: { reglaId: 'r', formaNotificacion: 'personal', descripcion: 'plazo' },
      }),
    ]);

    // La fecha de vencimiento esta lejos en el calendario natural, pero el motor
    // dice que solo queda un dia habil. Manda el motor.
    const apretado = motorFingido({ confianza: 'verificada', vence: '2026-12-24', diasRestantes: 1 });
    const critica = alertasDelExpediente(
      exp,
      plazosDelExpediente(exp, { hoy: HOY, calcular: apretado.calcular }),
      { hoy: HOY },
    )[0]!;
    expect(critica.nivel).toBe('critico');
    expect(critica.diasHabilesRestantes).toBe(1);

    const holgado = motorFingido({ confianza: 'verificada', vence: '2026-09-30', diasRestantes: 12 });
    const baja = alertasDelExpediente(
      exp,
      plazosDelExpediente(exp, { hoy: HOY, calcular: holgado.calcular }),
      { hoy: HOY },
    )[0]!;
    expect(baja.nivel).toBe('bajo');
  });

  it('distingue el ultimo dia habil del plazo ya vencido', () => {
    const exp = expediente([
      evento({
        id: 'ev',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: { reglaId: 'r', formaNotificacion: 'personal', descripcion: 'plazo' },
      }),
    ]);

    const ultimoDia = motorFingido({ confianza: 'verificada', vence: HOY, diasRestantes: 0 });
    const hoyVence = alertasDelExpediente(
      exp,
      plazosDelExpediente(exp, { hoy: HOY, calcular: ultimoDia.calcular }),
      { hoy: HOY },
    )[0]!;
    expect(hoyVence.nivel).toBe('critico');
    expect(hoyVence.detalle).toContain('ultimo dia habil');

    const pasado = motorFingido({ confianza: 'verificada', vence: '2026-09-01', diasRestantes: 0 });
    const vencido = alertasDelExpediente(
      exp,
      plazosDelExpediente(exp, { hoy: HOY, calcular: pasado.calcular }),
      { hoy: HOY },
    )[0]!;
    expect(vencido.nivel).toBe('vencido');
  });

  it('el plazo cumplido deja de urgir', () => {
    const exp = expediente([
      evento({
        id: 'ev',
        tipo: 'notificacion',
        ocurridoEn: '2026-08-25',
        disparaPlazo: { reglaId: 'r', formaNotificacion: 'personal', descripcion: 'plazo' },
      }),
      evento({
        id: 'ev-presenta',
        tipo: 'presentacion',
        ocurridoEn: '2026-09-10',
        cumplePlazoId: idDePlazo('ev'),
      }),
    ]);
    const motor = motorFingido({ confianza: 'verificada', vence: '2026-09-14', diasRestantes: 1 });
    const plazos = plazosDelExpediente(exp, { hoy: HOY, calcular: motor.calcular });
    expect(plazos[0]!.cumplidoEn).toBe('2026-09-10');

    const conCumplidos = alertasDelExpediente(exp, plazos, { hoy: HOY });
    expect(conCumplidos[0]!.nivel).toBe('cumplido');
    expect(conCumplidos[0]!.criticidad).toBe(0);

    const sinCumplidos = alertasDelExpediente(exp, plazos, { hoy: HOY, incluirCumplidos: false });
    expect(sinCumplidos).toHaveLength(0);
  });

  it('la cartera junta los expedientes y ordena por criticidad', () => {
    const conPlazoRoto = expediente([
      evento({
        id: 'ev-roto',
        tipo: 'notificacion',
        ocurridoEn: '2026-11-20',
        disparaPlazo: {
          reglaId: 'cff-121',
          formaNotificacion: 'buzon_tributario',
          descripcion: 'recurso de revocacion',
        },
      }),
    ]);
    const conPlazoSano = {
      ...expediente([
        evento({
          id: 'ev-sano',
          tipo: 'notificacion',
          ocurridoEn: '2026-09-08',
          disparaPlazo: {
            reglaId: 'cff-121',
            formaNotificacion: 'personal',
            descripcion: 'recurso de revocacion',
          },
        }),
      ]),
      id: 'exp-sano',
    };

    const alertas = alertasDeCartera(
      [
        { expediente: conPlazoSano, plazos: plazosDelExpediente(conPlazoSano, { hoy: HOY, calcular }) },
        { expediente: conPlazoRoto, plazos: plazosDelExpediente(conPlazoRoto, { hoy: HOY, calcular }) },
      ],
      { hoy: HOY },
    );
    expect(alertas).toHaveLength(2);
    expect(alertas[0]!.expedienteId).toBe('exp-prueba');
    expect(alertas[0]!.nivel).toBe('no_computable');
    expect(alertas[1]!.expedienteId).toBe('exp-sano');
    for (let i = 0; i + 1 < alertas.length; i++) {
      expect(alertas[i]!.criticidad).toBeGreaterThanOrEqual(alertas[i + 1]!.criticidad);
    }
  });
});
