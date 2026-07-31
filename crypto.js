/**
 * BIP-39 helpers for the educational dice demo.
 * Checksum candidate logic mirrors veebch/Bip39-Dice 24thword.py
 * (which supports both 11-word and 23-word prefixes).
 *
 * All crypto runs client-side with Web Crypto.
 * Never use practice seeds for real funds.
 */

import { WORDLIST } from './wordlist.js';

export { WORDLIST };

/** Supported mnemonic lengths (BIP-39). Default for this lab: 12. */
export const LENGTHS = {
  12: {
    totalWords: 12,
    entropyWords: 11,
    entropyBits: 128,
    checksumBits: 4,
    entropyBytes: 16,
    lastWordCandidates: 128, // 2^(11 - 4)
    label: '12 words',
  },
  24: {
    totalWords: 24,
    entropyWords: 23,
    entropyBits: 256,
    checksumBits: 8,
    entropyBytes: 32,
    lastWordCandidates: 8, // 2^(11 - 8)
    label: '24 words',
  },
};

export function getLengthConfig(totalWords) {
  const cfg = LENGTHS[totalWords];
  if (!cfg) throw new RangeError(`Unsupported length: ${totalWords}`);
  return cfg;
}

/** Odd = 0, Even = 1 — same mapping as veebch/Bip39-Dice paper calculator */
export function faceToBit(face) {
  const n = Number(face);
  if (!Number.isInteger(n) || n < 1 || n > 6) {
    throw new RangeError('Die face must be 1–6');
  }
  return n % 2 === 0 ? 1 : 0;
}

/** Powers of two for 11 bits, LSB first (matches the paper calculator). */
export const POWERS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

/** Convert 11 bits (LSB first) to BIP-39 index 0–2047. */
export function bitsToIndex(bits) {
  if (!Array.isArray(bits) || bits.length !== 11) {
    throw new RangeError('Need exactly 11 bits');
  }
  let idx = 0;
  for (let i = 0; i < 11; i++) {
    if (bits[i]) idx += POWERS[i];
  }
  return idx;
}

export function indexToWord(index) {
  if (index < 0 || index >= 2048) throw new RangeError('Index out of range');
  return WORDLIST[index];
}

export function wordToIndex(word) {
  const i = WORDLIST.indexOf(String(word).trim().toLowerCase());
  if (i < 0) throw new Error(`Unknown BIP-39 word: ${word}`);
  return i;
}

/** Roll a fair d6 (for practice mode only). */
export function rollDie() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 6) + 1;
}

export function facesToBits(faces) {
  return faces.map(faceToBit);
}

export function facesToWord(faces) {
  const bits = facesToBits(faces);
  const index = bitsToIndex(bits);
  return {
    faces,
    bits,
    index,
    word: indexToWord(index),
    powers: POWERS.map((p, i) => ({ power: p, bit: bits[i], contrib: bits[i] ? p : 0 })),
  };
}

/**
 * Given the first N−1 BIP-39 words, return all valid last (checksum) words.
 * Mirrors veebch/Bip39-Dice 24thword.py for both 12- and 24-word mnemonics:
 *   - 11 prefix words → 128 valid 12th words
 *   - 23 prefix words → 8 valid 24th words
 *
 * @param {string[]|string} phrasePrefix
 * @param {12|24} totalWords
 */
export async function candidateLastWords(phrasePrefix, totalWords = 12) {
  const cfg = getLengthConfig(totalWords);
  const words = Array.isArray(phrasePrefix)
    ? phrasePrefix
    : String(phrasePrefix).trim().split(/\s+/);

  if (words.length !== cfg.entropyWords) {
    throw new Error(`Expected ${cfg.entropyWords} words, got ${words.length}`);
  }

  const indices = words.map(wordToIndex);
  let entropy = 0n;
  for (const idx of indices) {
    entropy = (entropy << 11n) + BigInt(idx);
  }

  const { checksumBits, entropyBytes } = cfg;
  const entropyToFill = 11 - checksumBits;
  const entropyBase = entropy << BigInt(entropyToFill);
  const candidates = [];

  for (let i = 0; i < 2 ** entropyToFill; i++) {
    const entropyCandidate = entropyBase | BigInt(i);
    const entropyBytesArr = bigIntToBytes(entropyCandidate, entropyBytes);
    const hash = await sha256(entropyBytesArr);
    const checksum = hash[0] >> (8 - checksumBits);
    const finalWordIdx = (i << checksumBits) + checksum;
    candidates.push({
      rank: i + 1,
      index: finalWordIdx,
      word: WORDLIST[finalWordIdx],
      entropyBits: i,
    });
  }

  return candidates;
}

/** @deprecated Use candidateLastWords(phrase, 24) */
export async function candidate24thWords(phrase23) {
  return candidateLastWords(phrase23, 24);
}

/** Validate a full mnemonic checksum. */
export async function isValidMnemonic(words) {
  const list = Array.isArray(words) ? words : String(words).trim().split(/\s+/);
  if (list.length !== 12 && list.length !== 24) return false;
  const prefix = list.slice(0, -1);
  const last = list[list.length - 1];
  const cands = await candidateLastWords(prefix, list.length);
  return cands.some((c) => c.word === last);
}

/**
 * Pick among `numOptions` candidates (must be a power of 2) by rolling
 * log2(numOptions) dice as odd/even bits — same bit mapping as the paper method.
 * Returns 1-based rank.
 */
export function pickRankWithDiceBits(numOptions) {
  if (numOptions < 2 || (numOptions & (numOptions - 1)) !== 0) {
    throw new RangeError('numOptions must be a power of 2');
  }
  const bitsNeeded = Math.log2(numOptions);
  let value = 0;
  const faces = [];
  for (let i = 0; i < bitsNeeded; i++) {
    const face = rollDie();
    faces.push(face);
    const bit = faceToBit(face);
    if (bit) value += 1 << i; // LSB first, same as paper calculator
  }
  return { rank: value + 1, faces, bitsNeeded };
}

/**
 * Two d6 → 1–8 with rejection (legacy helper for 24-word path demos).
 * Prefer pickRankWithDiceBits for both lengths.
 */
export function twoDiceTo1to8(a, b) {
  const n = (a - 1) * 6 + (b - 1); // 0–35
  if (n >= 32) return null;
  return (n % 8) + 1;
}

function bigIntToBytes(value, size) {
  const out = new Uint8Array(size);
  let v = value;
  for (let i = size - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}
