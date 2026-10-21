# BC1Q21 Professional — authoritative end-of-day engineering handoff
**Date:** 2026-10-21. **Status:** PAUSED AT CLEAN STOPPING POINT. **Production / real funds:** NO-GO.
**Repository:** `bc1q21/bc1q21`. **ONLY working branch:** `professional/isolated-release-prototype`.
**Latest verified feature/CI commit before this handoff:** `abb75ce09dd58718c4c0880b02cdbdb3b9d436c2`; **successful GitHub Actions run:** `39685705341` (completed success). The handoff commit itself may launch an additional run; check it before claiming that run passed.

## 1. THE SINGLE PRODUCT REQUIREMENT — READ FIRST
**Professional is the existing operational BC1Q21 RETAIL Bitcoin gift product, preserving its gift creation, schedule, calendar dates, monthly/yearly intervals, amounts, original gift-card link, recipient experience, release experience and user journey. The ONLY intended architectural change is that BIP39 recovery words, private keys and private signing/derivation NEVER enter the online website/browser/server. Private operations happen on air-gapped hardware (Jade Plus prototype).** Creator knows the 12 recovery words privately and hands them to recipient separately, along with the ordinary gift card. Creator knowledge is not website knowledge.

Retail is already working. **Reuse retail behavior and code, rather than reimplementing, changing the gift model, or repeatedly rediscovering requirements.** Every difference from retail must have a justified air-gap reason. Read `Professional/RETAIL-PARITY-GUARDRAIL-2026-10-21.md` and retail `Frontend/SchedulePlanner.js`, `Frontend/TransactionManager.js` before further changes. Professional Option B (approved 2026-10-19) explicitly permits gift-link holders to **see release dates**. This is date visibility only, NOT spend authorization. Do not revisit Jade AES/private date-unlock experiments.

## 2. HARD SAFETY AND SCOPE LIMITS
- ONLY edit `Professional/` and `.github/workflows/professional-*.yml` on `professional/isolated-release-prototype`.
- NEVER modify `main`, retail `Frontend/`, production, nginx, Start9 or live deployment.
- REGTEST ONLY; disposable fixtures; no broadcast, no real BTC, no production or mainnet keys, no seed words, xprvs or secret-bearing QR in browser, GitHub, CI or chat.
- Physical Jade Plus is OFF. Do NOT ask user to reenter recovery words, rescan QR, export xpub or repeat signing without truly necessary new acceptance test and explicit user permission.
- The user is tired of repetitive tiny test cycles, unnecessary GitHub approval drama and lost context. Work autonomously when authorized; minimize changes; run existing CI; fix failures before moving forward; keep one clear task at a time.
- Public gift metadata, script matches, and caller-supplied Bitcoin Core responses are NOT sufficient spend authorization. Fail closed.

## 3. VERIFIED PHYSICAL HARDWARE MILESTONE (DO NOT REPEAT)
Read `Professional/SESSION-HANDOFF-2026-10-20-JADE-SAME-GIFT-SIGNED-CORE-PASS.md`.
- Same real (disposable) 24-output funded CLTV regtest gift; public xpub fingerprint `e29ac13c`, account `m/84'/0'/0'`, first release signer `m/84'/0'/0'/1/0`.
- User restored disposable original 12 words **on Jade Plus**, signed the EXACT first-release PSBT using animated QR (19-frame unsigned, 7-frame signed return). 12,000 sats input, 11,000 sats payout, 1,000 sats fee, block-height CLTV 500.
- Independent Jade signature verification Actions `39480906529` PASS; Bitcoin Core 28 `testmempoolaccept` finalization `39481114223` PASS. **No broadcast**.
- Earlier four software-key staged releases do not equal all 24 physical Jade releases, nor end-to-end retail-equivalent UI. The October 20 hardware experiment used a HEIGHT timelock, not calendar timestamp; do not misrepresent it as calendar release acceptance.

## 4. WORK COMPLETED OCTOBER 21 AND VERIFIED
Latest success `39685705341`, head `abb75ce09dd58718c4c0880b02cdbdb3b9d436c2`. Earlier failed intermediate CI runs were fixed; do not treat them as outstanding failures.
- `recipient-integration-boundary.mjs`: connects gift-specific public schedule to existing release readiness; remains `canSign:false`, `canBroadcast:false`, `canExportSigningQr:false`. Corrected readiness gate's named argument shape.
- `recipient-integration-boundary.test.mjs`, `.check.mjs`, `recipient-integration-evidence.check.mjs`: lightweight and runtime regressions, including creator gift locator to first release script, mismatch rejection and Core evidence inspection.
- `recipient-offline-signing-step.mjs` and test: safe disabled offline-signing UX with escaped blockers. `render-option-b-recipient-page.mjs` now inserts it; no real QR release enabled.
- `gift-specific-cltv-maturity.mjs`: supports both height CLTV and calendar/timestamp CLTV using chain-tip **median time past (MTP)**. This repaired a prototype height-only mismatch with the existing retail calendar-date model. Timestamp release uses previous-block MTP strictly greater than locktime; does not trust wall clock. `gift-specific-recipient-release-gate.mjs` identifies height/timestamp blockers. Tests passed.
- `RETAIL-PARITY-GUARDRAIL-2026-10-21.md`: documents the mandatory retail-first engineering discipline.
- `recipient-integration-boundary.mjs` now maps retail gift funding locator to the **first release's verified CLTV script** before inspecting release evidence. Mapping itself remains unauthenticated, so still no signing authority.
- `core-readonly-snapshot.mjs` and `.test.mjs`: injected read-only Bitcoin Core RPC callback collects `getbestblockhash`, `getblockchaininfo`, `getblockheader`, `getrawtransaction`, `gettxout`, checks regtest and stable tip; returns `rpcTransportAuthenticated:false`. Tests reject reorg/tip movement, wrong UTXO tip, missing output, wrong network.
- `recipient-core-snapshot-adapter.mjs`: **newest engineering addition**. Combines collected coherent Core snapshot with `inspectProfessionalRecipientIntegration`, still fails closed, no signing/broadcasting.
- `recipient-core-snapshot-adapter.test.mjs`: dependency-free safety/source checks; wired into `.github/workflows/professional-tests.yml`. CI `39685705341` PASS.
- All changes confined to Professional branch. No production changes.

## 5. HONEST LIMITATIONS — NOT FINISHED
- CI currently tests snapshot/adapter using simulated/caller-injected Core RPC and static fixtures; **no authenticated real Core transport is integrated**. `rpcTransportAuthenticated:false` is intentional. Source-shape checks are not full runtime acceptance of all combinations.
- Need **real local authenticated regtest Bitcoin Core RPC transport** with credentials kept out of GitHub/browser, tight method allowlist, node identity/chain-tip validation, and evidence bound to specific gift funding outpoint; verify actual `gettxout` and MTP against Core, not arbitrary caller flags.
- Need authenticated creator gift-card funding-address -> each of 24 release output mappings, not just first-release public script equivalence.
- Need independent recipient authorization/explicit approval of exact destination, fee, outpoint, amount, locktime and one-time handoff before QR export. **A public gift link is not spending authorization**; an online page must not gain the ability to generate private keys.
- Existing `approved-release-gate.mjs` and `controlled-qr-session.mjs` already implement PSBT structure and controlled QR return validation; reuse, do not reinvent. Wire only after upstream trusted evidence and approval gates. Keep signed-return verification and broadcast authorization separate.
- Full retail-equivalent 24-release creation/card/recipient/recovery/QR lifecycle not integrated; no complete end-to-end Professional UX acceptance or security audit. NO-GO for real funds.

## 6. NEXT SESSION — SPECIFIC EXECUTION ORDER
1. Read **this** handoff and October 20 Jade handoff and retail-parity guardrail. Inspect branch head and latest Professional CI. Do not start by asking the user to explain requirements.
2. Review `recipient-core-snapshot-adapter.mjs`, `core-readonly-snapshot.mjs`, `gift-specific-recipient-release-gate.mjs`, and retail scheduling/transaction flow.
3. **Next engineering task:** implement a narrowly scoped, locally authenticated **read-only regtest Core RPC transport boundary** (no credentials in repo, no browser transport, no wallet/sign/broadcast RPC), with testable explicit trust/provenance semantics and proper output/chain binding. Be careful: injected callback alone is NOT authenticated. Prefer a tested local-only adapter with strict configuration over declaring provenance true from caller-supplied booleans.
4. Add meaningful runtime negative/positive tests for the new trust boundary, including invalid credentials/network, reorg/tip mismatch and wrong outpoint. Run CI and only claim success once latest commit is green.
5. Then progress toward verified release approval and existing offline QR signing workflow, preserving retail UX and keeping all unverified paths disabled. Avoid new hardware experiments and duplicated tests.

## 7. SESSION BEHAVIOR / OWNER PREFERENCE
User explicitly asked to stop tonight at a comfortable point and to preserve a precise authoritative GitHub handoff so a new chat can resume with a single pasted prompt. User values pragmatic forward progress, is wary of scope drift and repeated 'obvious' problems, and wants exact parity with retail except air gap. No more feature work tonight after handoff commit/verification. Do not make them open settings or redo GitHub connection because of a one-off accidental approval denial; a subsequent authorized write already succeeded.

## 8. RESTART PROMPT (COPY INTO NEW CHAT)
> Resume BC1Q21 Professional engineering from `Professional/SESSION-HANDOFF-2026-10-21-END-OF-DAY.md` in GitHub repository `bc1q21/bc1q21`, branch `professional/isolated-release-prototype`. Read that complete handoff, `Professional/SESSION-HANDOFF-2026-10-20-JADE-SAME-GIFT-SIGNED-CORE-PASS.md`, and `Professional/RETAIL-PARITY-GUARDRAIL-2026-10-21.md`. Verify latest Professional GitHub Actions before coding. **Professional is identical to retail except BIP39/private signing stays entirely on air-gapped Jade hardware.** Do not modify retail, main, production or Start9. No real funds, broadcasts or repeat Jade tests. Continue the next task: trustworthy locally authenticated read-only regtest Bitcoin Core RPC evidence/provenance and gift-specific release binding; reuse existing recipient and QR components. Work one concrete step at a time, commit only to isolated Professional branch, and verify CI. Do not ask me to restate the product requirements.
