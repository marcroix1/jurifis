/**
 * Aritmetica de fechas civiles sin el objeto Date nativo.
 *
 * Motivo: en este producto un dia de diferencia es un plazo perdido. El objeto Date
 * arrastra hora, zona horaria y horario de verano, y es la causa clasica del error de
 * un dia. Aqui una fecha es un entero de dias desde 1970-01-01 y nada mas.
 *
 * Algoritmos de conversion: Howard Hinnant, days_from_civil / civil_from_days.
 */

/** Fecha civil en formato AAAA-MM-DD. Sin hora, sin zona. */
export type FechaISO = string;

/** Dia de la semana en norma ISO 8601: 1 lunes ... 7 domingo. */
export type DiaSemana = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const RE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export class FechaInvalida extends Error {
  constructor(valor: string) {
    super(`Fecha invalida: "${valor}". Se espera AAAA-MM-DD.`);
    this.name = 'FechaInvalida';
  }
}

function partes(f: FechaISO): [number, number, number] {
  const m = RE_ISO.exec(f);
  if (!m) throw new FechaInvalida(f);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12) throw new FechaInvalida(f);
  if (d < 1 || d > diasDelMes(y, mo)) throw new FechaInvalida(f);
  return [y, mo, d];
}

export function esBisiesto(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function diasDelMes(y: number, m: number): number {
  const largos = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m === 2 && esBisiesto(y)) return 29;
  return largos[m - 1] ?? 0;
}

/** Dias transcurridos desde 1970-01-01. Negativo antes de esa fecha. */
export function aDias(f: FechaISO): number {
  const [y0, m, d] = partes(f);
  const y = y0 - (m <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inversa de aDias. */
export function aFecha(dias: number): FechaISO {
  const z = dias + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y0 = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  const y = y0 + (m <= 2 ? 1 : 0);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function sumarDias(f: FechaISO, n: number): FechaISO {
  return aFecha(aDias(f) + n);
}

export function diaSemana(f: FechaISO): DiaSemana {
  // 1970-01-01 fue jueves, es decir 4 en norma ISO.
  const n = ((aDias(f) + 3) % 7 + 7) % 7;
  return (n + 1) as DiaSemana;
}

export function esFinDeSemana(f: FechaISO): boolean {
  const d = diaSemana(f);
  return d === 6 || d === 7;
}

export function anio(f: FechaISO): number {
  return partes(f)[0];
}

export function comparar(a: FechaISO, b: FechaISO): number {
  return aDias(a) - aDias(b);
}

/**
 * Suma meses de calendario. Si el dia no existe en el mes destino, devuelve el
 * ultimo dia de ese mes y lo declara, para que el motor aplique la regla del
 * ordenamiento en lugar de decidirlo aqui.
 */
export function sumarMeses(f: FechaISO, n: number): { fecha: FechaISO; diaInexistente: boolean } {
  const [y, m, d] = partes(f);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12 + 12) % 12 + 1;
  const tope = diasDelMes(ny, nm);
  const nd = Math.min(d, tope);
  const iso = `${String(ny).padStart(4, '0')}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
  return { fecha: iso, diaInexistente: nd !== d };
}

export function sumarAnios(f: FechaISO, n: number): { fecha: FechaISO; diaInexistente: boolean } {
  return sumarMeses(f, n * 12);
}

const NOMBRES: Record<DiaSemana, string> = {
  1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado', 7: 'domingo',
};

export function nombreDiaSemana(f: FechaISO): string {
  return NOMBRES[diaSemana(f)];
}
