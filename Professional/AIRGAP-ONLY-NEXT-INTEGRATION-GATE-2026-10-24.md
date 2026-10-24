# Air-gap-only integration gate — retail remains the product specification

## Verified, not speculative

Retail source `Frontend/CryptoManager.js` derives the funding address at `m/84'/0'/0'/0/0`, recipient release destination at `m/84'/0'/0'/0/1`, and per-output CLTV keys at `m/84'/0'/0'/1/index`. Retail CLTV script is `<timestamp> OP_CHECKLOCKTIMEVERIFY OP_DROP <compressed pubkey> OP_CHECKSIG`.

The Professional public xpub derivation uses the same per-output BIP32 path and script form. Automated byte-format parity tests passed in GitHub Actions run 40121748302. This is code-level public-script parity, not independently reproduced mnemonic-to-xpub wallet-origin proof.

Physical Jade Plus already restored the disposable original 12-word wallet and signed the **first release of the same 24-output funded regtest gift** via unsigned PSBT QR and signed return QR. Independent signature validation and Bitcoin Core `testmempoolaccept` passed on October 20 (runs 39480906529 and 39481114223), with no broadcast. Do not repeat that physical acceptance test or describe it as still entirely unproven.

## One actual remaining compatibility blocker

Retail gift unlock derives an OP_RETURN decryption secret from the **private** BIP84 child `m/84'/0'/0'/0/2` and decrypts BC1Q21G1 date metadata in the browser. Professional's one offline signer must keep that private child and the original 12 words off the networked website. Jade's established QR PSBT-signing capability does not establish that it can perform this custom AES decryption and return only the resulting date.

The owner has approved Professional public release dates (Option B). This may allow **Professional-created gifts** to publish date metadata while preserving the retail-facing card and claim UX, but it is a **format/privacy compatibility change caused by the air gap**. It does not silently grant compatibility with older retail encrypted-date gifts. Do not claim the same encrypted gift bytes can be unlocked on Jade until demonstrated.

## Next single integration task

Use the existing first-of-24 funded gift and signed-QR fixture to define a strict **air-gap adapter** at retail's signing boundary: retain identical gift review, release destination, amounts, fees, locktime and output selection; replace only `signCltvReleaseTx` with exact unsigned PSBT QR -> Jade signed PSBT QR -> existing independent transaction checks. No new beneficiary form, fingerprint, candidate-selection procedure, second wallet or recovery words in the browser.

Before claiming one-device end-to-end parity, demonstrate the necessary public-date handoff for Professional-created gifts, and show how the restored hardware wallet's public key identity is matched to the gift's release scripts. The existing hardware signature is evidence of possession of the specific first-release key; it is not evidence that Jade can decrypt retail's OP_RETURN.

No retail/main/production edits, real funds, broadcast or new physical Jade session. Current status: air-gap release signing demonstrated for one gift output; retail-identical full gift lifecycle not yet demonstrated.
