/**
 * Buscador hibrido del acervo.
 *
 * Tres estrategias conviven y cada una declara si corrio:
 * 1. Coincidencia exacta por registro digital, que es la llave de cita.
 * 2. Coincidencia exacta por clave de control de la tesis o del precedente.
 * 3. Coincidencia lexica sobre el rubro, el texto, la materia y los precedentes.
 * Y queda declarado el hueco de la cuarta, la busqueda por significado con
 * vectores, que todavia no tiene motor.
 *
 * Con el acervo vacio el buscador no falla ni se queda mudo: devuelve cero
 * coincidencias y dice por que no hay ninguna.
 */
import { ACERVO, CRITERIOS, resumenAcervo } from './registro.js';
import { esTipoCriterio } from './tipo-criterio.js';
import type {
  ClaveEstrategia,
  Coincidencia,
  ConsultaBusqueda,
  Criterio,
  Estrategia,
  ResultadoBusqueda,
  TipoCriterio,
} from './tipos.js';

const LIMITE_POR_OMISION = 20;
const LIMITE_MAXIMO = 100;

/** Palabras que no discriminan nada y solo ensucian el puntaje. */
const VACIAS = new Set([
  'a', 'al', 'ante', 'con', 'contra', 'de', 'del', 'desde', 'el', 'en', 'entre', 'es', 'esa',
  'ese', 'esta', 'este', 'la', 'las', 'lo', 'los', 'no', 'o', 'para', 'por', 'que', 'se', 'si',
  'sin', 'sobre', 'su', 'sus', 'un', 'una', 'y',
]);

/** Minusculas y sin diacriticos, para que "articulo" encuentre "artículo". */
export function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function palabras(texto: string): string[] {
  return plegar(texto)
    .split(/[^0-9a-zñ]+/)
    .filter((p) => p.length > 2 && !VACIAS.has(p));
}

/** Los registros y las claves se comparan sin espacios, guiones ni puntos sueltos. */
export function normalizarLlave(valor: string): string {
  return plegar(valor).replace(/[\s.,]/g, '');
}

function fragmentoAlrededor(texto: string, termino: string): string | null {
  const i = plegar(texto).indexOf(termino);
  if (i < 0) return null;
  const desde = Math.max(0, i - 60);
  const hasta = Math.min(texto.length, i + termino.length + 60);
  const prefijo = desde > 0 ? '...' : '';
  const sufijo = hasta < texto.length ? '...' : '';
  return `${prefijo}${texto.slice(desde, hasta).trim()}${sufijo}`;
}

function pasaFiltros(c: Criterio, consulta: ConsultaBusqueda): boolean {
  if (consulta.tipos !== undefined && consulta.tipos.length > 0) {
    if (!consulta.tipos.includes(c.tipoCriterio)) return false;
  }
  if (consulta.organo !== undefined && plegar(c.organo ?? '') !== plegar(consulta.organo)) return false;
  if (consulta.epoca !== undefined && plegar(c.epoca ?? '') !== plegar(consulta.epoca)) return false;
  if (consulta.materia !== undefined && plegar(c.materia ?? '') !== plegar(consulta.materia)) return false;
  return true;
}

function limpiar(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  const v = valor.trim();
  return v === '' ? undefined : v;
}

/** Deja la consulta en su forma canonica y descarta lo que no significa nada. */
export function normalizarConsulta(consulta: ConsultaBusqueda): ConsultaBusqueda {
  const tipos = (consulta.tipos ?? []).filter((t): t is TipoCriterio => esTipoCriterio(t));
  const limite = Math.min(
    Math.max(1, Math.trunc(consulta.limite ?? LIMITE_POR_OMISION)),
    LIMITE_MAXIMO,
  );
  const desplazamiento = Math.max(0, Math.trunc(consulta.desplazamiento ?? 0));
  const texto = limpiar(consulta.texto);
  const registroDigital = limpiar(consulta.registroDigital);
  const claveControl = limpiar(consulta.claveControl);
  const organo = limpiar(consulta.organo);
  const epoca = limpiar(consulta.epoca);
  const materia = limpiar(consulta.materia);
  return {
    ...(texto !== undefined ? { texto } : {}),
    ...(registroDigital !== undefined ? { registroDigital } : {}),
    ...(claveControl !== undefined ? { claveControl } : {}),
    ...(tipos.length > 0 ? { tipos } : {}),
    ...(organo !== undefined ? { organo } : {}),
    ...(epoca !== undefined ? { epoca } : {}),
    ...(materia !== undefined ? { materia } : {}),
    limite,
    desplazamiento,
  };
}

/** Coincidencia exacta por registro digital. La usa el guardian de citas. */
export function buscarPorRegistro(registroDigital: string): Criterio | null {
  const llave = normalizarLlave(registroDigital);
  if (llave === '') return null;
  return (
    CRITERIOS.find(
      (c) => c.registroDigital !== null && normalizarLlave(c.registroDigital) === llave,
    ) ?? null
  );
}

/** Coincidencia exacta por clave de control de la tesis o del precedente. */
export function buscarPorClave(claveControl: string): Criterio | null {
  const llave = normalizarLlave(claveControl);
  if (llave === '') return null;
  return (
    CRITERIOS.find((c) => c.claveControl !== null && normalizarLlave(c.claveControl) === llave) ??
    null
  );
}

/* -------------------------------------------------------------------------- */
/* Hueco declarado: busqueda por significado                                  */
/* -------------------------------------------------------------------------- */

/**
 * Dimension del vector de la tabla jurisprudence en @jurifis/db. Se repite aqui
 * porque el nucleo no depende del paquete de base de datos, y las pruebas de la
 * base cuidan que los dos numeros no se separen.
 */
export const DIMENSION_EMBEDDING = 1536;

/**
 * Contrato del motor de vectores que todavia no existe. Cuando exista, se
 * registra desde fuera del nucleo: el motor puro no habla con servicios.
 */
export interface MotorSemantico {
  clave: string;
  dimension: number;
  /** Devuelve identificadores de criterio con su distancia, mas cerca es mejor. */
  vecinos(texto: string, limite: number): Promise<{ id: string; distancia: number }[]>;
}

export class BusquedaSemanticaNoDisponible extends Error {
  readonly faltantes: string[];
  constructor() {
    const faltantes = [
      'Motor de vectores registrado con registrarMotorSemantico.',
      `Columna embedding de la tabla jurisprudence poblada con vectores de ${DIMENSION_EMBEDDING} dimensiones.`,
      'Criterios cargados en el acervo. Sin criterios no hay nada que vectorizar.',
    ];
    super(
      `La busqueda por significado esta declarada en el diseño y no tiene motor. Falta:\n- ${faltantes.join('\n- ')}`,
    );
    this.name = 'BusquedaSemanticaNoDisponible';
    this.faltantes = faltantes;
  }
}

let motor: MotorSemantico | null = null;

export function registrarMotorSemantico(nuevo: MotorSemantico | null): void {
  if (nuevo !== null && nuevo.dimension !== DIMENSION_EMBEDDING) {
    throw new Error(
      `El motor "${nuevo.clave}" trabaja con vectores de ${nuevo.dimension} dimensiones y el acervo espera ${DIMENSION_EMBEDDING}.`,
    );
  }
  motor = nuevo;
}

export function motorSemanticoRegistrado(): MotorSemantico | null {
  return motor;
}

export function haySemantica(): boolean {
  return motor !== null;
}

/**
 * Busqueda por significado. Mientras no haya motor lanza el error declarado en
 * lugar de degradar a coincidencia de palabras haciendola pasar por semantica.
 */
export async function buscarPorSignificado(
  texto: string,
  limite: number = LIMITE_POR_OMISION,
): Promise<Coincidencia[]> {
  if (motor === null) throw new BusquedaSemanticaNoDisponible();
  const vecinos = await motor.vecinos(texto, limite);
  const salida: Coincidencia[] = [];
  for (const v of vecinos) {
    const criterio = CRITERIOS.find((c) => c.id === v.id);
    if (criterio === undefined) continue;
    salida.push({
      criterio,
      puntaje: Math.max(0, 1 - v.distancia),
      por: ['significado'],
      fragmentos: [],
    });
  }
  return salida;
}

/* -------------------------------------------------------------------------- */
/* Busqueda hibrida                                                           */
/* -------------------------------------------------------------------------- */

interface Parcial {
  criterio: Criterio;
  puntaje: number;
  por: Set<ClaveEstrategia>;
  fragmentos: string[];
}

function acumular(mapa: Map<string, Parcial>, c: Criterio, puntaje: number, por: ClaveEstrategia, fragmentos: string[]): void {
  const previo = mapa.get(c.id);
  if (previo === undefined) {
    mapa.set(c.id, { criterio: c, puntaje, por: new Set([por]), fragmentos });
    return;
  }
  previo.puntaje = Math.max(previo.puntaje, puntaje);
  previo.por.add(por);
  for (const f of fragmentos) if (!previo.fragmentos.includes(f)) previo.fragmentos.push(f);
}

/**
 * Punto de entrada del buscador. Sincrono a proposito: lo que corre aqui no
 * sale del proceso. La busqueda por significado, que si saldria, vive aparte.
 */
export function buscarCriterios(entrada: ConsultaBusqueda = {}): ResultadoBusqueda {
  const consulta = normalizarConsulta(entrada);
  const estrategias: Estrategia[] = [];
  const advertencias: string[] = [];
  const faltantes: string[] = [];
  const mapa = new Map<string, Parcial>();
  const universo = CRITERIOS.filter((c) => pasaFiltros(c, consulta));

  // Estrategia 1. Registro digital.
  if (consulta.registroDigital === undefined) {
    estrategias.push({
      clave: 'registro_digital',
      estado: 'omitida',
      detalle: 'La consulta no trae registro digital.',
      coincidencias: 0,
    });
  } else {
    const encontrado = buscarPorRegistro(consulta.registroDigital);
    const util = encontrado !== null && pasaFiltros(encontrado, consulta);
    if (util && encontrado !== null) acumular(mapa, encontrado, 1, 'registro_digital', []);
    estrategias.push({
      clave: 'registro_digital',
      estado: 'aplicada',
      detalle: util
        ? `Coincidencia exacta con el registro digital ${consulta.registroDigital}.`
        : `Ningun criterio del acervo tiene el registro digital ${consulta.registroDigital}.`,
      coincidencias: util ? 1 : 0,
    });
  }

  // Estrategia 2. Clave de control.
  if (consulta.claveControl === undefined) {
    estrategias.push({
      clave: 'clave_control',
      estado: 'omitida',
      detalle: 'La consulta no trae clave de control.',
      coincidencias: 0,
    });
  } else {
    const encontrado = buscarPorClave(consulta.claveControl);
    const util = encontrado !== null && pasaFiltros(encontrado, consulta);
    if (util && encontrado !== null) acumular(mapa, encontrado, 0.95, 'clave_control', []);
    estrategias.push({
      clave: 'clave_control',
      estado: 'aplicada',
      detalle: util
        ? `Coincidencia exacta con la clave ${consulta.claveControl}.`
        : `Ningun criterio del acervo tiene la clave ${consulta.claveControl}.`,
      coincidencias: util ? 1 : 0,
    });
  }

  // Estrategia 3. Texto.
  if (consulta.texto === undefined) {
    estrategias.push({
      clave: 'texto',
      estado: 'omitida',
      detalle: 'La consulta no trae texto que buscar.',
      coincidencias: 0,
    });
  } else {
    const terminos = palabras(consulta.texto);
    let cuenta = 0;
    if (terminos.length === 0) {
      advertencias.push(
        'El texto de la consulta no dejo ninguna palabra util despues de quitar articulos y preposiciones.',
      );
    } else {
      for (const c of universo) {
        const rubro = plegar(c.rubro);
        const cuerpo = plegar(`${c.texto} ${c.materia ?? ''} ${c.precedentes ?? ''}`);
        let aciertos = 0;
        let peso = 0;
        const fragmentos: string[] = [];
        for (const t of terminos) {
          const enRubro = rubro.includes(t);
          const enCuerpo = cuerpo.includes(t);
          if (!enRubro && !enCuerpo) continue;
          aciertos += 1;
          peso += enRubro ? 1 : 0.6;
          const f = fragmentoAlrededor(enRubro ? c.rubro : c.texto, t);
          if (f !== null && fragmentos.length < 3 && !fragmentos.includes(f)) fragmentos.push(f);
        }
        if (aciertos === 0) continue;
        cuenta += 1;
        // Puntaje siempre por debajo de la coincidencia exacta por registro.
        acumular(mapa, c, Math.min(0.9, (peso / terminos.length) * 0.9), 'texto', fragmentos);
      }
    }
    estrategias.push({
      clave: 'texto',
      estado: 'aplicada',
      detalle:
        terminos.length === 0
          ? 'No quedaron palabras utiles que buscar.'
          : `Se buscaron ${terminos.length} palabras sobre ${universo.length} criterios del acervo.`,
      coincidencias: cuenta,
    });
  }

  // Estrategia 4. Significado. Declarada, sin motor.
  estrategias.push({
    clave: 'significado',
    estado: haySemantica() ? 'aplicada' : 'no_disponible',
    detalle: haySemantica()
      ? `Motor de vectores "${motor?.clave ?? ''}" registrado. Se consulta con buscarPorSignificado.`
      : 'La busqueda por significado esta declarada en el diseño y todavia no tiene motor de vectores. El buscador no la simula con palabras.',
    coincidencias: 0,
  });

  const ordenadas = [...mapa.values()].sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.criterio.rubro.localeCompare(b.criterio.rubro, 'es');
  });

  const limite = consulta.limite ?? LIMITE_POR_OMISION;
  const desplazamiento = consulta.desplazamiento ?? 0;
  const coincidencias: Coincidencia[] = ordenadas
    .slice(desplazamiento, desplazamiento + limite)
    .map((p) => ({
      criterio: p.criterio,
      puntaje: Number(p.puntaje.toFixed(4)),
      por: [...p.por],
      fragmentos: p.fragmentos,
    }));

  if (CRITERIOS.length === 0) {
    advertencias.push(
      'El acervo no tiene ningun criterio cargado, asi que ninguna busqueda puede devolver resultados.',
    );
    advertencias.push(
      'El buscador no completa el vacio con criterios recordados ni parecidos. Cero resultados significa cero criterios verificados, no que el criterio no exista.',
    );
    for (const r of ACERVO.requisitosDeCarga) faltantes.push(r);
  } else if (ordenadas.length === 0) {
    advertencias.push(
      `Ninguno de los ${CRITERIOS.length} criterios cargados coincide con la consulta.`,
    );
  }

  if (!haySemantica()) {
    faltantes.push(
      'Motor de busqueda por significado con vectores. Sin el, solo hay coincidencia exacta y de palabras.',
    );
  }

  return {
    consulta,
    total: ordenadas.length,
    coincidencias,
    estrategias,
    acervo: resumenAcervo(),
    advertencias,
    faltantes,
  };
}
