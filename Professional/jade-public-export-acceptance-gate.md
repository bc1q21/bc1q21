# Jade Plus public-information export acceptance gate (Professional only)

**Status: PARTIALLY VERIFIED — public account export and child-key/fixture matching completed; independent fingerprint attestation, custom CLTV address verification and a funded regtest hardware roundtrip remain open.** Scope: isolated synthetic/regtest engineering, no real Bitcoin. Retail bc1q21 and `main` are out of scope.

## What has already passed
- Disposable Jade Plus Temporary Signer signed the synthetic PSBT by QR, and our offline receiver verified its signature.
- Offline finalization, fixed CLTV script checks and a separate Bitcoin Core regtest acceptance fixture passed.
- Public-only CLTV handoff, synthetic funding-output matching and unsigned PSBT preparation passed.
- A static read-only synthetic public-handoff HTML demonstration built successfully.

The isolated regression `jade-xpub-cltv-handoff.check.mjs` uses the previously captured disposable Jade account xpub and confirms that public-only derivation at `m/84'/0'/0'/1/10` produces the **same compressed public key** as the previously signed synthetic PSBT fixture. It also reconstructs the CLTV redeemScript and regtest funding address and checks unsigned PSBT signer metadata. This is a meaningful completed compatibility milestone. The xpub by itself **does not attest** its claimed origin path, master fingerprint or hardware wallet identity, and the previously signed fixture has a fabricated funding output rather than a Bitcoin Core-backed UTXO.

## Official Jade Plus capability and compatibility constraint

Blockstream documents **Options → Wallet → Export Xpub** in an active QR session, displaying an animated QR of an extended public key. Default Singlesig Native Segwit account path is `m/84'/0'/0'`; other QR export choices include `m/49'/0'/0'` and BIP48 multisig paths. These are standard wallet account export options, **not an explicit CLTV gift-wallet export feature**.

Official references:
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/add-jade-plus-to-an-air-gap-supported-app
- https://help.blockstream.com/blockstream-jade/faqs/which-xpub-export-settings-should-i-use
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/supported-air-gapped-functionality-via-qr

**Current compatibility status:** The saved disposable Jade xpub-derived child key **does match** the previously signed synthetic fixture at `m/84'/0'/0'/1/10` in an automated regression. The regtest CLTV script and funding address are reconstructed in software; the xpub itself uses a mainnet-format account serialization and does not independently attest wallet identity, master fingerprint or origin path. Standard BIP84 account export does not constitute hardware confirmation of a custom P2SH/CLTV gift address. An xpub is public but privacy-sensitive: sharing it exposes related addresses and transaction history.

## Historical acceptance sequence (do not repeat completed steps; remaining work requires separate approval)
1. Keep the disposable test wallet only. Do not create, enter, photograph, type, scan into the computer, or upload any seed phrase, SeedQR, WIF, private key, or xprv.
2. **Completed in earlier experiments:** Jade Plus Temporary Signer and xpub export were exercised. Do not reset or initialize a new wallet merely to repeat this.
3. **Completed:** Options → Wallet → Export Xpub was confirmed; Single Sig, Native SegWit, account 0, `m/84'/0'/0'`. Animated public export QR was captured and decoded in earlier experiments. Do not request another scan without a specific new purpose.
4. **Partially completed:** public-only xpub child derivation and match against the saved Jade-signed fixture are covered by `jade-xpub-cltv-handoff.check.mjs`; independent fingerprint/origin attestation remains open.
5. **Partially completed:** xpub input validation rejects malformed/private extended-key material, wrong account-level metadata and unsupported child indices; do not equate this with a complete audited animated-QR decoder or hardware origin proof.
6. **Remaining:** obtain independently verified wallet fingerprint and origin metadata if supported by the hardware, and reconcile against the already matched child key and reconstructed CLTV address. Do not rescan public QR merely to reproduce a completed test.
7. **Remaining:** establish whether Jade can independently display/verify the custom CLTV locking-script address. If unsupported, record a production hardware-verification gap; a standard BIP84 receive address is not equivalent.

## Acceptance conditions (partial; not all met)
- Proven export source and exact derivation path; public child key matches signer metadata.
- Reconstructed CLTV script and funding address match independently.
- No seed/private material reaches Professional application or browser.
- Unexpected QR payloads and wrong network/path fail closed.
- No actual Bitcoin funds, broadcast, deployment, or retail changes.

**Production blockers not resolved by this gate:** actual mainnet funding and UTXO verification, multi-release schedule, offline recipient recovery across decades, key/seed handover and hardware-independent redemption, signer approval of custom CLTV scripts, fee/UTXO policy, independent security review. Do not claim this gate proves those capabilities.
