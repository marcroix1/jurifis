-- =============================================================================
-- JURIFIS: extensiones de PostgreSQL
-- =============================================================================
--
-- Este archivo corre PRIMERO, antes de la migracion de estructura que genera
-- drizzle-kit. El orden no es de gusto: la tabla jurisprudence declara una
-- columna vector(1536) y esa columna no se puede crear si la extension vector
-- todavia no existe. Con el orden invertido la migracion inicial falla.
--
-- Orden de despliegue completo:
--   1. src/extensiones.sql   (con el rol dueno)
--   2. drizzle-kit migrate   (con el rol dueno)
--   3. src/rls.sql           (con el rol dueno)
--
-- Las tres sentencias son idempotentes: volver a correr el archivo no rompe
-- nada.
-- =============================================================================

-- gen_random_uuid(), valor por omision de toda llave primaria del esquema.
create extension if not exists "pgcrypto";

-- pgvector, columna embedding de jurisprudence e indice hnsw de busqueda
-- semantica sobre el acervo de criterios.
create extension if not exists "vector";
