import { varieties } from './varieties.js';

/* ——— Escala de variedades: se genera desde varieties.js (única fuente de datos) ——— */
const list = document.querySelector('#lv-list');
const widths = varieties.map((_, i) => `${Math.max(22, 100 - i * (78 / Math.max(1, varieties.length - 1)))}%`);
list.innerHTML = varieties.map((v, i) => `<div class="lv${i === 0 ? ' open' : ''}" id="${v.id}">
  <button class="lv__head" type="button" aria-expanded="${i === 0}"><b>${v.name}</b><span>${v.level}</span><i style="--w:${widths[i]}"></i></button>
  <div class="lv__more"><p>${v.description}</p><a href="/shop.html#${v.id}">Ver ${v.name}</a></div></div>`).join('');
list.addEventListener('click', (e) => {
  const head = e.target.closest('.lv__head');
  if (!head) return;
  list.querySelectorAll('.lv').forEach((row) => {
    const on = row === head.parentElement;
    row.classList.toggle('open', on);
    row.querySelector('.lv__head').setAttribute('aria-expanded', String(on));
  });
});

/* ——— Secuencia: el scroll reproduce el vídeo completo (fotogramas en canvas) ——— */
const N = 100, END = 0.9, CUTS = [0.22, 0.5, 0.78];
const cv = document.getElementById('cv'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
const film = document.querySelector('.film'), beats = [...document.querySelectorAll('.beat')];
const bar = document.getElementById('bar'), cta = document.getElementById('cta');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const imgs = new Array(N);
let cur = 0, shown = -1, active = -1;

for (let i = 0; i < N; i++) {
  const im = new Image();
  im.decoding = 'async';
  im.onload = () => { imgs[i] = im; shown = -1; };
  im.src = `/media/frames/f${String(i + 1).padStart(3, '0')}.webp`;
}
const near = (i) => { for (let d = 0; d < N; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; } return null; };

function draw(pos) {
  const a = Math.floor(pos), t = pos - a, A = near(a);
  if (!A) return;
  ctx.globalAlpha = 1; ctx.drawImage(A, 0, 0, W, H);
  if (t > 0.03) { const B = near(Math.min(N - 1, a + 1)); if (B) { ctx.globalAlpha = t; ctx.drawImage(B, 0, 0, W, H); ctx.globalAlpha = 1; } }
}
const progress = () => Math.min(1, Math.max(0, -film.getBoundingClientRect().top / (film.offsetHeight - innerHeight)));

function tick() {
  const p = progress(), target = Math.min(1, p / END) * (N - 1);
  cur = reduce || Math.abs(target - cur) < 0.01 ? target : cur + (target - cur) * 0.2;
  if (Math.abs(cur - shown) > 0.001) { draw(cur); shown = cur; }
  const k = p < CUTS[0] ? 0 : p < CUTS[1] ? 1 : p < CUTS[2] ? 2 : 3;
  if (k !== active) {
    active = k;
    beats.forEach((b, i) => { b.classList.toggle('on', i === k); b.setAttribute('aria-hidden', String(i !== k)); });
    cta.classList.toggle('hide', k !== 0);
  }
  bar.style.transform = `scaleX(${p})`;
  requestAnimationFrame(tick);
}
tick();
