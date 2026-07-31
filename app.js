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

    if (step !== 4) document.body.classList.remove('lab-lookup');

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

// ——— Step 4: simple practice lab ———
// Stages: roll → decide → (×11) → sum → word → done
let sheetStage = 'roll'; // roll | decide | sum | word | done
let activeRow = 0;
let sumChecked = false;

function resetLab() {
  faces = Array(11).fill(null);
  userBits = Array(11).fill(null);
  correctIndex = null;
  correctWord = null;
  sheetStage = 'roll';
  activeRow = 0;
  sumChecked = false;
  clearLabFeedback();
  renderLab();
}

function clearLabFeedback() {
  const fb = $('#ws-feedback');
  if (fb) {
    fb.hidden = true;
    fb.textContent = '';
    fb.className = 'quiz-feedback';
  }
}

function setLabFeedback(kind, text) {
  const fb = $('#ws-feedback');
  if (!fb) return;
  fb.hidden = false;
  fb.className = `quiz-feedback ${kind}`;
  fb.textContent = text;
}

function finishedRolls() {
  return faces
    .map((f, i) => (f != null && userBits[i] != null ? { f, bit: userBits[i], i } : null))
    .filter(Boolean);
}

function renderLab() {
  const kicker = $('#lab-kicker');
  const title = $('#lab-title');
  const lede = $('#lab-lede');
  const main = $('#lab-main');
  const trail = $('#lab-trail');
  if (!main) return;

  clearLabFeedback();
  document.body.classList.toggle('lab-lookup', sheetStage === 'word');

  if (sheetStage === 'roll') {
    const n = activeRow + 1;
    if (kicker) kicker.textContent = `Practice · roll ${n} of 11`;
    if (title) title.textContent = 'Roll a die';
    if (lede) {
      lede.hidden = false;
      lede.textContent =
        n === 1
          ? 'Eleven rolls make one seed word. Tap Roll, or tap the number from a real die.'
          : `Roll ${n} of 11. Same as before.`;
    }
    main.innerHTML = `
      <button type="button" class="btn-primary" id="btn-roll-one">Roll</button>
      <p class="lab-or">or pick what your die showed</p>
      <div class="face-pad" id="face-pad">
        ${[1, 2, 3, 4, 5, 6].map((n) => `<button type="button" data-face="${n}">${n}</button>`).join('')}
      </div>`;
    $('#btn-roll-one')?.addEventListener('click', () => applyFace(activeRow, rollDie()));
    $$('#face-pad button').forEach((btn) => {
      btn.addEventListener('click', () => applyFace(activeRow, Number(btn.dataset.face)));
    });
    renderTrail(trail);
    return;
  }

  if (sheetStage === 'decide') {
    const face = faces[activeRow];
    const n = activeRow + 1;
    if (kicker) kicker.textContent = `Practice · roll ${n} of 11`;
    if (title) title.textContent = 'Even or odd?';
    if (lede) {
      lede.hidden = false;
      lede.innerHTML = `You rolled <strong>${face}</strong>. Even rolls count. Odd rolls are skipped.`;
    }
    main.innerHTML = `
      <div class="lab-die" aria-hidden="true">${face}</div>
      <div class="lab-choice">
        <button type="button" class="quiz-btn" id="btn-odd">Odd — skip</button>
        <button type="button" class="quiz-btn" id="btn-even">Even — count</button>
      </div>`;
    $('#btn-odd')?.addEventListener('click', () => answerBit(0));
    $('#btn-even')?.addEventListener('click', () => answerBit(1));
    renderTrail(trail);
    return;
  }

  if (sheetStage === 'sum') {
    recomputeAnswer();
    if (kicker) kicker.textContent = 'Practice · add them up';
    if (title) title.textContent = 'Add the even rolls';
    if (lede) {
      lede.hidden = false;
      lede.textContent =
        'Each roll has a weight: 1, 2, 4, 8… up to 1024. Add the weights only for even rolls.';
    }
    const rows = faces
      .map((f, i) => {
        const even = userBits[i] === 1;
        const add = even ? POWERS[i] : 0;
        return `<li class="${even ? 'keep' : 'skip'}">
          <span class="lr-n">${i + 1}.</span>
          <span class="lr-face">rolled ${f}</span>
          <span class="lr-eo">${even ? 'even' : 'odd'}</span>
          <span class="lr-add">${even ? `+${POWERS[i]}` : '+0'}</span>
        </li>`;
      })
      .join('');
    const kept = userBits
      .map((b, i) => (b === 1 ? POWERS[i] : null))
      .filter((x) => x != null);
    const eq = kept.length ? kept.map((n) => n).join(' + ') : '0';
    main.innerHTML = `
      <ol class="lab-sheet">${rows}</ol>
      <p class="lab-eq">${eq} = ?</p>
      <form class="answer-form" id="sum-form">
        <label class="sr-only" for="sum-input">Your total</label>
        <input type="number" id="sum-input" min="0" max="2047" inputmode="numeric"
          placeholder="Type the total" autocomplete="off" required />
        <button type="submit" class="btn-primary">Check total</button>
      </form>`;
    $('#sum-form')?.addEventListener('submit', onSumSubmit);
    if (trail) {
      trail.hidden = true;
      trail.innerHTML = '';
    }
    return;
  }

  if (sheetStage === 'word') {
    if (kicker) kicker.textContent = 'Practice · look it up';
    if (title) title.textContent = 'Find your word';
    if (lede) {
      lede.hidden = false;
      lede.innerHTML = `Your number is <strong>${correctIndex}</strong>. Find it on the list and tap the word.`;
    }
    main.innerHTML = `
      <div class="list-chrome tall lab-list">
        <div class="list-tools">
          <input type="search" id="list-search" placeholder="Search number or word"
            autocomplete="off" spellcheck="false" />
        </div>
        <div class="wordlist full" id="wordlist" role="list"></div>
      </div>`;
    renderFullWordlist('');
    $('#list-search')?.addEventListener('input', (e) => {
      renderFullWordlist(e.target.value);
    });
    if (trail) {
      trail.hidden = true;
      trail.innerHTML = '';
    }
    return;
  }

  if (sheetStage === 'done') {
    if (kicker) kicker.textContent = 'Practice · done';
    if (title) title.textContent = 'You made a seed word';
    if (lede) {
      lede.hidden = false;
      lede.textContent = 'That’s one of the twelve words in a Bitcoin seed.';
    }
    main.innerHTML = `
      <div class="word-found lab-found">
        <p class="word-found-label">Seed word</p>
        <p class="word-found-text">${correctWord}</p>
        <p class="word-found-meta">List number ${correctIndex}</p>
      </div>
      <button type="button" class="btn-primary" id="lab-next">Continue</button>`;
    $('#lab-next')?.addEventListener('click', () => goTo(5));
    if (trail) {
      trail.hidden = true;
      trail.innerHTML = '';
    }
    return;
  }
}

function renderTrail(trail) {
  if (!trail) return;
  const done = finishedRolls();
  if (!done.length || sheetStage === 'sum' || sheetStage === 'word' || sheetStage === 'done') {
    trail.hidden = true;
    trail.innerHTML = '';
    return;
  }
  trail.hidden = false;
  const parts = done.map(({ f, bit }) => {
    const tag = bit === 1 ? 'count' : 'skip';
    return `<span class="trail-item ${tag}">${f}<small>${tag}</small></span>`;
  });
  trail.innerHTML = `<span class="trail-label">So far</span> ${parts.join('')}`;
}

function applyFace(index, face) {
  faces[index] = face;
  userBits[index] = null;
  sheetStage = 'decide';
  renderLab();
  if (live) live.textContent = `Rolled ${face}`;
}

function answerBit(chosenBit) {
  const face = faces[activeRow];
  const correct = face % 2 === 0 ? 1 : 0;
  if (chosenBit !== correct) {
    setLabFeedback(
      'bad',
      correct === 1
        ? `${face} is even (2, 4, or 6). Choose Even — count.`
        : `${face} is odd (1, 3, or 5). Choose Odd — skip.`
    );
    return;
  }
  userBits[activeRow] = correct;
  if (activeRow < 10) {
    activeRow++;
    sheetStage = 'roll';
  } else {
    recomputeAnswer();
    sheetStage = 'sum';
  }
  renderLab();
}

function onSumSubmit(e) {
  e.preventDefault();
  const val = Number($('#sum-input')?.value);
  recomputeAnswer();
  if (val !== correctIndex) {
    setLabFeedback('bad', 'Not quite. Add only the weights next to even rolls.');
    return;
  }
  sumChecked = true;
  setLabFeedback('good', `Yes — ${correctIndex}.`);
  setTimeout(() => {
    sheetStage = 'word';
    renderLab();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, 450);
}

function renderFullWordlist(query) {
  const el = $('#wordlist');
  if (!el) return;
  const q = (query || '').trim().toLowerCase();
  let items = [];
  let scrollToIdx = null;

  if (!q) {
    for (let i = 0; i < 2048; i++) items.push(i);
  } else if (/^\d+$/.test(q)) {
    const n = Number(q);
    if (n < 0 || n > 2047) {
      el.innerHTML = `<p class="list-empty">Numbers run from 0 to 2047.</p>`;
      return;
    }
    const start = Math.max(0, n - 12);
    const end = Math.min(2048, n + 40);
    for (let i = start; i < end; i++) items.push(i);
    scrollToIdx = n;
  } else {
    for (let i = 0; i < 2048; i++) {
      if (WORDLIST[i].startsWith(q) || WORDLIST[i].includes(q)) items.push(i);
      if (items.length >= 120) break;
    }
  }

  if (!items.length) {
    el.innerHTML = `<p class="list-empty">No matches. Clear the search to see the full list.</p>`;
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

  if (scrollToIdx != null) {
    requestAnimationFrame(() => {
      el.querySelector(`[data-idx="${scrollToIdx}"]`)?.scrollIntoView({ block: 'center' });
    });
  }
}

function pickWord(idx, btn) {
  if (idx !== correctIndex) {
    setLabFeedback('bad', `That’s #${idx} “${WORDLIST[idx]}”. You need #${correctIndex}.`);
    btn.classList.add('wrong');
    setTimeout(() => btn.classList.remove('wrong'), 400);
    return;
  }
  sheetStage = 'done';
  renderLab();
  if (live) live.textContent = `Word: ${correctWord}`;
}

$('#btn-reset-sheet')?.addEventListener('click', () => resetLab());

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

// Real-world path tabs (paper / Coldcard / SeedSigner / Jade)
function showPath(name) {
  $$('.path-tab').forEach((t) => {
    const on = t.dataset.path === name;
    t.classList.toggle('active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('.path-panel').forEach((panel) => {
    const id = panel.id || '';
    const key = id.replace(/^path-/, '');
    const on = key === name;
    panel.hidden = !on;
    panel.classList.toggle('active', on);
  });
}

$$('.path-tab').forEach((tab) => {
  tab.addEventListener('click', () => showPath(tab.dataset.path));
});

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
