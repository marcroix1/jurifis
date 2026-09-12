import type { Tono } from '@/lib/formato';

/**
 * Formato de la pantalla de crédito.
 *
 * El dinero llega del motor en centavos enteros y aquí solo se escribe. La conversión
 * se hace a mano, sin la configuración regional del navegador, para que la cifra en
 * pantalla sea la misma en cualquier equipo del despacho.
 */

export function pesos(centavos: number | null | undefined): string {
  if (typeof centavos !== 'number') return '';
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const enteros = Math.floor(abs / 100);
  const resto = abs % 100;
  const conSeparador = String(enteros).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negativo ? '-' : ''}$${conSeparador}.${String(resto).padStart(2, '0')}`;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Igual que en el resto de la aplicación: la fecha se escribe sin tocar el objeto Date. */
export function fechaLarga(iso: string | null | undefined): string {
  if (typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m === null) return iso;
  const mes = MESES[Number(m[2]) - 1];
  if (mes === undefined) return iso;
  return `${Number(m[3])} de ${mes} de ${m[1]}`;
}

export function mesLargo(mes: string | null | undefined): string {
  if (typeof mes !== 'string') return '';
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (m === null) return mes;
  const nombre = MESES[Number(m[2]) - 1];
  if (nombre === undefined) return mes;
  return `${nombre} de ${m[1]}`;
}

export const TIPOS_RECARGO: { valor: string; etiqueta: string }[] = [
  { valor: 'mora', etiqueta: 'Mora, artículo 21 del Código Fiscal de la Federación' },
  { valor: 'prorroga', etiqueta: 'Prórroga, artículo 11 fracción I de la Ley de Ingresos' },
  {
    valor: 'parcialidadesHastaDoceMeses',
    etiqueta: 'Parcialidades de hasta doce meses',
  },
  {
    valor: 'parcialidadesDeMasDeDoceYHastaVeinticuatroMeses',
    etiqueta: 'Parcialidades de más de doce y hasta veinticuatro meses',
  },
  {
    valor: 'parcialidadesSuperioresAVeinticuatroMesesYPagoDiferido',
    etiqueta: 'Parcialidades superiores a veinticuatro meses y pago diferido',
  },
];

export function etiquetaTipoRecargo(valor: string): string {
  return TIPOS_RECARGO.find((t) => t.valor === valor)?.etiqueta ?? valor;
}

export const TIPOS_ACTO: { valor: string; etiqueta: string }[] = [
  { valor: 'nacimiento_del_credito', etiqueta: 'Nacimiento del crédito' },
  { valor: 'exigibilidad', etiqueta: 'El pago pudo ser legalmente exigido' },
  { valor: 'notificacion_del_credito', etiqueta: 'Notificación del crédito' },
  { valor: 'requerimiento_de_pago', etiqueta: 'Requerimiento de pago' },
  {
    valor: 'acto_del_procedimiento_administrativo_de_ejecucion',
    etiqueta: 'Acto del procedimiento administrativo de ejecución',
  },
  { valor: 'embargo', etiqueta: 'Embargo' },
  { valor: 'convenio_de_pago_a_plazos', etiqueta: 'Convenio de pago a plazos' },
  { valor: 'pago', etiqueta: 'Pago' },
  { valor: 'reconocimiento_expreso_o_tacito', etiqueta: 'Reconocimiento expreso o tácito' },
  { valor: 'recurso_administrativo', etiqueta: 'Recurso administrativo' },
  { valor: 'juicio', etiqueta: 'Juicio' },
  {
    valor: 'suspension_del_procedimiento_administrativo_de_ejecucion',
    etiqueta: 'Suspensión del procedimiento administrativo de ejecución',
  },
  {
    valor: 'domicilio_fiscal_desocupado_o_incorrecto',
    etiqueta: 'Domicilio fiscal desocupado o señalado de manera incorrecta',
  },
  {
    valor: 'ejercicio_de_facultades_de_comprobacion',
    etiqueta: 'Ejercicio de facultades de comprobación',
  },
  { valor: 'otro', etiqueta: 'Otro acto del expediente' },
];

export function etiquetaTipoActo(valor: string): string {
  return TIPOS_ACTO.find((t) => t.valor === valor)?.etiqueta ?? valor.replace(/_/g, ' ');
}

export const CONSTANCIAS: { valor: string; etiqueta: string }[] = [
  { valor: 'si', etiqueta: 'Sí consta la notificación' },
  { valor: 'no', etiqueta: 'No se notificó' },
  { valor: 'no_consta', etiqueta: 'No consta' },
];

export function etiquetaConstancia(valor: string | undefined): string {
  if (valor === undefined) return 'No consta';
  return CONSTANCIAS.find((c) => c.valor === valor)?.etiqueta ?? valor;
}

export interface EstadoCifra {
  titulo: string;
  resumen: string;
  tono: Tono;
  /** Regla dura de producto: solo estos estados pueden mostrar una cifra estimada. */
  muestraCifra: boolean;
}

const CONFIANZAS: Record<string, EstadoCifra> = {
  verificada: {
    titulo: 'Confianza verificada',
    resumen:
      'Las tasas y el índice aplicados son de nivel A y cubren todo el periodo. Sigue siendo una estimación.',
    tono: 'ok',
    muestraCifra: true,
  },
  parcial: {
    titulo: 'Confianza parcial',
    resumen:
      'La estimación se completó, pero algo de lo que la sostiene es de nivel B o le falta una regla al corpus. Revisa las advertencias antes de usar la cifra.',
    tono: 'aviso',
    muestraCifra: true,
  },
  insuficiente: {
    titulo: 'Confianza insuficiente',
    resumen:
      'Falta un dato del corpus para completar la estimación. Esta pantalla no muestra ninguna cifra de actualización, de recargos ni de saldo.',
    tono: 'alto',
    muestraCifra: false,
  },
  bloqueada_por_fuente: {
    titulo: 'Bloqueada por la fuente',
    resumen: 'El dato que sostiene la estimación es de nivel B sin declaración. No se muestra cifra.',
    tono: 'alto',
    muestraCifra: false,
  },
};

export function estadoCifra(confianza: string): EstadoCifra {
  return (
    CONFIANZAS[confianza] ?? {
      titulo: confianza.replace(/_/g, ' '),
      resumen: 'Estado de confianza no reconocido por esta versión de la interfaz.',
      tono: 'alto',
      muestraCifra: false,
    }
  );
}

export interface FundamentoUI {
  ordenamiento: string;
  articulo: string;
  fraccion?: string;
  inciso?: string;
  parrafo?: string;
  publicacion: string;
  archivo: string;
  linea?: number;
}

export function textoFundamento(f: FundamentoUI): string {
  const partes = [f.ordenamiento, `artículo ${f.articulo}`];
  if (f.fraccion !== undefined) partes.push(`fracción ${f.fraccion}`);
  if (f.inciso !== undefined) partes.push(`inciso ${f.inciso}`);
  if (f.parrafo !== undefined) partes.push(`párrafo ${f.parrafo}`);
  return partes.join(', ');
}

export function origenFundamento(f: FundamentoUI): string {
  return f.linea === undefined ? `Archivo ${f.archivo}` : `Archivo ${f.archivo}, línea ${f.linea}`;
}
