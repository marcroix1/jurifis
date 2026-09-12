/**
 * Guardian de citas. La pieza mas importante del modulo.
 *
 * Recibe cualquier texto y comprueba que cada criterio invocado exista en el
 * acervo y este verificado. Si uno solo falla, bloquea la salida completa.
 *
 * Tres decisiones que no se negocian:
 * 1. No corrige. Un registro digital equivocado no se sustituye por el parecido:
 *    se devuelve el incidente y el escrito no sale.
 * 2. Bloquea todo, no el renglon. Un escrito con una cita inventada no es un
 *    escrito con un error, es un escrito que no se puede presentar.
 * 3. Con el acervo vacio, toda cita es una cita bloqueada. Es el resultado
 *    correcto: hoy no hay ningun criterio verificado contra el cual contrastar.
 */
import { buscarPorClave, buscarPorRegistro, normalizarLlave } from './buscador.js';
import { CRITERIOS, resumenAcervo } from './registro.js';
import type {
  CitaDetectada,
  Criterio,
  IncidenteCita,
  OpcionesGuardia,
  RevisionCitas,
} from './tipos.js';

/** Frases con las que un escrito anuncia el registro digital de un criterio. */
const RE_FRASE_REGISTRO =
  /(?:registros?\s+digital(?:es)?|n[uú]meros?\s+de\s+registro(?:s)?(?:\s+digital(?:es)?)?|registros?\s+ius|reg\.?\s*digital(?:es)?|registros?)\s*(?:n[uú]m(?:ero|eros)?\.?)?\s*[:.]?/giu;

/** Conectores que pueden aparecer entre la frase y el numero, o entre numeros. */
const RE_CONECTOR = /^(?:[\s:;,.\-–—]|\by\b|\be\b|\bnum\.?\b|\bnumeros?\b)+/i;

const RE_NUMERO = /^(?:\d[\d.,]*\d|\d)/;

/**
 * Claves de control. Solo se reconocen formas inconfundibles, para que un texto
 * corriente no dispare el guardian por parecerse a una clave.
 */
const RE_CLAVES: readonly RegExp[] = [
  /\b(?:\d+a\.|P\.)\s*\/\s*J\.\s*\d+\/\d{2,4}(?:\s*\(\d+a\.\))?/g,
  /\bPC\.[A-Z0-9.]+\s*J\/\d+(?:\s*[A-Z]{1,2})?/g,
  /\b[IVX]{2,6}-[A-Z]{1,2}-[A-Za-z0-9]{1,4}-\d{1,5}\b/g,
];

/** Invocacion de un criterio acompañada de su rubro, con registro o sin el. */
const RE_MENCION =
  /\b(?:jurisprudencias?|tesis|precedentes?|criterios?)\b[^.]{0,150}?\b(?:de|cuyo|bajo\s+el|con\s+el)\s+rubro\b/gi;

/** Tramo largo en mayusculas, la forma tipica de un rubro transcrito. */
const RE_RUBRO_MAYUSCULAS = /[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9\s,.;:()"'«»-]{45,}/g;

function fragmentoDe(texto: string, desde: number, hasta: number): string {
  const a = Math.max(0, desde - 70);
  const b = Math.min(texto.length, hasta + 70);
  const prefijo = a > 0 ? '...' : '';
  const sufijo = b < texto.length ? '...' : '';
  return `${prefijo}${texto.slice(a, b).replace(/\s+/g, ' ').trim()}${sufijo}`;
}

/** Numeros que siguen a una frase de registro, incluida la lista separada por "y". */
function registrosTras(texto: string, inicio: number): CitaDetectada[] {
  const salida: CitaDetectada[] = [];
  let i = inicio;
  for (;;) {
    const conector = RE_CONECTOR.exec(texto.slice(i));
    if (conector !== null) i += conector[0].length;
    const numero = RE_NUMERO.exec(texto.slice(i));
    if (numero === null) break;
    const valor = numero[0];
    salida.push({
      clase: 'registro_digital',
      valor,
      desde: i,
      hasta: i + valor.length,
      fragmento: fragmentoDe(texto, i, i + valor.length),
    });
    i += valor.length;
    if (salida.length >= 20) break;
  }
  return salida;
}

/**
 * Extrae del texto todo lo que se comporta como cita: registros digitales,
 * claves de control y menciones de un criterio con su rubro.
 */
export function extraerCitas(texto: string, opciones: OpcionesGuardia = {}): CitaDetectada[] {
  const exigirEnMenciones = opciones.exigirRegistroEnMenciones ?? true;
  const rubrosEnMayusculas = opciones.detectarRubrosEnMayusculas ?? false;
  const citas: CitaDetectada[] = [];

  RE_FRASE_REGISTRO.lastIndex = 0;
  for (;;) {
    const m = RE_FRASE_REGISTRO.exec(texto);
    if (m === null) break;
    const numeros = registrosTras(texto, m.index + m[0].length);
    for (const n of numeros) citas.push(n);
    if (numeros.length > 0) {
      const ultimo = numeros[numeros.length - 1];
      if (ultimo !== undefined) RE_FRASE_REGISTRO.lastIndex = ultimo.hasta;
    }
  }

  for (const re of RE_CLAVES) {
    re.lastIndex = 0;
    for (;;) {
      const m = re.exec(texto);
      if (m === null) break;
      const valor = m[0].trim();
      const desde = m.index;
      citas.push({
        clase: 'clave_control',
        valor,
        desde,
        hasta: desde + valor.length,
        fragmento: fragmentoDe(texto, desde, desde + valor.length),
      });
    }
  }

  if (exigirEnMenciones) {
    RE_MENCION.lastIndex = 0;
    for (;;) {
      const m = RE_MENCION.exec(texto);
      if (m === null) break;
      citas.push({
        clase: 'mencion_sin_registro',
        valor: m[0].replace(/\s+/g, ' ').trim(),
        desde: m.index,
        hasta: m.index + m[0].length,
        fragmento: fragmentoDe(texto, m.index, m.index + m[0].length),
      });
    }
  }

  if (rubrosEnMayusculas) {
    RE_RUBRO_MAYUSCULAS.lastIndex = 0;
    for (;;) {
      const m = RE_RUBRO_MAYUSCULAS.exec(texto);
      if (m === null) break;
      const valor = m[0].trim();
      citas.push({
        clase: 'mencion_sin_registro',
        valor: valor.replace(/\s+/g, ' '),
        desde: m.index,
        hasta: m.index + valor.length,
        fragmento: fragmentoDe(texto, m.index, m.index + valor.length),
      });
    }
  }

  return citas.sort((a, b) => a.desde - b.desde);
}

const REMEDIO_CARGA =
  'Cargar el criterio por las cuatro etapas de ingesta, con revision humana, y volver a pasar el escrito por el guardian. Nunca cambiar el numero para que cuadre.';

function incidenteRegistro(cita: CitaDetectada, criterio: Criterio | null): IncidenteCita | null {
  if (criterio === null) {
    return {
      clase: 'registro_inexistente',
      cita,
      motivo:
        CRITERIOS.length === 0
          ? `Se cita el registro digital ${cita.valor} y el acervo no tiene ningun criterio cargado, asi que no hay nada contra que verificarlo.`
          : `El registro digital ${cita.valor} no existe en el acervo.`,
      remedio: REMEDIO_CARGA,
    };
  }
  if (!criterio.verificado) {
    return {
      clase: 'criterio_sin_verificar',
      cita,
      motivo: `El criterio con registro digital ${cita.valor} esta en el acervo pero no paso la revision humana.`,
      remedio:
        'Completar la etapa tres de la ingesta: una persona lee el criterio contra el documento oficial y firma la revision.',
    };
  }
  return null;
}

/**
 * Revisa las citas de un texto contra el acervo. Devuelve el texto intacto solo
 * cuando no hay un solo incidente.
 */
export function revisarCitas(texto: string, opciones: OpcionesGuardia = {}): RevisionCitas {
  const citas = extraerCitas(texto, opciones);
  const incidentes: IncidenteCita[] = [];
  const conRegistro = citas.filter((c) => c.clase === 'registro_digital');

  for (const cita of citas) {
    if (cita.clase === 'registro_digital') {
      const incidente = incidenteRegistro(cita, buscarPorRegistro(cita.valor));
      if (incidente !== null) incidentes.push(incidente);
      continue;
    }

    if (cita.clase === 'clave_control') {
      const criterio = buscarPorClave(cita.valor);
      if (criterio === null) {
        incidentes.push({
          clase: 'clave_inexistente',
          cita,
          motivo:
            CRITERIOS.length === 0
              ? `Se cita la clave ${cita.valor} y el acervo no tiene ningun criterio cargado, asi que no hay nada contra que verificarla.`
              : `La clave ${cita.valor} no existe en el acervo.`,
          remedio: REMEDIO_CARGA,
        });
      } else if (!criterio.verificado) {
        incidentes.push({
          clase: 'criterio_sin_verificar',
          cita,
          motivo: `El criterio con clave ${cita.valor} esta en el acervo pero no paso la revision humana.`,
          remedio:
            'Completar la etapa tres de la ingesta: una persona lee el criterio contra el documento oficial y firma la revision.',
        });
      }
      continue;
    }

    // Mencion de un criterio con su rubro. Si el propio pasaje trae registro
    // digital, ese registro ya se reviso y no se cuenta dos veces.
    const acompañada = conRegistro.some((r) => r.desde >= cita.desde && r.desde <= cita.hasta + 300);
    if (!acompañada) {
      incidentes.push({
        clase: 'cita_sin_registro',
        cita,
        motivo:
          'Se invoca un criterio con su rubro y sin registro digital que permita ubicarlo en el acervo.',
        remedio:
          'Agregar el registro digital del criterio y cargarlo al acervo, o retirar la invocacion del escrito.',
      });
    }
  }

  const bloqueada = incidentes.length > 0;
  const resumen = bloqueada
    ? `Salida bloqueada. ${incidentes.length} ${incidentes.length === 1 ? 'cita no se pudo verificar' : 'citas no se pudieron verificar'} contra el acervo, que hoy tiene ${CRITERIOS.length} criterios cargados.`
    : citas.length === 0
      ? 'El texto no invoca ningun criterio. No hay nada que verificar.'
      : `Las ${citas.length} citas del texto existen en el acervo y estan verificadas.`;

  return {
    bloqueada,
    salida: bloqueada ? null : texto,
    citas,
    incidentes,
    resumen,
    acervo: resumenAcervo(),
  };
}

export class CitasBloqueadas extends Error {
  readonly incidentes: IncidenteCita[];
  readonly revision: RevisionCitas;
  constructor(revision: RevisionCitas) {
    const detalle = revision.incidentes.map((i) => `${i.cita.valor}: ${i.motivo}`).join('\n- ');
    super(`Salida bloqueada por el guardian de citas:\n- ${detalle}`);
    this.name = 'CitasBloqueadas';
    this.incidentes = revision.incidentes;
    this.revision = revision;
  }
}

/**
 * Version dura para tuberias: devuelve el texto o falla. Util cuando el escrito
 * va a salir del proceso y no hay nadie mirando el resultado de la revision.
 */
export function exigirCitasVerificadas(texto: string, opciones: OpcionesGuardia = {}): string {
  const revision = revisarCitas(texto, opciones);
  if (revision.bloqueada) throw new CitasBloqueadas(revision);
  return texto;
}

/** Registros digitales citados en un texto, sin repetir y ya normalizados. */
export function registrosCitados(texto: string): string[] {
  const vistos = new Set<string>();
  for (const c of extraerCitas(texto, { exigirRegistroEnMenciones: false })) {
    if (c.clase === 'registro_digital') vistos.add(normalizarLlave(c.valor));
  }
  return [...vistos];
}
