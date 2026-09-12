export * from './fecha.js';
export * from './tipos.js';
export { Almanaque } from './calendario.js';
export { calcularPlazo } from './motor.js';
export * from './diagnostico/index.js';
export { REGLAS, CALENDARIOS, buscarRegla, almanaqueDe, ReglaDesconocida, CalendarioFaltante } from './registro.js';

import { calcularPlazo } from './motor.js';
import { almanaqueDe, buscarRegla, CalendarioFaltante } from './registro.js';
import type { EntradaComputo, ResultadoComputo } from './tipos.js';

/**
 * Punto de entrada unico. Resuelve la regla y sus calendarios contra el corpus
 * y calcula. Si el corpus no tiene el calendario que la regla exige, devuelve
 * confianza insuficiente en lugar de fallar de forma ruidosa hacia afuera.
 */
export function calcular(entrada: EntradaComputo): ResultadoComputo {
  const regla = buscarRegla(entrada.reglaId);
  try {
    return calcularPlazo(entrada, regla, almanaqueDe(regla));
  } catch (e) {
    if (e instanceof CalendarioFaltante) {
      return {
        confianza: 'insuficiente',
        vence: null,
        surteEfectos: null,
        inicioComputo: null,
        diasTranscurridos: null,
        diasRestantes: null,
        inhabilesAplicados: [],
        traza: [{
          paso: 1,
          concepto: 'cobertura del calendario',
          detalle: `La regla ${regla.id} exige calendarios que el corpus no tiene.`,
          fundamento: regla.fundamento,
        }],
        fuentes: [regla.fundamento],
        faltantes: e.ids.map((id) => `Calendario de dias inhabiles "${id}", sin cargar en el corpus.`),
        advertencias: ['Este computo no sustituye la verificacion del abogado responsable ni constituye computo oficial.'],
      };
    }
    throw e;
  }
}
export * as jurisprudencia from './jurisprudencia/index.js';
export * as credito from './credito/index.js';
