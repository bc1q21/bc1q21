# bc1q21 Professional - signing architecture checkpoint
Date: 2026-10-28
Scope: Professional development branch only. No changes to live Retail.

## Confirmed in Retail source
- Frontend/CryptoManager.js derives browser-held keys, including the initial funding key and distinct CLTV child keys. It constructs time-locked P2SH addresses from release dates.
- Frontend/bc1q21-h08.js startDistributionPipeline() waits for funded UTXOs, builds the gift outputs, then calls TransactionManager.buildAndSignDistribution() using the funding WIF.
- Frontend/TransactionManager.js signs the funding-to-CLTV distribution and separately supports buildAndSignRelease() for the later beneficiary release.
- The signed distribution is broadcast via the backend Bitcoin-node pathway. bc1q21 must never receive seed words or private keys.
- The existing Professional Jade QR page is a regtest diagnostic, not gift-specific signing.

## Approved Professional direction
1. Keep the familiar Retail gift-planning, review, deposit, and finish experience, but isolate Professional implementation from Retail production.
2. The animated Jade Plus signing QR belongs AFTER the deposit is known and the actual funding-to-CLTV distribution transaction can be constructed. A signature cannot be finalized before the input UTXOs, outputs and fees are known.
3. Signing page: normal header, short Jade instructions, large animated QR, button to scan Jade's returned QR, camera scanning, and local cryptographic verification. No technical xpub, locktime or script diagnostics visible to customers.
4. A button click or completed QR scan is NOT proof of authorization. Verify the actual gift-specific transaction signatures. Do not advance to completion without verification; invalidate approval if transaction inputs, outputs or fees change.
5. The beneficiary independently signs a separate matured CLTV release transaction later, with appropriate long-term access to the required keys and gift records.
6. All gift planning, scripts, sensitive data, signing transport and verification occur locally in the user's browser/Jade. No bc1q21 gift database, server-side seed storage or custody. Only signed raw transaction broadcasting and necessary public chain lookups involve network services.

## Engineering gates before live functionality
- Reconcile exact Retail CLTV derivation paths, public keys and redeem scripts with Jade public-only derivation capabilities.
- Determine Jade Plus air-gapped supported QR/PSBT protocol and map deposit signing and beneficiary release separately.
- Build gift-specific unsigned distribution PSBT only once actual UTXOs are known, and verify returned signatures against the approved gift.
- Define safe error/retry, recovery, beneficiary key handoff and signing-device compatibility.
- Use isolated regtest/testnet verification and independent security review before real funds or production deployment.

Current state: planning-to-Jade prototype handoff works; local fixed-price preview works; real Jade distribution signing, gift-specific signature verification, Add Funds and Finish integration are NOT complete.
No real BTC transactions, signing, funding or broadcasting enabled by this document.
