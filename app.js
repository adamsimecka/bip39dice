/**
 * bip39dice.com — interactive BIP-39 educational walkthrough
 * Method credit: veebch/Bip39-Dice (paper calculator + 24thword.py)
 */

import {
  POWERS,
  rollDie,
  facesToWord,
  candidateLastWords,
  pickRankWithDiceBits,
  getLengthConfig,
  WORDLIST,
} from './crypto.js';

// ——— Config ———
/** @type {12 | 24} */
let wordCount = 12; // default: 12-word path
const GITHUB_URL = 'https://github.com/adamsimecka/bip39dice';
const VEEBCH_URL = 'https://github.com/veebch/Bip39-Dice';

// ——— State ———
const labFaces = Array(11).fill(null);
let inputMode = 'auto'; // 'auto' | 'manual'
/** @type {(string|null)[]} */
let seedWords = Array(11).fill(null);
let candidates = [];
/** @type {string|null} */
let selectedLast = null;
let mnemonicRevealed = false;

// ——— DOM ———
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const dieGrid = $('#die-grid');
const bitTbody = $('#bit-tbody');
const equationEl = $('#equation');
const wordIndexEl = $('#word-index');
const wordResultEl = $('#word-result');
const wordSubEl = $('#word-sub');
const labStatus = $('#lab-status');
const live = $('#live');
const wordSlots = $('#word-slots');
const seedProgress = $('#seed-progress');
const buildStatus = $('#build-status');
const checksumCard = $('#checksum-card');
const candidatesEl = $('#candidates');
const candidatesMeta = $('#candidates-meta');
const candidateFilter = $('#candidate-filter');
const pickUi = $('#pick-ui');
const pickStatus = $('#pick-status');
const finalSeed = $('#final-seed');
const mnemonicText = $('#mnemonic-text');
const finalSeedTitle = $('#final-seed-title');

function cfg() {
  return getLengthConfig(wordCount);
}

function entropyCount() {
  return cfg().entropyWords;
}

// ——— Stepper / panels ———
function goToStep(n) {
  const step = Number(n);
  $$('.step-pill').forEach((pill) => {
    const s = Number(pill.dataset.step);
    pill.classList.toggle('active', s === step);
    pill.classList.toggle('done', s < step);
    pill.setAttribute('aria-selected', s === step ? 'true' : 'false');
  });
  $$('.panel').forEach((panel) => {
    panel.classList.toggle('active', Number(panel.dataset.panel) === step);
  });
  const stepper = $('#stepper');
  if (stepper && window.scrollY > stepper.offsetTop + 80) {
    stepper.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  history.replaceState(null, '', `#step-${step}`);
}

$$('.step-pill').forEach((pill) => {
  pill.addEventListener('click', () => goToStep(pill.dataset.step));
});
$$('[data-go]').forEach((btn) => {
  btn.addEventListener('click', () => goToStep(btn.dataset.go));
});

const hashMatch = location.hash.match(/step-(\d)/);
if (hashMatch) goToStep(hashMatch[1]);
const hashMap = { why: 0, how: 1, lab: 2, build: 3, real: 4, credits: 5 };
const bare = location.hash.replace('#', '');
if (hashMap[bare] !== undefined) goToStep(hashMap[bare]);

// ——— Length toggle ———
function setWordCount(n) {
  wordCount = Number(n) === 24 ? 24 : 12;
  $$('.length-toggle button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.length) === wordCount);
  });
  seedWords = Array(entropyCount()).fill(null);
  candidates = [];
  selectedLast = null;
  mnemonicRevealed = false;
  if (checksumCard) checksumCard.hidden = true;
  if (finalSeed) finalSeed.hidden = true;
  if (candidatesEl) candidatesEl.innerHTML = '';
  if (pickStatus) pickStatus.textContent = '';
  if (candidateFilter) candidateFilter.value = '';
  updateLengthCopy();
  renderSlots();
  announce(`Switched to ${wordCount}-word path`);
}

function updateLengthCopy() {
  const c = cfg();
  const e = c.entropyWords;
  const last = c.totalWords;
  const cand = c.lastWordCandidates;
  const bits = c.entropyBits;

  $$('[data-dyn="entropy-words"]').forEach((el) => {
    el.textContent = String(e);
  });
  $$('[data-dyn="total-words"]').forEach((el) => {
    el.textContent = String(last);
  });
  $$('[data-dyn="last-word-n"]').forEach((el) => {
    el.textContent = String(last);
  });
  $$('[data-dyn="candidates"]').forEach((el) => {
    el.textContent = String(cand);
  });
  $$('[data-dyn="entropy-bits"]').forEach((el) => {
    el.textContent = String(bits);
  });
  $$('[data-dyn="entropy-plus-checksum"]').forEach((el) => {
    el.textContent = `${e} + 1`;
  });
  $$('[data-dyn="lab-repeat"]').forEach((el) => {
    el.textContent = String(e);
  });
  $$('[data-dyn="checksum-bits"]').forEach((el) => {
    el.textContent = String(c.checksumBits);
  });
  $$('[data-dyn="pick-bits"]').forEach((el) => {
    el.textContent = String(Math.log2(cand));
  });

  const howTitle = $('#how-title');
  if (howTitle) {
    howTitle.textContent = `How a dice seed becomes ${last} words`;
  }
  const howLead = $('#how-lead');
  if (howLead) {
    howLead.innerHTML = `Each BIP-39 word encodes 11 bits. For a <strong>${last}-word</strong> seed you need <strong>${bits} bits</strong> of entropy plus a <strong>${c.checksumBits}-bit</strong> checksum baked into the last word.`;
  }
  const buildLead = $('#build-lead');
  if (buildLead) {
    buildLead.innerHTML = `Generate <strong>${e} entropy words</strong> the same way, then compute the <strong>${cand} valid checksum candidates</strong> for word ${last} — the same algorithm as <a href="${VEEBCH_URL}/blob/master/24thword.py" target="_blank" rel="noopener"><code>24thword.py</code></a> from veebch/Bip39-Dice.`;
  }
  const btnAll = $('#btn-gen-all');
  if (btnAll) btnAll.textContent = `Generate all ${e}`;
  const checksumHeading = $('#checksum-heading');
  if (checksumHeading) {
    checksumHeading.textContent = `Step 2 — the ${last}th (checksum) word`;
  }
  if (finalSeedTitle) {
    finalSeedTitle.textContent = `Practice mnemonic (${last} words)`;
  }
}

$$('.length-toggle button').forEach((btn) => {
  btn.addEventListener('click', () => setWordCount(btn.dataset.length));
});

// ——— Die UI ———
function renderDieFace(face) {
  if (!face) {
    return `<div class="die-face" aria-hidden="true"></div>`;
  }
  const n = face;
  const pips = Array.from({ length: n }, (_, i) => `<span class="pip p${i + 1}"></span>`).join('');
  return `<div class="die-face face-${n}" aria-hidden="true">${pips}</div>`;
}

function renderDice() {
  dieGrid.innerHTML = '';
  labFaces.forEach((face, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `die ${face ? 'locked' : 'empty'}`;
    btn.dataset.index = String(i);
    btn.setAttribute(
      'aria-label',
      face ? `Die ${i + 1}: ${face}` : `Die ${i + 1}: empty, click to roll`
    );
    btn.innerHTML = `${renderDieFace(face)}<span class="die-label">${i + 1}</span>`;
    btn.addEventListener('click', () => onDieClick(i));
    dieGrid.appendChild(btn);
  });
  updateLabResults();
}

function onDieClick(index) {
  if (inputMode === 'manual') {
    labStatus.textContent = `Enter face for die ${index + 1} using the 1–6 buttons`;
    dieGrid.dataset.focusIndex = String(index);
    highlightFocusDie(index);
    return;
  }
  rollOne(index);
}

function highlightFocusDie(index) {
  $$('.die', dieGrid).forEach((d) => {
    d.style.outline = Number(d.dataset.index) === index ? '2px solid var(--purple)' : '';
  });
}

async function animateRoll(el, finalFace) {
  el.classList.add('rolling');
  const frames = 6 + Math.floor(Math.random() * 4);
  for (let f = 0; f < frames; f++) {
    const temp = rollDie();
    el.innerHTML = `${renderDieFace(temp)}<span class="die-label">${Number(el.dataset.index) + 1}</span>`;
    await sleep(40 + f * 12);
  }
  el.classList.remove('rolling');
  el.classList.remove('empty');
  el.classList.add('locked');
  el.innerHTML = `${renderDieFace(finalFace)}<span class="die-label">${Number(el.dataset.index) + 1}</span>`;
  el.setAttribute('aria-label', `Die ${Number(el.dataset.index) + 1}: ${finalFace}`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function rollOne(index) {
  const face = rollDie();
  labFaces[index] = face;
  const el = $(`.die[data-index="${index}"]`, dieGrid);
  if (el) await animateRoll(el, face);
  updateLabResults();
  announce(`Die ${index + 1} rolled ${face}`);
}

async function rollAll() {
  const buttons = $$('.die', dieGrid);
  for (let i = 0; i < 11; i++) {
    const face = rollDie();
    labFaces[i] = face;
    if (buttons[i]) animateRoll(buttons[i], face);
    await sleep(35);
  }
  await sleep(520);
  updateLabResults();
  announce('All eleven dice rolled');
}

function rollNextEmpty() {
  const idx = labFaces.findIndex((f) => f == null);
  if (idx < 0) {
    labStatus.textContent = 'All dice set — clear to re-roll';
    return;
  }
  if (inputMode === 'manual') {
    dieGrid.dataset.focusIndex = String(idx);
    highlightFocusDie(idx);
    labStatus.textContent = `Enter face for die ${idx + 1}`;
    return;
  }
  rollOne(idx);
}

function clearDice() {
  for (let i = 0; i < 11; i++) labFaces[i] = null;
  renderDice();
  labStatus.textContent = 'Cleared — roll again';
}

function updateLabResults() {
  const rows = [];
  let sum = 0;
  const parts = [];

  for (let i = 0; i < 11; i++) {
    const face = labFaces[i];
    const power = POWERS[i];
    let bit = '—';
    let contrib = '—';
    let bitClass = '';
    if (face != null) {
      bit = face % 2 === 0 ? 1 : 0;
      const c = bit ? power : 0;
      contrib = String(c);
      sum += c;
      bitClass = bit ? 'bit-1' : 'bit-0';
      if (bit) parts.push(String(power));
    }
    rows.push(`
      <tr>
        <td>${i + 1}</td>
        <td>${face ?? '—'}</td>
        <td class="${bitClass}">${bit}</td>
        <td class="power">${power}</td>
        <td class="contrib">${contrib}</td>
      </tr>
    `);
  }
  bitTbody.innerHTML = rows.join('');

  const complete = labFaces.every((f) => f != null);
  if (complete) {
    const result = facesToWord(labFaces);
    equationEl.innerHTML =
      (parts.length ? parts.join(' + ') : '0') + ` = <span class="hl">${result.index}</span>`;
    wordIndexEl.textContent = String(result.index);
    wordResultEl.textContent = result.word;
    wordSubEl.textContent = `Word #${result.index} · line ${result.index + 1} on BIP-39 english.txt`;
    labStatus.textContent = `Complete → “${result.word}”`;
  } else {
    const filled = labFaces.filter((f) => f != null).length;
    equationEl.textContent = parts.length ? parts.join(' + ') + ' + …' : '—';
    wordIndexEl.textContent = filled ? String(sum) + '…' : '—';
    wordResultEl.textContent = '—';
    wordSubEl.textContent = `${filled} of 11 dice set`;
    labStatus.textContent =
      inputMode === 'manual'
        ? `Manual entry · ${filled}/11`
        : `Click dice or roll all · ${filled}/11`;
  }
}

function announce(msg) {
  live.textContent = msg;
}

$('#btn-roll-all').addEventListener('click', () => {
  if (inputMode === 'manual') {
    labStatus.textContent = 'Switch to Auto-roll to use Roll all, or enter faces manually';
    return;
  }
  rollAll();
});
$('#btn-roll-one').addEventListener('click', rollNextEmpty);
$('#btn-clear').addEventListener('click', clearDice);

$$('.mode-toggle button').forEach((btn) => {
  btn.addEventListener('click', () => {
    inputMode = btn.dataset.mode;
    $$('.mode-toggle button').forEach((b) => b.classList.toggle('active', b === btn));
    const manual = inputMode === 'manual';
    $('#manual-panel').hidden = !manual;
    labStatus.textContent = manual
      ? 'Manual mode — enter faces from physical dice'
      : 'Auto-roll mode — practice with browser RNG';
    if (manual) {
      const idx = labFaces.findIndex((f) => f == null);
      if (idx >= 0) {
        dieGrid.dataset.focusIndex = String(idx);
        highlightFocusDie(idx);
      }
    } else {
      highlightFocusDie(-1);
    }
  });
});

$$('#manual-faces .face-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    let idx = Number(dieGrid.dataset.focusIndex);
    if (Number.isNaN(idx) || idx < 0 || idx > 10) {
      idx = labFaces.findIndex((f) => f == null);
    }
    if (idx < 0) {
      labStatus.textContent = 'All dice set — clear to change';
      return;
    }
    const face = Number(btn.dataset.face);
    labFaces[idx] = face;
    const el = $(`.die[data-index="${idx}"]`, dieGrid);
    if (el) {
      el.classList.remove('empty');
      el.classList.add('locked');
      el.innerHTML = `${renderDieFace(face)}<span class="die-label">${idx + 1}</span>`;
    }
    const next = labFaces.findIndex((f) => f == null);
    if (next >= 0) {
      dieGrid.dataset.focusIndex = String(next);
      highlightFocusDie(next);
    } else {
      highlightFocusDie(-1);
    }
    updateLabResults();
  });
});

// ——— Seed builder ———
function renderSlots() {
  if (!wordSlots) return;
  const c = cfg();
  wordSlots.innerHTML = '';
  for (let i = 0; i < c.totalWords; i++) {
    const slot = document.createElement('div');
    const isChecksum = i === c.totalWords - 1;
    const word = isChecksum ? selectedLast : seedWords[i];
    const current =
      !isChecksum && seedWords[i] == null && seedWords.findIndex((w) => w == null) === i;
    slot.className = `word-slot ${word ? '' : 'empty'} ${current ? 'current' : ''} ${
      isChecksum ? 'checksum' : ''
    }`;
    slot.innerHTML = `<span class="n">${i + 1}</span><span class="w">${
      word || (isChecksum ? 'checksum…' : 'empty')
    }</span>`;
    wordSlots.appendChild(slot);
  }

  const filled = seedWords.filter(Boolean).length;
  const pct = ((filled + (selectedLast ? 1 : 0)) / c.totalWords) * 100;
  if (seedProgress) seedProgress.style.width = `${pct}%`;
  if (buildStatus) {
    buildStatus.textContent = selectedLast
      ? `Complete practice seed · ${c.totalWords} words`
      : filled === c.entropyWords
        ? `${c.entropyWords} entropy words ready · compute checksum below`
        : `${filled} of ${c.entropyWords} entropy words`;
  }
}

function generateWordFromDice() {
  const faces = Array.from({ length: 11 }, () => rollDie());
  return facesToWord(faces);
}

function genNext() {
  const idx = seedWords.findIndex((w) => w == null);
  if (idx < 0) {
    buildStatus.textContent = `All ${entropyCount()} words set`;
    return;
  }
  const { word } = generateWordFromDice();
  seedWords[idx] = word;
  renderSlots();
  if (seedWords.every(Boolean)) {
    onEntropyReady();
  }
  announce(`Word ${idx + 1}: ${word}`);
}

async function genAll() {
  const e = entropyCount();
  for (let i = 0; i < e; i++) {
    if (!seedWords[i]) {
      seedWords[i] = generateWordFromDice().word;
      renderSlots();
      await sleep(30);
    }
  }
  await onEntropyReady();
  announce(`All ${e} entropy words generated`);
}

async function onEntropyReady() {
  checksumCard.hidden = false;
  candidatesEl.innerHTML = '';
  $('#candidates-loading').hidden = false;
  pickUi.hidden = true;
  finalSeed.hidden = true;
  selectedLast = null;
  if (candidateFilter) candidateFilter.value = '';

  try {
    candidates = await candidateLastWords(seedWords, wordCount);
    $('#candidates-loading').hidden = true;
    if (candidatesMeta) {
      candidatesMeta.textContent = `${candidates.length} valid candidates for word ${wordCount} (veebch/24thword.py algorithm)`;
    }
    renderCandidates('');
    pickUi.hidden = false;
  } catch (err) {
    $('#candidates-loading').hidden = true;
    buildStatus.textContent = `Error: ${err.message}`;
    console.error(err);
  }
  renderSlots();
}

function renderCandidates(filterText) {
  candidatesEl.innerHTML = '';
  const q = (filterText || '').trim().toLowerCase();
  const list = q
    ? candidates.filter((c) => c.word.includes(q) || String(c.rank) === q)
    : candidates;

  // For 128 candidates, use denser layout class
  candidatesEl.classList.toggle('candidates-dense', candidates.length > 16);

  list.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'candidate' + (selectedLast === c.word ? ' selected' : '');
    btn.innerHTML = `<span class="rank">#${c.rank}</span><span class="cw">${c.word}</span>`;
    btn.addEventListener('click', () => selectCandidate(c));
    candidatesEl.appendChild(btn);
  });

  if (list.length === 0) {
    candidatesEl.innerHTML = `<p class="hint">No candidates match “${q}”.</p>`;
  }
}

if (candidateFilter) {
  candidateFilter.addEventListener('input', (e) => {
    renderCandidates(e.target.value);
  });
}

function selectCandidate(c) {
  selectedLast = c.word;
  $$('.candidate', candidatesEl).forEach((btn) => {
    btn.classList.toggle('selected', btn.querySelector('.cw')?.textContent === c.word);
  });
  showFinal();
  renderSlots();
  announce(`Selected checksum word: ${c.word}`);
}

function showFinal() {
  if (!selectedLast) return;
  const all = [...seedWords, selectedLast];
  mnemonicText.textContent = all.map((w, i) => `${i + 1}.${w}`).join('  ');
  mnemonicText.classList.toggle('revealed', mnemonicRevealed);
  finalSeed.hidden = false;
}

function resetSeed() {
  seedWords = Array(entropyCount()).fill(null);
  candidates = [];
  selectedLast = null;
  mnemonicRevealed = false;
  checksumCard.hidden = true;
  finalSeed.hidden = true;
  candidatesEl.innerHTML = '';
  if (pickStatus) pickStatus.textContent = '';
  if (candidateFilter) candidateFilter.value = '';
  renderSlots();
  announce('Practice seed reset');
}

$('#btn-gen-next').addEventListener('click', genNext);
$('#btn-gen-all').addEventListener('click', genAll);
$('#btn-reset-seed').addEventListener('click', resetSeed);

$('#btn-pick-dice').addEventListener('click', () => {
  if (!candidates.length) return;
  const { rank, faces, bitsNeeded } = pickRankWithDiceBits(candidates.length);
  const c = candidates[rank - 1];
  pickStatus.textContent = `${bitsNeeded} dice → faces [${faces.join(', ')}] → candidate #${rank}: ${c.word}`;
  selectCandidate(c);
  // Re-render so selection shows even with filter
  if (candidateFilter) renderCandidates(candidateFilter.value);
});

$('#btn-reveal').addEventListener('click', () => {
  mnemonicRevealed = !mnemonicRevealed;
  mnemonicText.classList.toggle('revealed', mnemonicRevealed);
  $('#btn-reveal').textContent = mnemonicRevealed ? 'Hide' : 'Reveal / hide';
});

// ——— Offline checklist ———
const CHECK_KEY = 'bip39dice-checklist-v1';
function loadChecks() {
  try {
    return JSON.parse(localStorage.getItem(CHECK_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveChecks(map) {
  localStorage.setItem(CHECK_KEY, JSON.stringify(map));
}

function initChecklist() {
  const map = loadChecks();
  $$('#real-checklist li').forEach((li) => {
    const id = li.dataset.id;
    const btn = $('.check', li);
    if (map[id]) btn.classList.add('done');
    btn.addEventListener('click', () => {
      btn.classList.toggle('done');
      map[id] = btn.classList.contains('done');
      saveChecks(map);
    });
  });
}

// ——— Init ———
updateLengthCopy();
renderDice();
renderSlots();
initChecklist();

if (WORDLIST.length !== 2048) {
  console.error('BIP-39 wordlist incomplete');
}

document.addEventListener('keydown', (e) => {
  if (!$('[data-panel="2"]').classList.contains('active')) return;
  if (inputMode !== 'manual') return;
  if (e.target.matches('input, textarea, button')) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 6) {
    const faceBtn = $(`#manual-faces .face-btn[data-face="${n}"]`);
    faceBtn?.click();
  }
});

// Expose for debugging
window.__bip39dice = { setWordCount, candidateLastWords, GITHUB_URL, VEEBCH_URL };
