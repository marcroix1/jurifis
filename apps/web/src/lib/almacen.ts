/**
 * Almacen de prospectos en memoria del servidor.
 *
 * El paquete @jurifis/db existe en el repositorio, pero exige una base de datos
 * PostgreSQL viva con sus politicas de acceso por organizacion. Mientras esta
 * aplicacion no se conecte a ella, los prospectos viven aqui y se pierden al
 * reiniciar el proceso. La pantalla del panel lo declara.
 */

export interface Prospecto {
  id: string;
  creadoEl: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  organizacion: string | null;
  situacion: string | null;
  origen: string;
}

export interface NuevoProspecto {
  nombre: string;
  correo: string;
  telefono?: string | undefined;
  organizacion?: string | undefined;
  situacion?: string | undefined;
  origen: string;
}

export const PERSISTENCIA = {
  modo: 'memoria' as const,
  titulo: 'Almacenamiento en memoria',
  detalle:
    'Todavia no hay base de datos conectada. Los prospectos viven en la memoria del servidor y se pierden cuando el proceso se reinicia.',
};

const CLAVE = Symbol.for('jurifis.web.prospectos');

type Ambito = typeof globalThis & { [CLAVE]?: Prospecto[] };

function almacen(): Prospecto[] {
  const ambito = globalThis as Ambito;
  if (ambito[CLAVE] === undefined) ambito[CLAVE] = [];
  return ambito[CLAVE];
}

function limpiar(valor: string | undefined): string | null {
  if (valor === undefined) return null;
  const v = valor.trim();
  return v.length === 0 ? null : v;
}

export function guardarProspecto(datos: NuevoProspecto): Prospecto {
  const prospecto: Prospecto = {
    id: globalThis.crypto.randomUUID(),
    creadoEl: new Date().toISOString(),
    nombre: datos.nombre.trim(),
    correo: datos.correo.trim(),
    telefono: limpiar(datos.telefono),
    organizacion: limpiar(datos.organizacion),
    situacion: limpiar(datos.situacion),
    origen: datos.origen,
  };
  almacen().push(prospecto);
  return prospecto;
}

/** Del mas reciente al mas antiguo. */
export function listarProspectos(): Prospecto[] {
  return [...almacen()].reverse();
}

export function contarProspectos(): number {
  return almacen().length;
}
