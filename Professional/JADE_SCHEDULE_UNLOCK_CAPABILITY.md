# Jade Plus offline schedule-unlock capability assessment

Status: documentation review, not a hardware demonstration.

Retail requirement: reproduce current BC1Q21G1 OP_RETURN release-date decryption, which requires SHA256(private BIP84 child key m/84'/0'/0'/0/2 || ASCII bc1q21-opreturn-encryption-v1) as a lowercase-hex passphrase. Public xpub cannot compute it.

Blockstream documents Jade Plus QR support for SeedQR, public xpub export, address verification, PSBT signing, message signing, OTP, and multisig configuration. No documented QR feature found that performs arbitrary BIP32 private-child derivation followed by bc1q21-specific SHA256/PBKDF2/AES-GCM decrypt. This is **not** proof that no firmware/API path exists; do not claim capability without verifying exact implementation.

References:
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/supported-air-gapped-functionality-via-qr
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/add-jade-plus-to-an-air-gap-supported-app
- https://github.com/Blockstream/Jade/blob/master/docs/index.rst

Security decision:
- Do not export the child private key or its derived OP_RETURN passphrase to the online app. The latter is a reusable decryption capability for that gift wallet.
- Do not treat ordinary signed messages as equivalent to the existing retail encryption key.
- Keep Jade Plus as the current PSBT-signing candidate, but treat schedule unlock as a separate unresolved offline operation.
- A purpose-built offline companion is only a candidate, not an approved product change. It must reproduce current retail ciphertext decryption with disposable fixtures and transfer only the recovered schedule or verified public data to the online UI.
- No real seeds in source, CI, networked devices, or GitHub. No changes to retail/main, no broadcast.

Caveat: Blockchain locking data and publicly exported account xpubs can enable correlation or inference of candidate dates. Concealment of release dates in the gift UI is not a guarantee of absolute blockchain-level secrecy. Evaluate this explicitly before making privacy claims.

Next: validate exact decryption interoperability with a disposable seed entirely offline, then evaluate a viable air-gapped transfer and authentication protocol.
