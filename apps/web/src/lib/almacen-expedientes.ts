/**
 * Almacen de expedientes en memoria del proceso.
 *
 * El paquete @jurifis/db ya declara las tablas cases, case_events, deadlines y
 * documents, pero esta aplicacion todavia no se conecta a la base de datos. Los
 * expedientes viven aqui y se pierden cuando el proceso se reinicia. Las
 * pantallas lo declaran, y los renglones de demostracion vienen marcados como
 * ejemplo para que nadie los confunda con cartera real.
 *
 * Aqui tampoco se cuenta un solo dia: los plazos y su urgencia salen del motor
 * de @jurifis/core, y este archivo solo guarda, filtra y ordena.
 */
import { calcular, sumarDias, type FechaISO, type FormaNotificacion } from '@jurifis/core';
import {
  alertasDeCartera,
  alertasDelExpediente,
  cambiarEstado,
  fechasClave,
  lineaDeTiempo,
  plazosDelExpediente,
  transicionesDesde,
  type Alerta,
  type DocumentoExpediente,
  type EstadoExpediente,
  type EventoExpediente,
  type Expediente,
  type FechaClave,
  type PlazoExpediente,
  type RenglonLinea,
  type TipoEvento,
} from '@jurifis/core/src/expediente/index.js';

export const PERSISTENCIA_EXPEDIENTES = {
  modo: 'memoria' as const,
  titulo: 'Persistencia en memoria',
  detalle:
    'Todavia no hay base de datos conectada. Los expedientes, sus eventos y sus documentos viven en la memoria del servidor y se pierden cuando el proceso se reinicia. Los renglones marcados como ejemplo son datos de demostracion, no cartera del despacho.',
};

/**
 * Fecha civil de hoy en la zona del despacho.
 *
 * El motor de plazos tiene prohibido el objeto Date porque la hora y la zona
 * son la causa clasica del error de un dia. En la frontera de la aplicacion hay
 * que preguntarle la fecha a algo, y se hace nombrando la zona de forma
 * explicita: el formato en-CA entrega AAAA-MM-DD, que es justo lo que el motor
 * espera. De aqui en adelante ya no se vuelve a tocar el reloj.
 */
export function fechaDeHoy(): FechaISO {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/* -------------------------------------------------------------------------- */
/* Almacen                                                                    */
/* -------------------------------------------------------------------------- */

const CLAVE = Symbol.for('jurifis.web.expedientes');

type Ambito = typeof globalThis & { [CLAVE]?: Expediente[] };

function almacen(): Expediente[] {
  const ambito = globalThis as Ambito;
  if (ambito[CLAVE] === undefined) ambito[CLAVE] = ejemplos();
  return ambito[CLAVE];
}

function limpiar(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) return null;
  const v = valor.trim();
  return v.length === 0 ? null : v;
}

function identificador(prefijo: string): string {
  return `${prefijo}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
}

/* -------------------------------------------------------------------------- */
/* Datos de ejemplo                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Cartera de demostracion. Todo aqui es inventado a proposito y se nota: los
 * clientes llevan la palabra Ejemplo en la razon social, los responsables la
 * llevan en el nombre y los numeros de credito empiezan con EJEMPLO. Ninguno
 * corresponde a un asunto, una persona ni un credito real.
 */
function ejemplos(): Expediente[] {
  const doc = (
    id: string,
    nombre: string,
    tipo: string,
    paginas: number,
    incorporadoEl: FechaISO,
  ): DocumentoExpediente => ({ id, nombre, tipo, sha256: null, paginas, incorporadoEl });

  return [
    {
      id: 'ejemplo-nulidad-bajio',
      numeroExpediente: 'EJEMPLO 1234/26-01-01-1',
      caratula: 'Refacciones Ejemplo del Bajio contra Servicio de Administracion Tributaria',
      cliente: {
        nombre: 'Refacciones Ejemplo del Bajio, Sociedad Anonima de Capital Variable',
        registroFederalDeContribuyentes: 'EJE010101AA1',
      },
      autoridad: 'Administracion Desconcentrada de Auditoria Fiscal de ejemplo',
      tipoProcedimiento: 'Juicio contencioso administrativo federal, via ordinaria',
      numeroCredito: 'EJEMPLO-001/2026',
      ejercicio: 2023,
      monto: { cantidad: 1842355.4, moneda: 'MXN' },
      responsable: 'Ana Ejemplo Ruiz',
      estado: 'plazo_corriendo',
      abiertoEn: '2026-08-21',
      cerradoEn: null,
      esEjemplo: true,
      documentos: [
        doc('doc-ej-1', 'Resolucion determinante de ejemplo', 'resolucion', 42, '2026-08-21'),
        doc('doc-ej-2', 'Constancia de notificacion de ejemplo', 'notificacion', 3, '2026-08-21'),
        doc('doc-ej-3', 'Papeles de trabajo de la revision, de ejemplo', 'anexo', 118, '2026-08-24'),
      ],
      eventos: [
        {
          id: 'ev-ej-1',
          tipo: 'notificacion',
          titulo: 'Notificacion personal de la resolucion determinante',
          descripcion:
            'Se notifico en el domicilio fiscal la resolucion que determina el credito de ejemplo.',
          ocurridoEn: '2026-08-20',
          disparaPlazo: {
            reglaId: 'lfpca-13-I-a',
            formaNotificacion: 'personal',
            descripcion: 'demanda de nulidad en la via ordinaria',
          },
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Ana Ejemplo Ruiz',
        },
        {
          id: 'ev-ej-2',
          tipo: 'documento',
          titulo: 'Se integraron los papeles de trabajo de la revision',
          descripcion: 'El cliente entrego el anexo de ejemplo con la integracion de la cuenta.',
          ocurridoEn: '2026-08-24',
          disparaPlazo: null,
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Ana Ejemplo Ruiz',
        },
        {
          id: 'ev-ej-3',
          tipo: 'nota',
          titulo: 'Reunion de estrategia con el cliente',
          descripcion: 'Se acordo combatir la competencia de la autoridad y la caducidad.',
          ocurridoEn: '2026-09-02',
          disparaPlazo: null,
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Bruno Ejemplo Lara',
        },
      ],
    },
    {
      id: 'ejemplo-pama-peninsular',
      numeroExpediente: null,
      caratula: 'Transportes Ejemplo Peninsular, procedimiento administrativo en materia aduanera',
      cliente: {
        nombre: 'Transportes Ejemplo Peninsular, Sociedad de Responsabilidad Limitada de Capital Variable',
        registroFederalDeContribuyentes: 'EJE020202BB2',
      },
      autoridad: 'Aduana de ejemplo',
      tipoProcedimiento: 'Procedimiento administrativo en materia aduanera',
      numeroCredito: null,
      ejercicio: 2026,
      monto: { cantidad: 486200, moneda: 'MXN' },
      responsable: 'Bruno Ejemplo Lara',
      estado: 'plazo_corriendo',
      abiertoEn: '2026-09-07',
      cerradoEn: null,
      esEjemplo: true,
      documentos: [
        doc('doc-ej-4', 'Acta de inicio del procedimiento, de ejemplo', 'acta', 12, '2026-09-07'),
      ],
      eventos: [
        {
          id: 'ev-ej-4',
          tipo: 'notificacion',
          titulo: 'Notificacion personal del acta de inicio',
          descripcion: 'Se entrego el acta que inicia el procedimiento de ejemplo.',
          ocurridoEn: '2026-09-07',
          disparaPlazo: {
            reglaId: 'ley-aduanera-150',
            formaNotificacion: 'personal',
            descripcion: 'ofrecimiento de pruebas y alegatos',
          },
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Bruno Ejemplo Lara',
        },
      ],
    },
    {
      id: 'ejemplo-inconformidad-norte',
      numeroExpediente: 'EJEMPLO RI-0099/2026',
      caratula: 'Constructora Ejemplo Norte contra Instituto Mexicano del Seguro Social',
      cliente: {
        nombre: 'Constructora Ejemplo Norte, Sociedad Anonima de Capital Variable',
        registroFederalDeContribuyentes: 'EJE030303CC3',
      },
      autoridad: 'Subdelegacion de ejemplo del Instituto Mexicano del Seguro Social',
      tipoProcedimiento: 'Recurso de inconformidad',
      numeroCredito: 'EJEMPLO-002/2026',
      ejercicio: 2025,
      monto: { cantidad: 312980.15, moneda: 'MXN' },
      responsable: 'Carla Ejemplo Nava',
      estado: 'plazo_corriendo',
      abiertoEn: '2026-09-01',
      cerradoEn: null,
      esEjemplo: true,
      documentos: [
        doc('doc-ej-5', 'Cedula de liquidacion de ejemplo', 'cedula', 6, '2026-09-01'),
      ],
      eventos: [
        {
          id: 'ev-ej-5',
          tipo: 'notificacion',
          titulo: 'Notificacion personal de la cedula de liquidacion',
          descripcion: 'Capital constitutivo de ejemplo notificado en el domicilio del patron.',
          ocurridoEn: '2026-09-01',
          disparaPlazo: {
            reglaId: 'rri-6',
            formaNotificacion: 'personal',
            descripcion: 'recurso de inconformidad',
          },
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Carla Ejemplo Nava',
        },
      ],
    },
    {
      id: 'ejemplo-heredado-golfo',
      numeroExpediente: 'EJEMPLO 7788/25-01-01-9',
      caratula: 'Alimentos Ejemplo del Golfo contra Servicio de Administracion Tributaria',
      cliente: {
        nombre: 'Alimentos Ejemplo del Golfo, Sociedad Anonima de Capital Variable',
        registroFederalDeContribuyentes: 'EJE040404DD4',
      },
      autoridad: 'Administracion Desconcentrada de Recaudacion de ejemplo',
      tipoProcedimiento: 'Juicio contencioso administrativo federal, via ordinaria',
      numeroCredito: 'EJEMPLO-003/2025',
      ejercicio: 2022,
      monto: { cantidad: 9370410, moneda: 'MXN' },
      responsable: 'Ana Ejemplo Ruiz',
      estado: 'en_analisis',
      abiertoEn: '2025-11-19',
      cerradoEn: null,
      esEjemplo: true,
      documentos: [
        doc('doc-ej-6', 'Expediente recibido del despacho anterior, de ejemplo', 'anexo', 340, '2025-11-19'),
      ],
      eventos: [
        {
          id: 'ev-ej-6',
          tipo: 'notificacion',
          titulo: 'Notificacion personal de la resolucion, de noviembre de 2025',
          descripcion:
            'Asunto de ejemplo recibido de otro despacho. La notificacion es de 2025 y el corpus solo tiene cargado el calendario de dias inhabiles de 2026.',
          ocurridoEn: '2025-11-18',
          disparaPlazo: {
            reglaId: 'lfpca-13-I-a',
            formaNotificacion: 'personal',
            descripcion: 'demanda de nulidad en la via ordinaria',
          },
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Ana Ejemplo Ruiz',
        },
      ],
    },
    {
      id: 'ejemplo-revocacion-integrales',
      numeroExpediente: 'EJEMPLO RR-0451/2026',
      caratula: 'Servicios Ejemplo Integrales contra Servicio de Administracion Tributaria',
      cliente: {
        nombre: 'Servicios Ejemplo Integrales, Sociedad Civil',
        registroFederalDeContribuyentes: 'EJE050505EE5',
      },
      autoridad: 'Administracion Desconcentrada Juridica de ejemplo',
      tipoProcedimiento: 'Recurso de revocacion',
      numeroCredito: 'EJEMPLO-004/2026',
      ejercicio: 2024,
      monto: { cantidad: 204775.9, moneda: 'MXN' },
      responsable: 'Carla Ejemplo Nava',
      estado: 'demanda_presentada',
      abiertoEn: '2026-08-04',
      cerradoEn: null,
      esEjemplo: true,
      documentos: [
        doc('doc-ej-7', 'Acuse de recibo del recurso, de ejemplo', 'acuse', 2, '2026-09-04'),
      ],
      eventos: [
        {
          id: 'ev-ej-7',
          tipo: 'notificacion',
          titulo: 'Notificacion por buzon tributario de la resolucion',
          descripcion: 'Resolucion de ejemplo notificada por buzon tributario.',
          ocurridoEn: '2026-08-03',
          disparaPlazo: {
            reglaId: 'cff-121',
            formaNotificacion: 'buzon_tributario',
            descripcion: 'recurso de revocacion',
          },
          suspension: null,
          cumplePlazoId: null,
          registradoPor: 'Carla Ejemplo Nava',
        },
        {
          id: 'ev-ej-8',
          tipo: 'presentacion',
          titulo: 'Se presento el recurso de revocacion',
          descripcion: 'Presentado por buzon tributario dentro del plazo, en el ejemplo.',
          ocurridoEn: '2026-09-04',
          disparaPlazo: null,
          suspension: null,
          cumplePlazoId: 'plazo:ev-ej-7',
          registradoPor: 'Carla Ejemplo Nava',
        },
      ],
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Lectura                                                                    */
/* -------------------------------------------------------------------------- */

export interface VistaExpediente {
  expediente: Expediente;
  plazos: PlazoExpediente[];
  linea: RenglonLinea[];
  alertas: Alerta[];
  fechas: FechaClave[];
  transicionesPosibles: readonly EstadoExpediente[];
  hoy: FechaISO;
}

export interface RenglonCartera {
  expediente: Expediente;
  /** La alerta que manda en este expediente. Nula cuando no tiene plazos. */
  alertaPrincipal: Alerta | null;
  alertas: Alerta[];
  plazosAbiertos: number;
  plazosSinComputar: number;
}

export interface VistaCartera {
  renglones: RenglonCartera[];
  /** Vencimientos proximos de toda la cartera, del mas critico al menos. */
  alertas: Alerta[];
  responsables: string[];
  estados: EstadoExpediente[];
  hoy: FechaISO;
}

export function listarExpedientes(): Expediente[] {
  return [...almacen()];
}

export function obtenerExpediente(id: string): Expediente | null {
  return almacen().find((e) => e.id === id) ?? null;
}

function opcionesDeCalculo(hoy: FechaISO) {
  return { hoy, calcular };
}

export function vistaDeExpediente(id: string): VistaExpediente | null {
  const expediente = obtenerExpediente(id);
  if (expediente === null) return null;
  const hoy = fechaDeHoy();
  const opciones = opcionesDeCalculo(hoy);
  const plazos = plazosDelExpediente(expediente, opciones);
  return {
    expediente,
    plazos,
    linea: lineaDeTiempo(expediente, opciones),
    alertas: alertasDelExpediente(expediente, plazos, { hoy }),
    fechas: fechasClave(expediente, plazos),
    transicionesPosibles: transicionesDesde(expediente.estado),
    hoy,
  };
}

export function vistaDeCartera(): VistaCartera {
  const hoy = fechaDeHoy();
  const opciones = opcionesDeCalculo(hoy);
  const expedientes = listarExpedientes();

  const conPlazos = expedientes.map((expediente) => ({
    expediente,
    plazos: plazosDelExpediente(expediente, opciones),
  }));

  const renglones: RenglonCartera[] = conPlazos.map(({ expediente, plazos }) => {
    const alertas = alertasDelExpediente(expediente, plazos, { hoy });
    const vivas = alertas.filter((a) => a.nivel !== 'cumplido');
    return {
      expediente,
      alertaPrincipal: vivas[0] ?? alertas[0] ?? null,
      alertas,
      plazosAbiertos: plazos.filter((p) => p.cumplidoEn === null).length,
      plazosSinComputar: alertas.filter((a) => a.nivel === 'no_computable').length,
    };
  });

  const responsables = [...new Set(expedientes.map((e) => e.responsable))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const estados = [...new Set(expedientes.map((e) => e.estado))];

  return {
    renglones,
    alertas: alertasDeCartera(conPlazos, { hoy, incluirCumplidos: false }),
    responsables,
    estados,
    hoy,
  };
}

/* -------------------------------------------------------------------------- */
/* Escritura                                                                  */
/* -------------------------------------------------------------------------- */

export interface NuevoExpediente {
  caratula: string;
  clienteNombre: string;
  registroFederalDeContribuyentes?: string | undefined;
  autoridad: string;
  tipoProcedimiento: string;
  numeroExpediente?: string | undefined;
  numeroCredito?: string | undefined;
  ejercicio?: number | undefined;
  monto?: number | undefined;
  moneda?: string | undefined;
  responsable: string;
  abiertoEn?: string | undefined;
}

export function crearExpediente(datos: NuevoExpediente): Expediente {
  const expediente: Expediente = {
    id: identificador('exp'),
    numeroExpediente: limpiar(datos.numeroExpediente),
    caratula: datos.caratula.trim(),
    cliente: {
      nombre: datos.clienteNombre.trim(),
      registroFederalDeContribuyentes: limpiar(datos.registroFederalDeContribuyentes),
    },
    autoridad: datos.autoridad.trim(),
    tipoProcedimiento: datos.tipoProcedimiento.trim(),
    numeroCredito: limpiar(datos.numeroCredito),
    ejercicio: datos.ejercicio ?? null,
    monto:
      datos.monto === undefined
        ? null
        : { cantidad: datos.monto, moneda: (limpiar(datos.moneda) ?? 'MXN').toUpperCase() },
    responsable: datos.responsable.trim(),
    estado: 'nuevo',
    abiertoEn: limpiar(datos.abiertoEn) ?? fechaDeHoy(),
    cerradoEn: null,
    eventos: [],
    documentos: [],
    esEjemplo: false,
  };
  almacen().push(expediente);
  return expediente;
}

export interface NuevoEvento {
  tipo: TipoEvento;
  titulo: string;
  descripcion?: string | undefined;
  ocurridoEn: string;
  registradoPor?: string | undefined;
  disparaPlazo?: { reglaId: string; formaNotificacion: FormaNotificacion; descripcion: string } | undefined;
  suspension?: { hasta: string; motivo: string; fundamento: string } | undefined;
  cumplePlazoId?: string | undefined;
}

export type ResultadoEscritura<T> = { ok: true; valor: T } | { ok: false; motivo: string; detalles?: string[] };

export function agregarEvento(id: string, datos: NuevoEvento): ResultadoEscritura<EventoExpediente> {
  const expediente = obtenerExpediente(id);
  if (expediente === null) return { ok: false, motivo: `No existe el expediente "${id}".` };

  const evento: EventoExpediente = {
    id: identificador('ev'),
    tipo: datos.tipo,
    titulo: datos.titulo.trim(),
    descripcion: limpiar(datos.descripcion),
    ocurridoEn: datos.ocurridoEn,
    disparaPlazo: datos.disparaPlazo ?? null,
    suspension: datos.suspension ?? null,
    cumplePlazoId: limpiar(datos.cumplePlazoId),
    registradoPor: limpiar(datos.registradoPor),
  };
  expediente.eventos.push(evento);

  // Una notificacion que echa a andar un plazo mueve la etapa a "plazo
  // corriendo", porque un plazo vivo en un expediente que dice estar en otra
  // cosa es justo el silencio que hay que evitar. El movimiento lo autoriza la
  // maquina de estados paso a paso: si no hay camino valido, la etapa se queda
  // donde estaba y el evento se guarda igual. El expediente no salta etapas.
  if (evento.disparaPlazo !== null) avanzarHasta(expediente, 'plazo_corriendo', evento.ocurridoEn);

  return { ok: true, valor: evento };
}

/**
 * Camino mas corto entre dos etapas siguiendo solo transiciones declaradas
 * validas. Nunca pasa por "concluido": cerrar un asunto es una decision, no un
 * atajo. Devuelve una lista vacia cuando no hay camino.
 */
function caminoDeEstados(desde: EstadoExpediente, hacia: EstadoExpediente): EstadoExpediente[] {
  if (desde === hacia) return [];
  const previo = new Map<EstadoExpediente, EstadoExpediente>();
  const vistos = new Set<EstadoExpediente>([desde]);
  const cola: EstadoExpediente[] = [desde];

  while (cola.length > 0) {
    const actual = cola.shift() as EstadoExpediente;
    for (const siguiente of transicionesDesde(actual)) {
      if (vistos.has(siguiente)) continue;
      if (siguiente === 'concluido' && siguiente !== hacia) continue;
      vistos.add(siguiente);
      previo.set(siguiente, actual);
      if (siguiente === hacia) {
        const camino: EstadoExpediente[] = [siguiente];
        let cursor = siguiente;
        while (cursor !== desde) {
          cursor = previo.get(cursor) as EstadoExpediente;
          if (cursor !== desde) camino.unshift(cursor);
        }
        return camino;
      }
      cola.push(siguiente);
    }
  }
  return [];
}

function avanzarHasta(expediente: Expediente, hacia: EstadoExpediente, fecha: FechaISO): void {
  for (const etapa of caminoDeEstados(expediente.estado, hacia)) {
    const paso = cambiarEstado(expediente.estado, etapa, {
      fecha,
      eventoId: identificador('ev'),
      nota: 'Lo movio el registro de una notificacion que echa a andar un plazo.',
    });
    if (!paso.ok) return;
    expediente.estado = paso.estado;
    expediente.eventos.push(paso.evento);
  }
}

export interface CambioDeEstado {
  hacia: EstadoExpediente;
  fecha?: string | undefined;
  nota?: string | undefined;
  registradoPor?: string | undefined;
}

export function cambiarEstadoExpediente(
  id: string,
  datos: CambioDeEstado,
): ResultadoEscritura<Expediente> {
  const expediente = obtenerExpediente(id);
  if (expediente === null) return { ok: false, motivo: `No existe el expediente "${id}".` };

  const fecha = limpiar(datos.fecha) ?? fechaDeHoy();
  const nota = limpiar(datos.nota);
  const registradoPor = limpiar(datos.registradoPor);
  const paso = cambiarEstado(expediente.estado, datos.hacia, {
    fecha,
    eventoId: identificador('ev'),
    ...(nota !== null ? { nota } : {}),
    ...(registradoPor !== null ? { registradoPor } : {}),
  });

  if (!paso.ok) {
    return {
      ok: false,
      motivo: paso.motivo,
      detalles:
        paso.permitidas.length === 0
          ? ['Desde esta etapa no procede ninguna transicion.']
          : paso.permitidas.map((p) => `Procede pasar a "${p}".`),
    };
  }

  expediente.estado = paso.estado;
  expediente.eventos.push(paso.evento);
  if (paso.estado === 'concluido') expediente.cerradoEn = fecha;
  return { ok: true, valor: expediente };
}

/** Solo para pruebas manuales: devuelve el almacen a los datos de ejemplo. */
export function reiniciarAlmacen(): void {
  const ambito = globalThis as Ambito;
  ambito[CLAVE] = ejemplos();
}

/** Reexportado para que las pantallas no tengan que conocer el paquete del motor. */
export { sumarDias };
export type {
  Alerta,
  DocumentoExpediente,
  EstadoExpediente,
  EventoExpediente,
  Expediente,
  FechaClave,
  PlazoExpediente,
  RenglonLinea,
  TipoEvento,
};
