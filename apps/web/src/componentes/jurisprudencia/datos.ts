import {
  ETAPAS_INGESTA,
  TIPOS_CRITERIO,
  estadoAcervo,
  etiquetaTipoCriterio,
} from '@jurifis/core/src/jurisprudencia/index.js';
import type {
  Coincidencia,
  Criterio,
  EstadoAcervo,
  Estrategia,
  ResultadoBusqueda,
  TipoCriterio,
} from '@jurifis/core/src/jurisprudencia/index.js';

export type { Coincidencia, Criterio, EstadoAcervo, Estrategia, ResultadoBusqueda, TipoCriterio };

/**
 * Lectura del acervo para la interfaz. Aqui no se decide nada: se reduce lo que
 * el nucleo ya carga y valida. Si el acervo esta vacio, la pantalla lo dice.
 */

export interface OpcionTipo {
  valor: TipoCriterio;
  etiqueta: string;
}

export interface EtapaIngesta {
  numero: number;
  nombre: string;
  descripcion: string;
  humana: boolean;
}

export interface DatosPagina {
  acervo: EstadoAcervo;
  tipos: OpcionTipo[];
  etapas: EtapaIngesta[];
}

export function datosDeLaPagina(): DatosPagina {
  return {
    acervo: estadoAcervo(),
    tipos: TIPOS_CRITERIO.map((valor) => ({ valor, etiqueta: etiquetaTipoCriterio(valor) })),
    etapas: ETAPAS_INGESTA.map((e) => ({
      numero: e.numero,
      nombre: e.nombre,
      descripcion: e.descripcion,
      humana: e.humana,
    })),
  };
}

const ETIQUETAS_ESTRATEGIA: Record<string, string> = {
  registro_digital: 'Registro digital exacto',
  clave_control: 'Clave de la tesis',
  texto: 'Coincidencia de palabras',
  significado: 'Búsqueda por significado',
};

export function etiquetaEstrategia(clave: string): string {
  return ETIQUETAS_ESTRATEGIA[clave] ?? clave.replace(/_/g, ' ');
}

const ETIQUETAS_ESTADO: Record<string, { texto: string; tono: 'ok' | 'aviso' | 'neutro' }> = {
  aplicada: { texto: 'aplicada', tono: 'ok' },
  omitida: { texto: 'no se pidió', tono: 'neutro' },
  no_disponible: { texto: 'sin motor todavía', tono: 'aviso' },
};

export function estadoEstrategia(estado: string): { texto: string; tono: 'ok' | 'aviso' | 'neutro' } {
  return ETIQUETAS_ESTADO[estado] ?? { texto: estado, tono: 'neutro' };
}
