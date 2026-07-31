/**
 * bip39dice.com — interactive guided tutorial
 * Method: veebch/Bip39-Dice (odd/even bits, powers of two, BIP-39 list)
 */

import { rollDie, facesToWord, POWERS, candidateLastWords, WORDLIST } from './crypto.js';

const TOTAL_STEPS = 8; // 0..7
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let step = 0;
let practicedOnce = false;

/** @type {(number|null)[]} */
let faces = Array(11).fill(null);
/** @type {(number|null)[]} user-entered bits in quiz */
let userBits = Array(11).fill(null);
let bitQuizIndex = 0;
let rollMode = 'sim'; // sim | phys
/** labPhase: 0 rolls · 1 bits quiz · 2 sum · 3 list pick · 4 done */
let labPhase = 0;
let correctIndex = null;
let correctWord = null;

const progressWrap = $('#progress-wrap');
const progressFill = $('#progress-fill');
const progressLabel = $('#progress-label');
const live = $('#live');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function filledCount() {
  return faces.filter((f) => f != null).length;
}

function allFilled() {
  return filledCount() === 11;
}

function recomputeAnswer() {
  if (!allFilled()) {
    correctIndex = null;
    correctWord = null;
    return;
  }
  const r = facesToWord(faces);
  correctIndex = r.index;
  correctWord = r.word;
}

function goTo(n) {
  step = Math.max(0, Math.min(TOTAL_STEPS - 1, n));
  $$('.step').forEach((el) => {
    const s = Number(el.dataset.step);
    const on = s === step;
    el.hidden = !on;
    el.classList.toggle('active', on);
  });

  if (step === 0) {
    progressWrap.hidden = true;
  } else {
    progressWrap.hidden = false;
    progressFill.style.width = `${(step / (TOTAL_STEPS - 1)) * 100}%`;
    progressLabel.textContent = `${step} / ${TOTAL_STEPS - 1}`;
  }

  if (step === 1) renderSeedPreview();
  if (step === 3) animatePipeline();
  if (step === 4) resetLab();
  if (step === 5) animateSeedSlots();
  if (step === 6 && !practicedOnce) {
    $('#practice-box').hidden = true;
    $('#practice-nav').hidden = true;
    $('#practice-hint').hidden = false;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  live.textContent = `Step ${step}`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#lab-next') || e.target.closest('#lab-back')) return;
  if (e.target.closest('#step-4')) return; // lab has its own controls
  if (e.target.closest('[data-next]')) goTo(step + 1);
  if (e.target.closest('[data-back]')) goTo(step - 1);
});

// Allow data-next/back outside lab except when in step 4 nav handled separately
// Actually step 1-3 still use data-next - the #step-4 return blocks ALL clicks inside step-4 including... wait, clicks on data-next outside step-4 are fine.
// Clicks inside step-4 that aren't lab-next: mode buttons etc. shouldn't trigger global next. Good.
// But wait - document handler returns early for entire #step-4, so data-next inside step-4 wouldn't work - we only have lab-next. Good.

$('#btn-restart')?.addEventListener('click', () => {
  practicedOnce = false;
  goTo(0);
});

// ——— Step 1 ———
function renderSeedPreview() {
  const el = $('#seed-preview');
  if (!el || el.dataset.ready) return;
  const demo = [
    'ocean',
    'brave',
    'sunset',
    'river',
    'candle',
    'forest',
    'silver',
    'meadow',
    'orbit',
    'gentle',
    'harbor',
    '???',
  ];
  el.innerHTML = demo
    .map(
      (w, i) => `
      <div class="slot ${i === 11 ? 'last' : ''}" style="animation-delay:${i * 0.05}s">
        <span class="n">${i + 1}</span>
        <span class="w">${w}</span>
      </div>`
    )
    .join('');
  el.dataset.ready = '1';
}

// ——— Step 3 ———
async function animatePipeline() {
  const nodes = $$('[data-pipe]');
  nodes.forEach((n) => n.classList.remove('on'));
  for (let i = 0; i < nodes.length; i++) {
    await sleep(280);
    nodes[i].classList.add('on');
  }
}

// ——— Lab ———
const LAB_META = [
  {
    kicker: 'Part 1 of 4',
    title: 'Get 11 rolls',
    lede: 'One die is enough — roll it eleven times. Or enter faces from a real die.',
  },
  {
    kicker: 'Part 2 of 4',
    title: 'Mark odd or even',
    lede: 'You decide for each roll. Odd → 0. Even → 1. (Wrong answers won’t pass.)',
  },
  {
    kicker: 'Part 3 of 4',
    title: 'Add it up',
    lede: 'Where the bit is 1, add that power of two. Type the total yourself.',
  },
  {
    kicker: 'Part 4 of 4',
    title: 'Find your word',
    lede: 'Use the full BIP-39 list below. Search or scroll — tap the correct word.',
  },
  {
    kicker: 'Done',
    title: 'You made a seed word',
    lede: 'That’s the same process you’d do on paper. Never fund a word from a website.',
  },
];

function setLabCopy(phase) {
  const m = LAB_META[Math.min(phase, 4)];
  $('#lab-kicker').textContent = m.kicker;
  $('#lab-title').textContent = m.title;
  $('#lab-lede').textContent = m.lede;
}

function showPhase(phase) {
  labPhase = phase;
  setLabCopy(phase);
  $('#lab-phase-a').hidden = phase !== 0;
  $('#lab-phase-b').hidden = phase !== 1;
  $('#lab-phase-c').hidden = phase !== 2;
  $('#lab-phase-d').hidden = phase !== 3 && phase !== 4;
  // When done, keep list visible under success
  if (phase === 4) {
    $('#lab-phase-d').hidden = false;
  }

  const nav = $('#lab-nav');
  const hint = $('#lab-hint');
  const next = $('#lab-next');

  if (phase === 0) {
    nav.hidden = !allFilled();
    next.textContent = 'Next: mark odd / even';
    hint.hidden = allFilled();
    hint.textContent = 'Fill all 11 rolls to continue';
  } else if (phase === 1) {
    nav.hidden = true;
    hint.hidden = true;
  } else if (phase === 2) {
    nav.hidden = true;
    hint.hidden = true;
  } else if (phase === 3) {
    nav.hidden = true;
    hint.hidden = true;
  } else if (phase === 4) {
    nav.hidden = false;
    next.textContent = 'See the full seed';
    hint.hidden = true;
  }
}

function resetLab() {
  faces = Array(11).fill(null);
  userBits = Array(11).fill(null);
  bitQuizIndex = 0;
  correctIndex = null;
  correctWord = null;
  rollMode = 'sim';
  $$('.mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.rollMode === 'sim'));
  $('#sim-controls').hidden = false;
  $('#phys-controls').hidden = true;
  $('#sum-input').value = '';
  $('#sum-feedback').hidden = true;
  $('#list-feedback').hidden = true;
  $('#bit-feedback').hidden = true;
  $('#word-found').hidden = true;
  $('#list-search').value = '';
  renderDieTray();
  updateRollProgress();
  showPhase(0);
}

function renderDieTray() {
  const tray = $('#die-tray');
  tray.innerHTML = faces
    .map((face, i) => {
      const empty = face == null;
      const current = empty && faces.findIndex((f) => f == null) === i;
      return `<button type="button" class="die ${empty ? 'empty' : 'locked'} ${
        current ? 'current' : ''
      }" data-i="${i}" aria-label="Roll ${i + 1}${face != null ? `: ${face}` : ''}">${
        face ?? i + 1
      }</button>`;
    })
    .join('');

  $$('.die', tray).forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.i);
      if (faces[i] != null) {
        // Re-roll this slot if in sim mode
        if (rollMode === 'sim') setFace(i, rollDie(), true);
      }
    });
  });
}

function updateRollProgress() {
  const n = filledCount();
  $('#roll-progress').textContent = `${n} of 11 rolls`;
  $('#btn-clear-rolls').hidden = n === 0;
  $('#btn-roll-one').disabled = allFilled();
  $('#btn-roll-one').textContent = allFilled() ? 'All 11 filled' : `Roll die #${n + 1}`;
  if (labPhase === 0) {
    $('#lab-nav').hidden = !allFilled();
    $('#lab-hint').hidden = allFilled();
  }
}

async function setFace(index, face, animate = false) {
  faces[index] = face;
  const el = $(`.die[data-i="${index}"]`);
  if (el) {
    el.classList.remove('empty');
    el.classList.add('locked');
    if (animate) {
      el.classList.add('rolling');
      for (let f = 0; f < 4; f++) {
        el.textContent = String(rollDie());
        await sleep(30);
      }
      el.classList.remove('rolling');
    }
    el.textContent = String(face);
    el.setAttribute('aria-label', `Roll ${index + 1}: ${face}`);
  }
  recomputeAnswer();
  renderDieTray();
  updateRollProgress();
  live.textContent = `Roll ${index + 1}: ${face}`;
}

async function rollNext() {
  const idx = faces.findIndex((f) => f == null);
  if (idx < 0) return;
  await setFace(idx, rollDie(), true);
}

function enterPhysicalFace(face) {
  const idx = faces.findIndex((f) => f == null);
  if (idx < 0) return;
  setFace(idx, face, false);
}

// Mode toggle
$$('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    rollMode = btn.dataset.rollMode;
    $$('.mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
    $('#sim-controls').hidden = rollMode !== 'sim';
    $('#phys-controls').hidden = rollMode !== 'phys';
  });
});

$('#btn-roll-one')?.addEventListener('click', rollNext);
$('#btn-clear-rolls')?.addEventListener('click', () => {
  faces = Array(11).fill(null);
  renderDieTray();
  updateRollProgress();
  recomputeAnswer();
});

$$('#face-pad button').forEach((btn) => {
  btn.addEventListener('click', () => enterPhysicalFace(Number(btn.dataset.face)));
});

// ——— Bits quiz ———
function startBitsQuiz() {
  userBits = Array(11).fill(null);
  bitQuizIndex = 0;
  showPhase(1);
  renderBitStrip();
  showBitQuestion();
}

function renderBitStrip() {
  const strip = $('#bit-strip');
  strip.innerHTML = faces
    .map((face, i) => {
      const b = userBits[i];
      return `<div class="strip-cell ${b != null ? 'done' : ''} ${
        i === bitQuizIndex ? 'focus' : ''
      }">
        <span class="sc-face">${face}</span>
        <span class="sc-bit">${b == null ? '·' : b}</span>
      </div>`;
    })
    .join('');
}

function showBitQuestion() {
  if (bitQuizIndex >= 11) {
    // All correct
    showPhase(2);
    startSumPhase();
    return;
  }
  const face = faces[bitQuizIndex];
  $('#bit-quiz-count').textContent = `Die ${bitQuizIndex + 1} of 11`;
  $('#bit-quiz-die').textContent = String(face);
  $('#bit-feedback').hidden = true;
  renderBitStrip();
}

function answerBit(chosenBit) {
  const face = faces[bitQuizIndex];
  const correct = face % 2 === 0 ? 1 : 0;
  const fb = $('#bit-feedback');
  if (chosenBit !== correct) {
    fb.hidden = false;
    fb.className = 'quiz-feedback bad';
    fb.textContent =
      chosenBit === 1
        ? `${face} is odd, not even. Odd → 0. Try again.`
        : `${face} is even, not odd. Even → 1. Try again.`;
    live.textContent = 'Wrong — try again';
    return;
  }
  userBits[bitQuizIndex] = correct;
  fb.hidden = false;
  fb.className = 'quiz-feedback good';
  fb.textContent = 'Correct.';
  bitQuizIndex++;
  renderBitStrip();
  setTimeout(() => showBitQuestion(), 350);
}

$('#btn-odd')?.addEventListener('click', () => answerBit(0));
$('#btn-even')?.addEventListener('click', () => answerBit(1));

// ——— Sum phase ———
function startSumPhase() {
  const rows = $('#calc-rows');
  let running = 0;
  rows.innerHTML = userBits
    .map((bit, i) => {
      const power = POWERS[i];
      const contrib = bit ? power : 0;
      running += contrib;
      return `<div class="calc-row ${bit ? 'active' : 'dim'}">
        <span class="cr-bit">#${i + 1}</span>
        <span class="cr-eq">${bit} × ${power}</span>
        <span class="cr-sum">${bit ? `+${power}` : '+0'}</span>
      </div>`;
    })
    .join('');
  // Don't show answer in running total until they submit - show sum of visible adds as hint?
  // Show running total of the bits they set (same as answer) - actually that gives it away.
  // Better: hide the answer, show "add the + rows" and empty running until check
  $('#calc-running').textContent = '—';
  $('#sum-input').value = '';
  $('#sum-feedback').hidden = true;
}

$('#sum-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = Number($('#sum-input').value);
  const fb = $('#sum-feedback');
  recomputeAnswer();
  if (val !== correctIndex) {
    fb.hidden = false;
    fb.className = 'quiz-feedback bad';
    fb.textContent = 'Not quite. Add every power of two where the bit is 1.';
    // Optionally show running total of correct after 2 fails? Keep simple.
    return;
  }
  fb.hidden = false;
  fb.className = 'quiz-feedback good';
  fb.textContent = `Yes — ${correctIndex}.`;
  $('#calc-running').textContent = String(correctIndex);
  setTimeout(() => startListPhase(), 500);
});

// ——— Word list phase ———
function startListPhase() {
  showPhase(3);
  $('#find-index').textContent = String(correctIndex);
  $('#word-found').hidden = true;
  $('#list-feedback').hidden = true;
  $('#list-search').value = '';
  renderFullWordlist('');
  live.textContent = `Find index ${correctIndex}`;
}

function renderFullWordlist(query) {
  const el = $('#wordlist');
  const q = (query || '').trim().toLowerCase();
  let items = [];

  if (!q) {
    el.innerHTML = `<p class="list-empty">Type your number (e.g. <strong>${correctIndex}</strong>) or the start of a word, then tap the matching row.</p>`;
    return;
  }

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    if (n < 0 || n > 2047) {
      el.innerHTML = `<p class="list-empty">Index must be between 0 and 2047.</p>`;
      return;
    }
    const start = Math.max(0, n - 8);
    const end = Math.min(2048, n + 25);
    for (let i = start; i < end; i++) items.push(i);
  } else {
    for (let i = 0; i < 2048; i++) {
      if (WORDLIST[i].startsWith(q)) items.push(i);
      if (items.length >= 60) break;
    }
    if (items.length < 20) {
      for (let i = 0; i < 2048; i++) {
        if (!WORDLIST[i].startsWith(q) && WORDLIST[i].includes(q)) items.push(i);
        if (items.length >= 60) break;
      }
    }
  }

  if (items.length === 0) {
    el.innerHTML = `<p class="list-empty">No matches. Try a number 0–2047 or the start of a word.</p>`;
    return;
  }

  el.innerHTML = items
    .map((idx) => {
      return `<button type="button" class="wl-row" data-idx="${idx}" role="listitem">
        <span class="wl-num">${idx}</span>
        <span class="wl-word">${WORDLIST[idx]}</span>
      </button>`;
    })
    .join('');

  $$('.wl-row', el).forEach((btn) => {
    btn.addEventListener('click', () => pickWord(Number(btn.dataset.idx), btn));
  });
}

function pickWord(idx, btn) {
  const fb = $('#list-feedback');
  if (idx !== correctIndex) {
    fb.hidden = false;
    fb.className = 'quiz-feedback bad';
    fb.textContent = `That’s “${WORDLIST[idx]}” (#${idx}). You need #${correctIndex}.`;
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
    return;
  }

  btn.classList.add('hit', 'land');
  fb.hidden = true;
  $('#word-found-text').textContent = correctWord;
  $('#word-found-meta').textContent = `Index ${correctIndex} · you looked it up yourself`;
  $('#word-found').hidden = false;
  showPhase(4);
  live.textContent = `Word: ${correctWord}`;
}

$('#list-search')?.addEventListener('input', (e) => {
  renderFullWordlist(e.target.value);
});

// Lab nav
$('#lab-next')?.addEventListener('click', () => {
  if (labPhase === 0 && allFilled()) {
    startBitsQuiz();
  } else if (labPhase === 4) {
    goTo(5);
  }
});

$('#lab-back')?.addEventListener('click', () => {
  if (labPhase === 0) {
    goTo(3);
  } else if (labPhase === 1) {
    showPhase(0);
    renderDieTray();
    updateRollProgress();
  } else if (labPhase === 2) {
    startBitsQuiz();
  } else if (labPhase === 3 || labPhase === 4) {
    showPhase(2);
    startSumPhase();
  }
});

function updateRollProgress() {
  const n = filledCount();
  const el = $('#roll-progress');
  if (el) el.textContent = `${n} of 11 rolls`;
  const clear = $('#btn-clear-rolls');
  if (clear) clear.hidden = n === 0;
  const rollBtn = $('#btn-roll-one');
  if (rollBtn) {
    rollBtn.disabled = allFilled();
    rollBtn.textContent = allFilled() ? 'All 11 filled' : `Roll die #${n + 1}`;
  }
  if (labPhase === 0) {
    const nav = $('#lab-nav');
    const hint = $('#lab-hint');
    if (nav) nav.hidden = !allFilled();
    if (hint) {
      hint.hidden = allFilled();
      hint.textContent = 'Fill all 11 rolls to continue';
    }
    const next = $('#lab-next');
    if (next) next.textContent = 'Next: mark odd / even';
  }
}

// ——— Step 5 ———
async function animateSeedSlots() {
  const el = $('#seed-slots');
  el.innerHTML = Array.from({ length: 12 }, (_, i) => {
    return `<div class="ss" data-i="${i}"><span class="num">${i + 1}</span><span>${
      i === 11 ? '✓' : 'dice'
    }</span></div>`;
  }).join('');
  await sleep(150);
  for (let i = 0; i < 12; i++) {
    el.querySelector(`[data-i="${i}"]`).classList.add('on');
    if (i === 11) el.querySelector(`[data-i="${i}"]`).classList.add('checksum');
    await sleep(90);
  }
}

// ——— Step 6 ———
async function generatePractice(totalWords = 12) {
  const btn = $('#btn-gen-seed');
  const again = $('#btn-gen-again');
  btn.disabled = true;
  if (again) again.disabled = true;
  btn.textContent = 'Generating…';

  const words = [];
  for (let i = 0; i < totalWords - 1; i++) {
    words.push(facesToWord(Array.from({ length: 11 }, () => rollDie())).word);
  }
  const candidates = await candidateLastWords(words, totalWords);
  const last = candidates[Math.floor(Math.random() * candidates.length)].word;
  const all = [...words, last];

  const list = $('#seed-list');
  list.innerHTML = '';
  $('#practice-box').hidden = false;

  for (let i = 0; i < all.length; i++) {
    const li = document.createElement('li');
    if (i === all.length - 1) li.className = 'checksum';
    li.style.animationDelay = `${i * 0.04}s`;
    li.innerHTML = `<span>${i + 1}.</span>${all[i]}${
      i === all.length - 1 ? ' · checksum' : ''
    }`;
    list.appendChild(li);
    await sleep(35);
  }

  practicedOnce = true;
  $('#practice-hint').hidden = true;
  $('#practice-nav').hidden = false;
  btn.disabled = false;
  btn.textContent = 'Generate practice seed';
  if (again) again.disabled = false;
}

$('#btn-gen-seed')?.addEventListener('click', () => generatePractice(12));
$('#btn-gen-again')?.addEventListener('click', () => generatePractice(12));

// Fix: global nav for steps 0-3,5-7 - step-4 blocked entirely which is correct
// But steps with data-next inside step-4 aren't needed.

// Re-enable data-next for non-lab: the early return for #step-4 prevents bubbling from lab only when target is inside step-4. Clicks on step 0 Start work.

// ——— Init ———
renderDieTray();
updateRollProgress();
goTo(0);

if (WORDLIST.length !== 2048) console.error('Wordlist incomplete');
