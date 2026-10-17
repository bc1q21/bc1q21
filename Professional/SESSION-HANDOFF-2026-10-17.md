# bc1q21 Professional — authoritative end-of-day handoff
**Date:** 2026-10-17
**State:** SESSION CLOSED / RESUME FROM THIS FILE. No work in background.
**Repository:** `bc1q21/bc1q21`
**ONLY permitted branch:** `professional/isolated-release-prototype`
**Scope:** `Professional/` and `.github/workflows/professional-*.yml`. Retail `main`, the production website, deployed systems, Start9, mainnet and real Bitcoin were NEVER part of these tests.
**Project branding:** always **bc1q21** lowercase.

## Read this first tomorrow — concise decision
**Original air-gapped signing feasibility is PROVEN.** Blockstream Jade Plus physically reviewed/signed four distinct disposable P2SH/CLTV Bitcoin regtest release PSBTs by animated QR; their signed transactions were independently checked, rejected as non-final before the locktime, and accepted by Bitcoin Core 28 at maturity. We do **not** need to repeat those four physical scans. Separate isolated tests also funded a **single 24-output regtest transaction**, and checked all 24 public scripts against wallet-derived public keys. We have not signed all 24 as a batch, nor completed one integrated creator → recipient UI → hardware → chain lifecycle.

### Owner's FINAL authoritative product / UX requirements (supersede older exploratory wording)
1. Retail and Professional should use **ONE familiar gift-specific recipient page** wherever technically and securely practical. The recipient receives a gift card with QR/link to their specific gift (retail style `/gift/<funding-address>` or `?a=<address>`), **NOT the homepage or a generic dashboard**. A separate Professional page is acceptable **only if genuinely needed** for engineering/security. Current isolated standalone recipient HTML prototypes are temporary testing fixtures, **NOT a product decision to add a second page**.
2. **Before unlocking:** The recipient page may show public/general information (gift amount, how many releases, etc.), but **individual release dates / full schedule MUST remain hidden**, exactly as retail works. A public xpub or on-chain output alone must **not** unlock/show those dates in the final design.
3. **Retail unlock:** Beneficiary enters their existing 12-word gift wallet recovery phrase on the retail gift-specific page. After validation, actual release dates become visible, and matured releases can be claimed. **Do not change this retail behavior in Professional tests.**
4. **Professional unlock:** On that **same page ideally**, offer a distinct **Unlock with offline hardware wallet / Jade** option instead of having the Professional recipient type 12 words into Brave. A QR exchange must enable the trusted offline wallet to authorize recovery of the private schedule **without exporting seed words, child private keys or wallet-derived AES password into the online webpage**. Actual secure Jade schedule unlocking is **NOT YET IMPLEMENTED OR PROVEN**. Do not claim merely signing a PSBT or exporting an xpub unlocks hidden dates.
5. **When claiming:** On each maturity, recipient uses Jade to review/sign **that one release** offline and return signed PSBT QR for verification/broadcast. Example: 24 annual releases → one authorized release per year; do **not** require signing all 24 again annually.
6. **ONE original gift's 12-word wallet backup**, no mandatory second unrelated recovery phrase or secret. The owner expects that the same 12 words can restore recipient authority on replacement offline hardware.
7. Creator-side UX ambition: ideally transmit a whole 24-release gift in **one animated QR session** and sign conveniently; whether Jade supports accepting/signing a **batch** of PSBTs in one operation is **UNPROVEN**. Existing Jade hardware tests signed one release PSBT at a time. QR scan and approval/signing are separate questions; never imply one QR scan automatically signs 24 PSBTs.
8. Project split: existing **retail** remains stable, Professional is a **future separately developed stronger architecture**. No merges, production deployments or mainnet until explicit owner authorization and independent security review.
9. User handles only hands-on hardware QR scans/uploads when needed. **Assistant handles all GitHub code, workflows, fixes, CI checks, documentation, logs.** Don't repeatedly ask user to download files, run commands or duplicate pilots. Avoid more tangential research/tests: focus on missing *integration* and *hardware capability*.

## Confirmed physical Jade hardware and Bitcoin Core results — DO NOT REPEAT
- Device: Blockstream Jade Plus, **air-gapped animated BC-UR `crypto-psbt`** scanning from offline HTML and signed QR return via local webcam to .txt. Signing wallet public fingerprint `e29ac13c`; release signing derivations `m/84'/0'/0'/1/0` through `/1/3`. No actual wallet phrase disclosed.
- Four separate real funded disposable regtest CLTV outputs on original saved chain height **121**, amounts **12,000 / 15,000 / 18,000 / 21,000 sats**. Destination payouts **11,000 / 14,000 / 17,000 / 20,000 sats**, each 1,000-sat fee. CLTV heights **130 / 140 / 150 / 160**.
- Original saved chain/unsigned PSBT artifact: run **39048374200**, `professional-four-jade-public-unsigned-regtest`.
- Four-release offline animated QR generator: run **39049609869**, artifact `professional-four-jade-offline-bcur-review`.
- **Release 1** Bitcoin Core verification green **39051477566**.
- **Release 2** Bitcoin Core verification green **39052501320**. Earlier QR transcription checksum issue was FIXED; do not re-capture.
- **Releases 3 and 4** together Bitcoin Core verification green **39053883952**. All before-maturity rejections and at-maturity accepts checked. No broadcasting real coins.
- This demonstrates **isolated offline CLTV transaction signature feasibility**, NOT a complete shipping Professional web app, batch signer, private date recovery or authorized gift-card discovery.

## Other isolated PASS evidence — retain, DO NOT redo without a specific new defect
- Retail BC1Q21G1 first-date AES envelope format synthetic check: **39055409173**.
- Synthetic encrypted 1/4/24-release recovery envelope: **39055655546**. This was an architecture exploration, not Jade-compatible recovery.
- Synthetic X25519 recipient-key encryption/recovery: **39055843289**. **NOT DEFAULT PRODUCT DESIGN**, because a separate unrelated backup violates owner's one-12-word expectation.
- Retail gift-specific recipient mockup static safety: **39056766616**; prototype contains disabled Jade signing control, not production UI.
- Independently confirmed four original saved-chain funded public outputs: **39056955199**; public-only offline viewer: **39057063038**.
- Gift link parsing and ambiguous public candidate checks: **39057219098**. Candidate alone is *not authenticated*.
- Synthetic P2SH CLTV script/transaction candidate binding for 1/4/24: **39057476069**.
- Public account xpub child derivation and CLTV script binding for 1/4/24: **39057790807**; synthetic public-only 24-release recipient mockup: **39058043711**.
- Funded **one transaction with 24 separate P2SH CLTV outputs** on real Bitcoin Core disposable regtest: **39058443825**. Outputs confirmed unspent, public funding input traced, BUT not a retail-compatible gift or true ownership proof. Bitcoin Core may reorder outputs; the test was corrected to locate actual `vout` by matching scripts.
- Bound the funded 24 outputs to deterministic public signing keys and rendered a recipient review: **39058700501**.
- Disposable 12-word wallet software restoration reproduces xpub and 1/4/24 public child keys: **39058861799**. **NOT** physical Jade restore and DOES NOT unlock encrypted metadata.
- Actual retail `Frontend/AESHelper.js` encryption used with *non-wallet strings* and roundtrip/wrong key/tamper cases: **39059062424**.
- Minimal first-date offline software handoff synthetic: **39059260937**. A structurally valid substituted date can pass a schema check: source authentication remains unproven.
- Public date-to-CLTV script check rejects wrong dates for 1/4/24 synthetic annual schedules: **39059457884**.
- Actual retail monthly/annual calendar behavior tests: **39059675067**, plus public script agreement for leap day/month-end/24 releases: **39059734269**. Retail `Date.UTC` semantics roll leap-day next anniversary to March 1, and monthly January 31 can roll into March. Earlier strict Professional `annualSchedule()` diverges; do not silently replace retail semantics.
- Synthetic fail-closed release readiness checklist: **39059929001**. **NOT wired into deployed UI and Boolean claims are NOT cryptographic evidence**.
- An exploratory public xpub date-search source addition was blocked and **NOT successfully tested/committed**; do not claim it is operational.

## The three focused open engineering tasks — NEXT WORK, IN ORDER
**A. Creator-side multi-release UX / batch capability.** Create a realistic isolated gift construction/signing workflow for 24 releases, then determine via firmware evidence/controlled test whether one animated QR input can carry/sign several PSBTs and what approvals Jade requires. A 24-output Bitcoin funding tx is **not** the same as 24 release PSBTs or one batched signing scan. Never promise batch signing until proven.
**B. Complete gift-specific recipient integration.** Keep **one existing-style recipient page** as target (or separate only if required): before unlock show amount/count but NOT release dates. Prove one release from gift card link → public candidate/funding validation → authorized unlock → correct mature unsigned PSBT → Jade signing QR → independently validate returned signed PSBT → Bitcoin Core acceptance. Existing tests cover pieces but **NOT assembled end-to-end UI**.
**C. Private schedule unlock with same original 12 words.** Retail `Frontend/CryptoManager.js` derives first-date decryption password as `hex(SHA256(private BIP32 child m/84'/0'/0'/0/2 || UTF8('bc1q21-opreturn-encryption-v1')))`. Retail `Frontend/AESHelper.js` uses `BC1Q21G1` header + PBKDF2-SHA256(100k) + AES-256-GCM, salt/nonce and authenticated header. The on-chain recovery ciphertext encodes the **first release date**; client derives subsequent dates by retail monthly/yearly schedule and script matches. Retail unlock relies on the private HD child; public xpub/PSBT signatures alone do not decrypt it.
  - Official Jade `Blockstream/Jade/docs/index.rst` documents QR/RPC `get_xpub`, PSBT signing, message signing, BIP85 public key/host-encrypted BIP85 entropy. No proven Jade QR API to do exact retail AES decrypt **inside device**; never claim this is solved or send private material to browser via BIP85.
  - Investigate whether a safe supported hardware/firmware capability or a correctly versioned new Professional metadata format can satisfy private unlock. A *separate truly offline recovery computer* using the **same gift 12 words** is a contingency requiring explicit owner agreement; not a decided architecture. Public xpub brute date-discovery has correlation/privacy implications and is **not approved** as a substitute for protected schedule.
  - Do NOT publicly reveal/derive full schedule before offline authorization, even if some public script inference is mathematically possible.
  - No need to resolve C *before researching/testing A or preparing isolated B*, but cannot release a finished Professional product without C.

## Repo code landmarks
Retail read-only references (NEVER edit on this branch): `Frontend/gift/index.html`, `Frontend/gift/gift-h08.js`, `Frontend/CryptoManager.js`, `Frontend/AESHelper.js`, `Frontend/index.html`.
Professional evidence/prototypes: `Professional/verify-watchonly-xpub-gift.mjs`, `Professional/verify-public-cltv-candidate.mjs`, `Professional/gift-link-public-candidate.mjs`, `Professional/test-single-funded-gift-core.py`, `Professional/bind-funded-public-gift.mjs`, `Professional/build-funded-recipient-review.mjs`, `Professional/test-same-12-word-offline-restore.mjs`, `Professional/retail-date-policy-reference.mjs`, `Professional/recipient-claim-readiness-gate.mjs`.
Existing design records: `Professional/RETAIL-EQUIVALENT-RECOVERY-REQUIREMENT.md`, `Professional/GIFT-SPECIFIC-RECIPIENT-UX-REQUIREMENT.md`, `Professional/JADE-OFFLINE-RECOVERY-CAPABILITY-GATE.md`, `Professional/RECOVERY-HARDWARE-DECISION-20261017.md`, `Professional/RECOVERY-FEASIBILITY-PRIVACY-DECISION.md`, `Professional/OFFLINE-FIRST-DATE-HANDOFF-CHECKPOINT.md`, `Professional/RECIPIENT-PUBLIC-RECOVERY-CHECKPOINT.md`. **Where older records imply two pages, always defer to THIS final owner decision: one shared recipient page unless necessary. Where older records imply the schedule can appear before unlock, they are superseded: schedule strictly hidden before unlock.**
Note: Earlier tests and artifacts exist under GitHub Actions; some artifacts expire after 7 days, but source code and workflow logs/commits persist subject to GitHub retention. Don't assume artifacts are permanent.

## Tomorrow's prescribed starting procedure
1. FIRST read THIS document on `professional/isolated-release-prototype` via GitHub, plus relevant code only as needed. Confirm exact branch and NEVER modify `main`.
2. Give the user a very short summary of proven Jade offline signing and the **three** outstanding focused issues above. Do not retrace all historical CI runs unless relevant.
3. Start **A, creator-side multi-release QR/signing feasibility**, by inspecting existing four-PSBT BC-UR generator and Jade documented batch capabilities. Design a test that answers the precise batch-scan/approval question. Do not ask user to repeat individual four release signings; request new Jade hardware action only once a new specific, ready-to-run isolated test can teach us something genuinely new.
4. Continue B afterward. Treat C as the defined security gate, not an excuse for endless tangential AES unit tests.
5. Before claiming any new result, verify the specific GitHub CI job log and physical hardware evidence if applicable. No file-download chores or extra work for user unless necessary.

## Final compliance summary
- Live website unchanged; retail `main` untouched; no real Bitcoin; no production deployment; no Start9 operations; no wallet seed/private secrets supplied to chat or source.
- All signed Jade test cycles and listed green run evidence should be regarded as completed pilot tests; **DO NOT duplicate**.
- This is a status/handoff document, **not a claim** that the full bc1q21 Professional product is complete or approved for deployment.
