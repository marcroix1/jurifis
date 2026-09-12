import { aDias, sumarMeses, type FechaISO } from '../fecha.js';
import type { MesISO } from './tipos.js';

/**
 * Aritmetica de meses civiles, sin el objeto Date y sobre la misma base que fecha.ts.
 *
 * La actualizacion del articulo 17-A del Codigo Fiscal de la Federacion no corre por
 * fracciones de mes: razona en meses completos, y por eso el mes es aqui un tipo propio
 * y no un pedazo de cadena que cada funcion recorta a su manera.
 */

const RE_MES = /^(\d{4})-(\d{2})$/;

export class MesInvalido extends Error {
  constructor(valor: string) {
    super(`Mes invalido: "${valor}". Se espera AAAA-MM.`);
    this.name = 'MesInvalido';
  }
}

/** Meses transcurridos desde el ano cero. Entero para poder comparar y sumar. */
export function aOrdinal(mes: MesISO): number {
  const m = RE_MES.exec(mes);
  if (m === null) throw new MesInvalido(mes);
  const anio = Number(m[1]);
  const numero = Number(m[2]);
  if (numero < 1 || numero > 12) throw new MesInvalido(mes);
  return anio * 12 + (numero - 1);
}

export function aMes(ordinal: number): MesISO {
  const anio = Math.floor(ordinal / 12);
  const numero = ((ordinal % 12) + 12) % 12 + 1;
  return `${String(anio).padStart(4, '0')}-${String(numero).padStart(2, '0')}`;
}

/** Mes al que pertenece una fecha civil. */
export function mesDe(fecha: FechaISO): MesISO {
  // Se valida la fecha completa antes de recortarla, para no aceptar un 2026-13-01.
  aDias(fecha);
  return fecha.slice(0, 7);
}

export function mesAnterior(mes: MesISO): MesISO {
  return aMes(aOrdinal(mes) - 1);
}

export function anioDelMes(mes: MesISO): number {
  const m = RE_MES.exec(mes);
  if (m === null) throw new MesInvalido(mes);
  return Number(m[1]);
}

const NOMBRES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Nombre del mes para la traza, "agosto de 2026". Sin siglas y sin abreviar. */
export function nombreMes(mes: MesISO): string {
  const m = RE_MES.exec(mes);
  if (m === null) throw new MesInvalido(mes);
  const nombre = NOMBRES[Number(m[2]) - 1];
  if (nombre === undefined) throw new MesInvalido(mes);
  return `${nombre} de ${m[1]}`;
}

/**
 * Meses o fraccion de mes transcurridos entre dos fechas, en el sentido del sexto
 * parrafo del articulo 21 del Codigo Fiscal de la Federacion: los recargos se causan
 * por cada mes o fraccion desde el dia en que debio hacerse el pago y hasta que se
 * efectue. Un solo dia de retraso ya es un mes.
 */
export function mesesOFraccion(desde: FechaISO, hasta: FechaISO): number {
  if (aDias(hasta) <= aDias(desde)) return 0;
  for (let n = 1; n <= 2400; n++) {
    if (aDias(sumarMeses(desde, n).fecha) >= aDias(hasta)) return n;
  }
  throw new Error(
    `Periodo desbocado entre ${desde} y ${hasta}: mas de doscientos anios. Revisa las fechas de la entrada.`,
  );
}
