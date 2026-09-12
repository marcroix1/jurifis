/**
 * Configuracion de drizzle-kit. Las migraciones se generan a ./migraciones y
 * se aplican con el rol dueno, no con jurifis_app: el dueno de la tabla es
 * quien puede crear y alterar, y a proposito no es el rol de la aplicacion.
 *
 * src/rls.sql no lo genera drizzle-kit. Se aplica a mano despues de la
 * migracion de estructura y se versiona como parte del paquete.
 */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migraciones',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // pgvector y pgcrypto viven en public; se crean desde src/rls.sql.
  extensionsFilters: ['postgis'],
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
