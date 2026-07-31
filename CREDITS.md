# Credits

## Primary method — veebch / Bip39-Dice

This educational site visualizes the offline dice workflow published by **veebch**:

- **Repository:** https://github.com/veebch/Bip39-Dice  
- **License:** GPL-3.0  
- **What we teach from it:**
  - [BIP39DiceManualCalculator.pdf](https://github.com/veebch/Bip39-Dice/blob/master/BIP39DiceManualCalculator.pdf) — paper process for the first 11 or 23 words  
  - Odd face → bit `0`, even face → bit `1`  
  - Powers of two (LSB first): `1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024`  
  - [`24thword.py`](https://github.com/veebch/Bip39-Dice/blob/master/24thword.py) — valid last-word candidates for an 11- or 23-word prefix  

If this site helped you, please support the original project:

**https://github.com/veebch/Bip39-Dice**

## Upstream checksum script

veebch notes that the 24th-word Python code was taken from:

- https://github.com/avsync/bip39chk  

Our browser implementation follows the same BIP-39 checksum math so practice results match those offline tools.

## BIP-39 standard

- Spec: https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki  
- English wordlist: https://github.com/bitcoin/bips/blob/master/bip-0039/english.txt  

## This website

- **Site:** https://bip39dice.com  
- **Source:** https://github.com/adamsimecka/bip39dice  
- Independent educational UI. Not affiliated with veebch, Coinkite, or COLDCARD.
