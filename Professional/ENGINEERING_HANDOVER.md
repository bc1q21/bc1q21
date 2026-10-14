# bc1q21 Professional — Engineering Handover and Restart Guide

**Snapshot:** 2026-10-13. **Scope:** isolated experimental Professional branch only. **Authoritative code:** GitHub repository `bc1q21/bc1q21`, branch `professional/isolated-release-prototype`. **Do not merge or deploy this branch.**

## Read this first in a fresh chat

The user is building **bc1q21 Professional**, an eventual advanced version of the existing retail bc1q21 Bitcoin gifting platform. The retail product is live and **must not be modified**. Do not edit, commit to, merge into, or deploy GitHub `main`. All Professional engineering must remain in `professional/isolated-release-prototype` and use **synthetic/regtest transactions only**. Never request real wallet seed phrases, private keys, or real BTC; never broadcast transactions. Keep the product name exactly **bc1q21** in lowercase.

The user is not a programmer. They expect the assistant to lead engineering, inspect the actual branch, implement and test changes, verify GitHub Actions, and explain milestones concisely. They prefer one step at a time when their participation is needed. A previous attempt to move chats lost engineering context; **read this handover and the referenced source files and workflow before proposing changes**. Do not reconstruct architecture from guesses or redesign the product.

## Product model — do not change

Professional must retain the familiar retail bc1q21 gift workflow: a gift creator chooses amount, dates, number of releases, and duration; a gift is funded and delivered via a gift card; the beneficiary redeems releases after unlock. **User-confirmed KISS constraint:** Professional must preserve the **identical retail workflow and behavior**, reusing retail code wherever feasible; only seed/recovery-word handling and other private wallet operations move across an air gap. Keep changes minimal and limited to enforcing that boundary. **No hardware vendor is preferred or mandated:** Jade Plus, Coldcard, and other suitable air-gapped signers are interchangeable candidates, subject to verified compatibility. Do not design the product around Jade or assume a separate companion device is necessary. The Professional distinction is that **independently user-generated recovery words and private signing material** stay entirely offline/air-gapped. Professional never generates recovery words. The networked website handles **public-only** information, unsigned PSBTs and non-secret transaction information. The gift creator controls creation and delivery. Offline Jade Plus QR signing has been tested as a proof of concept. This is **not** an authorization to put seeds into a browser, server, connected laptop, or GitHub.

The present prototype is **one input, one output, legacy P2SH CLTV, synthetic/regtest**. It is not yet the full retail-equivalent multi-release implementation, not a complete production wallet architecture, and not a production security audit.

## Tested building blocks

- Offline Jade Plus public QR and synthetic PSBT signing experiments; existing captured Jade signed fixture; separate independent Bitcoin Core regtest mempool-acceptance experiments. These are limited proofs, not production approval.
- `public-handoff.mjs`: strict public-only CLTV handoff validation.
- `public-funding-release-integration.mjs`: builds unsigned release PSBT using public funding data.
- `approved-release-gate.mjs`, `transaction-confirmation.mjs`, `confirmation-session.mjs`, `one-time-approved-handoff.mjs`: independent transaction-intent checks, explicit confirmation and one-time approval.
- `controlled-qr-session.mjs`: controlled confirmation, QR export and signed-return integration.
- `verify-signed-psbt-return.mjs`: checks returned PSBT is bound to approved unsigned transaction and rejects unexpected metadata.
- `verify-returned-signature.mjs`: checks synthetic CLTV ECDSA signature cryptographically; enforces SIGHASH_ALL.
- `finalize-verified-release.mjs`, `audit-finalized-transaction.mjs`, `finalize-and-audit-release.mjs`: build finalized transaction only after checks and independently audit raw transaction; **never broadcast**.
- `in-memory-replay-guard.mjs`: optional shared in-process public funding-outpoint claims; claims consumed on failed return.
- `local-durable-replay-guard.mjs`: **prototype** atomic local-file outpoint claims surviving separate guard instances on a shared filesystem. Optional via the controlled-session `replayGuard` parameter; not mandatory or production-grade. No distributed coordination, trusted storage model, cross-host guarantee or blockchain UTXO status verification. Claims intentionally are not rolled back.
- Numerous `Professional/*.check.mjs` and `Professional/*.test.mjs` regressions, plus isolated HTML/QR demos.

**Important limitations:** The approval gate does not prove an independent human actually reviewed transaction details; the in-memory and local-file replay guards are opt-in prototypes; lower-level APIs still exist; the complete real-hardware end-to-end signing-return path and full multi-release product have not been validated. Bitcoin Core acceptance checks are separate and do not imply every newly finalized transaction was independently accepted by Core.

## CI and reconciliation

Workflow: `.github/workflows/professional-tests.yml` runs only on the isolated Professional branch or manual dispatch; includes Node tests, independent bitcoinjs checks, offline demo builds and Chromium browser checks. Inspect the workflow and **latest Actions run status**, not just a previous green run.

Last previously confirmed green before the replay changes: https://github.com/bc1q21/bc1q21/actions/runs/38439074641 .

After durable replay guard work, a regression `Professional/in-memory-replay-guard.check.mjs` expected the text `Invalid PSBT base64` while the verifier correctly rejected the malformed input with `Invalid PSBT structure`. A focused assertion update allows either fail-closed rejection path; commit `efe2ebe5356daa6d6e6b05d2557a4e536a4b1b39`. Check the Actions run started from that commit and record its final result. Do **not** claim green until GitHub reports completed/success. A new commit adding this handover may trigger another CI run.

Useful GitHub Actions URL: https://github.com/bc1q21/bc1q21/actions?query=branch%3Aprofessional%2Fisolated-release-prototype .

## Planned work after the break — prioritize, do not endlessly add tests

1. **Reconcile** the current CI suite and ensure a green isolated branch; investigate any failure by inspecting job logs, fixing root causes, and rerunning.
2. Audit the prototype boundaries and consolidate duplicated test paths. Confirm the actual controlled entry point uses approved PSBT, verified signed return and independent final audit. Avoid claiming the optional replay guard is mandatory.
3. Validate durable replay semantics under restart, corruption, concurrency and recovery; determine production-appropriate persistence/locking architecture and Bitcoin UTXO-state verification. Local-file guard is only a proof of concept.
4. Evaluate a **vendor-neutral** air-gapped mechanism for the existing retail gift operations, including offline schedule recovery and Bitcoin signing. Jade Plus is only one previously tested candidate; Coldcard or another suitable signer may be simpler. Run disposable regtest-only verification without broadcasting. This may require coordinated user interaction; do not request seeds.
5. Design and implement retail-equivalent multiple gift releases and unlock dates with offline signing, safe fee and recovery handling; then threat-model and acceptance-test the complete Professional experience.
6. Plan deployment architecture and independent security review separately. No production release without explicit user authorization and comprehensive review.

## Safety and working conventions

- No commits to `main`, no retail website changes, no merges, no deployment, no real Bitcoin and no transaction broadcasts.
- Do not treat CI green as proof of complete security or product readiness.
- Maintain a clear distinction between **code committed**, **CI passing**, **Bitcoin Core regtest verified**, **Jade hardware verified**, and **production-ready**.
- When the user returns in a new chat, first read this document and current GitHub branch/Actions results, then summarize exactly where work stopped and recommend the **single next engineering task**.
- If the GitHub connector is unavailable, say so rather than assuming branch state. Never ask user to paste private keys or recovery words.

## Suggested new-chat opener

“Please continue the bc1q21 Professional engineering project. First read `Professional/ENGINEERING_HANDOVER.md` on GitHub branch `professional/isolated-release-prototype` in repo `bc1q21/bc1q21`, check the latest GitHub Actions results, and confirm the exact next step. Do not touch retail bc1q21 or `main`, do not deploy, and use only synthetic/regtest data.”

## Creator-to-beneficiary handoff (user-confirmed, non-negotiable)
The gift creator independently creates, safeguards, and delivers the recovery words **and** the normal bc1q21 gift card to the beneficiary, whether personally, through a will or estate, or another private arrangement. **bc1q21 does not generate, hold, escrow, transmit, deliver, recover, or manage those recovery words**, and does not mediate this handoff. The beneficiary later uses those privately received recovery words with their own compatible air-gapped wallet to authorize the ordinary retail-style gift release. This is a user responsibility, **not** an unresolved platform credential-delivery requirement. Keep retail gift-card output and release UX unchanged except for the minimum air-gapped private-operation exchange.
