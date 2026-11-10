import { varieties } from './varieties.js';
import { PREGUNTAS, PLANES, PLAN_A_PACK, tazasAMg, evaluar } from './quiz-logic.js';

const form = document.querySelector('#quiz-form');
const count = document.querySelector('#question-count');
const label = document.querySelector('#progress-label');
const progress = document.querySelector('.progress-track');
const fill = document.querySelector('#progress-fill');
const title = document.querySelector('#question-title');
const answers = document.querySelector('#answers');
const next = document.querySelector('#next-question');
const back = document.querySelector('#back-question');
const result = document.querySelector('#quiz-result');
const details = document.querySelector('#result-details');
const shopLink = document.querySelector('#result-shop-link');
const panel = document.querySelector('.quiz-panel');

// En móvil, si el panel ha quedado por encima de la pantalla, lo volvemos a mostrar.
function keepPanelInView() {
  if (panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' });
}

const total = PREGUNTAS.length;
const pad = (n) => String(n).padStart(2, '0');
let current = 0;
// Respuesta "cruda" del formulario: índice 0-based para opciones, nº de tazas para la numérica.
const choices = Array(total).fill(null);

progress.setAttribute('aria-valuemax', String(total));

function isAnswered(index) {
  const value = choices[index];
  if (PREGUNTAS[index].type === 'number') return Number.isInteger(value) && value >= 0;
  return value !== null;
}

function renderNumber(question) {
  const wrapper = document.createElement('label');
  wrapper.className = 'answer-number';
  wrapper.innerHTML = `<span class="answer-letter">${question.hint}</span><input type="number" min="0" step="1" inputmode="numeric" placeholder="Nº de tazas">`;
  const input = wrapper.querySelector('input');
  if (choices[current] !== null) input.value = String(choices[current]);
  input.addEventListener('input', () => {
    const value = input.value.trim() === '' ? null : Number(input.value);
    choices[current] = Number.isInteger(value) && value >= 0 ? value : null;
    next.disabled = !isAnswered(current);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!next.disabled) next.click();
    }
  });
  answers.append(wrapper);
  input.focus({ preventScroll: true });
}

function renderChoices(question) {
  question.answers.forEach((answer, index) => {
    const option = document.createElement('label');
    option.className = `answer-option${choices[current] === index ? ' selected' : ''}`;
    option.innerHTML = `<input type="radio" name="answer" value="${index}" ${choices[current] === index ? 'checked' : ''}><span class="answer-letter">${String.fromCharCode(97 + index)}</span><span>${answer}</span><span class="answer-arrow" aria-hidden="true">↗</span>`;
    option.querySelector('input').addEventListener('change', () => {
      choices[current] = index;
      answers.querySelectorAll('.answer-option').forEach((item) => item.classList.remove('selected'));
      option.classList.add('selected');
      next.disabled = false;
    });
    answers.append(option);
  });
}

function renderQuestion() {
  const question = PREGUNTAS[current];
  count.textContent = `PREGUNTA ${pad(current + 1)} / ${pad(total)}`;
  label.textContent = `${current + 1} de ${total}`;
  progress.setAttribute('aria-valuenow', String(current + 1));
  fill.style.width = `${((current + 1) / total) * 100}%`;
  title.textContent = question.title;
  answers.replaceChildren();

  if (question.type === 'number') renderNumber(question);
  else renderChoices(question);

  back.disabled = current === 0;
  next.disabled = !isAnswered(current);
  next.innerHTML = current === total - 1 ? 'Ver mi resultado <span>↗</span>' : 'Siguiente <span>→</span>';
}

// Convierte las respuestas del formulario al objeto `usuario` del notebook.
function buildUsuario() {
  const usuario = {};
  PREGUNTAS.forEach((question, index) => {
    const value = choices[index];
    if (question.type === 'number') usuario[question.key] = tazasAMg(value);
    else if (question.type === 'yesno') usuario[question.key] = value === 0;
    else usuario[question.key] = value + 1;
  });
  return usuario;
}

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function list(items) {
  const ul = el('ul');
  items.forEach((item) => ul.append(el('li', item)));
  return ul;
}

function showResult() {
  const r = evaluar(buildUsuario());
  details.replaceChildren();

  const profile = el('div', null, 'result-block');
  profile.append(el('h3', 'Tu perfil'), list([
    `Consumo estimado: ${r.consumo} mg/día (${r.tazas} ${r.tazas === 1 ? 'taza' : 'tazas'})`,
  ]));

  if (r.limitada) {
    document.querySelector('#result-title').textContent = 'Recomendación limitada';
    document.querySelector('#result-level').textContent = 'Consulta con un profesional sanitario';
    document.querySelector('#result-copy').textContent = 'No podemos generar una recomendación personalizada de consumo de cafeína para este perfil. Consulta con un profesional sanitario para establecer una pauta adecuada.';
    document.querySelector('#result-reason').textContent = r.restricciones.join(' ');
    details.append(profile);
    shopLink.hidden = true;
  } else {
    const variety = varieties.find((v) => v.id === PLAN_A_PACK[r.principal]);
    document.querySelector('#result-title').textContent = variety.name;
    document.querySelector('#result-level').textContent = PLANES[r.principal];
    document.querySelector('#result-copy').textContent = variety.description;
    document.querySelector('#result-reason').textContent = `${variety.fit} Tus respuestas apuntan al pack ${variety.rank} de ${varieties.length} de AMARO.`;

    if (r.motivos[r.principal].length) {
      const why = el('div', null, 'result-block');
      why.append(el('h3', '¿Por qué te recomendamos este plan?'), list(r.motivos[r.principal]));
      details.append(why);
    }

    if (r.secundario) {
      const sec = el('div', null, 'result-block');
      const heading = r.principal === 'reducir'
        ? `Una vez reducido tu consumo, tu plan de destino sería: ${PLANES[r.secundario]}`
        : `Plan complementario: ${PLANES[r.secundario]}`;
      sec.append(el('h3', heading));
      if (r.motivos[r.secundario].length) sec.append(list(r.motivos[r.secundario]));
      details.append(sec);
    }

    details.append(profile);
    shopLink.hidden = false;
    shopLink.href = `/shop.html#${variety.id}`;
    shopLink.innerHTML = `Ver ${variety.name} <span>↗</span>`;
  }

  if (r.avisos.length) {
    const warn = el('div', null, 'result-block result-warning');
    warn.append(el('h3', 'Aviso'), list(r.avisos));
    details.append(warn);
  }

  form.hidden = true;
  result.hidden = false;
}

next.addEventListener('click', () => {
  if (!isAnswered(current)) return;
  if (current < total - 1) {
    current += 1;
    renderQuestion();
  } else {
    showResult();
  }
  keepPanelInView();
});
back.addEventListener('click', () => {
  if (current > 0) {
    current -= 1;
    renderQuestion();
    keepPanelInView();
  }
});
document.querySelector('#restart-quiz').addEventListener('click', () => {
  current = 0;
  choices.fill(null);
  result.hidden = true;
  form.hidden = false;
  renderQuestion();
  keepPanelInView();
});

renderQuestion();
