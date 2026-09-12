/**
 * Modo demostracion publica.
 *
 * Cuando DEMO_PUBLICA vale 1, quedan apagadas las rutas que reciben datos
 * personales o que exponen administracion: el panel, el alta de prospectos y
 * la escritura de expedientes. Las herramientas de consulta siguen abiertas
 * porque no guardan nada.
 *
 * Motivo: en el momento en que alguien teclea su nombre y su telefono en una
 * URL publica, el despacho esta tratando datos personales. Eso necesita aviso
 * de privacidad y consentimiento, y esto es una demostracion.
 */
export const DEMO_PUBLICA = process.env.DEMO_PUBLICA === '1';

export const AVISO_DEMO =
  'Apagado en la demostración pública. Esta función recibe datos personales o administra la plataforma, y se habilita solo en la instalación del despacho, con aviso de privacidad y control de acceso.';

export function respuestaApagada(): Response {
  return Response.json(
    { error: 'funcion_apagada_en_demostracion_publica', detalle: AVISO_DEMO },
    { status: 503 },
  );
}
