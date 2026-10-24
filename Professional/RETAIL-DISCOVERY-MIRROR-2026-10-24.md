# Retail discovery mirror — Professional investigation

Owner direction: mirror retail gift discovery and release experience, except keys remain in one offline hardware signer restored from the original 12 words. No separately delivered fingerprint. Professional branch and disposable regtest only.

Read-only retail reference: `Frontend/gift/gift-h08.js` functions `loadGiftFromAddressTxs`, `inspectGiftCandidate`, `unlockGift`.

Retail obtains candidate transactions from the gift-link funding address, filters OP_RETURN plus P2SH, and does not trust transaction ordering. After importing the mnemonic it checks that the derived funding address equals the gift-link address. It decrypts the first-date OP_RETURN with mnemonic-derived material, then checks a derived CLTV release address against transaction outputs. This is a meaningful wallet-to-link binding, not merely a display convention.

Professional can mirror candidate discovery, chain-output checks, script/date derivation, review, and gift card experience. It cannot copy retail's website-side mnemonic-to-funding-address comparison: the Professional website never receives the mnemonic. Professional release dates are public by prior owner approval. Caller-provided xpub, calendar and scripts agreeing with one another do not prove the creator's identity or that the hardware-restored wallet owns that xpub.

Next engineering question: can the single offline hardware signer establish wallet-to-public-gift binding through its existing QR interface, without an extra seed, device, manually retained fingerprint or website seed entry? Test before asserting equivalence. Bitcoin Core confirms on-chain outputs but does not authenticate the creator's original gift intention. Do not substitute a digest computed from website-provided values for independent evidence.

Existing fingerprint-gated helpers are research artifacts, not recipient requirements. Do not bypass their security assertions to make a test green. If no acceptable single-signer binding exists, stop and report the precise limitation.

Evidence: isolated Professional tests #666 passed; Bitcoin Core regtest validation #17 passed. Full recipient acceptance and final security audit are not complete. Retail, production, mainnet, real hardware and broadcast remain untouched.
