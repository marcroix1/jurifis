/**
 * Punto de entrada de @jurifis/db.
 *
 * Expone el esquema completo y el cliente de base de datos. La unica forma
 * prevista de tocar datos de cliente es conOrg: abre transaccion, fija
 * app.org_id y corre el trabajo dentro. Las politicas de src/rls.sql se
 * apoyan en ese ajuste, y sin el no devuelven filas.
 */

import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as esquema from './schema.js';

export * from './schema.js';
export { esquema };

/** Base de datos tipada con el esquema de JURIFIS. */
export type BaseDatos = PostgresJsDatabase<typeof esquema>;

/** Transaccion tipada, lo que recibe el trabajo que corre dentro de conOrg. */
export type Transaccion = Parameters<Parameters<BaseDatos['transaction']>[0]>[0];

export interface OpcionesCliente {
  /** Esquemas del search_path, en orden. Por omision public. */
  searchPath?: readonly string[];
  /** Maximo de conexiones del pool. */
  max?: number;
  /** Segundos de inactividad antes de cerrar una conexion del pool. */
  idleTimeout?: number;
  /** Segundos maximos para establecer la conexion. */
  connectTimeout?: number;
  /** Imprime cada consulta. Solo para depurar en local. */
  registrar?: boolean;
}

export interface ClienteJurifis {
  /** Cliente de Drizzle sin contexto de organizacion. */
  db: BaseDatos;
  /** Conexion cruda de postgres.js, para migraciones y sentencias sueltas. */
  conexion: postgres.Sql;
  /**
   * Ejecuta fn dentro de una transaccion con app.org_id fijado. El tercer
   * argumento de set_config en true hace el ajuste local a la transaccion:
   * al terminar, la conexion vuelve al pool sin contexto de organizacion.
   */
  conOrg: <T>(orgId: string, fn: (tx: Transaccion) => Promise<T>) => Promise<T>;
  /** Cierra el pool. */
  cerrar: () => Promise<void>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** El identificador de organizacion mal formado no llega a la base. */
export class OrgIdInvalido extends Error {
  constructor(readonly valor: string) {
    super(`El identificador de organizacion no es un uuid valido: ${JSON.stringify(valor)}`);
    this.name = 'OrgIdInvalido';
  }
}

/** Un nombre de esquema no valido no se interpola en el search_path. */
export class SearchPathInvalido extends Error {
  constructor(readonly valor: string) {
    super(`Nombre de esquema no valido para el search_path: ${JSON.stringify(valor)}`);
    this.name = 'SearchPathInvalido';
  }
}

const IDENTIFICADOR = /^[a-z_][a-z0-9_$]*$/;

/**
 * Abre el pool contra url, fija el search_path desde la propia conexion y
 * devuelve el cliente. El search_path se manda como parametro de arranque, no
 * como sentencia suelta, para que toda conexion nueva del pool nazca igual.
 */
export function crearCliente(url: string, opciones: OpcionesCliente = {}): ClienteJurifis {
  if (!url) throw new Error('crearCliente necesita la url de conexion a PostgreSQL.');

  const rutaEsquemas = opciones.searchPath ?? ['public'];
  for (const nombre of rutaEsquemas) {
    if (!IDENTIFICADOR.test(nombre)) throw new SearchPathInvalido(nombre);
  }

  const conexion = postgres(url, {
    max: opciones.max ?? 10,
    idle_timeout: opciones.idleTimeout ?? 30,
    connect_timeout: opciones.connectTimeout ?? 10,
    onnotice: () => {},
    connection: {
      search_path: rutaEsquemas.join(', '),
      application_name: 'jurifis',
    },
  });

  const db = drizzle(conexion, {
    schema: esquema,
    ...(opciones.registrar === true ? { logger: true } : {}),
  });

  async function conOrg<T>(orgId: string, fn: (tx: Transaccion) => Promise<T>): Promise<T> {
    if (!UUID.test(orgId)) throw new OrgIdInvalido(orgId);
    return db.transaction(async (tx) => {
      // true: el ajuste muere con la transaccion, no viaja con la conexion.
      await tx.execute(sql`select set_config('app.org_id', ${orgId}, true)`);
      return fn(tx);
    });
  }

  return {
    db,
    conexion,
    conOrg,
    cerrar: async () => {
      await conexion.end();
    },
  };
}
