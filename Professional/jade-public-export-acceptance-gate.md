# Jade Plus public-information export acceptance gate (Professional only)

**Status: PREPARED — NOT YET EXECUTED WITH JADE.** Scope: isolated synthetic/regtest engineering, no real Bitcoin. Retail bc1q21 and `main` are out of scope.

## What has already passed
- Disposable Jade Plus Temporary Signer signed the synthetic PSBT by QR, and our offline receiver verified its signature.
- Offline finalization, fixed CLTV script checks and a separate Bitcoin Core regtest acceptance fixture passed.
- Public-only CLTV handoff, synthetic funding-output matching and unsigned PSBT preparation passed.
- A static read-only synthetic public-handoff HTML demonstration built successfully.

These tests do **not** prove that Jade exported a public key matching our prototype's script and derivation path. The earlier Jade-signed fixture had a fabricated funding output and is not a funded-chain transaction.

## Official Jade Plus capability and compatibility constraint

Blockstream documents **Options → Wallet → Export Xpub** in an active QR session, displaying an animated QR of an extended public key. Default Singlesig Native Segwit account path is `m/84'/0'/0'`; other QR export choices include `m/49'/0'/0'` and BIP48 multisig paths. These are standard wallet account export options, **not an explicit CLTV gift-wallet export feature**.

Official references:
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/add-jade-plus-to-an-air-gap-supported-app
- https://help.blockstream.com/blockstream-jade/faqs/which-xpub-export-settings-should-i-use
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/supported-air-gapped-functionality-via-qr

**Unresolved compatibility:** The previously signed synthetic PSBT used a particular compressed public key and a derivation path `m/84'/0'/0'/1/10`. Do not assume the test wallet's Jade export produces that same public key or that the QR export path/network can reproduce the regtest fixture. Standard BIP84 native-Segwit account exports do not themselves describe our custom P2SH/CLTV locking script. A derivation scheme, network selection, fingerprint and signing metadata must be matched and verified. An xpub is public but privacy-sensitive: sharing it exposes related addresses and transaction history.

## Next acceptance sequence (one step at a time, after user approval)
1. Keep the disposable test wallet only. Do not create, enter, photograph, type, scan into the computer, or upload any seed phrase, SeedQR, WIF, private key, or xprv.
2. Confirm the Jade Plus session is the same **Temporary Signer** test wallet used in the successful signing exercise. Do not reset or initialize a new wallet.
3. Locate **Options → Wallet → Export Xpub** if this option is available in that session. Record only the *menu options and derivation path displayed*; do not yet scan or send the QR to the website.
4. Confirm supported export format, network, account path and how a child compressed public key can be derived without secrets. Determine whether the resulting signer metadata can match a future CLTV PSBT.
5. Only after review, build a local-only, constrained decoder and test with **synthetic** xpub fixtures first; reject secret QR types, unexpected fields, malformed encodings and incompatible network/path. Never submit wallet data to external web services.
6. Have the user approve an explicit **public-only** QR export scan. Verify the fingerprint, path, derived child key, redeemScript, and resulting funding address independently before any funding workflow.
7. Verify a *Jade-displayed address* when the hardware supports verifying the custom locking-script address. If unsupported, record the hardware verification gap as a blocker for production; do not substitute verification of a standard BIP84 receive address for verification of a CLTV address.

## Acceptance conditions
- Proven export source and exact derivation path; public child key matches signer metadata.
- Reconstructed CLTV script and funding address match independently.
- No seed/private material reaches Professional application or browser.
- Unexpected QR payloads and wrong network/path fail closed.
- No actual Bitcoin funds, broadcast, deployment, or retail changes.

**Production blockers not resolved by this gate:** actual mainnet funding and UTXO verification, multi-release schedule, offline recipient recovery across decades, key/seed handover and hardware-independent redemption, signer approval of custom CLTV scripts, fee/UTXO policy, independent security review. Do not claim this gate proves those capabilities.
