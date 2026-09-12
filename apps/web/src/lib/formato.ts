import type { Fundamento } from './tipos-ui';

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Formatea una fecha civil AAAA-MM-DD sin tocar el objeto Date nativo, por la
 * misma razon que el motor: la zona horaria del navegador puede correr un dia.
 */
export function fechaLarga(iso: string | null | undefined): string {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m === null) return iso;
  const mes = MESES[Number(m[2]) - 1];
  if (mes === undefined) return iso;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}

/** Sello de creacion en memoria, mostrado sin depender de la zona del cliente. */
export function selloLegible(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (m === null) return iso;
  return `${m[3]}/${m[2]}/${m[1]} a las ${m[4]}:${m[5]} en tiempo universal coordinado`;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const FORMAS: Record<string, string> = {
  personal: 'Notificación personal',
  oficio: 'Por oficio',
  lista_o_estrados: 'Por lista o estrados',
  buzon_tributario: 'Por buzón tributario',
  correo_certificado: 'Por correo certificado',
  edictos: 'Por edictos',
  acto_autoaplicativo: 'Acto autoaplicativo',
  boletin_jurisdiccional: 'Por boletín jurisdiccional',
};

/** Etiqueta legible de la forma de notificacion. Lo que no conoce, lo muestra tal cual. */
export function etiquetaForma(forma: string): string {
  return FORMAS[forma] ?? capitalizar(forma.replace(/_/g, ' '));
}

const UNIDADES: Record<string, string> = {
  dias_habiles: 'días hábiles',
  dias_naturales: 'días naturales',
  meses: 'meses',
  anios: 'años',
};

export function etiquetaUnidad(unidad: string): string {
  return UNIDADES[unidad] ?? unidad.replace(/_/g, ' ');
}

export type Tono = 'ok' | 'aviso' | 'alto' | 'neutro';

export interface EstadoConfianza {
  titulo: string;
  resumen: string;
  tono: Tono;
  /** Regla dura de producto: solo estos estados pueden mostrar una fecha. */
  muestraFecha: boolean;
}

const CONFIANZAS: Record<string, EstadoConfianza> = {
  verificada: {
    titulo: 'Confianza verificada',
    resumen:
      'La regla y los calendarios aplicados son de nivel A y cubren todo el periodo del cómputo.',
    tono: 'ok',
    muestraFecha: true,
  },
  parcial: {
    titulo: 'Confianza parcial',
    resumen:
      'El cómputo se completó, pero algo de lo que lo sostiene es de nivel B. Revisa las advertencias y el nivel de fuente antes de usar la fecha.',
    tono: 'aviso',
    muestraFecha: true,
  },
  insuficiente: {
    titulo: 'Confianza insuficiente',
    resumen:
      'Falta información en el corpus para completar el cómputo. La interfaz no muestra ninguna fecha.',
    tono: 'alto',
    muestraFecha: false,
  },
  bloqueada_por_fuente: {
    titulo: 'Bloqueada por la fuente',
    resumen:
      'La regla se apoya en una fuente de nivel B sin declaración de vigencia. La interfaz no muestra ninguna fecha.',
    tono: 'alto',
    muestraFecha: false,
  },
};

export function estadoConfianza(confianza: string): EstadoConfianza {
  return (
    CONFIANZAS[confianza] ?? {
      titulo: capitalizar(confianza.replace(/_/g, ' ')),
      resumen: 'Estado de confianza no reconocido por esta versión de la interfaz.',
      tono: 'alto',
      muestraFecha: false,
    }
  );
}

export function nivelFuenteTexto(nivel: 'A' | 'B'): string {
  return nivel === 'A'
    ? 'Nivel A, texto oficial íntegro y vigente'
    : 'Nivel B, fuente derivada, resumen o página no oficial';
}

/** Cita del fundamento con los campos que trae el corpus, sin agregar nada. */
export function textoFundamento(f: Fundamento): string {
  const partes = [f.ordenamiento, `artículo ${f.articulo}`];
  if (f.fraccion !== undefined) partes.push(`fracción ${f.fraccion}`);
  if (f.inciso !== undefined) partes.push(`inciso ${f.inciso}`);
  if (f.parrafo !== undefined) partes.push(`párrafo ${f.parrafo}`);
  return partes.join(', ');
}

export function origenFundamento(f: Fundamento): string {
  return f.linea === undefined ? `Archivo ${f.archivo}` : `Archivo ${f.archivo}, línea ${f.linea}`;
}
