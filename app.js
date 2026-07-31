/**
 * bip39dice.com — minimal guided tutorial
 * Method: veebch/Bip39-Dice
 */

import { rollDie, facesToWord, candidateLastWords, WORDLIST } from './crypto.js';

const TOTAL_STEPS = 6; // 0..5
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

  if (step === 0) {
    progressWrap.hidden = true;
  } else {
    progressWrap.hidden = false;
    progressFill.style.width = `${(step / (TOTAL_STEPS - 1)) * 100}%`;
    progressLabel.textContent = `${step} / ${TOTAL_STEPS - 1}`;
  }

  if (step === 1) renderSeedPreview();
  if (step === 2 && !rolledOnce) {
    renderDieTray();
    $('#word-reveal').hidden = true;
    $('#math-more').hidden = true;
    $('#roll-nav').hidden = true;
    $('#btn-roll').textContent = 'Roll the dice';
    $('#btn-roll').disabled = false;
  }
  if (step === 3) animateSeedSlots();
  if (step === 4 && !practicedOnce) {
    $('#practice-box').hidden = true;
    $('#practice-nav').hidden = true;
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  live.textContent = `Step ${step}`;
}

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-next]')) goTo(step + 1);
  if (e.target.closest('[data-back]')) goTo(step - 1);
});

$('#btn-restart')?.addEventListener('click', () => {
  rolledOnce = false;
  practicedOnce = false;
  lastFaces = lastWord = lastIndex = lastBits = null;
  goTo(0);
});

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
      <div class="slot ${i === 11 ? 'last' : ''}" style="animation-delay:${i * 0.04}s">
        <span class="n">${i + 1}</span>
        <span class="w">${w}</span>
      </div>`
    )
    .join('');
  el.dataset.ready = '1';
}

function renderDieTray() {
  $('#die-tray').innerHTML = Array.from(
    { length: 11 },
    (_, i) => `<div class="die empty" data-i="${i}">?</div>`
  ).join('');
}

async function rollDice() {
  const btn = $('#btn-roll');
  btn.disabled = true;
  btn.textContent = '…';
  $('#word-reveal').hidden = true;

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
      await sleep(26);
    }
    el.textContent = String(face);
    el.classList.remove('rolling');
    el.classList.add('locked');
    await sleep(35);
  }

  const { word, index, bits } = facesToWord(faces);
  lastFaces = faces;
  lastWord = word;
  lastIndex = index;
  lastBits = bits;
  rolledOnce = true;

  await sleep(150);
  $('#word-text').textContent = word;
  const reveal = $('#word-reveal');
  reveal.hidden = false;
  reveal.style.animation = 'none';
  void reveal.offsetWidth;
  reveal.style.animation = '';

  // Fill learn-more math
  $('#ts-dice').textContent = faces.join(' · ');
  $('#ts-bits').textContent = bits.join('');
  $('#ts-index').textContent = String(index);
  $('#ts-word').textContent = word;
  $('#math-more').hidden = false;
  $('#math-more').open = false;

  $('#roll-nav').hidden = false;
  btn.disabled = false;
  btn.textContent = 'Roll again';
  live.textContent = word;
}

$('#btn-roll')?.addEventListener('click', rollDice);

async function animateSeedSlots() {
  const el = $('#seed-slots');
  el.innerHTML = Array.from({ length: 12 }, (_, i) => {
    return `<div class="ss" data-i="${i}"><span class="num">${i + 1}</span><span>${
      i === 11 ? '✓' : 'dice'
    }</span></div>`;
  }).join('');
  await sleep(100);
  for (let i = 0; i < 12; i++) {
    const node = el.querySelector(`[data-i="${i}"]`);
    node.classList.add('on');
    if (i === 11) node.classList.add('checksum');
    await sleep(80);
  }
}

async function generatePractice() {
  const btn = $('#btn-gen-seed');
  const again = $('#btn-gen-again');
  btn.disabled = true;
  if (again) again.disabled = true;
  btn.textContent = '…';

  const words = [];
  for (let i = 0; i < 11; i++) {
    words.push(facesToWord(Array.from({ length: 11 }, () => rollDie())).word);
  }
  const candidates = await candidateLastWords(words, 12);
  const last = candidates[Math.floor(Math.random() * candidates.length)].word;
  const all = [...words, last];

  const list = $('#seed-list');
  list.innerHTML = '';
  $('#practice-box').hidden = false;

  for (let i = 0; i < all.length; i++) {
    const li = document.createElement('li');
    if (i === 11) li.className = 'checksum';
    li.style.animationDelay = `${i * 0.035}s`;
    li.innerHTML = `<span>${i + 1}.</span>${all[i]}`;
    list.appendChild(li);
    await sleep(30);
  }

  practicedOnce = true;
  $('#practice-nav').hidden = false;
  btn.disabled = false;
  btn.textContent = 'Generate';
  if (again) again.disabled = false;
}

$('#btn-gen-seed')?.addEventListener('click', generatePractice);
$('#btn-gen-again')?.addEventListener('click', generatePractice);

renderDieTray();
goTo(0);

if (WORDLIST.length !== 2048) console.error('Wordlist incomplete');
