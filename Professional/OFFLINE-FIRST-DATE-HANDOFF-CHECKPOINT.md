# bc1q21 Professional — offline first-date handoff checkpoint
Date: 2026-10-17. Branch: professional/isolated-release-prototype. DO NOT DEPLOY.

## Completed
CI run 39059260937 validated Professional/offline-first-date-handoff.mjs and
Professional/test-offline-first-date-handoff.mjs against the actual retail
AESHelper.js module, using entirely synthetic test password/ciphertext.
A locally decrypted fictional first-date can be reduced to a public metadata
handoff containing only protocol version, regtest network, challenge,
gift commitment, first release date, and result marker. No wallet-derived key
or recovery words need to be part of the handoff format.
The test rejects wrong passwords, tampered ciphertext, wrong network,
wrong challenge, unexpected fields, and invalid calendar dates.

## CRITICAL unresolved authenticity issue
A challenge echoed by an untrusted offline-return message is NOT proof of
device provenance or recipient wallet ownership. The validator demonstrably
accepts a substituted but structurally valid first date. Before any live
claim, the recipient page MUST validate the claimed date by rebuilding
canonical CLTV scripts from wallet-derived **public** keys and checking them
against actual funded Bitcoin outputs, with the correct gift identity and
transaction commitments. An offline component must also attest its recovery
result through an authenticated mechanism that cannot be forged by the
browser/QR relay. A general Jade message signature alone DOES NOT establish
the date was actually decrypted on Jade.

## Hardware gap
Documented Jade offline QR supports PSBT signing and public xpub export,
but no demonstrated device-internal operation for the exact retail
BC1Q21G1 AES-GCM first-date decryption using m/84'/0'/0'/0/2 private-child
material. This remains a hard NO-GO. Do not transmit a wallet-derived
decryption secret over QR to a web page or use BIP85 export as a workaround.
A separately evaluated offline component or appropriate hardware/firmware
capability might be required. The project owner requires the SAME gift
12-word wallet backup, not a second unrelated recovery phrase.

## Next acceptance test
1. Use only public data from real funded regtest test gifts and synthetic
   first-date handoffs; test correct date and altered-but-valid date against
   wallet-public-derivation CLTV script commitments. Fail closed when a
   purported date cannot reconstruct the actual funded output scripts.
2. Never label a date as device-authenticated merely because script checks
   match: real wallet restore and trusted offline decryption are separate.
3. Determine hardware support before attempting actual Jade date decryption.
4. Keep recipient page based on gift card QR/deep link and leave seed entry
   out of the browser. Do not alter retail or any production configuration.
