/**
 * Registro del corpus. Unico lugar donde el codigo conoce el derecho, y solo
 * como dato: aqui no se decide nada, se carga lo que el acervo ya verifico.
 */
import { Almanaque } from './calendario.js';
import type { Calendario, ReglaPlazo } from './tipos.js';

import calTfja from '../datos/calendarios/tfja-2026.json' with { type: 'json' };
import calSat from '../datos/calendarios/sat-2026.json' with { type: 'json' };
import calCff from '../datos/calendarios/cff-12-2026.json' with { type: 'json' };
import calAmparo from '../datos/calendarios/amparo-19-2026.json' with { type: 'json' };
import calLfpa from '../datos/calendarios/lfpa-28-2026.json' with { type: 'json' };

import rLfpca13 from '../datos/reglas/lfpca-13-I-a.json' with { type: 'json' };
import rLfpca17 from '../datos/reglas/lfpca-17.json' with { type: 'json' };
import rLfpca19 from '../datos/reglas/lfpca-19.json' with { type: 'json' };
import rCff121 from '../datos/reglas/cff-121.json' with { type: 'json' };
import rLa150 from '../datos/reglas/ley-aduanera-150.json' with { type: 'json' };
import rLa155 from '../datos/reglas/ley-aduanera-155.json' with { type: 'json' };
import rRri6 from '../datos/reglas/rri-6.json' with { type: 'json' };
import rLamp17 from '../datos/reglas/lamp-17.json' with { type: 'json' };
import rLamp17I from '../datos/reglas/lamp-17-I.json' with { type: 'json' };
import rLamp86 from '../datos/reglas/lamp-86.json' with { type: 'json' };
import rLamp98 from '../datos/reglas/lamp-98.json' with { type: 'json' };
import rLfpa85 from '../datos/reglas/lfpa-85.json' with { type: 'json' };

import rlfpca_58_2 from '../datos/reglas/lfpca-58-2.json' with { type: 'json' };
import rlfpca_58_4 from '../datos/reglas/lfpca-58-4.json' with { type: 'json' };
import rlfpca_58_6 from '../datos/reglas/lfpca-58-6.json' with { type: 'json' };
import rlfpca_58_8 from '../datos/reglas/lfpca-58-8.json' with { type: 'json' };
import rlfpca_59 from '../datos/reglas/lfpca-59.json' with { type: 'json' };
import rlfpca_62 from '../datos/reglas/lfpca-62.json' with { type: 'json' };
import rlfpca_63 from '../datos/reglas/lfpca-63.json' with { type: 'json' };

export const CALENDARIOS: Calendario[] = [calTfja, calSat, calCff, calAmparo, calLfpa] as unknown as Calendario[];

export const REGLAS: ReglaPlazo[] = [
  rLfpca13, rLfpca17, rLfpca19, rCff121, rLa150, rLa155, rRri6,
  rLamp17, rLamp17I, rLamp86, rLamp98, rLfpa85,
  rlfpca_58_2, rlfpca_58_4, rlfpca_58_6, rlfpca_58_8, rlfpca_59, rlfpca_62, rlfpca_63,
] as unknown as ReglaPlazo[];

export class ReglaDesconocida extends Error {
  constructor(id: string) {
    super(`No existe la regla "${id}" en el corpus. El motor no inventa reglas.`);
    this.name = 'ReglaDesconocida';
  }
}

export class CalendarioFaltante extends Error {
  readonly ids: string[];
  constructor(ids: string[]) {
    super(`Faltan calendarios en el corpus: ${ids.join(', ')}. Sin ellos no se calcula.`);
    this.name = 'CalendarioFaltante';
    this.ids = ids;
  }
}

export function buscarRegla(id: string): ReglaPlazo {
  const r = REGLAS.find((x) => x.id === id);
  if (r === undefined) throw new ReglaDesconocida(id);
  return r;
}

export function almanaqueDe(regla: ReglaPlazo): Almanaque {
  const encontrados: Calendario[] = [];
  const faltan: string[] = [];
  for (const id of regla.calendarios) {
    const c = CALENDARIOS.find((x) => x.id === id);
    if (c === undefined) faltan.push(id);
    else encontrados.push(c);
  }
  if (faltan.length > 0) throw new CalendarioFaltante(faltan);
  return new Almanaque(encontrados);
}
