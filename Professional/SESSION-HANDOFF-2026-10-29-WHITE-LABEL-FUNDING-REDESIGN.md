# bc1q21 Professional — session closure and next-session handoff
**Date:** 2026-10-29 (El Salvador time)  
**Status:** Paused at user's request after a lengthy live customer walkthrough. No more user actions today.  
**Branch:** `professional/isolated-release-prototype`  
**Scope:** ONLY `Professional/` and Professional-only CI. **Do not change `main`, `Frontend/`, `Website/`, `Backend/`, or production deployments.** No real BTC, mainnet deposits, or broadcasting.

## What the user approved today
1. Professional is a **white-label client gifting experience**, not a bc1q21-branded customer product. The professional/advisor's supplied logo, practice/business name and contact information must replace bc1q21's primary customer-facing branding **on every page**, including planning, funding, Jade signing, and Finish. A discreet `Powered by bc1q21` attribution is appropriate. The profile is currently saved as `sessionStorage['bc1q21-professional-profile-draft']`, with fields `practice,business,contact,address,email,phone,logoData`. Example walkthrough: **ABC Wealth Management**. Continue refining to ensure no bc1q21 logos/brand text remain prominent on customer screens.
2. The familiar Retail-style **gift planning** screens are right. The walkthrough used **0.001 BTC / 100,000 sats**, **5 equal annual releases** of **20,000 sats**, **October 30, 2027 through October 30, 2031**, and an **$80,000/BTC development-only price override**. Planning totals displayed **2,000 sats service fee** (1,000 base + 250 for each additional release), **1,750 sats estimated mining fees**, **103,750 sats total estimated payment** (~$83 at test price). The user observed a horizontally scrolling summary table; fix in future UI polish.
3. **No redundant handoff screen** after the final planning confirmation. Previously the mirror showed `Continue to Jade Plus` and `Your gift plan is ready` panels, followed by a duplicated Retail page. User explicitly rejected this. Planning should go **directly to the traditional-looking gift payment / Add Funds page**, without a second summary or Jade discussion.
4. The old link `../funding-workspace.html` from `Professional/retail-mirror/index.html` resolved to `/funding-workspace.html` (404) because the mirror's `<base href="../../Frontend/">` changes relative URL resolution. Fixed to `../Professional/funding-workspace.html`, which resolves to `/Professional/funding-workspace.html`. **Check this navigation in the next live walkthrough.**
5. The Add Funds page must look like **the traditional customer funding page**: correct payment amount, Bitcoin payment QR, received-status detection; **only after sufficient payment is received and verified** should the customer proceed to the **animated Jade Plus QR signing page** and camera return. Do not show xpub entry, regtest diagnostics, PSBT developer tools, or premature Jade links as the primary customer interface. **Real funding/QR/detection is NOT integrated yet; do not fabricate a payment QR or invite BTC deposits.** Until safe integration exists, show an unmistakable nonfunctional placeholder. Keep technical controls under collapsed developer section.
6. Focus on completing the **customer-facing integrated build and walkthrough**, not repeating already completed physical Jade hardware tests or diverting to production security work. One user instruction at a time when help is needed.

## Changes committed in this final redesign session
- `d2fe45830d5dbabaacb48c5f5ecce894b98bafa7`: `Professional/retail-mirror/index.html`. On validated `bc1q21:professional-plan-ready`, save approved plan and immediately navigate to Professional Add Funds instead of scrolling to redundant handoff; correct base-relative URL; enhance professional logo/name/contact presentation.
- `f95ef39efe128b09d19d0deff66df4894ca92ae1`: `Professional/funding-workspace.html`. New customer-first `Make Your Gift Payment` panel, 103,750-sat estimate computed from plan (gift + 1,000+250*(releases-1) service + 500+250*releases estimated mining fee), payment QR placeholder (NOT REAL), funding-status placeholder, and technical regtest tools inside collapsed `<details id="professional-developer-tools">`. Practice logo/name/contact plus discreet bc1q21 attribution.
- `e7ea9188bb722e6741fd1f3b6bc891b6303c4242`: `Professional/jade-signing-workspace.html` professional white-label identity and attribution.
- `9d5e49bbd1160bfd306216d7212df1dd2cf079ad`: `Professional/finish-workspace.html` professional white-label identity and attribution.
- `9ba7a44790e22dec99492c0d1b680a121ea99346`: `Professional/retail-plan-bridge.test.mjs` updated acceptance assertion to direct Add Funds navigation. The prior intermediate commits showed one failing test because it expected the obsolete `fundingPanel.scrollIntoView`; corrected.
- **Both Professional CI workflows for commit `9ba7a447` are SUCCESS:** `Professional isolated PSBT tests` and `Professional browser preview package (development only)`. The workflow success proves build/tests, **not** an end-to-end browser walkthrough or live funding.

## Important limitations / implementation risks to address
- Current white-label profile is browser-session only. Confirm customer-facing branding in **all** pages and headers; do not assume replacing one logo element finishes white labeling. Do not expose practice personal data to external servers.
- Retail mirror contains **legacy hidden diagnostic Jade and funding panels** and old copied Retail markup; the latest code bypasses them, but cleanup remains. Review the visible page to avoid duplicate planning content.
- The funding page still has developer-only PSBT/Jade links and regtest tools inside a collapsible section. It is **not** an operational deposit page; no trusted mainnet funding address, authenticated Jade wallet public origin, actual payment QR, real-time received/confirmed amount, or automatic post-funding transition exists. Keep fail-closed.
- The current estimated fee calculation follows the Retail test example, **not** an authoritative production quote. Distinguish estimated amount from finalized deposit amount.
- Check the `<base>`-affected relative navigation in the browser. Current code uses `../Professional/funding-workspace.html` from the mirror.
- Validate that the final funding page has correct closing HTML tags after wrapping developer controls in `<details>`; CI success is not a browser rendering test.
- Some earlier diagnostic handoff paths `funding-workspace.html` → `jade-signing-workspace.html` rely on disposable regtest PSBTs and sessionStorage; these are not production customer flow.
- Review older Finish date validation regex and the regtest handoff object fields only when relevant to a customer walkthrough; do not claim full app completion.
- The separate physical Jade Plus hardware acceptance was completed earlier (24-output creator signing and matured recipient release, regtest). **Do not repeat physical hardware feasibility testing** unless new evidence warrants it.

## Exact next-session procedure
1. **Read this handoff file and check the Professional branch HEAD and the two CI workflows.** Never switch to `main` or touch Retail.
2. **Prepare a fresh Professional browser preview** from the latest successful `Professional browser preview package` GitHub Actions artifact. The user's currently running local `127.0.0.1:8765` preview is an **older ZIP**, so re-download and replace the local preview before judging the new UI. Give the user one instruction at a time.
3. Start the walkthrough at `Professional/index.html` (white-label professional identity). Enter fictitious **ABC Wealth Management** with a test logo/contact details; ensure all branding changes flow to the planner.
4. Plan **0.001 BTC**, **five equal annual releases starting 2027-10-30**, $80,000/BTC development override if still available. Verify planning summary, including no horizontal scroll where practical.
5. On final **Continue**, the browser should **directly** display `Professional/funding-workspace.html`, not an extra handoff, duplicate planner, or 404. Confirm the customer sees **Make Your Gift Payment**, **103,750 sats estimated**, and clearly disabled payment QR. Stop there for screenshot and user feedback. No real BTC.
6. Next priority: implement correct funding-address/QR and verified payment detection **safely in Professional-only environment**, then transition to Jade animated QR + signed QR camera only after funding. Preserve no-mainnet/no-broadcast preview restrictions until real safety prerequisites are met. Complete the integrated client flow through Finish and beneficiary recovery when ready.
7. Keep discussion concise, focused on building and verifying the app. The user ended today's session tired and wants to resume fresh tomorrow.

## Key architecture pointers
- Profile: `Professional/index.html`; gift planner: `Professional/retail-mirror/index.html`; payment: `Professional/funding-workspace.html`; Jade: `Professional/jade-signing-workspace.html`; Finish: `Professional/finish-workspace.html`.
- Approved gift plan session key: `bc1q21-professional-approved-plan-preview` with `{format:'bc1q21-professional-retail-plan-preview-v1',status:'UNFUNDED_PREVIEW_NOT_SIGNABLE',releases:[{date,amountSats}],totalSats,signingAuthorized:false,fundingAuthorized:false,broadcastAuthorized:false}`.
- Local development server: `http://127.0.0.1:8765/Professional/index.html`; **never** confuse it with live bc1q21.com.
- GitHub: `bc1q21/bc1q21`, branch `professional/isolated-release-prototype`.
- Never request seed phrases or private keys; non-custodial, browser-only signing, no user funds held by bc1q21.

**Session outcome:** User approved the redesign direction. Code changes committed and CI passed, but revised browser pages have **not yet been walked through by the user**. Resume from fresh-preview white-label and Add Funds review; do not skip verification or declare completion.
