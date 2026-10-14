# Professional offline schedule trust boundary

Status: security design gate, not a hardware integration or production authorization.

## Distinct proofs
1. Bitcoin output matching: independently recomputing each CLTV P2SH output from a publicly supplied account xpub and schedule establishes *script consistency*. It does not establish ownership of that xpub, funding transaction authenticity, or seed possession.
2. Fresh challenge: nonce plus transaction/output commitment prevents accidental substitution and cross-gift response reuse. The file-backed claim-once store rejects repeated nonce claims across instances on a correctly configured local filesystem. It does not authenticate the respondent.
3. Pinned response identity: verifying an Ed25519 signature establishes possession of the signing identity corresponding to a separately trusted public key. It does not prove the signer holds the gift recovery seed, decrypted OP_RETURN, or obtained human consent.
4. Authorized private unlock: must be proven by an offline component that derives the *actual* retail wallet secret, authenticates the selected gift, decrypts the first date, validates the schedule, and requires explicit local user approval before emitting date information. No such device capability has yet been demonstrated.
5. Wallet recovery and Bitcoin spend authorization: separate from schedule reveal. Jade PSBT signing requires its own hardware/user approval; a schedule-return signature is not a Bitcoin spend signature.

## Provisioning and threat constraints
- A self-declared QR public key is **not pinned**; do not trust a key supplied in the same untrusted response.
- The public key must be provisioned and verified via a separate, user-approved trust channel. Device key rotation/replacement must require deliberate re-enrollment and must not silently accept an arbitrary replacement.
- A malicious online browser can supply a false gift transaction, dates, or outputs. The offline side must display enough gift identity and release details for meaningful approval, and verify against authenticated source data where possible.
- The online verifier cannot infer that a user touched the offline device merely from a valid signature. The offline signing policy, tamper resistance, and device identity enrollment must be established separately.
- A nonce store only protects the instance(s) sharing that store. It does not prevent disclosure if an attacker controls the online page or can read a previously revealed schedule.
- Do not transfer BIP39 recovery words, xprvs, derived wallet-private AES passphrases, or wallet-private keys to the connected browser.
- Once authorized dates cross the air gap, the online application and anything observing its UI have access to them; they are not cryptographically private from that application.
- The current Ed25519 test keys are ephemeral synthetic fixtures; no Jade capability is implied.
- Existing retail gift ciphertext must remain compatible; do not replace the private-key-derived AES secret with a signature challenge and claim backward compatibility.

## Engineering gate before recipient UI
A working offline implementation must demonstrate current and legacy retail decryption with disposable fixtures, independently verified key enrollment, human-approved schedule release, authentic gift selection, a complete nonce-bound signed response, and negative tests for substitution, replay, incorrect seed, and untrusted key rotation.

The Professional branch remains isolated; no retail/main changes, live Bitcoin, broadcasts, or real seed words.
