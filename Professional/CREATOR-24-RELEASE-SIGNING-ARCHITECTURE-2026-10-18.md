# bc1q21 Professional — Priority A creator signing architecture gate
Date: 2026-10-18
Branch: `professional/isolated-release-prototype`
Status: documented protocol finding and next integration gate; NOT a new physical hardware PASS.

## Existing evidence (do not repeat)
- Four independent recipient-side CLTV PSBTs were physically signed by Jade Plus and accepted at maturity by disposable Bitcoin Core regtest: runs 39051477566, 39052501320, 39053883952.
- One funding transaction with 24 distinct CLTV outputs was constructed and confirmed in disposable regtest: run 39058443825; public-key/script binding: 39058700501.
- Neither result establishes a Jade-signed 24-output creator funding transaction or 24 separate PSBTs signed in one scan.

## Protocol evidence
Official Jade RPC reference: https://github.com/Blockstream/Jade/blob/master/docs/index.rst , `sign_psbt request` and `sign_psbt reply`.
- `sign_psbt` accepts a **single** PSBT byte string.
- Jade appends signatures for inputs belonging to the wallet (fingerprint identification).
- The reply is withheld until the hardware user explicitly confirms signing.
- Multiple PSBTs in a single `crypto-psbt` payload are **not documented**. A single PSBT may contain multiple inputs/outputs, but represents **one transaction**, not 24 independent future release transactions.
- Exact physical review screens/approval counts for a 24-output funding PSBT remain unverified.

## Product architecture recommendation — creator vs recipient
1. Creator prepares ONE gift funding transaction with 24 CLTV outputs and, where required, has the creator's hardware wallet sign that ONE funding PSBT via one animated `ur:crypto-psbt` QR exchange. The output count may increase frame count and device review burden; neither a one-scan success nor a one-approval success is proven.
2. Each recipient-side claim is its own unsigned CLTV release PSBT prepared only after that release becomes mature, with one Jade offline signing exchange for that release.
3. Creator signing authority and recipient signing authority are distinct: the creator's funding inputs must actually belong to the creator's signing wallet; the 24 recipient CLTV output keys belong to the gift recipient's recoverable wallet. Do not ask recipient Jade to sign creator funding inputs.
4. This does NOT solve encrypted first-date unlock, gift-specific recipient integration, recipient ownership authentication, or retail parity.

## Next focused implementation gate
A. Build an isolated disposable 24-output funding PSBT from a controlled synthetic creator signing wallet and 24 recipient public-key CLTV scripts. Verify its single-transaction semantics, every output amount/script, fee, change, derivation/origin metadata, and the PSBT's QR-pixel-to-BC-UR byte-for-byte roundtrip.
B. Present that single funding PSBT on a clearly labeled offline review page. Hardware scan only after a separate explicit owner go-ahead; record Jade acceptance, review behavior, number of user confirmations, and signed return.
C. Independently verify the signed funding transaction and 24 outputs in disposable regtest. No real Bitcoin, no production, no retail edits.
D. Only if single-funding-PSBT architecture is insufficient, evaluate a custom 24-PSBT batch protocol; never present it as supported by stock Jade firmware.

## Safety
Professional branch and professional-only files/workflows; no production deployment, Start9, retail/main changes, real funds, secrets, xprvs or seed words in GitHub artifacts. Maintain explicit NO-GO for real funds and private schedule unlock.
