# Owner scope lock — mirror retail; modify only offline signing

The Professional version is the existing bc1q21 retail gifting experience with offline hardware-wallet signing. Retail is the reference implementation, not an invitation to redesign its gift creation, card, link, schedule, recipient workflow, or release semantics.

Owner explicitly rejected new beneficiary steps such as a separately delivered gift fingerprint, additional recovery phrase, second wallet, second computer, or additional hardware signer. The original 12-word recovery phrase must be restored on one offline hardware signer, never entered into the Professional website.

Engineering scope: (1) identify the existing retail signing boundary, (2) replace online key handling/signing with unsigned PSBT construction, QR transfer to the single offline signer, and signed-transaction QR return, (3) verify that the resulting transaction matches retail's intended spend and enforce only safety checks necessary for that changed signing boundary, and (4) regression-test existing retail behavior without modifying retail. Existing retail behavior is the specification.

Do not invent additional beneficiary verification requirements, a new public-gift discovery system, or independent creator handoff as product requirements. Earlier fingerprint-gated and separate candidate-selection prototypes are non-product research artifacts unless shown essential to air-gapped compatibility. Do not wire them into the beneficiary experience by default. Tests should verify parity and the air-gap integration, not drive product redesign.

Technical qualification: retail uses mnemonic-derived funding-address matching and date decryption in its browser; moving the mnemonic offline changes those mechanisms. It is not proven that a hardware signer can reproduce them via its QR interface. Investigate that exact compatibility gap; do not claim exact retail parity, seed-only public-metadata authentication, or end-to-end acceptance until demonstrated. If the gap cannot be solved under these constraints, stop and report it, rather than weakening an essential check.

Allowed branch: professional/isolated-release-prototype. Allowed paths: Professional/ and .github/workflows/professional-*.yml only. No main/retail/production edits, no real BTC, no broadcast, no physical Jade acceptance test until separately authorized.

Latest isolated Professional CI #669 (run 40121271934) passed. That does not constitute full Professional acceptance.
