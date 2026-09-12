/**
 * Registro del cuestionario. Unico lugar del modulo que conoce el archivo de datos.
 *
 * El cuestionario se valida al cargarse: si esta mal formado, el modulo falla aqui y
 * de forma ruidosa, en lugar de recorrer un arbol con ramas muertas.
 */
import { CuestionarioInvalido, validarCuestionario } from './arbol.js';
import { revisarTextos } from './lenguaje.js';
import type { Cuestionario } from './tipos.js';

import preguntas from '../../datos/diagnostico/preguntas.json' with { type: 'json' };

export const CUESTIONARIO: Cuestionario = preguntas as unknown as Cuestionario;

const errores = validarCuestionario(CUESTIONARIO);
if (errores.length > 0) throw new CuestionarioInvalido(errores);

// El guardian de lenguaje tambien alcanza al texto de las preguntas: una pregunta
// que insinua el resultado contamina el diagnostico igual que una conclusion.
revisarTextos(CUESTIONARIO, 'cuestionario');
