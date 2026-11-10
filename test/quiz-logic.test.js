import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluar, PLAN_A_PACK, PLANES, PREGUNTAS } from '../public/js/quiz-logic.js';
import { varieties } from '../public/js/varieties.js';

const base = {
  edad: 1, embarazo_lactancia: false, condicion_medica: 2, consumo: 180,
  objetivo: 1, dependencia: false, preferencia: 2, sensibilidad: 1,
  problemas_sueno: false, trabajo: 6, cafe_rendimiento: false,
};
const u = (over) => ({ ...base, ...over });

test('cada plan apunta a un pack existente', () => {
  for (const plan of Object.keys(PLANES)) {
    assert.ok(varieties.some((v) => v.id === PLAN_A_PACK[plan]), plan);
  }
});

test('hay 11 preguntas como en el notebook', () => assert.equal(PREGUNTAS.length, 11));

test('ejemplo del notebook: menor de edad -> recomendación limitada', () => {
  const r = evaluar(u({ edad: 2, consumo: 540, objetivo: 3, dependencia: true, preferencia: 1, sensibilidad: 4, problemas_sueno: true, trabajo: 3, cafe_rendimiento: true }));
  assert.equal(r.limitada, true);
  assert.equal(r.principal, null);
  assert.equal(r.consumo, 540);
});

test('embarazo o condición médica (Sí / No lo sé) -> limitada', () => {
  assert.equal(evaluar(u({ embarazo_lactancia: true })).limitada, true);
  assert.equal(evaluar(u({ condicion_medica: 1 })).limitada, true);
  assert.equal(evaluar(u({ condicion_medica: 3 })).limitada, true);
});

test('perfil moderado sin más -> Mantenimiento Moderado sin secundario', () => {
  const r = evaluar(u({}));
  assert.equal(r.principal, 'moderado');
  assert.equal(r.secundario, null);
});

test('más de 400 mg -> Reducir como principal + destino', () => {
  const r = evaluar(u({ consumo: 450, problemas_sueno: true }));
  assert.equal(r.principal, 'reducir');
  assert.equal(r.secundario, 'sueno');
  assert.ok(r.avisos[0].includes('supera los 400'));
});

test('trabajo nocturno -> Turno de noche', () => {
  assert.equal(evaluar(u({ trabajo: 5 })).principal, 'noche');
});

test('oficina + café para rendir -> Oficina', () => {
  const r = evaluar(u({ trabajo: 1, cafe_rendimiento: true }));
  assert.equal(r.principal, 'oficina');
  assert.equal(r.secundario, 'moderado');
});

test('eliminar cafeína gana a todo salvo reducir', () => {
  assert.equal(evaluar(u({ objetivo: 4, trabajo: 5 })).principal, 'descafeinado');
  assert.equal(evaluar(u({ preferencia: 4 })).principal, 'descafeinado');
});

test('preferencia alta con >400 mg no da Máximo', () => {
  const r = evaluar(u({ preferencia: 1, consumo: 450 }));
  assert.equal(r.puntos.maximo, 0);
  assert.equal(r.principal, 'reducir');
  assert.equal(r.secundario, 'moderado');
});

test('avisos de consumo por tramos', () => {
  assert.equal(evaluar(u({ consumo: 180 })).avisos.length, 0);
  assert.equal(evaluar(u({ consumo: 270 })).avisos.length, 1);
  assert.ok(evaluar(u({ consumo: 360 })).avisos[0].includes('cerca'));
});
