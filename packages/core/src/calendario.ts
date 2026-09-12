import { aDias, aFecha, anio, esFinDeSemana, type FechaISO } from './fecha.js';
import type { Calendario, DiaInhabil } from './tipos.js';

/** Conjunto de calendarios ya resueltos, listo para consultar dia por dia. */
export class Almanaque {
  private readonly indice = new Map<FechaISO, DiaInhabil[]>();
  private readonly finesDeSemana: boolean;

  constructor(private readonly calendarios: Calendario[]) {
    this.finesDeSemana = calendarios.some((c) => c.finesDeSemanaInhabiles);
    for (const cal of calendarios) {
      for (const dia of cal.dias) {
        const previos = this.indice.get(dia.fecha) ?? [];
        previos.push(dia);
        this.indice.set(dia.fecha, previos);
      }
    }
  }

  get ids(): string[] {
    return this.calendarios.map((c) => c.id);
  }

  get nivelMinimo(): 'A' | 'B' {
    return this.calendarios.some((c) => c.nivelFuente === 'B') ? 'B' : 'A';
  }

  /** Motivos por los que la fecha es inhabil. Vacio significa habil. */
  motivos(f: FechaISO): DiaInhabil[] {
    const enumerados = this.indice.get(f) ?? [];
    if (enumerados.length > 0) return enumerados;
    if (this.finesDeSemana && esFinDeSemana(f)) {
      return [{ fecha: f, motivo: 'Fin de semana', fundamento: 'Regla general de dias habiles' }];
    }
    return [];
  }

  esHabil(f: FechaISO): boolean {
    return this.motivos(f).length === 0;
  }

  siguienteHabil(f: FechaISO): FechaISO {
    let d = aDias(f) + 1;
    // Tope defensivo: 400 dias. Un calendario que declare mas de un anio seguido
    // de inhabiles esta mal cargado y debe fallar ruidosamente.
    for (let i = 0; i < 400; i++, d++) {
      const cand = aFecha(d);
      if (this.esHabil(cand)) return cand;
    }
    throw new Error(`No se hallo dia habil en 400 dias despues de ${f}. Calendario mal cargado.`);
  }

  /**
   * Verifica que los calendarios declaren cubrir todos los anios del periodo.
   * Devuelve la lista de lo que falta. Vacia significa cobertura completa.
   */
  cobertura(desde: FechaISO, hasta: FechaISO): string[] {
    const faltantes: string[] = [];
    const a1 = anio(desde);
    const a2 = anio(hasta);
    for (const cal of this.calendarios) {
      for (let a = a1; a <= a2; a++) {
        if (!cal.aniosCubiertos.includes(a)) {
          faltantes.push(`El calendario "${cal.nombre}" no declara cubrir el anio ${a}.`);
        }
      }
      for (const hueco of cal.huecos ?? []) {
        if (aDias(hueco.hasta) >= aDias(desde) && aDias(hueco.desde) <= aDias(hasta)) {
          faltantes.push(`El calendario "${cal.nombre}" declara un hueco que cae dentro del periodo: ${hueco.descripcion}`);
        }
      }
    }
    return faltantes;
  }
}
