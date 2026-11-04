# Professional development — end-of-day handoff (2026-11-04)

**READ THIS FIRST in the next session.** User ended the November 4 session after a long workday and explicitly asked to stop. Resume calmly, one small step at a time. Do not restart broad investigations or make speculative edits.

## Scope and safety — do not change

- Repository: `bc1q21/bc1q21`.
- Active branch: `professional/wallet-qr-funding-integration`.
- Local worktree: `C:\Users\partt\bc1q21-Professional\wallet-qr-test`.
- Do all Professional prototype work on that branch only. Never modify `main`, Retail, production, or deploy anything.
- There is another older Professional clone/worktree. Do not switch to or modify it.
- This is a disposable **regtest-only** prototype. No mainnet/testnet funding, no real payment requests, no seed/recovery words/private keys, and no signing or broadcasting.
- User prefers direct, simple, one-step-at-a-time instructions. Give one command or one device action, then wait for the result/screenshot. Do not overwhelm the user with multiple commands.
- User is tired after approximately eight hours of work. Do not continue tonight. No code changes, cleanup, resets, stashing, branch switching, or deployment were authorized.

## Today's progress — November 4

- User reports substantial, successful progress on the Professional gift-recipient page and related experience. The work through most of the day went very well; the recipient page was built out to a large extent. Preserve this progress. Do not imply that the day's work was unsuccessful because of the final camera issue.
- The unresolved issue at shutdown is specifically the **Jade public-account QR import/camera path in the Professional Add Funds/funding workflow**. Do not conflate this with the previously tested Jade signed-PSBT animated QR workflow or with the recipient page itself.
- User says the Jade animated QR camera workflow had worked very well in earlier work approximately three weeks ago. Respect that history. Do not assume Jade changed its QR format without evidence, and do not repeat already-proven signing/camera tests unnecessarily.

## Exact local state at shutdown

### Windows terminals
- A **new PowerShell tab** is open at:
  `PS C:\Users\partt\bc1q21-Professional\wallet-qr-test>`
  It was reached using:
  `Set-Location "C:\Users\partt\bc1q21-Professional\wallet-qr-test"`
- The original Command Prompt window is still showing a Git-pager/output screen from the attempted historical inspection. Pressing `q` and Ctrl+C did not return the prompt. Leave that old window alone; do not spend more time trying to recover it. Use the clean PowerShell tab if a terminal is needed tomorrow.
- User has not run a final `git status` after the last edits/build. **First inspect status tomorrow before changing anything.** Do not reset/clean/stash.

### Browser
- Brave has two local tabs:
  - `bc1q21 Professional — Add Funds` (left tab)
  - `bc1q21 Professional — Jade public QR format check` (right tab, selected at shutdown)
- The selected diagnostic page is served locally at `http://127.0.0.1:8766/Professional/jade-public-qr-format.html`.
- The user had not yet switched back to the Add Funds tab after the latest instruction. No final test of the actual Add Funds public-wallet camera/import flow was completed after the source rebuild.
- Do not ask the user to jump between tabs until you have a clear, minimal test plan. Do not start another diagnostic page or another server/window.

## Jade QR diagnostic findings

The standalone diagnostic `Professional/jade-public-qr-format.html` was rebuilt several times using `node Professional\build-jade-public-qr-format.mjs`.

The final observed diagnostic result after scanning the Jade disposable test wallet's **public Export xPub → Native SegWit → Single Sig** animated QR was:

- QR format confirmed: `ur:crypto-account`
- Descriptor count: `1`
- Descriptor tags: `404 > 303`
- HD key structure recognized
- HD key field IDs: `3, 4, 6, 8`
- Parent field type: `[object Number]`
- Parent field object keys: `none`
- Public key length: `33`
- Chain code length: `32`
- Parent fingerprint length: `missing` (the diagnostic displayed this because it checked `.length` on the numeric value)
- Origin depth: `3`

This is evidence that the QR decoder can recognize and structurally decode the Jade `crypto-account` QR and that the parent-fingerprint CBOR value is represented as a number in this decoder's output. It is **not** proof that the production Add Funds importer constructs the correct xpub or derives the correct receiving address.

### Local source change and build

File edited:
`Professional/browser-integration/browser-verifier-entry.mjs`

Original code in the importer treated CBOR field 8 as bytes only:
`const parent=asBytes(mapget(key,8));`

The local edit now reads the value and converts an integer in the unsigned 32-bit range to four bytes using big-endian encoding:

```js
const parentValue=mapget(key,8);
let parent=asBytes(parentValue);
if(!parent&&Number.isInteger(parentValue)&&parentValue>=0&&parentValue<=0xffffffff){
 parent=Buffer.alloc(4);
 parent.writeUInt32BE(parentValue,0);
}
```

The importer then requires:
- compressed public key length 33;
- chain code length 32;
- parent fingerprint length 4;
- origin depth 3.

The user ran:
`npm --prefix Professional\browser-integration run build`

The build completed successfully. Node printed a nonfatal `[DEP0180] fs.Stats constructor is deprecated` warning. A successful build only proves compilation; it does not prove the xpub or address is correct.

### Generated bundle and backup

Earlier `git status --short` showed:
- modified: `Professional/browser-integration/browser-verifier-entry.mjs`
- untracked: `Professional/browser-integration/professional-verifier.bundle.js`

Before rebuilding, the user copied:
`Professional/browser-integration/professional-verifier.bundle.js.before-fingerprint-fix.bak`

The bundle was rebuilt successfully afterward. A final status was not taken, so there may now also be an untracked backup file. Inspect status and preserve all changes. Do not delete the backup or bundle without checking.

### Diagnostic source incident
- While editing `Professional/jade-public-qr-format.browser.mjs`, the user accidentally typed the characters `FV` after pressing Ctrl+F without Ctrl. The stray `FV` line was found and deleted.
- Additional diagnostic output was added to inspect HD-key field IDs, parent field type and parent object keys. The diagnostic was rebuilt and produced the findings above.
- Do not revisit this incident; it was corrected.

## Git history investigation — INCONCLUSIVE

The user ran:
`git log --oneline --follow -12 -- Professional/browser-integration/browser-verifier-entry.mjs`

The output included:
- `fce3846` — Professional: decode Jade crypto-account/crypto-hdkey UR frames into public account xpub for regtest receiving address
- `8042fe6` — Professional only: add regtest-only address QR renderer with explicit no-payment gate
- `0b55207` — Professional only: add read-only public xpub QR camera adapter
- followed by earlier Professional integration commits.

The user then ran:
`git show --format=fuller --no-ext-diff fce3846 -- Professional/browser-integration/browser-verifier-entry.mjs`

The displayed diff showed that `fce3846` added the `decodeJadeAccountUr` decoder, including the bytes-only parent-fingerprint assumption.

A subsequent attempted command was:
`git show fce3846^:Professional/browser-integration/browser-verifier-entry.mjs`

However, the original Command Prompt never returned to a normal prompt; the screen remained in the Git output/pager and showed a `:` at the bottom. The user tried `q` and Ctrl+C without success, then opened a clean PowerShell tab. **Do not treat the apparent output of the parent-commit command as a verified historical comparison.** The historical comparison remains unfinished. If it matters tomorrow, use a safe non-interactive Git command that writes output to a file or use `--no-pager`; do not put the user through another pager problem.

## What has NOT been verified

- The actual Add Funds page's public-wallet camera has not yet been shown to import the scanned account successfully after the integer-fingerprint conversion.
- No valid xpub output from the revised importer has been confirmed.
- No correct receiving address has been independently checked.
- No receiving-address QR has been confirmed on the Add Funds page after the fix.
- No funding transaction or end-to-end lifecycle test was run as part of this final camera investigation.
- No signing, broadcasting, real funding, or deployment occurred.

## Tomorrow's recovery plan — strict order

1. Start by acknowledging the user's successful day's work and that tonight's issue is isolated. Do not restart the entire investigation.
2. Use the clean PowerShell tab already at the correct worktree. Give exactly one command:
   `git status --short`
   Review and preserve every modified/untracked file. Do not reset, clean, stash, or discard.
3. Confirm the current branch with one command:
   `git branch --show-current`
   It must be `professional/wallet-qr-funding-integration`. Do not switch branches.
4. Do not assume the local source edit or rebuilt bundle is pushed to GitHub. Inspect status and the branch/remote state before deciding whether any commit or push is appropriate. Never push the generated bundle or backup blindly.
5. Resume with a narrowly scoped test of the actual **Add Funds → Connect Jade public wallet QR** path, using the same disposable test wallet and its public account export only. The goal is to see whether the updated importer accepts the `ur:crypto-account` data and produces a public xpub/address preview.
6. If it fails, capture the exact on-page error and stop. Do not invent another diagnostic page or edit unrelated code. Compare the importer against the actual observed CBOR data and, if necessary, perform the historical comparison safely with `git --no-pager show` or redirected output.
7. If it succeeds, independently verify the xpub serialization and derivation assumptions before calling the address correct. Pay particular attention to parent fingerprint byte order, account depth, origin path, network/version bytes, and whether the derived receiving address belongs to the intended public account. No funding until this is established.
8. Keep the already-successful gift-recipient-page work intact. Do not change Retail/main or production. No live deployment.

## User interaction requirements

- User is exhausted after a long session. Be calm, concise, accountable and focused.
- Do not say the camera or importer is fixed until the actual Add Funds import and resulting address have been verified.
- Do not claim Jade changed its format without evidence.
- Do not send the user back through broad source searches, unrelated tests, or repeated signing/PSBT tests.
- One action/command at a time, then wait.
- End the next session with a short status summary and a clear stop point.

## GitHub checkpoint

This file is a documentation-only checkpoint on `professional/wallet-qr-funding-integration`. It records the November 4 state without changing application code. The local source edit, generated bundle, and backup must be reconciled separately after inspecting local Git status.
