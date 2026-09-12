/**
 * Motor del arbol de decision del cuestionario.
 *
 * Puro: no lee disco, no lee reloj, no imprime. Recibe el cuestionario y las respuestas
 * capturadas y devuelve la siguiente pregunta o, si ya no falta ninguna, el diagnostico.
 *
 * El orden de las preguntas lo fija el dato, no el codigo. Una pregunta se hace cuando
 * su condicion se cumple con las respuestas previas y todavia no tiene respuesta.
 */
import { FechaInvalida, aDias } from '../fecha.js';
import { armarDiagnostico } from './resultado.js';
import type {
  Condicion, Cuestionario, OpcionesDiagnostico, Paso, Pregunta, Respuesta, Respuestas,
} from './tipos.js';

export class RespuestaInvalida extends Error {
  readonly errores: string[];
  constructor(errores: string[]) {
    super(`El cuestionario no acepta las respuestas recibidas: ${errores.join(' ')}`);
    this.name = 'RespuestaInvalida';
    this.errores = errores;
  }
}

export class CuestionarioInvalido extends Error {
  readonly errores: string[];
  constructor(errores: string[]) {
    super(`El cuestionario esta mal formado: ${errores.join(' ')}`);
    this.name = 'CuestionarioInvalido';
    this.errores = errores;
  }
}

/** Respuesta util es la que aporta un dato. "No lo se" no lo es. */
function util(r: Respuesta | undefined): boolean {
  return r !== undefined && r.tipo !== 'no_se';
}

/**
 * Evalua una condicion de ramificacion contra lo ya respondido. Una condicion que
 * mira una pregunta sin responder se evalua como falsa, de modo que la rama no se
 * abre antes de tiempo.
 */
export function evaluarCondicion(condicion: Condicion, respuestas: Respuestas): boolean {
  switch (condicion.operador) {
    case 'siempre':
      return true;
    case 'igual': {
      const r = respuestas[condicion.pregunta];
      return r !== undefined && r.tipo === 'opcion_unica' && r.valor === condicion.valor;
    }
    case 'en': {
      const r = respuestas[condicion.pregunta];
      return r !== undefined && r.tipo === 'opcion_unica' && condicion.valores.includes(r.valor);
    }
    case 'contiene': {
      const r = respuestas[condicion.pregunta];
      return r !== undefined && r.tipo === 'opcion_multiple' && r.valores.includes(condicion.valor);
    }
    case 'respondida':
      return util(respuestas[condicion.pregunta]);
    case 'no_se':
      return !util(respuestas[condicion.pregunta]);
    case 'y':
      return condicion.condiciones.every((c) => evaluarCondicion(c, respuestas));
    case 'o':
      return condicion.condiciones.some((c) => evaluarCondicion(c, respuestas));
    case 'no':
      return !evaluarCondicion(condicion.condicion, respuestas);
  }
}

/** Preguntas que tocan con las respuestas actuales, en el orden del cuestionario. */
export function preguntasAplicables(cuestionario: Cuestionario, respuestas: Respuestas): Pregunta[] {
  return cuestionario.preguntas.filter(
    (p) => p.condicion === undefined || evaluarCondicion(p.condicion, respuestas),
  );
}

/** Errores de una respuesta frente a su pregunta. Vacio significa que es aceptable. */
export function validarRespuesta(pregunta: Pregunta, respuesta: Respuesta): string[] {
  const errores: string[] = [];
  const donde = `En la pregunta "${pregunta.id}":`;

  if (respuesta.tipo === 'no_se') {
    if (pregunta.permiteNoSe !== true) {
      errores.push(`${donde} no admite la respuesta "no lo se".`);
    }
    return errores;
  }

  if (respuesta.tipo !== pregunta.tipo) {
    errores.push(`${donde} se esperaba una respuesta de tipo ${pregunta.tipo} y llego una de tipo ${respuesta.tipo}.`);
    return errores;
  }

  const valores = (pregunta.opciones ?? []).map((o) => o.valor);

  if (respuesta.tipo === 'opcion_unica') {
    if (!valores.includes(respuesta.valor)) {
      errores.push(`${donde} la opcion "${respuesta.valor}" no existe en el cuestionario.`);
    }
  } else if (respuesta.tipo === 'opcion_multiple') {
    if (respuesta.valores.length === 0) {
      errores.push(`${donde} se recibio una seleccion vacia; para no responder existe "no lo se".`);
    }
    if (new Set(respuesta.valores).size !== respuesta.valores.length) {
      errores.push(`${donde} la seleccion trae valores repetidos.`);
    }
    for (const v of respuesta.valores) {
      if (!valores.includes(v)) errores.push(`${donde} la opcion "${v}" no existe en el cuestionario.`);
    }
  } else if (respuesta.tipo === 'fecha') {
    try {
      aDias(respuesta.valor);
    } catch (e) {
      if (e instanceof FechaInvalida) errores.push(`${donde} ${e.message}`);
      else throw e;
    }
  } else {
    if (!Number.isFinite(respuesta.valor)) {
      errores.push(`${donde} el monto no es un numero finito.`);
    } else if (respuesta.valor < 0) {
      errores.push(`${donde} el monto no puede ser negativo.`);
    }
  }

  return errores;
}

/**
 * Revisa que el cuestionario sea recorrible: identificadores unicos, opciones donde
 * hacen falta, y condiciones que solo miren hacia atras. Un cuestionario que se mira
 * a si mismo o hacia adelante puede dejar preguntas que nunca se hacen.
 */
export function validarCuestionario(cuestionario: Cuestionario): string[] {
  const errores: string[] = [];
  const vistas = new Set<string>();

  for (const p of cuestionario.preguntas) {
    const donde = `La pregunta "${p.id}"`;
    if (vistas.has(p.id)) errores.push(`${donde} esta repetida.`);

    const tieneOpciones = (p.opciones ?? []).length > 0;
    if ((p.tipo === 'opcion_unica' || p.tipo === 'opcion_multiple') && !tieneOpciones) {
      errores.push(`${donde} es de opciones y no trae ninguna.`);
    }
    if ((p.tipo === 'fecha' || p.tipo === 'monto') && tieneOpciones) {
      errores.push(`${donde} no es de opciones y sin embargo trae opciones.`);
    }
    const valores = (p.opciones ?? []).map((o) => o.valor);
    if (new Set(valores).size !== valores.length) errores.push(`${donde} tiene valores de opcion repetidos.`);

    if (p.condicion !== undefined) {
      for (const ref of referencias(p.condicion)) {
        if (ref === p.id) errores.push(`${donde} se condiciona a si misma.`);
        else if (!vistas.has(ref)) errores.push(`${donde} se condiciona a "${ref}", que no aparece antes que ella.`);
      }
    }
    vistas.add(p.id);
  }

  return errores;
}

function referencias(condicion: Condicion): string[] {
  switch (condicion.operador) {
    case 'siempre':
      return [];
    case 'y':
    case 'o':
      return condicion.condiciones.flatMap(referencias);
    case 'no':
      return referencias(condicion.condicion);
    default:
      return [condicion.pregunta];
  }
}

/**
 * Una vuelta del arbol. Devuelve la siguiente pregunta pendiente o, si ya no queda
 * ninguna que aplique, el diagnostico preliminar.
 *
 * Las respuestas que quedaron colgadas de una rama que ya no aplica no se borran ni se
 * usan: el diagnostico solo mira los hechos cuya rama sigue viva.
 */
export function avanzar(
  cuestionario: Cuestionario,
  respuestas: Respuestas,
  opciones: OpcionesDiagnostico = {},
): Paso {
  const errores: string[] = [];
  for (const [id, respuesta] of Object.entries(respuestas)) {
    const pregunta = cuestionario.preguntas.find((p) => p.id === id);
    if (pregunta === undefined) {
      errores.push(`La pregunta "${id}" no existe en el cuestionario.`);
      continue;
    }
    errores.push(...validarRespuesta(pregunta, respuesta));
  }
  if (errores.length > 0) throw new RespuestaInvalida(errores);

  const aplicables = preguntasAplicables(cuestionario, respuestas);
  const pendientes = aplicables.filter((p) => respuestas[p.id] === undefined);

  const primera = pendientes[0];
  if (primera !== undefined) {
    return {
      estado: 'pregunta',
      pregunta: primera,
      respondidas: aplicables.length - pendientes.length,
      aplicables: aplicables.length,
    };
  }

  return { estado: 'diagnostico', diagnostico: armarDiagnostico(cuestionario, respuestas, opciones) };
}

/** Atajo para quien solo quiere saber que preguntar enseguida. */
export function siguientePregunta(
  cuestionario: Cuestionario,
  respuestas: Respuestas,
): Pregunta | null {
  const aplicables = preguntasAplicables(cuestionario, respuestas);
  return aplicables.find((p) => respuestas[p.id] === undefined) ?? null;
}
