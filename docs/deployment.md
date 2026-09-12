# Despliegue

Estado al 12 de septiembre de 2026. Dominio del producto: `juris.lat`.

> **Nada está desplegado todavía y no hay infraestructura definida en el repositorio.** No existen
> `Dockerfile`, `docker-compose.yml`, manifiestos, flujos de integración continua ni archivo
> `.env.example`, aunque `.gitignore` ya lo exceptúa de la exclusión de `.env.*`. Lo que sigue son
> las dos rutas evaluadas y el procedimiento que debe quedar escrito antes del primer despliegue
> con datos de cliente.
>
> Lo que sí está listo del lado de la base: la migración inicial generada
> (`packages/db/migraciones/0000_inicial.sql`) y el orden de despliegue documentado en el encabezado
> de `packages/db/src/extensiones.sql`.

## Lo que el código ya exige

Restricciones reales, leídas del código, que cualquiera de las dos rutas debe satisfacer:

1. **PostgreSQL con dos extensiones, creadas antes de la migración.** `pgcrypto` para
   `gen_random_uuid()` y `vector` para los embeddings de `jurisprudence`. Están en
   `packages/db/src/extensiones.sql`, que corre **primero**: la tabla `jurisprudence` declara una
   columna `vector(1536)` y esa columna no se puede crear si la extensión todavía no existe. Con el
   orden invertido la migración inicial falla. Exige permisos suficientes en el despliegue inicial.
2. **Dos roles de base de datos, no uno.** Un rol dueño que corre migraciones y es propietario de
   las tablas, y `jurifis_app` que solo recibe permisos de datos. Están separados a propósito: el
   dueño de una tabla se salta la seguridad a nivel de renglón. Un proveedor administrado que solo
   entregue un usuario con todos los permisos no sirve tal cual; hay que crear el rol de aplicación
   dentro de él.
3. **Un paso de despliegue que drizzle-kit no cubre.** `rls.sql` no lo genera drizzle-kit. Se aplica
   a mano después de la migración de estructura, y el orden importa: primero las tablas, luego el
   rol, luego las políticas.
4. **Conexiones con estado por transacción.** `conOrg` usa `set_config('app.org_id', ..., true)`.
   Un agrupador de conexiones en modo sentencia rompería el aislamiento. Se requiere modo
   transacción o modo sesión.
5. **TypeScript sin compilar cruzando el límite de paquete.** `@jurifis/core` se publica como
   TypeScript y Next.js lo transpila con `transpilePackages`. El despliegue tiene que llevar el
   código fuente del paquete, no un artefacto compilado que no existe.

## Ruta A. Plataforma administrada

`apps/web` en Vercel y PostgreSQL administrado, por ejemplo Neon o Supabase, ambos con soporte de
`pgvector`.

**A favor:** despliegue por commit, certificados y dominio resueltos, respaldos y recuperación a un
punto en el tiempo incluidos, sin servidores que parchar.

**En contra:** los datos de expediente viven con dos terceros, lo que hay que valorar frente al
secreto profesional. Las funciones de Vercel tienen límite de tiempo de ejecución, que puede
estorbar a la ingesta de documentos y a la generación de vectores. El agrupador de conexiones del
proveedor debe configurarse en modo transacción, no en modo sentencia.

**Pasos, en orden:**

1. Crear la base y el rol dueño.
2. Aplicar `packages/db/src/extensiones.sql` con el rol dueño.
3. Aplicar la migración con el rol dueño: `npm run migrate --workspace @jurifis/db`, con
   `DATABASE_URL` apuntando al dueño. La migración ya está generada y versionada; volver a correr
   `generate` solo cuando cambie el esquema.
4. Aplicar `packages/db/src/rls.sql` con el rol dueño.
5. Verificar el aislamiento antes de cargar nada: conectarse como `jurifis_app` sin fijar
   `app.org_id` y comprobar que `select * from cases` devuelve cero renglones.
6. Migrar el corpus a `legal_rules`, `holiday_calendars` y `holidays` con el rol dueño.
7. Desplegar `apps/web` con la cadena de conexión de `jurifis_app`, nunca la del dueño.
8. Apuntar `juris.lat` y forzar HTTPS.

## Ruta B. Servidor propio

Un servidor virtual con PostgreSQL 16, la aplicación en contenedor, y un proxy inverso con
certificado.

**A favor:** los datos de expediente no salen de infraestructura contratada directamente por el
despacho. Sin límite de tiempo de ejecución. Control total sobre agrupamiento de conexiones,
extensiones y ajustes.

**En contra:** parches, vigilancia, rotación de certificados y respaldos quedan a cargo del
despacho. Un solo servidor es un solo punto de falla.

**Pasos, en orden:**

1. PostgreSQL 16 con `pgcrypto` y `pgvector` disponibles para instalar.
2. Crear el rol dueño y la base.
3. Aplicar `packages/db/src/extensiones.sql`, luego la migración, luego
   `packages/db/src/rls.sql`, los tres con el rol dueño y en ese orden.
4. Verificar el aislamiento como en la ruta A, paso 5.
5. Migrar el corpus.
6. Construir e iniciar la aplicación con la cadena de conexión de `jurifis_app`.
7. Proxy inverso con certificado renovado automáticamente, sirviendo `juris.lat`.
8. Cortafuegos: PostgreSQL nunca expuesto a internet.

## Recomendación

Empezar por la ruta A durante el desarrollo y la primera operación interna del despacho, y evaluar
la ruta B cuando entren expedientes de terceros en volumen. La decisión no es solo técnica: toca el
deber de secreto profesional y le corresponde al despacho, no al equipo de desarrollo.

Cualquiera que sea la ruta, la verificación del paso 5 se hace **antes** de cargar el primer
expediente. Un aislamiento que se comprueba después de tener datos dentro ya no es una comprobación,
es una esperanza.

## Variables de entorno

### Referenciada por el código hoy

| Variable | Uso | Dónde |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL | `packages/db/drizzle.config.ts`, `process.env.DATABASE_URL ?? ''` |

Es la única variable de entorno que el código lee al día de hoy. `crearCliente` en
`packages/db/src/index.ts` recibe la dirección como argumento, no la lee del entorno.

Advertencia sobre esa línea: el valor por omisión es cadena vacía, así que drizzle-kit arranca sin
`DATABASE_URL` y falla más tarde con un mensaje menos claro que el que daría una comprobación
temprana. `crearCliente` sí verifica y lanza un error explícito.

### Necesarias y todavía sin consumidor

| Variable | Uso previsto | Fase |
|---|---|---|
| `DATABASE_URL_OWNER` | Cadena del rol dueño, solo para migraciones. Nunca en la aplicación | 2 |
| `AUTH_SECRET` | Firma de sesión | 3 |
| `AUTH_URL` | Dirección pública para el flujo de autenticación | 3 |
| `NEXT_PUBLIC_APP_URL` | Dirección pública de la aplicación | 3 |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY` | Almacén de documentos | 3 |
| `SMTP_URL` o equivalente | Envío de avisos del guardián de términos | 3 |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | Proveedor de modelos de lenguaje, sujeto a lista blanca | 4 |
| `BACKUP_TARGET`, `BACKUP_ENCRYPTION_KEY` | Destino y llave de los respaldos | 5 |
| `BILLING_PROVIDER_KEY`, `BILLING_WEBHOOK_SECRET` | Proveedor de pagos | 5 |

Separar `DATABASE_URL` de `DATABASE_URL_OWNER` no es cosmético: es lo que impide que la aplicación
corra con el rol que se salta la seguridad a nivel de renglón. Si el despliegue usa la misma cadena
para las dos cosas, el aislamiento deja de existir sin que nada falle visiblemente.

**Pendiente:** escribir `.env.example` con todas las claves y sin ningún valor. `.gitignore` ya lo
exceptúa con `!.env.example`, pero el archivo no existe.

## Respaldo y prueba de restauración

**Nada de esto está implementado.** Es el procedimiento que debe quedar escrito y automatizado antes
del primer expediente real.

### Qué se respalda

| Origen | Contenido | Frecuencia mínima |
|---|---|---|
| PostgreSQL | Las veinte tablas, incluida `audit_log` | Diario, más registro continuo de transacciones |
| Almacén de documentos | Los binarios que `documents.ruta_almacenamiento` referencia | Diario |
| Repositorio | Código y corpus jurídico | Ya versionado en git, con copia remota |

Los tres tienen que respaldarse juntos y con marca de tiempo común. Una base restaurada a un punto
y un almacén restaurado a otro producen expedientes con documentos que no existen o documentos
huérfanos, y el índice único sobre `(org_id, sha256)` no lo detecta.

### Cómo se respalda

1. Volcado lógico diario con `pg_dump` en formato personalizado, incluidos roles y permisos. El
   volcado de estructura por sí solo **no incluye las políticas de seguridad a nivel de renglón si
   los roles no existen en el destino**: hay que respaldar también la definición de roles, o
   conservar `rls.sql` como parte del procedimiento y volver a aplicarlo tras restaurar.
2. Registro continuo de transacciones para recuperación a un punto en el tiempo, si el proveedor lo
   ofrece.
3. Cifrado del respaldo en reposo con llave que **no** viva en el mismo lugar que el respaldo.
4. Retención escalonada: diarios treinta días, semanales tres meses, mensuales un año. La bitácora
   de auditoría justifica la retención larga.
5. Copia fuera del proveedor principal. Un respaldo que vive solo en la misma cuenta que la base no
   protege contra la pérdida de la cuenta.

### Prueba de restauración

Un respaldo no probado no es un respaldo. La prueba es trimestral, con calendario, y deja
constancia escrita.

**Procedimiento:**

1. Levantar una instancia limpia y aislada, sin acceso a la red de producción.
2. Restaurar el volcado más reciente.
3. Crear el rol dueño y `jurifis_app`, y **volver a aplicar `packages/db/src/rls.sql`**.
4. **Verificar el aislamiento antes que nada.** Conectarse como `jurifis_app` sin fijar
   `app.org_id`:
   - `select count(*) from cases` debe devolver cero.
   - `select count(*) from audit_log` debe devolver cero.
   - `select count(*) from legal_rules` debe devolver el total, porque el catálogo no lleva
     aislamiento.
   Este paso es el que se olvida, y es el único que detecta el modo de falla peor: una restauración
   que devuelve todos los datos con las políticas caídas.
5. Fijar `app.org_id` con una organización conocida y comprobar que aparecen sus expedientes y solo
   los suyos.
6. Comprobar que `audit_log` sigue siendo de solo escritura: un `update` y un `delete` como
   `jurifis_app` deben fallar.
7. Restaurar una muestra del almacén de documentos y verificar el `sha256` de al menos veinte
   archivos contra la columna. Es el único control de integridad de los binarios que el esquema
   prevé.
8. Recalcular tres plazos guardados en `deadlines` con la clave de regla y la fecha de notificación
   que traen, y comparar la fecha de vencimiento contra la almacenada. Si el corpus no cambió,
   deben coincidir; si cambió, la traza guardada explica la diferencia. Esta comprobación es la que
   verifica la promesa central del producto: que un cómputo se puede reproducir años después.
9. Registrar en la bitácora de operación: fecha, respaldo probado, tiempo de restauración,
   resultado de cada verificación, incidencias.
10. Destruir la instancia de prueba.

### Objetivos

| Métrica | Objetivo propuesto |
|---|---|
| Punto de recuperación, pérdida máxima aceptable | 15 minutos con registro continuo de transacciones; 24 horas sin él |
| Tiempo de recuperación | 4 horas hasta servicio restablecido y aislamiento verificado |
| Frecuencia de la prueba de restauración | Trimestral, y además tras todo cambio de esquema que toque políticas |

Los dos primeros son propuestas, no compromisos adquiridos: dependen de la ruta de alojamiento que
se elija y deben confirmarse con el despacho.

## Antes del primer despliegue con datos de cliente

Lista de comprobación mínima. Ninguno de estos puntos está cumplido al día de hoy:

- [x] `npm test` en verde en la raíz, noventa y seis pruebas
- [ ] Pruebas de aislamiento que abran conexión real, no solo lectura de la definición y del texto
      de `rls.sql`
- [x] Migración inicial generada y versionada
- [ ] Migración aplicada contra una base real, con `extensiones.sql` antes y `rls.sql` después
- [ ] `rls.sql` aplicado y su efecto verificado como `jurifis_app` sin organización fijada
- [ ] Rol de aplicación separado del rol dueño, con cadenas de conexión distintas
- [ ] `.env.example` escrito y ningún secreto en el repositorio
- [ ] Respaldo automatizado y **una prueba de restauración completa ya ejecutada**
- [ ] Bitácora de auditoría con escritores en las operaciones sensibles
- [ ] Autenticación con verificación de membresía antes de fijar la organización activa
- [ ] Limitación de tasa en `POST /api/prospectos`, que hoy acepta datos personales sin
      autenticación y sin freno
- [ ] Corpus con calendarios 2027 cargados, o aviso visible de que el sistema no computa plazos que
      crucen el año
