# bc1q21 Professional — session handoff, 2026-10-24

## Single target (do not expand scope)
Complete one full Professional gift lifecycle that mirrors retail: create gift, fund, generate/deliver gift card, recipient views/unlocks gift, recipient releases using **one original 12-word mnemonic restored on Jade Plus offline only**, Jade receives animated unsigned PSBT QR and returns signed PSBT QR, recipient website scans, verifies, finalizes and (only after independent recipient authorization and explicit owner approval) broadcasts. The **only intentional difference from retail is air-gapped signing**. No new features or redesign. Professional is a separate future product; retail must not be altered.

## Absolute safety and scope
Work ONLY on branch `professional/isolated-release-prototype`, in `Professional/` or `.github/workflows/professional-*.yml`. Never modify `main`, `Frontend/`, `Website/`, `Backend/`, retail behavior or deployment. No real BTC signing/broadcast or hardware operation without owner approval. Regtest CI/software checks are allowed. Gift links alone do NOT confer recipient authorization. Never request seed entry on the website, a second mnemonic or a second computer. Never manufacture approval flags. No network broadcast until authorized.

## Existing hardware evidence (prior sessions)
- 2026-10-18: Jade Plus creator signed the 24-output CLTV gift funding PSBT, verified, not broadcast. `Professional/JADE-24-OUTPUT-CREATOR-HARDWARE-ACCEPTANCE-2026-10-18.md`, CI run 39149412574.
- 2026-10-20: Same funded regtest gift, Jade Plus recipient restored original disposable 12-word mnemonic offline, scanned 19 unsigned QR frames and returned 7 signed QR frames. Independent ECDSA verified (run 39480906529), Bitcoin Core `testmempoolaccept` accepted (run 39481114223); 12k sats input, 11k payout, 1k fee, CLTV 500. No broadcast. `Professional/SESSION-HANDOFF-2026-10-20-JADE-SAME-GIFT-SIGNED-CORE-PASS.md`.

## Work completed on 2026-10-24
1. Recipient QR animation, HTML camera mount controls and scanning/verification had been incrementally added in `Professional/recipient-offline-signing-step.mjs`, `recipient-jade-signed-camera.browser.mjs` and `recipient-jade-signed-release.browser.mjs`; earlier CI green, but no end-to-end browser release.
2. `a8049af87e`: recipient QR/camera HTML test; CI run 40124114129 SUCCESS.
3. `b79971c738`: recipient signed QR verified return wired to `finalizeVerifiedProfessionalRelease`; regtest result returned with `canBroadcast:false`, `beneficiaryAuthorized:false`; CI 40124229834 SUCCESS. This is module wiring, NOT a demonstrated browser lifecycle.
4. `e8137ee783`: fixed camera UR `crypto-psbt` payload to unwrap CBOR; CI 40124327584 SUCCESS.
5. `5f65549efd`: camera DOM controls test; CI 40124336914 SUCCESS.
6. `559c1818f1`: added actual esbuild browser bundle check `Professional/recipient-browser-bundle.check.mjs`.
7. `1012064b01`: made browser bundle check mandatory in `.github/workflows/professional-tests.yml`. CI 40124533891 FAILED, correctly exposing Node/browser incompatibility.
8. `41ce0a811d`: added `Professional/browser-crypto-shim.mjs` using noble SHA256, then `81e2afad14` configured esbuild alias for `node:crypto`; `9213111a47` added `cbor` to CI install. Browser bundle still FAILED (run 40124671588) because `cbor` pulled in Node `stream` imports.
9. **`e1364da2245e`**: replaced camera CBOR dependency with strict bounded browser-native CBOR byte-string decoder. **Latest CI run 40124800736 SUCCESS**. Browser bundle and existing Professional tests pass. Earlier red Xs are historical.
10. This handoff file is the final documentation-only commit after that success. Verify its own CI separately if needed.

## Critical remaining gaps — do not mistake green CI for finished product
- A successful esbuild bundle proves packaging, **NOT** that camera, animated QR, verification, finalization, gift creation, and gift release all work in a real browser.
- `Professional/recipient-gift-specific-prototype.html` is a static/mock gift view; recipient integration still fail-closed (`canSign:false`, `canBroadcast:false`). No normal Professional website gift-specific release integration demonstrated.
- `Professional/recipient-offline-signing-step.mjs` receives `signingQrSession` with pre-rendered `qrImages`; QR producer and gift-specific reviewed session must be connected. Check inline `<\\/script>` rendering in generated HTML: confirm actual closing tag is correct in browser.
- `Professional/recipient-jade-signed-release.browser.mjs` uses a SHA256 shim through the esbuild alias; the actual deployable browser bundle and its integration into recipient HTML must be implemented/tested, not assumed.
- The newly added `attachJadeFinalizedReleaseToRecipientSection` verifies/finalizes but never broadcasts and does not authenticate beneficiary. Do not infer permission.
- Need full retail parity of gift creation, funding, gift card, recipient unlock/date/payout/fees/OP_RETURN, and release. Focus on one real regtest gift and one recipient flow, not additional synthetic scenarios.
- Need a real browser integration test (prefer Playwright already installed in Professional CI) exercising mounted UI and signed QR return using existing captured same-gift public frames/approved handoff. Browser camera may be simulated for software test; label it clearly. Separate real Jade hardware acceptance from software simulation.
- Need separately authorized regtest broadcast only after approval; no production BTC action.

## Tomorrow's first actions (in order)
1. Check branch HEAD and `professional-tests.yml` latest GitHub Actions status; baseline known green at e1364da2245e / 40124800736.
2. Inspect actual Professional recipient HTML rendering, browser bundle and camera scanner; fix defects, add Playwright browser execution (not just esbuild). Verify signed QR return is the same gift and finalized transaction matches.
3. Wire the approved gift-specific unsigned QR producer, QR image frames, signed QR camera, verifier/finalizer into the **real** Professional recipient gift experience. Maintain fail-closed authorization and exact retail parity.
4. Run complete software-only gift creation -> gift card -> recipient release integration with real regtest data and capture CI proof. Only then request narrowly scoped owner permission for any further physical Jade/broadcast acceptance.
5. Avoid scope creep and status-only cycles. Work in GitHub, test, report actual result.

## Important files
`Professional/recipient-offline-signing-step.mjs`
`Professional/recipient-jade-signed-camera.browser.mjs`
`Professional/recipient-jade-signed-release.browser.mjs`
`Professional/recipient-browser-bundle.check.mjs`
`Professional/browser-crypto-shim.mjs`
`Professional/finalize-verified-release.mjs`
`Professional/jade-signed-qr-return.mjs`
`Professional/approved-qr-handoff.mjs`
`Professional/recipient-integration-boundary.mjs`
`Professional/recipient-gift-specific-prototype.html`
`.github/workflows/professional-tests.yml`

**Status at stop:** Latest browser bundle CI green; actual full browser gift lifecycle NOT YET COMPLETE. No retail changes, no main changes, no broadcast.
