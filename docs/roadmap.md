# Hoja de ruta

Estado real al 12 de septiembre de 2026.

> El repositorio nombra solamente la fase 1, en el `README.md` de la raíz ("Fase 1 arrancada"). El
> alcance de las cinco fases que sigue es la planeación del proyecto, no un texto que exista en el
> código. El **estado** de cada una sí está verificado contra los archivos.

## Panorama

| Fase | Alcance | Estado al 12 de septiembre de 2026 |
|---|---|---|
| 1 | Motor de plazos y corpus jurídico | **En curso.** Núcleo terminado y probado; corpus incompleto para operar |
| 2 | Persistencia, expedientes y aislamiento | **En curso.** Esquema, políticas, migración inicial y 34 pruebas de estructura; sin base aplicada y sin conexión desde la aplicación |
| 3 | Interfaz de trabajo y guardián de términos | **En curso.** Cuatro páginas y dos endpoints; sin autenticación, sin expedientes y sin guardián |
| 4 | Acervo de criterios y asistencia con modelos de lenguaje | **No iniciada.** Existen la tabla y la columna de vectores, nada más |
| 5 | Multiinquilino comercial y operación | **No iniciada.** Existen las tablas de suscripción y consumo, sin lógica |

Estado de las pruebas: **noventa y seis en verde**, y `npm test` en la raíz pasa.

| Archivo | Pruebas |
|---|---|
| `packages/core/test/motor.test.ts` | 20 |
| `packages/core/test/diagnostico.test.ts` | 42 |
| `packages/db/test/schema.test.ts` | 34 |

Una observación que atraviesa todas las fases: **el `README.md` de la raíz está desactualizado.**
Dice doce reglas y dieciocho pruebas; el corpus tiene diecinueve reglas desde el commit `918e850` y
la suite noventa y seis. La carpeta `docs/` es propiedad de otro trabajo; la corrección del
`README.md` corresponde a quien lo tenga asignado.

## Fase 1. Motor de plazos y corpus jurídico

**Alcance.** Cómputo de plazos reproducible y auditable, con el derecho como dato versionado. Un
núcleo puro sin entrada ni salida, un corpus de reglas y calendarios con fuente verificada, y una
traza que permita defender cada cómputo.

### Terminado

- Aritmética de fechas civiles sin el objeto `Date` nativo (`packages/core/src/fecha.ts`),
  algoritmos de Howard Hinnant, verificada día por día entre 2000 y 2040.
- Contratos de datos completos: `ReglaPlazo`, `ReglaSurtimiento`, `Calendario`, `DiaInhabil`,
  `Fundamento`, `EntradaComputo`, `ResultadoComputo`, `PasoTraza` (`tipos.ts`).
- Clase `Almanaque` con resolución de días inhábiles, siguiente día hábil y verificación de
  cobertura (`calendario.ts`).
- Motor de ocho pasos con traza fundamentada (`motor.ts`).
- Régimen de confianza de cuatro niveles, con negativa a estimar en cinco puntos distintos.
- Surtimiento de efectos como dato por forma de notificación, con fundamento propio por entrada.
- Registro del corpus y punto de entrada único (`registro.ts`, `index.ts`).
- Veinte pruebas del motor en verde, incluida una prueba de propiedad que recorre medio año de
  fechas de notificación.
- Módulo `diagnostico` completo: cuestionario preliminar "puedo impugnar" como dato
  (`packages/core/datos/diagnostico/preguntas.json`, versión `2026-09-12`, catorce preguntas),
  árbol de ramificación con condiciones, validador de lenguaje prudente con lista de frases
  prohibidas, armado del diagnóstico, y `diagnosticar` como punto de entrada. Exportado desde el
  `index.ts` del paquete. Cuarenta y dos pruebas en verde.

  El módulo respeta la misma disciplina que el motor: orienta y no promete, no cita preceptos,
  tesis ni plazos, y para cada vía posible entrega el identificador de la regla que el motor debe
  computar. Lo que no se sabe se declara como información faltante. "No lo sé" es respuesta válida
  y no se colapsa en sí ni en no.

### Pendiente y bloqueante para operar

1. **Calendarios 2027 para los cinco ordenamientos.** Sin ellos, ninguna de las diecinueve reglas
   devuelve fecha para una notificación practicada hoy. Es el bloqueo más grave del proyecto. Ver
   `legal-rules.md`, huecos declarados.
2. **Segundo periodo general de vacaciones del Servicio de Administración Tributaria 2026.** No
   publicado al día de hoy. No depende del equipo; depende del Diario Oficial de la Federación.
3. **Acuerdo del Pleno que publica los días inhábiles del Tribunal Federal de Justicia
   Administrativa 2026.** Mientras no se localice, `tfja-2026` es nivel B y las diez reglas de la
   Ley Federal de Procedimiento Contencioso Administrativo no pueden pasar de confianza `parcial`.
4. **Texto oficial del Reglamento del Recurso de Inconformidad.** Es la única regla de nivel B, y
   sus fundamentos no traen número de línea.
5. **Campo de fundamento para `inicio.primerDia`.** El precepto que rige el primer día del cómputo
   no cabe en el modelo actual y vive solo en el historial de git.
6. **Uniformar `inicio.primerDia` de `cff-121`,** que es la única regla con `siguiente_habil` frente
   a dieciocho con `siguiente_natural`.
7. Reglas de plazo de las materias que faltan: Ley del Seguro Social, Instituto del Fondo Nacional
   de la Vivienda para los Trabajadores, ordenamientos fiscales estatales.

### Deuda técnica de la fase

- El campo `incluyeDiaVencimiento` está declarado en el tipo y presente en las diecinueve reglas,
  y **`motor.ts` nunca lo lee**. O se implementa o se retira.
- Las unidades `dias_naturales`, `meses` y `anios` están implementadas en el motor y **ninguna
  regla del corpus las usa**, de modo que esas ramas no tienen cobertura de pruebas. La rama de
  meses y años, además, produce una advertencia genérica cuando el día equivalente no existe en el
  mes destino, en lugar de aplicar la regla del ordenamiento.
- `Almanaque` calcula `finesDeSemanaInhabiles` con `some` sobre los calendarios: basta que uno lo
  declare para que aplique a todos. Hoy los cinco lo declaran, así que no cambia nada, pero es una
  regla implícita que conviene hacer explícita.

## Fase 2. Persistencia, expedientes y aislamiento

**Alcance.** Guardar expedientes, clientes, actuaciones, documentos y plazos computados con su
traza, bajo aislamiento estricto por organización.

### Terminado

- Esquema completo en `packages/db/src/schema.ts`: veinte tablas, cinco enumeraciones, relaciones
  de Drizzle para dieciséis tablas, índices y llaves foráneas con política de borrado deliberada.
- Aislamiento por organización en `packages/db/src/rls.sql`: seguridad a nivel de renglón forzada
  en once tablas más `organizations`, rol de aplicación sin capacidad de saltarse las políticas,
  bitácora inalterable por política y por permiso, catálogo jurídico sin escritura desde la
  aplicación.
- Cliente y contexto transaccional en `packages/db/src/index.ts`: `crearCliente`, `conOrg`,
  validación de identificador de organización y de `search_path`.
- Extensiones en `src/extensiones.sql`, con el orden de despliegue documentado y sentencias
  idempotentes.
- Migración inicial generada: `migraciones/0000_inicial.sql`, 399 líneas, con instantánea y diario.
- Treinta y cuatro pruebas de estructura en `test/schema.test.ts`, que verifican el contrato de
  clasificación de tablas, el aislamiento declarado, las cinco enumeraciones, la reproducibilidad
  de los plazos guardados, la bitácora de solo escritura, el texto de `rls.sql` y que el esquema no
  fije valores por omisión en columnas de contenido jurídico.

### Pendiente

1. **Pruebas de aislamiento contra una base viva.** Las treinta y cuatro existentes no abren
   conexión: leen la definición de Drizzle en memoria y el texto de `rls.sql`. Que la política esté
   escrita en el archivo no es lo mismo que comprobar que un renglón ajeno no se ve. Es lo más
   urgente de la fase.
2. **Aplicar la migración contra una base real** y verificar el efecto de `rls.sql` conectándose
   como `jurifis_app` sin fijar `app.org_id`.
3. **Migración de datos del corpus** a `legal_rules`, `holiday_calendars` y `holidays`, verificada
   contra fuente de nivel A.
4. **Conectar la aplicación al paquete.** `apps/web` no depende de `@jurifis/db` todavía, y por eso
   los prospectos viven en memoria.
5. **Capa de casos de uso.** No existe el anillo 2 de la arquitectura. El endpoint de cómputo llama
   a `calcular` directamente, lo que funciona mientras no persista nada.
6. Precisar la clasificación de `organizations`, que aparece en `TABLAS_CATALOGO` pese a llevar
   política de aislamiento.

## Fase 3. Interfaz de trabajo y guardián de términos fatales

**Alcance.** Aplicación web para el trabajo diario: alta de expedientes, registro de
notificaciones, cómputo de plazos con su traza a la vista, agenda de vencimientos y avisos que
impidan que un término venza en silencio.

### Terminado

`apps/web` con Next.js 15, React 19, Zod y Tailwind, incluida en los espacios de trabajo de la
raíz. Compila: existe el resultado de `next build`.

Cuatro páginas: `/`, `/plazos` con la calculadora y las fichas de reglas, `/diagnostico` con el
cuestionario preliminar, y `/admin`.

Dos manejadores de ruta: `POST /api/plazos/calcular`, que valida con Zod contra las formas que el
corpus sabe atender y devuelve el `ResultadoComputo` tal cual; y `POST /api/prospectos`. Detalle en
`api.md`.

Componentes de presentación del cómputo: `CalculadoraPlazos`, `ResultadoPlazo`, `FichaRegla` y
`CitaFundamento`. La lectura del corpus para la interfaz está aislada en `src/lib/corpus.ts`, que
reduce `REGLAS` y `CALENDARIOS` a resúmenes sin decidir nada de derecho.

### Pendiente

1. **Autenticación y sesión.** Nada implementado. Los dos endpoints son públicos. Ver `security.md`.
2. **Autorización por rol** dentro de la organización.
3. **Conexión a la base.** `apps/web` no depende de `@jurifis/db`. Los prospectos viven en memoria
   del servidor y se pierden al reiniciar el proceso, cosa que el código declara abiertamente en
   `src/lib/almacen.ts` y en la respuesta del endpoint, con `"persistencia": "memoria"`.
4. **Expedientes, clientes, documentos y agenda.** Ninguna pantalla ni endpoint.
5. **Guardián de términos fatales.** La tabla `notifications` existe y su comentario dice que el
   guardián escribe ahí; el guardián no existe. Necesita trabajo programado que barra `deadlines`
   por `vence`, que para eso está el índice.
6. **Limitación de tasa en `POST /api/prospectos`.** Acepta datos personales sin autenticación y
   sin freno.
7. **Validación de coherencia de suspensiones.** El endpoint de cómputo comprueba el formato de
   `desde` y `hasta`, no que la primera sea anterior a la segunda.

## Fase 4. Acervo de criterios y asistencia con modelos de lenguaje

**Alcance.** Búsqueda de jurisprudencia, tesis, precedentes y sentencias del acervo del despacho,
con búsqueda semántica, y asistencia de redacción sujeta a los cuatro candados del despacho.

### Terminado

Solo la estructura: tabla `jurisprudence` con tipo de criterio, rubro, texto, órgano, época,
registro digital, materia, precedentes, clave de control, instancia, nivel de fuente, bandera
`verificado` y columna `embedding` de mil quinientas treinta y seis dimensiones con índice HNSW.
La extensión `vector` se crea en `rls.sql`.

### Pendiente

Todo lo demás: ingesta del acervo, generación de vectores, búsqueda, y los cuatro candados del
envío de contenido de expediente a un proveedor de modelos de lenguaje. De los cuatro, ninguno está
implementado en código, y tres requieren cambios de esquema o escritores nuevos:

| Candado | Qué falta |
|---|---|
| Consentimiento del cliente asentado en el expediente | Tipo de evento o documento dedicado |
| Registro de cada envío en la bitácora | Escritor de `audit_log` |
| Interruptor por expediente | Columna booleana en `cases`, apagada por omisión |
| Contrato que excluya uso para entrenamiento | Condición contractual, más lista blanca de proveedores en configuración |

Detalle en `security.md`.

Regla que no se negocia en esta fase: el candado de citación. `jurisprudence.verificado` tiene valor
por omisión falso y ningún escrito cita un renglón sin verificar.

## Fase 5. Multiinquilino comercial y operación

**Alcance.** Alta de despachos, planes, límites, facturación, captación de prospectos y operación
del servicio.

### Terminado

Solo la estructura: `subscriptions` con plan, estado, proveedor, periodo, límite de usuarios y
límite de expedientes; `usage` con periodo, métrica y cantidad, con índice único sobre organización,
periodo y métrica; `leads` con origen, estado y conversión a cliente. Las tres bajo aislamiento por
organización.

### Pendiente

Todo lo funcional: alta de organizaciones, invitación de usuarios, integración con proveedor de
pagos, medición de consumo, aplicación de límites de plan, respaldos con prueba de restauración y
vigilancia. Ver `deployment.md`.

## Orden sugerido de trabajo

1. **Cargar los calendarios 2027.** Sin eso el producto no responde nada útil hoy: la calculadora
   ya está en línea y devuelve confianza insuficiente para toda notificación practicada ahora.
2. Aplicar la migración contra una base real y escribir las pruebas de aislamiento que sí abran
   conexión.
3. Migrar el corpus a `legal_rules`, `holiday_calendars` y `holidays`.
4. Autenticación, sesión y resolución de organización activa con verificación de membresía.
5. Escribir la capa de casos de uso entre el núcleo y la interfaz, antes del primer endpoint que
   calcule y guarde en la misma operación.
6. Expedientes y plazos persistidos con su traza.
7. Guardián de términos fatales.
8. Escritores de la bitácora de auditoría, incluidos los del envío a proveedor de modelos de
   lenguaje.
