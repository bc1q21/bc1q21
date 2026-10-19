# Professional — one-gift integrated regtest acceptance gate

Scope: `professional/isolated-release-prototype` only. No retail, production, mainnet or live broadcast.

## Purpose

Replace unrelated green checks with **one traceable gift identity** across creator funding,
public gift-card locator, independently observed funding outputs, recipient schedule,
matured release, offline Jade signature, Bitcoin Core consensus acceptance and restoration
from the original 12-word recovery backup.

A passed component test does **not** close the integrated gate.

## Required evidence for ONE disposable regtest gift

1. **Creator:** capture the creator-generated funding transaction ID and gift-card locator
   from the same creation event, together with the complete versioned public release
   commitment. Use no seed or private key in the browser, GitHub, CI or logs.
2. **Funding:** obtain independent, read-only Bitcoin Core observations of that transaction
   and all expected CLTV outputs, including script, value, confirmation and unspent state.
   Record how RPC provenance and chain-tip continuity were established. Caller-supplied
   JSON is not sufficient evidence.
3. **Recipient page:** follow that exact gift-card URL to the corresponding public schedule.
   Verify each date against the actual funded CLTV scripts and show no unsupported
   balance/confirmation claims.
4. **Release:** for one matured output of this same gift, build and review an unsigned
   PSBT using its genuine UTXO and intended destination and fee. Reject premature CLTV,
   mismatched scripts, altered outputs and invalid signatures.
5. **Offline signer:** have Jade sign **that exact release PSBT** through the offline QR
   workflow. Verify the returned signature and transaction details independently;
   obtain regtest `testmempoolaccept` acceptance. Do not broadcast.
6. **Recovery:** on a clean, compatible offline signer, restore the **same gift** using
   only its original 12 recovery words. Recover/discover the public release schedule
   and signing path without exporting a private BIP32 child, wallet-derived AES secret
   or recovery words to any networked device. An extra backup is not acceptable.
7. **Closure:** retain test evidence, negative-case outcomes and explicit approval
   before any live routing or production discussion.

## Current evidence — do not overstate

- Creator 24-output Jade signing: **demonstrated separately**, not this same-gift lifecycle.
- Four Jade CLTV release signings and Bitcoin Core maturity checks: **demonstrated
  separately**, not a release from the same creator gift.
- Disposable software-key regtest funding → unsigned PSBT → Core acceptance:
  `integrated-public-regtest-acceptance.mjs`; **not** Jade-signed or the same gift-card route.
- Offline Option B recipient page and mapped gift-card route: automated checks pass,
  but public metadata is caller-supplied; **no independently authenticated funding**.
- Same-12-word offline metadata restoration and chain-based gift discovery:
  **not demonstrated**. Legacy BC1Q21G1 decryption uses private BIP32-derived
  material that ordinary Jade PSBT QR signing does not provide.

## Gate status

**NOT PASSED.** No continuous single-gift creator → funded UTXOs → recipient QR page →
Jade-signed matured release → original-12-word recovery evidence exists yet.

Do not promote `mappingAuthenticated`, `chainVerified`, `canSign`,
`canBroadcast` or `readyForLiveRouting` based on supplied metadata or
component-level success.

## Next engineering work

Start with a deterministic public-only regtest gift identity/manifest that ties
the creator's transaction and public output scripts to the gift-card locator.
Then independently verify its funded outputs against a trusted local Bitcoin
Core regtest instance. Integrate recipient PSBT and Jade QR handoff **only after**
that evidence is in place. Keep the same-12-word recovery gate visible and
blocking throughout.
