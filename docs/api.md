# Interfaz de programación, fase 1

Estado al 12 de septiembre de 2026.

**Dos endpoints existen y funcionan.** El resto de la fase 1 está pendiente. Se distingue en cada
apartado lo implementado de lo proyectado.

| Endpoint | Estado |
|---|---|
| `POST /api/plazos/calcular` | **Implementado**, `apps/web/src/app/api/plazos/calcular/route.ts` |
| `POST /api/prospectos` | **Implementado**, `apps/web/src/app/api/prospectos/route.ts`, con persistencia en memoria |
| Todo lo relativo a expedientes, clientes, documentos y agenda | Pendiente |

Advertencia que atraviesa todo el documento: **no hay autenticación ni contexto de organización
todavía.** Los dos endpoints existentes son públicos. Ninguno toca `packages/db`. Ver
`security.md`.

## Interfaz del paquete

```ts
import { calcular } from '@jurifis/core';

const resultado = calcular({
  reglaId: 'lfpca-13-I-a',
  fechaNotificacion: '2026-02-06',
  formaNotificacion: 'personal',
  hoy: '2026-03-02',
});
```

Exportaciones públicas de `packages/core/src/index.ts`: `calcular`, `calcularPlazo`, `Almanaque`,
`REGLAS`, `CALENDARIOS`, `buscarRegla`, `almanaqueDe`, `ReglaDesconocida`, `CalendarioFaltante`,
todo `fecha.ts`, todo `tipos.ts` y todo el módulo `diagnostico`, que aporta entre otros
`diagnosticar`, `CUESTIONARIO`, `armarDiagnostico`, `avanzar`, `validarCuestionario` y
`lenguajePrudente`.

## `POST /api/plazos/calcular`

Implementado. Cálculo puro: no escribe nada y no requiere expediente. Es el envoltorio en HTTP de
la función `calcular`.

Declara `runtime = 'nodejs'` y `dynamic = 'force-dynamic'`.

El encabezado del archivo fija el criterio: la validación no decide derecho, solo comprueba la
forma de la entrada contra lo que el corpus sabe atender. Todo lo demás lo resuelve el motor, y su
resultado se devuelve tal cual, con traza, fuentes y confianza.

### Petición

El cuerpo es `EntradaComputo`, validado con Zod:

```ts
interface EntradaComputo {
  reglaId: string;
  fechaNotificacion: FechaISO;
  formaNotificacion: FormaNotificacion;
  /** Fecha contra la que se calculan dias transcurridos y restantes. */
  hoy?: FechaISO;
  /** Suspensiones registradas como eventos del expediente. Nunca inferidas. */
  suspensiones?: { desde: FechaISO; hasta: FechaISO; motivo: string; fundamento: string }[];
}
```

| Campo | Obligatorio | Validación real del endpoint |
|---|---|---|
| `reglaId` | Sí | Cadena no vacía. La existencia la resuelve el motor |
| `fechaNotificacion` | Sí | `/^\d{4}-\d{2}-\d{2}$/`. El motor revalida mes, día y año bisiesto |
| `formaNotificacion` | Sí | Debe estar entre las formas que **alguna regla del corpus** declara |
| `hoy` | No | Mismo formato de fecha |
| `suspensiones` | No | Arreglo, **máximo cincuenta**. Cada una exige `desde`, `hasta`, `motivo` no vacío y `fundamento` no vacío |

Dos detalles que conviene conocer:

**La lista de formas admisibles se deriva del corpus, no está escrita en el endpoint.**
`formasDelCorpus()` en `apps/web/src/lib/corpus.ts` recorre `REGLAS` y junta las formas que alguna
declara. Hoy son siete: `acto_autoaplicativo`, `boletin_jurisdiccional`, `buzon_tributario`,
`correo_certificado`, `lista_o_estrados`, `oficio`, `personal`. **`edictos` está en el tipo
`FormaNotificacion` pero ninguna regla lo declara, así que el endpoint lo rechaza con 400.** Cuando
se cargue una regla con surtimiento por edictos, el endpoint lo aceptará sin tocar el código.

**Las suspensiones exigen motivo y fundamento no vacíos.** El motor nunca las infiere, y el
endpoint no deja registrar una sin decir de dónde sale.

Ejemplo:

```json
{
  "reglaId": "lfpca-13-I-a",
  "fechaNotificacion": "2026-02-06",
  "formaNotificacion": "personal",
  "hoy": "2026-03-02"
}
```

### Respuesta

Código 200 con el cuerpo igual a `ResultadoComputo`, sin envoltura y sin transformación:

```ts
interface ResultadoComputo {
  confianza: Confianza;
  /** Nulo siempre que la confianza sea insuficiente o bloqueada_por_fuente. */
  vence: FechaISO | null;
  surteEfectos: FechaISO | null;
  inicioComputo: FechaISO | null;
  diasTranscurridos: number | null;
  diasRestantes: number | null;
  inhabilesAplicados: DiaInhabil[];
  traza: PasoTraza[];
  fuentes: Fundamento[];
  advertencias: string[];
  /** Que hace falta para subir de confianza. Vacio cuando ya esta verificada. */
  faltantes: string[];
}
```

Tipos auxiliares:

```ts
type Confianza = 'verificada' | 'parcial' | 'insuficiente' | 'bloqueada_por_fuente';

interface DiaInhabil {
  fecha: FechaISO;
  motivo: string;
  fundamento: string;
}

interface PasoTraza {
  paso: number;
  concepto: string;
  fecha?: FechaISO;
  detalle: string;
  fundamento?: Fundamento | string;
}

interface Fundamento {
  ordenamiento: string;
  articulo: string;
  fraccion?: string;
  inciso?: string;
  parrafo?: string;
  /** Publicacion o reforma que da el texto vigente citado. */
  publicacion: string;
  /** Archivo del acervo donde se leyo, y linea si se conoce. */
  archivo: string;
  linea?: number;
}
```

**Un cómputo que no alcanza confianza no es un error de HTTP.** Devuelve 200 con `confianza` en
`insuficiente` o `bloqueada_por_fuente`, `vence` en nulo y `faltantes` poblado. El cliente decide
qué hacer; el servidor no convierte una laguna del corpus en una falla de transporte.

### Respuesta real, confianza parcial

Salida ejecutada del motor para la petición de arriba. Se abrevian `inhabilesAplicados` y `traza`,
que en la respuesta completa traen trece y ocho elementos:

```json
{
  "confianza": "parcial",
  "vence": "2026-03-24",
  "surteEfectos": "2026-02-09",
  "inicioComputo": "2026-02-10",
  "diasTranscurridos": 15,
  "diasRestantes": 15,
  "inhabilesAplicados": [
    { "fecha": "2026-02-14", "motivo": "Fin de semana", "fundamento": "Regla general de dias habiles" },
    { "fecha": "2026-03-16", "motivo": "Conmemoracion del 21 de marzo, dia del Benemerito de las Americas", "fundamento": "pagina TFJA dinh2026" }
  ],
  "traza": [
    {
      "paso": 1,
      "concepto": "regla aplicable",
      "detalle": "Demanda de juicio contencioso administrativo federal contra resolucion notificada. Plazo de 30 dias habiles.",
      "fundamento": {
        "ordenamiento": "Ley Federal de Procedimiento Contencioso Administrativo",
        "articulo": "13", "fraccion": "I", "inciso": "a",
        "publicacion": "Texto vigente, ultima reforma DOF 09-06-2026",
        "archivo": "LFPCA.md", "linea": 488
      }
    },
    {
      "paso": 2,
      "concepto": "surtimiento de efectos",
      "fecha": "2026-02-09",
      "detalle": "Notificacion personal del 2026-02-06: surte efectos 1 dias habiles despues, el 2026-02-09 (lunes).",
      "fundamento": {
        "ordenamiento": "Codigo Fiscal de la Federacion",
        "articulo": "135", "parrafo": "primero",
        "publicacion": "Texto vigente, ultima reforma DOF 09-04-2026",
        "archivo": "CFF.md", "linea": 14647
      }
    },
    { "paso": 3, "concepto": "inicio del computo", "fecha": "2026-02-10", "detalle": "El plazo corre a partir del 2026-02-10 (martes)." },
    { "paso": 4, "concepto": "cobertura del calendario", "detalle": "Completa. Calendarios aplicados: tfja-2026." },
    { "paso": 5, "concepto": "conteo", "fecha": "2026-03-24", "detalle": "Se contaron 30 dias habiles y se descartaron 13 dias." },
    { "paso": 6, "concepto": "suspensiones", "detalle": "Ninguna registrada en el expediente. El motor no infiere suspensiones." },
    { "paso": 7, "concepto": "prorroga por vencimiento inhabil", "fecha": "2026-03-24", "detalle": "No aplico. El ultimo dia del plazo es habil." },
    { "paso": 8, "concepto": "traza emitida", "fecha": "2026-03-24", "detalle": "Vence el 2026-03-24 (martes). Confianza: parcial." }
  ],
  "fuentes": [
    {
      "ordenamiento": "Ley Federal de Procedimiento Contencioso Administrativo",
      "articulo": "13", "fraccion": "I", "inciso": "a",
      "publicacion": "Texto vigente, ultima reforma DOF 09-06-2026",
      "archivo": "LFPCA.md", "linea": 488
    },
    {
      "ordenamiento": "Codigo Fiscal de la Federacion",
      "articulo": "135", "parrafo": "primero",
      "publicacion": "Texto vigente, ultima reforma DOF 09-04-2026",
      "archivo": "CFF.md", "linea": 14647
    }
  ],
  "faltantes": [
    "Acuerdo o publicacion oficial que respalde el calendario de dias inhabiles."
  ],
  "advertencias": [
    "Este computo no sustituye la verificacion del abogado responsable ni constituye computo oficial.",
    "Alguno de los calendarios aplicados es de nivel B."
  ]
}
```

La confianza es `parcial` y no `verificada` porque el calendario del Tribunal Federal de Justicia
Administrativa está clasificado en nivel B. Ver `legal-rules.md`.

### Respuesta real, confianza insuficiente

Petición con `reglaId` igual a `cff-121`, `fechaNotificacion` igual a `2026-11-20` y
`formaNotificacion` igual a `buzon_tributario`. Salida ejecutada, abreviada:

```json
{
  "confianza": "insuficiente",
  "vence": null,
  "surteEfectos": null,
  "inicioComputo": null,
  "diasTranscurridos": null,
  "diasRestantes": null,
  "inhabilesAplicados": [],
  "traza": [
    { "paso": 1, "concepto": "regla aplicable", "detalle": "Recurso de revocacion ante la autoridad fiscal, por buzon tributario. Plazo de 30 dias habiles." },
    { "paso": 2, "concepto": "surtimiento de efectos", "fecha": "2026-11-23", "detalle": "Notificacion buzon_tributario del 2026-11-20: surte efectos 1 dias habiles despues, el 2026-11-23 (lunes)." },
    { "paso": 3, "concepto": "inicio del computo", "fecha": "2026-11-24", "detalle": "El plazo corre a partir del 2026-11-24 (martes)." },
    { "paso": 4, "concepto": "cobertura del calendario", "detalle": "Incompleta. El motor se detiene aqui en lugar de estimar." }
  ],
  "faltantes": [
    "El calendario \"Dias inhabiles de las autoridades fiscales federales 2026\" no declara cubrir el anio 2027.",
    "El calendario \"Dias inhabiles de las autoridades fiscales federales 2026\" declara un hueco que cae dentro del periodo: El segundo periodo general de vacaciones del Servicio de Administracion Tributaria para 2026 no ha sido publicado al 12 de septiembre de 2026. Se revisaron la Resolucion Miscelanea original, la Primera Resolucion de Modificaciones, el compilado oficial y las once versiones anticipadas de la Segunda Resolucion."
  ],
  "advertencias": [
    "Este computo no sustituye la verificacion del abogado responsable ni constituye computo oficial."
  ]
}
```

`surteEfectos` e `inicioComputo` salen en nulo en el cuerpo aunque la traza sí muestre las fechas
de los pasos 2 y 3. Es deliberado: la traza documenta hasta dónde llegó el razonamiento; los campos
de resultado quedan vacíos porque el resultado no existe. Ningún consumidor debe poder tomar una
fecha parcial por una fecha calculada.

Este caso es hoy el mayoritario. Ver `legal-rules.md`, huecos declarados.

### Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | El cuerpo no es JSON válido | `{ "error": "El cuerpo de la petición no es JSON válido." }` |
| 400 | La validación de Zod falla | `{ "error": "La entrada no es válida.", "detalles": ["campo: mensaje", ...] }` |
| 400 | `FechaInvalida` del motor | `{ "error": "Fecha invalida: \"...\". Se espera AAAA-MM-DD." }` |
| 404 | `ReglaDesconocida` | `{ "error": "No existe la regla \"...\" en el corpus. El motor no inventa reglas." }` |
| 500 | Cualquier otra excepción | `{ "error": "El motor no pudo completar el cómputo. <mensaje>" }` |

El formato de error es plano: `error` como cadena y `detalles` como arreglo de cadenas cuando la
validación produce varios problemas. Cada detalle viene como `"<ruta del campo>: <mensaje>"`, con
`"cuerpo"` como ruta cuando el problema es del objeto completo.

`CalendarioFaltante` no llega nunca al cliente como error: `calcular` la atrapa y la convierte en un
`ResultadoComputo` con confianza `insuficiente` y el faltante descrito.

## `POST /api/prospectos`

Implementado. Captación de prospectos desde el formulario de la página de diagnóstico.

Declara `runtime = 'nodejs'` y `dynamic = 'force-dynamic'`.

### Petición

| Campo | Obligatorio | Validación |
|---|---|---|
| `nombre` | Sí | Entre 2 y 140 caracteres, sin espacios sobrantes |
| `correo` | Sí | Entre 5 y 180 caracteres, contra `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` |
| `telefono` | No | Hasta 40 caracteres |
| `organizacion` | No | Hasta 140 caracteres |
| `situacion` | No | Hasta 2000 caracteres |
| `origen` | No | Hasta 60 caracteres, por omisión `"diagnostico"` |

### Respuesta

Código 201:

```json
{
  "id": "…uuid…",
  "creadoEl": "2026-09-12T18:00:00.000Z",
  "persistencia": "memoria"
}
```

**El campo `persistencia` no es decorativo.** El almacén es un arreglo en la memoria del proceso
(`apps/web/src/lib/almacen.ts`), colgado de `globalThis` bajo un símbolo. Los prospectos se pierden
al reiniciar. El encabezado del archivo lo explica: `@jurifis/db` existe pero exige una base de
PostgreSQL viva con sus políticas, y esta aplicación todavía no se conecta a ella. La pantalla de
administración lo declara en lugar de aparentar que el dato quedó guardado.

Errores: 400 con `{ "error": "El cuerpo de la petición no es JSON válido." }` o
`{ "error": "Los datos de contacto no son válidos.", "detalles": [...] }`.

> **Nota de seguridad.** Este endpoint acepta datos personales sin autenticación y sin límite de
> peticiones. Antes de exponerlo en producción hace falta limitación de tasa y alguna defensa
> contra envío automatizado.

## Endpoints pendientes de la fase 1

Todos bajo `/api`, todos con autenticación por sesión, todos dentro del contexto de una
organización. La organización no viaja en el cuerpo ni en la ruta: se resuelve de la sesión y se
fija con `conOrg` antes de tocar la base. Ver `security.md`.

| Método y ruta | Propósito |
|---|---|
| `GET /api/reglas` | Listar las reglas del corpus. La lógica ya existe en `lib/corpus.ts`, solo falta exponerla |
| `GET /api/reglas/{reglaId}` | Una regla con su fundamento y su surtimiento |
| `GET /api/calendarios` | Calendarios con su nivel, cobertura y huecos |
| `POST /api/expedientes` | Alta de expediente |
| `GET /api/expedientes` | Listado de la organización |
| `GET /api/expedientes/{id}` | Un expediente con sus plazos y actuaciones |
| `POST /api/expedientes/{id}/plazos` | Calcular y persistir en `deadlines` con su traza |
| `GET /api/expedientes/{id}/plazos` | Plazos del expediente |
| `POST /api/expedientes/{id}/documentos` | Alta de documento con su `sha256` |
| `GET /api/agenda` | Plazos por vencer, ordenados por `vence` |

### `POST /api/expedientes/{id}/plazos`, diseño

Mismo cuerpo que `calcular`, más `descripcion` opcional. Además de calcular, persiste en
`deadlines` el resultado completo: `traza`, `fuentes`, `faltantes`, `advertencias`,
`inhabiles_aplicados`, `confianza`, `regla_clave`, `calendario_clave`, `calendarios_usados` y
`motor_version`. La respuesta es el renglón creado.

Un cómputo con confianza `insuficiente` **sí se persiste**, con `vence` en nulo. Un plazo que no se
pudo calcular es información del expediente, no basura: deja constancia de que se intentó, cuándo,
y qué faltaba.

Es el primer endpoint que necesita la capa de casos de uso que falta, porque calcula y guarda en la
misma operación.

## Códigos de estado, convención para lo que falta

| Código | Cuándo |
|---|---|
| 200 | Cómputo realizado, con cualquiera de los cuatro niveles de confianza |
| 201 | Recurso creado |
| 400 | Cuerpo inválido, fecha mal formada, forma de notificación fuera del corpus |
| 401 | Sin sesión |
| 404 | Regla inexistente, o recurso fuera del alcance de la organización |
| 422 | Cuerpo bien formado pero incoherente, por ejemplo suspensión con `hasta` anterior a `desde` |
| 500 | Falla no prevista |

Un recurso de otra organización debe responder 404 y no 403, para no confirmar su existencia. La
capa de aislamiento lo produce de forma natural, porque las políticas hacen que el renglón
simplemente no aparezca.

Nota sobre 422: el endpoint de cómputo **no** valida hoy que `desde` sea anterior a `hasta` en una
suspensión. Zod comprueba el formato de cada fecha y nada más.

## Notas para quien continúe

1. **Nunca sintetizar `vence` desde la traza.** Si `confianza` es `insuficiente` o
   `bloqueada_por_fuente`, `vence` es nulo por contrato.
2. **`advertencias` siempre trae al menos un elemento**, incluso con confianza `verificada`: el
   aviso de que el cómputo no sustituye la verificación del abogado responsable ni constituye
   cómputo oficial. La interfaz debe mostrarlo siempre.
3. **`faltantes` está vacío solo cuando la confianza es `verificada`.**
4. **`hoy` no se toma del reloj del servidor.** El núcleo no lee la hora a propósito, y el endpoint
   tampoco rellena el campo. Si alguna vez lo hace, tiene que devolver el valor que usó.
5. **Mantener la derivación de la lista de formas desde el corpus.** Escribirla a mano en el
   endpoint la desincronizaría del dato en la primera regla nueva.
