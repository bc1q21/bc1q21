# bc1q21 Professional — hardware recovery architectural decision
Date: 2026-10-17
Scope: ONLY professional/isolated-release-prototype
Status: NO-GO for live recipient recovery until the private offline decryption gate is solved.

## What is actually established
- Jade Plus has hardware-proven offline PSBT QR signing for four disposable regtest CLTV spends and Bitcoin Core accepted each after maturity.
- Public xpub/watch-only derivation, gift-specific link candidate parsing, funding output/script matching, a single funded 24-output regtest transaction, same-wallet public-key restoration mathematics, and retail annual/monthly calendar compatibility have separate successful tests.
- The retail recovery first-date encryption is BC1Q21G1 AES-GCM with password derived from the BIP32 private child at m/84'/0'/0'/0/2, as documented in Frontend/CryptoManager.js.
- The documented Jade QR capabilities include public xpub and PSBT signatures; they do NOT establish device-internal decryption of arbitrary BC1Q21G1 ciphertext using that retail private child. Jade BIP85 entropy export is not an equivalent operation and must not be used to transfer a wallet-derived secret into Brave.
- The recipient accesses a **specific gift link from their gift card**, never a generic homepage; the Professional recipient page never asks for a seed phrase.
- The intended beneficiary restores the SAME gift's 12-word phrase only into an offline device, with no second unrelated backup.

## Decision
Keep Jade for offline Bitcoin signing. Treat offline first-date decryption as an independently unresolved hardware capability. Do not enable claim functionality or label the public-only viewer as fully authenticated. Do not assume a sign_message output decrypts existing retail metadata.

Possible implementation avenues, each requiring a separate concrete proof:
A. Device firmware API that internally derives the exact retail child-secret and decrypts the BC1Q21G1 first-date record, displaying/returning only authenticated, minimal public date data.
B. Audited, separately isolated offline recovery agent on a dedicated non-networked computer, using the *same* 12-word gift-wallet backup and never exporting private material to the online viewer. This preserves one backup but adds offline computer and software trust, and is a proposal only, not an implementation.
C. A new versioned metadata scheme plus compatible hardware operations for NEW Professional gifts; does not silently break legacy retail gift restoration and cannot assume private metadata can be published.

## User-facing fail-closed claim boundary
Professional/recipient-claim-readiness-gate.mjs (test run 39059929001) is a synthetic readiness contract and is NOT wired into any released UI. It blocks absent gift identity, funded chain output, xpub-derived script match, date-script match, offline decryption provenance, signer availability, verified PSBT, maturity, unspent state, or payout validation. Booleans are not independently trustworthy security attestations. Every producer must be independently authenticated and rechecked before any signing/broadcast path is approved.

## Next major test
Stop adding superficial synthetic date tests. Resolve physical hardware/software capability for an offline decrypt path with exact retail child derivation. Then demonstrate independent wallet restoration, metadata decryption on trusted offline hardware/software, authenticated date handoff, wallet-derived actual gift output matching, and one regtest claim on a clean machine. No live funds/retail changes.
