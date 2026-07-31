# bip39dice.com

Interactive educational walkthrough of **offline BIP-39 seed generation with physical dice**.

**Live site:** https://bip39dice.com  
**Source:** https://github.com/adamsimecka/bip39dice

## Method credit (required reading)

This lab teaches the process published by **[veebch/Bip39-Dice](https://github.com/veebch/Bip39-Dice)** (GPL-3.0):

| Asset | Role |
|--------|------|
| [BIP39DiceManualCalculator.pdf](https://github.com/veebch/Bip39-Dice/blob/master/BIP39DiceManualCalculator.pdf) | Paper calculator for entropy words |
| Odd = 0 / Even = 1 | Bit mapping from a d6 |
| Powers of two (LSB first) | Index into the BIP-39 wordlist |
| [`24thword.py`](https://github.com/veebch/Bip39-Dice/blob/master/24thword.py) | Valid last-word candidates (11- or 23-word prefix) |

veebch credits the checksum Python logic to [avsync/bip39chk](https://github.com/avsync/bip39chk).

**For real funds, use veebch’s offline tools on an air-gapped machine — not this website.**

See [CREDITS.md](./CREDITS.md) for full attribution.

## Features

- **12-word path (default)** — 128-bit entropy, 128 last-word candidates  
- **24-word path** — 256-bit entropy, 8 last-word candidates  
- Interactive dice lab (auto-roll or enter physical faces)  
- Live odd/even → powers of two → BIP-39 word  
- Practice full seed + checksum candidates (veebch algorithm)  
- Offline checklist for real-world use  

## Security

**Practice lab only.** Never fund a seed generated or typed on an internet-connected device. All crypto runs client-side; no seed material is uploaded.

## Local development

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

Requires a modern browser (ES modules + Web Crypto). Serve over HTTP(S), not `file://`.

## Deploy

Static files only (Cloudflare Pages, Netlify, nginx, S3, …). No build step.

Cloudflare Pages: connect this repo, leave build command empty, output directory `/` or `.`.

## License

- **This site’s UI code:** MIT (see [LICENSE](./LICENSE))  
- **veebch/Bip39-Dice method & scripts:** GPL-3.0 (their repository)  
- **BIP-39 wordlist:** from the Bitcoin BIPs project  

Not affiliated with veebch, Coinkite, or COLDCARD.
