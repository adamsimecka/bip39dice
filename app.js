/**
 * bip39dice.com — simple beginner demo
 * Method: veebch/Bip39-Dice
 */

import { rollDie, facesToWord, candidateLastWords, WORDLIST } from './crypto.js';

const $ = (s) => document.querySelector(s);

const dieRow = $('#die-row');
const btnRoll = $('#btn-roll');
const result = $('#result');
const resultWord = $('#result-word');
const resultMeta = $('#result-meta');
const math = $('#math');
const mathDetail = $('#math-detail');
const btnShowMath = $('#btn-show-math');
const btnPracticeFull = $('#btn-practice-full');
const btnPractice24 = $('#btn-practice-24');
const btnPracticeAgain = $('#btn-practice-again');
const fullSeed = $('#full-seed');
const seedList = $('#seed-list');
const live = $('#live');

let lastFaces = null;
let practiceLength = 12;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function renderEmptyDice() {
  dieRow.innerHTML = Array.from({ length: 11 }, (_, i) => {
    return `<div class="die-mini" data-i="${i}">?</div>`;
  }).join('');
}

async function animateAndRoll() {
  btnRoll.disabled = true;
  btnRoll.textContent = 'Rolling…';
  result.hidden = true;
  math.hidden = true;
  btnShowMath.textContent = 'Show the simple math';

  const faces = [];
  const cells = [...dieRow.querySelectorAll('.die-mini')];

  for (let i = 0; i < 11; i++) {
    const face = rollDie();
    faces.push(face);
    const el = cells[i];
    el.classList.add('rolling');
    // quick flicker
    for (let f = 0; f < 4; f++) {
      el.textContent = String(rollDie());
      await sleep(30);
    }
    el.textContent = String(face);
    el.classList.remove('rolling');
    await sleep(25);
  }

  lastFaces = faces;
  const { word, index, bits } = facesToWord(faces);

  resultWord.textContent = word;
  resultMeta.textContent = `Word #${index + 1} on the official list of 2,048`;
  mathDetail.textContent = `Dice: ${faces.join(' ')}  →  bits: ${bits.join('')}  →  index ${index}  →  “${word}”`;
  result.hidden = false;

  btnRoll.disabled = false;
  btnRoll.textContent = 'Roll again';
  live.textContent = `Practice word: ${word}`;
}

btnRoll.addEventListener('click', animateAndRoll);

btnShowMath.addEventListener('click', () => {
  const open = math.hidden;
  math.hidden = !open;
  btnShowMath.textContent = open ? 'Hide the math' : 'Show the simple math';
});

async function buildPracticeSeed(totalWords) {
  practiceLength = totalWords;
  const entropyWords = totalWords - 1;
  const words = [];

  btnPracticeFull.disabled = true;
  if (btnPractice24) btnPractice24.disabled = true;

  for (let i = 0; i < entropyWords; i++) {
    const faces = Array.from({ length: 11 }, () => rollDie());
    words.push(facesToWord(faces).word);
  }

  const candidates = await candidateLastWords(words, totalWords);
  // Pick first candidate for simplicity in demo (or random)
  const last = candidates[Math.floor(Math.random() * candidates.length)].word;
  const all = [...words, last];

  seedList.innerHTML = all
    .map((w, i) => {
      const isLast = i === all.length - 1;
      return `<li class="${isLast ? 'checksum' : ''}"><span>${i + 1}.</span>${w}${
        isLast ? ' · last word (checksum)' : ''
      }</li>`;
    })
    .join('');

  fullSeed.hidden = false;
  btnPracticeFull.disabled = false;
  if (btnPractice24) btnPractice24.disabled = false;
  live.textContent = `Practice ${totalWords}-word seed ready`;
  fullSeed.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

btnPracticeFull.addEventListener('click', () => buildPracticeSeed(12));
btnPracticeAgain?.addEventListener('click', () => buildPracticeSeed(practiceLength));
btnPractice24?.addEventListener('click', () => buildPracticeSeed(24));

// Init
renderEmptyDice();

if (WORDLIST.length !== 2048) {
  console.error('Wordlist incomplete');
}
