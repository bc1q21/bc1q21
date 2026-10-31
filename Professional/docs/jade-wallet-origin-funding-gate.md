# bc1q21 Professional — Air-gapped Jade Plus wallet-origin and funding gate
Status: DESIGN BASELINE ONLY — not implemented, not a payment authorization.
Scope: Professional isolated prototype on branch professional/isolated-release-prototype. Retail/main/production out of scope.

## Verified device capabilities
Blockstream documents Jade Plus QR-mode export of a singlesig Native SegWit account xpub at m/84'/0'/0', plus on-device verification of a receiving-address QR against the currently loaded wallet. The Jade Plus QR workflow also supports PSBT signing and signed-QR return.
References:
- https://blockstream.zendesk.com/hc/en-us/articles/20272957303577-Add-Jade-Plus-to-an-air-gap-supported-app
- https://blockstream.zendesk.com/hc/en-us/articles/20270907312665-Verify-receive-addresses-with-an-air-gapped-Jade-Plus
- https://blockstream.zendesk.com/hc/en-us/articles/20272487890841-Supported-air-gapped-functionality-via-QR

## Proposed regtest-only workflow
1. Lock reviewed gift-plan commitment (release dates, sats, beneficiary key/script commitments, fees policy).
2. Scan Jade Plus's animated account-xpub QR into a browser camera decoder; do not request seed, private key or USB connection.
3. Parse and validate export format, account derivation path, network and script type. Do not silently reinterpret mainnet xpubs as regtest wallet identity; explicit test-network compatibility must be verified before enabling any address.
4. Derive a fresh receive address using the selected account and record the precise descriptor/path/index. Avoid reusing a hardcoded first receive index for successive gifts.
5. Display the address QR for Jade Plus to verify on its own screen; compare complete address and account. User acknowledgement is a procedural check, not cryptographic proof.
6. Independently establish wallet-origin assurance and transaction approval in the trusted adapter; until that exists, retain walletOriginAuthenticated=false, canRequestPayment=false, signingAuthorized=false, canBroadcast=false.
7. Once the trusted adapter exists, bind the wallet descriptor, reviewed plan, exact funding address, fee quote, expiration, chain/network and confirmation policy to a fresh transaction intent.
8. Only then show a BIP21 payment request, monitor funding through the verified Bitcoin Core source, handle underpayment/overpayment/reorgs, and construct a bounded unsigned PSBT.
9. Revalidate all inputs/outputs, recipient scripts, timelocks, change and fee before rendering a signing QR; the Jade device must independently confirm transaction details. Signed return is cryptographically verified against the exact approved PSBT. Broadcasting is a separate permission gate.

## Fail-closed constraints
- Browser sessionStorage, imported xpub text, user checkboxes and self-reported device confirmations are NOT trusted authorization issuers.
- No real BTC or mainnet addresses in the prototype; disposable regtest only. Jade QR documentation commonly describes mainnet m/84'/0'/0' and does not by itself establish regtest xpub export support.
- No deposit QR until a tested wallet-origin policy, verified network, safe fee calculation and funding-intent binding exist.
- No private keys or seed phrases in browser/server.
- No automatic signing or broadcasting; independent authorization required.
- Current planning validator accepts up to 60 releases but the diagnostic unsigned PSBT builder caps at 24: reconcile before production.
- Audit current diagnostic use of fixed receive path /0/0 and change path /0/1 for address reuse, collisions and wallet recovery implications.
- Confirm recipient key ownership, timelock semantics, dust and fee policy before issuing a payment request.

## Test gates
- Correct Jade xpub + expected path and script; malformed/foreign xpub; wrong account/passphrase; wrong network; changed address; replayed scan.
- Device address verification success/failure, cancellation and camera denial.
- Wrong recipient script, changed schedule, fee tampering, changed wallet after funding, stale/reused UTXOs, duplicate outputs, chain reorg.
- Under/over funding, change dust, fee-rate changes, multiple deposits, refresh/restart, and interrupted handoff.
- Signed PSBT mismatch and tampering; cryptographic signature checks; no unauthorized broadcast.
- Verify isolated Professional artifact and no changes to Retail/main.

Next coding milestone: regtest-only wallet QR import and on-device address-check UX with explicit UNVERIFIED state, no deposit request. Do not treat the UX acknowledgement as proof of ownership.
