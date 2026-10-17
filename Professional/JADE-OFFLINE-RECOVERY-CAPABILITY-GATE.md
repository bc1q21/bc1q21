# bc1q21 Professional — Jade offline recovery capability check
Date: 2026-10-17
Branch: professional/isolated-release-prototype
Status: product decision / BLOCKED pending new offline decrypt capability

## Confirmed device capabilities and evidence
Blockstream official Jade documentation:
- https://help.blockstream.com/blockstream-jade/use-jade-air-gapped/supported-air-gapped-functionality-via-qr
  Supported QR tasks include PSBT signing, address verification, seed/seedQR, multisig configuration, OTP and message signing. No arbitrary AES-GCM decrypt or retail child-private-key derivation API is listed.
- https://github.com/Blockstream/Jade/blob/master/docs/index.rst
  Jade RPC documents get_xpub, sign_message, PSBT signing, get_bip85_pubkey (RSA-only), BIP85-related methods. No general offline AES-GCM decryption service for data encrypted by retail bc1q21 is established.
- https://github.com/Blockstream/Jade/blob/master/CHANGELOG.md
  Firmware documents BIP85 entropy AES-encrypted QR export; this may be decrypted at its receiving endpoint. It does not establish a secure equivalent to retail m/84'/0'/0'/0/2 private-key-derived BC1Q21G1 decryption performed inside Jade.
- https://help.blockstream.com/blockstream-jade/add-more-security-functionality/use-jade-as-a-stateless-signing-device
  Jade can work statelessly with a recovery phrase restored into the signer on each session. The phrase must not be entered into any networked computer.
- https://help.blockstream.com/blockstream-jade/faqs/jade-security-model-faqs
  Jade PIN/blind-oracle and stateless options have distinct startup requirements; wallet seed backup remains the user's responsibility.

## Requirement reaffirmed by project owner
A gift recipient must be able to claim each of 24 annual releases independently, only by restoring the same gift's 12-word recovery phrase on a trusted offline signing device. The public online viewer may prepare the unsigned transactions and show public status but must NEVER receive the phrase, any BIP32 private child, WIF, or wallet-derived decryption secret. Existing retail recovery/discovery UX is the functional benchmark. No mandatory extra unrelated recovery phrase.

## Technical assessment
- We have validated PSBT QR signing against regtest Bitcoin Core. That proof DOES NOT prove device-side decryption or reconstruction of the retail schedule.
- Current retail format stores BC1Q21G1 first-date ciphertext encrypted with a password computed from private HD child /0/2. General PSBT/message signing is NOT interchangeable with exporting that child or decrypting on the device.
- Jade public RPC/QR documentation does not establish that the required decryption API is available. A firmware capability or alternative signer / trusted offline component needs empirical verification.
- Do not use BIP85 entropy export as an unsafe shortcut; decrypting it in the networked viewer would cross the explicit secrecy boundary.
- Publishing unencrypted complete schedules may violate retail gift privacy and is not an acceptable silent fallback.
- The prior recipient X25519 envelope works synthetically but requiring a second unrelated key backup is not the project's intended user experience.

## Next engineering gates
1. Public-only deterministic gift discovery proof: 1, 4, 24 gift outputs using xpub and original metadata, with no recovery words or secret values in the online component; explicitly identify which retail data remain unrecoverable.
2. Prototype a trusted offline recovery agent that could, given a 12-word wallet backup entered **only locally on an offline device**, decrypt retail BC1Q21G1 metadata. All tests must use synthetic fixture seeds and must not hand secrets to GitHub/ChatGPT/web pages.
3. Determine whether Jade firmware or another hardware wallet can implement that offline decrypt agent (or safely display recovered metadata while revealing no wallet keys); no unsupported Jade claims.
4. Recovery rehearsal from a **different device** using synthetic gift wallet seed, full public chain lookup, correct release date reconstruction, single release signing, and Bitcoin Core test; no real Bitcoin or retail modifications.
5. Retain explicit NO-GO for end-to-end recovery until hardware capabilities and independent restore demonstrated.

This checkpoint is documentation only. All four isolated hardware signing / Bitcoin Core regtest acceptance cases remain passed, but retail-equivalent gift discovery and offline encryption recovery remain unresolved.
