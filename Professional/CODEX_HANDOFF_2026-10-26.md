# bc1q21 Professional — Project Handoff / Restart Notes
**Recorded:** 2026-10-26. **Status:** Work paused for the day. **Next action:** onboard Codex with owner, one step at a time. **No Codex session launched yet.**

## Non-negotiable product vision
bc1q21 Professional is the EXISTING bc1q21 Retail website, matching its appearance, user experience, gift planning, amounts, schedules, funding, gift card, and recipient experience wherever technically applicable. It is NOT a new visual redesign or a separate gift-creation product. Make a copy of Retail and adapt it under the Professional development branch. The user is emphatic about this and does not want repeated parallel rebuilding.

Differences:
1. Optional white-label identity page FIRST for a lawyer, accountant, or other professional: business/practice name, logo, contact name, address, email, phone. If nothing is entered, existing bc1q21 branding remains the default everywhere; supplied professional details replace applicable branding throughout the Professional website and gift card. Identity fields must be optional. Current identity prototype may require business details; correct that in integration.
2. Replace Retail seed/recovery-word creation and signing flow with Blockstream Jade Plus **air-gapped QR** workflow. Use public-only wallet xpub/derived addresses, existing animated unsigned PSBT QR, camera scanning of Jade-signed QR, cryptographic verification. Never request or handle wallet recovery words/private keys.
3. Recipient release also uses air-gapped Jade Plus signing. Keep the Retail recipient visual experience, adapting only the signing interaction.
No unrelated visual or product changes.

## Repository and absolute isolation
Repository: bc1q21/bc1q21.
Development branch: `professional/isolated-release-prototype`.
**NEVER modify `main`, live production, `Frontend/`, `Website/`, or deploy to bc1q21.com.** Codex may READ and COPY existing Retail code, but all writes belong in `Professional/` and, if required, isolated Professional-only development tooling. Explicitly choose Professional branch in Codex; do not allow automatic merge into main. Branch selection alone is not a hard technical permission boundary; review Codex permissions and enforce protections/approval where available. No real-money funding/broadcast until separate authorization and verification.

## Existing code and work — preserve and integrate
Retail originals: `Frontend/index.html`, `Frontend/bc1q21-h08.js`, `Frontend/NavigationManager.js`, `Frontend/SchedulePlanner.js`, `Frontend/UIRenderer.js`, `Frontend/gift/`, other Retail modules.
Professional:
- `Professional/index.html`: optional-looking identity form with practice type, business/contact/address/email/phone and logo; saves sessionStorage `bc1q21-professional-profile-draft`. Currently business required for continuation; change to support default bc1q21 branding when blank.
- `Professional/retail-mirror/index.html`: copy of actual Retail index with base pointing to Retail static assets; currently loads original Retail scripts. Includes profile branding preview and embedded Jade creator/recipient iframe prototypes; duplicates/redundant banners partially removed. Has CSP `connect-src 'none'; form-action 'none'` and a development warning. **Commit 3eec8bc** removed `inert` from Retail wizard and patched NavigationManager to stop at `finish_schedule` instead of entering recovery/funding; this has NOT been browser-verified. Do not describe it as a finished integrated wizard. It currently does NOT transfer the Retail schedule to Jade. No Professional funding lifecycle exists.
- `Professional/professional-creator-prototype.html`: separate creator UI, public-only Jade xpub handoff, QR/camera, CLTV address derivation, exports `bc1q21-professional-unfunded-regtest-plan-v1` JSON. Its parallel gift scheduler is a temporary prototype; replace with Retail's actual scheduling.
- `Professional/recipient-gift-specific-prototype.html`: separate recipient UI for importing public gift draft and trusted chain data, animated unsigned QR and signed QR camera.
- `Professional/browser-integration/`, `Professional/crypto-psbt-frames.mjs`, `Professional/recipient-jade-signed-camera.browser.mjs`, `Professional/jade-xpub-cltv-handoff.mjs`, `Professional/public-handoff.mjs`: reuse existing QR/verifier/public-wallet implementation.
- Automatic JSON draft handoff from creator iframe to recipient iframe is present in mirror but has not been independently browser-verified.
- **Commit e5abf6b** removed redundant prototype navigation.
- Latest development commit as of this note: **3eec8bc342b8b5c3a6643facb19ec974925cb0c1**.

Prior physical test: On 2026-10-25 a disposable regtest Bitcoin gift went through animated unsigned QR -> Jade Plus offline signing -> signed QR -> computer camera -> signature verification -> Bitcoin Core `testmempoolaccept` accepted; no broadcast. Feasibility is proven, but the full Professional lifecycle is NOT yet built or safe for mainnet.

## Codex handoff
**GitHub Issue #82**: `https://github.com/bc1q21/bc1q21/issues/82` contains full implementation requirements and restrictions. Created 2026-10-26. This issue is a work brief, NOT proof that Codex was started.
User agreed to use Codex for multi-file implementation rather than slow single-file GitHub edits. Assistant acts as project lead/architect, reviews changes, helps with blockers and user testing. Codex builds under isolated branch. Claude not necessary at this stage.

## Next session: step-by-step onboarding (critical)
The user was exhausted and stopped before opening Codex. Start tomorrow by guiding the user ONE STEP AT A TIME, with screenshots, to `https://chatgpt.com/codex` (or Codex within ChatGPT). Confirm GitHub connection to `bc1q21/bc1q21`, scope of authorization, selected `professional/isolated-release-prototype` branch, and instructions from Issue #82. Be candid: a repository integration may grant broader permissions than one branch; a prompt saying 'do not touch main' is NOT itself a security boundary. Where feasible use GitHub branch protections, required PR review, restricted token/permissions, or a separate repository/fork for stronger isolation. Do not claim `main` is technically inaccessible unless verified. Do not ask user to launch until scope and permissions are understood. Explain each screen in plain English, then wait for screenshot before the next step. User uses Windows/Brave and wants short, calm instructions, no long lectures.

## Implementation milestones for Codex
1. Audit original Retail and Professional prototypes; preserve Retail design and flow. Integrate optional white-label identity with default bc1q21 branding.
2. Replace duplicate Professional planning with actual Retail planner and hand off its validated schedule to Jade public-only xpub/CLTV setup.
3. Adapt Retail funding, finish/share, gift-card branding, recipient UX to air-gapped Jade flow; no live transfers.
4. Produce isolated browser preview/test deployment and validate complete unfunded/regtest experience. Run meaningful security checks and end-to-end regtest signing/broadcast simulation, with separate approval before any real Bitcoin.
5. Provide concise change summary, branch, commits, blockers, and preview link. Do not merge/deploy production.

## Communication rules
Always spell `bc1q21` lowercase. The user is nontechnical and expects the assistant to take the lead, not offload architectural decisions. He is concerned about trust and main production safety. Prefer brief answers and ONE next action at a time. If user says 'go', perform the agreed action. Avoid unnecessary repeated proofs of camera functionality or cosmetic micro-commits. The immediate task is **Codex onboarding**, not more incremental coding.

## Current closure
Everything completed today has been committed to Professional branch; Issue #82 created. This handoff file is documentation only. No Codex session connected, no preview deployment, no full Professional integration, no live Bitcoin transfers.
