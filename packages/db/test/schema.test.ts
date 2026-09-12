/**
 * Pruebas de estructura del esquema. No tocan base de datos: leen la
 * definicion de Drizzle en memoria y el texto de src/rls.sql.
 *
 * Lo que aqui se cuida es lo que, si se rompe, se rompe en silencio: una
 * tabla nueva con datos de cliente que se olvida el org_id, un valor de
 * enumeracion que se cambia de nombre, una tabla que llega a produccion sin
 * politica de RLS. Ninguna de esas fallas se nota al probar la aplicacion con
 * una sola organizacion.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { getTableName, is } from 'drizzle-orm';
import { getTableConfig, PgTable, type AnyPgColumn } from 'drizzle-orm/pg-core';

import * as esquema from '../src/schema.js';
import {
  confianzaComputo,
  DIMENSION_EMBEDDING,
  estadoExpediente,
  nivelFuente,
  rolMembresia,
  TABLAS_CATALOGO,
  TABLAS_MULTIINQUILINO,
  TABLAS_SOLO_ESCRITURA,
  tipoCriterio,
} from '../src/schema.js';

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Todas las tablas exportadas por el esquema, por nombre en la base. Se
 * descubren por introspeccion, no por lista escrita a mano: asi una tabla
 * nueva entra sola a todas las pruebas de este archivo.
 */
const EXPORTADO: unknown[] = Object.values(esquema);
const TABLAS = new Map<string, PgTable>(
  EXPORTADO.filter((valor): valor is PgTable => is(valor, PgTable)).map((t) => [getTableName(t), t]),
);

function tabla(nombre: string): PgTable {
  const encontrada = TABLAS.get(nombre);
  if (!encontrada) throw new Error(`El esquema no define la tabla ${nombre}.`);
  return encontrada;
}

function columnas(nombre: string): Map<string, AnyPgColumn> {
  return new Map(getTableConfig(tabla(nombre)).columns.map((c) => [c.name, c as AnyPgColumn]));
}

function columna(nombreTabla: string, nombreColumna: string): AnyPgColumn {
  const c = columnas(nombreTabla).get(nombreColumna);
  if (!c) throw new Error(`La tabla ${nombreTabla} no declara la columna ${nombreColumna}.`);
  return c;
}

/** Devuelve [tablaDestino, columnaDestino] de la llave foranea de una columna. */
function foranea(nombreTabla: string, nombreColumna: string): [string, string] | null {
  for (const fk of getTableConfig(tabla(nombreTabla)).foreignKeys) {
    const ref = fk.reference();
    if (ref.columns.length === 1 && ref.columns[0]?.name === nombreColumna) {
      return [getTableName(ref.foreignTable), ref.foreignColumns[0]?.name ?? ''];
    }
  }
  return null;
}

const RLS = readFileSync(fileURLToPath(new URL('../src/rls.sql', import.meta.url)), 'utf8');
const EXTENSIONES = readFileSync(fileURLToPath(new URL('../src/extensiones.sql', import.meta.url)), 'utf8');

/** La tabla se declara una sola vez en el catalogo de esperadas. */
const ESPERADAS = [...TABLAS_MULTIINQUILINO, ...TABLAS_CATALOGO] as readonly string[];

/* -------------------------------------------------------------------------- */

describe('inventario de tablas', () => {
  it('define las veinte entidades del modelo', () => {
    expect([...TABLAS.keys()].sort()).toEqual([...ESPERADAS].sort());
  });

  it('clasifica cada tabla en multiinquilino o catalogo, nunca en las dos', () => {
    const cruce = TABLAS_MULTIINQUILINO.filter((n) => (TABLAS_CATALOGO as readonly string[]).includes(n));
    expect(cruce).toEqual([]);
    expect(new Set(ESPERADAS).size).toBe(ESPERADAS.length);
  });

  it('no deja ninguna tabla de negocio sin llave primaria', () => {
    const sinLlave: string[] = [];
    for (const [nombre, t] of TABLAS) {
      const cfg = getTableConfig(t);
      const tieneSimple = cfg.columns.some((c) => c.primary);
      const tieneCompuesta = cfg.primaryKeys.length > 0;
      if (!tieneSimple && !tieneCompuesta) sinLlave.push(nombre);
    }
    expect(sinLlave).toEqual([]);
  });

  it('identifica cada renglon con un uuid con valor por omision', () => {
    const malas: string[] = [];
    for (const [nombre, t] of TABLAS) {
      const id = getTableConfig(t).columns.find((c) => c.name === 'id');
      if (!id || !id.primary || id.columnType !== 'PgUUID' || !id.hasDefault) malas.push(nombre);
    }
    expect(malas).toEqual([]);
  });

  it('guarda todas las marcas de tiempo con zona horaria', () => {
    const sinZona: string[] = [];
    for (const [nombre, t] of TABLAS) {
      for (const c of getTableConfig(t).columns) {
        if (c.columnType === 'PgTimestamp' && (c as unknown as { withTimezone: boolean }).withTimezone !== true) {
          sinZona.push(`${nombre}.${c.name}`);
        }
      }
    }
    expect(sinZona).toEqual([]);
  });
});

describe('aislamiento por organizacion', () => {
  it('toda tabla con datos de cliente declara org_id no nulo', () => {
    const malas: string[] = [];
    for (const nombre of TABLAS_MULTIINQUILINO) {
      const org = columnas(nombre).get('org_id');
      if (!org || !org.notNull || org.columnType !== 'PgUUID') malas.push(nombre);
    }
    expect(malas).toEqual([]);
  });

  it('apunta org_id a organizations.id con llave foranea', () => {
    const malas: string[] = [];
    for (const nombre of TABLAS_MULTIINQUILINO) {
      const destino = foranea(nombre, 'org_id');
      if (!destino || destino[0] !== 'organizations' || destino[1] !== 'id') malas.push(nombre);
    }
    expect(malas).toEqual([]);
  });

  it('no cuela org_id en las tablas de catalogo', () => {
    const conOrg = TABLAS_CATALOGO.filter((nombre) => columnas(nombre).has('org_id'));
    expect(conOrg).toEqual([]);
  });

  it('indexa org_id o lo lleva en un indice compuesto que empieza por el', () => {
    const sinIndice: string[] = [];
    for (const nombre of TABLAS_MULTIINQUILINO) {
      const cfg = getTableConfig(tabla(nombre));
      const indices = [...cfg.indexes, ...cfg.uniqueConstraints];
      const cubierta = indices.some((i) => {
        const cols = 'config' in i ? (i.config.columns as { name?: string }[]) : [];
        return cols[0]?.name === 'org_id';
      });
      if (!cubierta) sinIndice.push(nombre);
    }
    expect(sinIndice).toEqual([]);
  });
});

describe('enumeraciones', () => {
  it('rol de membresia', () => {
    expect(rolMembresia.enumName).toBe('rol_membresia');
    expect(rolMembresia.enumValues).toEqual([
      'superadmin',
      'owner',
      'admin',
      'abogado',
      'asistente',
      'cliente',
    ]);
  });

  it('estado de expediente', () => {
    expect(estadoExpediente.enumName).toBe('estado_expediente');
    expect(estadoExpediente.enumValues).toEqual([
      'nuevo',
      'en_analisis',
      'plazo_corriendo',
      'demanda_presentada',
      'contestacion',
      'alegatos',
      'sentencia',
      'cumplimiento',
      'concluido',
    ]);
  });

  it('tipo de criterio jurisprudencial', () => {
    expect(tipoCriterio.enumName).toBe('tipo_criterio');
    expect(tipoCriterio.enumValues).toEqual([
      'jurisprudencia',
      'tesis_aislada',
      'precedente',
      'sentencia',
      'criterio_administrativo',
      'legislacion',
    ]);
  });

  it('nivel de fuente', () => {
    expect(nivelFuente.enumName).toBe('nivel_fuente');
    expect(nivelFuente.enumValues).toEqual(['A', 'B']);
  });

  it('confianza del computo, igual a la del motor de plazos', () => {
    expect(confianzaComputo.enumName).toBe('confianza_computo');
    expect(confianzaComputo.enumValues).toEqual([
      'verificada',
      'parcial',
      'insuficiente',
      'bloqueada_por_fuente',
    ]);
  });

  it('usa las enumeraciones en las columnas que les tocan', () => {
    const pares: [string, string, readonly string[]][] = [
      ['memberships', 'rol', rolMembresia.enumValues],
      ['cases', 'estado', estadoExpediente.enumValues],
      ['deadlines', 'confianza', confianzaComputo.enumValues],
      ['jurisprudence', 'tipo_criterio', tipoCriterio.enumValues],
      ['legal_sources', 'nivel', nivelFuente.enumValues],
      ['legal_rules', 'nivel', nivelFuente.enumValues],
      ['holiday_calendars', 'nivel', nivelFuente.enumValues],
      ['jurisprudence', 'nivel', nivelFuente.enumValues],
    ];
    for (const [t, c, valores] of pares) {
      const col = columna(t, c);
      expect(col.columnType, `${t}.${c}`).toBe('PgEnumColumn');
      expect(col.enumValues, `${t}.${c}`).toEqual([...valores]);
      expect(col.notNull, `${t}.${c}`).toBe(true);
    }
  });
});

describe('plazos reproducibles', () => {
  it('guarda la traza del computo como jsonb no nulo', () => {
    const traza = columna('deadlines', 'traza');
    expect(traza.columnType).toBe('PgJsonb');
    expect(traza.notNull).toBe(true);
    expect(traza.hasDefault).toBe(true);
  });

  it('guarda el calendario que se uso, por clave y por llave foranea', () => {
    expect(columna('deadlines', 'calendario_clave').notNull).toBe(true);
    expect(foranea('deadlines', 'calendario_id')).toEqual(['holiday_calendars', 'id']);
    expect(columna('deadlines', 'calendarios_usados').columnType).toBe('PgJsonb');
  });

  it('guarda la regla aplicada y la version del motor', () => {
    expect(columna('deadlines', 'regla_clave').notNull).toBe(true);
    expect(foranea('deadlines', 'regla_id')).toEqual(['legal_rules', 'id']);
    expect(columnas('deadlines').has('motor_version')).toBe(true);
  });

  it('conserva fuentes, faltantes y advertencias del resultado', () => {
    for (const c of ['fuentes', 'faltantes', 'advertencias', 'inhabiles_aplicados']) {
      expect(columna('deadlines', c).columnType, c).toBe('PgJsonb');
    }
  });

  it('no fija fecha de vencimiento por omision', () => {
    expect(columna('deadlines', 'vence').hasDefault).toBe(false);
    expect(columna('deadlines', 'vence').notNull).toBe(false);
  });
});

describe('acervo de criterios', () => {
  it('lleva el vector de embeddings con la dimension del modelo', () => {
    const emb = columna('jurisprudence', 'embedding');
    expect(emb.columnType).toBe('PgVector');
    expect((emb as unknown as { dimensions: number }).dimensions).toBe(DIMENSION_EMBEDDING);
    expect(DIMENSION_EMBEDDING).toBe(1536);
  });

  it('crea la extension vector antes de la migracion que usa la columna', () => {
    expect(EXTENSIONES).toMatch(/create extension if not exists "vector";/);
    expect(EXTENSIONES).toMatch(/create extension if not exists "pgcrypto";/);
  });

  it('declara las columnas de identificacion del criterio', () => {
    const requeridas = [
      'rubro',
      'tipo_criterio',
      'organo',
      'epoca',
      'registro_digital',
      'materia',
      'texto',
      'precedentes',
    ];
    const faltantes = requeridas.filter((c) => !columnas('jurisprudence').has(c));
    expect(faltantes).toEqual([]);
  });

  it('exige rubro y texto, y no da por verificado un criterio nuevo', () => {
    expect(columna('jurisprudence', 'rubro').notNull).toBe(true);
    expect(columna('jurisprudence', 'texto').notNull).toBe(true);
    expect(columna('jurisprudence', 'verificado').notNull).toBe(true);
    expect(columna('jurisprudence', 'verificado').default).toBe(false);
  });
});

describe('bitacora de solo escritura', () => {
  it('no declara columnas de modificacion', () => {
    for (const nombre of TABLAS_SOLO_ESCRITURA) {
      const cols = columnas(nombre);
      expect(cols.has('actualizado_en'), nombre).toBe(false);
      expect(cols.has('borrado_en'), nombre).toBe(false);
    }
  });

  it('no define politica de update ni de delete en rls.sql', () => {
    const bloque = RLS.slice(RLS.indexOf('alter table audit_log enable row level security'));
    const politicas = bloque.slice(0, bloque.indexOf('-- 3.'));
    expect(politicas).toMatch(/create policy \w+ on audit_log\s+for insert/);
    expect(politicas).toMatch(/create policy \w+ on audit_log\s+for select/);
    expect(politicas).not.toMatch(/create policy \w+ on audit_log\s+for (update|delete|all)/);
  });

  it('revoca update y delete al rol de aplicacion', () => {
    expect(RLS).toMatch(/revoke update, delete, truncate on table audit_log from jurifis_app;/);
  });
});

describe('politicas de rls.sql', () => {
  it('activa y fuerza RLS en toda tabla con datos de cliente', () => {
    const sinRls = TABLAS_MULTIINQUILINO.filter(
      (n) =>
        !RLS.includes(`alter table ${n} enable row level security`) ||
        !RLS.includes(`alter table ${n} force row level security`),
    );
    expect(sinRls).toEqual([]);
  });

  it('aisla cada tabla con datos de cliente por app.org_id', () => {
    const sinPolitica: string[] = [];
    for (const nombre of TABLAS_MULTIINQUILINO) {
      const patron = new RegExp(
        `create policy \\w+ on ${nombre}[\\s\\S]{0,400}?org_id = current_setting\\('app\\.org_id', true\\)::uuid`,
      );
      if (!patron.test(RLS)) sinPolitica.push(nombre);
    }
    expect(sinPolitica).toEqual([]);
  });

  it('tambien cierra organizations sobre su propia llave', () => {
    expect(RLS).toMatch(/alter table organizations enable row level security/);
    expect(RLS).toMatch(/id = current_setting\('app\.org_id', true\)::uuid/);
  });

  it('crea el rol de aplicacion sin bypass de RLS', () => {
    expect(RLS).toMatch(/create role jurifis_app[^;]*nobypassrls/);
    expect(RLS).toMatch(/alter role jurifis_app[^;]*nobypassrls/);
  });

  it('deja escrito por que el superadmin no lee expedientes', () => {
    expect(RLS).toMatch(/superadmin/i);
    expect(RLS).toMatch(/secreto profesional/i);
  });

  it('no deja el catalogo juridico escribible desde la aplicacion', () => {
    const catalogoEscribible = [
      'authorities',
      'procedures',
      'legal_rules',
      'holiday_calendars',
      'holidays',
      'legal_sources',
      'jurisprudence',
    ].filter((n) => !RLS.includes(`revoke insert, update, delete on table ${n} from jurifis_app;`));
    expect(catalogoEscribible).toEqual([]);
  });
});

describe('nada de derecho inventado en el esquema', () => {
  it('no fija valores por omision en columnas de contenido juridico', () => {
    const vigiladas: [string, string][] = [
      ['legal_rules', 'cantidad'],
      ['legal_rules', 'unidad'],
      ['legal_rules', 'primer_dia'],
      ['legal_rules', 'fundamento'],
      ['legal_rules', 'nivel'],
      ['holiday_calendars', 'nivel'],
      ['holidays', 'fecha'],
      ['legal_sources', 'nivel'],
      ['jurisprudence', 'tipo_criterio'],
      ['jurisprudence', 'nivel'],
      ['deadlines', 'confianza'],
      ['deadlines', 'regla_clave'],
      ['deadlines', 'calendario_clave'],
    ];
    const conDefault = vigiladas.filter(([t, c]) => columna(t, c).hasDefault).map(([t, c]) => `${t}.${c}`);
    expect(conDefault).toEqual([]);
  });
});
