/**
 * bip39dice.com — guided one-step-at-a-time tutorial
 * Method: veebch/Bip39-Dice
 */

import { rollDie, facesToWord, candidateLastWords, WORDLIST } from './crypto.js';

const TOTAL_STEPS = 8; // 0..7
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let step = 0;
let lastFaces = null;
let lastWord = null;
let lastIndex = null;
let lastBits = null;
let rolledOnce = false;
let practicedOnce = false;

const progressWrap = $('#progress-wrap');
const progressFill = $('#progress-fill');
const progressLabel = $('#progress-label');
const live = $('#live');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function goTo(n) {
  step = Math.max(0, Math.min(TOTAL_STEPS - 1, n));
  $$('.step').forEach((el) => {
    const s = Number(el.dataset.step);
    const on = s === step;
    el.hidden = !on;
    el.classList.toggle('active', on);
  });

  // Progress: hide on welcome
  if (step === 0) {
    progressWrap.hidden = true;
  } else {
    progressWrap.hidden = false;
    const pct = (step / (TOTAL_STEPS - 1)) * 100;
    progressFill.style.width = `${pct}%`;
    progressLabel.textContent = `${step} / ${TOTAL_STEPS - 1}`;
  }

  // Step enter hooks
  if (step === 1) renderSeedPreview();
  if (step === 2) animatePipeline();
  if (step === 3) {
    if (!rolledOnce) {
      renderDieTray();
      $('#word-reveal').hidden = true;
      $('#roll-nav').hidden = true;
      $('#hint-wait').hidden = false;
      $('#btn-roll').textContent = 'Roll 11 dice';
      $('#btn-roll').disabled = false;
    }
  }
  if (step === 4) fillTransformStory();
  if (step === 5) animateSeedSlots();
  if (step === 6) {
    if (!practicedOnce) {
      $('#practice-box').hidden = true;
      $('#practice-nav').hidden = true;
      $('#practice-hint').hidden = false;
    }
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  live.textContent = `Step ${step}`;
}

// ——— Navigation ———
document.addEventListener('click', (e) => {
  const next = e.target.closest('[data-next]');
  const back = e.target.closest('[data-back]');
  if (next) {
    goTo(step + 1);
  } else if (back) {
    goTo(step - 1);
  }
});

$('#btn-restart')?.addEventListener('click', () => {
  rolledOnce = false;
  practicedOnce = false;
  lastFaces = lastWord = lastIndex = lastBits = null;
  goTo(0);
});

// ——— Step 1: seed preview ———
function renderSeedPreview() {
  const el = $('#seed-preview');
  if (!el || el.dataset.ready) return;
  const demo = ['ocean', 'brave', 'sunset', 'river', 'candle', 'forest', 'silver', 'meadow', 'orbit', 'gentle', 'harbor', '???']
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

// ——— Step 2: pipeline ———
async function animatePipeline() {
  const nodes = $$('[data-pipe]');
  nodes.forEach((n) => n.classList.remove('on'));
  for (let i = 0; i < nodes.length; i++) {
    await sleep(280);
    nodes[i].classList.add('on');
  }
}

// ——— Step 3: dice roll ———
function renderDieTray() {
  const tray = $('#die-tray');
  tray.innerHTML = Array.from({ length: 11 }, (_, i) => {
    return `<div class="die empty" data-i="${i}">?</div>`;
  }).join('');
}

async function rollDice() {
  const btn = $('#btn-roll');
  btn.disabled = true;
  btn.textContent = 'Rolling…';
  $('#word-reveal').hidden = true;
  $('#roll-nav').hidden = true;

  const cells = $$('#die-tray .die');
  const faces = [];

  for (let i = 0; i < 11; i++) {
    const face = rollDie();
    faces.push(face);
    const el = cells[i];
    el.classList.add('rolling');
    el.classList.remove('empty', 'locked');
    for (let f = 0; f < 5; f++) {
      el.textContent = String(rollDie());
      await sleep(28);
    }
    el.textContent = String(face);
    el.classList.remove('rolling');
    el.classList.add('locked');
    await sleep(40);
  }

  const { word, index, bits } = facesToWord(faces);
  lastFaces = faces;
  lastWord = word;
  lastIndex = index;
  lastBits = bits;
  rolledOnce = true;

  // Staggered beat then reveal
  await sleep(200);
  $('#word-text').textContent = word;
  $('#word-meta').textContent = `#${index + 1} on the list of 2,048 words`;
  const reveal = $('#word-reveal');
  // re-trigger animation
  reveal.hidden = false;
  reveal.style.animation = 'none';
  void reveal.offsetWidth;
  reveal.style.animation = '';

  $('#hint-wait').hidden = true;
  $('#roll-nav').hidden = false;
  btn.disabled = false;
  btn.textContent = 'Roll again';
  live.textContent = `Word: ${word}`;
}

$('#btn-roll')?.addEventListener('click', rollDice);

// ——— Step 4: transform story ———
function fillTransformStory() {
  if (!lastFaces) {
    // Fallback if user somehow skipped
    const faces = Array.from({ length: 11 }, () => rollDie());
    const r = facesToWord(faces);
    lastFaces = faces;
    lastBits = r.bits;
    lastIndex = r.index;
    lastWord = r.word;
  }
  $('#ts-dice').textContent = lastFaces.join(' · ');
  $('#ts-bits').textContent = lastBits.join('');
  $('#ts-index').textContent = String(lastIndex);
  $('#ts-word').textContent = lastWord;
}

// ——— Step 5: seed slots animation ———
async function animateSeedSlots() {
  const el = $('#seed-slots');
  el.innerHTML = Array.from({ length: 12 }, (_, i) => {
    return `<div class="ss" data-i="${i}"><span class="num">${i + 1}</span><span>${
      i === 11 ? '✓' : 'dice'
    }</span></div>`;
  }).join('');

  await sleep(150);
  for (let i = 0; i < 12; i++) {
    const node = el.querySelector(`[data-i="${i}"]`);
    node.classList.add('on');
    if (i === 11) node.classList.add('checksum');
    await sleep(90);
  }
}

// ——— Step 6: practice full seed ———
async function generatePractice(totalWords = 12) {
  const btn = $('#btn-gen-seed');
  const again = $('#btn-gen-again');
  btn.disabled = true;
  if (again) again.disabled = true;
  btn.textContent = 'Generating…';

  const entropyWords = totalWords - 1;
  const words = [];
  for (let i = 0; i < entropyWords; i++) {
    const faces = Array.from({ length: 11 }, () => rollDie());
    words.push(facesToWord(faces).word);
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
  live.textContent = 'Practice seed ready';
}

$('#btn-gen-seed')?.addEventListener('click', () => generatePractice(12));
$('#btn-gen-again')?.addEventListener('click', () => generatePractice(12));

// ——— Init ———
renderDieTray();
goTo(0);

if (WORDLIST.length !== 2048) {
  console.error('Wordlist incomplete');
}
