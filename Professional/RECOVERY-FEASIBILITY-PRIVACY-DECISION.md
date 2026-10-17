# bc1q21 Professional — recovery feasibility and privacy decision
Date: 2026-10-17
Branch: professional/isolated-release-prototype
Decision: NO-GO for automatic live claims or promotion until offline recovery is proved.

## What the firmware actually exposes
Blockstream Jade official repository docs/index.rst documents:
- get_xpub for a requested public BIP32 path;
- sign_message (legacy and anti-exfil variants) for signature operations;
- get_bip85_pubkey: supports RSA derivation, not arbitrary wallet-data decryption;
- get_bip85_bip39_entropy: returns derived BIP85 entropy **encrypted to a host public key**. The host's matching private key decrypts it. This is NOT a generic Jade-side AES-GCM decryption service.
The documented RPCs therefore do not establish a Jade QR method to internally reproduce the retail bc1q21 encryption secret derived from m/84'/0'/0'/0/2, nor a way to decrypt a retail BC1Q21G1 record inside Jade.

Source: https://github.com/Blockstream/Jade/blob/master/docs/index.rst

## Privacy assessment: xpub-assisted schedule discovery
A public account xpub may let a verifier derive the non-hardened per-release signer public keys and compare candidate calendar dates with on-chain P2SH CLTV locking scripts. This suggests *potential* discovery without ever decrypting BC1Q21G1. However:
1. An xpub is public for spending authority, NOT necessarily safe to publish: it can correlate many recipient addresses/releases and defeat timing privacy if shared broadly or retained by a site.
2. Retail currently distinguishes 'legacy' single-key CLTV from per-index signer keys; a public-account-xpub-only candidate method cannot be treated as retail-compatible without testing both.
3. Discovery also requires unambiguous funded gift identity, correct on-chain output sets, exact date/calendar rules, bounded candidate windows and chain-trust assumptions.
4. Finding a plausible date does not authenticate its source, a beneficiary's ownership, or recovery on Jade. Nor does it guarantee that encrypted metadata privacy was preserved.
5. The exploratory public-date-matching code addition was blocked by repository write restrictions; no successful implementation or test is claimed.
6. Do NOT substitute a date-search mechanism into retail or production; obtain explicit product/security acceptance of the privacy change first.

## Proven and outstanding capabilities
PROVEN: Jade signed four independent disposable PSBTs; Bitcoin Core accepted each after CLTV maturity. Public-account key derivation, 24 funded outputs in one regtest gift, synthetic restoration maths, and retail calendar compatibility passed isolated tests.
NOT PROVEN: device-internal BC1Q21G1 decrypt; hardware seed restore on a clean Jade; authentic recovered date binding; retail-style gift-card link discovery without bc1q21 infrastructure; privacy-safe xpub handoff; recipient claim through the assembled interface.
A test of a Boolean 'offlineDateRecoveryAuthenticated' status is a fail-closed UI contract only, not a cryptographic attestation.

## Concrete product paths to decide
Option 1 — **offline trusted recovery component** on a dedicated air-gapped computer. Recipient restores the SAME 12-word gift backup ONLY on that trusted offline environment, reads retail BC1Q21G1 locally, and presents minimal verified public recovery results to the networked gift page. Jade can then sign the matured transaction independently. This has no second mnemonic but adds independent offline-computer security responsibilities. Hardware and software end-to-end test plus independent review are mandatory.
Option 2 — future wallet firmware with a secure, audited device-internal retail-compatible decryption API, returning only the approved public recovery record. No documented current Jade QR API meets that requirement.
Option 3 — versioned NEW-gift metadata scheme enabling single-backup recovery under an explicitly analyzed privacy policy. Must not make legacy retail gifts unrecoverable.
Option 4 — bounded public script/date search with a **trusted offline xpub exposure/privacy assessment**. Consider only after explicit authorization; do not claim the method is ready.

## Recommendation
Do not keep adding cosmetic tests or present a false hardware milestone. Keep Jade QR as the proven offline Bitcoin signer. Select and validate one exact private recovery architecture with its threat model. The smallest currently conceivable implementation without new Jade firmware is the dedicated air-gapped recovery component; it may use an existing spare Windows laptop, but only after controlled reinstallation and true offline handling are approved by the user. Do not request real seed words over chat, browser, CI or GitHub. Stay on isolated regtest and Professional branch.
