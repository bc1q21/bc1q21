# bc1q21 Professional — restart handover (2026-10-28)

Read this file at the start of the next development session. Owner requested stopping for the day. No more changes today after saving this note.

## Project boundary — mandatory
- Brand is always **bc1q21**. Retail is the live existing product. Professional is a separate future air-gapped Jade Plus variant, NOT a Retail production change.
- GitHub repository: `bc1q21/bc1q21`; development branch: `professional/isolated-release-prototype`.
- All edits restricted to `Professional/` and, if required, Professional-only GitHub Actions workflows. Do not edit or deploy `main`, `Frontend/`, `Website/` or `Backend/` to production. Retail frontend is mirrored/read-only in the local development package.
- No real BTC, live funding, seed words, signing, or broadcasting during preview.
- User is nontechnical and wants instructions **one step at a time**; no redundant screenshots, needless repetitive downloads, or microcommits.

## Verified successful work today
- Professional Identity page works; optional firm identity fields blank default to bc1q21.
- Professional identity proceeds to familiar Retail welcome, liability acceptance and Plan Your Gift.
- Preview Bitcoin pricing initially blocked planning. Local-only preview fixed BTC/USD price at $80,000, and CSP permitted `connect-src 'self'` for local Retail config while external requests remain blocked. Workflow validation check was adjusted. With 0.001 BTC test gift, user progressed beyond price page successfully.
- Multiple-date Retail planning completed and navigated to Jade Plus development/diagnostic section. User saw actual chosen release dates carried over; this is a **prototype handoff**, not verified signing.
- User approved removing technical detail from final customer Jade UI. Customer sees only normal header, concise instructions, large animated QR, Continue to Scan Signed QR, camera, verification result; no visible xpub, block height, scripts, addresses or diagnostics repeated after plan review.
- The current Jade page is a regtest research diagnostic and must not be presented as complete gift-specific authorization.

## Confirmed Retail signing architecture
- `Frontend/CryptoManager.js` derives keys in browser from mnemonic, including funding path `m/84'/0'/0'/0/0` and distinct CLTV child keys; constructs P2SH CLTV addresses from release dates.
- `Frontend/bc1q21-h08.js`: `startDistributionPipeline()` runs after funding UTXOs are known, builds outputs to CLTV addresses, fee/change, and calls `TransactionManager.buildAndSignDistribution({utxos, outputs, wif, opReturnHex})`, then backend broadcasts signed hex.
- `Frontend/TransactionManager.js`: distribution spends initial deposit with funding key; `buildAndSignRelease()` signs later beneficiary CLTV release. These are two separate signatures. Address construction itself does not require signing.
- Therefore **approved new UX order**: Professional Identity → familiar Retail gift planning/review → Add Funds/deposit → after actual UTXOs, final outputs and fees are known, animated Jade Plus QR for distribution signing → scan returned signed QR → local cryptographic gift-specific verification → broadcast via own node as applicable → Finish. Future beneficiary separately signs matured release. The precise order of verification/broadcast/Finish and any required wallet data exchange still needs engineering design.
- Critical: cannot pre-sign distribution transaction at plan review because its funding inputs are not yet known. Do not claim QR scanning alone is signing. Only verified gift-specific signatures permit proceeding. Any changed inputs, outputs or fees invalidate signatures.

## Privacy and key-handling requirements
- All gift plans, keys, scripts, QR payloads, transaction assembly and signature verification stay on customer's browser/device. Jade holds private keys; no seed words/private keys or private gift records to bc1q21. No server-side gift database or custody.
- The existing backend may broadcast signed raw transactions and obtain public chain information; this is different from collecting gift records. Do not promise the backend learns literally nothing from a broadcast transaction.
- Determine how beneficiary receives required signing capability and durable gift recovery information years later, without bc1q21 storing it.
- User approves familiar Retail design, not reuse of Retail browser mnemonic signing for Professional.

## GitHub checkpoints and workflows
- `Professional/RETAIL-SIGNING-ARCHITECTURE-REVIEW.md` committed at `e60ddb620f2c8c83ff4098b63dac40cd34901d5a`, subsequently fetched/verified.
- `Professional/retail-mirror/index.html` local preview pricing/config fix and `.github/workflows/professional-preview.yml` check fix previously committed; GitHub Actions browser-preview green.
- User's final screenshot shows green checks for `Professional Bitcoin Core regtest validation` and `Professional browser preview package` on architecture checkpoint commit, plus prior green preview workflow.
- Local Windows preview extracted in `C:\Users\partt\Downloads\bc1q21-professional-browser-preview (2)`. Preview run from that directory with `python -m http.server 8765 --bind 127.0.0.1`, open `http://127.0.0.1:8765/Professional/index.html`. Local server may still be running; no need to restart unless needed. It is NOT live website.

## Existing prototype files
- `Professional/index.html`: identity page.
- `Professional/retail-mirror/index.html`: familiar Retail wizard mirrored with Professional bridge and safe preview restrictions.
- `Professional/retail-plan-bridge.mjs`: plan handoff.
- `Professional/gift-edit-gate.mjs` and test: prototype edit lock, not yet connected to verified real signatures.
- `Professional/professional-creator-prototype.html`, `Professional/recipient-gift-specific-prototype.html`: Jade research diagnostics.
- `.github/workflows/professional-preview.yml`: ZIP packaging, no deployment.
- Existing preview limitation: embedded liability disclaimer document renders as gray broken frame in local preview; optional logo shows broken-image placeholder. Deferred, not production proof.

## Next engineering tasks (do not assume complete)
1. Inspect precise Retail `CryptoManager.deriveCltvChild()` paths and redeem-script structure, and compare with Jade public-only derivation. Confirm compatibility with Jade Plus hardware/firmware and supported air-gapped QR/PSBT workflow.
2. Map funding address key, deposit UTXOs, distribution PSBT, Jade signing, signature verification and broadcast; ensure Professional never asks for browser seed/WIF.
3. Map beneficiary release key custody and signing path separately, including device-independent long-term recovery and correct CLTV handling.
4. Implement **isolated** Professional integration and tests; no real BTC; avoid customer-facing diagnostic clutter. Only lock gift details after valid required signature verification. Consider pre-signing edits and fee/UTXO changes.
5. Review disclaimer, identity logo and preview polish later, after core signing architecture works.

## Immediate restart
First read `Professional/RETAIL-SIGNING-ARCHITECTURE-REVIEW.md` and this file from GitHub; verify branch. Continue technical design/implementation on isolated Professional branch, not Retail. User can paste this note in new chat; do not ask user to repeat decisions.

**Status:** architecture and browser preview checkpoint saved, GitHub workflows green; gift-specific Jade signing and Add Funds/Finish not yet implemented. Stop for the day.
