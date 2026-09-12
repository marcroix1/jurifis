# Base de datos

Esquema real leído de `packages/db/src/schema.ts` y `packages/db/src/rls.sql` al 12 de septiembre
de 2026. PostgreSQL 16 con Drizzle ORM y postgres.js.

> **Discrepancia con la especificación.** El encargo hablaba de diecinueve entidades. El esquema
> implementado declara **veinte** tablas: once bajo aislamiento por organización y nueve de
> catálogo. La cuenta sale de las constantes `TABLAS_MULTIINQUILINO` (once nombres) y
> `TABLAS_CATALOGO` (nueve nombres) al final de `schema.ts`, y coincide con las veinte
> declaraciones `pgTable` del archivo. Se documenta lo que hay.

## Estado de implementación

| Pieza | Estado |
|---|---|
| `src/schema.ts`, 782 líneas, 20 tablas, 5 enumeraciones, relaciones | Escrito |
| `src/extensiones.sql`, `pgcrypto` y `vector` | Escrito |
| `src/rls.sql`, 210 líneas, políticas de aislamiento | Escrito |
| `src/index.ts`, cliente y `conOrg` | Escrito |
| `drizzle.config.ts`, salida a `./migraciones` | Escrito |
| `migraciones/0000_inicial.sql`, 399 líneas, con instantánea y diario | Generada |
| `test/schema.test.ts`, 34 pruebas en verde | Escritas |
| Migración de datos del corpus a `legal_rules`, `holiday_calendars`, `holidays` | **Pendiente** |
| Aplicación contra una base real, y pruebas de integración que la toquen | **Pendiente** |

Las 34 pruebas leen la definición de Drizzle en memoria y el texto de `rls.sql`. **No abren
conexión a PostgreSQL.** Verifican estructura y contrato, no comportamiento en ejecución: que la
política exista en el archivo no es lo mismo que comprobar que un renglón ajeno no se ve.

## Las dos capas

El encabezado de `schema.ts` fija la división y advierte que no deben confundirse.

**Capa multiinquilino.** Todo lo que contiene datos de cliente. Cada tabla lleva `org_id` con llave
foránea a `organizations` y queda bajo Row Level Security, es decir seguridad a nivel de renglón.
Es materia de secreto profesional.

**Capa de catálogo.** Autoridades, procedimientos, reglas de plazo, calendarios, días inhábiles,
fuentes y criterios jurisprudenciales. Conocimiento jurídico compartido, sin `org_id`.

La regla dura que el archivo declara: define estructura, nunca contenido jurídico. No hay
artículos, plazos, tesis, registros ni fechas oficiales escritos como valores por omisión. Todo
dato jurídico entra por migración de datos verificada contra fuente de nivel A.

## Enumeraciones

| Enumeración | Valores |
|---|---|
| `rol_membresia` | `superadmin`, `owner`, `admin`, `abogado`, `asistente`, `cliente` |
| `estado_expediente` | `nuevo`, `en_analisis`, `plazo_corriendo`, `demanda_presentada`, `contestacion`, `alegatos`, `sentencia`, `cumplimiento`, `concluido` |
| `tipo_criterio` | `jurisprudencia`, `tesis_aislada`, `precedente`, `sentencia`, `criterio_administrativo`, `legislacion` |
| `nivel_fuente` | `A`, `B` |
| `confianza_computo` | `verificada`, `parcial`, `insuficiente`, `bloqueada_por_fuente` |

`confianza_computo` reproduce exactamente el tipo `Confianza` de `packages/core/src/tipos.ts`, y
`nivel_fuente` el tipo `NivelFuente`. Son el mismo vocabulario en las dos capas.

## Las veinte tablas

### Identidad y organización

| Tabla | Papel | Llaves salientes |
|---|---|---|
| `organizations` | Inquilino. Raíz del aislamiento: `app.org_id` apunta siempre a un renglón de esta tabla | ninguna |
| `users` | Identidad de la persona. Global y sin `org_id` a propósito: una misma persona puede pertenecer a varios despachos | ninguna |
| `memberships` | Vínculo usuario a organización, con su rol | `org_id`, `user_id` |

`organizations` lleva `slug` único, razón social, Registro Federal de Contribuyentes, zona horaria
con valor por omisión `America/Mexico_City` y borrado lógico. `users` lleva correo único, cédula
profesional y hash de contraseña. `memberships` tiene índice único sobre el par organización y
usuario.

### Catálogo jurídico compartido

| Tabla | Papel | Llaves salientes |
|---|---|---|
| `legal_sources` | Fuente cruda de la que se lee el derecho, con `sha256` y nivel | `verificado_por` |
| `authorities` | Autoridad emisora del acto impugnado | ninguna |
| `procedures` | Procedimiento o vía: juicio de nulidad, recurso de revocación, amparo | `fuente_id` |
| `legal_rules` | Espejo en base de datos de las reglas que el núcleo lee de disco | `procedimiento_id`, `fuente_id` |
| `holiday_calendars` | Calendario anual de días inhábiles de un órgano u ordenamiento | `fuente_id` |
| `holidays` | Día inhábil concreto dentro de un calendario | `calendario_id` |
| `jurisprudence` | Acervo de criterios, con vector de búsqueda semántica | `fuente_id`, `verificado_por` |

Tres detalles que cargan el diseño:

**El hash como alarma.** `legal_sources.sha256` existe, según su propio comentario, para que si el
archivo cambia sin que cambie el hash declarado, la fuente deje de ser confiable y todo lo que se
apoya en ella baje de nivel.

**El candado de citación.** `jurisprudence.verificado` es booleano con valor por omisión falso, y
el comentario es explícito: ningún escrito cita un renglón con `verificado` en falso.

**La regla se guarda entera.** `legal_rules` replica la forma del JSON del corpus: `cantidad`,
`unidad`, `primer_dia`, `prorroga_si_vence_inhabil`, `incluye_dia_vencimiento`, y tres columnas
`jsonb` para `calendarios`, `surtimiento` y `fundamento`. `clave` es único y debe coincidir con el
identificador de la regla del motor para que un plazo guardado pueda recalcularse igual años
después.

### Datos de cliente, bajo aislamiento

| Tabla | Papel | Llaves salientes |
|---|---|---|
| `clients` | Cliente del despacho | `org_id` |
| `cases` | Expediente | `org_id`, `cliente_id`, `autoridad_id`, `procedimiento_id`, `responsable_id` |
| `case_events` | Actuación o hecho registrado. Línea de tiempo | `org_id`, `caso_id`, `registrado_por` |
| `deadlines` | Plazo computado, con su traza completa | `org_id`, `caso_id`, `regla_id`, `calendario_id`, `creado_por` |
| `notifications` | Aviso al usuario. El guardián de términos fatales escribe aquí | `org_id`, `user_id`, `caso_id`, `plazo_id` |
| `documents` | Documento del expediente. El binario vive en el almacén, aquí la referencia | `org_id`, `caso_id`, `cliente_id`, `subido_por` |
| `leads` | Prospecto captado, previo a volverse cliente | `org_id`, `convertido_cliente_id`, `atendido_por` |
| `subscriptions` | Suscripción comercial de la organización | `org_id` |
| `usage` | Consumo medido por periodo, base de facturación y de límites de plan | `org_id` |
| `audit_log` | Bitácora de auditoría, de solo escritura | `org_id`, `user_id` |

`cases.cliente_id` usa `on delete restrict`: no se borra un cliente con expedientes.
`audit_log.org_id` también usa `restrict`: no se borra una organización arrastrando su bitácora.
El resto de los vínculos a `organizations` usa `cascade`.

`cases.cuantia` es `numeric(18,2)`, con el comentario de que es numérico para no perder centavos.

### La tabla que sostiene la promesa del producto

`deadlines` no guarda solamente la fecha de vencimiento. Guarda todo lo necesario para reproducir
el cómputo:

| Columna | Contenido |
|---|---|
| `regla_clave` | Clave de la regla del núcleo con la que se calculó, como texto |
| `regla_id` | Referencia opcional a `legal_rules` |
| `calendario_clave`, `calendarios_usados` | Calendario principal y todos los que entraron |
| `fecha_notificacion`, `forma_notificacion` | Entrada del cómputo |
| `surte_efectos`, `inicio_computo`, `vence` | Fechas del resultado, nulas cuando la confianza no alcanza |
| `traza` | Los ocho pasos, en `jsonb`. Es la defensa del cómputo ante el cliente |
| `fuentes`, `faltantes`, `advertencias`, `inhabiles_aplicados` | El resto del `ResultadoComputo` |
| `confianza` | Enumeración `confianza_computo` |
| `motor_version` | Versión del motor que produjo la traza |

El comentario del código lo justifica: si el calendario del próximo año se corrige, el cómputo
histórico sigue siendo auditable tal como se emitió. Guardar la clave de la regla como texto,
además de la llave foránea, es deliberado: la referencia puede quedar en nulo, el texto no.

Índice `deadlines_vence_idx` sobre `vence`, que es el que barre el guardián de términos.

## Relaciones

`schema.ts` declara relaciones de Drizzle para dieciséis de las veinte tablas. La forma general:

```
organizations 1─n memberships n─1 users
organizations 1─n clients 1─n cases 1─n case_events
                              cases 1─n deadlines 1─n notifications
                              cases 1─n documents
organizations 1─n leads      n─1 clients   (convertido_cliente_id)
organizations 1─n subscriptions, usage, audit_log

legal_sources 1─n procedures 1─n legal_rules
legal_sources 1─n holiday_calendars 1─n holidays
legal_sources 1─n jurisprudence

cases n─1 authorities, procedures, users (responsable)
deadlines n─1 legal_rules, holiday_calendars
```

`authorities` y `legal_sources` no declaran su propio objeto `relations`, aunque otras tablas
apuntan a ellas. No afecta la integridad referencial, que vive en las llaves foráneas; solo limita
las consultas relacionales de Drizzle en esa dirección.

## Aislamiento por organización con seguridad a nivel de renglón

Definido en `packages/db/src/rls.sql`. Se aplica a mano después de la migración de estructura que
genera drizzle-kit; el propio archivo advierte que drizzle-kit no lo genera y que el orden importa:
primero existen las tablas, luego el rol, luego las políticas.

El orden completo de despliegue está escrito en el encabezado de `src/extensiones.sql`, y las tres
sentencias de ese archivo son idempotentes:

1. `src/extensiones.sql`, con el rol dueño
2. `drizzle-kit migrate`, con el rol dueño
3. `src/rls.sql`, con el rol dueño

El primer paso no es opcional ni cosmético: `jurisprudence` declara una columna `vector(1536)` que
no se puede crear si la extensión `vector` todavía no existe. Con el orden invertido, la migración
inicial falla.

### El mecanismo

La aplicación abre la conexión como el rol `jurifis_app` y, en cada transacción que toca datos de
cliente, ejecuta `set_config('app.org_id', <uuid>, true)`. Las políticas comparan `org_id` contra
ese ajuste.

El corte es cerrado por omisión. Si el ajuste no está puesto, `current_setting('app.org_id', true)`
devuelve nulo, la comparación da nulo y el renglón no pasa el filtro. Sin organización fijada no se
ve nada.

En `src/index.ts` eso se encapsula en una sola función:

```ts
conOrg: <T>(orgId: string, fn: (tx: Transaccion) => Promise<T>) => Promise<T>
```

`conOrg` valida que el identificador sea un UUID con expresión regular antes de que llegue a la
base (lanza `OrgIdInvalido` si no lo es), abre transacción, fija `app.org_id` y corre el trabajo
dentro. El tercer argumento de `set_config` en `true` hace el ajuste local a la transacción: al
terminar, la conexión vuelve al pool sin contexto de organización. Es la única forma prevista de
tocar datos de cliente.

`crearCliente` también valida cada nombre de esquema del `search_path` contra
`/^[a-z_][a-z0-9_$]*$/` antes de interpolarlo (`SearchPathInvalido`), y lo manda como parámetro de
arranque de la conexión para que toda conexión nueva del pool nazca igual.

### Las políticas

Once tablas llevan `enable row level security` y `force row level security`, con una política
`aislamiento_org` `for all` que compara `org_id` contra el ajuste, tanto en `using` como en `with
check`:

`memberships`, `clients`, `cases`, `case_events`, `deadlines`, `notifications`, `documents`,
`leads`, `subscriptions`, `usage`.

`force row level security` está puesto para que la política aplique también al dueño de la tabla,
de modo que un descuido de despliegue no abra el aislamiento.

`organizations` recibe el mismo tratamiento pero comparando `id` en lugar de `org_id`, porque su
llave primaria hace el papel de identificador de organización. El propósito declarado es que una
sesión no pueda enumerar a los demás despachos. El alta de una organización nueva corre con el rol
dueño, fuera de esta política.

`audit_log` es el caso especial: dos políticas separadas, una `for insert` y otra `for select`. No
hay política `for update` ni `for delete`, y con seguridad a nivel de renglón activa lo que no
tiene política queda negado. El comentario lo resume: una bitácora que se puede corregir no sirve
como prueba de nada. Además, a nivel de permiso, `revoke update, delete, truncate on table
audit_log from jurifis_app`. Doble candado.

### El catálogo queda fuera

`authorities`, `procedures`, `legal_rules`, `holiday_calendars`, `holidays`, `legal_sources` y
`jurisprudence` no llevan `org_id` y quedan sin políticas: son derecho publicado, no datos de
cliente. Se escriben solo con el rol dueño, en migración de datos verificada contra fuente de nivel
A. `rls.sql` revoca explícitamente `insert`, `update` y `delete` sobre las siete al rol de la
aplicación.

`users` es identidad global: la aplicación la lee y la escribe por el flujo de autenticación, fuera
del contexto de una organización, y no lleva aislamiento por organización.

> **Inconsistencia menor.** `organizations` aparece en la constante `TABLAS_CATALOGO` de
> `schema.ts`, cuya documentación dice "sin `org_id`" y cuyo encabezado describe la capa de
> catálogo como "sin RLS". Pero `rls.sql` sí le activa seguridad a nivel de renglón. La
> clasificación es correcta en cuanto a que no tiene columna `org_id`, y el comentario general
> sobre la capa de catálogo no la alcanza. Vale la pena precisar el comentario para que la lectura
> rápida no induzca a error.

### El rol de la aplicación

```sql
create role jurifis_app login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
```

Sin superusuario, sin capacidad de saltarse las políticas, y no es dueño de ninguna tabla. Esto
último es deliberado y está explicado: el dueño de una tabla se salta la seguridad a nivel de
renglón de forma natural. La migración corre con el rol dueño, por ejemplo `jurifis_owner`, y
`jurifis_app` solo recibe permisos de datos.

### Por qué el superadministrador no puede leer expedientes

El razonamiento está escrito en el encabezado de `rls.sql` y conviene reproducirlo en sustancia
porque es una decisión de despacho, no una decisión técnica.

`superadmin` es rol de plataforma, no rol de despacho: existe para administrar cuentas, planes,
límites y soporte. El contenido de un expediente está cubierto por el secreto profesional que el
abogado debe a su cliente, y ese deber no tiene una excepción por conveniencia operativa del
proveedor del software.

Por eso el aislamiento no se decide en el código de la aplicación, donde un olvido en una cláusula
`where` lo derrumba, sino en el motor de base de datos: no existe ninguna política que exente a un
rol de la comparación con `app.org_id`, ni siquiera al superadministrador.

Consecuencia práctica: para ver un expediente hay que fijar la organización de ese expediente, y
para eso hace falta una membresía vigente en ella. El acceso de soporte a datos de cliente se
concede caso por caso, con autorización del despacho, y queda en `audit_log`.

## Extensiones requeridas

```sql
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "vector";    -- embeddings de jurisprudence
```

`jurisprudence.embedding` es `vector(1536)` con índice HNSW y operador `vector_cosine_ops`. La
dimensión se exporta como constante `DIMENSION_EMBEDDING`.

## Contrato con las pruebas

El final de `schema.ts` declara tres constantes que son un contrato explícito:

- `TABLAS_MULTIINQUILINO`, once nombres. Toda tabla de la lista debe declarar `org_id` con llave
  foránea a `organizations` y aparecer en `rls.sql`.
- `TABLAS_CATALOGO`, nueve nombres.
- `TABLAS_SOLO_ESCRITURA`, un nombre: `audit_log`.

El comentario dice que las pruebas fallan si una tabla nueva no queda clasificada, y **esas pruebas
ya existen**: `packages/db/test/schema.test.ts`, 34 casos. Descubren las tablas por introspección
sobre lo que el esquema exporta, no por lista escrita a mano, de modo que una tabla nueva entra
sola a todas las verificaciones.

Lo que verifican, agrupado:

| Grupo | Verifica |
|---|---|
| Inventario de tablas | Que sean veinte, que cada una quede clasificada en exactamente una lista, que todas tengan llave primaria `uuid` con valor por omisión y marcas de tiempo con zona horaria |
| Aislamiento por organización | Que toda tabla con datos de cliente declare `org_id` no nulo con llave foránea a `organizations.id`, que ninguna tabla de catálogo lo cuele, y que `org_id` esté indexado o encabece un índice compuesto |
| Enumeraciones | Los valores exactos de las cinco, incluida la coincidencia de `confianza_computo` con la del motor de plazos, y su uso en las columnas que les tocan |
| Plazos reproducibles | Que `deadlines` guarde traza, calendario por clave y por llave foránea, regla aplicada, versión del motor, fuentes, faltantes y advertencias, y que no fije fecha de vencimiento por omisión |
| Acervo de criterios | Dimensión del vector, creación de la extensión antes de la migración que la usa, y que un criterio nuevo no nazca dado por verificado |
| Bitácora de solo escritura | Ausencia de columnas de modificación, ausencia de política de `update` y de `delete`, y revocación de esos permisos al rol de aplicación |
| Políticas de `rls.sql` | Que active y fuerce el aislamiento en toda tabla con datos de cliente, que cierre `organizations` sobre su propia llave, que el rol de aplicación se cree sin capacidad de saltarse las políticas, que el catálogo no sea escribible desde la aplicación, y que quede escrito por qué el superadministrador no lee expedientes |
| Nada de derecho inventado | Que ninguna columna de contenido jurídico tenga valor por omisión |

Queda un hueco: son pruebas de estructura y de texto, no de comportamiento. Ninguna abre conexión.
La comprobación de que un renglón de otra organización efectivamente no se ve exige una base viva y
todavía no existe.
