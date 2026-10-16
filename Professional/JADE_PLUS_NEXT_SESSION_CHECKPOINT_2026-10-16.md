# bc1q21 Professional — PAUSE before next live Jade Plus session
**Date:** 2026-10-16
**Branch:** `professional/isolated-release-prototype` ONLY
**Decision:** **PAUSED / NO-GO for real Bitcoin, production, deployment and retail integration.** Jade Plus **OFF**. No new hardware operation authorized by this document.

## Proven and independently checked
1. **One actual funded regtest P2SH CLTV output signed by Jade Plus** via offline BC-UR QR. Captured nine signed QR frames in `Professional/bc1q21_Jade_Signed_PSBT_QR_frames (1).txt`; decoder and ECDSA check `Professional/verify-funded-jade-qr.mjs` passed. Signed PSBT SHA256 `a4b089142f97134174592021a20d1f8fa7b231f67f4715d274be656ceef31490`. Original unsigned PSBT SHA256 `61ca9ab80cbf0b73fbcc9ac89504c00027d58a2b718ae9a3c2346ee3625b451b`. [Evidence run #38944053637](https://github.com/bc1q21/bc1q21/actions/runs/38944053637).
2. **The finalized Jade-signed spend was accepted by Bitcoin Core 28 `testmempoolaccept`** on an independently restored regtest at height 121, CLTV height 110. Funding `cc4419549ae75971d40ee0496741022417d6bf97165533068874e940c2c8fb6d:0`, 100,000 test sats; destination 99,000, fee 1,000; finalized txid `d4f0d7732a883f459c14c5f8a484cca69408736f8dec05a060219e8788cd7e3a`. **No broadcast; funding remained unspent.** [Evidence run #38944732136](https://github.com/bc1q21/bc1q21/actions/runs/38944732136).
3. **Four retail-format public-only output scripts and schedule validation** (three tests passed) [run #38945182627](https://github.com/bc1q21/bc1q21/actions/runs/38945182627).
4. **Four independently confirmed public-xpub-derived P2SH CLTV funding outputs** (heights 130/140/150/160; amounts 12k/15k/18k/21k sats), **without signatures** [run #38947073663](https://github.com/bc1q21/bc1q21/actions/runs/38947073663).
5. **Four independently confirmed, staged software-signed CLTV releases** (heights 230/240/250/260; amounts 12k/15k/18k/21k sats), each with signed premature-spend rejection, final-sequence rejection, wrong-locktime rejection, mature acceptance, regtest-only broadcast and mined confirmation. **Software keys unrelated to Jade**, distinct chain/outpoints from item 4. [Final green run #38948176903](https://github.com/bc1q21/bc1q21/actions/runs/38948176903). Marker `PASS_FOUR_STAGED_SOFTWARE_CLTV_REGTEST_RELEASES`.
6. Updated authoritative reconciliation: `Professional/OFFLINE_SIGNER_EVIDENCE_REGISTER.md` (2026-10-16 appended section). Do not confuse software-only multi-release evidence with Jade hardware compatibility.

## Not proven — remain open H-01 through H-08
- H-01: fresh device-attested public account/fingerprint/path and four exact derivations matching public vectors.
- H-02: four distinct *Jade-origin* release scripts and hardware handling of four independent CLTV spends.
- H-03/H-04: exact retail `BC1Q21G1` wallet-derived first-date encryption and offline authenticated schedule recovery, without exporting reusable secret into online browser. Jade may not offer the necessary AES operation; **do not assume it does**.
- H-05: full retail funding transaction offline hardware signing and exact outputs, fee and OP_RETURN audit.
- H-06: one funded Jade CLTV spend **passed ECDSA + Core acceptance**, but four hardware-signed independent releases and boundary checks with the same hardware-origin keys not demonstrated.
- H-07: hardware/QR/browser boundary and no secret leakage not independently audited.
- H-08: creator/beneficiary complete retail-equivalent workflow and usability not validated.
- Full threat model, deployment, security review and operational readiness remain open.

## Proposed NEXT live hardware session — request fresh approval before beginning
**Objective:** hardware-origin public derivation attestation and feasibility gate **before** investing in a four-signature session. On a previously approved disposable test wallet, check Jade Plus model/firmware, QR/airgap mode, public master fingerprint, account xpub (if exportable), and four beneficiary child public keys / paths `m/84'/0'/0'/1/0` through `/1/3`, comparing against `Professional/public-device-comparison-vectors.mjs` and `Professional/public-device-cltv-observation-check.mjs`. Record actual hardware observations and exact comparison results. **Do not enter any recovery words into a website, ChatGPT or GitHub.** Never upload secrets, xprv or private key. If Jade cannot expose or independently verify the necessary public information, record that limitation and stop rather than improvising or substituting unverified xpub data.

**Secondary feasibility gate (discussion before device action):** confirm whether the device actually supports exact wallet-derived offline `BC1Q21G1` AES encryption/decryption and gift-bound schedule-only return. The previously proven PSBT signing **does not** establish AES support. If absent, mark H-03/H-04 as blocked and request an explicit architecture decision; do not silently change the retail format or put reusable wallet secrets online. If public-origin gate passes and AES architecture is approved, separately design and authorize a four-output Jade signing experiment with **new genuinely funded, preserved regtest outpoints** and four distinct PSBTs. The old software-key regtest outpoints are not Jade-spendable. No new Jade signature or broadcast is authorized by this checkpoint.

## Boundaries and resume checklist
- ONLY branch `professional/isolated-release-prototype`; ONLY `Professional/` and `.github/workflows/professional-*.yml`. **NEVER** touch `main`, retail, production, Start9, live wallets, live Bitcoin or deployment. No real keys, no public broadcast.
- Jade Plus **OFF** at pause. Existing test-only hardware seed should stay private and offline; never request or record it.
- Before resuming, read this checkpoint, `Professional/OFFLINE_SIGNER_EVIDENCE_REGISTER.md`, `Professional/ENGINEERING_HANDOVER.md`, and current GitHub Actions; check latest commit/CI. Distinguish proven hardware result, software-only result, and open acceptance requirements.
- User prefers **one action at a time**, plain language, and GitHub Actions URLs instead of screenshots. Obtain explicit approval for each new physical device interaction/signing step.
- Creator independently creates and privately gives the beneficiary both retail gift card and recovery words. bc1q21 never creates, receives, transmits or stores those words.
- **Next user-facing step after resumption:** Explain public-origin/AES feasibility gate, confirm disposable Jade wallet is available, and request permission to power Jade on; do not proceed automatically.
- Overall Professional decision **NO-GO** for real funds or production. No actual next hardware session has begun.

## Suggested continuation prompt
“Resume bc1q21 Professional from `Professional/JADE_PLUS_NEXT_SESSION_CHECKPOINT_2026-10-16.md` on isolated GitHub branch `professional/isolated-release-prototype`. Read the acceptance register and current Actions first. We paused with Jade Plus OFF, after one Jade-signed funded regtest acceptance and four software-signed staged regtest releases. Walk me through the next public-origin hardware feasibility gate one step at a time, without touching retail/main or using real funds.”
