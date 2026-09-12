import { describe, expect, it } from 'vitest';

import {
  CORPUS_CREDITO, INDICE, MESES_DEL_TOPE, SERIE_INPC, aCentavos, analizar, desgloseCuadra,
  estimar, mesesOFraccion, pesos, tasaMoraMensual,
} from '../src/credito/index.js';
import type { ActoExpediente, EntradaCredito } from '../src/credito/index.js';

/**
 * Pruebas del modulo de credito fiscal.
 *
 * Lo que se prueba aqui no es que el motor calcule, sino que se niegue a calcular
 * cuando le falta un dato, y que no concluya nada que la ley no le permita concluir.
 */

const BASE: EntradaCredito = {
  concepto: 'Impuesto sobre la renta del ejercicio, determinado en la resolucion',
  ejercicio: 2026,
  importeOriginal: aCentavos('100000.00'),
  fechaExigibilidad: '2026-07-15',
  fechaCalculo: '2026-09-30',
};

describe('tasa de recargos: formula, no constante capturada', () => {
  it('la tasa de mora de 2026 da 2.07 por ciento mensual', () => {
    // 1.38 por ciento de prorroga del articulo 11 de la Ley de Ingresos de 2026,
    // incrementado en cincuenta por ciento conforme al articulo 21 del Codigo Fiscal.
    expect(tasaMoraMensual(1.38)).toBe(2.07);
  });

  it('la tasa de mora se deriva de la tasa de prorroga cargada, no de una cifra escrita', () => {
    const tabla = CORPUS_CREDITO.tasasDe(2026);
    expect(tabla).toBeDefined();
    expect(tabla!.tasasMensuales.prorroga).toBe(1.38);
    // La cifra 2.07 no aparece en ningun archivo de datos del corpus.
    expect(JSON.stringify(tabla)).not.toContain('2.07');
    expect(tasaMoraMensual(tabla!.tasasMensuales.prorroga)).toBe(2.07);
  });

  it('sube a la centesima inmediata superior cuando la milesima es cinco o mayor', () => {
    // Aritmetica de la formula, no tasas reales de ningun ejercicio.
    expect(tasaMoraMensual(1.47)).toBe(2.21); // 2.205 sube
    expect(tasaMoraMensual(0.75)).toBe(1.13); // 1.125 sube
    expect(tasaMoraMensual(0.99)).toBe(1.49); // 1.485 sube
  });

  it('conserva la centesima cuando la milesima es menor a cinco', () => {
    expect(tasaMoraMensual(1.46)).toBe(2.19); // 2.190 se conserva
    expect(tasaMoraMensual(1.38)).toBe(2.07); // 2.070 se conserva
    expect(tasaMoraMensual(0.76)).toBe(1.14); // 1.140 se conserva
  });

  it('rechaza una tasa con mas de dos decimales, porque el articulo 21 razona a la centesima', () => {
    expect(() => tasaMoraMensual(1.383)).toThrow(/centesima/);
  });
});

describe('las cuatro tasas del articulo 11 de la Ley de Ingresos de 2026', () => {
  it('estan cargadas como dato, con su fraccion', () => {
    const tabla = CORPUS_CREDITO.tasasDe(2026)!;
    expect(tabla.tasasMensuales.prorroga).toBe(1.38);
    expect(tabla.tasasMensuales.parcialidadesHastaDoceMeses).toBe(1.42);
    expect(tabla.tasasMensuales.parcialidadesDeMasDeDoceYHastaVeinticuatroMeses).toBe(1.63);
    expect(tabla.tasasMensuales.parcialidadesSuperioresAVeinticuatroMesesYPagoDiferido).toBe(1.97);
    expect(tabla.fundamento.articulo).toBe('11');
    expect(tabla.fundamento.archivo).toBe('LIF_2026.pdf');
  });
});

describe('dinero en centavos enteros', () => {
  it('convierte pesos escritos a centavos sin pasar por flotantes', () => {
    expect(aCentavos('1234.56')).toBe(123456);
    expect(aCentavos('0.07')).toBe(7);
    expect(aCentavos('100000')).toBe(10000000);
    expect(aCentavos('$1,234.50')).toBe(123450);
  });

  it('rechaza lo que no es un importe en pesos', () => {
    expect(() => aCentavos('1234.567')).toThrow(/Importe invalido/);
    expect(() => aCentavos('mil pesos')).toThrow(/Importe invalido/);
  });

  it('imprime el importe igual en cualquier maquina', () => {
    expect(pesos(123456)).toBe('$1,234.56');
    expect(pesos(7)).toBe('$0.07');
    expect(pesos(-123456)).toBe('-$1,234.56');
  });
});

describe('meses o fraccion del sexto parrafo del articulo 21', () => {
  it('un solo dia de retraso ya es un mes', () => {
    expect(mesesOFraccion('2026-07-15', '2026-07-16')).toBe(1);
  });
  it('un mes exacto es un mes', () => {
    expect(mesesOFraccion('2026-07-15', '2026-08-15')).toBe(1);
  });
  it('un mes y un dia son dos meses', () => {
    expect(mesesOFraccion('2026-07-15', '2026-08-16')).toBe(2);
  });
  it('el mismo dia no causa recargos', () => {
    expect(mesesOFraccion('2026-07-15', '2026-07-15')).toBe(0);
  });
});

describe('el indice de precios: solo tres meses verificados', () => {
  it('el corpus tiene exactamente los tres valores verificados y ningun otro', () => {
    expect(INDICE.mesesCargados).toEqual(['2026-06', '2026-07', '2026-08']);
    expect(INDICE.valor('2026-06')?.valor).toBe(145.131);
    expect(INDICE.valor('2026-07')?.valor).toBe(145.169);
    expect(INDICE.valor('2026-08')?.valor).toBe(145.462);
    expect(SERIE_INPC.valores).toHaveLength(3);
  });

  it('declara que el emisor legal es el Instituto Nacional de Estadistica y Geografia', () => {
    expect(SERIE_INPC.emisorLegal).toBe('Instituto Nacional de Estadistica y Geografia');
    expect(SERIE_INPC.publicacionQueSurteEfectos).toBe('Diario Oficial de la Federacion');
    expect(SERIE_INPC.replicador).toBe('Banco de Mexico');
    // Por replicar y no publicar, cada valor entra como nivel B.
    expect(INDICE.nivelMinimo).toBe('B');
  });

  it('toma el mes anterior al mas reciente y el mes anterior al mas antiguo, no los del periodo', () => {
    const r = INDICE.factor('2026-07', '2026-09');
    expect(r.estado).toBe('calculado');
    if (r.estado !== 'calculado') return;
    expect(r.factor.mesAnteriorAlMasAntiguo).toBe('2026-06');
    expect(r.factor.mesAnteriorAlMasReciente).toBe('2026-08');
    expect(r.factor.factor).toBeCloseTo(145.462 / 145.131, 12);
  });

  it('no actualiza por fracciones de mes', () => {
    const r = INDICE.factor('2026-07', '2026-07');
    expect(r.estado).toBe('sin_actualizacion');
  });
});

describe('la falta de indice devuelve insuficiente sin cifra', () => {
  it('nombra el mes que falta y no devuelve ninguna cifra de actualizacion', () => {
    // Periodo de agosto a octubre: necesita el indice de septiembre, que no esta.
    const r = estimar({ ...BASE, fechaExigibilidad: '2026-08-10', fechaCalculo: '2026-10-20' });
    expect(r.confianza).toBe('insuficiente');
    expect(r.desglose.actualizacion).toBeNull();
    expect(r.desglose.recargos).toBeNull();
    expect(r.desglose.saldo).toBeNull();
    expect(r.detalle.principalActualizado).toBeNull();
    expect(r.faltantes.join(' ')).toContain('septiembre de 2026');
  });

  it('nombra los dos meses cuando faltan los dos', () => {
    const r = estimar({ ...BASE, fechaExigibilidad: '2027-01-15', fechaCalculo: '2027-06-30' });
    expect(r.confianza).toBe('insuficiente');
    expect(r.desglose.saldo).toBeNull();
    expect(r.faltantes.join(' ')).toContain('diciembre de 2026');
    expect(r.faltantes.join(' ')).toContain('mayo de 2027');
  });

  it('no cuela ninguna cifra de actualizacion, de recargos ni de saldo en la traza', () => {
    const r = estimar({ ...BASE, fechaExigibilidad: '2026-08-10', fechaCalculo: '2026-10-20' });
    for (const paso of r.traza) {
      if (paso.concepto === 'entrada del expediente') continue;
      expect(paso.importe).toBeUndefined();
    }
    expect(r.detalle.factor).toBeNull();
    expect(r.detalle.periodoRecargos).toBeNull();
    expect(r.detalle.tasaMensualAplicada).toBeNull();
  });

  it('con tres valores cargados, la mayoria de los periodos de 2026 se queda sin cifra', () => {
    let insuficientes = 0;
    let conCifra = 0;
    for (let mes = 1; mes <= 12; mes++) {
      const exigible = `2026-${String(mes).padStart(2, '0')}-15`;
      const r = estimar({ ...BASE, fechaExigibilidad: exigible, fechaCalculo: '2026-12-31' });
      if (r.confianza === 'insuficiente') insuficientes++;
      else conCifra++;
    }
    expect(insuficientes).toBeGreaterThan(conCifra);
  });

  it('explica que no aplica por su cuenta el segundo parrafo del articulo 17-A', () => {
    const r = estimar({ ...BASE, fechaExigibilidad: '2026-08-10', fechaCalculo: '2026-10-20' });
    expect(r.faltantes.join(' ')).toContain('ultimo indice mensual publicado');
  });
});

describe('la falta de tasa de un ejercicio tambien detiene el calculo', () => {
  it('nombra el ejercicio que falta', () => {
    // El periodo de mora entra a 2027 y solo esta cargado 2026.
    const r = estimar({ ...BASE, fechaExigibilidad: '2026-07-15', fechaCalculo: '2027-02-10' });
    expect(r.confianza).toBe('insuficiente');
    expect(r.desglose.recargos).toBeNull();
    expect(r.desglose.saldo).toBeNull();
    expect(r.faltantes.join(' ')).toContain('2027');
  });
});

describe('el desglose cuadra', () => {
  const entrada: EntradaCredito = {
    ...BASE,
    multas: [{ concepto: 'Multa por declaracion presentada a requerimiento', importe: aCentavos('5000.00') }],
    pagos: [{ fecha: '2026-09-01', importe: aCentavos('20000.00'), concepto: 'Pago parcial' }],
  };

  it('saldo es principal mas actualizacion mas recargos mas multas menos pagos', () => {
    const r = estimar(entrada);
    expect(r.confianza).toBe('parcial');
    expect(r.desglose.saldo).not.toBeNull();
    expect(desgloseCuadra(r.desglose)).toBe(true);
    const d = r.desglose;
    expect(d.saldo).toBe(d.principal! + d.actualizacion! + d.recargos! + d.multas - d.pagos);
  });

  it('los seis renglones vienen separados y ninguno se colapsa en el total', () => {
    const r = estimar(entrada);
    expect(r.desglose.principal).toBe(aCentavos('100000.00'));
    expect(r.desglose.multas).toBe(aCentavos('5000.00'));
    expect(r.desglose.pagos).toBe(aCentavos('20000.00'));
    expect(r.desglose.actualizacion).toBeGreaterThan(0);
    expect(r.desglose.recargos).toBeGreaterThan(0);
  });

  it('cuadra en importes, fechas y tipos de recargo distintos', () => {
    const importes = ['0.01', '1.00', '999.99', '100000.00', '87654321.09'];
    const fechas: [string, string][] = [
      ['2026-07-01', '2026-09-30'],
      ['2026-07-15', '2026-09-01'],
      ['2026-07-31', '2026-09-15'],
    ];
    const tipos = ['mora', 'prorroga', 'parcialidadesHastaDoceMeses'] as const;
    let probados = 0;
    for (const importe of importes) {
      for (const [desde, hasta] of fechas) {
        for (const tipo of tipos) {
          const r = estimar({
            ...BASE,
            importeOriginal: aCentavos(importe),
            fechaExigibilidad: desde,
            fechaCalculo: hasta,
            tipoRecargo: tipo,
          });
          expect(desgloseCuadra(r.desglose)).toBe(true);
          if (r.desglose.saldo !== null) probados++;
        }
      }
    }
    expect(probados).toBeGreaterThan(0);
  });

  it('los recargos se calculan sobre el principal actualizado y no sobre las multas', () => {
    const sinMulta = estimar(BASE);
    const conMulta = estimar({
      ...BASE,
      multas: [{ concepto: 'Multa de forma', importe: aCentavos('50000.00') }],
    });
    expect(conMulta.desglose.recargos).toBe(sinMulta.desglose.recargos);
  });

  it('el tope de cinco anios deja meses fuera y lo declara', () => {
    // Periodo largo dentro del unico ejercicio con tasa cargada no es posible, asi que
    // se prueba el tope directamente sobre la constante y el conteo de meses.
    expect(MESES_DEL_TOPE).toBe(60);
    expect(mesesOFraccion('2026-01-01', '2032-01-01')).toBeGreaterThan(MESES_DEL_TOPE);
  });
});

describe('todo resultado viene sellado como estimacion', () => {
  it('el sello vive en el tipo de retorno, no en la pantalla', () => {
    const conCifra = estimar(BASE);
    const sinCifra = estimar({ ...BASE, fechaExigibilidad: '2026-08-10', fechaCalculo: '2026-10-20' });
    for (const r of [conCifra, sinCifra]) {
      expect(r.clase).toBe('ESTIMACION');
      expect(r.leyenda).toContain('ESTIMACION');
      expect(r.leyenda).toContain('no es determinacion oficial');
    }
  });
});

describe('el submodulo de prescripcion jamas concluye prescripcion por si solo', () => {
  const exigible = '2010-01-15';
  const hoy = '2026-09-12';

  it('con dieciseis anios corridos y ningun acto registrado, no concluye prescripcion', () => {
    const a = analizar({ fechaExigibilidad: exigible, fechaCalculo: hoy, lineaDeTiempo: [] });
    expect(a.conclusion).toBe('requiere_verificacion_de_actos_interruptores');
    expect(a.prescripcion.conclusion).toBe('requiere_verificacion_de_actos_interruptores');
    expect(a.prescripcion.aniosNaturalesCorridos).toBeGreaterThan(5);
    expect(a.prescripcion.requiereVerificar.length).toBeGreaterThan(0);
    // Ninguna parte de la salida afirma que el credito prescribio. Las advertencias
    // se revisan aparte porque ahi si aparece el verbo, dentro de la prohibicion.
    const afirmaciones = [
      a.conclusion,
      a.prescripcion.conclusion,
      a.caducidad.conclusion,
      ...a.traza.map((p) => p.detalle),
      ...a.prescripcion.requiereVerificar,
      ...a.caducidad.requiereVerificar,
    ]
      .join(' ')
      .toLowerCase();
    for (const frase of ['prescribio', 'esta prescrito', 'opera la prescripcion', 'ya caduco']) {
      expect(afirmaciones).not.toContain(frase);
    }
    // Y en las advertencias el verbo solo puede aparecer negado.
    expect(a.advertencias.join(' ')).toContain('Prohibido concluir que un credito prescribio');
  });

  it('no existe entrada alguna que le saque otra conclusion', () => {
    const combinaciones: ActoExpediente[][] = [
      [],
      [{ tipo: 'exigibilidad', fecha: exigible, descripcion: 'El pago pudo ser legalmente exigido' }],
      [{ tipo: 'requerimiento_de_pago', fecha: '2011-03-01', descripcion: 'Requerimiento', notificadoAlDeudor: 'no' }],
      [{ tipo: 'requerimiento_de_pago', fecha: '2011-03-01', descripcion: 'Requerimiento', notificadoAlDeudor: 'si' }],
      [{ tipo: 'otro', fecha: '2012-01-01', descripcion: 'Acto que el modulo no clasifica' }],
    ];
    for (const linea of combinaciones) {
      for (const fecha of ['2010-01-16', '2016-01-16', '2040-01-16']) {
        const a = analizar({ fechaExigibilidad: exigible, fechaCalculo: fecha, lineaDeTiempo: linea });
        expect(a.conclusion).toBe('requiere_verificacion_de_actos_interruptores');
        expect(a.caducidad.conclusion).toBe('requiere_verificacion_de_actos_interruptores');
      }
    }
  });

  it('lista cuales de los actos registrados podrian interrumpir o suspender el plazo', () => {
    const linea: ActoExpediente[] = [
      { tipo: 'notificacion_del_credito', fecha: '2010-02-01', descripcion: 'Notificacion de la resolucion determinante', notificadoAlDeudor: 'si', constaEn: 'Foja 12' },
      { tipo: 'requerimiento_de_pago', fecha: '2012-05-10', descripcion: 'Requerimiento de pago', notificadoAlDeudor: 'no_consta' },
      { tipo: 'embargo', fecha: '2014-08-20', descripcion: 'Embargo de cuentas', notificadoAlDeudor: 'si', constaEn: 'Foja 44' },
      { tipo: 'juicio', fecha: '2015-01-10', descripcion: 'Juicio de nulidad', fechaFin: '2017-06-30' },
      { tipo: 'pago', fecha: '2018-03-01', descripcion: 'Pago parcial' },
      { tipo: 'nacimiento_del_credito', fecha: '2009-12-31', descripcion: 'Se causo la contribucion' },
    ];
    const a = analizar({ fechaExigibilidad: exigible, fechaCalculo: hoy, lineaDeTiempo: linea });

    const tipos = a.prescripcion.actosConEfectoPosible.map((x) => x.acto.tipo);
    expect(tipos).toContain('notificacion_del_credito');
    expect(tipos).toContain('requerimiento_de_pago');
    expect(tipos).toContain('embargo');
    expect(tipos).toContain('pago');
    expect(tipos).toContain('juicio');
    // El nacimiento del credito no interrumpe nada y se declara sin efecto atribuido.
    expect(tipos).not.toContain('nacimiento_del_credito');
    expect(a.actosSinEfectoAtribuido.map((x) => x.tipo)).toContain('nacimiento_del_credito');

    // Cada acto listado trae escrito lo que hay que verificar. Nada se da por probado.
    for (const acto of a.prescripcion.actosConEfectoPosible) {
      expect(acto.requiereVerificar.length).toBeGreaterThan(0);
      expect(acto.fundamento.ordenamiento).toBe('Codigo Fiscal de la Federacion');
    }

    const conNoConsta = a.prescripcion.actosConEfectoPosible.find(
      (x) => x.acto.notificadoAlDeudor === 'no_consta',
    );
    expect(conNoConsta!.requiereVerificar.join(' ')).toContain('No consta');
  });

  it('el embargo y los actos de ejecucion se leen como gestion de cobro del articulo 146', () => {
    const a = analizar({
      fechaExigibilidad: exigible,
      fechaCalculo: hoy,
      lineaDeTiempo: [
        { tipo: 'acto_del_procedimiento_administrativo_de_ejecucion', fecha: '2013-01-01', descripcion: 'Mandamiento de ejecucion', notificadoAlDeudor: 'si' },
      ],
    });
    const acto = a.prescripcion.actosConEfectoPosible[0]!;
    expect(acto.efectoPosible).toBe('interrupcion');
    expect(acto.fundamento.articulo).toBe('146');
  });

  it('la suspension del procedimiento de ejecucion se lee como suspension, no como interrupcion', () => {
    const a = analizar({
      fechaExigibilidad: exigible,
      fechaCalculo: hoy,
      lineaDeTiempo: [
        { tipo: 'suspension_del_procedimiento_administrativo_de_ejecucion', fecha: '2013-01-01', descripcion: 'Suspension por garantia del interes fiscal', fechaFin: '2015-01-01' },
      ],
    });
    expect(a.prescripcion.actosConEfectoPosible[0]!.efectoPosible).toBe('suspension');
  });

  it('la caducidad no mide tiempo si no se da la fecha de inicio, porque depende del articulo 67', () => {
    const sin = analizar({ fechaExigibilidad: exigible, fechaCalculo: hoy, lineaDeTiempo: [] });
    expect(sin.caducidad.diasNaturalesCorridos).toBeNull();
    expect(sin.caducidad.fechaDeReferenciaSinInterrupciones).toBeNull();
    expect(sin.caducidad.requiereVerificar.join(' ')).toContain('fraccion');

    const con = analizar({
      fechaExigibilidad: exigible,
      fechaCalculo: hoy,
      lineaDeTiempo: [],
      fechaInicioCaducidad: '2011-04-01',
    });
    expect(con.caducidad.diasNaturalesCorridos).toBeGreaterThan(0);
    expect(con.caducidad.plazoAnios).toBe(5);
  });

  it('el plazo ampliado de diez anios solo aplica cuando se declara', () => {
    const a = analizar({
      fechaExigibilidad: exigible,
      fechaCalculo: hoy,
      lineaDeTiempo: [],
      fechaInicioCaducidad: '2011-04-01',
      caducidadAmpliada: true,
    });
    expect(a.caducidad.plazoAnios).toBe(10);
    expect(a.caducidad.fechaDeReferenciaSinInterrupciones).toBe('2021-04-01');
  });

  it('advierte que el catalogo de suspensiones de la caducidad esta incompleto', () => {
    const a = analizar({ fechaExigibilidad: exigible, fechaCalculo: hoy, lineaDeTiempo: [] });
    expect(a.caducidad.requiereVerificar.join(' ')).toContain('articulo 67 enumera mas supuestos');
  });

  it('el analisis viaja dentro de la estimacion cuando la entrada trae linea de tiempo', () => {
    const r = estimar({
      ...BASE,
      lineaDeTiempo: [
        { tipo: 'requerimiento_de_pago', fecha: '2026-08-01', descripcion: 'Requerimiento', notificadoAlDeudor: 'si' },
      ],
    });
    expect(r.extincion).not.toBeNull();
    expect(r.extincion!.conclusion).toBe('requiere_verificacion_de_actos_interruptores');
    expect(estimar(BASE).extincion).toBeNull();
  });
});

describe('la traza dice de donde sale cada cifra', () => {
  it('cada paso lleva su detalle y los pasos de derecho llevan fundamento', () => {
    const r = estimar({
      ...BASE,
      multas: [{ concepto: 'Multa', importe: aCentavos('5000.00'), fechaExigibilidad: '2026-07-15' }],
      pagos: [{ fecha: '2026-09-01', importe: aCentavos('1000.00'), concepto: 'Pago parcial' }],
    });
    expect(r.traza.length).toBeGreaterThanOrEqual(7);
    for (const paso of r.traza) {
      expect(paso.detalle.length).toBeGreaterThan(0);
      expect(paso.concepto.length).toBeGreaterThan(0);
    }
    const conFundamento = r.traza.filter((p) => p.fundamento !== undefined);
    expect(conFundamento.length).toBeGreaterThanOrEqual(4);
  });

  it('cada fuente trae ordenamiento, articulo, publicacion y archivo del acervo', () => {
    const r = estimar(BASE);
    expect(r.fuentes.length).toBeGreaterThan(0);
    for (const f of r.fuentes) {
      expect(f.ordenamiento.length).toBeGreaterThan(0);
      expect(f.articulo.length).toBeGreaterThan(0);
      expect(f.publicacion.length).toBeGreaterThan(0);
      expect(f.archivo.length).toBeGreaterThan(0);
    }
  });

  it('declara que el factor se aplica sin redondear, porque no hay regla cargada', () => {
    const r = estimar(BASE);
    expect(r.advertencias.join(' ')).toContain('sin redondear');
    expect(r.faltantes.join(' ')).toContain('decimales del factor');
  });

  it('la traza escribe el digito de la milesima que decidio el ajuste de la tasa', () => {
    const r = estimar(BASE);
    const paso = r.traza.find((p) => p.concepto === 'recargos mes a mes');
    expect(paso!.detalle).toContain('2.07');
    expect(paso!.detalle).toContain('milesima');
  });
});

describe('validacion de la entrada', () => {
  it('rechaza una fecha de calculo anterior a la exigibilidad', () => {
    expect(() => estimar({ ...BASE, fechaCalculo: '2026-01-01' })).toThrow(/anterior a la fecha de exigibilidad/);
  });
  it('rechaza un importe que no viene en centavos enteros', () => {
    expect(() => estimar({ ...BASE, importeOriginal: 1234.5 })).toThrow(/centavos enteros/);
  });
  it('rechaza una fecha que no existe', () => {
    expect(() => estimar({ ...BASE, fechaExigibilidad: '2026-02-30' })).toThrow(/Fecha invalida/);
  });
});
