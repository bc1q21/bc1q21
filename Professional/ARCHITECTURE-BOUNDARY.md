# bc1q21 Professional — application isolation boundary

Status: development only. This is a target architecture, **not** a claim that the prototype is already independent or safe to fund.

## User-facing flow

1. Professional identity and optional practice branding.
2. The **unchanged Retail gift-planning experience**: recipient, amount, dates, schedule review.
3. A Professional-only Jade Plus offline signing / animated-QR exchange.
4. The familiar Retail Add Funds experience, connected to Professional's verified transaction data.
5. The familiar Retail Finish, gift card, and recipient experience.

The planner is **one** planner, not a Professional rewrite. A failed Professional step must never silently fall back to Retail's mnemonic or browser signing.

## Source and runtime separation

- Development branch: `professional/isolated-release-prototype`. No commits to `main` or production deployment from this branch.
- Retail production: existing `Frontend/`, `Website/`, `Backend/`, and production deployment configuration remain unchanged.
- Professional code stays in `Professional/` and its explicitly scoped test workflow.
- **Current limitation:** `Professional/retail-mirror/index.html` uses Retail assets from `Frontend/` via `<base href="../../Frontend/">`. This is a development mirror, **not** yet a fully independent deployed application.
- Before launch, Professional must use a **version-pinned, separately deployed copy** of the required Retail UI assets. Changes to Professional must not automatically replace Retail assets, and vice versa.
- Keep distinct Professional routing and signing state. Do not load Retail mnemonic-generation or browser-signing paths in the Professional funding lifecycle.
- Shared infrastructure (host, Bitcoin node, Nginx, APIs) remains a possible common failure domain; independently deployed code is not complete infrastructure isolation.

## Security gates before enabling Add Funds

- Translate Retail release **dates** into the exact supported Bitcoin time-lock semantics; do not substitute guessed future block heights.
- Confirm Jade-compatible offline public-key derivation, PSBT signing, animated QR exchange, and signed-result verification for the actual Bitcoin network.
- Bind every signed result to the intended recipient, schedule, script, amounts, fees, and transaction outputs.
- Ensure no seed phrase or private key enters the browser, server, logs, or exports.
- Verify the funded output is redeemable through the Professional recipient release workflow.
- Only after an independently verified end-to-end test may Professional advance to funding. Until then: no real BTC, no broadcasting, and no live Professional entry point.

## Release rule

A GitHub branch protects development; **separate runtime assets, routing, and signing logic** protect deployed Retail from Professional regressions. Do not equate the two.
