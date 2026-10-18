# bc1q21 Professional — authoritative session handoff, 2026-10-18

**Session:** Sunday, October 18, 2026 — OWNER REQUESTED STOP FOR THE DAY. Do not start background work.  
**Repository:** `bc1q21/bc1q21`  
**ONLY authorized branch:** `professional/isolated-release-prototype`  
**Permitted edits:** `Professional/` and `.github/workflows/professional-*.yml` ONLY. No edits to retail/main, no production deployment, no Start9, no mainnet, no real Bitcoin.

## Start here on next session — plain-English status

**The fundamental air-gapped Bitcoin time-locking and signing mechanism has been demonstrated successfully with physical Jade Plus hardware.** This is a major milestone. It does **not** mean the complete Professional product is finished, nor that a single creator-signed 24-output transaction has been broadcast and later claimed end-to-end.

- **Creator funding test — PASS:** One unsigned funding PSBT containing **24 distinct P2SH/CLTV gift outputs plus one creator change output** was presented as **13 animated QR frames** to Jade Plus. The owner reviewed **25 outputs**, observed gift amounts rising from **12,000 sats** in increments of **1,000 sats**, change **433,500 sats**, fee **2,500 sats**, and approved signing **once**. Jade returned an animated signed QR.
- **Return and independent local verification — PASS:** The owner captured Jade's response using the local webcam tool (at least **17 captured frames**) and saved `bc1q21_Jade_Signed_PSBT_QR_frames (6).txt` on their Windows computer. The final corrected offline HTML verifier reported exactly: **“PASS — Signature valid; 24 gifts, change and 2500 satoshi fee match. No broadcast.”** The owner supplied a screenshot. **The raw signed capture was not committed to GitHub.**
- **Earlier recipient release tests — PASS independently:** Four distinct disposable Bitcoin Core regtest P2SH/CLTV outputs were physically signed by Jade Plus, rejected by Bitcoin Core before maturity and accepted at maturity. Runs **39051477566**, **39052501320**, **39053883952**. Do not repeat.
- **Interpretation:** The 24-output creator transaction is **one transaction signed in one hardware approval after 25 output review screens**, **NOT** 24 distinct release PSBTs signed in one batch. Recipient still signs each matured release separately. The creator signed transaction was **not broadcast** in this physical test. No full creator→recipient integrated lifecycle has yet passed.

## Formal acceptance record — committed

`Professional/JADE-24-OUTPUT-CREATOR-HARDWARE-ACCEPTANCE-2026-10-18.md`  
Commit: `89bcd912411ecf5e8fa34a00125ae0e840cf84eb`  
Link: https://github.com/bc1q21/bc1q21/blob/professional/isolated-release-prototype/Professional/JADE-24-OUTPUT-CREATOR-HARDWARE-ACCEPTANCE-2026-10-18.md

Supporting architecture: `Professional/CREATOR-24-RELEASE-SIGNING-ARCHITECTURE-2026-10-18.md`.

## Verifier incident and closure

Several earlier offline verifier packages had browser JavaScript errors. One showed `Cannot read properties of undefined (reading 'buffer')` before file selection. The verifier was repaired by replacing a WebAssembly-dependent signature backend with pure JavaScript secp256k1 and rebuilt. The **final successful packaging workflow run is 39149412574**:
https://github.com/bc1q21/bc1q21/actions/runs/39149412574

The owner downloaded **`professional-jade-24-signature-verifier-offline (2).zip`**, extracted it, opened the HTML in Brave, confirmed the initial **“Waiting for local capture file”** state, selected **`bc1q21_Jade_Signed_PSBT_QR_frames (6).txt`**, and received the above **PASS** result. **Do not re-run the signing, webcam capture or verification unless a concrete new defect warrants it.** Jade Plus is switched off.

## Next engineering work — prioritize product integration, not more isolated repeats

### B. Integrated gift-specific recipient lifecycle — NEXT

Develop the isolated Professional creator-to-recipient workflow using the **existing retail-style gift-specific page** as target (one shared recipient page wherever securely practical). The gift card QR/link must open **that particular gift**, not the homepage or a generic dashboard. Before authorization the page may show general public gift data (amount, count), but **must not reveal individual release dates or full schedule**. A public xpub or script inference does not authorize disclosure.

Integrate and prove the following as one controlled regtest flow: gift construction and funding → gift-specific link and validated public candidate → authorized recipient access → maturity determination → build exactly one correct recipient release PSBT → Jade offline QR signing → locally verify signed result → Bitcoin Core reject pre-maturity / accept at maturity. The creator signing test and four recipient release tests prove separate parts, **not this joined flow**.

**Do not demand additional owner hardware scans until an integrated fixture is ready and there is a genuinely new acceptance question.** First use synthetic/disposable regtest and CI, and make the minimal manual hardware request only when necessary.

### C. Secure private schedule unlock with original gift backup — OPEN SECURITY GATE

Retail recipients use their original **12-word gift recovery phrase** to unlock release dates. Professional must ideally offer **“Unlock with offline hardware wallet / Jade”** on the same gift-specific page, **without entering the 12 words into the browser or exposing seed, child private key or AES password to the online host**. A replacement Jade should restore authority from the **same original gift's 12 words**, without requiring a second unrelated secret.

Existing retail metadata `BC1Q21G1` encryption derives its key from private BIP32 child `m/84'/0'/0'/0/2`, SHA-256 domain separation and PBKDF2/AES-GCM. Documented Jade QR interfaces have **not** established a method to decrypt that exact retail envelope internally. **No secure Jade-based private date unlock has been proven.** Do not substitute public xpub/date brute force or treat PSBT signing as a private schedule unlock. A correctly versioned Professional metadata design or supported hardware operation requires a security decision before shipping.

### Product/security boundaries

- **Retail:** Keep stable and untouched. Professional is a separate future architecture until explicitly authorized for production.
- **Creator:** one 24-output funding PSBT signed via Jade animated QR is physically proven. Review was 25 screens, one final approval; no promise of frictionless single-screen signing.
- **Recipient:** one matured release at a time, offline hardware QR; do not re-sign all 24 each year.
- **Security:** no mainnet funds, no production changes, no wallet words/private keys in source, logs, uploads, or GitHub artifacts.
- **No release claim:** Professional is **not yet complete, audited or deployable**.

## Starting procedure for the next ChatGPT conversation

1. Fetch and read **this exact file** from GitHub on `professional/isolated-release-prototype` before changing code. Also consult the formal hardware acceptance record and `Professional/SESSION-HANDOFF-2026-10-17.md` for older test evidence and full user UX constraints.
2. Briefly confirm that **Priority A (creator 24-output Jade signing) PASSED** and **Priority B (integrated recipient lifecycle) is next**; **Priority C (secure private schedule unlock) remains open**.
3. Inspect the existing Professional code and workflows for gift-specific link parsing, candidate/script binding, CLTV construction, offline QR exchange, and regtest verification. Plan the shortest integration path and then **do the engineering and GitHub CI autonomously**. Avoid another sprawling round of exploratory tests.
4. Keep work on the isolated Professional branch and allowed paths only. Confirm CI results before reporting PASS. Ask owner for one-at-a-time hardware instructions **only** if indispensable.
5. Stop and request an explicit architecture/security decision rather than weakening the private schedule requirement. Do not modify retail/main or deploy anything.

## Owner's closing decision

The owner understands that the **engine has demonstrated its core air-gapped time-locked Bitcoin capabilities**, but the **complete engine/transmission/product integration is unfinished**. They are pleased with the result, requested a Sunday rest day, and want the next session to resume efficiently from this record. **No further work today after recording the handoff.**
