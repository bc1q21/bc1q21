# Original 24-output gift commitment — provenance gate (2026-10-23)

## Confirmed evidence
- The October 20 physical Jade Plus proof used one funded, disposable, 24-output CLTV regtest gift. Release 1 was signed offline and independently verified; Bitcoin Core accepted the finalized transaction through `testmempoolaccept` without broadcast. See `SESSION-HANDOFF-2026-10-20-JADE-SAME-GIFT-SIGNED-CORE-PASS.md`.
- That evidence concerns **one release** and height CLTV 500. It does not prove a calendar-timestamp beneficiary journey.
- The public commitment algorithm in `public-gift-binding-commitment.mjs` hashes the funding txid plus the **ordered, complete** list of each release's index, vout, sats and scriptPubKeyHex. `public-gift-commitment-notice.test.mjs` currently tests a **synthetic** 24-output binding (funding txid `aaaa…`), not the original funded gift.
- The existing Jade signing/Bitcoin Core acceptance evidence establishes neither a 64-character original-gift binding fingerprint independently retained by a recipient nor the authenticity of its delivery.

## Missing evidence — BLOCKING
1. Recover the **exact original 24-output public binding** from existing funded-gift artifacts or an independently restored regtest Core snapshot. For every release verify ordered index, vout, sats and locking script against the original funding transaction. Do not substitute a synthetic fixture or infer unrecorded values.
2. Compute the versioned public binding digest from that verified original binding and retain a public-only reproducible fixture/test. Never add seed words, private keys or private derivation material.
3. Determine whether the creator **actually shared** that fingerprint with the intended recipient through an independently authenticated channel **at gift creation**. No such independently retained original fingerprint is demonstrated in the reviewed handoffs. A digest calculated today cannot retroactively establish original creator intent.
4. Test that recipient comparison fails closed when the independently held digest differs by one character, the funding txid differs, any release script/value/vout changes, or release ordering changes.
5. Treat a fingerprint delivered by the same website that displays the gift as **non-independent**. A separate window, tab, or message copied from that same potentially compromised site does not establish trusted provenance. A verified channel authenticates the sender only to the extent the channel's identity was established outside that site.

## Decision
**ORIGINAL-GIFT COMMITMENT PROVENANCE: NOT VERIFIED.** Do not claim the October 20 creator already issued a public commitment. Do not enable beneficiary QR export, signing or broadcast on the strength of a freshly generated digest, caller-supplied metadata, or the gift link. The original hardware proof remains valid within its documented scope.

## Next engineering step
Locate the original public funding/binding artifact and the independently retained recipient reference, if any. If no prior reference exists, create a **new, explicitly labeled regtest recipient handoff** for prospective testing; it must not be represented as a historic fingerprint. Then audit the restricted review and approval boundary before integrating a one-time QR authorization. No additional physical Jade test is needed for this provenance investigation.
