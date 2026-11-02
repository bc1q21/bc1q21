# Professional funding integration — restart handoff (2026-11-02)

**READ FIRST before making changes.** This is an isolated, unfinished regtest prototype, not a working customer payment system. User will paste this into a new ChatGPT conversation. Do not repeat already-completed camera, signing, or gift-wizard tests.

## Immutable safety and scope
- Repository: `bc1q21/bc1q21`. Work **only** on branch `professional/wallet-qr-funding-integration`, local worktree `C:\Users\partt\bc1q21-Professional\wallet-qr-test`. NEVER change Retail/main/production, `Frontend/index.html`, or deploy Professional to production.
- Another original Professional clone has uncommitted work; **do not touch it**.
- This is disposable Bitcoin **regtest** only, no mainnet/testnet deposits, no seed/recovery words/private keys, no real payment requests, no signing/broadcast authorization.
- User wants one exact step at a time, no loops, no repetitive camera tests or Jade signed-PSBT tests. Explain honestly what is and is not proven. Do not ask whether user has Jade: they do, on hand.

## CRITICAL SRI / assets / deployment
- Professional retail mirror `Professional/retail-mirror/index.html` has local SRI-integrity hashes that MUST match exact bytes of referenced resources. Changing scripts, CSS, URLs, mirror HTML, or assets can break the mirror. Before and after any relevant change run `python Professional/repair_mirror_sri.py` from worktree root, inspect differences and validate all local resources (last result: **24 verified, zero corrected**). Do not blindly commit unrelated SRI changes.
- In particular `Professional/retail-mirror/index.html` has **uncommitted local SRI fixes**; avoid remotely editing that path, and **do not git reset/clean/stash/overwrite** without inspecting status and user's approval.
- `Professional/browser-integration/professional-verifier.bundle.js` is **locally generated and untracked**. Source `Professional/browser-integration/browser-verifier-entry.mjs` is tracked. After source changes, rebuild in local worktree: `cd /d "C:\Users\partt\bc1q21-Professional\wallet-qr-test\Professional\browser-integration" && npm run build`. A remote GitHub source commit alone does NOT update the browser bundle.
- Changes require impact assessment and focused regression checks; avoid touching proven signing logic or broad changes. No live production actions.

## Where we stopped November 2, 2026
- Last source-code commit **`fce3846`** on isolated branch: added QR decoding for animated Jade `ur:crypto-account` / `ur:crypto-hdkey` in `Professional/browser-integration/browser-verifier-entry.mjs`. Previously supported only plain xpub. **Not yet tested against actual Jade public account QR**. Potentially incomplete: real Jade descriptor tags, CBOR tag handling, account origin paths, and derivation assumptions need to be verified; do not call it a proven fix.
- User successfully ran `git -C "C:\Users\partt\bc1q21-Professional\wallet-qr-test" pull origin professional/wallet-qr-funding-integration`, fast-forward `555722a..fce3846`.
- User successfully ran `npm run build` in `Professional/browser-integration`. Node `[DEP0180]` fs.Stats deprecation warning is nonfatal.
- Browser local website `http://127.0.0.1:8766/Professional/funding-workspace.html` showed payment page with **“No test address derived”**, no receiving QR. User opened developer wallet section and started camera; camera showed video and **“Scanning a plain public account xpub QR…”**. **No Jade public-wallet QR was actually presented to camera**. Thus no wallet information imported, no address. This does not establish whether new decoder works.
- UI still contains **stale copy** “Jade animated account exports are not yet supported” and “Scanning a plain public account xpub QR…” even after decoder commit. Update only after actual format confirmed.
- No confirmed Bitcoin receiving address, no funding transaction, no end-to-end funding test.
- Signing-side animated Jade QR / PSBT and signature verification were successfully tested **weeks earlier**; don't redo them without a new relevant failure.
- QR camera function has been working for weeks, not an accomplishment today.

## Gift plan / page behavior
- The page has “Load 100,000-sat test schedule” button. Disposable fixture: five 20,000-sat annual releases Nov 3 2027–2031, total 100,000 sats; estimated 103,750 sats incl 2,000 service + 1,750 mining. The fixture is **sessionStorage-only and may disappear on refresh**. Do not make user repeat real gift wizard.
- Plan localStorage key from mirror: `bc1q21-professional-last-approved-plan-preview`. Funding page session key `bc1q21-professional-approved-plan-preview`.
- Payment screen `Professional/funding-workspace.html`: “Connect Jade public wallet QR (regtest only)” opens developer section; `onPublicXpub` fills xpub field and clicks “Preview public funding key”; global `bc1q21ProfessionalPreviewFundingPublicKey` derives `m/84'/0'/0'/0/0` from depth-three mainnet-format xpub and renders a **regtest bcrt1** address + QR with `bc1q21ProfessionalRenderFundingAddressQr`. This is **unauthenticated, non-payable preview only**. Do not claim that a regtest conversion of a Jade mainnet account is a verified funding address; origin and network consistency need proof. Gift-specific CLTV release outputs derive /1/index separately; understand architecture before claiming funds can be recovered.
- Source `Professional/browser-integration/browser-verifier-entry.mjs`, build script `Professional/browser-integration/build.mjs`, dependencies include `@ngraveio/bc-ur`, `cbor`, `jsqr`, `bitcoinjs-lib`, `qrcode`. Code currently recognizes `ur:crypto-account` and `ur:crypto-hdkey`, parses CBOR tags, creates xpub. **Inspect and test with authentic public export; do not assume success.**
- Website is served locally on port 8766; after reboot start only required static server and development shell. Bitcoin Core regtest port 18443 and bridge 18761 needed only for actual chain/funding tests, not QR import. Do NOT reflexively open five Command Prompt windows.

## Tomorrow's priority, in order
1. **First verify** the existing local state and the real Jade's **public account QR export** workflow (public data only). User has Jade. Do not repeat camera proof. If Jade cannot export the assumed format, change integration to actual supported public-wallet export rather than guess.
2. Validate decoding and origin/network/path; derive **correct regtest receiving address** and show it with its QR on payment page. Do not confuse a placeholder address with real integration.
3. Resolve stale UI labels and session-only fixture loss if needed, with narrowly scoped code.
4. Validate SRI hashes and local resources after relevant edits, run focused tests, and only then regtest funding lifecycle. Keep all retail/main untouched.
5. Commit source changes to isolated GitHub branch, confirm local build is rebuilt, and document evidence. User expects real functionality, not repeated explanation.

## User's Windows commands / environment
- Windows 11, Brave, Command Prompt. Local worktree `C:\Users\partt\bc1q21-Professional\wallet-qr-test`.
- Site URL `http://127.0.0.1:8766/Professional/funding-workspace.html` (requires local static server).
- After source commit, `git -C "C:\Users\partt\bc1q21-Professional\wallet-qr-test" pull origin professional/wallet-qr-funding-integration` (check status first for conflicts).
- Build `cd /d "C:\Users\partt\bc1q21-Professional\wallet-qr-test\Professional\browser-integration" && npm run build`.
- User wants **one command or one Jade menu action at a time**, and screenshot/result before next.

## Critical caution
The last QR decoder was written without an authentic Jade QR fixture and has not been tested. Treat as experimental. Confirm actual Jade account export and UR descriptor semantics, check account xpub depth/network/origin, and ensure receiving address corresponds to spendable signer key. Do not overstate completion or encourage deposits.

## GitHub checkpoint
Last verified code commit: `fce3846`. This handoff document is a subsequent documentation-only checkpoint. Neither is production.