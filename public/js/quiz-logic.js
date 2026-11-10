// Lógica del recomendador (portada desde Encuesta.ipynb).
// Módulo puro, sin DOM: se puede importar desde el navegador y desde Node (tests).
// Las respuestas de opción múltiple usan índices base 1, igual que en el notebook.

export const PLANES = {
  maximo: 'Mantenimiento Máximo',
  moderado: 'Mantenimiento Moderado',
  minimo: 'Mantenimiento Mínimo',
  descafeinado: 'Descafeinado',
  reducir: 'Plan Reducir',
  oficina: 'Plan Oficina',
  sueno: 'Plan Sueño Sensible',
  noche: 'Plan Turno de Noche',
};

// Plan del notebook -> id del pack en varieties.js
export const PLAN_A_PACK = {
  maximo: 'mantenimiento',
  moderado: 'mantenimiento',
  minimo: 'mantenimiento',
  descafeinado: 'descafeinado',
  reducir: 'reducir',
  oficina: 'oficina',
  sueno: 'sueno-sensible',
  noche: 'turno-de-noche',
};

export const CAFEINA_POR_TAZA = 90;
export const LIMITE_CAFEINA = 400;

const SI_NO = ['Sí', 'No'];

// type: 'choice' -> valor 1..n ; 'yesno' -> boolean ; 'number' -> tazas (se guarda en mg)
export const PREGUNTAS = [
  { key: 'edad', type: 'choice', title: '¿Eres mayor de edad?', answers: ['Sí, soy mayor de 18 años', 'No, soy menor de 18 años'] },
  { key: 'embarazo_lactancia', type: 'yesno', title: '¿Estás embarazada o en periodo de lactancia?', answers: SI_NO },
  { key: 'condicion_medica', type: 'choice', title: '¿Tienes alguna enfermedad o condición médica por la que te hayan recomendado evitar o limitar el consumo de café o cafeína?', answers: ['Sí', 'No', 'No lo sé'] },
  { key: 'consumo', type: 'number', title: '¿Cuántas tazas de café consumes al día?', hint: `Cada taza de café se estima en ${CAFEINA_POR_TAZA} mg de cafeína.` },
  { key: 'objetivo', type: 'choice', title: '¿Cuál es tu principal objetivo?', answers: ['Mantener mi consumo actual', 'Reducir progresivamente mi consumo', 'Consumir la menor cantidad posible', 'Eliminar la cafeína', 'Tener energía durante mi jornada laboral', 'Mejorar mi descanso'] },
  { key: 'dependencia', type: 'yesno', title: '¿Sientes que necesitas café para funcionar o mantenerte despierto?', answers: SI_NO },
  { key: 'preferencia', type: 'choice', title: '¿Qué cantidad de cafeína te gustaría consumir?', answers: ['Alta', 'Moderada', 'Baja', 'Ninguna'] },
  { key: 'sensibilidad', type: 'choice', title: '¿Cómo te afecta la cafeína?', answers: ['No noto efectos negativos', 'Me afecta ligeramente', 'Me afecta bastante', 'Me afecta mucho'] },
  { key: 'problemas_sueno', type: 'yesno', title: '¿Tienes problemas frecuentes para dormir o sufres de insomnio?', answers: SI_NO },
  { key: 'trabajo', type: 'choice', title: '¿Cuál es tu situación laboral habitual?', answers: ['Trabajo en una oficina', 'Trabajo desde casa', 'Estudio', 'Trabajo a turnos', 'Trabajo habitualmente de noche', 'Otro'] },
  { key: 'cafe_rendimiento', type: 'yesno', title: '¿Utilizas el café principalmente para mantenerte despierto o concentrado?', answers: SI_NO },
];

export function tazasAMg(tazas) {
  return tazas * CAFEINA_POR_TAZA;
}

// ============================================================
// SISTEMA DE PUNTUACIÓN
// ============================================================

export function calcularPuntuaciones(usuario) {
  const puntos = Object.fromEntries(Object.keys(PLANES).map((p) => [p, 0]));
  const motivos = Object.fromEntries(Object.keys(PLANES).map((p) => [p, []]));
  const sumar = (plan, cantidad, motivo) => {
    puntos[plan] += cantidad;
    motivos[plan].push(motivo);
  };

  // TURNO DE NOCHE
  if (usuario.trabajo === 5) sumar('noche', 10, 'Trabajas habitualmente durante la noche.');

  // SUEÑO SENSIBLE
  if (usuario.problemas_sueno) sumar('sueno', 10, 'Has indicado que tienes problemas de sueño.');
  if (usuario.sensibilidad === 3) sumar('sueno', 3, 'La cafeína te afecta bastante.');
  else if (usuario.sensibilidad === 4) sumar('sueno', 6, 'La cafeína te afecta mucho.');
  else if (usuario.sensibilidad === 2) sumar('sueno', 1, 'Presentas cierta sensibilidad a la cafeína.');

  // PLAN REDUCIR
  if (usuario.objetivo === 2) sumar('reducir', 10, 'Quieres reducir progresivamente tu consumo.');
  if (usuario.dependencia) sumar('reducir', 5, 'Sientes que necesitas café para funcionar.');
  if (usuario.consumo > 400) sumar('reducir', 8, 'Tu consumo estimado supera los 400 mg diarios.');
  else if (usuario.consumo >= 360) sumar('reducir', 4, 'Tu consumo se encuentra cerca de la referencia general de 400 mg diarios.');
  else if (usuario.consumo >= 270) sumar('reducir', 2, 'Tu consumo estimado es relativamente elevado.');

  // PLAN OFICINA
  if (usuario.trabajo === 1 && usuario.cafe_rendimiento) sumar('oficina', 10, 'Trabajas en oficina y utilizas café para rendir.');

  // DESCAFEINADO
  if (usuario.objetivo === 4) sumar('descafeinado', 10, 'Quieres eliminar la cafeína de tu rutina.');

  // MANTENIMIENTO
  const adultoApto = usuario.edad === 1 && !usuario.embarazo_lactancia;
  if (usuario.preferencia === 1) {
    if (adultoApto && usuario.consumo <= 400) sumar('maximo', 8, 'Prefieres mantener un consumo elevado.');
    else sumar('moderado', 2, 'No se recomienda asignar automáticamente el perfil de mantenimiento máximo.');
  } else if (usuario.preferencia === 2) {
    sumar('moderado', 8, 'Prefieres un consumo moderado.');
  } else if (usuario.preferencia === 3) {
    sumar('minimo', 8, 'Prefieres consumir poca cafeína.');
  } else if (usuario.preferencia === 4) {
    sumar('descafeinado', 10, 'Prefieres eliminar la cafeína.');
  }

  // OBJETIVOS ADICIONALES
  if (usuario.objetivo === 3) sumar('minimo', 5, 'Quieres consumir la menor cantidad posible.');
  if (usuario.objetivo === 5) sumar('sueno', 5, 'Tu prioridad es mejorar el descanso.');
  if (usuario.objetivo === 6) sumar('sueno', 5, 'Quieres evitar que la cafeína afecte a tu descanso.');

  return { puntos, motivos };
}

// ============================================================
// FILTRO DE SEGURIDAD
// ============================================================

export function motivosRestriccion(usuario) {
  const avisos = [];
  if (usuario.edad === 2) avisos.push('La persona usuaria es menor de edad.');
  if (usuario.embarazo_lactancia) avisos.push('Has indicado que estás embarazada o en periodo de lactancia.');
  if (usuario.condicion_medica === 1) avisos.push('Has indicado que tienes una enfermedad o condición médica por la que te han recomendado evitar o limitar la cafeína.');
  if (usuario.condicion_medica === 3) avisos.push('No tienes claro si tu condición médica puede afectar al consumo de cafeína.');
  return avisos;
}

// ============================================================
// RECOMENDACIÓN DE PLANES
// ============================================================

const ORDEN = ['noche', 'sueno', 'descafeinado', 'reducir', 'oficina', 'minimo', 'moderado', 'maximo'];

export function recomendarPlanes(usuario, puntos) {
  if (motivosRestriccion(usuario).length) return { principal: null, secundario: null };

  const ranking = Object.keys(puntos).sort(
    (a, b) => (puntos[b] - puntos[a]) || (ORDEN.indexOf(a) - ORDEN.indexOf(b)),
  );

  const necesitaReducir = usuario.objetivo === 2 || usuario.consumo > 400 || ranking[0] === 'reducir';

  let destino;
  if (usuario.objetivo === 4 || usuario.preferencia === 4) destino = 'descafeinado';
  else if (usuario.trabajo === 5) destino = 'noche';
  else if (usuario.problemas_sueno) destino = 'sueno';
  else if (usuario.trabajo === 1 && usuario.cafe_rendimiento) destino = 'oficina';
  else destino = ranking.filter((p) => p !== 'reducir')[0];

  if (necesitaReducir) return { principal: 'reducir', secundario: destino };

  const secundarios = ranking.filter((p) => p !== destino && p !== 'reducir' && puntos[p] > 0);
  return { principal: destino, secundario: secundarios[0] ?? null };
}

// ============================================================
// AVISOS DE CONSUMO
// ============================================================

export function avisosConsumo(consumo) {
  const avisos = [];
  if (consumo > LIMITE_CAFEINA) avisos.push('Tu consumo estimado supera los 400 mg diarios. Esta cantidad supera la referencia general de seguridad para adultos sanos.');
  else if (consumo === LIMITE_CAFEINA) avisos.push('Tu consumo estimado alcanza los 400 mg diarios, la referencia general para adultos sanos.');
  else if (consumo >= 360) avisos.push('Tu consumo se encuentra cerca de los 400 mg diarios.');
  if (consumo > 200) avisos.push('Revisa también la distribución de la cafeína a lo largo del día y su efecto sobre tu descanso.');
  return avisos;
}

// Punto de entrada único: devuelve todo lo necesario para pintar el resultado.
export function evaluar(usuario) {
  const { puntos, motivos } = calcularPuntuaciones(usuario);
  const restricciones = motivosRestriccion(usuario);
  const { principal, secundario } = recomendarPlanes(usuario, puntos);
  return {
    limitada: restricciones.length > 0,
    restricciones,
    principal,
    secundario,
    puntos,
    motivos,
    consumo: usuario.consumo,
    tazas: Math.floor(usuario.consumo / CAFEINA_POR_TAZA),
    avisos: avisosConsumo(usuario.consumo),
  };
}
