# Professional retail-signing boundary map

Owner scope: preserve retail gift creation, link, card, release dates and recipient experience. Only the air-gapped signing boundary changes. No new recipient fingerprint or second wallet.

## Read-only retail source trace

`Frontend/gift/gift-h08.js`:
- `loadGiftFromAddressTxs` fetches address transactions and collects OP_RETURN plus P2SH candidates without relying on API ordering.
- `unlockGift` imports 12 recovery words into `CryptoManager`, checks `cm.fundingAddress === this.fundingAddress`, and uses the mnemonic-derived decryption keys to recover the first release date. It checks derived CLTV release addresses against candidate outputs and determines interval.
- `TransactionManager.buildAndSignRelease` signs the prepared CLTV spend with WIF inside the browser. This is the exact signing operation that Professional must replace with unsigned PSBT, QR handoff, offline signature and signed QR return.

## Air-gap compatibility gaps, not new product features

A. Retail funding-address equality and OP_RETURN decryption currently require mnemonic-derived values in the browser. Professional website must not receive the mnemonic. Its approved public-date model changes the metadata transport, but public dates do not prove wallet ownership.

B. The current Professional `jade-xpub-cltv-handoff.mjs` derives CLTV scripts from an account xpub and an externally supplied four-byte master fingerprint. That fingerprint is a BIP32 key-origin identifier, **not** the rejected 64-character gift-binding fingerprint. The xpub and origin fields are public metadata and do not prove that the offline signer actually controls the corresponding private keys. A wallet-side public-key export or signed proof via supported QR is a potential technical route, but remains unverified.

C. The current Professional `recipient-offline-signing-step.mjs` is a disabled UI fragment. It does not prove that Jade can import the exact retail wallet derivation, interpret the custom CLTV P2SH PSBT and return a valid signature without a second wallet or device.

D. Retail's wallet derivation and script conventions must be compared byte-for-byte to Professional's `m/84'/0'/0'/1/index` xpub-derived CLTV scripts. Do not assume they are identical just because both use 12 words. In particular, check retail legacy versus per-index modes and its BIP39 path, and whether the signer supports the required nonstandard P2SH redeem script.

## Next implementation gate

1. Establish exact derivation/script parity with retail using public disposable fixtures.
2. Determine from existing signer capabilities whether the offline QR interface supports required public key verification and CLTV PSBT signing; no physical Jade test without owner authorization.
3. Only then connect the already-tested isolated PSBT QR pipeline to the unchanged retail-like recipient workflow. Do not attach separate fingerprint/candidate experiments as beneficiary steps.
4. Fail closed if the same original 12 words cannot restore the signing keys in the single offline signer. Escalate a concrete blocker instead of redesigning the experience.

No retail/production changes, no mainnet, no broadcast, no physical hardware action.
