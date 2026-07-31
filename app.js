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
  try {
    step = Math.max(0, Math.min(TOTAL_STEPS - 1, Number(n) || 0));
    $$('.step').forEach((el) => {
      const s = Number(el.dataset.step);
      const on = s === step;
      if (on) {
        el.removeAttribute('hidden');
        el.hidden = false;
        el.classList.add('active');
      } else {
        el.setAttribute('hidden', '');
        el.hidden = true;
        el.classList.remove('active');
      }
    });

    if (progressWrap) {
      if (step === 0) {
        progressWrap.hidden = true;
        progressWrap.setAttribute('hidden', '');
      } else {
        progressWrap.hidden = false;
        progressWrap.removeAttribute('hidden');
        if (progressFill) progressFill.style.width = `${(step / (TOTAL_STEPS - 1)) * 100}%`;
        if (progressLabel) progressLabel.textContent = `${step} / ${TOTAL_STEPS - 1}`;
      }
    }

    if (step === 1) renderSeedPreview();
    if (step === 4) resetLab();
    if (step === 5) animateSeedSlots();
    if (step === 6 && !practicedOnce) {
      const box = $('#practice-box');
      const nav = $('#practice-nav');
      const hint = $('#practice-hint');
      if (box) box.hidden = true;
      if (nav) nav.hidden = true;
      if (hint) hint.hidden = false;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (live) live.textContent = `Step ${step}`;
  } catch (err) {
    console.error('goTo failed', err);
  }
}

/** Direct bindings — more reliable than only document delegation */
function bindTutorialNav() {
  $$('[data-next]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(step + 1);
    });
  });
  $$('[data-back]').forEach((btn) => {
    // Lab back is #lab-back without data-back
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      goTo(step - 1);
    });
  });
}

// Also catch late/dynamic clicks
document.addEventListener('click', (e) => {
  if (e.target.closest('#lab-next') || e.target.closest('#lab-back')) return;
  const next = e.target.closest('[data-next]');
  const back = e.target.closest('[data-back]');
  // Direct listeners already fire; skip if defaultPrevented
  if (e.defaultPrevented) return;
  if (next) goTo(step + 1);
  if (back) goTo(step - 1);
});

window.goToStep = goTo;

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

// ——— Step 4: single worksheet ———
// Row loop: need-roll → need-bit → next row → sum → word → done
let rollMode = 'sim';
let sheetStage = 'row'; // row | sum | word | done
let activeRow = 0;
let sumChecked = false;

function bitsComplete() {
  return userBits.every((b) => b === 0 || b === 1) && faces.every((f) => f != null);
}

function resetLab() {
  faces = Array(11).fill(null);
  userBits = Array(11).fill(null);
  correctIndex = null;
  correctWord = null;
  rollMode = 'sim';
  sheetStage = 'row';
  activeRow = 0;
  sumChecked = false;
  const fb = $('#ws-feedback');
  if (fb) {
    fb.hidden = true;
    fb.textContent = '';
  }
  const list = $('#ws-list-panel');
  if (list) list.hidden = true;
  const found = $('#word-found');
  if (found) found.hidden = true;
  const nav = $('#lab-nav');
  if (nav) nav.hidden = true;
  const search = $('#list-search');
  if (search) search.value = '';
  renderWorksheet();
  renderActionPanel();
  updateLabChrome();
}

function updateLabChrome() {
  const kicker = $('#lab-kicker');
  const title = $('#lab-title');
  const lede = $('#lab-lede');
  if (sheetStage === 'row') {
    if (kicker) kicker.textContent = `Row ${Math.min(activeRow + 1, 11)} of 11`;
    if (faces[activeRow] == null) {
      if (title) title.textContent = 'Roll the die';
      if (lede) lede.textContent = 'One die is enough. Roll it (or tap 1–6 from a real die).';
    } else if (userBits[activeRow] == null) {
      if (title) title.textContent = 'Odd or even?';
      if (lede)
        lede.textContent = `You rolled ${faces[activeRow]}. Odd → 0 · Even → 1. Pick the correct one.`;
    }
  } else if (sheetStage === 'sum') {
    if (kicker) kicker.textContent = 'Almost there';
    if (title) title.textContent = 'Add the “1” rows';
    if (lede)
      lede.textContent =
        'Each row with bit 1 adds its power of two. Sum them (0–2047), then enter the total.';
  } else if (sheetStage === 'word') {
    if (kicker) kicker.textContent = 'Last step';
    if (title) title.textContent = 'Find your word';
    if (lede)
      lede.textContent = `Look up number ${correctIndex} on the BIP-39 list and tap that word.`;
  } else if (sheetStage === 'done') {
    if (kicker) kicker.textContent = 'Done';
    if (title) title.textContent = 'You made a seed word';
    if (lede)
      lede.textContent = 'Same process as paper. Never use a website for a funded seed.';
  }
}

function renderWorksheet() {
  const el = $('#worksheet');
  if (!el) return;
  const head = `
    <div class="ws-row ws-head">
      <span>#</span><span>Roll</span><span>O/E</span><span>Bit</span><span>Power</span><span>Add</span>
    </div>`;
  const rows = faces
    .map((face, i) => {
      const bit = userBits[i];
      const power = POWERS[i];
      const add = bit === 1 ? power : bit === 0 ? 0 : '—';
      const oe =
        face == null ? '—' : bit == null ? '?' : face % 2 === 0 ? 'even' : 'odd';
      const isActive = sheetStage === 'row' && i === activeRow;
      const isDone = face != null && bit != null;
      return `<div class="ws-row ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}" data-row="${i}">
        <span class="ws-n">${i + 1}</span>
        <span class="ws-face">${face ?? '·'}</span>
        <span class="ws-oe">${oe}</span>
        <span class="ws-bit ${bit === 1 ? 'one' : bit === 0 ? 'zero' : ''}">${
          bit == null ? '·' : bit
        }</span>
        <span class="ws-pow">${power}</span>
        <span class="ws-add">${add}</span>
      </div>`;
    })
    .join('');

  let foot = '';
  if (sheetStage === 'sum' || sheetStage === 'word' || sheetStage === 'done') {
    foot = `<div class="ws-row ws-foot">
      <span></span><span></span><span></span><span></span>
      <span class="ws-pow">Total</span>
      <span class="ws-add total" id="ws-total-display">${
        sumChecked ? correctIndex : '?'
      }</span>
    </div>`;
  }
  el.innerHTML = head + rows + foot;
}

function renderActionPanel() {
  const panel = $('#ws-action');
  if (!panel) return;
  const fb = $('#ws-feedback');
  if (fb) fb.hidden = true;

  if (sheetStage === 'row') {
    const face = faces[activeRow];
    if (face == null) {
      // Need a roll
      panel.innerHTML = `
        <div class="mode-row" role="group">
          <button type="button" class="mode-btn ${
            rollMode === 'sim' ? 'active' : ''
          }" data-roll-mode="sim">Simulate</button>
          <button type="button" class="mode-btn ${
            rollMode === 'phys' ? 'active' : ''
          }" data-roll-mode="phys">Real die</button>
        </div>
        <div id="sim-controls" ${rollMode === 'phys' ? 'hidden' : ''}>
          <button type="button" class="btn-primary" id="btn-roll-one">Roll for row ${
            activeRow + 1
          }</button>
        </div>
        <div id="phys-controls" ${rollMode === 'sim' ? 'hidden' : ''}>
          <p class="phase-note">What did your die show?</p>
          <div class="face-pad" id="face-pad">
            ${[1, 2, 3, 4, 5, 6]
              .map((n) => `<button type="button" data-face="${n}">${n}</button>`)
              .join('')}
          </div>
        </div>`;
      wireRollControls();
    } else {
      // Need odd/even
      panel.innerHTML = `
        <div class="quiz-card compact">
          <div class="quiz-die" id="bit-quiz-die">${face}</div>
          <p class="phase-note">Is ${face} odd or even?</p>
          <div class="quiz-actions">
            <button type="button" class="quiz-btn" id="btn-odd">Odd → <strong>0</strong></button>
            <button type="button" class="quiz-btn" id="btn-even">Even → <strong>1</strong></button>
          </div>
        </div>`;
      $('#btn-odd')?.addEventListener('click', () => answerBit(0));
      $('#btn-even')?.addEventListener('click', () => answerBit(1));
    }
  } else if (sheetStage === 'sum') {
    // Show which rows add; user types total
    const addends = userBits
      .map((b, i) => (b === 1 ? POWERS[i] : null))
      .filter((x) => x != null);
    panel.innerHTML = `
      <div class="sum-hint">
        <p>Add these numbers:</p>
        <p class="sum-chips">${
          addends.length
            ? addends.map((n) => `<span class="chip">+${n}</span>`).join(' ')
            : '<span class="chip">+0</span> (all bits were 0)'
        }</p>
      </div>
      <form class="answer-form" id="sum-form">
        <label class="sr-only" for="sum-input">Total</label>
        <input type="number" id="sum-input" min="0" max="2047" inputmode="numeric"
          placeholder="Type the total" autocomplete="off" required />
        <button type="submit" class="btn-primary">Check total</button>
      </form>`;
    $('#sum-form')?.addEventListener('submit', onSumSubmit);
  } else if (sheetStage === 'word') {
    panel.innerHTML = `
      <p class="phase-note">Use the list below. Type <strong>${correctIndex}</strong> in the search box, then tap the matching word.</p>`;
  } else {
    panel.innerHTML = '';
  }
}

function wireRollControls() {
  $$('.mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      rollMode = btn.dataset.rollMode;
      renderActionPanel();
    });
  });
  $('#btn-roll-one')?.addEventListener('click', async () => {
    const face = rollDie();
    await applyFace(activeRow, face, true);
  });
  $$('#face-pad button').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyFace(activeRow, Number(btn.dataset.face), false);
    });
  });
}

async function applyFace(index, face, animate) {
  faces[index] = face;
  // clear bit if re-rolling
  userBits[index] = null;
  recomputeAnswer();
  renderWorksheet();
  renderActionPanel();
  updateLabChrome();
  if (live) live.textContent = `Row ${index + 1}: rolled ${face}`;
}

function answerBit(chosenBit) {
  const face = faces[activeRow];
  const correct = face % 2 === 0 ? 1 : 0;
  const fb = $('#ws-feedback');
  if (chosenBit !== correct) {
    if (fb) {
      fb.hidden = false;
      fb.className = 'quiz-feedback bad';
      fb.textContent =
        correct === 0
          ? `${face} is odd → bit 0. Try again.`
          : `${face} is even → bit 1. Try again.`;
    }
    return;
  }
  userBits[activeRow] = correct;
  if (fb) fb.hidden = true;
  // advance row or go to sum
  if (activeRow < 10) {
    activeRow++;
  } else {
    // all rows done
    recomputeAnswer();
    sheetStage = 'sum';
  }
  renderWorksheet();
  renderActionPanel();
  updateLabChrome();
}

function onSumSubmit(e) {
  e.preventDefault();
  const val = Number($('#sum-input')?.value);
  recomputeAnswer();
  const fb = $('#ws-feedback');
  if (val !== correctIndex) {
    if (fb) {
      fb.hidden = false;
      fb.className = 'quiz-feedback bad';
      fb.textContent = 'Not that total. Add every power where Bit is 1.';
    }
    return;
  }
  sumChecked = true;
  if (fb) {
    fb.hidden = false;
    fb.className = 'quiz-feedback good';
    fb.textContent = `Correct — ${correctIndex}.`;
  }
  renderWorksheet();
  // Move to word lookup
  setTimeout(() => {
    sheetStage = 'word';
    $('#ws-list-panel').hidden = false;
    $('#find-index').textContent = String(correctIndex);
    $('#list-search').value = '';
    renderFullWordlist('');
    renderActionPanel();
    updateLabChrome();
    $('#ws-list-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 400);
}

function renderFullWordlist(query) {
  const el = $('#wordlist');
  if (!el) return;
  const q = (query || '').trim().toLowerCase();
  let items = [];

  if (!q) {
    el.innerHTML = `<p class="list-empty">Type <strong>${correctIndex}</strong> above, then tap the word on that row.</p>`;
    return;
  }

  if (/^\d+$/.test(q)) {
    const n = Number(q);
    if (n < 0 || n > 2047) {
      el.innerHTML = `<p class="list-empty">Numbers run from 0 to 2047.</p>`;
      return;
    }
    const start = Math.max(0, n - 5);
    const end = Math.min(2048, n + 30);
    for (let i = start; i < end; i++) items.push(i);
  } else {
    for (let i = 0; i < 2048; i++) {
      if (WORDLIST[i].startsWith(q)) items.push(i);
      if (items.length >= 60) break;
    }
  }

  if (!items.length) {
    el.innerHTML = `<p class="list-empty">No matches.</p>`;
    return;
  }

  el.innerHTML = items
    .map(
      (idx) => `<button type="button" class="wl-row" data-idx="${idx}">
        <span class="wl-num">${idx}</span>
        <span class="wl-word">${WORDLIST[idx]}</span>
      </button>`
    )
    .join('');

  $$('.wl-row', el).forEach((btn) => {
    btn.addEventListener('click', () => pickWord(Number(btn.dataset.idx), btn));
  });
}

function pickWord(idx, btn) {
  const fb = $('#ws-feedback');
  if (idx !== correctIndex) {
    if (fb) {
      fb.hidden = false;
      fb.className = 'quiz-feedback bad';
      fb.textContent = `#${idx} is “${WORDLIST[idx]}”. You need #${correctIndex}.`;
    }
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
    return;
  }
  btn.classList.add('hit', 'land');
  if (fb) fb.hidden = true;
  sheetStage = 'done';
  $('#word-found-text').textContent = correctWord;
  $('#word-found-meta').textContent = `Index ${correctIndex}`;
  $('#word-found').hidden = false;
  $('#lab-nav').hidden = false;
  renderWorksheet();
  renderActionPanel();
  updateLabChrome();
  if (live) live.textContent = `Word: ${correctWord}`;
}

$('#list-search')?.addEventListener('input', (e) => {
  renderFullWordlist(e.target.value);
});

$('#btn-reset-sheet')?.addEventListener('click', () => resetLab());

$('#lab-next')?.addEventListener('click', () => {
  if (sheetStage === 'done') goTo(5);
});

$('#lab-back')?.addEventListener('click', () => {
  goTo(3);
});

// ——— Step 5 ———
async function animateSeedSlots() {
  const el = $('#seed-slots');
  if (!el) return;
  const first = correctWord || '???';
  const made = $('#made-word');
  if (made && correctWord) made.textContent = `“${correctWord}”`;

  el.innerHTML = Array.from({ length: 12 }, (_, i) => {
    const label = i === 0 ? first : i === 11 ? '✓' : '·';
    return `<div class="ss" data-i="${i}"><span class="num">${i + 1}</span><span class="ss-w">${label}</span></div>`;
  }).join('');

  await sleep(120);
  for (let i = 0; i < 12; i++) {
    const node = el.querySelector(`[data-i="${i}"]`);
    node?.classList.add('on');
    if (i === 0) node?.classList.add('yours');
    if (i === 11) node?.classList.add('checksum');
    await sleep(85);
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
function init() {
  try {
    bindTutorialNav();
    goTo(0);
    if (WORDLIST.length !== 2048) console.error('Wordlist incomplete');
  } catch (err) {
    console.error('bip39dice init failed', err);
    document.querySelectorAll('[data-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const steps = [...document.querySelectorAll('.step')];
        const i = steps.findIndex((s) => !s.hidden);
        if (i >= 0 && i < steps.length - 1) {
          steps[i].hidden = true;
          steps[i + 1].hidden = false;
        }
      });
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
