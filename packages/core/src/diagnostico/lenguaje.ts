/**
 * Guardian del lenguaje del diagnostico.
 *
 * Un cuestionario preliminar orienta, no adivina. Prometer un resultado es la falla
 * mas cara que este modulo puede cometer, asi que no se confia en la disciplina de
 * quien redacte: toda cadena que sale del modulo pasa por aqui y, si promete, revienta.
 *
 * El validador compara sobre texto normalizado, sin acentos y en minusculas, de modo
 * que "ganara" y "ganara" con acento caen igual.
 */

/**
 * Expresiones que contienen una cadena prohibida pero son nombres propios o
 * formulas legitimas. Se borran del texto antes de buscar, para no castigar al
 * Instituto Mexicano del Seguro Social por llamarse como se llama.
 * Se listan de la mas larga a la mas corta.
 */
const EXPRESIONES_PERMITIDAS: readonly string[] = [
  'instituto mexicano del seguro social',
  'seguro social',
];

/**
 * Minimo obligatorio del encargo, mas las variantes de genero y numero de las mismas
 * promesas. Ampliar esta lista es seguro; recortarla no.
 */
export const FRASES_PROHIBIDAS: readonly string[] = [
  'ganara',
  'ganaras',
  'ganaremos',
  'vas a ganar',
  'va a ganar',
  'seguro',
  'segura',
  'garantizado',
  'garantizada',
  'sin duda',
  'procede la nulidad',
  'es ilegal',
  'son ilegales',
  'te van a devolver',
  'te devolveran',
];

export class LenguajeImprudente extends Error {
  readonly frases: string[];
  readonly texto: string;
  readonly ruta: string;

  constructor(texto: string, frases: string[], ruta: string) {
    super(
      `El texto de ${ruta} anticipa un resultado y no puede salir del modulo. ` +
        `Expresiones detectadas: ${frases.join(', ')}. Texto: "${texto}"`,
    );
    this.name = 'LenguajeImprudente';
    this.frases = frases;
    this.texto = texto;
    this.ruta = ruta;
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function escapar(frase: string): string {
  return frase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Frontera de palabra propia. No se usa \b porque el texto ya viene normalizado y
 * conviene ser explicito sobre que cuenta como letra: asi "aseguro" no dispara por
 * contener "seguro", pero "es seguro" si.
 */
const LETRA = '[a-z0-9]';

const PATRONES: ReadonlyMap<string, RegExp> = new Map(
  FRASES_PROHIBIDAS.map((f) => [f, new RegExp(`(?<!${LETRA})${escapar(f)}(?!${LETRA})`)]),
);

function sinExpresionesPermitidas(texto: string): string {
  let r = texto;
  for (const e of EXPRESIONES_PERMITIDAS) {
    r = r.split(e).join(' '.repeat(e.length));
  }
  return r;
}

/** Frases prohibidas halladas en el texto. Vacio significa que el texto es prudente. */
export function frasesProhibidasEn(texto: string): string[] {
  const base = sinExpresionesPermitidas(normalizar(texto));
  const halladas: string[] = [];
  for (const [frase, patron] of PATRONES) {
    if (patron.test(base)) halladas.push(frase);
  }
  return halladas;
}

/**
 * Devuelve el mismo texto si es prudente y lanza si no lo es. Se usa como envoltura
 * al construir cada cadena, para que la falla ocurra donde se escribio el texto.
 */
export function lenguajePrudente(texto: string, ruta = 'la salida'): string {
  const frases = frasesProhibidasEn(texto);
  if (frases.length > 0) throw new LenguajeImprudente(texto, frases, ruta);
  return texto;
}

/**
 * Recorre cualquier estructura y valida toda cadena que encuentre, incluidas las
 * llaves de los objetos. Es la red final antes de devolver el diagnostico.
 */
export function revisarTextos(valor: unknown, ruta = 'diagnostico'): void {
  if (typeof valor === 'string') {
    lenguajePrudente(valor, ruta);
    return;
  }
  if (Array.isArray(valor)) {
    valor.forEach((v, i) => revisarTextos(v, `${ruta}[${i}]`));
    return;
  }
  if (valor !== null && typeof valor === 'object') {
    for (const [llave, v] of Object.entries(valor)) {
      lenguajePrudente(llave, `${ruta}.${llave}`);
      revisarTextos(v, `${ruta}.${llave}`);
    }
  }
}
