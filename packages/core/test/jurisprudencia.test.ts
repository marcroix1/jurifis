import { describe, expect, it } from 'vitest';
import {
  ACERVO, CRITERIOS, CitasBloqueadas, DIMENSION_EMBEDDING, ETAPAS_INGESTA, EntradaIncompleta,
  EtiquetaIndebida, HuellaAlterada, OrigenNoOficial, RevisionFaltante, TIPOS_CRITERIO,
  TipoCriterioInvalido, acervoVacio, buscarCriterios, buscarPorRegistro, esJurisprudencia,
  esTipoCriterio, estadoAcervo, etiquetarComo, exigirCitasVerificadas, exigirJurisprudencia,
  exigirTipoCriterio, extraerCitas, huellaDeCriterio, ingerir, normalizar, proyectarAcervo,
  publicar, recibir, registrosCitados, revisar, revisarCitas, sha256, validarAcervo,
} from '../src/jurisprudencia/index.js';
import type {
  Criterio, CriterioRevisado, EntradaOrigen, Revision,
} from '../src/jurisprudencia/index.js';

/**
 * Entrada de origen para las pruebas de la tuberia.
 *
 * El contenido es deliberadamente ficticio y se declara como tal: no hay ningun
 * rubro, registro digital ni epoca reales en este archivo. La prueba comprueba
 * el mecanismo, no el derecho, y el acervo del producto sigue vacio.
 */
function entradaDePrueba(cambios: Partial<EntradaOrigen> = {}): EntradaOrigen {
  return {
    origen: 'tfja',
    documento: 'Documento ficticio de prueba, sin valor juridico.',
    consultadoEl: '2026-09-12',
    nivelFuente: 'A',
    tipoCriterio: 'tesis_aislada',
    rubro: 'RUBRO FICTICIO DE PRUEBA. NO CORRESPONDE A NINGUN CRITERIO REAL.',
    texto: 'Texto ficticio de prueba, escrito solo para ejercitar la tuberia de ingesta.',
    ...cambios,
  };
}

const revisionDePrueba = (huella: string): Revision => ({
  revisadoPor: 'Abogada responsable de prueba',
  revisadoEl: '2026-09-12',
  nota: 'Contrastado contra el documento ficticio de la prueba.',
  huellaRevisada: huella,
});

describe('acervo vacio, y declarado', () => {
  it('carga sin criterios y lo dice', () => {
    expect(CRITERIOS).toHaveLength(0);
    expect(acervoVacio()).toBe(true);
    expect(ACERVO.criterios).toEqual([]);
  });

  it('declara de donde tendran que venir los criterios', () => {
    const claves = ACERVO.origenes.map((o) => o.clave);
    expect(claves).toContain('scjn');
    expect(claves).toContain('semanario');
    expect(claves).toContain('tfja');
    const nombres = ACERVO.origenes.map((o) => o.nombre).join(' | ');
    expect(nombres).toContain('Suprema Corte de Justicia de la Nación');
    expect(nombres).toContain('Semanario Judicial de la Federación');
    expect(nombres).toContain('Tribunal Federal de Justicia Administrativa');
  });

  it('declara que hace falta para cargar el primero', () => {
    expect(ACERVO.requisitosDeCarga.length).toBeGreaterThan(0);
    expect(ACERVO.notas.join(' ')).toContain('vacío');
  });

  it('el estado del acervo no inventa facetas', () => {
    const estado = estadoAcervo();
    expect(estado.vacio).toBe(true);
    expect(estado.criteriosCargados).toBe(0);
    expect(estado.criteriosVerificados).toBe(0);
    expect(estado.facetas).toEqual({ tipos: [], organos: [], epocas: [], materias: [] });
  });

  it('rechaza un acervo con un criterio sin revision humana', () => {
    const errores = validarAcervo({
      ...ACERVO,
      criterios: [{ ...(entradaDePrueba() as unknown as Criterio), verificado: false }],
    });
    expect(errores.join(' ')).toContain('verificado en falso');
    expect(errores.join(' ')).toContain('revisadoPor');
  });
});

describe('el buscador con el acervo vacio', () => {
  it('devuelve cero coincidencias sin romperse', () => {
    const r = buscarCriterios({ texto: 'caducidad de facultades de comprobacion' });
    expect(r.total).toBe(0);
    expect(r.coincidencias).toEqual([]);
    expect(r.acervo.vacio).toBe(true);
    expect(r.acervo.criteriosCargados).toBe(0);
  });

  it('dice por que no hay resultados y que no los inventa', () => {
    const r = buscarCriterios({ texto: 'nulidad lisa y llana' });
    const dicho = r.advertencias.join(' ');
    expect(dicho).toContain('ningun criterio cargado');
    expect(dicho).toContain('no completa el vacio');
    expect(r.faltantes.length).toBeGreaterThan(0);
  });

  it('no falla con la consulta vacia ni con filtros', () => {
    expect(() => buscarCriterios()).not.toThrow();
    const r = buscarCriterios({ tipos: ['jurisprudencia'], organo: 'cualquiera', limite: 5 });
    expect(r.total).toBe(0);
    expect(r.consulta.limite).toBe(5);
  });

  it('la busqueda por registro digital devuelve nulo, nunca un parecido', () => {
    expect(buscarPorRegistro('2029459')).toBeNull();
    const r = buscarCriterios({ registroDigital: '2029459' });
    const registro = r.estrategias.find((e) => e.clave === 'registro_digital');
    expect(registro?.estado).toBe('aplicada');
    expect(registro?.coincidencias).toBe(0);
  });

  it('declara el hueco de la busqueda por significado en lugar de simularla', () => {
    const semantica = buscarCriterios({ texto: 'algo' }).estrategias.find(
      (e) => e.clave === 'significado',
    );
    expect(semantica?.estado).toBe('no_disponible');
    expect(semantica?.detalle).toContain('no la simula');
    expect(DIMENSION_EMBEDDING).toBe(1536);
  });

  it('normaliza limites disparatados en lugar de confiar en ellos', () => {
    expect(buscarCriterios({ limite: 10_000 }).consulta.limite).toBe(100);
    expect(buscarCriterios({ limite: 0 }).consulta.limite).toBe(1);
    expect(buscarCriterios({ desplazamiento: -5 }).consulta.desplazamiento).toBe(0);
  });
});

describe('guardian de citas', () => {
  it('bloquea un registro digital inventado', () => {
    const texto =
      'Sirve de apoyo la jurisprudencia con registro digital 2029459, aplicable al caso.';
    const revision = revisarCitas(texto);
    expect(revision.bloqueada).toBe(true);
    expect(revision.salida).toBeNull();
    expect(revision.incidentes).toHaveLength(1);
    expect(revision.incidentes[0]?.clase).toBe('registro_inexistente');
    expect(revision.incidentes[0]?.cita.valor).toBe('2029459');
  });

  it('no corrige: el remedio nunca es cambiar el numero', () => {
    const revision = revisarCitas('Registro digital 1234567.');
    expect(revision.incidentes[0]?.remedio).toContain('Nunca cambiar el numero');
    expect(revision.salida).toBeNull();
  });

  it('bloquea la salida completa, no el renglon', () => {
    const texto = [
      'Primer parrafo sin ninguna cita.',
      'Segundo parrafo con registro digital 9999999.',
      'Tercer parrafo sin ninguna cita.',
    ].join('\n');
    expect(revisarCitas(texto).salida).toBeNull();
    expect(() => exigirCitasVerificadas(texto)).toThrow(CitasBloqueadas);
  });

  it('caza varios registros citados en lista', () => {
    const texto = 'Registros digitales 2029459, 2029460 y 2029461.';
    const revision = revisarCitas(texto);
    expect(revision.citas.filter((c) => c.clase === 'registro_digital')).toHaveLength(3);
    expect(revision.incidentes).toHaveLength(3);
    expect(registrosCitados(texto)).toEqual(['2029459', '2029460', '2029461']);
  });

  it('bloquea la clave de una tesis que el acervo no tiene', () => {
    for (const clave of ['2a./J. 12/2020', 'VIII-P-1aS-123']) {
      const revision = revisarCitas(`Se invoca el criterio ${clave} del rubro que se cita.`);
      expect(revision.bloqueada).toBe(true);
      expect(revision.incidentes.some((i) => i.clase === 'clave_inexistente')).toBe(true);
    }
  });

  it('bloquea la invocacion de un criterio sin registro que lo ubique', () => {
    const revision = revisarCitas('Resulta aplicable la jurisprudencia de rubro que se transcribe.');
    expect(revision.bloqueada).toBe(true);
    expect(revision.incidentes[0]?.clase).toBe('cita_sin_registro');
  });

  it('deja pasar intacto el texto que no cita nada', () => {
    const texto = 'El acto se notifico el doce de septiembre y el plazo corre desde el habil siguiente.';
    const revision = revisarCitas(texto);
    expect(revision.bloqueada).toBe(false);
    expect(revision.salida).toBe(texto);
    expect(revision.citas).toHaveLength(0);
    expect(exigirCitasVerificadas(texto)).toBe(texto);
  });

  it('no confunde un titulo en mayusculas con un rubro, salvo que se le pida', () => {
    const texto = 'CONCEPTOS DE IMPUGNACION QUE SE HACEN VALER EN CONTRA DE LA RESOLUCION.';
    expect(revisarCitas(texto).bloqueada).toBe(false);
    expect(revisarCitas(texto, { detectarRubrosEnMayusculas: true }).bloqueada).toBe(true);
  });

  it('senala la posicion exacta de la cita en el texto', () => {
    const texto = 'Apoya lo anterior el registro digital 2029459.';
    const cita = extraerCitas(texto)[0];
    expect(cita).toBeDefined();
    expect(texto.slice(cita?.desde ?? 0, cita?.hasta ?? 0)).toBe('2029459');
  });
});

describe('enumeracion cerrada del tipo de criterio', () => {
  it('es identica a la de la base de datos', () => {
    expect([...TIPOS_CRITERIO]).toEqual([
      'jurisprudencia',
      'tesis_aislada',
      'precedente',
      'sentencia',
      'criterio_administrativo',
      'legislacion',
    ]);
  });

  it('no admite texto libre', () => {
    for (const invalido of ['jurisprudencia obligatoria', 'tesis', 'JURISPRUDENCIA', '', null, 7]) {
      expect(esTipoCriterio(invalido)).toBe(false);
      expect(() => exigirTipoCriterio(invalido)).toThrow(TipoCriterioInvalido);
    }
  });

  it('no deja etiquetar como jurisprudencia una tesis aislada', () => {
    const tesis = { tipoCriterio: 'tesis_aislada', registroDigital: '2029459' } as const;
    expect(esJurisprudencia(tesis)).toBe(false);
    expect(() => exigirJurisprudencia(tesis)).toThrow(EtiquetaIndebida);
    expect(() => etiquetarComo(tesis, 'jurisprudencia')).toThrow(/tesis aislada/);
    expect(() => etiquetarComo(tesis, 'jurisprudencia')).toThrow(/no el escrito que lo cita/);
  });

  it('tampoco deja el ascenso desde precedente ni desde criterio administrativo', () => {
    for (const tipo of ['precedente', 'sentencia', 'criterio_administrativo', 'legislacion'] as const) {
      expect(() => exigirJurisprudencia({ tipoCriterio: tipo })).toThrow(EtiquetaIndebida);
    }
  });

  it('deja pasar lo que si es jurisprudencia, sin tocarlo', () => {
    const criterio = { tipoCriterio: 'jurisprudencia' as const, rubro: 'RUBRO FICTICIO.' };
    expect(exigirJurisprudencia(criterio)).toBe(criterio);
  });
});

describe('huella del contenido', () => {
  it('coincide con los vectores conocidos de la norma', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('cambia con cualquier cambio del contenido', () => {
    const base = normalizar(recibir(entradaDePrueba()));
    const otro = normalizar(recibir(entradaDePrueba({ texto: 'Texto ficticio distinto.' })));
    expect(base.huella).not.toBe(otro.huella);
    expect(base.huella).toHaveLength(64);
  });
});

describe('tuberia de ingesta, cuatro etapas', () => {
  it('declara las cuatro etapas, con la tercera humana', () => {
    expect(ETAPAS_INGESTA.map((e) => e.clave)).toEqual([
      'origen_oficial',
      'normalizacion',
      'revision_humana',
      'publicacion_versionada',
    ]);
    expect(ETAPAS_INGESTA[2]?.humana).toBe(true);
  });

  it('etapa uno: rechaza el origen que no es oficial', () => {
    expect(() => recibir(entradaDePrueba({ origen: 'blog-de-un-despacho' }))).toThrow(OrigenNoOficial);
    expect(() => recibir(entradaDePrueba({ origen: 'buscador-de-internet' }))).toThrow(/no esta declarado/);
  });

  it('etapa uno: rechaza la entrada incompleta y el tipo fuera de la enumeracion', () => {
    expect(() => recibir(entradaDePrueba({ rubro: '   ' }))).toThrow(EntradaIncompleta);
    expect(() =>
      recibir(entradaDePrueba({ tipoCriterio: 'jurisprudencia obligatoria' as never })),
    ).toThrow(TipoCriterioInvalido);
  });

  it('etapa dos: normaliza el espaciado y no cambia el tipo declarado', () => {
    const n = normalizar(recibir(entradaDePrueba({ texto: '  Texto   con    espacios  ' })));
    expect(n.texto).toBe('Texto con espacios');
    expect(n.tipoCriterio).toBe('tesis_aislada');
    expect(n.huella).toBe(huellaDeCriterio(n));
  });

  it('etapa tres: no se puede publicar un criterio sin revision humana', () => {
    const normalizado = normalizar(recibir(entradaDePrueba()));
    // El candado de tipos impide llegar aqui desde TypeScript. La fuerza bruta
    // reproduce lo que haria una llamada desde JavaScript sin tipos.
    const sinRevisar = normalizado as unknown as CriterioRevisado;
    expect(() => publicar(sinRevisar, { publicadoEl: '2026-09-12' })).toThrow(RevisionFaltante);
    expect(() => publicar(sinRevisar, { publicadoEl: '2026-09-12' })).toThrow(/revisadoPor/);
  });

  it('etapa tres: tampoco publica con revisor vacio ni con fecha invalida', () => {
    const normalizado = normalizar(recibir(entradaDePrueba()));
    expect(() =>
      revisar(normalizado, { ...revisionDePrueba(normalizado.huella), revisadoPor: '  ' }),
    ).toThrow(RevisionFaltante);
    expect(() =>
      revisar(normalizado, { ...revisionDePrueba(normalizado.huella), revisadoEl: '12-09-2026' }),
    ).toThrow(RevisionFaltante);
  });

  it('etapa tres: la firma se ata al texto revisado', () => {
    const normalizado = normalizar(recibir(entradaDePrueba()));
    expect(() =>
      revisar(normalizado, revisionDePrueba('0'.repeat(64))),
    ).toThrow(HuellaAlterada);

    const revisado = revisar(normalizado, revisionDePrueba(normalizado.huella));
    const manipulado = { ...revisado, texto: 'Texto cambiado despues de la revision.' };
    expect(() => publicar(manipulado, { publicadoEl: '2026-09-12' })).toThrow(HuellaAlterada);
  });

  it('etapa cuatro: publica con version y con el candado de citacion en verdadero', () => {
    const criterio = ingerir(
      entradaDePrueba({ registroDigital: '9000001' }),
      {
        revisadoPor: 'Abogada responsable de prueba',
        revisadoEl: '2026-09-12',
        nota: 'Contrastado contra el documento ficticio de la prueba.',
      },
      { publicadoEl: '2026-09-12' },
    );
    expect(criterio.verificado).toBe(true);
    expect(criterio.revisadoPor).toBe('Abogada responsable de prueba');
    expect(criterio.revisadoEl).toBe('2026-09-12');
    expect(criterio.version).toBe(1);
    expect(criterio.tipoCriterio).toBe('tesis_aislada');
    expect(criterio.huella).toBe(huellaDeCriterio(criterio));
  });

  it('la proyeccion del acervo no toca el archivo cargado', () => {
    const criterio = ingerir(
      entradaDePrueba({ registroDigital: '9000002' }),
      {
        revisadoPor: 'Abogada responsable de prueba',
        revisadoEl: '2026-09-12',
        nota: 'Contrastado contra el documento ficticio de la prueba.',
      },
      { publicadoEl: '2026-09-12' },
    );
    const proyectado = proyectarAcervo(ACERVO, [criterio], '0.1.0', '2026-09-12');
    expect(proyectado.criterios).toHaveLength(1);
    expect(validarAcervo(proyectado)).toEqual([]);
    // El acervo de verdad sigue vacio: la proyeccion es pura.
    expect(CRITERIOS).toHaveLength(0);
    expect(acervoVacio()).toBe(true);
  });
});
