/**
 * Copia fija de la interfaz del cuestionario.
 *
 * Aqui no vive ninguna pregunta, ningun plazo, ninguna via, ningun documento ni
 * ninguna valoracion: todo eso sale del motor de diagnostico y del archivo de
 * preguntas. Lo unico que hay aqui son rotulos de pantalla, y aun asi pasan por el
 * guardian de lenguaje del motor: la pagina del cuestionario los revisa al cargarse.
 */

export const COPIA = {
  ojo: 'HERRAMIENTA',
  titulo: '¿Puedo impugnar?',
  entrada:
    'Cuestionario preliminar guiado. Las preguntas, la ramificación y el resultado los decide el motor de diagnóstico; esta pantalla solo los presenta.',
  entradaSegunda:
    'Lo que respondas se guarda en este navegador para que no se pierda al recargar. Nada llega al despacho hasta que tú lo pidas al final.',

  avanceRotulo: 'Avance',
  avanceDetalle:
    'Preguntas respondidas de las que aplican con lo contestado hasta ahora. El total se mueve cuando una respuesta abre o cierra una rama.',
  avanceDe: 'de',

  cargando: 'Consultando el motor',
  continuar: 'Continuar',
  guardarCambio: 'Guardar el cambio',
  cancelarCambio: 'Cancelar',
  regresar: 'Regresar a la anterior',
  noSe: 'No lo sé',
  noSeDetalle:
    'Declarar que no se sabe es una respuesta válida. El motor lo reporta como información faltante en lugar de suponerlo.',
  ayudaRotulo: 'De dónde se toma el dato',
  eligeUna: 'Elige una respuesta.',
  eligeVarias: 'Puedes elegir más de una.',
  faltaElegir: 'Elige al menos una opción, o responde que no lo sabes.',
  faltaFecha: 'Escribe la fecha con día, mes y año.',
  faltaMonto: 'Escribe la cantidad con dígitos, sin signos ni letras.',
  montoNegativo: 'La cantidad no puede ser negativa.',
  cambiandoRespuesta: 'Estás cambiando una respuesta ya capturada.',

  previasRotulo: 'Respuestas capturadas',
  previasDetalle:
    'Puedes cambiar cualquiera. Si el cambio cierra una rama, el motor deja de tomar en cuenta lo que colgaba de ella.',
  previasVacio: 'Todavía no hay respuestas capturadas.',
  cambiar: 'Cambiar',
  mostrarPrevias: 'Ver las respuestas capturadas',
  ocultarPrevias: 'Ocultar las respuestas capturadas',
  reiniciar: 'Vaciar y empezar de nuevo',
  reiniciarConfirma:
    'Esto borra lo capturado en este navegador y el cuestionario vuelve a la primera pregunta. ¿Continuar?',

  diagnosticoOjo: 'RESULTADO PRELIMINAR',
  diagnosticoTitulo: 'Diagnóstico preliminar',
  versionRotulo: 'Versión del cuestionario',
  urgenciaRotulo: 'Nivel de urgencia',
  viasRotulo: 'Posibles vías de defensa por revisar',
  viasVacio: 'El motor no devolvió ninguna vía con lo capturado.',
  porQueRotulo: 'Por qué se menciona',
  verificarRotulo: 'Lo que hay que verificar antes de considerarla',
  plazosRotulo: 'Plazos que deben verificarse',
  plazosDetalle:
    'El motor de diagnóstico no fija fechas: entrega el identificador de la regla y la calculadora de plazos hace el cómputo con el corpus verificado.',
  plazosVacio: 'El motor no entregó ningún identificador de regla de plazo.',
  irAPlazos: 'Calcular este plazo',
  reglaSinFicha:
    'Esta regla no está cargada en la calculadora de plazos, de modo que aquí no hay enlace al cómputo.',
  documentosRotulo: 'Documentos necesarios',
  faltanteRotulo: 'Información faltante',
  faltanteVacio: 'El motor no reportó información faltante.',
  lineasRotulo: 'Posibles líneas de análisis',
  advertenciasRotulo: 'Advertencias del motor',
  diasRotulo: 'Días naturales desde la notificación',
  diasDetalle: 'Dato informativo. No es cómputo de plazo ni fecha de vencimiento.',

  llamada: 'Quiero que un abogado revise mi caso',
  llamadaTitulo: 'Revisión por un abogado',
  llamadaDetalle:
    'Con esto se crea un prospecto en el panel interno de NOVA LEGAL, S.C. con tus datos de contacto y el resumen de este diagnóstico. No sustituye una consulta ni implica que exista una relación profesional.',
  resumenAdjuntoRotulo: 'Resumen que se adjunta al prospecto',
  verResumen: 'Ver el resumen que se adjunta',
  ocultarResumen: 'Ocultar el resumen que se adjunta',
  campoNombre: 'Nombre de contacto',
  campoCorreo: 'Correo electrónico',
  campoTelefono: 'Teléfono, opcional',
  campoOrganizacion: 'Empresa o despacho, opcional',
  campoNota: 'Algo que quieras agregar, opcional',
  notaDetalle:
    'Escribe solo lo que quieras compartir por este medio. No adjuntes documentos ni datos sensibles del expediente.',
  notaEspacio: 'Espacio disponible para tu nota, en caracteres:',
  enviar: 'Enviar mi caso a revisión',
  enviando: 'Enviando',
  enviadoTitulo: 'Datos recibidos',
  enviadoDetalle:
    'Quedaron registrados junto con el resumen del diagnóstico. El equipo de NOVA LEGAL, S.C. da seguimiento por el correo que dejaste.',

  errorMotorTitulo: 'No se pudo consultar el motor',
  errorMotorDetalle: 'Revisa la conexión e inténtalo de nuevo.',
  reintentar: 'Volver a intentar',
  errorEnvioTitulo: 'No se pudo registrar',
  errorDatosTitulo: 'Lo capturado ya no corresponde al cuestionario',
  errorDatosDetalle:
    'El cuestionario cambió de versión, o el dato guardado en este navegador dejó de ser válido. Vacía lo capturado para volver a empezar.',
} as const;
