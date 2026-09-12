# Seguridad

Estado al 12 de septiembre de 2026. Se distingue en cada apartado lo que está implementado de lo
que está decidido pero no escrito.

Resumen del estado: **el aislamiento entre organizaciones está implementado y es la pieza más
sólida del sistema. La autenticación no está implementada.** El esquema tiene las columnas que la
autenticación necesita, pero no existe el código que las usa.

## Autenticación

**Pendiente de implementación.** No hay proveedor de identidad configurado, no hay manejo de sesión
y no hay endpoint de inicio de sesión.

**Los dos endpoints que ya existen son públicos.** `POST /api/plazos/calcular` y
`POST /api/prospectos` no verifican nada y no tocan `packages/db`. El primero es cálculo puro sobre
el corpus, que es derecho publicado, y su exposición no compromete datos de cliente. El segundo sí
recibe datos personales, y se trata aparte más abajo.

Lo que el esquema ya prevé, en la tabla `users` de `packages/db/src/schema.ts`:

| Columna | Uso previsto |
|---|---|
| `correo` | Identificador de inicio de sesión, con índice único |
| `hash_contrasena` | Nulo permitido, para cuentas que entren por proveedor externo |
| `verificado_en` | Marca de correo verificado |
| `ultimo_acceso_en` | Último acceso |
| `cedula_profesional` | Cédula del abogado |
| `borrado_en` | Borrado lógico |

`users` es identidad global y no lleva `org_id`: una misma persona puede pertenecer a varios
despachos. El vínculo, el rol y el alcance de lectura viven en `memberships`.

Requisitos que la implementación debe cumplir, derivados del diseño ya escrito:

1. **La sesión debe resolver una organización activa.** Toda operación sobre datos de cliente pasa
   por `conOrg`, que exige un identificador de organización. Un usuario con varias membresías
   necesita un selector explícito, no una organización adivinada.
2. **La sesión no puede llevar la organización sin verificar la membresía.** Fijar `app.org_id` es
   suficiente para que las políticas dejen pasar los renglones. La verificación de que existe una
   membresía vigente y activa en esa organización tiene que ocurrir antes, en el código de sesión.
   Es el único punto donde el aislamiento depende de la aplicación y no del motor de base de datos.
3. **El hash de contraseña debe ser de función lenta.** El esquema no impone algoritmo. La
   extensión `pgcrypto` ya se crea en `rls.sql`, pero se crea para `gen_random_uuid()`, no como
   sustituto de un hash con factor de trabajo.
4. **Segundo factor para los roles con acceso a expedientes.** No está previsto en el esquema
   todavía.

## Roles

Enumeración `rol_membresia`, seis valores, definida en el esquema y todavía sin lógica de
autorización que la consuma:

| Rol | Alcance previsto |
|---|---|
| `superadmin` | Plataforma: cuentas, planes, límites y soporte. **No abre expedientes ajenos** |
| `owner` | Titular del despacho |
| `admin` | Administración del despacho |
| `abogado` | Trabajo sustantivo sobre expedientes |
| `asistente` | Apoyo operativo |
| `cliente` | Acceso al propio expediente |

El rol vive en `memberships`, no en `users`: la misma persona puede ser `owner` en un despacho y
`abogado` en otro.

**Pendiente:** la autorización por rol no está implementada. Hoy el aislamiento distingue entre
organizaciones, no entre roles dentro de una organización. Un `asistente` y un `owner` de la misma
organización ven exactamente lo mismo, porque las políticas comparan `org_id` y nada más. La capa
de permisos por rol es trabajo de la fase que implemente los casos de uso.

## Aislamiento entre organizaciones

**Implementado.** Es la garantía más fuerte del sistema y está en `packages/db/src/rls.sql`. El
detalle completo está en `database.md`; aquí solo lo que importa desde la seguridad.

### Dónde vive la garantía

En el motor de base de datos, no en la aplicación. La razón está escrita en el propio archivo: en
el código de la aplicación un olvido en una cláusula `where` derrumba el aislamiento.

Once tablas con datos de cliente llevan `enable row level security` y `force row level security`,
con política que compara `org_id` contra `current_setting('app.org_id', true)` en `using` y en
`with check`. `organizations` lleva la misma política comparando su `id`.

`force row level security` hace que la política aplique también al dueño de la tabla, para que un
descuido de despliegue no abra el aislamiento.

### Cerrado por omisión

Si no se fijó `app.org_id`, `current_setting` devuelve nulo, la comparación da nulo y ningún
renglón pasa el filtro. El estado por defecto es no ver nada, no ver todo.

### El rol de la aplicación no puede saltarse las políticas

```sql
create role jurifis_app login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
```

Y, deliberadamente, no es dueño de ninguna tabla, porque el dueño se salta la seguridad a nivel de
renglón de forma natural. Las migraciones corren con otro rol.

### El punto de entrada es uno solo

`conOrg` en `packages/db/src/index.ts`. Valida que el identificador sea un UUID antes de que llegue
a la base, abre transacción, ejecuta `set_config('app.org_id', <uuid>, true)` y corre el trabajo
dentro. El tercer argumento en `true` hace el ajuste local a la transacción: al terminar, la
conexión vuelve al pool sin contexto de organización, de modo que una conexión reutilizada no
arrastra la organización anterior.

`crearCliente` valida además cada nombre de esquema del `search_path` contra
`/^[a-z_][a-z0-9_$]*$/` antes de interpolarlo, y lo manda como parámetro de arranque de la conexión.

### El superadministrador no puede leer expedientes

Decisión de despacho, no limitación técnica, y está razonada en el encabezado de `rls.sql`:
`superadmin` existe para administrar cuentas, planes, límites y soporte. El contenido de un
expediente está cubierto por el secreto profesional que el abogado debe a su cliente, y ese deber
no tiene una excepción por conveniencia operativa del proveedor del software.

No existe ninguna política que exente a un rol de la comparación con `app.org_id`, ni siquiera al
superadministrador. Para ver un expediente hay que fijar la organización de ese expediente, y para
eso hace falta una membresía vigente en ella. El acceso de soporte a datos de cliente se concede
caso por caso, con autorización del despacho, y queda en `audit_log`.

### Riesgo residual conocido

El aislamiento es tan fuerte como la resolución de la organización en la sesión. Un defecto en el
código que decide qué organización fijar sí puede cruzar el límite. Ese es el punto que las pruebas
de aislamiento, todavía inexistentes, deben cubrir primero.

## Superficie pública actual

Dos endpoints, sin autenticación.

### `POST /api/plazos/calcular`

Riesgo bajo por lo que toca: solo lee el corpus, que es derecho publicado, y no escribe nada.
Controles ya presentes:

- Validación con Zod antes de llamar al motor.
- La forma de notificación se valida contra las formas que alguna regla del corpus declara,
  derivadas del dato y no escritas a mano.
- Las suspensiones están topadas en cincuenta por petición y exigen motivo y fundamento no vacíos.

Falta: limitación de tasa. Cada petición corre el conteo de días hábiles del motor, y el tope
defensivo del conteo es de cuatro mil iteraciones.

### `POST /api/prospectos`

**Recibe datos personales sin autenticación:** nombre, correo electrónico, teléfono, organización y
una descripción libre de hasta dos mil caracteres sobre la situación del prospecto. Ese último
campo es el delicado, porque un prospecto puede escribir ahí hechos de su asunto.

Estado del almacenamiento: los prospectos viven en un arreglo en memoria del proceso
(`apps/web/src/lib/almacen.ts`), colgado de `globalThis`. Se pierden al reiniciar. El código lo
declara y la respuesta lo devuelve como `"persistencia": "memoria"`, en lugar de aparentar que el
dato quedó guardado. Honesto, pero no es almacenamiento aceptable para datos personales en
producción.

Pendiente antes de exponerlo:

1. Limitación de tasa y defensa contra envío automatizado.
2. Persistencia en la tabla `leads`, que ya existe y está bajo aislamiento por organización.
3. Aviso de privacidad en el formulario, con la finalidad del tratamiento.
4. Registro del alta en `audit_log`.

## Manejo de documentos

Tabla `documents`, bajo aislamiento por organización.

**Implementado en el esquema:**

| Columna | Función de seguridad |
|---|---|
| `sha256` | Obligatoria. Huella del archivo. El comentario del esquema es explícito: si cambia sin aviso, el documento dejó de ser el mismo |
| `ruta_almacenamiento` | Obligatoria. El binario vive en el almacén, aquí solo la referencia |
| `subido_por` | Referencia al usuario |
| `borrado_en` | Borrado lógico, no físico |
| índice único `(org_id, sha256)` | Deduplicación dentro de la organización, y aislamiento de la deduplicación entre organizaciones |

Ese índice único merece atención: es único por organización y no global, a propósito. Un índice
global de hashes permitiría inferir que otro despacho tiene el mismo documento.

`texto_extraido` guarda el texto del documento en la misma tabla y bajo la misma política. Es
contenido de expediente y hereda el aislamiento.

**Pendiente:**

- El almacén de objetos no está elegido ni configurado. `ruta_almacenamiento` es texto libre.
- No hay cifrado en reposo definido a nivel de aplicación. El que dé el almacén y el que dé
  PostgreSQL en disco son los que hay.
- No hay verificación automática del `sha256` al leer. La columna existe; la comprobación no.
- No hay control de acceso por documento dentro de una organización.

## Bitácora de auditoría

Tabla `audit_log`. **Implementada como estructura y como política, sin escritores todavía.**

Columnas: `org_id`, `user_id`, `accion`, `entidad`, `entidad_id`, `datos_antes`, `datos_despues`,
`ip`, `agente_usuario`, `ocurrido_en`. Índices sobre `(org_id, ocurrido_en)` y `(entidad,
entidad_id)`.

Es de solo escritura, y eso está garantizado por dos candados independientes:

1. **Sin política.** Hay política `for insert` y política `for select`. No hay `for update` ni `for
   delete`. Con seguridad a nivel de renglón activa, lo que no tiene política queda negado.
2. **Sin permiso.** `revoke update, delete, truncate on table audit_log from jurifis_app`.

La justificación está en el código: una bitácora que se puede corregir no sirve como prueba de
nada. Coherente con eso, la tabla no lleva `actualizado_en` ni `borrado_en`, y su llave foránea a
`organizations` usa `on delete restrict`, de modo que borrar una organización no arrastra su
bitácora.

**Pendiente:** ningún código escribe en `audit_log` todavía. Lo que debe quedar registrado, como
mínimo:

- Inicio y cierre de sesión, y cambio de organización activa.
- Alta, cambio y borrado lógico de expedientes, clientes y documentos.
- Cada cómputo de plazo persistido y cada plazo marcado como cumplido.
- Cada acceso de soporte a datos de cliente.
- **Cada envío de contenido de expediente a un proveedor de modelos de lenguaje.** Ver el apartado
  siguiente.

## Decisión registrada del despacho: envío de contenido de expediente a un proveedor de modelos de lenguaje

NOVA LEGAL, S.C. resolvió permitir que contenido de expediente salga hacia un proveedor externo de
modelos de lenguaje, en lugar de prohibirlo por completo. La decisión se registra aquí porque toca
secreto profesional y porque quien opere el sistema tiene que conocerla.

El razonamiento: la prohibición absoluta empuja el trabajo fuera del sistema, donde no hay
bitácora, no hay interruptor y no hay contrato. Se prefiere una salida controlada, registrada y
reversible sobre una prohibición que se incumple sin dejar rastro.

La decisión queda sujeta a **cuatro candados, acumulativos**. Los cuatro deben cumplirse; que falte
uno cancela la autorización para ese expediente.

### Candado 1. Consentimiento del cliente asentado en el expediente

Ningún contenido de un expediente sale sin que el consentimiento del cliente conste en ese
expediente. No es una casilla en la configuración de la organización ni una cláusula general del
contrato de servicios: es constancia por expediente.

**Pendiente de implementación.** Cabe como renglón de `case_events` con un `tipo` reservado, o como
documento en `documents` cuando el consentimiento sea un escrito firmado. El esquema no tiene
todavía columna ni tipo dedicado.

### Candado 2. Registro de cada envío en la bitácora

Cada envío se asienta en `audit_log`: quién, cuándo, qué expediente, qué se envió y a qué
proveedor. Un envío sin registro es una fuga, no un uso.

**Pendiente de implementación.** La tabla existe y es inalterable por diseño, que es la mitad
difícil. Falta el escritor.

Recomendación de forma, para que el registro sirva de prueba sin volverse otra copia del
expediente: `accion` con un valor reservado, `entidad` igual a `cases`, `entidad_id` con el
expediente, y en `datos_despues` el proveedor, el modelo, el conteo de caracteres y el hash de lo
enviado. **El hash y no el texto:** guardar el contenido enviado dentro de la bitácora duplicaría
el material sensible en una tabla que nadie puede corregir.

### Candado 3. Interruptor por expediente

La autorización se enciende y se apaga expediente por expediente, no de una vez para todo el
despacho. Apagado por omisión.

**Pendiente de implementación.** Requiere columna nueva en `cases`, booleana y no nula, con valor
por omisión falso, más el registro en `audit_log` de cada encendido y apagado. Que el valor por
omisión sea falso es parte del candado: un expediente nuevo nace sin autorización.

### Candado 4. Contrato con el proveedor que excluya el uso de datos para entrenamiento

El contrato con el proveedor debe excluir expresamente el uso del contenido enviado para entrenar
modelos. Sin esa cláusula, el proveedor no se usa, por buenos que sean sus resultados.

**Es una condición contractual, no de código.** Lo que el código debe garantizar es que solo se
pueda dirigir tráfico a proveedores previamente aprobados: lista blanca en configuración, no una
dirección de red tomada de una variable de entorno arbitraria.

### Lo que los cuatro candados no cubren

- **Los datos del cliente en la petición.** Nombre, Registro Federal de Contribuyentes y domicilio
  no aportan nada al análisis jurídico y sí identifican. Conviene sustituirlos antes de enviar.
  Ninguno de los cuatro candados lo exige.
- **Retención en el proveedor.** El contrato excluye entrenamiento; la retención para depuración o
  para detección de abuso es otra cosa y debe pactarse aparte.
- **El resto de la flota.** Esta decisión gobierna a JURIFIS. Otras herramientas del despacho tienen
  sus propias reglas de egreso.

## Resumen del estado

| Control | Estado |
|---|---|
| Aislamiento entre organizaciones en el motor de base de datos | Implementado |
| Rol de aplicación sin capacidad de saltarse las políticas | Implementado |
| Punto de entrada único con contexto de organización por transacción | Implementado |
| Validación de identificador de organización y de `search_path` | Implementado |
| Bitácora inalterable por política y por permiso | Implementado |
| Catálogo jurídico sin escritura desde la aplicación | Implementado |
| Huella `sha256` obligatoria en documentos | Implementado en el esquema |
| Pruebas de estructura del esquema y del texto de `rls.sql` | Implementadas, 34 casos |
| Pruebas de aislamiento contra una base viva | **Pendiente** |
| Validación de entrada en los dos endpoints existentes | Implementada con Zod |
| Autenticación y sesión | **Pendiente**, los dos endpoints son públicos |
| Limitación de tasa | **Pendiente** |
| Persistencia y aviso de privacidad de los prospectos | **Pendiente**, hoy viven en memoria |
| Autorización por rol dentro de la organización | **Pendiente** |
| Escritores de la bitácora | **Pendiente** |
| Los cuatro candados del envío a proveedor de modelos de lenguaje | **Pendiente** en código |
| Cifrado en reposo definido | **Pendiente** |
