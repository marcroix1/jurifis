/**
 * Tuberia de ingesta de criterios, en cuatro etapas y en un solo sentido.
 *
 *   1. Origen oficial      recibir()
 *   2. Normalizacion       normalizar()   deja el contenido canonico y su huella
 *   3. Revision humana     revisar()      una persona firma con nombre y fecha
 *   4. Publicacion         publicar()     version y alta en el acervo
 *
 * La etapa tres no se puede saltar por diseño, y el diseño son dos candados:
 *
 * a) De tipos. Solo publicar() produce un criterio publicable, y solo acepta el
 *    resultado de revisar(). Ese resultado lleva una marca con un simbolo que
 *    este archivo no exporta, asi que ningun objeto escrito a mano fuera de aqui
 *    puede hacerse pasar por revisado.
 * b) De ejecucion. publicar() vuelve a comprobar revisadoPor, revisadoEl y la
 *    huella, porque el codigo que llama puede venir de JavaScript sin tipos.
 */
import { aDias, type FechaISO } from '../fecha.js';
import { huellaDeCriterio } from './huella.js';
import { origenDeclarado, origenesDeclarados } from './registro.js';
import { exigirTipoCriterio } from './tipo-criterio.js';
import type {
  Acervo,
  Criterio,
  EntradaOrigen,
  Etapa,
  Publicacion,
  Revision,
  TipoCriterio,
} from './tipos.js';
import type { NivelFuente } from '../tipos.js';

export const ETAPAS_INGESTA: readonly Etapa[] = [
  {
    numero: 1,
    clave: 'origen_oficial',
    nombre: 'Origen oficial',
    descripcion:
      'El criterio se toma del organo que lo publica y se guarda el documento con la fecha de consulta. Ninguna otra procedencia entra.',
    humana: true,
  },
  {
    numero: 2,
    clave: 'normalizacion',
    nombre: 'Normalizacion y huella',
    descripcion:
      'Se limpia el espaciado, se fija la forma canonica del contenido y se calcula su huella. La huella es lo que despues ata la revision a un texto concreto.',
    humana: false,
  },
  {
    numero: 3,
    clave: 'revision_humana',
    nombre: 'Revision humana',
    descripcion:
      'Una persona lee el criterio contra el documento oficial y firma con su nombre y la fecha. Sin esta firma el criterio no se puede publicar ni citar.',
    humana: true,
  },
  {
    numero: 4,
    clave: 'publicacion_versionada',
    nombre: 'Publicacion versionada',
    descripcion:
      'El criterio entra al acervo con numero de version. Toda correccion posterior sube la version y exige una revision nueva.',
    humana: false,
  },
];

export class OrigenNoOficial extends Error {
  constructor(origen: string) {
    super(
      `El origen "${origen}" no esta declarado en el acervo. Los unicos admitidos son ${origenesDeclarados().join(', ')}. Un criterio no entra desde una fuente que reproduzca el texto de segunda mano.`,
    );
    this.name = 'OrigenNoOficial';
  }
}

export class EntradaIncompleta extends Error {
  readonly faltantes: string[];
  constructor(faltantes: string[]) {
    super(`La entrada del origen esta incompleta:\n- ${faltantes.join('\n- ')}`);
    this.name = 'EntradaIncompleta';
    this.faltantes = faltantes;
  }
}

export class RevisionFaltante extends Error {
  readonly faltantes: string[];
  constructor(faltantes: string[]) {
    super(
      `No se puede publicar un criterio sin revision humana completa:\n- ${faltantes.join('\n- ')}`,
    );
    this.name = 'RevisionFaltante';
    this.faltantes = faltantes;
  }
}

export class HuellaAlterada extends Error {
  constructor(esperada: string, recibida: string) {
    super(
      `El contenido cambio despues de la revision. La persona reviso la huella ${recibida.slice(0, 16)} y el criterio tiene ${esperada.slice(0, 16)}. La revision no ampara este texto: hay que revisarlo otra vez.`,
    );
    this.name = 'HuellaAlterada';
  }
}

/* -------------------------------------------------------------------------- */
/* Etapa 1. Origen oficial                                                    */
/* -------------------------------------------------------------------------- */

// Marcas de etapa. Los simbolos no salen de este archivo: sin ellos, ningun
// objeto escrito fuera puede presentarse como revisado.
const marcaOrigen: unique symbol = Symbol('jurifis.criterio.origen');
const marcaNormalizado: unique symbol = Symbol('jurifis.criterio.normalizado');
const marcaRevisado: unique symbol = Symbol('jurifis.criterio.revisado');

/** Criterio tal como salio del origen. Todavia no se puede normalizar dos veces. */
export interface CriterioEnOrigen {
  readonly [marcaOrigen]: true;
  origen: string;
  documento: string;
  consultadoEl: FechaISO;
  nivelFuente: NivelFuente;
  tipoCriterio: TipoCriterio;
  rubro: string;
  texto: string;
  organo: string | null;
  epoca: string | null;
  registroDigital: string | null;
  materia: string | null;
  precedentes: string | null;
  claveControl: string | null;
  instancia: string | null;
  fechaPublicacion: FechaISO | null;
}

/** Criterio normalizado, con su huella. Todavia sin revisar. */
export interface CriterioNormalizado extends Omit<CriterioEnOrigen, typeof marcaOrigen> {
  readonly [marcaNormalizado]: true;
  id: string;
  huella: string;
}

/** Criterio revisado por una persona. Unico insumo que publicar() acepta. */
export interface CriterioRevisado extends Omit<CriterioNormalizado, typeof marcaNormalizado> {
  readonly [marcaRevisado]: true;
  revisadoPor: string;
  revisadoEl: FechaISO;
  notaRevision: string;
}

function fechaValida(valor: unknown): boolean {
  if (typeof valor !== 'string') return false;
  try {
    aDias(valor);
    return true;
  } catch {
    return false;
  }
}

function opcional(valor: string | undefined): string | null {
  if (valor === undefined) return null;
  const v = valor.trim();
  return v === '' ? null : v;
}

/** Etapa 1. Recibe lo que el origen oficial publica y rechaza todo lo demas. */
export function recibir(entrada: EntradaOrigen): CriterioEnOrigen {
  if (!origenDeclarado(entrada.origen)) throw new OrigenNoOficial(entrada.origen);

  const faltantes: string[] = [];
  if (entrada.rubro.trim() === '') faltantes.push('El rubro, transcrito integro del documento.');
  if (entrada.texto.trim() === '') faltantes.push('El texto del criterio, sin resumir.');
  if (entrada.documento.trim() === '') faltantes.push('El documento del que se tomo el criterio.');
  if (!fechaValida(entrada.consultadoEl)) faltantes.push('La fecha de consulta, en formato AAAA-MM-DD.');
  if (entrada.nivelFuente !== 'A' && entrada.nivelFuente !== 'B') {
    faltantes.push('El nivel de fuente, A o B.');
  }
  if (entrada.fechaPublicacion !== undefined && !fechaValida(entrada.fechaPublicacion)) {
    faltantes.push('La fecha de publicacion, en formato AAAA-MM-DD, o dejarla fuera.');
  }
  if (faltantes.length > 0) throw new EntradaIncompleta(faltantes);

  // El tipo lo declara el origen. Aqui solo se comprueba que este en la
  // enumeracion cerrada: el modulo no lo deduce del rubro ni del organo.
  const tipoCriterio = exigirTipoCriterio(entrada.tipoCriterio);

  return {
    [marcaOrigen]: true,
    origen: entrada.origen,
    documento: entrada.documento.trim(),
    consultadoEl: entrada.consultadoEl,
    nivelFuente: entrada.nivelFuente,
    tipoCriterio,
    rubro: entrada.rubro,
    texto: entrada.texto,
    organo: opcional(entrada.organo),
    epoca: opcional(entrada.epoca),
    registroDigital: opcional(entrada.registroDigital),
    materia: opcional(entrada.materia),
    precedentes: opcional(entrada.precedentes),
    claveControl: opcional(entrada.claveControl),
    instancia: opcional(entrada.instancia),
    fechaPublicacion: entrada.fechaPublicacion ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/* Etapa 2. Normalizacion y huella                                            */
/* -------------------------------------------------------------------------- */

/** Espaciado uniforme y forma unicode canonica. El contenido no se toca. */
function canonico(texto: string): string {
  return texto.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function canonicoOpcional(texto: string | null): string | null {
  if (texto === null) return null;
  const v = canonico(texto);
  return v === '' ? null : v;
}

/** Etapa 2. Deja el contenido canonico y calcula la huella que la revision firmara. */
export function normalizar(enOrigen: CriterioEnOrigen): CriterioNormalizado {
  const contenido = {
    tipoCriterio: enOrigen.tipoCriterio,
    rubro: canonico(enOrigen.rubro),
    texto: canonico(enOrigen.texto),
    organo: canonicoOpcional(enOrigen.organo),
    epoca: canonicoOpcional(enOrigen.epoca),
    registroDigital: canonicoOpcional(enOrigen.registroDigital),
    materia: canonicoOpcional(enOrigen.materia),
    precedentes: canonicoOpcional(enOrigen.precedentes),
    claveControl: canonicoOpcional(enOrigen.claveControl),
    instancia: canonicoOpcional(enOrigen.instancia),
    fechaPublicacion: enOrigen.fechaPublicacion,
    origen: enOrigen.origen,
    documento: enOrigen.documento,
  };
  const huella = huellaDeCriterio(contenido);
  return {
    [marcaNormalizado]: true,
    ...contenido,
    consultadoEl: enOrigen.consultadoEl,
    nivelFuente: enOrigen.nivelFuente,
    id: huella.slice(0, 16),
    huella,
  };
}

/* -------------------------------------------------------------------------- */
/* Etapa 3. Revision humana, obligatoria                                      */
/* -------------------------------------------------------------------------- */

/**
 * Etapa 3. Registra que una persona leyo el criterio contra el documento
 * oficial. La firma queda atada a la huella: si el texto cambia despues, la
 * revision deja de amparar y hay que volver a hacerla.
 */
export function revisar(normalizado: CriterioNormalizado, revision: Revision): CriterioRevisado {
  const faltantes: string[] = [];
  if (typeof revision.revisadoPor !== 'string' || revision.revisadoPor.trim() === '') {
    faltantes.push('revisadoPor, el nombre de quien reviso. No se admite un proceso automatico.');
  }
  if (!fechaValida(revision.revisadoEl)) {
    faltantes.push('revisadoEl, la fecha de la revision en formato AAAA-MM-DD.');
  }
  if (typeof revision.nota !== 'string' || revision.nota.trim() === '') {
    faltantes.push('La nota de la revision, con lo que se contrasto contra el documento.');
  }
  if (faltantes.length > 0) throw new RevisionFaltante(faltantes);
  if (revision.huellaRevisada !== normalizado.huella) {
    throw new HuellaAlterada(normalizado.huella, revision.huellaRevisada);
  }

  const { [marcaNormalizado]: _marca, ...resto } = normalizado;
  return {
    [marcaRevisado]: true,
    ...resto,
    revisadoPor: revision.revisadoPor.trim(),
    revisadoEl: revision.revisadoEl,
    notaRevision: revision.nota.trim(),
  };
}

/* -------------------------------------------------------------------------- */
/* Etapa 4. Publicacion versionada                                            */
/* -------------------------------------------------------------------------- */

/**
 * Etapa 4. Da de alta el criterio con numero de version. Vuelve a comprobar la
 * revision y la huella, porque el candado de tipos no alcanza a quien llame
 * desde JavaScript sin tipos.
 */
export function publicar(revisado: CriterioRevisado, publicacion: Publicacion): Criterio {
  const candidato = revisado as Partial<CriterioRevisado> | null | undefined;
  if (candidato === null || candidato === undefined || typeof candidato !== 'object') {
    throw new RevisionFaltante(['El criterio que se pretende publicar no es un objeto.']);
  }

  const faltantes: string[] = [];
  if (typeof candidato.revisadoPor !== 'string' || candidato.revisadoPor.trim() === '') {
    faltantes.push('revisadoPor. Ningun criterio se publica sin la persona que lo reviso.');
  }
  if (!fechaValida(candidato.revisadoEl)) {
    faltantes.push('revisadoEl. Ningun criterio se publica sin la fecha de la revision.');
  }
  if (typeof candidato.huella !== 'string' || candidato.huella === '') {
    faltantes.push('La huella del contenido normalizado. Falto pasar por la etapa dos.');
  }
  if (!fechaValida(publicacion.publicadoEl)) {
    faltantes.push('publicadoEl, la fecha de publicacion en formato AAAA-MM-DD.');
  }
  if (faltantes.length > 0) throw new RevisionFaltante(faltantes);

  const tipoCriterio = exigirTipoCriterio(candidato.tipoCriterio);
  const criterio: Criterio = {
    id: String(candidato.id ?? ''),
    tipoCriterio,
    rubro: String(candidato.rubro ?? ''),
    texto: String(candidato.texto ?? ''),
    organo: candidato.organo ?? null,
    epoca: candidato.epoca ?? null,
    registroDigital: candidato.registroDigital ?? null,
    materia: candidato.materia ?? null,
    precedentes: candidato.precedentes ?? null,
    claveControl: candidato.claveControl ?? null,
    instancia: candidato.instancia ?? null,
    fechaPublicacion: candidato.fechaPublicacion ?? null,
    origen: String(candidato.origen ?? ''),
    documento: String(candidato.documento ?? ''),
    consultadoEl: String(candidato.consultadoEl ?? ''),
    nivelFuente: candidato.nivelFuente === 'B' ? 'B' : 'A',
    verificado: true,
    revisadoPor: String(candidato.revisadoPor),
    revisadoEl: String(candidato.revisadoEl),
    notaRevision: candidato.notaRevision ?? null,
    version: Math.max(1, Math.trunc(publicacion.version ?? 1)),
    publicadoEl: publicacion.publicadoEl,
    huella: String(candidato.huella),
  };

  // La huella se recalcula sobre lo que de verdad se va a publicar.
  const recalculada = huellaDeCriterio(criterio);
  if (recalculada !== criterio.huella) throw new HuellaAlterada(recalculada, criterio.huella);

  return criterio;
}

/** Las cuatro etapas seguidas. Sigue sin haber forma de omitir la tercera. */
export function ingerir(
  entrada: EntradaOrigen,
  revision: Omit<Revision, 'huellaRevisada'> & { huellaRevisada?: string },
  publicacion: Publicacion,
): Criterio {
  const normalizado = normalizar(recibir(entrada));
  const revisado = revisar(normalizado, {
    revisadoPor: revision.revisadoPor,
    revisadoEl: revision.revisadoEl,
    nota: revision.nota,
    // Cuando quien llama no trae huella se usa la del criterio recien
    // normalizado: la persona reviso justo este contenido en la misma corrida.
    huellaRevisada: revision.huellaRevisada ?? normalizado.huella,
  });
  return publicar(revisado, publicacion);
}

/**
 * Proyecta como quedaria el acervo con criterios nuevos. Funcion pura: no
 * escribe el archivo. Quien lo escriba lo hace con revision de por medio.
 */
export function proyectarAcervo(
  acervo: Acervo,
  nuevos: readonly Criterio[],
  version: string,
  actualizadoEl: FechaISO,
): Acervo {
  const porRegistro = new Map<string, Criterio>();
  for (const c of [...acervo.criterios, ...nuevos]) {
    const llave = c.registroDigital ?? c.id;
    const previo = porRegistro.get(llave);
    if (previo === undefined || c.version >= previo.version) porRegistro.set(llave, c);
  }
  return {
    ...acervo,
    version,
    actualizadoEl,
    criterios: [...porRegistro.values()].sort((a, b) => a.rubro.localeCompare(b.rubro, 'es')),
  };
}
