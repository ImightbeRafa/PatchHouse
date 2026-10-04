import { addToCart } from './core.js';
import { catalog } from './lib/store.js';
import { $, esc, formatCRC, track } from './lib/ui.js';

/* ---------- "¿Cuál parche es para mí?" quiz ---------- */
const QUESTIONS = [
  {
    q: '¿Qué querés apoyar primero?',
    a: [
      ['energy', '⚡', 'Mi energía', 'Para días largos o entrenar'],
      ['focus', '🎯', 'Mi enfoque', 'Estudio, trabajo, creatividad'],
      ['stress', '🌿', 'Mi calma', 'Días de mucha carga'],
      ['glp1', '🍽️', 'Mi rutina de alimentación', 'Hábitos y antojos'],
      ['dopamine', '☀️', 'Mi bienestar diario', 'Ánimo para el día a día'],
      ['nad', '✨', 'Mi vitalidad', 'Energía a nivel celular']
    ]
  },
  {
    q: '¿Cómo es tu día típico?',
    a: [
      ['focus', '💻', 'Mucha compu o estudio', ''],
      ['energy', '🏃', 'Activo, con ejercicio', ''],
      ['stress', '📅', 'Muchas responsabilidades', ''],
      ['glp1', '🥗', 'Cuidando lo que como', '']
    ]
  },
  {
    q: '¿Cómo querés empezar?',
    a: [
      ['single', '1️⃣', 'Con un solo parche', 'Para probar'],
      ['combo', '🎁', 'Combinando y ahorrando', 'Más fórmulas, mejor precio']
    ]
  }
];

const WHY = {
  energy: 'pensado para acompañar tus días largos y tus entrenos',
  focus: 'pensado para acompañar tus horas de estudio y trabajo',
  stress: 'pensado para acompañarte en los días de mucha carga',
  glp1: 'pensado para acompañar tu rutina de alimentación',
  dopamine: 'pensado para tu bienestar del día a día',
  nad: 'pensado para acompañar tu vitalidad'
};

function available(key) { return catalog.products[key] && !catalog.isSoldOut(key); }

/** First choice wins; fall back to the second answer, then to any in-stock patch. */
function recommend([main, day, mode]) {
  const order = [main, day, ...catalog.patches().map((p) => p.key)];
  const primary = order.find(available);
  const secondary = [day, main].find((k) => k !== primary && available(k));
  if (mode !== 'combo') return { product: catalog.products[primary], primary, secondary };
  const combos = catalog.combos().filter((c) => !catalog.isSoldOut(c.key) && c.includes.includes(primary));
  const both = secondary && combos.filter((c) => c.includes.includes(secondary)).sort((a, b) => a.includes.length - b.includes.length)[0];
  const any = combos.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || a.includes.length - b.includes.length)[0];
  return { product: both || any || catalog.products[primary], primary, secondary };
}

const quiz = $('[data-quiz]');
if (quiz) {
  const stage = $('[data-quiz-stage]', quiz);
  const bar = $('[data-quiz-bar]', quiz);
  let answers = [];

  const renderQuestion = (i) => {
    const { q, a } = QUESTIONS[i];
    bar.style.width = `${Math.round((i / QUESTIONS.length) * 100)}%`;
    stage.innerHTML = `
      <p class="quiz-step">Pregunta ${i + 1} de ${QUESTIONS.length}</p>
      <h3>${esc(q)}</h3>
      <div class="quiz-options">${a.map(([v, ico, label, sub]) => `
        <button type="button" class="quiz-opt" data-v="${esc(v)}"><span class="qi" aria-hidden="true">${ico}</span><span><b>${esc(label)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`).join('')}
      </div>
      ${i > 0 ? '<button type="button" class="quiz-back" data-back>‹ Volver</button>' : ''}`;
    stage.querySelector('.quiz-opt')?.focus({ preventScroll: true });
  };

  const renderResult = () => {
    bar.style.width = '100%';
    const { product: p, primary, secondary } = recommend(answers);
    if (!p) { stage.innerHTML = '<p>Mirá todos los parches en la <a href="#tienda">tienda</a>.</p>'; return; }
    const isCombo = p.kind === 'combo';
    const why = isCombo
      ? `Combina ${p.includes.map((k) => catalog.products[k].short).join(' + ')}: ${WHY[primary]}${secondary && p.includes.includes(secondary) ? ` y ${WHY[secondary].replace('pensado para ', '')}` : ''}.`
      : `${p.name} está ${WHY[primary]}.`;
    track('ViewContent', { content_ids: [p.key], content_name: p.name, content_type: 'product', value: p.price, currency: 'CRC' });
    stage.innerHTML = `
      <p class="quiz-step">Tu recomendación</p>
      <div class="quiz-result">
        <img src="/images/${esc(p.cardImage || p.image)}-card.webp" alt="${esc(p.name)}" width="520" height="520">
        <div>
          <h3>${esc(p.name)}</h3>
          <p>${esc(why)}</p>
          <div class="price"><b>${formatCRC(p.price)}</b>${isCombo && p.savings ? `<s>${formatCRC(p.compareAt)}</s><em>Ahorrás ${formatCRC(p.savings)}</em>` : ''}</div>
          <div class="quiz-actions">
            <button type="button" class="btn btn-cta" data-quiz-add="${esc(p.key)}">Agregar al carrito</button>
            <a class="btn btn-outline" href="${esc(p.path)}">Ver detalles</a>
          </div>
          <button type="button" class="quiz-back" data-restart>Volver a empezar</button>
        </div>
      </div>`;
  };

  stage.addEventListener('click', (e) => {
    const opt = e.target.closest('.quiz-opt');
    if (opt) {
      answers.push(opt.dataset.v);
      if (answers.length < QUESTIONS.length) renderQuestion(answers.length); else renderResult();
      return;
    }
    if (e.target.closest('[data-back]')) { answers.pop(); renderQuestion(answers.length); return; }
    if (e.target.closest('[data-restart]')) { answers = []; renderQuestion(0); return; }
    const add = e.target.closest('[data-quiz-add]');
    if (add) addToCart(add.dataset.quizAdd, 1);
  });

  renderQuestion(0);
}
