# START HERE — bc1q21 Professional next-session handoff (OWNER-LOCKED)
**Date:** 2026-10-23. **Status:** End-of-day handoff. Do not reopen settled architecture or request repeated owner decisions.
**Repository:** bc1q21/bc1q21
**Authorized branch:** `professional/isolated-release-prototype`
**Authorized edit paths:** `Professional/` and `.github/workflows/professional-*.yml` ONLY.
**NEVER** edit `main`, retail `Frontend/`, live website, production, server, nginx or Start9. No real BTC or broadcast.

## READ THIS FIRST — FIXED OWNER DECISIONS, NOT OPTIONS
1. **Professional is retail-equivalent gift creation, gifting, discovery, recipient experience and release, with exactly ONE change: the beneficiary's Bitcoin keys stay air-gapped and the transaction is signed by ONE offline hardware signer using QR PSBTs.** Current signer for acceptance is Jade Plus, but the product is not vendor-locked.
2. **One original gift wallet / one original 12-word recovery phrase.** Creator gives the SAME 12 words to beneficiary; beneficiary restores them directly on the offline hardware signer. NO second computer, air-gapped laptop, offline companion, extra wallet, extra phrase, additional signer, firmware-decryption project or alternative architecture. Any requirement for these is a fundamental project blocker to report, NOT permission to redesign.
3. **PROFESSIONAL RELEASE DATES ARE PUBLIC TO ANYONE HOLDING THE PROFESSIONAL GIFT LINK. THIS WAS EXPLICITLY APPROVED ON OCTOBER 19 AND REAFFIRMED EMPHATICALLY OCTOBER 23.** It is a deliberate, accepted Professional-only privacy trade-off. Do not try to decrypt legacy retail BC1Q21G1 gift-date metadata inside Jade. Do not resume 'Jade schedule unlock' or offline AES work as a blocker for Professional. Publishing dates never grants spend authority.
4. **RETAIL IS UNCHANGED.** Retail encrypted dates, UI and code are not to be modified, nor are Professional decisions to be retrofitted to retail. Preserve familiar retail gift-card, calendar, recipient and release UX in Professional as far as possible.
5. QR journey: site uses creator-published public gift schedule and independently verified funded output details to prepare unsigned PSBT; one offline hardware signer restored from SAME 12 words signs by QR; signed transaction returns by QR for independent verification and mature release. Never enter seed, xprv, WIF or wallet-derived secret into website, GitHub, CI, ChatGPT or networked PC.
6. If exact architecture is impossible with acceptable privacy/security, **STOP and report concrete technical blocker to owner**. Do NOT brainstorm alternatives, add devices or restart previously settled discussions.

## THE ONLY IMMEDIATE ENGINEERING TARGET
**Complete and verify gift-link → published PUBLIC release schedule → actual funded gift and ALL output scripts/amounts → independent recipient-retained creator commitment → beneficiary review → maturity → one-use unsigned PSBT QR → hardware signed QR verification/release.**
- Already approved Option B implementation: `Professional/public-retail-schedule-verify.mjs` exports `buildProfessionalLinkVisibleSchedule`. It validates published firstDate + interval against public xpub-derived CLTV output scripts. `Professional/option-b-explicit-link-map.mjs` maps a link to a caller-supplied public schedule. **Neither authenticates creator or proves funded UTXOs on its own.** The next work is joining this public gift-link schedule to the SAME real funded gift and the existing Core-verified binding and beneficiary flow; fail closed on mismatch. Do not mistake caller-supplied metadata for independent funding/creator evidence.
- Creator must give beneficiary an independently retained 64-hex fingerprint of the complete public gift binding via an independently trusted channel; software can check equality, not establish creator identity. The original October 20 24-output gift's historical independent commitment has **not been authenticated**; do not fabricate it. New prospective synthetic regtest gift may have a new authentic handoff for testing, accurately labeled.
- Focus on meaningful integrated acceptance, not endless unit-test churn or re-opening architecture.

## PROVEN / NOT PROVEN — NEVER INFLATE
**Proven:** October 20 physical Jade Plus successfully signed one height-CLTV release from a funded 24-output disposable regtest gift; Bitcoin Core accepted it via `testmempoolaccept`, NO broadcast. DO NOT repeat hardware until owner explicitly authorizes ONE final physical beneficiary acceptance. Calendar CLTV tests passed (software); funded calendar-timestamp regtest Core consensus test passed; same-funded-gift Core → beneficiary review → finalized approval → single-use unsigned UR QR test passed with disposable software signer. Public date schedule script verification and fingerprint mismatch checks passed. Synthetic retail AES/12-word derivation compatibility and offline nonce replay tests passed, but **these are not required as a Jade date-decrypt path under the owner-approved public Professional schedule**.
**Not proven:** creator-authenticated original 24-output historical fingerprint; real funded **link-visible full schedule** independently bound to each output and recipient fingerprint; complete gift card to beneficiary UX; true beneficiary end-to-end calendar maturity progression; final hardware recipient journey; independent final security audit; mainnet/production readiness. Original 24-output proof is NOT full acceptance.
**Recent GitHub:** `dc4132e8f10c6f2c8318a2b3fedafbdddaf753f7` (locked architecture record) passed Professional isolated PSBT workflow. Other previously documented regtest CI passed. Do not assume any new commit passed until checked.

## RELEVANT FILES
- `Professional/RECIPIENT-SCHEDULE-UNLOCK-SECURITY-DECISION-2026-10-19.md` — **Option B owner approval**.
- `Professional/RECOVERY-FEASIBILITY-PRIVACY-DECISION.md` — latest binding October 23 owner decision; ignore earlier alternative architecture options superseded by that decision.
- `Professional/public-retail-schedule-verify.mjs`, `Professional/public-retail-schedule-verify.check.mjs` — public release dates validated against derived scripts.
- `Professional/option-b-explicit-link-map.mjs` — public link map, presently caller-supplied only.
- `Professional/public-gift-binding-commitment.mjs`, `Professional/public-gift-commitment-notice.mjs` — gift digest/fingerprint.
- `Professional/locally-verified-beneficiary-review.mjs` — trusted local Core checks, private approval state, one-use unsigned QR.
- `Professional/integrated-calendar-timestamp-core-acceptance.mjs` — same funded Core output + beneficiary review + QR integration, software signer.
- `Professional/CALENDAR-CORE-ACCEPTANCE-EVIDENCE-2026-10-23.md` — precise evidence and limitations.
- `Professional/ORIGINAL-24-GIFT-COMMITMENT-PROVENANCE-2026-10-23.md` — original gift commitment unresolved.
- `Professional/RESTRICTED-BENEFICIARY-QR-INTEGRATION-CONTRACT-2026-10-23.md` — QR safety gates.

## OPERATING INSTRUCTIONS FOR NEXT ASSISTANT
User will open a NEW chat and paste this handoff. **Read this document and the listed GitHub files FIRST; never claim you have forgotten the public-date decision.** Give concise, accurate progress; perform safe isolated GitHub changes autonomously, check GitHub Actions, correct failures, and record evidence. No more unsolicited alternate architectures, hardware requests, or new product choices. The user has explicitly paused work today out of frustration; **do not start additional engineering after this handoff**. Next session: resume from the single funded-gift public-link schedule integration gap.

**CURRENT DECISION: ARCHITECTURE FIXED; SOFTWARE WORK INCOMPLETE; NO-GO FOR LIVE DEPLOYMENT.**
