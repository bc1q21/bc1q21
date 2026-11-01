# bc1q21 Professional — Development Handoff and Stop Point
**Date:** 2026-11-01
**Status:** SAFE STOP; all three latest GitHub Actions workflows green as of this handoff.
**Repository:** bc1q21/bc1q21
**Only permitted development branch:** professional/isolated-release-prototype
**Last functional commit:** c4dfe7bbaf4d449b1d21b208f848f5bb5bcb627c
**Scope:** isolated, disposable Bitcoin Core **regtest** only. No Retail/main changes, no production deployments, no real BTC or mainnet signing/broadcast.

## Immediate goal and user working preferences
Finish the **actual Professional customer prototype** so Dale can open it, see it, touch it, and test it end to end. Customer flow: **Plan → Recovery → Add Funds → Jade Plus → Finish**. Prioritize functional integration and meaningful verification over cosmetic adjustments, exploratory tangents, or repeated feasibility demonstrations. Dale prefers one step at a time and concise explanations. Do not ask him to operate GitHub, supply screenshots, or inspect logs when the GitHub connector can do so directly. Explain purpose, effects, and alternatives BEFORE any local software installation/system change. Do not suggest Codex, Claude, outside developers, or rebuilding from scratch.

## Today: environment, tests, decisions
1. Windows 11 local workspace cloned successfully to `C:\Users\partt\bc1q21-Professional\bc1q21` using `git clone --branch professional/isolated-release-prototype --single-branch ...`. Local branch clean at initial clone, before today's later GitHub commits. Git for Windows 2.53, Python 3.13.15, Python virtual environment `.venv`, Playwright 1.64.1 and Chromium installed successfully.
2. Local `python Professional\test_customer_browser_journey.py`: **6 tests passed**.
3. Local `python -m unittest discover -s Professional -p "test_*.py"`: **30 tests, 24 passed and 6 errored**. All six errors are due to POSIX-only mode 0700/0600 registry checks in `Professional/regtest_intent_registry.py` (lines 67, 94, 101) on Windows. No reason to weaken them or claim Bitcoin functionality failed. WSL was suggested prematurely; user correctly objected. WSL is **not installed**, installation aborted. Decision: use existing GitHub Ubuntu CI to validate Linux-only checks; do not install WSL.
4. GitHub Actions workflow `.github/workflows/professional-browser-regtest.yml` already runs Python registry and stored-plan inspection tests on Ubuntu and browser journey tests. Previous commit `e5357d9689b39fb70cfd6733a1255508fe875c8b` had green run #7 (41339880667), including both test steps.
5. Examined `Professional/funding-workspace.html`. The existing `#scan-funding` button and `#scan-status` were in hidden `#professional-developer-tools`; the JS handler already POSTs to localhost `http://127.0.0.1:18761/professional/regtest/scan-funding`, checks network/format, funding script, UTXO confirmations and totals, plan and wallet race conditions, and explicitly keeps signing/broadcast disallowed. Customer-facing `#jade-address-check` was already outside hidden developer section.
6. Commit **f5893b29759771f774bf1c0dda1097c9a1bbcb35**: moved the EXISTING read-only regtest scan button/status to the customer-facing section immediately following the Jade device address check. No payment QR, signing, or broadcast enabled; developer-only unsigned transaction tools remain hidden.
7. This change triggered 2 red CI workflows, 1 green. Inspected GitHub job logs directly. Both failures came from one outdated static assertion in `Professional/jade-address-check.test.mjs`: test expected Jade address check to remain inside hidden developer section, though it was already in customer section. Other tests passed (43/44 in preview job, 224/225 in PSBT job).
8. Commit **c4dfe7bbaf4d449b1d21b208f848f5bb5bcb627c**: updated that regression test to require Jade address check AND read-only regtest scan in customer section before developer tools, while retaining fail-closed expectations for disabled scan initially, payment QR and signing.
9. Verified all **three** GitHub Actions workflows triggered by c4dfe7b completed successfully:
   - Professional browser preview package (development only), run **41342002652**, SUCCESS
   - Professional isolated PSBT tests, run **41342002615**, SUCCESS
   - Professional isolated browser journey, run **41342002586**, SUCCESS
   These are static/unit/browser validations, not a full integrated customer acceptance test.
10. No changes to main, Retail, live bc1q21 website or production. The local clone will be behind the new GitHub commits until refreshed. Command Prompt may be closed. No further action from Dale today.

## Current code / relevant files
- `Professional/retail-mirror/index.html`: Plan and Recovery preview; sessionStorage `bc1q21-professional-approved-plan-preview`, format `bc1q21-professional-retail-plan-preview-v1`, status `UNFUNDED_PREVIEW_NOT_SIGNABLE`; funding/signing/broadcast false.
- `Professional/funding-workspace.html`: customer-facing wallet public xpub derivation and Jade address comparison, now read-only Core regtest scan. Developer tools include confirmed UTXO scan, unsigned PSBT construction, diagnostic Jade QR, signed QR verification. Local service on 127.0.0.1:18761 is required for scan; merely showing the button does not make the service available.
- `Professional/jade-signing-workspace.html`: diagnostic QR animation, camera and signature verification; trusted production-facing signing remains fail-closed.
- `Professional/finish-workspace.html`: verified regtest transaction diagnostic and schedule, no broadcast.
- `Professional/customer-walkthrough.html`: five-stage progress and verification gate strengthened in e5357d9.
- `Professional/regtest_intent_registry.py`: immutable SHA256 fingerprinted JSON intent snapshots; inspection only, walletOriginAuthenticated=false, recipientRecoveryReady=false, broadcastAuthorized=false.
- `Professional/stored_plan_inspection.py`, `Professional/regtest_transaction_acceptance.py`, `Professional/trusted_core_funding.py`, `Professional/verify-signed-funded-distribution.mjs`, `Professional/creator-signed-qr-verification-gate.mjs`.
- `Professional/test_customer_browser_journey.py` (six browser tests), `Professional/jade-address-check.test.mjs`, `Professional/test_regtest_intent_registry.py`, `Professional/test_stored_plan_inspection.py`.

## Outstanding functional gaps — do not misrepresent as finished
- Public wallet xpub/device-address acknowledgement is **not cryptographic wallet-origin authentication**.
- Read-only funding scan depends on local Core bridge; need to verify real customer-page-to-local-service operation in disposable regtest, not just static code.
- Independent trusted transaction approval and wallet-origin verification before signing are missing.
- Beneficiary recovery integration and complete customer handoff are missing.
- Customer-facing trusted PSBT signing gate and safe, regtest-only transaction acceptance/broadcast workflow are not end-to-end integrated.
- Full Plan → Recovery → Add Funds → Jade Plus → Finish interactive acceptance testing with disposable regtest funds is not complete.
- Prior independent Jade Plus QR PSBT signing, 24-release CLTV, beneficiary redemption feasibility tests succeeded; **do not repeat these demonstrations** as a substitute for customer integration.

## Tomorrow: laser-focused sequence
1. Read this handoff, inspect isolated branch and latest Actions. Confirm green status; do not ask Dale for screenshots.
2. Select **one concrete missing customer integration**. Start by tracing Add Funds read-only scan's local bridge availability and wiring in customer preview, then design the next safe, measurable customer handoff. Do not confuse moving a UI control with end-to-end operation.
3. Make the smallest code+regression-test change on **professional/isolated-release-prototype only**, never main. Preserve all fail-closed authorization, network and no-real-BTC boundaries.
4. Inspect GitHub Actions yourself. Resolve red Xs from logs, not from Dale screenshots. Do not claim success until tests pass.
5. Progress next through trusted wallet-origin proof, independently approved exact transaction/fee/recipients, recipient recovery, Jade signing, and regtest-only Finish/broadcast acceptance; ensure the customer flow is actually usable.
6. After the integrated flow is functional, provide Dale a straightforward hands-on preview/testing procedure and record real outcomes. Keep focus on delivering an inspectable working prototype, not production readiness.
7. If GitHub connector blocks a code write, do not bypass safety blocks. Local Windows clone and patch delivery are available as alternative development workflow, with one clear instruction at a time; explain any switch first.

## GitHub links
- Branch: https://github.com/bc1q21/bc1q21/tree/professional/isolated-release-prototype
- Last functional commit: https://github.com/bc1q21/bc1q21/commit/c4dfe7bbaf4d449b1d21b208f848f5bb5bcb627c
- Green CI: https://github.com/bc1q21/bc1q21/actions/runs/41342002586 ; https://github.com/bc1q21/bc1q21/actions/runs/41342002615 ; https://github.com/bc1q21/bc1q21/actions/runs/41342002652

**STOP POINT:** tests green, documentation complete, no local action required. Next session should start with actual functional integration, not more environment setup.
