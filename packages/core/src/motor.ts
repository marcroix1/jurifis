import { Almanaque } from './calendario.js';
import {
  aDias, aFecha, nombreDiaSemana, sumarAnios, sumarDias, sumarMeses, type FechaISO,
} from './fecha.js';
import type {
  Confianza, DiaInhabil, EntradaComputo, Fundamento, PasoTraza, ReglaPlazo, ResultadoComputo,
} from './tipos.js';

const AVISO_BASE =
  'Este computo no sustituye la verificacion del abogado responsable ni constituye computo oficial.';

function vacio(
  confianza: Confianza,
  traza: PasoTraza[],
  fuentes: Fundamento[],
  faltantes: string[],
  advertencias: string[],
): ResultadoComputo {
  return {
    confianza,
    vence: null,
    surteEfectos: null,
    inicioComputo: null,
    diasTranscurridos: null,
    diasRestantes: null,
    inhabilesAplicados: [],
    traza,
    fuentes,
    faltantes,
    advertencias: [AVISO_BASE, ...advertencias],
  };
}

function dentroDeSuspension(f: FechaISO, entrada: EntradaComputo): string | null {
  for (const s of entrada.suspensiones ?? []) {
    if (aDias(f) >= aDias(s.desde) && aDias(f) <= aDias(s.hasta)) return s.motivo;
  }
  return null;
}

/**
 * Calcula un plazo y devuelve la fecha con la traza de como se obtuvo.
 *
 * Regla que gobierna todo el modulo: si algo falta, no se estima. Se devuelve
 * confianza degradada, sin fecha, y la lista de lo que hace falta.
 */
export function calcularPlazo(
  entrada: EntradaComputo,
  regla: ReglaPlazo,
  almanaque: Almanaque,
): ResultadoComputo {
  const traza: PasoTraza[] = [];
  const fuentes: Fundamento[] = [regla.fundamento];
  const faltantes: string[] = [];
  const advertencias: string[] = [];

  // Paso 1. La regla vigente a la fecha del acto, no a la de hoy.
  const notif = entrada.fechaNotificacion;
  if (aDias(notif) < aDias(regla.vigenteDesde)) {
    return vacio('insuficiente', traza, fuentes, [
      `La regla ${regla.id} rige desde ${regla.vigenteDesde} y la notificacion es del ${notif}. Hace falta cargar el texto anterior.`,
    ], advertencias);
  }
  if (regla.vigenteHasta !== null && aDias(notif) > aDias(regla.vigenteHasta)) {
    return vacio('insuficiente', traza, fuentes, [
      `La regla ${regla.id} dejo de regir el ${regla.vigenteHasta}. Hace falta cargar la reforma posterior.`,
    ], advertencias);
  }
  traza.push({
    paso: 1,
    concepto: 'regla aplicable',
    detalle: `${regla.descripcion}. Plazo de ${regla.plazo.cantidad} ${regla.plazo.unidad.replace('_', ' ')}.`,
    fundamento: regla.fundamento,
  });

  // Nivel de fuente. Nivel B sin declaracion de un abogado no calcula.
  if (regla.nivelFuente === 'B' && regla.vigenciaDeclaradaPor === undefined) {
    return vacio('bloqueada_por_fuente', traza, fuentes, [
      `La regla ${regla.id} se apoya en fuente de nivel B sin declaracion de vigencia. Hace falta el texto oficial o la declaracion del abogado responsable.`,
    ], advertencias);
  }

  // Paso 2. Surtimiento de efectos segun la forma en que se practico la notificacion.
  const rs = regla.surtimiento.find((s) => s.forma === entrada.formaNotificacion);
  if (rs === undefined) {
    return vacio('insuficiente', traza, fuentes, [
      `La regla ${regla.id} no tiene regla de surtimiento para la forma "${entrada.formaNotificacion}". Hace falta el precepto que la fija.`,
    ], advertencias);
  }
  fuentes.push(rs.fundamento);

  let surte = notif;
  if (rs.desplazamiento > 0) {
    if (rs.unidad === 'dias_habiles') {
      for (let i = 0; i < rs.desplazamiento; i++) surte = almanaque.siguienteHabil(surte);
    } else {
      surte = sumarDias(surte, rs.desplazamiento);
    }
  }
  traza.push({
    paso: 2,
    concepto: 'surtimiento de efectos',
    fecha: surte,
    detalle:
      rs.desplazamiento === 0
        ? `Notificacion ${entrada.formaNotificacion} del ${notif}: surte efectos el mismo dia.`
        : `Notificacion ${entrada.formaNotificacion} del ${notif}: surte efectos ${rs.desplazamiento} ${rs.unidad.replace('_', ' ')} despues, el ${surte} (${nombreDiaSemana(surte)}).`,
    fundamento: rs.fundamento,
  });

  // Paso 3. Primer dia del computo.
  let inicio: FechaISO;
  if (regla.inicio.primerDia === 'mismo_dia') inicio = surte;
  else if (regla.inicio.primerDia === 'siguiente_natural') inicio = sumarDias(surte, 1);
  else inicio = almanaque.siguienteHabil(surte);
  traza.push({
    paso: 3,
    concepto: 'inicio del computo',
    fecha: inicio,
    detalle: `El plazo corre a partir del ${inicio} (${nombreDiaSemana(inicio)}).`,
    fundamento: regla.fundamento,
  });

  // Paso 4. Cobertura del calendario.
  //
  // Se verifica contra el periodo REALMENTE recorrido, no contra una ventana
  // estimada por exceso. Una ventana generosa produce el falso negativo mas
  // caro que existe aqui: negarse a calcular un plazo que si esta cubierto,
  // solo porque la estimacion se asomo a un anio que nadie iba a tocar.
  //
  // Por eso el paso 4 se emite despues del conteo, cuando ya se sabe hasta
  // que dia llego el plazo. Sigue siendo fail closed: si el periodo recorrido
  // toca un anio sin cargar o un hueco declarado, no se devuelve fecha.

  // Pasos 5 y 6. Conteo con las suspensiones registradas.
  const inhabilesAplicados: DiaInhabil[] = [];
  let vence: FechaISO;
  let notaConteo: string;

  if (regla.plazo.unidad === 'dias_habiles') {
    let contados = 0;
    let cursor = aDias(inicio);
    let guarda = 0;
    while (contados < regla.plazo.cantidad) {
      if (guarda++ > 4000) throw new Error(`Conteo desbocado en la regla ${regla.id}.`);
      const f = aFecha(cursor);
      const motivos = almanaque.motivos(f);
      const susp = dentroDeSuspension(f, entrada);
      if (susp !== null) {
        inhabilesAplicados.push({ fecha: f, motivo: `Suspension: ${susp}`, fundamento: 'Evento registrado en el expediente' });
      } else if (motivos.length > 0) {
        inhabilesAplicados.push(...motivos);
      } else {
        contados++;
        if (contados === regla.plazo.cantidad) {
          vence = f;
          break;
        }
      }
      cursor++;
    }
    vence = vence!;
    notaConteo = `Se contaron ${regla.plazo.cantidad} dias habiles y se descartaron ${inhabilesAplicados.length} dias.`;
  } else if (regla.plazo.unidad === 'dias_naturales') {
    let fin = sumarDias(inicio, regla.plazo.cantidad - 1);
    for (const s of entrada.suspensiones ?? []) {
      const dias = aDias(s.hasta) - aDias(s.desde) + 1;
      if (aDias(s.desde) <= aDias(fin) && aDias(s.hasta) >= aDias(inicio)) {
        fin = sumarDias(fin, dias);
        inhabilesAplicados.push({ fecha: s.desde, motivo: `Suspension: ${s.motivo}`, fundamento: s.fundamento });
      }
    }
    vence = fin;
    notaConteo = `Se contaron ${regla.plazo.cantidad} dias naturales.`;
  } else {
    const n = regla.plazo.cantidad;
    const r = regla.plazo.unidad === 'meses' ? sumarMeses(inicio, n) : sumarAnios(inicio, n);
    vence = r.fecha;
    notaConteo = r.diaInexistente
      ? `Plazo por ${regla.plazo.unidad}. El dia equivalente no existe en el mes destino, se aplica la regla del ordenamiento.`
      : `Plazo por ${regla.plazo.unidad}, vence el mismo dia del periodo posterior.`;
    if (r.diaInexistente) advertencias.push('El dia equivalente no existe en el mes de vencimiento. Verifica la regla especifica del ordenamiento.');
  }

  const huecos = almanaque.cobertura(inicio, vence);
  if (huecos.length > 0) {
    traza.push({
      paso: 4,
      concepto: 'cobertura del calendario',
      detalle: `El plazo recorre del ${inicio} al ${vence} y el calendario no cubre todo ese periodo. El motor se detiene aqui en lugar de estimar.`,
    });
    return vacio('insuficiente', traza, fuentes, huecos, advertencias);
  }
  traza.push({
    paso: 4,
    concepto: 'cobertura del calendario',
    detalle: `Completa para el periodo del ${inicio} al ${vence}. Calendarios aplicados: ${almanaque.ids.join(', ')}.`,
  });
  traza.push({ paso: 5, concepto: 'conteo', fecha: vence, detalle: notaConteo });
  traza.push({
    paso: 6,
    concepto: 'suspensiones',
    detalle:
      (entrada.suspensiones ?? []).length === 0
        ? 'Ninguna registrada en el expediente. El motor no infiere suspensiones.'
        : `Se aplicaron ${(entrada.suspensiones ?? []).length} suspensiones registradas.`,
  });

  // Paso 7. Prorroga si el vencimiento cae inhabil.
  const antesDeProrroga = vence;
  let prorrogado = false;
  if (regla.prorrogaSiVenceInhabil && !almanaque.esHabil(vence)) {
    vence = almanaque.siguienteHabil(vence);
    prorrogado = true;
  }
  traza.push({
    paso: 7,
    concepto: 'prorroga por vencimiento inhabil',
    fecha: vence,
    detalle: prorrogado
      ? `El ${antesDeProrroga} era inhabil, el plazo se recorre al ${vence} (${nombreDiaSemana(vence)}).`
      : 'No aplico. El ultimo dia del plazo es habil.',
    fundamento: regla.fundamento,
  });

  // Paso 8. Dias transcurridos y restantes contra la fecha de referencia.
  let transcurridos: number | null = null;
  let restantes: number | null = null;
  if (entrada.hoy !== undefined) {
    const hoy = entrada.hoy;
    let t = 0;
    for (let d = aDias(inicio); d <= aDias(hoy) && d <= aDias(vence); d++) {
      if (almanaque.esHabil(aFecha(d)) && dentroDeSuspension(aFecha(d), entrada) === null) t++;
    }
    // El conteo arranca en el inicio del computo, nunca antes: si la fecha de
    // referencia es anterior, los dias entre la notificacion y el inicio no son
    // dias del plazo y no deben sumarse a los restantes.
    let r = 0;
    for (let d = Math.max(aDias(hoy) + 1, aDias(inicio)); d <= aDias(vence); d++) {
      if (almanaque.esHabil(aFecha(d)) && dentroDeSuspension(aFecha(d), entrada) === null) r++;
    }
    transcurridos = t;
    restantes = r;
  }

  const confianza: Confianza =
    regla.nivelFuente === 'B' || almanaque.nivelMinimo === 'B' ? 'parcial' : 'verificada';

  if (confianza === 'parcial') {
    if (regla.nivelFuente === 'B') {
      const d = regla.vigenciaDeclaradaPor!;
      advertencias.push(
        `La regla se apoya en fuente de nivel B. Vigencia declarada por ${d.persona} el ${d.fecha}: ${d.nota}`,
      );
      faltantes.push('Texto oficial integro y vigente del ordenamiento que sostiene esta regla.');
    }
    if (almanaque.nivelMinimo === 'B') {
      advertencias.push('Alguno de los calendarios aplicados es de nivel B.');
      faltantes.push('Acuerdo o publicacion oficial que respalde el calendario de dias inhabiles.');
    }
  }

  traza.push({
    paso: 8,
    concepto: 'traza emitida',
    fecha: vence,
    detalle: `Vence el ${vence} (${nombreDiaSemana(vence)}). Confianza: ${confianza}.`,
  });

  return {
    confianza,
    vence,
    surteEfectos: surte,
    inicioComputo: inicio,
    diasTranscurridos: transcurridos,
    diasRestantes: restantes,
    inhabilesAplicados,
    traza,
    fuentes,
    faltantes,
    advertencias: [AVISO_BASE, ...advertencias],
  };
}
