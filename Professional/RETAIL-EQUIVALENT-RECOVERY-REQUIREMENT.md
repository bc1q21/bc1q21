# bc1q21 Professional — retail-equivalent recipient recovery requirement

Decision recorded 2026-10-17. Scope: isolated Professional prototype only.
Status: requirement/design correction, NOT a tested implementation.

## Authoritative intended user experience

Professional MUST retain the retail bc1q21 gift lifecycle, release discovery, and recovery model. The primary difference is that no recovery phrase or private signing material is entered into any networked browser, website, server, ChatGPT, or CI.

Example: 24 annual releases.
- Recipient restores the SAME gift wallet using its existing 12-word backup in a trusted **offline** signing device.
- Recipient opens a public-only gift viewer, which discovers the gift, restores/validates release information, and shows the matured release.
- Once a year, the recipient approves JUST that matured release in an offline device such as Jade. The signed transaction returns via QR for independent checks and optional broadcast.
- The recipient does not need a separate unrelated recovery phrase, encryption secret or key backup.
- The creator may preprepare public gift information, but the beneficiary authorizes each claimed release.
- Multiple PSBTs in one scanner session may be explored as a UX enhancement, but Jade has demonstrated individual PSBT signing only; multi-PSBT batch signing is unproven.

## Critical technical unknown

Retail Frontend/CryptoManager.js derives current gift first-date ciphertext decryption material from PRIVATE BIP32 child m/84'/0'/0'/0/2:
lowercaseHex(SHA256(child_private_key || UTF8('bc1q21-opreturn-encryption-v1'))).
Retail AESHelper.js uses BC1Q21G1 PBKDF2-SHA256/AES-GCM. Ordinary Jade QR PSBT signing does NOT expose a safe method to reproduce this arbitrary decryption secret.

Do not pretend a hardware signer automatically provides the private child or decrypts legacy gift metadata. The earlier recipient X25519 recovery experiment required a second independent backup and therefore is NOT the default product architecture.

The creator / recipient workflow is **not solved** merely because 24 synthetic schedule rows decrypt using a synthetic secret; actual wallet restoration, blockchain-based gift discovery, derivation and signature path integration remain unproven.

## Research and testing gates
1. Inspect whether supported Jade offline QR operations can derive a stable device-bound secret or execute scoped decrypt operations WITHOUT any wallet-derived secret leaving the trusted offline boundary. Never export BIP85 or private child data to browser as a workaround.
2. If unsupported, design a versioned gift metadata format recoverable by the SAME wallet recovery words on a fresh offline compatible device, with any required decryption performed inside the trusted offline component. Consider devices/capabilities other than Jade if necessary, while retaining standalone air-gapped security.
3. Gift discovery without bc1q21 servers: specify required public blockchain information, deterministic derivation paths, funded UTXO identification, release date/cadence reconstruction and no creator dependency. A public blockchain indexer or full node may supply public data, but no custodial server-only state may be required.
4. Demonstrate a genuinely offline device restore from synthetic 12-word test phrase on a CLEAN second device and discovery of an actual 1/4/24-output regtest gift, with zero private material or wallet-secret handling in the web viewer.
5. Mature and claim one release at a time, using already validated PSBT/QR/Bitcoin Core CLTV flow.
6. Negative cases: wrong recovery words, corrupted metadata, out-of-order/omitted releases, unrelated coin addresses, device loss, and legacy retail gifts.
7. Version all new gift formats; do not alter the retail branch or falsely claim backwards compatibility. Security review before any mainnet/prod GO.

## Status
- Four disposable Jade PSBT signings and Bitcoin Core acceptance at regtest heights: passed.
- Synthetic AES BC1Q21G1 envelope: passed.
- Synthetic encrypted 1/4/24 schedule packages: passed.
- Synthetic recipient X25519 recovery: passed technically but REJECTED as default architecture because it needs a separate recipient backup.
- Same-12-word offline Jade-based full gift discovery and metadata recovery: NOT YET PROVEN.
