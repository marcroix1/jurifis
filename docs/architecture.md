# Arquitectura

Estado del código al 12 de septiembre de 2026. Este documento describe lo que hay en el
repositorio, no lo que se planea. Donde algo todavía no existe, se dice.

## Forma general: monolito modular de cuatro anillos

JURIFIS es un monolito modular, no un conjunto de servicios. La separación no está en la red,
está en las dependencias: cada anillo puede importar hacia adentro y nunca hacia afuera.

```
        ┌─────────────────────────────────────────────┐
        │  Anillo 4. Interfaz                          │
        │  apps/web (Next.js, React)                   │
        │  ┌───────────────────────────────────────┐   │
        │  │  Anillo 3. Adaptadores                 │   │
        │  │  packages/db (PostgreSQL, Drizzle)     │   │
        │  │  almacén de documentos, correo         │   │
        │  │  ┌─────────────────────────────────┐   │   │
        │  │  │  Anillo 2. Casos de uso          │   │   │
        │  │  │  (pendiente de implementación)   │   │   │
        │  │  │  ┌───────────────────────────┐   │   │   │
        │  │  │  │  Anillo 1. Núcleo puro     │   │   │   │
        │  │  │  │  packages/core/src         │   │   │   │
        │  │  │  │  + datos/ (el derecho)     │   │   │   │
        │  │  │  └───────────────────────────┘   │   │   │
        │  │  └─────────────────────────────────┘   │   │
        │  └───────────────────────────────────────┘   │
        └─────────────────────────────────────────────┘

        Las flechas de dependencia apuntan siempre hacia adentro.
```

### Anillo 1. Núcleo puro, sin entrada ni salida

`packages/core/src`. Seis archivos y un subdirectorio en curso:

| Archivo | Responsabilidad |
|---|---|
| `fecha.ts` | Aritmética de fechas civiles sin el objeto `Date` nativo |
| `tipos.ts` | Contratos de datos: `ReglaPlazo`, `Calendario`, `EntradaComputo`, `ResultadoComputo` |
| `calendario.ts` | Clase `Almanaque`: resuelve un conjunto de calendarios y responde día por día |
| `motor.ts` | `calcularPlazo`: los ocho pasos del cómputo |
| `registro.ts` | Carga el corpus desde disco y resuelve regla e identificadores de calendario |
| `index.ts` | `calcular`, punto de entrada único |
| `diagnostico/` | Cuestionario preliminar de procedencia: `tipos.ts`, `lenguaje.ts`, `arbol.ts`, `resultado.ts`, `registro.ts`, `index.ts`. Exportado desde `index.ts` del paquete |

El núcleo no abre archivos en tiempo de ejecución, no habla con la red, no consulta la hora del
sistema y no conoce PostgreSQL ni HTTP. Los datos entran como importaciones estáticas de JSON
resueltas en tiempo de compilación (`registro.ts`, importaciones con `with { type: 'json' }`).

El módulo `diagnostico` sigue el mismo patrón: el cuestionario "puedo impugnar" es dato
(`packages/core/datos/diagnostico/preguntas.json`, versión `2026-09-12`, catorce preguntas) y el
código solo lo recorre. Su encabezado fija el alcance: orienta, no promete; no cita preceptos,
tesis ni plazos, y para cada vía posible entrega el identificador de la regla que el motor de
plazos debe computar. Lo que no se sabe se declara como información faltante en lugar de suponerse,
y `lenguaje.ts` mantiene una lista de frases prohibidas para que el texto del cuestionario no
prometa resultados.

Dos consecuencias verificables de esa pureza:

1. **No hay `Date`.** `fecha.ts` documenta el motivo en su encabezado: el objeto `Date` arrastra
   hora, zona horaria y horario de verano, y es la causa clásica del error de un día. Aquí una
   fecha es un entero de días desde el primero de enero de 1970 y nada más, con los algoritmos de
   conversión de Howard Hinnant. En este producto un día de diferencia es un plazo perdido.
2. **No hay reloj.** La fecha de referencia contra la que se calculan días transcurridos y
   restantes entra por el campo `hoy` de `EntradaComputo`. Si no se pasa, el resultado devuelve
   `null` en `diasTranscurridos` y `diasRestantes`. El núcleo nunca pregunta qué día es.

Esto es lo que hace que la prueba `ida y vuelta en 40 anios` de `packages/core/test/motor.test.ts`
pueda recorrer cada día entre 2000 y 2040 y comparar sin ambigüedad.

### Anillo 2. Casos de uso

**Pendiente de implementación.** No existe todavía un paquete de casos de uso. La orquestación que
le corresponde (registrar una notificación en un expediente, disparar el cómputo, persistir el
resultado con su traza, programar el aviso del guardián de términos) no está escrita.

El anillo está saltado en el código actual: `apps/web/src/app/api/plazos/calcular/route.ts` importa
`calcular` de `@jurifis/core` y lo invoca directamente. Funciona porque el cómputo no persiste
nada. En cuanto un endpoint tenga que calcular y guardar en la misma operación, este anillo deja de
ser opcional.

### Anillo 3. Adaptadores

`packages/db`. Esquema de PostgreSQL con Drizzle ORM (`src/schema.ts`), extensiones
(`src/extensiones.sql`), políticas de aislamiento en SQL plano (`src/rls.sql`), cliente y
transacción con contexto de organización (`src/index.ts`), configuración de migraciones
(`drizzle.config.ts`) y la migración inicial generada (`migraciones/0000_inicial.sql`, 399 líneas).
Detalle en `database.md`.

La forma de la dependencia importa: `packages/db` conoce al núcleo por convención de datos, no por
importación. La tabla `deadlines` guarda `regla_clave` como texto, con el comentario explícito de
que debe coincidir con el identificador de la regla del motor. El núcleo no sabe que la base de
datos existe.

Otros adaptadores previstos y todavía inexistentes: almacén de documentos, envío de correo,
proveedor de modelos de lenguaje.

### Anillo 4. Interfaz

`apps/web`, con Next.js 15 y React 19. Cuatro páginas y dos manejadores de ruta:

| Ruta | Archivo |
|---|---|
| `/` | `src/app/page.tsx` |
| `/plazos` | `src/app/plazos/page.tsx`, con la calculadora y la ficha de cada regla |
| `/diagnostico` | `src/app/diagnostico/page.tsx`, el cuestionario preliminar |
| `/admin` | `src/app/admin/page.tsx` |
| `POST /api/plazos/calcular` | `src/app/api/plazos/calcular/route.ts` |
| `POST /api/prospectos` | `src/app/api/prospectos/route.ts` |

Componentes en `src/componentes`, incluidos los específicos del cómputo:
`plazos/CalculadoraPlazos.tsx`, `plazos/ResultadoPlazo.tsx`, `plazos/FichaRegla.tsx` y
`plazos/CitaFundamento.tsx`. Utilidades en `src/lib`: `corpus.ts`, `almacen.ts`, `formato.ts`,
`tipos-ui.ts`.

**Depende de `@jurifis/core` y todavía no de `@jurifis/db`.** La consecuencia está declarada en el
encabezado de `src/lib/almacen.ts`: los prospectos viven en memoria del servidor y se pierden al
reiniciar el proceso, porque la aplicación aún no se conecta a PostgreSQL. La respuesta de
`POST /api/prospectos` devuelve `"persistencia": "memoria"` y la pantalla de administración lo
declara, en lugar de aparentar que el dato quedó guardado.

`src/lib/corpus.ts` es la frontera entre el anillo 1 y el anillo 4: reduce `REGLAS` y `CALENDARIOS`
a resúmenes para la interfaz, y su encabezado repite la regla, aquí no se decide nada de derecho.

`next.config.ts` transpila `@jurifis/core` como TypeScript sin compilar y define un alias de
extensión para que las importaciones con extensión `.js` del código fuente resuelvan a los
archivos `.ts`.

## Por qué el derecho vive como dato y no como código

Ninguna regla de plazo está escrita en TypeScript. Las diecinueve reglas del corpus son archivos
JSON en `packages/core/datos/reglas`, y los cinco calendarios de días inhábiles son archivos JSON
en `packages/core/datos/calendarios`. `motor.ts` no contiene un solo número de artículo ni un solo
plazo. Contiene el procedimiento; el contenido lo lee.

Cuatro razones, todas operativas:

**El derecho cambia y el código no debería.** El Código Fiscal de la Federación se reformó el 9 de
abril de 2026, la Ley Federal de Procedimiento Contencioso Administrativo el 9 de junio de 2026, la
Ley de Amparo el 16 de octubre de 2025. Cada reforma se absorbe editando o agregando un archivo de
datos con su campo `vigenteDesde` y `vigenteHasta`, sin tocar el motor y sin volver a probar la
aritmética.

**Cada regla tiene que poder señalar su fuente.** El tipo `Fundamento` obliga a declarar
ordenamiento, artículo, publicación, archivo del acervo y línea. Eso es un dato con estructura, no
un comentario en el código. La prueba `cada regla cita archivo y ordenamiento` lo verifica sobre
todas las reglas cargadas.

**La regla aplicable es la vigente a la fecha del acto, no la de hoy.** El motor compara la fecha
de notificación contra `vigenteDesde` y `vigenteHasta` y se detiene si el acto cae fuera de la
ventana, pidiendo que se cargue el texto anterior o la reforma posterior (`motor.ts`, paso 1). Un
plazo calculado en 2026 se tiene que poder reproducir igual en 2031 con la regla que regía
entonces. Con el derecho compilado dentro del código eso exige recuperar el binario de esa fecha;
con el derecho como dato, exige recuperar el archivo.

**Un archivo JSON lo puede revisar un abogado.** Un archivo TypeScript no.

El mismo criterio baja a la base de datos: el encabezado de `packages/db/src/schema.ts` declara que
ese archivo define estructura y nunca contenido jurídico, sin artículos, plazos, tesis, registros ni
fechas oficiales como valores por omisión.

## Por qué el motor se niega a estimar

El comentario que gobierna `motor.ts` lo dice completo: si algo falta, no se estima; se devuelve
confianza degradada, sin fecha, y la lista de lo que hace falta.

`ResultadoComputo` no tiene una fecha y un margen de error. Tiene un campo `confianza` con cuatro
valores y un campo `vence` que es nulo en dos de ellos:

| Confianza | Significado | ¿Devuelve fecha? |
|---|---|---|
| `verificada` | Regla y calendario de nivel A, cobertura completa | Sí |
| `parcial` | Calcula, pero algo la sostiene con nivel B declarado por un abogado | Sí, con advertencia |
| `insuficiente` | Falta calendario para el periodo | No |
| `bloqueada_por_fuente` | La regla se apoya en nivel B sin declaración | No |

Los cinco puntos donde el motor se detiene en lugar de suponer:

1. **Regla fuera de vigencia** para la fecha del acto (paso 1).
2. **Fuente de nivel B sin declaración de vigencia** de un abogado responsable. Devuelve
   `bloqueada_por_fuente` y no calcula.
3. **Forma de notificación sin regla de surtimiento** en esa regla. El motor no aplica la de otra
   forma parecida: pide el precepto que la fija.
4. **Cobertura de calendario incompleta** (paso 4). Si algún calendario no declara cubrir todos los
   años que el plazo puede tocar, o declara un hueco que cae dentro del periodo, el motor devuelve
   `insuficiente`. La traza lo dice con esas palabras: "Incompleta. El motor se detiene aquí en
   lugar de estimar".
5. **Regla inexistente en el corpus.** `buscarRegla` lanza `ReglaDesconocida` con el mensaje "El
   motor no inventa reglas". Es la única condición que sale como excepción y no como resultado
   degradado, porque es un error de programación, no una laguna del corpus.

Tampoco infiere suspensiones. El paso 6 de la traza lo declara siempre: "Ninguna registrada en el
expediente. El motor no infiere suspensiones". Las suspensiones entran como eventos del expediente
en `EntradaComputo.suspensiones`, con motivo y fundamento, o no existen.

La razón de fondo es de responsabilidad profesional. Un plazo estimado con un calendario incompleto
se ve idéntico a un plazo correcto: misma fecha, mismo formato, misma pantalla. El abogado que lo
lee no tiene forma de distinguirlos, y el error se descubre el día en que el escrito se presenta
fuera de término. Un resultado sin fecha, en cambio, es imposible de confundir con una respuesta.

Consecuencia asumida: el sistema devuelve "no sé" con frecuencia. Al 12 de septiembre de 2026,
ninguna de las diecinueve reglas devuelve fecha para una notificación practicada hoy, porque el
hueco del segundo periodo de vacaciones de las autoridades fiscales y la ausencia de calendarios
para 2027 caen dentro de la ventana de cobertura. Ver `legal-rules.md`, sección de huecos
declarados. Eso es el comportamiento correcto, no una falla.

## La traza como producto

`calcularPlazo` no devuelve una fecha: devuelve una fecha, ocho pasos numerados con su fundamento,
la lista de días inhábiles descartados con motivo y fundamento de cada uno, las fuentes aplicadas,
las advertencias y los faltantes.

Los ocho pasos son fijos y la prueba `trae los ocho pasos con su fundamento` verifica que la traza
llegue completa:

1. Regla aplicable y verificación de vigencia
2. Surtimiento de efectos según la forma de notificación
3. Primer día del cómputo
4. Cobertura del calendario
5. Conteo
6. Suspensiones registradas
7. Prórroga si el vencimiento cae inhábil
8. Traza emitida, con el nivel de confianza

Es lo que permite defender el cómputo ante el cliente y ante la Sala. Toda respuesta trae además
una advertencia fija, presente incluso cuando la confianza es `verificada`: el cómputo no sustituye
la verificación del abogado responsable ni constituye cómputo oficial.

## Pruebas

Noventa y seis pruebas en verde con Vitest, repartidas en tres archivos. `npm test` en la raíz pasa.

| Archivo | Pruebas | Cubre |
|---|---|---|
| `packages/core/test/motor.test.ts` | 20 | Aritmética de fechas, doble desfase entre notificación y surtimiento, descuento del periodo vacacional del Tribunal Federal de Justicia Administrativa, negativa a estimar, divergencia del surtimiento entre ordenamientos, nivel de fuente, integridad del corpus |
| `packages/core/test/diagnostico.test.ts` | 42 | Cuestionario preliminar: validación del árbol, condiciones de ramificación, lenguaje prudente, armado del diagnóstico |
| `packages/db/test/schema.test.ts` | 34 | Estructura del esquema y texto de `rls.sql`, sin tocar base de datos |

Dos merecen mención aparte.

`nunca vence en dia inhabil` recorre cada día de notificación entre el 5 de enero y el 30 de junio
de 2026 y verifica que ningún vencimiento caiga en fin de semana. Es una prueba de propiedad, no de
ejemplo.

`packages/db/test/schema.test.ts` descubre las tablas por introspección y no por lista escrita a
mano, de modo que una tabla nueva entra sola a todas las pruebas del archivo. Su encabezado dice
qué cuida: lo que, si se rompe, se rompe en silencio. Una tabla nueva con datos de cliente que se
olvida el `org_id`, un valor de enumeración que se cambia de nombre, una tabla que llega a
producción sin política de aislamiento. Ninguna de esas fallas se nota al probar la aplicación con
una sola organización. Verifica también que el esquema no fije valores por omisión en columnas de
contenido jurídico, que la bitácora no tenga política de modificación ni de borrado, y que quede
escrito por qué el superadministrador no lee expedientes.
