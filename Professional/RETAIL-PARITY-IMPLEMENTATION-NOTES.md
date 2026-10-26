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
