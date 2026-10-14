# Offline schedule-unlock compatibility gate

Status: design gate; no hardware capability claim and no retail change.

## Exact retail behavior (read-only code review)
- Public gift preview shows gift metadata and the count of locked outputs, but not individual release dates.
- Gift OP_RETURN stores an encrypted first release date. Unlock derives wallet keys from 12 BIP39 words and decrypts that first date, then discovers the interval and validates all CLTV output addresses.
- Current gifts use the BC1Q21G1 AES-GCM format (PBKDF2-SHA256, 100000 iterations); legacy gifts use Salted__ AES-CBC.
- The current decryption passphrase is SHA256(private child key at m/84'/0'/0'/0/2 concatenated with UTF-8 label bc1q21-opreturn-encryption-v1), represented as lowercase hex. Legacy decryption uses the corresponding public address as passphrase.
- New gift CLTV child paths are m/84'/0'/0'/1/{index}, and release dates are represented as Unix timestamps. The current isolated Professional prototype now accepts timestamp CLTV in its public handoff and Jade xpub derivation.

## Unresolved hardware requirement
A public xpub cannot reproduce the private-key-derived current decryption passphrase. PSBT signing also does not by itself reveal that passphrase. Before claiming retail-equivalent schedule unlock, prove a supported air-gapped mechanism can derive the correct private-key-dependent secret and decrypt the current OP_RETURN ciphertext **without exposing the mnemonic, private child key, or equivalent wallet-wide secret to the online browser**.

A generic signature-based challenge does not reproduce the existing deterministic passphrase. A newly encrypted Professional format would change gift compatibility and must not be silently substituted.

## Security and compatibility acceptance
1. Preserve public pre-unlock information and hide dates, including in API payloads and QR contents.
2. Demonstrate exact current-format decrypt using disposable fixture keys and ciphertext in an offline-only test environment.
3. Demonstrate legacy gift recovery separately if Professional is expected to open historical retail gifts.
4. Authenticate the selected gift against derived Bitcoin outputs before trusting its schedule.
5. Verify the air-gapped device supports the exact required operation; do not assume Jade Plus supports arbitrary private-key derivation or AES decryption through its QR interface.
6. Explicitly define what nonsecret information crosses the air gap. Release dates themselves can become visible to the beneficiary after authorization, but do not transfer wallet secrets.
7. Do not enter real seed words into connected devices, put them in CI, or commit them.
8. Keep all work on professional/isolated-release-prototype. No retail/main changes, no broadcasts.

## Next decision
Determine whether the current Jade Plus firmware/QR workflow supports a compatible offline derivation/decryption operation. If not, evaluate a purpose-built fully offline companion with explicit hardware and recovery threat modeling. This is a capability gate, not an approved design change.
