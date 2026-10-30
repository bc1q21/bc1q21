# bc1q21 Professional — End-of-day handoff — 2026-10-30

## Status / next action
**STOPPED FOR THE DAY AT USER REQUEST.** The user reports that the GitHub Actions workflow for code commit `f61e55f` completed with green check marks. **The latest visual fixes have NOT been browser-reviewed by the user.** Do not call them visually approved or production ready. On 2026-10-31 (or whenever work resumes), start by reviewing this checkpoint and the prior 2026-10-29 handoff, confirm current branch and workflow status, then download a fresh Professional browser preview ZIP and conduct ONE focused visual walkthrough. Do not start another code change until reviewing the actual latest preview.

Repository: `bc1q21/bc1q21`
ONLY branch: `professional/isolated-release-prototype`
Previous checkpoint: `Professional/SESSION-HANDOFF-2026-10-29-WHITE-LABEL-FUNDING-REDESIGN.md`
This checkpoint: `Professional/SESSION-HANDOFF-2026-10-30-VISUAL-POLISH.md`
User-reported green run: `f61e55f` (final code commit before this documentation-only commit).
**Do not touch main, live Retail, production server, or deploy anything.**

## Purpose / architecture
Separate bc1q21 Professional / white-label version for advisors. Professional identity (business name, contact, address, email, phone, logo) replaces bc1q21 primary header identity across planning and payment. The Retail-like gift planning flow is reused in `Professional/retail-mirror/index.html`. Customer-facing payment page is `Professional/funding-workspace.html`; payment QR is a nonfunctional placeholder, NO actual mainnet deposit address, no funding, signing or broadcasting. Hardware Jade Plus regtest feasibility has already been established; DO NOT repeat hardware tests or attempt real Bitcoin deposits. Logo/business data stored in browser sessionStorage only.

## What was confirmed by actual browser walkthrough today
- Professional initial identity page loaded from local preview and advisor ABC Wealth Management, Bob Smith, address, email, phone, sample logo were entered.
- Disclaimer, 0.001 BTC ($80 at test override), five annual releases beginning 2027-10-30, same amount (20,000 sats each), plan ready and payment navigation all worked. The Plan Ready totals scroll horizontally with row labels fixed.
- Fee estimate: gift 100,000 sats, service 2,000 sats, mining estimate 1,750 sats; total 103,750 sats (~$83 at $80k/BTC).
- Back-to-plan navigation worked and retained details.
- Screenshots revealed issues: a green 'Continue to Jade Plus' development panel appearing above the planner despite hidden attribute; payment page too narrow/small relative to Retail mirror; blue-grey outside background should be white; blue information panels should be pale green; Professional initial identity page had a mismatched blue header and no four-step progress bar; a broken 'Selected business logo' image icon appeared even when no logo chosen. Logo upload requirements now explicitly show PNG/JPEG/WebP, max 250 KB (250,000 bytes), scaled to fit header.
- User approved consolidated fix and stopped for the day after GitHub green checks, before testing it.

## Changes committed on 2026-10-30 (Professional branch ONLY)
1. `77558341072c9afd7061e071571cd96b057ee191`: `Professional/retail-mirror/index.html`. CSS now hides all three obsolete handoff/debug sections with `display:none!important` irrespective of whether their `hidden` attributes get changed. This is meant to suppress visible 'Continue to Jade Plus' banner. Verify in browser.
2. `c48860ec396e906b107ec833fe37bd72cea101b7`: `Professional/funding-workspace.html`. CSS override appended to widen main/payment/header/progress/footer to max 1100px, set white page canvas, pale green status/payment panels, keep funding placeholder and existing security logic unchanged. **This is a visual approximation, not yet pixel-perfect proven.** Verify at the same browser zoom and viewport as planning pages. Pay attention to header/progress and fonts, margins, color and overall proportions. If needed, prefer sharing Retail mirror CSS/components rather than adding more conflicting overrides.
3. `f61e55f9217513e992926f3f6b8c171d95a176bb`: `Professional/index.html`. Added 4-step progress strip to the initial professional identity screen, white canvas, Retail-like muted teal/nav bar; fixed `#logoPreview[hidden]{display:none!important}` to prevent broken image icon when no logo. Existing 250 KB instructions retained. The user reports successful green GitHub workflow for this commit. **Not visually verified yet.**

## Important caveats / review risks
- Initial professional identity is conceptually a pre-planning onboarding screen; newly added progress strip labels 1 Plan, 2 Recovery, 3 Add Funds, 4 Finish. Check whether this accurately communicates the user's place in the flow, and whether visual design matches planner.
- The Retail mirror has a 900px-ish content width in the screenshot, and payment's new 1100px CSS max may actually make it *too wide*. Compare actual rendered content widths visually at identical zoom; refine after review, not blindly.
- Existing payment CSS has earlier 740px/920px rules; final overrides were appended to win cascade. If appearance is inconsistent, clean up the cascade rather than stacking more overrides.
- The original green Jade panel appeared despite `hidden` because of competing CSS/JS. CSS now force-hides; verify there is no unwanted empty space or side effect.
- On the initial identity screen, the logo picker must be optional; no broken image without a selection, no user data sent to server. Check preview after choosing a logo too.
- The payment screen must remain a **safe simulation**: NO functional funding address or QR, no real Bitcoin, no broadcast.
- Business identity should show ABC Wealth Management, Bob Smith, street address, email and phone stacked consistently in planner and payment; small 'Powered by bc1q21' at bottom right; maintain matching Gifting Wizard heading, progress bar with full-width horizontal rule, and I CAN GUIDE YOU bar.
- The actual disclaimer is still incomplete / placeholder for later production-quality work. No need to solve that during the first focused visual check.
- CI green means build/tests passed, NOT proof of pixel-perfect browser output.

## First steps next session — ONE STEP AT A TIME
1. User opens fresh chat and pastes handoff; assistant fetches this checkpoint from GitHub branch and verifies branch/workflow state.
2. User downloads the **newest** `bc1q21-professional-browser-preview` ZIP artifact for the successful Professional browser preview workflow (ensure commit at least `f61e55f`; this handoff commit changes docs only). Extract into a NEW Downloads folder, not old (9).
3. From that extracted folder, user opens Windows Command Prompt and runs `python -m http.server 8765` and leaves it running.
4. In Brave open `http://127.0.0.1:8765/Professional/index.html`. Compare initial header/progress bar, white background, logo instructions, and absent broken image. Use fictional ABC Wealth Management details; do not enter confidential client data.
5. Proceed through the known 0.001 BTC / five annual 2027-10-30 plan. Verify green 'Continue to Jade Plus' box is **gone**, plan data preserved, header and progress consistent.
6. Continue to payment and compare its size, white canvas, teal header, green info panels, advisor formatting, progress line, help button and bottom-right Powered by bc1q21 against previous planning page at same zoom.
7. Record exact screenshot-backed remaining defects, if any, before another consolidated Professional-only code pass.

## Working agreement
User is tired after hours of productive work. Do not ask them to do anything more tonight. On next session be patient, concise, and provide ONE instruction at a time. Retail is stable and strictly out of scope. No need to redo Jade Plus hardware validation.
