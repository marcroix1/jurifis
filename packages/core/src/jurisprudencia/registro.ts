/**
 * Registro del acervo. Unico lugar del modulo que conoce el archivo de datos.
 *
 * El acervo se valida al cargarse y falla de forma ruidosa: un criterio sin
 * revision humana, con huella que no cuadra o con registro digital repetido
 * impide que el modulo arranque. Es preferible que el buscador no exista a que
 * exista con un renglon que nadie verifico.
 *
 * Hoy el arreglo de criterios esta vacio, y eso no es un pendiente del archivo:
 * es el estado real del acervo, declarado.
 */
import { aDias } from '../fecha.js';
import { huellaDeCriterio } from './huella.js';
import { esTipoCriterio } from './tipo-criterio.js';
import { TIPOS_CRITERIO } from './tipos.js';
import type {
  Acervo,
  Criterio,
  EstadoAcervo,
  FacetasAcervo,
  ResumenAcervo,
  TipoCriterio,
} from './tipos.js';

import archivo from '../../datos/jurisprudencia/acervo.json' with { type: 'json' };

export class AcervoInvalido extends Error {
  readonly errores: string[];
  constructor(errores: string[]) {
    super(`El acervo de criterios no es valido:\n- ${errores.join('\n- ')}`);
    this.name = 'AcervoInvalido';
    this.errores = errores;
  }
}

function esFecha(valor: unknown): boolean {
  if (typeof valor !== 'string') return false;
  try {
    aDias(valor);
    return true;
  } catch {
    return false;
  }
}

function textoUtil(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim() !== '';
}

/**
 * Revisa la forma del acervo y devuelve la lista de errores. No corrige nada:
 * el archivo se arregla a mano, con el documento oficial enfrente.
 */
export function validarAcervo(datos: unknown): string[] {
  const errores: string[] = [];
  if (typeof datos !== 'object' || datos === null) return ['El acervo no es un objeto.'];
  const a = datos as Partial<Acervo>;

  if (typeof a.esquema !== 'number' || !Number.isInteger(a.esquema) || a.esquema < 1) {
    errores.push('El campo esquema debe ser un entero mayor que cero.');
  }
  if (!textoUtil(a.version)) errores.push('El campo version no puede ir vacio.');
  if (!esFecha(a.actualizadoEl)) errores.push('El campo actualizadoEl debe ser una fecha AAAA-MM-DD.');
  if (!Array.isArray(a.requisitosDeCarga) || a.requisitosDeCarga.length === 0) {
    errores.push('El acervo debe declarar los requisitos para cargar un criterio.');
  }
  if (!Array.isArray(a.notas)) errores.push('El campo notas debe ser un arreglo.');

  const claves = new Set<string>();
  if (!Array.isArray(a.origenes) || a.origenes.length === 0) {
    errores.push('El acervo debe declarar al menos un origen oficial.');
  } else {
    for (const [i, o] of a.origenes.entries()) {
      if (!textoUtil(o.clave)) errores.push(`Origen ${i}: la clave no puede ir vacia.`);
      else if (claves.has(o.clave)) errores.push(`Origen ${i}: la clave "${o.clave}" esta repetida.`);
      else claves.add(o.clave);
      if (!textoUtil(o.nombre)) errores.push(`Origen ${i}: el nombre no puede ir vacio.`);
      if (!textoUtil(o.aporta)) errores.push(`Origen ${i}: falta declarar que aporta.`);
      if (o.direccion !== null && !textoUtil(o.direccion)) {
        errores.push(`Origen ${i}: la direccion va con contenido o en nulo, nunca vacia.`);
      }
    }
  }

  if (!Array.isArray(a.criterios)) {
    errores.push('El campo criterios debe ser un arreglo, aunque vaya vacio.');
    return errores;
  }

  const ids = new Set<string>();
  const registros = new Set<string>();
  for (const [i, c] of a.criterios.entries()) {
    const ref = `Criterio ${i}`;
    if (!textoUtil(c.id)) errores.push(`${ref}: el identificador no puede ir vacio.`);
    else if (ids.has(c.id)) errores.push(`${ref}: el identificador "${c.id}" esta repetido.`);
    else ids.add(c.id);

    if (!esTipoCriterio(c.tipoCriterio)) {
      errores.push(`${ref}: tipo fuera de la enumeracion. Admitidos: ${TIPOS_CRITERIO.join(', ')}.`);
    }
    if (!textoUtil(c.rubro)) errores.push(`${ref}: el rubro no puede ir vacio.`);
    if (!textoUtil(c.texto)) errores.push(`${ref}: el texto no puede ir vacio.`);
    if (!textoUtil(c.origen)) errores.push(`${ref}: falta el origen oficial.`);
    else if (claves.size > 0 && !claves.has(c.origen)) {
      errores.push(`${ref}: el origen "${c.origen}" no esta declarado en el acervo.`);
    }
    if (!textoUtil(c.documento)) errores.push(`${ref}: falta el documento del que se tomo.`);
    if (!esFecha(c.consultadoEl)) errores.push(`${ref}: consultadoEl debe ser una fecha AAAA-MM-DD.`);
    if (c.nivelFuente !== 'A' && c.nivelFuente !== 'B') {
      errores.push(`${ref}: el nivel de fuente solo puede ser A o B.`);
    }
    if (c.fechaPublicacion !== null && !esFecha(c.fechaPublicacion)) {
      errores.push(`${ref}: fechaPublicacion debe ser una fecha AAAA-MM-DD o nulo.`);
    }

    // El candado de la etapa tres: al acervo solo llega lo que una persona reviso.
    if (c.verificado !== true) {
      errores.push(`${ref}: no puede vivir en el acervo con verificado en falso.`);
    }
    if (!textoUtil(c.revisadoPor)) {
      errores.push(`${ref}: falta revisadoPor. La revision humana no se puede saltar.`);
    }
    if (!esFecha(c.revisadoEl)) {
      errores.push(`${ref}: falta revisadoEl o no es una fecha AAAA-MM-DD.`);
    }
    if (typeof c.version !== 'number' || !Number.isInteger(c.version) || c.version < 1) {
      errores.push(`${ref}: la version publicada debe ser un entero mayor que cero.`);
    }
    if (!esFecha(c.publicadoEl)) {
      errores.push(`${ref}: publicadoEl debe ser una fecha AAAA-MM-DD.`);
    }

    if (typeof c.registroDigital === 'string' && c.registroDigital !== '') {
      if (registros.has(c.registroDigital)) {
        errores.push(`${ref}: el registro digital "${c.registroDigital}" esta repetido.`);
      } else registros.add(c.registroDigital);
    } else if (c.registroDigital !== null) {
      errores.push(`${ref}: el registro digital va con contenido o en nulo, nunca vacio.`);
    }

    if (!textoUtil(c.huella)) {
      errores.push(`${ref}: falta la huella del contenido.`);
    } else if (esTipoCriterio(c.tipoCriterio)) {
      const esperada = huellaDeCriterio(c);
      if (esperada !== c.huella) {
        errores.push(
          `${ref}: la huella no corresponde al contenido. El texto cambio despues de la revision de ${String(c.revisadoPor)}.`,
        );
      }
    }
  }

  return errores;
}

const errores = validarAcervo(archivo);
if (errores.length > 0) throw new AcervoInvalido(errores);

export const ACERVO: Acervo = archivo as unknown as Acervo;

/** Criterios publicados. Hoy, ninguno. */
export const CRITERIOS: readonly Criterio[] = ACERVO.criterios;

function unicos(valores: (string | null)[]): string[] {
  const vistos = new Set<string>();
  for (const v of valores) if (v !== null && v.trim() !== '') vistos.add(v);
  return [...vistos].sort((a, b) => a.localeCompare(b, 'es'));
}

export function facetas(): FacetasAcervo {
  const tipos = new Set<TipoCriterio>();
  for (const c of CRITERIOS) tipos.add(c.tipoCriterio);
  return {
    tipos: TIPOS_CRITERIO.filter((t) => tipos.has(t)),
    organos: unicos(CRITERIOS.map((c) => c.organo)),
    epocas: unicos(CRITERIOS.map((c) => c.epoca)),
    materias: unicos(CRITERIOS.map((c) => c.materia)),
  };
}

export function acervoVacio(): boolean {
  return CRITERIOS.length === 0;
}

export function resumenAcervo(): ResumenAcervo {
  return {
    vacio: acervoVacio(),
    criteriosCargados: CRITERIOS.length,
    version: ACERVO.version,
  };
}

/** Todo lo que la interfaz necesita para decir la verdad sobre el acervo. */
export function estadoAcervo(): EstadoAcervo {
  return {
    vacio: acervoVacio(),
    criteriosCargados: CRITERIOS.length,
    criteriosVerificados: CRITERIOS.filter((c) => c.verificado).length,
    version: ACERVO.version,
    esquema: ACERVO.esquema,
    actualizadoEl: ACERVO.actualizadoEl,
    origenes: ACERVO.origenes.map((o) => ({ ...o })),
    requisitosDeCarga: [...ACERVO.requisitosDeCarga],
    notas: [...ACERVO.notas],
    facetas: facetas(),
  };
}

export function origenDeclarado(clave: string): boolean {
  return ACERVO.origenes.some((o) => o.clave === clave);
}

export function origenesDeclarados(): string[] {
  return ACERVO.origenes.map((o) => o.clave);
}
