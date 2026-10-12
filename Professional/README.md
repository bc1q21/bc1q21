# bc1q21 Professional — isolated release prototype

Status: engineering design / NOT deployed / NOT production-ready.

## Isolation rules

- All Professional experiments live under `Professional/` on the `professional/isolated-release-prototype` branch.
- Do not edit retail `Frontend/`, `Backend/`, `Website/`, `Offline/`, deployment workflows, or production configuration.
- Do not merge to `main` or manually run production deployment.
- No real Bitcoin, production recovery words, private keys, or the owner's original Jade wallet in prototype testing.
- Treat signed PSBTs as sensitive transaction authorizations; never automatically broadcast a scanned QR.

## Existing code assessed

- `Frontend/TransactionManager.js` has `buildAndSignRelease({utxos, outputs, wif, locktime})`. It constructs legacy P2SH CLTV inputs and sets non-final sequences, but **requires a WIF private key and signs/finalizes immediately**. This is reference code, not a function Professional can call unchanged.
- `Frontend/CryptoManager.js` and `Frontend/CryptoUtils.js` implement current CLTV script and derivation conventions. Reuse script formats after independent checks; do not copy private-key handling into Professional.
- `Frontend/gift/gift-h08.js` handles the current recipient flow; do not modify it for this prototype.
- `Frontend/static/modules/btc-signer.js` bundles `@scure/btc-signer`, with Transaction and PSBT functionality. Assess API/version and hardware interoperability in isolated tests before selecting an implementation.

## Phase 1: unsigned PSBT builder (next implementation)

**Input:** network; explicit funding transaction hex (legacy nonWitnessUtxo); output index; expected prevout amount and P2SH scriptPubKey; CLTV redeemScript; BIP32 public key, master fingerprint and complete derivation path; locktime; recipient destination and amount; explicit fee policy.

**Checks before construction:**
1. Reject missing/invalid fields, negative or unsafe satoshi values, malformed txids, nonstandard locktimes, mixed block-height/timestamp locktime types, and final sequences.
2. Parse and verify funding transaction's actual txid, referenced output index, amount, and P2SH scriptPubKey. **Never** trust caller-provided prevout metadata without matching funding bytes.
3. Parse redeemScript as the intended `<locktime> OP_CLTV OP_DROP <compressed pubkey> OP_CHECKSIG` template. Verify script hash against funding P2SH output; verify public key and derivation metadata match the intended signer. Confirm locktime is not below the script requirement.
4. Use legacy `nonWitnessUtxo`, not a fabricated `witnessUtxo` substitute. Set transaction version 2, suitable non-final sequence, and explicit nLockTime.
5. Verify destination network, output values, fee calculation, dust/relay policy and recipient address. Never silently change destination or fee.
6. Encode PSBT v0 with correct input redeemScript and BIP32 public derivation metadata, and unsigned transaction. No private keys and no signing operation.
7. Decode the serialized PSBT again and independently assert all security-critical fields.

**Output:** PSBT bytes/base64 and a human-readable immutable transaction summary; do not broadcast.

## Phase 2: QR handoff and signed PSBT acceptance

- Animate PSBT as Jade-compatible `ur:crypto-psbt` frames; document interoperability and framing limits.
- Capture/decode returned signed PSBT without exposing seed words.
- Reject mismatched unsigned transaction, outputs, fee, locktime, outpoints, redeemScript, derivation or unexpected extra inputs/outputs.
- Verify the ECDSA signature against the correct legacy P2SH sighash and expected public key. Do not equate device display with independent verification.
- Finalize correct legacy P2SH scriptSig, independently verify Bitcoin script execution and policy acceptance, then require explicit user authorization before any broadcast.

## Phase 3: real network acceptance

- Use isolated signet/regtest funds, independently inspect final transaction, run Bitcoin Core `testmempoolaccept`, broadcast only to the chosen test network, and verify confirmation and negative tests.
- Do not claim production readiness based on the prior synthetic Jade signature test.

## Previous handover's successful synthetic signing reference

Jade Plus firmware 1.0.41 accepted corrected synthetic PSBT v0 via animated QR and returned a signed PSBT QR. Previous test used a fake 100,000-sat input, 99,000-sat output, 1,000-sat fee, locktime 110, and a disposable signer. This demonstrates signing interoperability, **not** final script execution or broadcast. The signed PSBT artifact should be independently rechecked when available; do not recreate or assume its bytes.

## First implementation acceptance criteria

- Deterministic, offline fixture produces a valid PSBT v0 with **no signing secrets**.
- Round-trip decode confirms all transaction fields and signer metadata.
- Tampered funding tx, wrong prevout, wrong redeemScript, wrong public key, invalid locktime, final sequence, destination/network mismatch, fee underflow and malformed amounts all fail closed.
- Test output is reproducible without the live website, Bitcoin mainnet, or hardware device.
