# bc1q21 Professional — offline schedule encryption/recovery gate
Status: DESIGN GATE / NOT YET PROVEN. Isolated branch only. Never apply to retail or mainnet automatically.

## Verified baseline (2026-10-17)
- Four disposable hardware-signed regtest P2SH CLTV spends accepted by Bitcoin Core only after intended locktimes. Separate from schedule recovery.
- Retail Frontend/CryptoManager.js derives account m/84'/0'/0', and secret from **private child** m/84'/0'/0'/0/2:
  lowercase hex(SHA256(child_private_key_32_bytes || UTF8('bc1q21-opreturn-encryption-v1'))).
- Retail Frontend/AESHelper.js applies PBKDF2-HMAC-SHA256(UTF8(secret_hex), random salt 16 bytes, 100000 rounds), AES-256-GCM(random IV 12 bytes, AAD UTF8('BC1Q21G1'), tag 16 bytes), serialized as header[8] || salt[16] || iv[12] || ciphertext_with_tag; encoded hex.
- Retail Frontend/bc1q21-h08.js encrypts the UTF8 first release date's **hex string** (e.g. '323033302d30312d3031'), NOT a full schedule, to the first-date on-chain OP_RETURN record. Retail recovery decrypts first date and derives/checks candidate CLTV output addresses and cadence.
- Legacy 'Salted__' recovery remains a compatibility concern, not addressed by a new scheme.

## Tested (2026-10-17)
- Professional/test-offline-encryption-format.mjs uses fake, explicitly non-wallet entropy to exercise the BC1Q21G1 cipher envelope, correct-key recovery, wrong-key and tampered-ciphertext rejection. Workflow professional-offline-encryption-format.yml green, run 39055409173.
- This is a *format/unit test only*. It neither verifies exact BIP32 child derivation nor demonstrates Jade can perform the private child derivation or decrypt.

## Hardware capability boundary
- Jade QR air-gap documents PSBT transaction signing and various QR messages; ordinary PSBT signing only yields a signature. It is NOT a secure API for returning arbitrary HD child private keys or AES passwords.
- Blockstream Jade firmware has BIP85-related functionality, including export of BIP85 entropy via AES-encrypted QR in its changelog; this is NOT the retail child-private-key domain separator and is not proof of required end-to-end encrypted gift recovery.
- Do not place Jade seeds, recovery words, xprvs, WIF, any BIP32 private child, AES encryption secrets, or BIP85 plaintext-derived root material in Brave, GitHub, CI, screenshots, or ChatGPT.

## Architectural decision to prove (not yet implemented)
Option A: wallet-derived *public encryption key* plus device-side ECDH or other suitable public-key envelope; verify supported device-side operation and preservation of offline secrecy before selecting.
Option B: explicit offline encryption/recovery companion, controlled by gift owner and receiver, without browser-facing secret export; document new trust and backup model.
Option C: redesign Professional recovery record with public schedule commitments and recipient-controlled recovery metadata; check whether hiding the first-date information remains a product requirement.
BIP85 as replacement is NOT assumed compatible with retail encrypted gifts. Treat any new scheme as **versioned**; retail gifts must still recover through their established format.

## Acceptance criteria
1. Deterministic key/recovery capabilities on the actual hardware established; no secret leaves trusted offline boundary.
2. New gift schedule is encrypted offline and matches a deterministic public-only on-chain commitment.
3. Recipient restores after device loss using intended backups only, offline; no server, original creator, ChatGPT, or website private-key access.
4. Positive and negative tests: wrong wallet, altered ciphertext/metadata, different account/path, missing metadata, pre-maturity spend, legacy format.
5. Show *actual* recipient discovery of releases (1, 4, 24) and calendar/cadence, not just first-date decryption.
6. Test no secret leaks over QR, logs, workflow artifacts, URLs, browser storage, clipboard.
7. No production/retail code or network broadcast; independent review before claiming GO.

## Next technical work
Create public-only recovery-envelope test vectors and a standalone offline viewer that validates version, salt/iv lengths, schedule commitment and ciphertext authentication without relying on real wallet secrets. Hardware capability research is a separate gate. Do not claim recovery solved on a successful AES envelope test.
