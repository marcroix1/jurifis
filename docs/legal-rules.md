# Reglas de plazo y calendarios

Documento de referencia del corpus jurídico de JURIFIS. Todo lo que sigue está tomado de los
archivos JSON de `packages/core/datos`, leídos el 12 de septiembre de 2026. No se agregó ninguna
regla que no esté ahí, y no se completó ningún dato faltante: donde el corpus no dice, este
documento dice que no dice.

Corpus al día de hoy: **diecinueve reglas de plazo** en `packages/core/datos/reglas` y **cinco
calendarios** de días inhábiles en `packages/core/datos/calendarios`.

La columna "archivo y línea" es el campo `fundamento.archivo` y `fundamento.linea` de cada regla:
el archivo del acervo del despacho donde se leyó el precepto y la línea en que empieza. No es una
ruta de este repositorio.

## Las diecinueve reglas

Las diecinueve son de días hábiles. Ninguna regla del corpus usa días naturales, meses ni años,
aunque el motor implementa las cuatro unidades.

### Ley Federal de Procedimiento Contencioso Administrativo

Diez reglas. Todas de nivel A, texto vigente con última reforma publicada en el Diario Oficial de
la Federación el 9 de junio de 2026, todas con calendario `tfja-2026`, todas vigentes desde el 13
de junio de 2016.

| Identificador | Artículo | Plazo | Unidad | Primer día | Archivo y línea |
|---|---|---|---|---|---|
| `lfpca-13-I-a` | 13, fracción I, inciso a | 30 | días hábiles | siguiente natural | `LFPCA.md` 488 |
| `lfpca-17` | 17 | 10 | días hábiles | siguiente natural | `LFPCA.md` 731 |
| `lfpca-19` | 19 | 30 | días hábiles | siguiente natural | `LFPCA.md` 793 |
| `lfpca-58-2` | 58-2 | 30 | días hábiles | siguiente natural | `LFPCA.md` 2436 |
| `lfpca-58-4` | 58-4, primer párrafo | 15 | días hábiles | siguiente natural | `LFPCA.md` 2492 |
| `lfpca-58-6` | 58-6, primer párrafo | 5 | días hábiles | siguiente natural | `LFPCA.md` 2510 |
| `lfpca-58-8` | 58-8, primer párrafo | 5 | días hábiles | siguiente natural | `LFPCA.md` 2544 |
| `lfpca-59` | 59 | 10 | días hábiles | siguiente natural | `LFPCA.md` 2891 |
| `lfpca-62` | 62 | 5 | días hábiles | siguiente natural | `LFPCA.md` 2923 |
| `lfpca-63` | 63, primer párrafo | 15 | días hábiles | siguiente natural | `LFPCA.md` 2937 |

Procedimiento y descripción de cada una, según el campo `descripcion` del archivo:

| Identificador | Descripción en el corpus |
|---|---|
| `lfpca-13-I-a` | Demanda de juicio contencioso administrativo federal contra resolución notificada |
| `lfpca-17` | Ampliación de la demanda de nulidad |
| `lfpca-19` | Contestación de la demanda de nulidad |
| `lfpca-58-2` | Demanda de juicio contencioso administrativo en la vía sumaria |
| `lfpca-58-4` | Contestación de la demanda en la vía sumaria |
| `lfpca-58-6` | Ampliación de la demanda en la vía sumaria |
| `lfpca-58-8` | Recurso de reclamación en la vía sumaria |
| `lfpca-59` | Recurso de reclamación, regla general |
| `lfpca-62` | Recurso de reclamación contra resoluciones sobre medidas cautelares |
| `lfpca-63` | Recurso de revisión ante el Tribunal Colegiado de Circuito |

### Código Fiscal de la Federación

| Identificador | Artículo | Plazo | Unidad | Primer día | Calendario | Nivel | Archivo y línea |
|---|---|---|---|---|---|---|---|
| `cff-121` | 121, primer párrafo | 30 | días hábiles | siguiente hábil | `sat-2026` | A | `CFF.md` 13924 |

Descripción: recurso de revocación ante la autoridad fiscal, por buzón tributario. Vigente desde el
1 de enero de 2014. Texto vigente, última reforma publicada el 9 de abril de 2026.

### Ley Aduanera

Dos reglas, ambas de nivel A, calendario `sat-2026`, primer día siguiente natural, vigentes desde
el 1 de abril de 1996, texto vigente con última reforma publicada el 19 de noviembre de 2025.

| Identificador | Artículo | Plazo | Unidad | Archivo y línea | Descripción en el corpus |
|---|---|---|---|---|---|
| `ley-aduanera-150` | 150 | 10 | días hábiles | `LADUANERA.md` 8278 | Procedimiento administrativo en materia aduanera: ofrecer pruebas y formular alegatos |
| `ley-aduanera-155` | 155 | 10 | días hábiles | `LADUANERA.md` 8617 | Acreditar la legal estancia en el país de las mercancías embargadas |

### Ley de Amparo

Cuatro reglas, todas de nivel A, calendario `amparo-19-2026`, primer día siguiente natural,
vigentes desde el 3 de abril de 2013, texto vigente con última reforma publicada el 16 de octubre
de 2025.

| Identificador | Artículo | Plazo | Unidad | Archivo y línea | Descripción en el corpus |
|---|---|---|---|---|---|
| `lamp-17` | 17, primer párrafo | 15 | días hábiles | `LAmp.md` 568 | Demanda de amparo, plazo genérico |
| `lamp-17-I` | 17, fracción I | 30 | días hábiles | `LAmp.md` 570 | Demanda de amparo contra norma general autoaplicativa o procedimiento de extradición |
| `lamp-86` | 86, primer párrafo | 10 | días hábiles | `LAmp.md` 2480 | Recurso de revisión en el juicio de amparo |
| `lamp-98` | 98, primer párrafo | 5 | días hábiles | `LAmp.md` 2732 | Recurso de queja en el juicio de amparo, plazo genérico |

### Ley Federal de Procedimiento Administrativo

| Identificador | Artículo | Plazo | Unidad | Primer día | Calendario | Nivel | Archivo y línea |
|---|---|---|---|---|---|---|---|
| `lfpa-85` | 85 | 15 | días hábiles | siguiente natural | `lfpa-28-2026` | A | `LFPA.md` 1438 |

Descripción: recurso de revisión de la Ley Federal de Procedimiento Administrativo. Vigente desde el
4 de agosto de 1994. Texto vigente, última reforma publicada el 14 de noviembre de 2025.

### Reglamento del Recurso de Inconformidad

| Identificador | Artículo | Plazo | Unidad | Primer día | Calendario | Nivel | Archivo y línea |
|---|---|---|---|---|---|---|---|
| `rri-6` | 6 | 15 | días hábiles | siguiente natural | `cff-12-2026` | **B** | `inconformidad-imss.md`, **sin línea** |

Descripción: recurso de inconformidad ante el Instituto Mexicano del Seguro Social. Vigente desde
el 28 de noviembre de 2000. El campo `publicacion` no cita el Diario Oficial de la Federación: dice
"Según el acervo del despacho".

Es la única regla de nivel B del corpus, y por eso lleva declaración de vigencia, obligatoria
cuando el nivel es B:

> **Persona:** Marco, abogado responsable, NOVA LEGAL S.C.
> **Fecha:** 12 de septiembre de 2026
> **Nota:** Declara que el documento del acervo es la última versión existente, que no ha habido
> reformas posteriores, y que el Instituto no tiene vacaciones generales y opera con los días
> inhábiles del artículo 12 del Código Fiscal de la Federación.

Sin esa declaración, el motor devolvería `bloqueada_por_fuente` y no calcularía. Con ella calcula,
pero la confianza baja a `parcial` y el faltante que reporta es el texto oficial íntegro y vigente
del ordenamiento.

## Los cinco calendarios

| Identificador | Nombre | Año | Nivel | Días enumerados | Huecos declarados |
|---|---|---|---|---|---|
| `tfja-2026` | Días inhábiles del Tribunal Federal de Justicia Administrativa 2026 | 2026 | **B** | 45 | 0 |
| `sat-2026` | Días inhábiles de las autoridades fiscales federales 2026 | 2026 | A | 21 | **1** |
| `cff-12-2026` | Días inhábiles del artículo 12 del Código Fiscal de la Federación, ejercicio 2026 | 2026 | A | 8 | 0 |
| `amparo-19-2026` | Días inhábiles del juicio de amparo 2026 | 2026 | A | 9 | 0 |
| `lfpa-28-2026` | Días inhábiles del procedimiento administrativo federal 2026 | 2026 | A | 8 | 0 |

Los cinco declaran `finesDeSemanaInhabiles` en verdadero y los cinco fueron consultados el 12 de
septiembre de 2026. Los cinco declaran cubrir únicamente el año 2026.

### Fuente de cada calendario

**`tfja-2026`, nivel B.** Página oficial del Tribunal, `https://www.tfja.gob.mx/servicios/dinh2026/`.
El propio campo `fuente` explica por qué es nivel B: la página no cita el número del acuerdo del
Pleno que publica estos días. Cuarenta y cinco días enumerados, entre ellos el primer periodo
vacacional del 15 al 31 de julio, el segundo del 15 al 31 de diciembre, y varias entradas cuyo
motivo registrado es "Suspensión de labores declarada, sin motivo expreso en la página".

**`sat-2026`, nivel A.** Resolución Miscelánea Fiscal 2026, regla 2.1.6, publicada el 28 de
diciembre de 2025, reformada por la Primera Resolución de Modificaciones publicada el 9 de julio de
2026, más el artículo 12 del Código Fiscal de la Federación con texto vigente publicado el 9 de
abril de 2026. Cada uno de los veintiún días trae su propio fundamento en el campo `fundamento` del
día, distinguiendo cuáles vienen de la regla miscelánea y cuáles del artículo 12.

**`cff-12-2026`, nivel A.** Código Fiscal de la Federación, artículo 12, primer párrafo, texto
vigente con última reforma publicada el 9 de abril de 2026, archivo `CFF.md` líneas 419 a 423.

**`amparo-19-2026`, nivel A.** Ley de Amparo, artículo 19, texto vigente con última reforma
publicada el 16 de octubre de 2025, archivo `LAmp.md` líneas 609 a 613. El campo `fuente` añade una
advertencia sustantiva: el propio artículo agrega los días en que se suspendan las labores en el
órgano jurisdiccional donde se tramite el juicio, y aquellos en que no pueda funcionar por fuerza
mayor. Esos no son catálogo, se registran como eventos del expediente, porque dependen del órgano
concreto.

**`lfpa-28-2026`, nivel A.** Ley Federal de Procedimiento Administrativo, artículo 28, párrafo
segundo, texto vigente con última reforma publicada el 14 de noviembre de 2025, archivo `LFPA.md`
líneas 539 a 545. El campo `fuente` advierte que el artículo agrega las vacaciones generales de la
dependencia y los días de suspensión de labores, que se publican por acuerdo del titular en el
Diario Oficial de la Federación, y que ese calendario es por dependencia y debe superponerse caso
por caso. Añade una precisión de vigencia: el supuesto del 1 de diciembre cada seis años no aplica
en 2026 por no ser año de transmisión del Poder Ejecutivo Federal.

### Los catálogos no son intercambiables

Cuatro calendarios distintos para el mismo año calendario, con contenidos distintos, porque cuatro
ordenamientos definen "día inhábil" de manera distinta. Algunos contrastes verificables en los
datos:

| Fecha | `cff-12-2026` | `amparo-19-2026` | `lfpa-28-2026` | `sat-2026` | `tfja-2026` |
|---|---|---|---|---|---|
| 2 de febrero | inhábil, primer lunes | hábil | hábil | inhábil, primer lunes | inhábil |
| 5 de febrero | hábil | inhábil | inhábil | hábil | hábil |
| 16 de marzo | inhábil, tercer lunes | hábil | hábil | inhábil, tercer lunes | inhábil |
| 1 de septiembre | hábil | hábil | **inhábil** | hábil | hábil |
| 12 de octubre | hábil | **inhábil** | hábil | hábil | inhábil |
| 16 de noviembre | inhábil, tercer lunes | hábil | hábil | inhábil, tercer lunes | inhábil |
| 20 de noviembre | hábil | **inhábil** | **inhábil** | hábil | hábil |

El Código Fiscal de la Federación recorre las conmemoraciones al lunes que corresponde; la Ley de
Amparo y la Ley Federal de Procedimiento Administrativo las fijan en la fecha nominal. El 12 de
octubre solo es inhábil en amparo. El 1 de septiembre solo lo es en el procedimiento administrativo
federal. La prueba `los catalogos de ley no son intercambiables` de
`packages/core/test/motor.test.ts` fija precisamente ese contraste para el 12 de octubre.

## Huecos declarados

Un hueco declarado no es una omisión: es una laguna que el corpus conoce, nombra y hace que el
motor respete deteniéndose. Los que están registrados como dato, y los que están registrados solo
como prosa.

### 1. Segundo periodo general de vacaciones del Servicio de Administración Tributaria 2026

**Es el único hueco registrado como dato**, en el arreglo `huecos` de `sat-2026`, del 1 al 31 de
diciembre de 2026. Texto literal del campo `descripcion`:

> El segundo periodo general de vacaciones del Servicio de Administración Tributaria para 2026 no
> ha sido publicado al 12 de septiembre de 2026. Se revisaron la Resolución Miscelánea original, la
> Primera Resolución de Modificaciones, el compilado oficial y las once versiones anticipadas de la
> Segunda Resolución.

Efecto: todo plazo cuya ventana de cobertura toque diciembre de 2026 y use el calendario `sat-2026`
devuelve confianza `insuficiente` y `vence` en nulo. Afecta a `cff-121`, `ley-aduanera-150` y
`ley-aduanera-155`.

Se levanta cuando se publique el acuerdo. Mientras tanto, el motor no supone que el periodo será
igual al del año pasado.

### 2. Ningún calendario cubre 2027

Los cinco declaran `aniosCubiertos: [2026]`. El motor verifica cobertura sobre una ventana generosa
alrededor del plazo, no solo sobre el plazo (`motor.ts`, paso 4): para días hábiles, el triple de
la cantidad más sesenta días. Con treinta días hábiles la ventana es de ciento cincuenta días, y
cualquier cómputo iniciado a mediados de año la empuja a 2027.

**Consecuencia práctica, verificada ejecutando el motor sobre cada día de 2026:** ninguna de las
diecinueve reglas devuelve fecha para una notificación practicada al día de hoy, 12 de septiembre
de 2026. Última fecha de notificación que todavía produce vencimiento, por regla, usando la primera
forma de notificación que cada una declara:

| Regla | Plazo | Última notificación con fecha calculable |
|---|---|---|
| `cff-121` | 30 | 1 de julio de 2026 |
| `lfpca-19`, `lfpca-58-2` | 30 | 8 de julio de 2026 |
| `lfpca-13-I-a` | 30 | 9 de julio de 2026 |
| `lamp-17-I` | 30 | 30 de julio de 2026 |
| `ley-aduanera-150`, `ley-aduanera-155` | 10 | 30 de agosto de 2026 |
| `lfpca-58-4`, `lfpca-63` | 15 | 9 de septiembre de 2026 |
| `rri-6`, `lamp-17` | 15 | 14 de septiembre de 2026 |
| `lfpa-85` | 15 | 16 de septiembre de 2026 |
| `lfpca-17`, `lfpca-59` | 10 | 29 de septiembre de 2026 |
| `lamp-86` | 10 | 30 de septiembre de 2026 |
| `lfpca-58-6`, `lfpca-58-8`, `lfpca-62` | 5 | 14 de octubre de 2026 |
| `lamp-98` | 5 | 15 de octubre de 2026 |

Es el comportamiento diseñado, pero deja el producto sin respuesta útil para el trabajo del día.
Cargar los cinco calendarios de 2027 es la tarea más urgente del corpus.

Complicación derivada: `tfja-2026` enumera el 1 de enero de 2027 como día inhábil, con el motivo
"Declarado inhábil en el mismo renglón de diciembre de 2026", pero su `aniosCubiertos` sigue siendo
solo 2026. El dato del día está, la declaración de cobertura no.

### 3. El calendario del Tribunal es de nivel B

`tfja-2026` es nivel B porque la página oficial no cita el acuerdo del Pleno que publica los días.
Efecto: **todo cómputo de las diez reglas de la Ley Federal de Procedimiento Contencioso
Administrativo baja a confianza `parcial`**, incluidos los de la demanda de nulidad, con el
faltante "Acuerdo o publicación oficial que respalde el calendario de días inhábiles". Ninguna
regla que use este calendario puede alcanzar `verificada` mientras no se localice el acuerdo.

### 4. El recurso de inconformidad se sostiene en una declaración de abogado

`rri-6` es nivel B con vigencia declarada. Sus fundamentos, tanto el del plazo como los tres de
surtimiento del artículo 11, **no traen número de línea**: el campo `linea` está ausente, a
diferencia de las otras dieciocho reglas. La publicación no cita el Diario Oficial de la Federación.

### 5. Suspensiones y vacaciones que el motor no puede conocer

Dos calendarios declaran en prosa, dentro de su campo `fuente`, información que no está en el
arreglo `dias` ni en el arreglo `huecos`:

- `amparo-19-2026`: los días de suspensión de labores del órgano jurisdiccional concreto y los de
  fuerza mayor.
- `lfpa-28-2026`: las vacaciones generales de cada dependencia, publicadas por acuerdo propio del
  titular, que hay que superponer caso por caso.

**El motor no se detiene por ninguna de las dos**, porque solo `huecos` dispara la parada del paso
4 y ambos calendarios tienen `huecos` vacío. Quien use estas reglas debe cargar esos días como
suspensiones en `EntradaComputo.suspensiones`, con motivo y fundamento. Es un hueco declarado en
prosa pero no aplicado por código.

### 6. Formas de notificación sin precepto en el corpus

`FormaNotificacion` declara ocho valores. Cobertura real:

| Forma | Reglas que la declaran |
|---|---|
| `personal` | 19 de 19 |
| `oficio` | 14 |
| `boletin_jurisdiccional` | 10, todas de la Ley Federal de Procedimiento Contencioso Administrativo |
| `correo_certificado` | 10 |
| `lista_o_estrados` | 5 |
| `buzon_tributario` | 2, `cff-121` y `lfpca-13-I-a` |
| `acto_autoaplicativo` | 1, `lamp-17-I` |
| `edictos` | **0** |

Ninguna regla del corpus tiene precepto de surtimiento para notificación por edictos. Pedirla
devuelve `insuficiente` con el faltante que nombra la forma. La notificación personal es la única
forma que las diecinueve reglas declaran.

## El hallazgo central: cuándo surte efectos una notificación

El corpus contiene **cinco ordenamientos** que fijan el surtimiento de efectos de una notificación,
y entre ellos dan **cuatro respuestas numéricas distintas** para el mismo hecho: el día en que la
diligencia se practicó.

| Ordenamiento | Precepto | Archivo y línea | Forma | Desplazamiento |
|---|---|---|---|---|
| Ley Federal de Procedimiento Administrativo | 38, primer párrafo | `LFPA.md` 692 | personal, correo certificado | **0**, el mismo día |
| Código Fiscal de la Federación | 135, primer párrafo | `CFF.md` 14647 | personal, oficio, buzón tributario | **+1** día hábil |
| Ley de Amparo | 31, fracción II | `LAmp.md` 1133 | lista o estrados, personal | **+1** día hábil |
| Ley de Amparo | 31, fracción II | `LAmp.md` 1133 | acto autoaplicativo | **0** |
| Ley Federal de Procedimiento Contencioso Administrativo | 65, penúltimo párrafo | `LFPCA.md` 3082 | boletín jurisdiccional | **+2** días hábiles |
| Ley Federal de Procedimiento Contencioso Administrativo | 65, penúltimo párrafo | `LFPCA.md` 3082 | personal | **+1** día hábil |
| Ley Federal de Procedimiento Contencioso Administrativo | 70 | `LFPCA.md` 3160 | correo certificado, oficio | **+1** día hábil |
| Reglamento del Recurso de Inconformidad | 11 | `inconformidad-imss.md`, sin línea | personal, oficio | **+1** día hábil |
| Reglamento del Recurso de Inconformidad | 11 | `inconformidad-imss.md`, sin línea | lista o estrados | **+5** días hábiles |

Las cuatro respuestas son cero, uno, dos y cinco.

> Nota de exactitud: el encargo describía el hallazgo como cuatro ordenamientos con cuatro
> respuestas. En el corpus hay cinco ordenamientos y cuatro valores distintos de desplazamiento. El
> hallazgo se sostiene; la cuenta que se sostiene es la de las respuestas, no la de los
> ordenamientos.

### El mismo día, tres resultados distintos

Tres cómputos con la misma fecha de notificación, 3 de marzo de 2026, y la misma forma:

| Regla | Ordenamiento del surtimiento | Surte efectos | Primer día del cómputo |
|---|---|---|---|
| `lfpa-85`, personal | Ley Federal de Procedimiento Administrativo 38 | 3 de marzo | 4 de marzo |
| `cff-121`, personal | Código Fiscal de la Federación 135 | 4 de marzo | 5 de marzo |
| `rri-6`, lista o estrados | Reglamento del Recurso de Inconformidad 11 | 10 de marzo | 11 de marzo |

Siete días de diferencia entre el primero y el tercero, con la misma diligencia practicada el mismo
día. Las pruebas `la notificacion personal del procedimiento administrativo surte el mismo dia`,
`la fiscal surte al dia habil siguiente, un dia despues que la administrativa` y `por estrados ante
el Instituto surte al quinto dia habil` fijan exactamente estos tres valores.

### Por qué el surtimiento es dato y no constante

Si el surtimiento fuera una constante del motor, habría que elegir uno de los cuatro valores y
equivocarse en tres de cada cuatro materias. Si fuera un `if` sobre la materia, el motor tendría
que conocer el derecho, y cada reforma sería un cambio de código con su ciclo de pruebas.

Por eso `ReglaSurtimiento` es un arreglo dentro de cada regla, y cada entrada trae su propio
`Fundamento` con ordenamiento, artículo, párrafo, publicación, archivo y línea:

```ts
interface ReglaSurtimiento {
  forma: FormaNotificacion;
  /** Cuantos dias despues de la diligencia surte efectos. Cero es el mismo dia. */
  desplazamiento: number;
  unidad: 'dias_habiles' | 'dias_naturales';
  fundamento: Fundamento;
}
```

`motor.ts` no sabe cuánto surte nada. Busca en el arreglo la entrada que coincide con la forma
recibida, y si no la encuentra se detiene y pide el precepto. Tres consecuencias:

1. **El motor puede decir por qué.** El paso 2 de la traza cita el artículo exacto que produjo el
   desplazamiento, no la regla del plazo.
2. **Una regla puede mezclar ordenamientos.** `lfpca-13-I-a` es el caso vivo: el surtimiento de la
   notificación personal, por oficio y por buzón tributario viene del artículo 135 del Código
   Fiscal de la Federación, porque el acto se notificó en sede administrativa, mientras que el del
   boletín jurisdiccional viene del artículo 65, penúltimo párrafo, de la Ley Federal de
   Procedimiento Contencioso Administrativo. Un motor con una constante por materia no podría
   representar eso.
3. **El doble desfase queda explícito.** Surtimiento e inicio del cómputo son dos pasos separados,
   con fundamentos distintos. Una notificación personal del viernes 6 de febrero de 2026 bajo
   `lfpca-13-I-a` surte efectos el lunes 9 y el plazo corre desde el martes 10.

### Una anomalía en el campo `inicio`

Dieciocho de las diecinueve reglas declaran `inicio.primerDia` igual a `siguiente_natural`. La
excepción es `cff-121`, que declara `siguiente_habil`.

Para plazos en días hábiles la diferencia no altera la fecha de vencimiento, porque el conteo
descarta los días inhábiles de todas formas. Sí altera el valor de `inicioComputo` que se reporta y
se guarda. Conviene decidir cuál de los dos es el correcto para el recurso de revocación y
uniformar, o documentar por qué difiere.

Relacionado: el mensaje del commit que incorporó las reglas de la vía sumaria atribuye el inicio
del cómputo al día siguiente del surtimiento al artículo 74, fracción I, de la Ley Federal de
Procedimiento Contencioso Administrativo. **Ese fundamento no está en el corpus.** El tipo
`ReglaPlazo` no tiene campo para el fundamento del campo `inicio`, así que el precepto vive
únicamente en el historial de git. La traza del paso 3 cita el fundamento general de la regla, que
es otro artículo. Es una laguna de modelo, no de investigación.

## Cómo se agrega una regla

1. Verificar el precepto contra fuente de nivel A y anotar archivo y línea del acervo.
2. Crear el JSON en `packages/core/datos/reglas` con todos los campos de `ReglaPlazo`, incluido
   `verificadoEl`.
3. Declarar cada forma de notificación con su propio fundamento en `surtimiento`. No copiar el de
   otra regla sin verificar que el precepto aplica.
4. Si el nivel es B, llenar `vigenciaDeclaradaPor` con persona, fecha y nota. Sin eso, el motor
   devuelve `bloqueada_por_fuente`.
5. Importar el archivo en `packages/core/src/registro.ts` y agregarlo al arreglo `REGLAS`. El paso
   se olvida con facilidad: sin él la regla existe en disco y no existe para el motor.
6. Correr `npm test`. Las tres pruebas de integridad del corpus verifican que la regla cite archivo
   y ordenamiento, que su plazo sea positivo, que apunte a un calendario existente y que, si es
   nivel B, traiga declaración de vigencia.
