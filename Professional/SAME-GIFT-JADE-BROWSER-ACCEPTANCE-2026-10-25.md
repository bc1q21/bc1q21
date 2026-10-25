# bc1q21 Professional — same-gift Jade browser acceptance checkpoint (2026-10-25)

## Scope and evidence
Isolated branch `professional/isolated-release-prototype`. This is a software-only Chromium camera replay of captured, public, disposable regtest evidence, NOT a new physical Jade operation and NOT a live release.

- **Browser workflow:** GitHub Actions run 40211952638, commit `ed236e1718da5cf518b6110051390cff36730ed0`, conclusion **success**.
- **Companion isolated PSBT workflow:** run 40211952614, conclusion **success**.
- The original 24-output funded regtest gift's release-0 unsigned PSBT and preserved signed QR records were used. The saved `bc1q21_Jade_Signed_PSBT_QR_frames (7).txt` file contains **19 fountain-coded UR records**; the original physical Jade session was reported to have shown **seven** signed QR frames. These are different counts and must not be conflated.
- The camera replay decoded those QR records into the same signed PSBT independently checked outside the browser. It exercised both the low-level camera receiver and the **actual recipient signed-return handler**, verified the signer and transaction, finalized the same raw regtest transaction and asserted `broadcast:false`, `canBroadcast:false`, and `beneficiaryAuthorized:false`.
- Negative path: an intentionally rejected signed return did **not** complete the camera receiver. No browser network requests were made. No Bitcoin transaction was broadcast.
- The test used a simulated browser camera video feed. No claim of a new physical device-to-camera acceptance is made.

## What this does NOT close
This passing test does not establish a complete creator-to-recipient gift journey or production readiness. The remaining integrated gate is to bind **one gift-card locator and the approved public release calendar** to **all independently observed funded output scripts, amounts, maturity and chain provenance**, and to an **independently retained creator commitment**. Then demonstrate the recipient's reviewed release PSBT and captured Jade-signed return through the same gift-specific browser UI, without weakening beneficiary authorization. The existing static `recipient-gift-specific-prototype.html` remains a mockup and cannot be presented as a funded recipient page.

The original 24-output gift's historical creator-authenticated commitment remains unproven. Do not fabricate one or infer authentication from a fixture. A newly generated prospective disposable regtest gift may provide authentic prospective evidence, clearly distinguished from the October 20 historical gift.

## Fixed owner requirements
Retail-equivalent gift creation, gift card, public Professional release schedule (Option B), funding, recipient review and release; one original 12-word recovery phrase restored **offline** on one Jade Plus signer; no second computer, second mnemonic or additional wallet. No seed on website/CI/networked computer. Only Professional files and professional workflows may change. No retail changes, real BTC, hardware operation or broadcast without explicit approval.

**Gate status:** Jade signed-return browser integration **PASSED**; entire Professional retail-parity lifecycle **NOT YET PASSED**; no production go-live.
