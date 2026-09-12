import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CUESTIONARIO, LenguajeImprudente, RespuestaInvalida, armarDiagnostico, avanzar, diagnosticar,
  frasesProhibidasEn, lenguajePrudente, preguntasAplicables, revisarTextos, siguientePregunta,
  validarCuestionario, validarRespuesta,
} from '../src/diagnostico/index.js';
import type { Diagnostico, Respuestas } from '../src/diagnostico/index.js';

/** Identificadores de regla que el corpus del motor de plazos tiene de verdad. */
const DIR_REGLAS = join(dirname(fileURLToPath(import.meta.url)), '..', 'datos', 'reglas');
const IDS_REGLAS = new Set<string>(
  readdirSync(DIR_REGLAS)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(DIR_REGLAS, f), 'utf8')).id as string),
);

const NO_SE = { tipo: 'no_se' } as const;
function op(valor: string) {
  return { tipo: 'opcion_unica', valor } as const;
}

/** Termina el cuestionario respondiendo "no lo se" a lo que quede pendiente. */
function completar(base: Respuestas): Respuestas {
  const respuestas: Respuestas = { ...base };
  for (let i = 0; i < 60; i++) {
    const p = siguientePregunta(CUESTIONARIO, respuestas);
    if (p === null) return respuestas;
    respuestas[p.id] = NO_SE;
  }
  throw new Error('El arbol no termino en 60 vueltas.');
}

function diagnosticoDe(base: Respuestas, hoy?: string): Diagnostico {
  const paso = avanzar(CUESTIONARIO, completar(base), hoy === undefined ? {} : { hoy });
  if (paso.estado !== 'diagnostico') throw new Error('Se esperaba el diagnostico y llego una pregunta.');
  return paso.diagnostico;
}

describe('guardian del lenguaje prudente', () => {
  const promesas = [
    'El asunto se ganará sin problema',
    'Con esto ganaras el juicio',
    'Vas a ganar en el Tribunal',
    'El resultado es seguro',
    'Resultado garantizado desde ahora',
    'Sin duda el acto cae',
    'Procede la nulidad lisa y llana',
    'El acto es ilegal',
    'Te van a devolver el saldo',
  ];

  it('rechaza toda promesa de resultado', () => {
    for (const texto of promesas) {
      expect(frasesProhibidasEn(texto).length).toBeGreaterThan(0);
      expect(() => lenguajePrudente(texto)).toThrow(LenguajeImprudente);
    }
  });

  it('no depende de acentos ni de mayusculas', () => {
    expect(frasesProhibidasEn('SE GANARA')).toContain('ganara');
    expect(frasesProhibidasEn('se ganará')).toContain('ganara');
    expect(frasesProhibidasEn('Garantizado')).toContain('garantizado');
  });

  it('acepta las formulas prudentes', () => {
    const permitidas = [
      'podria existir una via de defensa',
      'requiere revision juridica',
      'existe un posible problema que debe analizarse',
      'se requiere revisar la resolucion y su constancia de notificacion',
    ];
    for (const texto of permitidas) {
      expect(frasesProhibidasEn(texto)).toEqual([]);
      expect(lenguajePrudente(texto)).toBe(texto);
    }
  });

  it('nombra al Instituto Mexicano del Seguro Social sin disparar por la palabra seguro', () => {
    expect(frasesProhibidasEn('Recurso ante el Instituto Mexicano del Seguro Social')).toEqual([]);
    expect(frasesProhibidasEn('cuotas al Seguro Social')).toEqual([]);
    expect(frasesProhibidasEn('el resultado es seguro')).toContain('seguro');
  });

  it('respeta la frontera de palabra', () => {
    expect(frasesProhibidasEn('la autoridad aseguro la mercancia')).toEqual([]);
    expect(frasesProhibidasEn('el aseguramiento de bienes')).toEqual([]);
  });

  it('recorre estructuras anidadas y senala la ruta', () => {
    expect(() => revisarTextos({ a: [{ b: 'procede la nulidad' }] })).toThrow(LenguajeImprudente);
    expect(() => revisarTextos({ a: [{ b: 'requiere revision juridica' }] })).not.toThrow();
    try {
      revisarTextos({ vias: ['sin duda'] }, 'salida');
      throw new Error('debio lanzar');
    } catch (e) {
      expect(e).toBeInstanceOf(LenguajeImprudente);
      expect((e as LenguajeImprudente).ruta).toBe('salida.vias[0]');
    }
  });
});

describe('el cuestionario es dato bien formado', () => {
  it('pasa su propia validacion estructural', () => {
    expect(validarCuestionario(CUESTIONARIO)).toEqual([]);
  });

  it('trae las catorce preguntas del encargo, en orden', () => {
    expect(CUESTIONARIO.preguntas.map((p) => p.id)).toEqual([
      'autoridad',
      'tipo_acto',
      'fecha_notificacion',
      'monto',
      'existe_credito_fiscal',
      'procedimiento_ejecucion',
      'hubo_embargo',
      'embargo_cuentas',
      'es_multa',
      'es_determinacion_contribuciones',
      'es_negativa_devolucion',
      'hubo_visita_domiciliaria',
      'existe_pama',
      'hay_resolucion_definitiva',
    ]);
  });

  it('usa los cuatro tipos de pregunta y permite declarar la ignorancia', () => {
    const tipos = new Set(CUESTIONARIO.preguntas.map((p) => p.tipo));
    expect(tipos.has('opcion_unica')).toBe(true);
    expect(tipos.has('fecha')).toBe(true);
    expect(tipos.has('monto')).toBe(true);
    for (const p of CUESTIONARIO.preguntas) expect(p.permiteNoSe).toBe(true);
  });

  it('ningun texto del cuestionario promete resultado', () => {
    expect(frasesProhibidasEn(JSON.stringify(CUESTIONARIO))).toEqual([]);
  });

  it('detecta un cuestionario que se condiciona hacia adelante', () => {
    const roto = {
      version: 'prueba',
      titulo: 'prueba',
      preguntas: [
        { id: 'a', texto: 'a', tipo: 'opcion_unica' as const, opciones: [{ valor: 'si', etiqueta: 'Si' }], condicion: { operador: 'igual' as const, pregunta: 'b', valor: 'si' } },
        { id: 'b', texto: 'b', tipo: 'opcion_unica' as const, opciones: [{ valor: 'si', etiqueta: 'Si' }] },
      ],
    };
    expect(validarCuestionario(roto).length).toBeGreaterThan(0);
  });
});

describe('recorrido del arbol y ramificacion condicional', () => {
  it('arranca preguntando por la autoridad y avisa del avance', () => {
    const paso = diagnosticar({});
    expect(paso.estado).toBe('pregunta');
    if (paso.estado !== 'pregunta') return;
    expect(paso.pregunta.id).toBe('autoridad');
    expect(paso.respondidas).toBe(0);
    expect(paso.aplicables).toBeGreaterThan(0);
  });

  it('no pregunta por el embargo si no hay procedimiento de ejecucion', () => {
    const sin = preguntasAplicables(CUESTIONARIO, { procedimiento_ejecucion: op('no') }).map((p) => p.id);
    expect(sin).not.toContain('hubo_embargo');
    expect(sin).not.toContain('embargo_cuentas');

    const con = preguntasAplicables(CUESTIONARIO, {
      procedimiento_ejecucion: op('si'),
      hubo_embargo: op('si'),
    }).map((p) => p.id);
    expect(con).toContain('hubo_embargo');
    expect(con).toContain('embargo_cuentas');
  });

  it('no repite lo que el tipo de acto ya contesto', () => {
    const conMulta = preguntasAplicables(CUESTIONARIO, { tipo_acto: op('multa') }).map((p) => p.id);
    expect(conMulta).not.toContain('es_multa');
    expect(conMulta).not.toContain('es_negativa_devolucion');

    const conOtro = preguntasAplicables(CUESTIONARIO, { tipo_acto: op('otro') }).map((p) => p.id);
    expect(conOtro).toContain('es_multa');
    expect(conOtro).toContain('es_determinacion_contribuciones');
    expect(conOtro).toContain('es_negativa_devolucion');
  });

  it('la rama aduanera y la de visita dependen de la autoridad', () => {
    const imss = preguntasAplicables(CUESTIONARIO, { autoridad: op('imss') }).map((p) => p.id);
    expect(imss).not.toContain('existe_pama');
    expect(imss).toContain('hubo_visita_domiciliaria');

    const aduanas = preguntasAplicables(CUESTIONARIO, { autoridad: op('aduanas') }).map((p) => p.id);
    expect(aduanas).toContain('existe_pama');

    const otra = preguntasAplicables(CUESTIONARIO, { autoridad: op('otra_federal') }).map((p) => p.id);
    expect(otra).not.toContain('hubo_visita_domiciliaria');
  });

  it('termina en diagnostico cuando ya no queda pregunta aplicable', () => {
    const respuestas = completar({ autoridad: op('sat'), tipo_acto: op('multa') });
    expect(siguientePregunta(CUESTIONARIO, respuestas)).toBeNull();
    expect(avanzar(CUESTIONARIO, respuestas).estado).toBe('diagnostico');
  });

  it('rechaza respuestas que no corresponden a la pregunta', () => {
    expect(() => diagnosticar({ autoridad: op('marte') })).toThrow(RespuestaInvalida);
    expect(() => diagnosticar({ inexistente: op('sat') })).toThrow(RespuestaInvalida);
    expect(() => diagnosticar({ fecha_notificacion: { tipo: 'fecha', valor: '2026-02-30' } })).toThrow(RespuestaInvalida);
    expect(() => diagnosticar({ monto: { tipo: 'monto', valor: -1 } })).toThrow(RespuestaInvalida);
    expect(() => diagnosticar({ autoridad: { tipo: 'monto', valor: 10 } })).toThrow(RespuestaInvalida);
  });

  it('acepta fecha y monto bien formados', () => {
    const pregunta = CUESTIONARIO.preguntas.find((p) => p.id === 'fecha_notificacion')!;
    expect(validarRespuesta(pregunta, { tipo: 'fecha', valor: '2026-03-02' })).toEqual([]);
    const montoP = CUESTIONARIO.preguntas.find((p) => p.id === 'monto')!;
    expect(validarRespuesta(montoP, { tipo: 'monto', valor: 148320.55 })).toEqual([]);
  });

  it('ignora la respuesta que quedo colgada de una rama muerta', () => {
    const viva = diagnosticoDe({
      autoridad: op('sat'),
      tipo_acto: op('determinacion_contribuciones'),
      procedimiento_ejecucion: op('si'),
      hubo_embargo: op('si'),
      embargo_cuentas: op('si'),
    });
    expect(viva.urgencia).toBe('inmediata');

    const muerta = diagnosticoDe({
      autoridad: op('sat'),
      tipo_acto: op('determinacion_contribuciones'),
      procedimiento_ejecucion: op('no'),
      hubo_embargo: op('si'),
      embargo_cuentas: op('si'),
    });
    expect(muerta.urgencia).not.toBe('inmediata');
    expect(muerta.plazosPorVerificar).not.toContain('lamp-17');
  });
});

describe('ramas del diagnostico y su regla de plazo', () => {
  it('autoridad fiscal federal con determinacion: sede administrativa y sede jurisdiccional', () => {
    const d = diagnosticoDe({ autoridad: op('sat'), tipo_acto: op('determinacion_contribuciones') });
    expect(d.plazosPorVerificar).toContain('cff-121');
    expect(d.plazosPorVerificar).toContain('lfpca-13-I-a');
  });

  it('si el acto ya resolvio un recurso, no vuelve a ofrecer el recurso', () => {
    const d = diagnosticoDe({ autoridad: op('sat'), tipo_acto: op('resolucion_de_recurso') });
    expect(d.plazosPorVerificar).not.toContain('cff-121');
    expect(d.plazosPorVerificar).toContain('lfpca-13-I-a');
  });

  it('Instituto Mexicano del Seguro Social: recurso de inconformidad y juicio', () => {
    const d = diagnosticoDe({ autoridad: op('imss'), tipo_acto: op('determinacion_contribuciones') });
    expect(d.plazosPorVerificar).toEqual(expect.arrayContaining(['rri-6', 'lfpca-13-I-a']));
  });

  it('Instituto del Fondo Nacional de la Vivienda para los Trabajadores: declara la regla que falta', () => {
    const d = diagnosticoDe({ autoridad: op('infonavit'), tipo_acto: op('determinacion_contribuciones') });
    expect(d.plazosPorVerificar).toEqual(['lfpca-13-I-a']);
    expect(d.informacionFaltante.join(' ')).toContain('no tiene regla cargada en el motor de plazos');
  });

  it('autoridad fiscal local: no inventa el identificador del recurso local', () => {
    const d = diagnosticoDe({ autoridad: op('fiscal_estatal'), tipo_acto: op('multa') });
    expect(d.plazosPorVerificar).toEqual(['lfpca-13-I-a']);
    expect(d.informacionFaltante.join(' ')).toContain('entidad federativa');
  });

  it('otra autoridad administrativa federal: recurso de revision y juicio', () => {
    const d = diagnosticoDe({ autoridad: op('otra_federal'), tipo_acto: op('multa') });
    expect(d.plazosPorVerificar).toEqual(expect.arrayContaining(['lfpa-85', 'lfpca-13-I-a']));
  });

  it('procedimiento aduanero abierto: defensa dentro del procedimiento, no impugnacion de definitiva', () => {
    const d = diagnosticoDe({
      autoridad: op('aduanas'),
      tipo_acto: op('acta_o_requerimiento'),
      procedimiento_ejecucion: op('si'),
      hubo_embargo: op('si'),
      embargo_cuentas: op('no'),
      existe_pama: op('si'),
      hay_resolucion_definitiva: op('no'),
    });
    expect(d.plazosPorVerificar).toEqual(expect.arrayContaining(['ley-aduanera-150', 'ley-aduanera-155']));
    expect(d.plazosPorVerificar).not.toContain('cff-121');
  });

  it('procedimiento aduanero ya resuelto: vuelve a la via ordinaria', () => {
    const d = diagnosticoDe({
      autoridad: op('aduanas'),
      tipo_acto: op('determinacion_contribuciones'),
      existe_pama: op('si'),
      hay_resolucion_definitiva: op('si'),
    });
    expect(d.plazosPorVerificar).toEqual(expect.arrayContaining(['cff-121', 'lfpca-13-I-a']));
    expect(d.plazosPorVerificar).not.toContain('ley-aduanera-150');
  });

  it('cuentas bancarias embargadas: urgencia inmediata y via adicional por revisar', () => {
    const d = diagnosticoDe({
      autoridad: op('sat'),
      tipo_acto: op('cobro_o_ejecucion'),
      procedimiento_ejecucion: op('si'),
      hubo_embargo: op('si'),
      embargo_cuentas: op('si'),
    });
    expect(d.urgencia).toBe('inmediata');
    expect(d.plazosPorVerificar).toContain('lamp-17');
    expect(d.documentos.join(' ')).toContain('institucion financiera');
  });

  it('la visita domiciliaria abre su linea de analisis y sus documentos', () => {
    const d = diagnosticoDe({
      autoridad: op('sat'),
      tipo_acto: op('determinacion_contribuciones'),
      hubo_visita_domiciliaria: op('si'),
    });
    expect(d.lineasDeAnalisis.join(' ')).toContain('visita domiciliaria');
    expect(d.documentos.join(' ')).toContain('ultima acta parcial');
  });

  it('la negativa de devolucion pide la solicitud y su respuesta', () => {
    const d = diagnosticoDe({ autoridad: op('sat'), tipo_acto: op('negativa_devolucion') });
    expect(d.documentos.join(' ')).toContain('Solicitud de devolucion');
    expect(d.lineasDeAnalisis.join(' ')).toContain('negativa');
  });

  it('acto todavia no definitivo y sin ejecucion: ninguna via, y lo dice', () => {
    const d = diagnosticoDe({
      autoridad: op('sat'),
      tipo_acto: op('acta_o_requerimiento'),
      procedimiento_ejecucion: op('no'),
      es_multa: op('no'),
      es_determinacion_contribuciones: op('no'),
      es_negativa_devolucion: op('no'),
      existe_pama: op('no'),
      hay_resolucion_definitiva: op('no'),
    });
    expect(d.vias).toEqual([]);
    expect(d.plazosPorVerificar).toEqual([]);
    expect(d.informacionFaltante.join(' ')).toContain('no se identifico un acto que ya admita impugnacion');
    expect(d.lineasDeAnalisis.join(' ')).toContain('Caracter definitivo del acto');
  });
});

describe('lo que no se sabe se declara, no se supone', () => {
  it('sin autoridad no orienta y lo dice', () => {
    const d = diagnosticoDe({});
    expect(d.vias).toEqual([]);
    expect(d.informacionFaltante.join(' ')).toContain('No se identifico la autoridad');
    expect(d.urgencia).toBe('por_definir');
  });

  it('sin fecha de notificacion no mide el tiempo ni finge medirlo', () => {
    const d = diagnosticoDe({ autoridad: op('sat'), tipo_acto: op('multa') });
    expect(d.diasNaturalesDesdeNotificacion).toBeNull();
    expect(d.informacionFaltante.join(' ')).toContain('No se capturo la fecha de notificacion');
  });

  it('con fecha y dia de referencia informa dias transcurridos como dato, no como plazo', () => {
    const d = diagnosticoDe(
      {
        autoridad: op('sat'),
        tipo_acto: op('multa'),
        fecha_notificacion: { tipo: 'fecha', valor: '2026-09-01' },
      },
      '2026-09-12',
    );
    expect(d.diasNaturalesDesdeNotificacion).toBe(11);
    expect(d.advertencias.join(' ')).toContain('Aqui no se fija ninguna fecha de vencimiento');
  });

  it('una notificacion vieja sube la urgencia sin decir cuanto plazo queda', () => {
    const d = diagnosticoDe(
      {
        autoridad: op('sat'),
        tipo_acto: op('multa'),
        procedimiento_ejecucion: op('no'),
        fecha_notificacion: { tipo: 'fecha', valor: '2026-06-01' },
      },
      '2026-09-12',
    );
    expect(d.urgencia).toBe('alta');
  });

  it('cada "no lo se" que importa aparece en la informacion faltante', () => {
    const d = diagnosticoDe({ autoridad: op('sat'), tipo_acto: op('otro') });
    const texto = d.informacionFaltante.join(' ');
    for (const esperado of [
      'credito fiscal',
      'procedimiento administrativo de ejecucion',
      'visita domiciliaria',
      'materia aduanera',
      'resolucion definitiva',
      'multa',
      'devolucion',
    ]) {
      expect(texto).toContain(esperado);
    }
  });

  it('armarDiagnostico funciona con respuestas parciales y declara el resto', () => {
    const d = armarDiagnostico(CUESTIONARIO, { autoridad: op('imss') });
    expect(d.informacionFaltante.length).toBeGreaterThan(0);
    expect(d.version).toBe(CUESTIONARIO.version);
  });
});

/**
 * Barrido de ramas. Recorre el arbol con combinaciones deterministas y revisa que
 * ninguna salida prometa resultado, que ninguna cite preceptos o plazos concretos y
 * que todo identificador de regla exista en el corpus del motor de plazos.
 */
describe('barrido de todas las combinaciones razonables', () => {
  const AUTORIDADES = ['sat', 'aduanas', 'imss', 'infonavit', 'fiscal_estatal', 'otra_federal', null];
  const TIPOS = [
    'determinacion_contribuciones', 'multa', 'negativa_devolucion', 'acta_o_requerimiento',
    'resolucion_de_recurso', 'cobro_o_ejecucion', 'otro', null,
  ];
  const FECHAS = ['2026-01-15', '2026-06-01', '2026-09-01'];
  const MONTOS = [0, 5000, 1250000.75];

  function azarDesde(semilla: number): () => number {
    let s = semilla >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function caso(autoridad: string | null, tipo: string | null, azar: () => number): Diagnostico {
    const respuestas: Respuestas = {};
    for (let i = 0; i < 60; i++) {
      const p = siguientePregunta(CUESTIONARIO, respuestas);
      if (p === null) break;
      if (p.id === 'autoridad') {
        respuestas[p.id] = autoridad === null ? NO_SE : op(autoridad);
      } else if (p.id === 'tipo_acto') {
        respuestas[p.id] = tipo === null ? NO_SE : op(tipo);
      } else if (p.tipo === 'fecha') {
        const f = FECHAS[Math.min(FECHAS.length - 1, Math.floor(azar() * FECHAS.length))]!;
        respuestas[p.id] = azar() < 0.25 ? NO_SE : { tipo: 'fecha', valor: f };
      } else if (p.tipo === 'monto') {
        const m = MONTOS[Math.min(MONTOS.length - 1, Math.floor(azar() * MONTOS.length))]!;
        respuestas[p.id] = azar() < 0.25 ? NO_SE : { tipo: 'monto', valor: m };
      } else {
        const opciones = p.opciones ?? [];
        const i2 = Math.min(opciones.length, Math.floor(azar() * (opciones.length + 1)));
        const elegida = opciones[i2];
        respuestas[p.id] = elegida === undefined ? NO_SE : op(elegida.valor);
      }
    }
    const paso = avanzar(CUESTIONARIO, respuestas, { hoy: '2026-09-12' });
    if (paso.estado !== 'diagnostico') throw new Error('Se esperaba el diagnostico y llego una pregunta.');
    return paso.diagnostico;
  }

  const diagnosticos: Diagnostico[] = [];
  let semilla = 20260912;
  for (const autoridad of AUTORIDADES) {
    for (const tipo of TIPOS) {
      for (let k = 0; k < 30; k++) {
        semilla += 7919;
        diagnosticos.push(caso(autoridad, tipo, azarDesde(semilla)));
      }
    }
  }

  it('el barrido cubre todas las ramas y produce vias en varias de ellas', () => {
    expect(diagnosticos.length).toBe(AUTORIDADES.length * TIPOS.length * 30);
    expect(diagnosticos.filter((d) => d.vias.length > 0).length).toBeGreaterThan(100);
  });

  it('ninguna salida promete un resultado', () => {
    for (const d of diagnosticos) {
      expect(frasesProhibidasEn(JSON.stringify(d))).toEqual([]);
    }
  });

  it('ninguna salida cita preceptos, tesis ni plazos concretos', () => {
    const prohibidos = [
      /\bart[ií]culos?\b/i,
      /\bfracci[oó]n\b/i,
      /\btesis\b/i,
      /\bjurisprudencia/i,
      /\d+\s*(d[ií]as|meses|a[nñ]os)/i,
    ];
    for (const d of diagnosticos) {
      const texto = JSON.stringify(d);
      for (const patron of prohibidos) expect(texto).not.toMatch(patron);
    }
  });

  it('todo identificador de regla devuelto existe en el corpus de reglas', () => {
    const usados = new Set<string>();
    for (const d of diagnosticos) {
      for (const v of d.vias) {
        expect(IDS_REGLAS.has(v.reglaPlazoId)).toBe(true);
        usados.add(v.reglaPlazoId);
      }
      for (const id of d.plazosPorVerificar) expect(IDS_REGLAS.has(id)).toBe(true);
      expect(d.plazosPorVerificar).toEqual([...new Set(d.vias.map((v) => v.reglaPlazoId))]);
    }
    expect([...usados].sort()).toEqual([
      'cff-121', 'lamp-17', 'ley-aduanera-150', 'ley-aduanera-155', 'lfpa-85', 'lfpca-13-I-a', 'rri-6',
    ]);
  });

  it('toda via viene con lo que hay que verificar antes de usarla', () => {
    for (const d of diagnosticos) {
      for (const v of d.vias) {
        expect(v.requiereVerificar.length).toBeGreaterThan(0);
        expect(v.requiereVerificar.join(' ')).toContain('motor de plazos');
      }
      expect(d.advertencias.length).toBeGreaterThan(0);
      expect(d.documentos.length).toBeGreaterThan(0);
      expect(d.lineasDeAnalisis.length).toBeGreaterThan(0);
    }
  });
});
