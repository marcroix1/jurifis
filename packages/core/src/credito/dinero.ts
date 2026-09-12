import type { Centavos } from './tipos.js';

/**
 * Dinero en centavos enteros.
 *
 * Motivo: el mismo que llevo a proscribir el objeto Date en el motor de plazos. Un
 * importe en pesos con decimales flotantes derrapa de a un centavo por operacion y la
 * diferencia aparece justo donde no se puede explicar. Aqui todo importe es un entero
 * de centavos y cada redondeo esta escrito.
 */

export class ImporteInvalido extends Error {
  constructor(valor: string) {
    super(`Importe invalido: "${valor}". Se espera una cantidad en pesos con hasta dos decimales.`);
    this.name = 'ImporteInvalido';
  }
}

const RE_PESOS = /^(-)?(\d{1,15})(?:\.(\d{1,2}))?$/;

/**
 * Convierte una cantidad escrita en pesos a centavos, sin pasar por flotantes.
 *
 * Se recibe texto a proposito: "1234.56" multiplicado por cien en punto flotante puede
 * dar 123455.99999999999, y ese centavo perdido es el que despues no cuadra.
 */
export function aCentavos(pesos: string): Centavos {
  const limpio = pesos.trim().replace(/[\s,$]/g, '');
  const m = RE_PESOS.exec(limpio);
  if (m === null) throw new ImporteInvalido(pesos);
  const entero = m[2] ?? '0';
  const decimal = (m[3] ?? '').padEnd(2, '0');
  const total = Number(entero) * 100 + Number(decimal);
  if (!Number.isSafeInteger(total)) throw new ImporteInvalido(pesos);
  return m[1] === '-' ? -total : total;
}

/** Redondeo a centavo entero, medio hacia arriba en valor absoluto. Se declara en la traza. */
export function redondearCentavos(valor: number): Centavos {
  if (!Number.isFinite(valor)) throw new ImporteInvalido(String(valor));
  const signo = valor < 0 ? -1 : 1;
  return signo * Math.round(Math.abs(valor));
}

/**
 * Formato de lectura, "$1,234.56". Se arma a mano para que la traza sea identica en
 * cualquier maquina, sin depender de la configuracion regional del entorno.
 */
export function pesos(centavos: Centavos): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const enteros = Math.floor(abs / 100);
  const resto = abs % 100;
  const conSeparador = String(enteros).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negativo ? '-' : ''}$${conSeparador}.${String(resto).padStart(2, '0')}`;
}

/** Suma que nunca se sale del entero seguro sin decirlo. */
export function sumar(...importes: Centavos[]): Centavos {
  let total = 0;
  for (const i of importes) total += i;
  if (!Number.isSafeInteger(total)) throw new ImporteInvalido(String(total));
  return total;
}
