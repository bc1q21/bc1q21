# bc1q21 Professional — authoritative restart handover (2026-11-02)

**READ THIS FIRST AT THE START OF THE NEXT SESSION.** This document records observed progress, not a claim that the customer workflow is finished.

## Scope and non-negotiable boundaries
- Repository: `bc1q21/bc1q21`. **Professional-only branch**: `professional/isolated-release-prototype`. Never edit/deploy `main`, Retail, production, server, or Start9 without separate explicit authorization.
- Windows 11, user `partt`. Local clone: `C:\Users\partt\bc1q21-Professional\bc1q21`.
- No real Bitcoin, broadcasts, seed entry, or physical Jade Plus signing repeat. Physical Jade Plus air-gapped QR signing already proved in earlier experiments.
- User requires **one action at a time**, succinct explanation and output review before next action. Do not restart architecture planning from scratch or confuse Retail with future Professional commercial product.
- **Current stopping point:** 2026-11-02 after `node test-recipient-camera-integration.mjs` PASS. **Next unrun test:** `node test-gift-release-binding.mjs`. Do not report it as passed.

## How to restart local preview tomorrow
1. Open Command Prompt (server) and run:
   ```cmd
   cd /d C:\Users\partt\bc1q21-Professional\bc1q21
   python -m http.server 8765
   ```
   Keep this window open. If port already in use, investigate before starting another server.
2. Open a SECOND Command Prompt for tests:
   ```cmd
   cd /d C:\Users\partt\bc1q21-Professional\bc1q21\Professional\browser-integration
   ```
3. Open Brave, local entry: `http://127.0.0.1:8765/Professional/index.html`.
   Other pages: `Professional/retail-mirror/index.html` (gift planner), `Professional/funding-workspace.html`, `Professional/jade-signing-workspace.html`, `Professional/finish-workspace.html`, `Professional/customer-walkthrough.html` relative to local server root.
4. **Important:** Gift plan is in Brave `sessionStorage`, scoped to the ORIGINAL TAB. Navigation within the same tab preserves it; opening Jade in a new tab does NOT inherit the plan. Closing the tab may lose the example plan; do not promise persistence across shutdown. Do not clear browser data. If the plan is missing tomorrow, acknowledge and re-create only if needed, without inventing a persistence fix.
5. Before changing code, inspect local `git status`, branch, and compare against GitHub. This GitHub documentation update does not automatically transfer to local clone; `git pull` should be planned carefully to avoid overwriting local uncommitted changes.

## Customer-facing preview state observed
- Local gift planning page repaired and styled correctly; five-release example:
  - total 100,000 sats (0.001 BTC)
  - dates November 3, 2027–2031 (annually)
  - releases: 25,944; 22,553; 19,613; 17,057; 14,833 sats (sum 100,000).
  - service fee 2,000 sats, estimated mining fee 1,750 sats, estimated total 103,750 sats.
- Add Funds page has placeholder QR, not real funding. Jade workspace shows five releases and says awaiting trusted gift-specific unsigned transaction; signing locked. Finish page summary exists but no broadcast, completed recovery package or recipient delivery. End-to-end customer workflow **not complete**.
- `sessionStorage` key: `bc1q21-professional-approved-plan-preview`, format `bc1q21-professional-retail-plan-preview-v1`, status `UNFUNDED_PREVIEW_NOT_SIGNABLE`.
- Brave console previously showed 404 for `Professional/browser-integration/professional-verifier.bundle.js`; fixed by local build. After hard refresh screenshot showed bundle 404 gone, five releases intact, release locked. Other console messages related to DevTools configuration and favicon, not evidence of verifier failure.

## Local file changes and setup on Nov 2 (not necessarily committed)
- Backed up `Professional/retail-mirror/index.html` to `Professional/retail-mirror/index.html.bak`.
- Added local `Professional/repair_sri.py`; ran it against `Professional/retail-mirror/index.html`: 24 resources checked, 22 SHA-384 SRI hashes corrected, 2 already correct, 0 missing. Restored styling in Brave. **No Retail source files modified.**
- `Professional/browser-integration/package.json` defines `npm run build` → `node build.mjs`. Installed local dependencies via `npm install --prefix Professional\browser-integration`; 105 packages, npm audit reported 0 vulnerabilities; one deprecated plugin warning. A local `package-lock.json` was generated and `node_modules` installed.
- Node v24.18.0, esbuild v0.25.12. Built from `Professional/browser-integration` via `npm run build`, yielding `professional-verifier.bundle.js` (1,810,775 bytes). Node emitted fs.Stats deprecation warning but build succeeded. **Bundle is generated locally; do not assume committed or available on a fresh clone.**
- Installed Playwright Chromium test browser via `npx playwright install chromium` (Chromium 1208, headless shell, FFmpeg), under Windows user Playwright cache.

## Passed tests (observed exact outputs)
Run commands from `Professional/browser-integration`:
1. `node test-professional-verifier.mjs "..\fixtures\calendar-release1-physical-jade-signed-qr-20261025.txt"`
   → `PASS: recorded physical Jade signed PSBT independently verified, no broadcast`.
   Test checks signature, transaction matching, expected PSBT hash, invalid/incomplete/reversed QR frames, and no broadcast.
2. `node test-professional-diagnostic-ui.mjs`
   → `PASS: Professional diagnostic UI camera lifecycle, fail-closed and stale-result safeguards; no network or broadcast`.
3. `node test-recipient-camera-integration.mjs`
   → `PASS: recipient Jade camera wired, release locked, no network`.
   Initial run failed because Playwright Chromium executable missing; installed Chromium and reran successfully.
4. Browser bundle loads after hard refresh; screenshot showed original gift plan intact.

**Next test (NOT RUN):**
```cmd
node test-gift-release-binding.mjs
```
Review output; then evaluate remaining existing Professional browser tests one by one, and inspect actual customer journey. Automated tests do NOT prove production readiness.

## Existing recorded fixtures (do not repeat physical hardware signing)
- `Professional/fixtures/calendar-release1-physical-jade-signed-qr-20261025.txt` — known passing verifier fixture.
- `Professional/bc1q21_Jade_Signed_PSBT_QR_frames (1).txt`
- `Professional/bc1q21_Jade_Signed_PSBT_QR_frames (7).txt`
- `Professional/release2-jade-signed-public-qr.txt`
Do not share seed words or private keys. Approved design: public release dates visible to gift-link holder; private keys offline.

## Cautions / remaining work
- Need reconcile local modified files, generated bundle, package lock, backups, and test assets with intended GitHub branch; avoid committing `node_modules`, `.venv`, secrets, caches, or private fixtures without reviewing.
- Confirm customer-facing Plan → Add Funds → Jade Plus → Finish handoffs, trusted unsigned transaction generation, camera QR workflow, and appropriate fail-closed behavior. Do not enable signing or broadcasting by bypassing safeguards.
- No claim of end-to-end completion or production readiness.
- This handover is an authoritative **status/restart note**, not a code deployment. Always distinguish local-only changes from committed branch changes.

## Operator instruction
When user returns, read this document and their new chat handover. Start by restoring the two Command Prompts and local Brave preview. Then run **one** next test `node test-gift-release-binding.mjs` after confirming working directory. Do not send the user through previously completed Jade tests, npm setup, SRI repair, or a fresh project discovery process.
