/**
 * Armado del diagnostico preliminar.
 *
 * Tres reglas gobiernan este archivo:
 *
 * 1. No se anticipa resultado. Todo texto que sale de aqui pasa por el guardian de
 *    lenguaje y, si promete algo, el modulo revienta en lugar de publicarlo.
 * 2. No se citan preceptos, tesis ni plazos. Cuando una rama corresponde a un
 *    procedimiento, se devuelve el identificador de la regla del motor de plazos y es
 *    ese motor, con su corpus verificado, el que da la fecha.
 * 3. Lo que no se sabe se declara como informacion faltante. Nunca se supone.
 */
import { aDias, type FechaISO } from '../fecha.js';
import { lenguajePrudente, revisarTextos } from './lenguaje.js';
import type {
  Cuestionario, Diagnostico, NivelUrgencia, OpcionesDiagnostico, Respuestas, Ternario, ViaPosible,
} from './tipos.js';

const AVISO_BASE =
  'Este diagnostico es preliminar, se arma solo con lo que el interesado respondio y no sustituye ' +
  'la revision del abogado responsable. No anticipa el sentido de ninguna resolucion.';

const AVISO_PLAZOS =
  'Aqui no se fija ninguna fecha de vencimiento. Cada via devuelve el identificador de la regla ' +
  'que el motor de plazos debe computar contra el texto vigente y el calendario aplicable.';

const AVISO_DOCUMENTOS =
  'La orientacion cambia si aparece un documento que contradiga lo respondido; el expediente manda ' +
  'sobre el cuestionario.';

/**
 * Umbral interno de triage, no es un plazo legal ni tiene efecto juridico alguno.
 * Solo sirve para que un asunto que ya lleva tiempo notificado no salga como rutinario.
 */
const DIAS_PARA_URGENCIA_ALTA = 20;

/** Tipos de acto que, por si mismos, sugieren que ya hay algo que revisar como definitivo. */
const ACTOS_DEFINITIVOS = [
  'determinacion_contribuciones',
  'multa',
  'negativa_devolucion',
  'resolucion_de_recurso',
];

/** Tipos de acto en los que no se sabe todavia que contiene el documento. */
const ACTOS_AMBIGUOS = ['acta_o_requerimiento', 'cobro_o_ejecucion', 'otro'];

function opcionUnica(respuestas: Respuestas, id: string): string | null {
  const r = respuestas[id];
  if (r === undefined || r.tipo !== 'opcion_unica') return null;
  return r.valor;
}

function ternario(respuestas: Respuestas, id: string): Ternario {
  const v = opcionUnica(respuestas, id);
  if (v === 'si' || v === 'no') return v;
  return 'no_se';
}

function fechaDe(respuestas: Respuestas, id: string): FechaISO | null {
  const r = respuestas[id];
  if (r === undefined || r.tipo !== 'fecha') return null;
  return r.valor;
}

function montoDe(respuestas: Respuestas, id: string): number | null {
  const r = respuestas[id];
  if (r === undefined || r.tipo !== 'monto') return null;
  return r.valor;
}

/**
 * Resuelve un rasgo del acto que puede venir del tipo elegido o de su pregunta propia.
 * Si el tipo de acto ya lo contesta, no se vuelve a preguntar; si el tipo es ambiguo,
 * manda la respuesta especifica; si tampoco esta, queda en "no se".
 */
function rasgo(
  tipoActo: string | null,
  valorPropio: string,
  respuestas: Respuestas,
  idPregunta: string,
): Ternario {
  if (tipoActo === valorPropio) return 'si';
  if (tipoActo !== null && !ACTOS_AMBIGUOS.includes(tipoActo)) return 'no';
  return ternario(respuestas, idPregunta);
}

function via(
  clave: string,
  nombre: string,
  reglaPlazoId: string,
  porQue: string,
  requiereVerificar: string[],
): ViaPosible {
  return {
    clave,
    nombre: lenguajePrudente(nombre, `via ${clave}`),
    reglaPlazoId,
    porQue: lenguajePrudente(porQue, `via ${clave}`),
    requiereVerificar: requiereVerificar.map((t) => lenguajePrudente(t, `via ${clave}`)),
  };
}

const VERIFICAR_COMUN = [
  'Que el acto sea de los que admiten esa via, lo que requiere revision juridica del documento completo.',
  'Que la notificacion se haya practicado de forma valida; se requiere revisar la resolucion y su constancia de notificacion.',
  'El computo del plazo con el motor de plazos, que es quien fija la fecha.',
];

/**
 * Arma el diagnostico con las respuestas capturadas. Funcion pura: no lee reloj, no
 * lee disco y no consulta red. La fecha de referencia entra por parametro o no entra.
 */
export function armarDiagnostico(
  cuestionario: Cuestionario,
  respuestas: Respuestas,
  opciones: OpcionesDiagnostico = {},
): Diagnostico {
  // Hechos derivados. Cada rasgo depende de su rama: si la rama no aplica, el rasgo
  // no se toma de una respuesta vieja que quedo colgada de una version anterior.
  const autoridad = opcionUnica(respuestas, 'autoridad');
  const tipoActo = opcionUnica(respuestas, 'tipo_acto');
  const fechaNotificacion = fechaDe(respuestas, 'fecha_notificacion');
  const cantidad = montoDe(respuestas, 'monto');
  const credito = ternario(respuestas, 'existe_credito_fiscal');
  const ejecucion = ternario(respuestas, 'procedimiento_ejecucion');
  const embargo = ejecucion === 'si' ? ternario(respuestas, 'hubo_embargo') : 'no';
  const cuentas = embargo === 'si' ? ternario(respuestas, 'embargo_cuentas') : 'no';
  const visita = autoridad === 'otra_federal' ? 'no' : ternario(respuestas, 'hubo_visita_domiciliaria');
  const pama =
    autoridad === null || autoridad === 'aduanas' || autoridad === 'sat'
      ? ternario(respuestas, 'existe_pama')
      : 'no';
  const definitiva = ternario(respuestas, 'hay_resolucion_definitiva');
  const multa = rasgo(tipoActo, 'multa', respuestas, 'es_multa');
  const determinacion = rasgo(tipoActo, 'determinacion_contribuciones', respuestas, 'es_determinacion_contribuciones');
  const negativa = rasgo(tipoActo, 'negativa_devolucion', respuestas, 'es_negativa_devolucion');

  const vias: ViaPosible[] = [];
  const faltante: string[] = [];
  const lineas: string[] = [];
  const documentos: string[] = [
    'Acto que se pretende combatir, completo y legible, con todos sus anexos.',
    'Constancia de notificacion del acto y, en su caso, el citatorio previo.',
    'Documento con el que se acredita la personalidad de quien promueve.',
    'Identificacion oficial vigente del interesado o de su representante.',
  ];

  const definitivoProbable =
    definitiva === 'si' ||
    (tipoActo !== null && ACTOS_DEFINITIVOS.includes(tipoActo)) ||
    multa === 'si' ||
    determinacion === 'si' ||
    negativa === 'si';
  const actoDeEjecucion = tipoActo === 'cobro_o_ejecucion' || ejecucion === 'si';
  const hayQueImpugnar = definitivoProbable || actoDeEjecucion;
  const yaHuboRecurso = tipoActo === 'resolucion_de_recurso';

  // Rama aduanera en curso. Mientras el procedimiento no cierra, lo que hay es una
  // oportunidad de defensa dentro de el, no una impugnacion de resolucion definitiva.
  const pamaEnCurso = pama === 'si' && definitiva !== 'si';
  if (pamaEnCurso) {
    vias.push(via(
      'pama_pruebas_y_alegatos',
      'Ofrecimiento de pruebas y formulacion de alegatos dentro del procedimiento administrativo en materia aduanera',
      'ley-aduanera-150',
      'Con lo capturado podria existir una via de defensa dentro del propio procedimiento aduanero, antes de que la autoridad resuelva.',
      [
        'Que el procedimiento siga abierto y no exista todavia resolucion.',
        'El acta de inicio y la forma en que quedo notificada; se requiere revisar la resolucion y su constancia de notificacion.',
        'El computo del plazo con el motor de plazos, que es quien fija la fecha.',
      ],
    ));
    if (embargo === 'si') {
      vias.push(via(
        'pama_legal_estancia',
        'Acreditamiento de la legal estancia en el pais de la mercancia embargada',
        'ley-aduanera-155',
        'Existe un posible problema que debe analizarse sobre la documentacion que ampara la mercancia embargada.',
        [
          'Que la mercancia embargada este identificada en el acta y en el inventario.',
          'La documentacion aduanera disponible y su correspondencia con la mercancia.',
          'El computo del plazo con el motor de plazos, que es quien fija la fecha.',
        ],
      ));
    }
  }

  if (autoridad === null) {
    faltante.push(
      'No se identifico la autoridad que emitio el acto, y sin ella no es posible orientar sobre la via. ' +
      'Se requiere revisar el encabezado, el sello y la firma del documento.',
    );
  } else if (hayQueImpugnar && !pamaEnCurso) {
    if (autoridad === 'sat' || autoridad === 'aduanas') {
      if (!yaHuboRecurso) {
        vias.push(via(
          'recurso_de_revocacion',
          'Recurso de revocacion ante la propia autoridad fiscal',
          'cff-121',
          'Con lo capturado podria existir una via de defensa en sede administrativa, que suele plantearse como alternativa al juicio.',
          VERIFICAR_COMUN,
        ));
      }
      vias.push(via(
        'juicio_contencioso_administrativo',
        'Juicio contencioso administrativo federal ante el Tribunal Federal de Justicia Administrativa',
        'lfpca-13-I-a',
        'Con lo capturado podria existir una via de defensa jurisdiccional; requiere revision juridica del caracter definitivo del acto.',
        VERIFICAR_COMUN,
      ));
    } else if (autoridad === 'imss') {
      if (!yaHuboRecurso) {
        vias.push(via(
          'recurso_de_inconformidad',
          'Recurso de inconformidad ante el Instituto Mexicano del Seguro Social',
          'rri-6',
          'Con lo capturado podria existir una via de defensa en sede administrativa ante el propio Instituto.',
          VERIFICAR_COMUN,
        ));
      }
      vias.push(via(
        'juicio_contencioso_administrativo',
        'Juicio contencioso administrativo federal ante el Tribunal Federal de Justicia Administrativa',
        'lfpca-13-I-a',
        'Con lo capturado podria existir una via de defensa jurisdiccional; requiere revision juridica del caracter definitivo del acto.',
        VERIFICAR_COMUN,
      ));
    } else if (autoridad === 'infonavit') {
      vias.push(via(
        'juicio_contencioso_administrativo',
        'Juicio contencioso administrativo federal ante el Tribunal Federal de Justicia Administrativa',
        'lfpca-13-I-a',
        'Con lo capturado podria existir una via de defensa jurisdiccional; requiere revision juridica del caracter definitivo del acto.',
        VERIFICAR_COMUN,
      ));
      faltante.push(
        'El recurso administrativo que se tramita ante el propio Instituto del Fondo Nacional de la Vivienda ' +
        'para los Trabajadores no tiene regla cargada en el motor de plazos, de modo que aqui no se puede ' +
        'entregar su identificador. Requiere revision juridica y cargar la regla antes de orientarse por esa via.',
      );
    } else if (autoridad === 'fiscal_estatal') {
      vias.push(via(
        'juicio_contencioso_administrativo',
        'Juicio contencioso administrativo ante el tribunal competente',
        'lfpca-13-I-a',
        'Con lo capturado podria existir una via de defensa jurisdiccional; requiere revision juridica de que tribunal es el competente.',
        [
          ...VERIFICAR_COMUN,
          'Si el acto se emitio en materia coordinada, lo que determina el tribunal competente y la regla de plazo aplicable.',
        ],
      ));
      faltante.push(
        'El recurso administrativo previsto en la legislacion de la entidad federativa no tiene regla cargada ' +
        'en el motor de plazos. El identificador entregado corresponde a la via jurisdiccional federal y solo ' +
        'sirve si el tribunal federal resulta competente; requiere revision juridica.',
      );
    } else if (autoridad === 'otra_federal') {
      if (!yaHuboRecurso) {
        vias.push(via(
          'recurso_de_revision_administrativo',
          'Recurso de revision en sede administrativa',
          'lfpa-85',
          'Con lo capturado podria existir una via de defensa ante la propia administracion federal.',
          VERIFICAR_COMUN,
        ));
      }
      vias.push(via(
        'juicio_contencioso_administrativo',
        'Juicio contencioso administrativo federal ante el Tribunal Federal de Justicia Administrativa',
        'lfpca-13-I-a',
        'Con lo capturado podria existir una via de defensa jurisdiccional; requiere revision juridica de la competencia del Tribunal sobre esa materia.',
        VERIFICAR_COMUN,
      ));
    }
  }

  // La inmovilizacion de cuentas suele plantear una defensa adicional y urgente. Se
  // menciona como posibilidad que hay que revisar, no como camino recomendado.
  if (cuentas === 'si') {
    vias.push(via(
      'amparo_indirecto',
      'Juicio de amparo indirecto ante juzgado de distrito',
      'lamp-17',
      'El embargo de cuentas bancarias podria dar lugar a una via de defensa adicional; requiere revision juridica de su procedencia y de su oportunidad.',
      [
        'Que exista un acto de imposible reparacion o que se agote antes la instancia ordinaria, lo que requiere revision juridica.',
        'La fecha y la forma en que el interesado conocio la inmovilizacion.',
        'El computo del plazo con el motor de plazos, que es quien fija la fecha.',
      ],
    ));
  }

  // Documentos que solo tienen sentido pedir en ciertas ramas.
  if (credito === 'si') documentos.push('Formato de pago o estado de cuenta donde consten el credito y sus accesorios.');
  if (ejecucion === 'si') documentos.push('Mandamiento de ejecucion y acta de requerimiento de pago.');
  if (embargo === 'si') documentos.push('Acta de embargo con el inventario y el avaluo de los bienes.');
  if (cuentas === 'si') documentos.push('Oficio de inmovilizacion dirigido a la institucion financiera y estados de cuenta del periodo.');
  if (visita === 'si') documentos.push('Orden de visita domiciliaria, actas parciales, ultima acta parcial y acta final.');
  if (pama === 'si') documentos.push('Acta de inicio del procedimiento aduanero y documentacion que ampara la mercancia.');
  if (negativa === 'si') documentos.push('Solicitud de devolucion presentada, sus anexos y la respuesta de la autoridad.');
  if (multa === 'si') documentos.push('Constancia de la conducta sancionada y de la forma en que se cuantifico la sancion.');
  if (determinacion === 'si') documentos.push('Papeles de trabajo y anexos donde la autoridad integro las cantidades determinadas.');
  if (autoridad === 'imss') documentos.push('Cedulas de liquidacion y movimientos afiliatorios del periodo revisado.');
  if (autoridad === 'infonavit') documentos.push('Cedulas de determinacion de aportaciones y amortizaciones del periodo revisado.');

  // Lineas de analisis. Son hipotesis por revisar, no conclusiones.
  lineas.push(
    'Competencia de la autoridad emisora, en su triple aspecto material, territorial y por grado; requiere revision juridica.',
    'Fundamentacion y motivacion del acto: existe un posible problema que debe analizarse si el documento no expresa las razones y los preceptos que aplico.',
    'Validez de la notificacion: se requiere revisar la resolucion y su constancia de notificacion.',
  );
  if (visita === 'si') lineas.push('Desarrollo de la visita domiciliaria, desde la orden hasta el acta final, incluida su duracion; requiere revision juridica.');
  if (determinacion === 'si') lineas.push('Origen de las cantidades determinadas y la forma en que la autoridad las integro; requiere revision juridica.');
  if (multa === 'si') lineas.push('Individualizacion de la sancion y las circunstancias que la autoridad dijo haber considerado; requiere revision juridica.');
  if (negativa === 'si') lineas.push('Motivos de la negativa y suficiencia de las pruebas aportadas con la solicitud; requiere revision juridica.');
  if (pama === 'si') lineas.push('Documentacion que ampara la mercancia y regularidad de las actas del procedimiento aduanero; requiere revision juridica.');
  if (credito === 'si') lineas.push('Antiguedad del credito y de las facultades ejercidas, para revisar caducidad y prescripcion; requiere revision juridica.');
  if (actoDeEjecucion) lineas.push('Regularidad de los actos del procedimiento de ejecucion y posibilidad de suspenderlo mediante garantia; requiere revision juridica.');
  if (cuentas === 'si') lineas.push('Alcance de la inmovilizacion de las cuentas frente a la cantidad exigida; requiere revision juridica.');
  if (definitiva === 'no') lineas.push('Caracter definitivo del acto: podria tratarse de una actuacion dentro de un procedimiento que aun no concluye; requiere revision juridica.');
  if (yaHuboRecurso) lineas.push('Alcance de lo resuelto en el recurso y los planteamientos que quedaron sin estudio; requiere revision juridica.');
  if (cantidad !== null) lineas.push('La cuantia del asunto puede incidir en la via y en las reglas de tramitacion; requiere revision juridica.');

  // Informacion faltante. Se declara, no se rellena.
  if (tipoActo === null) faltante.push('No se preciso que tipo de acto es, y de eso depende la via; se requiere revisar el documento completo.');
  if (fechaNotificacion === null) {
    faltante.push(
      'No se capturo la fecha de notificacion. Sin ella el motor de plazos no puede computar nada y ' +
      'se requiere revisar la resolucion y su constancia de notificacion.',
    );
  }
  if (cantidad === null) faltante.push('No se capturo la cantidad involucrada, dato que puede incidir en la via procesal.');
  if (credito === 'no_se') faltante.push('No se sabe si ya existe un credito fiscal determinado.');
  if (ejecucion === 'no_se') faltante.push('No se sabe si hay procedimiento administrativo de ejecucion en curso.');
  if (ejecucion === 'si' && embargo === 'no_se') faltante.push('No se sabe si hubo embargo dentro del procedimiento de ejecucion.');
  if (embargo === 'si' && cuentas === 'no_se') faltante.push('No se sabe si el embargo alcanzo cuentas bancarias.');
  if (visita === 'no_se') faltante.push('No se sabe si hubo visita domiciliaria.');
  if (pama === 'no_se') faltante.push('No se sabe si existe un procedimiento administrativo en materia aduanera.');
  if (definitiva === 'no_se') faltante.push('No se sabe si ya hay resolucion definitiva, y de eso depende que la via sea la ordinaria o la que corre dentro del procedimiento.');
  if (multa === 'no_se') faltante.push('No se sabe si el acto impone una multa.');
  if (determinacion === 'no_se') faltante.push('No se sabe si el acto determina contribuciones, cuotas o aportaciones a cargo.');
  if (negativa === 'no_se') faltante.push('No se sabe si el acto niega una devolucion solicitada.');
  if (vias.length === 0 && autoridad !== null) {
    faltante.push(
      'Con lo capturado no se identifico un acto que ya admita impugnacion. Existe un posible problema ' +
      'que debe analizarse y se requiere revision juridica del documento antes de descartar cualquier via.',
    );
  }

  // Dias naturales transcurridos. Es un dato descriptivo; el plazo lo computa el motor.
  let diasNaturales: number | null = null;
  if (fechaNotificacion !== null && opciones.hoy !== undefined) {
    diasNaturales = aDias(opciones.hoy) - aDias(fechaNotificacion);
  }

  // Urgencia. Se gradua por hechos capturados, nunca por la fuerza del caso.
  const motivosUrgencia: string[] = [];
  let urgencia: NivelUrgencia = 'por_definir';
  if (cuentas === 'si') {
    urgencia = 'inmediata';
    motivosUrgencia.push('Hay cuentas bancarias embargadas, de modo que el patrimonio ya esta afectado.');
  } else if (embargo === 'si') {
    urgencia = 'inmediata';
    motivosUrgencia.push('Hay bienes embargados dentro del procedimiento de ejecucion.');
  } else if (ejecucion === 'si') {
    urgencia = 'alta';
    motivosUrgencia.push('El procedimiento administrativo de ejecucion ya inicio.');
  } else if (diasNaturales !== null && diasNaturales > DIAS_PARA_URGENCIA_ALTA) {
    urgencia = 'alta';
    motivosUrgencia.push('La notificacion no es reciente, de modo que el computo del plazo con el motor de plazos no admite espera.');
  } else if (fechaNotificacion !== null && vias.length > 0) {
    urgencia = 'media';
    motivosUrgencia.push('Hay acto notificado y al menos una via que revisar; el motor de plazos debe correr antes de cualquier decision.');
  } else {
    motivosUrgencia.push('Falta informacion basica para graduar la urgencia; mientras tanto se trata como asunto por revisar de inmediato.');
  }
  if (fechaNotificacion === null) {
    motivosUrgencia.push('Sin fecha de notificacion no hay forma de saber que tan cerca esta el vencimiento.');
  }

  const resumen =
    vias.length > 0
      ? 'Con lo capturado podria existir una via de defensa. Se requiere revisar la resolucion y su ' +
        'constancia de notificacion, y correr el motor de plazos con los identificadores de regla que ' +
        'aqui se entregan, antes de tomar cualquier decision.'
      : 'Con lo capturado no es posible orientar hacia una via de defensa. Existe un posible problema ' +
        'que debe analizarse y se requiere revision juridica del acto y de su notificacion.';

  const diagnostico: Diagnostico = {
    version: cuestionario.version,
    resumen,
    urgencia,
    motivosUrgencia,
    vias,
    plazosPorVerificar: [...new Set(vias.map((v) => v.reglaPlazoId))],
    documentos,
    informacionFaltante: faltante,
    lineasDeAnalisis: lineas,
    advertencias: [AVISO_BASE, AVISO_PLAZOS, AVISO_DOCUMENTOS],
    diasNaturalesDesdeNotificacion: diasNaturales,
  };

  // Red final. Si algo se colo, aqui truena y no sale del modulo.
  revisarTextos(diagnostico);
  return diagnostico;
}
