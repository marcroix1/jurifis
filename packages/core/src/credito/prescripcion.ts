import { aDias, sumarAnios, type FechaISO } from '../fecha.js';
import type { Fundamento } from '../tipos.js';
import {
  CONCLUSION_EXTINCION,
  ESTIMACION,
  LEYENDA_ESTIMACION,
  type ActoConEfectoPosible,
  type ActoExpediente,
  type AnalisisExtincion,
  type BloqueExtincion,
  type Constancia,
  type NormaExtincion,
  type PasoTrazaCredito,
  type SupuestoExtincion,
  type TipoActo,
} from './tipos.js';

/**
 * Prescripcion del credito fiscal y caducidad de las facultades de la autoridad.
 *
 * Regla dura del archivo, y la razon de que exista: esta prohibido concluir que hay
 * prescripcion por el solo transcurso de cinco anios. El articulo 146 del Codigo Fiscal
 * de la Federacion interrumpe el termino con cada gestion de cobro notificada al deudor
 * y lo suspende en los casos que el mismo precepto enumera, de modo que el calendario
 * por si solo no extingue nada. Lo que este submodulo entrega es el mapa de lo que hay
 * que verificar, y el tipo de la conclusion hace imposible que entregue otra cosa.
 */

export interface EntradaExtincion {
  /** Fecha en que el pago pudo ser legalmente exigido. Abre el termino de la prescripcion. */
  fechaExigibilidad: FechaISO;
  /** Fecha de referencia contra la que se mide el tiempo corrido. */
  fechaCalculo: FechaISO;
  lineaDeTiempo: ActoExpediente[];
  /**
   * Fecha desde la que corre la caducidad. Se pide, no se deduce: el articulo 67
   * la hace depender de cual de sus cinco fracciones rige el caso, y esa eleccion es
   * juridica, no aritmetica.
   */
  fechaInicioCaducidad?: FechaISO;
  /** El plazo de caducidad se amplia a diez anios en los supuestos del propio articulo 67. */
  caducidadAmpliada?: boolean;
}

type EfectoPosible = 'interrupcion' | 'suspension';

interface Atribucion {
  efecto: EfectoPosible;
  claveSupuesto: string;
  porQue: string;
  /** Si el efecto depende de que el acto se hubiera notificado al deudor. */
  dependeDeNotificacion: boolean;
}

/**
 * Que efecto puede tener cada tipo de acto sobre la prescripcion. "Puede", nunca
 * "tiene": el efecto se atribuye en abstracto y la verificacion queda escrita al lado.
 */
const EFECTOS_PRESCRIPCION: Partial<Record<TipoActo, Atribucion>> = {
  notificacion_del_credito: {
    efecto: 'interrupcion',
    claveSupuesto: 'gestion_de_cobro_notificada',
    porQue:
      'La notificacion del credito puede constituir gestion de cobro hecha saber al deudor. Hay que revisar si el acto notificado exigia el pago o solo lo determinaba.',
    dependeDeNotificacion: true,
  },
  requerimiento_de_pago: {
    efecto: 'interrupcion',
    claveSupuesto: 'gestion_de_cobro_notificada',
    porQue: 'El requerimiento de pago es la gestion de cobro tipica del segundo parrafo del articulo 146.',
    dependeDeNotificacion: true,
  },
  acto_del_procedimiento_administrativo_de_ejecucion: {
    efecto: 'interrupcion',
    claveSupuesto: 'actuacion_dentro_del_procedimiento_administrativo_de_ejecucion',
    porQue:
      'Cualquier actuacion de la autoridad dentro del procedimiento administrativo de ejecucion se considera gestion de cobro, siempre que se haga del conocimiento del deudor.',
    dependeDeNotificacion: true,
  },
  embargo: {
    efecto: 'interrupcion',
    claveSupuesto: 'actuacion_dentro_del_procedimiento_administrativo_de_ejecucion',
    porQue:
      'El embargo es actuacion dentro del procedimiento administrativo de ejecucion y puede operar como gestion de cobro si se hizo del conocimiento del deudor.',
    dependeDeNotificacion: true,
  },
  convenio_de_pago_a_plazos: {
    efecto: 'interrupcion',
    claveSupuesto: 'reconocimiento_expreso_o_tacito',
    porQue:
      'Solicitar o celebrar el pago a plazos puede leerse como reconocimiento expreso de la existencia del credito.',
    dependeDeNotificacion: false,
  },
  pago: {
    efecto: 'interrupcion',
    claveSupuesto: 'reconocimiento_expreso_o_tacito',
    porQue:
      'Un pago parcial puede leerse como reconocimiento tacito de la existencia del credito. Hay que revisar si se hizo bajo protesta o al amparo de un medio de defensa.',
    dependeDeNotificacion: false,
  },
  reconocimiento_expreso_o_tacito: {
    efecto: 'interrupcion',
    claveSupuesto: 'reconocimiento_expreso_o_tacito',
    porQue: 'El segundo parrafo del articulo 146 interrumpe el termino con el reconocimiento del deudor.',
    dependeDeNotificacion: false,
  },
  suspension_del_procedimiento_administrativo_de_ejecucion: {
    efecto: 'suspension',
    claveSupuesto: 'suspension_del_procedimiento_administrativo_de_ejecucion',
    porQue:
      'Suspendido el procedimiento administrativo de ejecucion en los terminos del articulo 144, se suspende tambien el plazo de la prescripcion.',
    dependeDeNotificacion: false,
  },
  recurso_administrativo: {
    efecto: 'suspension',
    claveSupuesto: 'suspension_del_procedimiento_administrativo_de_ejecucion',
    porQue:
      'El recurso puede haber traido consigo la suspension del procedimiento administrativo de ejecucion. La suspension de la prescripcion no nace del recurso en si, sino de que el procedimiento se hubiera suspendido conforme al articulo 144.',
    dependeDeNotificacion: false,
  },
  juicio: {
    efecto: 'suspension',
    claveSupuesto: 'suspension_del_procedimiento_administrativo_de_ejecucion',
    porQue:
      'El juicio puede haber traido consigo la suspension del procedimiento administrativo de ejecucion. Hay que revisar si se otorgo y desde cuando.',
    dependeDeNotificacion: false,
  },
  domicilio_fiscal_desocupado_o_incorrecto: {
    efecto: 'suspension',
    claveSupuesto: 'domicilio_fiscal_desocupado_o_incorrecto',
    porQue:
      'El cuarto parrafo del articulo 146 suspende el plazo cuando el contribuyente desocupo su domicilio fiscal sin dar aviso o lo senalo de manera incorrecta.',
    dependeDeNotificacion: false,
  },
};

/** Que efecto puede tener cada tipo de acto sobre la caducidad del articulo 67. */
const EFECTOS_CADUCIDAD: Partial<Record<TipoActo, Atribucion>> = {
  ejercicio_de_facultades_de_comprobacion: {
    efecto: 'suspension',
    claveSupuesto: 'ejercicio_de_facultades_de_comprobacion',
    porQue:
      'El sexto parrafo del articulo 67 suspende el plazo cuando se ejercen las facultades de comprobacion de las fracciones II, III, IV y IX del articulo 42.',
    dependeDeNotificacion: false,
  },
  recurso_administrativo: {
    efecto: 'suspension',
    claveSupuesto: 'recurso_administrativo_o_juicio',
    porQue: 'El sexto parrafo del articulo 67 suspende el plazo cuando se interpone un recurso administrativo.',
    dependeDeNotificacion: false,
  },
  juicio: {
    efecto: 'suspension',
    claveSupuesto: 'recurso_administrativo_o_juicio',
    porQue: 'El sexto parrafo del articulo 67 suspende el plazo cuando se interpone un juicio.',
    dependeDeNotificacion: false,
  },
};

function notaDeNotificacion(estado: Constancia | undefined): string {
  if (estado === 'si') {
    return 'El expediente registra que el acto se notifico o se hizo saber al deudor. Hay que cotejar la constancia, porque de ella depende el efecto interruptor.';
  }
  if (estado === 'no') {
    return 'El expediente registra que el acto NO se notifico al deudor. Sin esa notificacion el segundo parrafo del articulo 146 no le atribuye efecto interruptor, y por eso mismo hay que confirmar el dato antes de apoyarse en el.';
  }
  return 'No consta si el acto se notifico o se hizo saber al deudor. Mientras eso no se resuelva, el efecto interruptor no puede afirmarse ni descartarse.';
}

function buscarSupuesto(lista: SupuestoExtincion[], clave: string): SupuestoExtincion | undefined {
  return lista.find((s) => s.clave === clave);
}

function atribuir(
  actos: ActoExpediente[],
  tabla: Partial<Record<TipoActo, Atribucion>>,
  interruptores: SupuestoExtincion[],
  suspensiones: SupuestoExtincion[],
  fundamentoInterrupcion: Fundamento,
  fundamentoSuspension: Fundamento,
): { conEfecto: ActoConEfectoPosible[]; sinEfecto: ActoExpediente[] } {
  const conEfecto: ActoConEfectoPosible[] = [];
  const sinEfecto: ActoExpediente[] = [];

  for (const acto of actos) {
    const atribucion = tabla[acto.tipo];
    if (atribucion === undefined) {
      sinEfecto.push(acto);
      continue;
    }
    const catalogo = atribucion.efecto === 'interrupcion' ? interruptores : suspensiones;
    const supuesto = buscarSupuesto(catalogo, atribucion.claveSupuesto);
    const requiereVerificar = [...(supuesto?.requiereVerificar ?? [])];
    if (atribucion.dependeDeNotificacion) requiereVerificar.push(notaDeNotificacion(acto.notificadoAlDeudor));
    if (acto.constaEn === undefined) {
      requiereVerificar.push('No se registro en que foja, oficio o documento del expediente consta el acto.');
    }
    conEfecto.push({
      acto,
      efectoPosible: atribucion.efecto,
      porQue: atribucion.porQue,
      requiereVerificar,
      fundamento:
        supuesto?.fundamento ??
        (atribucion.efecto === 'interrupcion' ? fundamentoInterrupcion : fundamentoSuspension),
    });
  }

  return { conEfecto, sinEfecto };
}

function ordenarPorFecha(actos: ActoExpediente[]): ActoExpediente[] {
  return [...actos].sort((a, b) => aDias(a.fecha) - aDias(b.fecha));
}

/**
 * Analiza prescripcion y caducidad sobre la linea de tiempo del expediente.
 *
 * Devuelve siempre la misma conclusion, y eso es el punto: el analisis requiere
 * verificar los actos que pudieron interrumpir o suspender el plazo. Lo que cambia de
 * un caso a otro es la lista de actos registrados a los que hay que mirarles el efecto.
 */
export function analizarExtincion(entrada: EntradaExtincion, norma: NormaExtincion): AnalisisExtincion {
  const actos = ordenarPorFecha(entrada.lineaDeTiempo);
  const traza: PasoTrazaCredito[] = [];

  // Prescripcion.
  const p = norma.prescripcion;
  const diasPrescripcion = aDias(entrada.fechaCalculo) - aDias(entrada.fechaExigibilidad);
  const referenciaPrescripcion = sumarAnios(entrada.fechaExigibilidad, p.plazoAnios).fecha;
  const atribucionPrescripcion = atribuir(
    actos,
    EFECTOS_PRESCRIPCION,
    p.interrumpenSiSeAcreditan,
    p.suspendenSiSeAcreditan,
    p.fundamentoInterrupcion,
    p.fundamentoInterrupcion,
  );

  const verificarPrescripcion: string[] = [
    `Descartar que exista cualquier gestion de cobro notificada al deudor entre el ${entrada.fechaExigibilidad} y el ${entrada.fechaCalculo}, aunque no aparezca en la linea de tiempo capturada.`,
    ...p.interrumpenSiSeAcreditan.map((s) => `Descartar la interrupcion por: ${s.descripcion}`),
    ...p.suspendenSiSeAcreditan.map((s) => `Descartar la suspension por: ${s.descripcion}`),
    `Revisar el tope del quinto parrafo del articulo 146: ${p.notaTope}`,
  ];

  const prescripcion: BloqueExtincion = {
    figura: 'prescripcion',
    conclusion: CONCLUSION_EXTINCION,
    plazoAnios: p.plazoAnios,
    diasNaturalesCorridos: diasPrescripcion,
    aniosNaturalesCorridos: Math.floor(diasPrescripcion / 365.2425),
    fechaDeReferenciaSinInterrupciones: referenciaPrescripcion,
    actosConEfectoPosible: atribucionPrescripcion.conEfecto,
    requiereVerificar: verificarPrescripcion,
    advertencias: [
      'El transcurso de cinco anios no extingue el credito por si solo. El segundo parrafo del articulo 146 del Codigo Fiscal de la Federacion interrumpe el termino con cada gestion de cobro notificada al deudor, y cada interrupcion lo reinicia.',
      `La fecha de referencia ${referenciaPrescripcion} es la que resultaria si nada hubiera tocado el termino. No es una fecha de prescripcion y no debe usarse como tal.`,
      p.notaTope,
    ],
    fuentes: [p.fundamento, p.fundamentoInterrupcion, p.fundamentoTope],
  };

  // Caducidad.
  const c = norma.caducidad;
  const plazoCaducidad = entrada.caducidadAmpliada === true ? c.plazoAmpliadoAnios : c.plazoAnios;
  const inicioCaducidad = entrada.fechaInicioCaducidad;
  const atribucionCaducidad = atribuir(
    actos,
    EFECTOS_CADUCIDAD,
    [],
    c.suspendenSiSeAcreditan,
    c.fundamentoSuspension,
    c.fundamentoSuspension,
  );

  const verificarCaducidad: string[] = [
    'Definir cual de las cinco fracciones del articulo 67 rige el caso, porque de eso depende el dia en que empezo a correr el plazo.',
    `Revisar si el plazo es de cinco o de diez anios: ${c.notaPlazoAmpliado}`,
    ...c.suspendenSiSeAcreditan.map((s) => `Descartar la suspension por: ${s.descripcion}`),
    c.notaCatalogoIncompleto,
  ];
  if (inicioCaducidad === undefined) {
    verificarCaducidad.unshift(
      'No se registro la fecha en que empezo a correr la caducidad, asi que el motor no mide ningun tiempo corrido para esta figura.',
    );
  }

  const diasCaducidad = inicioCaducidad === undefined ? null : aDias(entrada.fechaCalculo) - aDias(inicioCaducidad);

  const caducidad: BloqueExtincion = {
    figura: 'caducidad',
    conclusion: CONCLUSION_EXTINCION,
    plazoAnios: plazoCaducidad,
    diasNaturalesCorridos: diasCaducidad,
    aniosNaturalesCorridos: diasCaducidad === null ? null : Math.floor(diasCaducidad / 365.2425),
    fechaDeReferenciaSinInterrupciones:
      inicioCaducidad === undefined ? null : sumarAnios(inicioCaducidad, plazoCaducidad).fecha,
    actosConEfectoPosible: atribucionCaducidad.conEfecto,
    requiereVerificar: verificarCaducidad,
    advertencias: [
      c.notaInterrupcion,
      'La caducidad y la prescripcion son figuras distintas: una extingue las facultades de la autoridad y la otra el credito ya determinado. No se computan sobre la misma fecha ni se suspenden por las mismas causas.',
    ],
    fuentes: [c.fundamento, c.fundamentoSuspension],
  };

  // Actos que ninguna de las dos figuras recogio.
  const clavesConEfecto = new Set<string>();
  for (const a of [...atribucionPrescripcion.conEfecto, ...atribucionCaducidad.conEfecto]) {
    clavesConEfecto.add(`${a.acto.tipo}|${a.acto.fecha}|${a.acto.descripcion}`);
  }
  const actosSinEfectoAtribuido = actos.filter(
    (a) => !clavesConEfecto.has(`${a.tipo}|${a.fecha}|${a.descripcion}`),
  );

  traza.push({
    paso: 1,
    concepto: 'linea de tiempo recibida',
    detalle:
      actos.length === 0
        ? 'No se registro ningun acto del expediente. La ausencia de actos en la captura no significa que no existan: significa que no se capturaron.'
        : `Se recibieron ${actos.length} actos, del ${actos[0]?.fecha ?? ''} al ${actos[actos.length - 1]?.fecha ?? ''}.`,
  });
  traza.push({
    paso: 2,
    concepto: 'tiempo corrido de la prescripcion',
    fecha: entrada.fechaCalculo,
    detalle: `Del ${entrada.fechaExigibilidad} al ${entrada.fechaCalculo} corrieron ${diasPrescripcion} dias naturales. Dato informativo: no es computo de plazo y no concluye nada.`,
    fundamento: p.fundamento,
  });
  traza.push({
    paso: 3,
    concepto: 'actos con efecto posible sobre la prescripcion',
    detalle:
      atribucionPrescripcion.conEfecto.length === 0
        ? 'Ninguno de los actos capturados encaja en los supuestos de interrupcion o suspension del articulo 146. Eso no descarta que existan actos no capturados.'
        : `${atribucionPrescripcion.conEfecto.length} de los actos capturados podrian interrumpir o suspender el termino. Cada uno lleva escrito lo que hay que verificar.`,
    fundamento: p.fundamentoInterrupcion,
  });
  traza.push({
    paso: 4,
    concepto: 'caducidad',
    detalle:
      inicioCaducidad === undefined
        ? 'No se midio tiempo corrido: falta la fecha de inicio, que depende de cual fraccion del articulo 67 rige el caso.'
        : `Del ${inicioCaducidad} al ${entrada.fechaCalculo} corrieron ${diasCaducidad} dias naturales, sobre un plazo de ${plazoCaducidad} anios. Dato informativo.`,
    fundamento: c.fundamento,
  });
  traza.push({
    paso: 5,
    concepto: 'conclusion',
    detalle:
      'El analisis requiere verificar los actos que pudieron interrumpir o suspender el plazo. Este submodulo no concluye prescripcion ni caducidad, y no puede hacerlo: el tipo de su conclusion tiene un solo valor posible.',
    fundamento: p.fundamentoInterrupcion,
  });

  return {
    clase: ESTIMACION,
    leyenda: LEYENDA_ESTIMACION,
    conclusion: CONCLUSION_EXTINCION,
    prescripcion,
    caducidad,
    actosSinEfectoAtribuido,
    traza,
    advertencias: [
      'Prohibido concluir que un credito prescribio por el solo transcurso de cinco anios. Mientras no se descarte cada gestion de cobro notificada al deudor y cada causa de suspension, no hay conclusion que sostener.',
      'La linea de tiempo es la que se capturo. Un acto que existe en el expediente y no se capturo aqui no aparece en este analisis.',
    ],
  };
}
