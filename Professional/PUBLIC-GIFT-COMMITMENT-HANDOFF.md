# Professional public gift commitment — creator-to-recipient handoff (regtest prototype)

## Purpose
A recipient needs an independently retained reference for the exact gift before trusting release details shown by a website. The public fingerprint is a SHA-256 commitment to the funding transaction ID and ordered release-output indices, amounts, and locking scripts, using the versioned `bc1q21-professional-gift-binding-v1` encoding.

## Creator handoff
After the regtest gift's public funding details are established, generate the public commitment notice using `createPublicGiftCommitmentNotice(binding)`. Share the **64-character public fingerprint** with the recipient through a separately chosen, already trusted channel (for example, directly in person or an independently verified message). The gift link and fingerprint can be shared together, but a fingerprint copied from the same untrusted website being verified is not an independent check.

The fingerprint is **not secret** and is **not** the gift's recovery words. The creator transfers the original 12 recovery words separately and privately under the established bc1q21 gift process. Never put recovery words in a public gift notice, repository, browser telemetry, QR signing payload, or test fixture.

## Recipient check
The recipient retains the creator-provided fingerprint independently. Before approving a release, compare **all 64 hexadecimal characters** against the locally computed fingerprint of the gift's complete public binding. Any missing, altered, or mismatched character stops the release review. The Professional local Core-backed review requires an `expectedBindingDigest` supplied independently from the gift binding.

## Limits and next acceptance work
This protects against later tampering only when the recipient obtained the reference through an actually trustworthy independent channel. It does **not** cryptographically authenticate the creator, establish beneficiary identity, prove the creator's original intent, or authorize signing. Neither the notice nor a successful comparison unlocks QR export, Jade signing, or broadcasting.

Before production consideration: specify and test a trustworthy creator-to-recipient provenance model, confirm full 24-release public commitment against original creation data, and complete a real regtest node plus controlled Jade beneficiary acceptance. Retail and production remain unchanged.
