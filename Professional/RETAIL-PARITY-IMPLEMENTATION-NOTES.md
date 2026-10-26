# Retail parity implementation notes

Professional is a Retail-equivalent user experience with offline Jade Plus signing. Retail reference files are read-only.

## Confirmed from Retail source

- `Frontend/index.html`: bc1q21 logo, Gifting Wizard, four steps Plan / Recovery / Add Funds / Finish, blue section header and white content card.
- `Frontend/NavigationManager.js`: scheduling and step transitions, with funding after recovery.
- `Frontend/gift/gift-h08.js`: recipient gift lookup and recovery flow.
- Retail release signing uses `TransactionManager.buildAndSignRelease` and must be replaced by an independently verified unsigned PSBT, offline Jade signing and signed QR return.

## Do not conflate transactions

Gift funding and spending a mature release are separate transactions. The existing Professional Jade camera verifier checks a fixed disposable regtest release transaction. It cannot authorize an unrelated new gift or unlock its funding.

## Next work

Mirror the real Retail planner, validation, gift card and recipient link without changing Retail. Establish whether any creator-side transaction needs hardware signing. Bind Jade's returned signature to the exact selected release, output, fee and destination. Keep the existing 12-word phrase offline in a single hardware wallet. Do not add recipient fingerprints or second wallets.

Status: integration planning only, not full parity or production acceptance. No real Bitcoin or broadcast.

## Owner-confirmed two-phase Professional flow (2026-10-26)

**Creation / funding:** Creator enters gift amount and schedule in the Retail-equivalent planner (e.g. $2,000 across five future releases). Professional must obtain and verify the necessary public wallet derivation information from the offline Jade Plus through a supported QR exchange, then construct the exact time-locked scripts and funding addresses. Display and fund only after script and schedule checks. This is **not** a recipient release-spend signature. Whether Jade supports the needed public-key exchange and derivation remains a test gate, not an established fact.

**Mature release:** Recipient opens the original gift link. After gift/output/maturity checks, the website prepares a gift-bound unsigned spend PSBT; Jade signs offline and returns animated signed QR; the website verifies the exact transaction, signer, destination and fee before any separately approved broadcast and TXID display. One offline wallet and its original backup phrase; never enter seed words in the website.

**UX:** Both phases preserve the existing Retail wizard, card, link, navigation, header/footer and recipient experience. The camera/QR interface is the only hardware-specific addition. Do not move the existing fixed-regtest release-spend verifier into the creation phase as proof of gift funding approval.
