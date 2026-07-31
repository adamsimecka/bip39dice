/**
 * bip39dice.com — guided tutorial
 * Method: veebch/Bip39-Dice
 */

import { rollDie, facesToWord, POWERS, candidateLastWords, WORDLIST } from './crypto.js';

const TOTAL_STEPS = 8; // 0..7
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let step = 0;
let lastFaces = null;
let lastWord = null;
let lastIndex = null;
let lastBits = null;
let practicedOnce = false;

/** Lab sub-phase: 0 roll · 1 bits · 2 number · 3 list · 4 done */
let labPhase = 0;
let labBusy = false;

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
  if (e.target.closest('[data-next]')) goTo(step + 1);
  if (e.target.closest('[data-back]')) goTo(step - 1);
});

$('#btn-restart')?.addEventListener('click', () => {
  practicedOnce = false;
  lastFaces = lastWord = lastIndex = lastBits = null;
  labPhase = 0;
  goTo(0);
});

// ——— Step 1: seed preview ———
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

// ——— Step 3: pipeline ———
async function animatePipeline() {
  const nodes = $$('[data-pipe]');
  nodes.forEach((n) => n.classList.remove('on'));
  for (let i = 0; i < nodes.length; i++) {
    await sleep(280);
    nodes[i].classList.add('on');
  }
}

// ——— Step 4: guided lab ———
const LAB_COPY = [
  {
    kicker: 'Step A of 4',
    title: 'Roll 11 dice',
    lede: 'On paper you’d throw real dice. Here we simulate one roll.',
  },
  {
    kicker: 'Step B of 4',
    title: 'Odd or even?',
    lede: 'Each die becomes a bit: odd = 0, even = 1. Watch them flip.',
  },
  {
    kicker: 'Step C of 4',
    title: 'Turn bits into a number',
    lede: 'Add the powers of two where the bit is 1. That sum is your word number.',
  },
  {
    kicker: 'Step D of 4',
    title: 'Find it on the list',
    lede: 'Scan the BIP-39 word list to that number. That’s your seed word.',
  },
  {
    kicker: 'Done',
    title: 'That’s one seed word',
    lede: 'Write it down for a real wallet — never type a funded seed into a website.',
  },
];

function setLabCopy(phase) {
  const c = LAB_COPY[phase] || LAB_COPY[0];
  $('#lab-kicker').textContent = c.kicker;
  $('#lab-title').textContent = c.title;
  $('#lab-lede').textContent = c.lede;
}

function showLabPhase(phase) {
  labPhase = phase;
  setLabCopy(Math.min(phase, 4));
  $('#lab-phase-a').hidden = phase !== 0;
  $('#lab-phase-b').hidden = phase !== 1;
  $('#lab-phase-c').hidden = phase !== 2;
  $('#lab-phase-d').hidden = phase < 3;
  // nav
  const nav = $('#lab-nav');
  const hint = $('#lab-hint');
  const next = $('#lab-next');
  if (phase === 0 && !lastFaces) {
    nav.hidden = true;
    hint.hidden = false;
    hint.textContent = 'Roll to begin';
  } else if (labBusy) {
    nav.hidden = true;
    hint.hidden = true;
  } else if (phase >= 1 && phase < 4) {
    nav.hidden = false;
    hint.hidden = true;
    next.textContent = phase === 1 ? 'Make the number' : phase === 2 ? 'Look up the word' : 'Continue';
  } else if (phase >= 4) {
    nav.hidden = false;
    hint.hidden = true;
    next.textContent = 'See the full seed';
  }
}

function resetLab() {
  lastFaces = lastWord = lastIndex = lastBits = null;
  labBusy = false;
  renderDieTray();
  $('#btn-roll').disabled = false;
  $('#btn-roll').textContent = 'Roll 11 dice';
  $('#bit-map').innerHTML = '';
  $('#calc-rows').innerHTML = '';
  $('#calc-total').textContent = '0';
  $('#wordlist').innerHTML = '';
  $('#word-found').hidden = true;
  showLabPhase(0);
}

function renderDieTray() {
  $('#die-tray').innerHTML = Array.from({ length: 11 }, (_, i) => {
    return `<div class="die empty" data-i="${i}">?</div>`;
  }).join('');
}

async function rollDice() {
  if (labBusy) return;
  labBusy = true;
  const btn = $('#btn-roll');
  btn.disabled = true;
  btn.textContent = 'Rolling…';
  showLabPhase(0);
  $('#lab-nav').hidden = true;
  $('#lab-hint').hidden = true;

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

  labBusy = false;
  btn.disabled = false;
  btn.textContent = 'Roll again';
  // Move into bits phase automatically after a beat
  await sleep(400);
  await runBitsPhase();
}

async function runBitsPhase() {
  labBusy = true;
  showLabPhase(1);
  const map = $('#bit-map');
  map.innerHTML = '';

  for (let i = 0; i < 11; i++) {
    const face = lastFaces[i];
    const bit = lastBits[i];
    const cell = document.createElement('div');
    cell.className = 'bit-cell';
    cell.innerHTML = `
      <div class="bit-die">${face}</div>
      <div class="bit-arrow">↓</div>
      <div class="bit-val ${bit ? 'one' : 'zero'}">?</div>
      <div class="bit-label">${face % 2 === 0 ? 'even' : 'odd'}</div>
    `;
    map.appendChild(cell);
    await sleep(120);
    const val = cell.querySelector('.bit-val');
    val.textContent = String(bit);
    val.classList.add('pop');
    cell.classList.add('on');
  }

  labBusy = false;
  showLabPhase(1);
  live.textContent = 'Bits ready';
}

async function runCalcPhase() {
  labBusy = true;
  showLabPhase(2);
  const rows = $('#calc-rows');
  rows.innerHTML = '';
  let total = 0;
  $('#calc-total').textContent = '0';

  for (let i = 0; i < 11; i++) {
    const bit = lastBits[i];
    const power = POWERS[i];
    const contrib = bit ? power : 0;
    total += contrib;
    const row = document.createElement('div');
    row.className = `calc-row ${bit ? 'active' : 'dim'}`;
    row.innerHTML = `
      <span class="cr-bit">bit ${bit}</span>
      <span class="cr-eq">${bit ? `1 × ${power}` : `0 × ${power}`}</span>
      <span class="cr-sum">${bit ? `+${power}` : '+0'}</span>
    `;
    rows.appendChild(row);
    await sleep(140);
    if (bit) {
      row.classList.add('flash');
      $('#calc-total').textContent = String(total);
    }
  }

  await sleep(200);
  $('#calc-total').textContent = String(lastIndex);
  $('#calc-total').classList.add('pop');
  labBusy = false;
  showLabPhase(2);
  live.textContent = `Number ${lastIndex}`;
}

function buildWordlistWindow(centerIndex, windowSize = 9) {
  const half = Math.floor(windowSize / 2);
  let start = centerIndex - half;
  if (start < 0) start = 0;
  if (start + windowSize > 2048) start = 2048 - windowSize;
  const rows = [];
  for (let i = 0; i < windowSize; i++) {
    const idx = start + i;
    rows.push({ idx, word: WORDLIST[idx] });
  }
  return rows;
}

function renderWordlist(centerIndex, highlightIdx = null) {
  const rows = buildWordlistWindow(centerIndex, 9);
  const el = $('#wordlist');
  el.innerHTML = rows
    .map(({ idx, word }) => {
      const on = highlightIdx !== null && idx === highlightIdx;
      return `<div class="wl-row ${on ? 'hit' : ''}" data-idx="${idx}" role="listitem">
        <span class="wl-num">${idx}</span>
        <span class="wl-word">${word}</span>
      </div>`;
    })
    .join('');
}

async function runListPhase() {
  labBusy = true;
  showLabPhase(3);
  $('#word-found').hidden = true;
  const target = lastIndex;
  $('#list-target').textContent = `looking for #${target}`;

  // Scan from earlier in the list toward the target (like flipping pages)
  const start = Math.max(0, target - 160 - Math.floor(Math.random() * 50));
  const totalSteps = 40;

  for (let s = 0; s < totalSteps; s++) {
    const t = s / (totalSteps - 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out
    const pos = Math.round(start + (target - start) * eased);
    const near = s > totalSteps - 5;
    renderWordlist(pos, near ? target : null);
    await sleep(28 + t * t * 150);
  }

  renderWordlist(target, target);
  await sleep(300);

  const hit = $('#wordlist .wl-row.hit');
  if (hit) hit.classList.add('land');

  $('#word-found-text').textContent = lastWord;
  $('#word-found-meta').textContent = `Index ${lastIndex} on the list of 0–2047`;
  $('#word-found').hidden = false;
  $('#list-target').textContent = `found #${target}`;

  labBusy = false;
  showLabPhase(4);
  setLabCopy(4);
  live.textContent = `Word: ${lastWord}`;
}

$('#btn-roll')?.addEventListener('click', rollDice);

$('#lab-next')?.addEventListener('click', async () => {
  if (labBusy) return;
  if (labPhase === 1) {
    await runCalcPhase();
  } else if (labPhase === 2) {
    await runListPhase();
  } else if (labPhase >= 4) {
    goTo(5);
  } else if (labPhase === 3) {
    // shouldn't show mid-list
    showLabPhase(4);
  }
});

$('#lab-back')?.addEventListener('click', () => {
  if (labBusy) return;
  if (labPhase <= 1) {
    goTo(3);
    return;
  }
  if (labPhase === 2) {
    showLabPhase(1);
    // re-render bits static
    const map = $('#bit-map');
    map.innerHTML = lastFaces
      .map((face, i) => {
        const bit = lastBits[i];
        return `<div class="bit-cell on">
          <div class="bit-die">${face}</div>
          <div class="bit-arrow">↓</div>
          <div class="bit-val ${bit ? 'one' : 'zero'}">${bit}</div>
          <div class="bit-label">${face % 2 === 0 ? 'even' : 'odd'}</div>
        </div>`;
      })
      .join('');
    return;
  }
  if (labPhase >= 3) {
    showLabPhase(2);
  }
});

// ——— Step 5: seed slots ———
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

// ——— Step 6: practice ———
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

// ——— Init ———
renderDieTray();
goTo(0);

if (WORDLIST.length !== 2048) console.error('Wordlist incomplete');
