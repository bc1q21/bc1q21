# Professional retail-parity guardrail — 2026-10-21

## Binding product requirement
Professional is the existing bc1q21 retail gift product and recipient journey with **only** seed/private-key derivation and signing moved to an air-gapped wallet. Public schedule visibility follows the already-approved Professional Option B decision. Retail code and deployment are unchanged.

## Retail implementation verified in repository
- `Frontend/SchedulePlanner.js`: validates YYYY-MM-DD calendar dates, generates monthly/yearly release schedules using UTC dates and month-end clamping. Retail rejects dates later than 2105-12-31.
- `Frontend/TransactionManager.js`: retail builds and signs CLTV release transactions. Professional must **replace the private signing portion**, not invent a new gift schedule or recipient experience.
- `Professional/retail-calendar-cltv.mjs`: converts an ISO calendar date to Unix seconds at 00:00 UTC. This is public-only; it is not proof of release maturity.
- `Professional/gift-specific-cltv-maturity.mjs`: regtest-only public observation gate now distinguishes block-height locktimes from timestamp locktimes. Timestamp finality checks supplied chain-tip median time past (MTP), not wall clock.

## Important distinction
- Bitcoin CLTV locktime >= 500,000,000 is timestamp-based. A calendar date of 2031-01-15 becomes a timestamp-based locktime.
- For a candidate transaction to be final in the next block, the previous block's median time past must be **strictly greater** than the transaction locktime. The gift's calendar date is not by itself proof of maturity.
- The existing October 20 Jade hardware signing experiment used a **height-based** locktime 500, so it does not constitute a calendar-timelock acceptance test.
- A caller-supplied `chainTip.mediantime` is **not** authenticated Bitcoin Core evidence. The current gate returns `chainTipSourceVerified:false` and cannot authorize QR signing.

## Implementation discipline
1. Before adding any Professional behavior, locate and reuse the corresponding retail function and user-facing workflow; document any intentional divergence.
2. Preserve gift card/link format, dates, release intervals, release amounts, and recipient UX unless a specific offline-key requirement necessitates a change.
3. Do not introduce new private-key generation, seed entry, xprv handling, or secret-bearing QR on the online side.
4. Do not conflate a first-release script address with the original retail gift funding-address locator; require authenticated gift-to-release mapping.
5. Do not turn a public schedule match or untrusted Core response into spend authority. Exact gift output, unspent status, maturity, trusted provenance, recipient approval and offline signed-return verification remain separate gates.
6. Regtest only; no real funds, broadcasting, deployment or changes to `main`.

## Current acceptance status
- Retail parity: **not yet demonstrated end-to-end**.
- Public calendar CLTV maturity arithmetic: **implemented and CI-tested** with supplied MTP.
- Trusted RPC provenance and gift-specific funding binding: **not complete**.
- Full recipient-to-Jade QR release: **not integrated**.
- Real-funds readiness: **NO-GO**.
