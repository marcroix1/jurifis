# JURIFIS

Plataforma juridica fiscal. Dominio: juris.lat. NOVA LEGAL, S.C.

El derecho vive como dato versionado, no como codigo. El motor no estima: si falta la fuente
o el calendario, devuelve el estado degradado y dice que falta.

## Estado, 12 de septiembre de 2026

Fase 1 arrancada. Motor de plazos, base de datos, cuestionario y aplicacion web funcionando.
64 pruebas en el nucleo y 34 en la base de datos, todas en verde.

- `packages/core/src` motor puro, sin entrada ni salida, sin el objeto Date nativo.
- `packages/core/datos/reglas` diecinueve reglas de plazo en seis ordenamientos, cada una con archivo y linea del acervo.
- `packages/core/src/diagnostico` cuestionario con validador de lenguaje prudente.
- `packages/db` veinte tablas con aislamiento por organizacion.
- `apps/web` landing, calculadora conectada al motor y panel administrativo.
- `packages/core/datos/calendarios` cinco calendarios: Tribunal 2026, autoridades fiscales 2026,
  articulo 12 del Codigo Fiscal, articulo 19 de la Ley de Amparo y articulo 28 de la Ley Federal
  de Procedimiento Administrativo.

## Huecos declarados

- Segundo periodo general de vacaciones del Servicio de Administracion Tributaria 2026: no publicado.
  Todo plazo que cruce diciembre de 2026 devuelve confianza insuficiente.
- Calendario del Tribunal: nivel B, la pagina no cita el acuerdo del Pleno que lo publica.
- Recurso de inconformidad ante el Instituto: nivel B, con vigencia declarada por el abogado responsable.
- Ampliacion y contestacion del juicio de nulidad: falta la regla de surtimiento de las notificaciones
  dentro del juicio.
- Ley Federal de Procedimiento Administrativo: las vacaciones de cada dependencia se publican por
  acuerdo propio y hay que superponerlas caso por caso.

## Comandos

    npm test
