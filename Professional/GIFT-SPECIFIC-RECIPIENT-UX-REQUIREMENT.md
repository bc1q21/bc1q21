# bc1q21 Professional — gift-specific recipient entry and offline signer
Date: 2026-10-17. Scope: professional/isolated-release-prototype only.
Status: AUTHORITATIVE PRODUCT REQUIREMENT / implementation unproven.

The recipient entry point is NOT the general bc1q21 website homepage or a general gift dashboard.

**Retail experience to preserve:**
- A recipient receives a particular gift card with a QR code and a link for that specific gift.
- Scanning the card QR or clicking the gift link opens the **gift-specific recipient page**.
- On that page, in current retail, the beneficiary enters 12-word wallet recovery words to authorize claiming an available time-locked release.
- Existing retail experience and link/deep-link context are the functional UX baseline; do not change production retail as part of Professional prototype.

**Professional experience required:**
- The same gift card QR or link leads to a **gift-specific recipient experience**, not the homepage. It may be a separate Professional recipient route/page but should preserve the retail look, context and gift-specific behavior.
- Show gift details/public release state on that page without requesting wallet secrets in the browser.
- Replace retail recovery-word entry with an offline device signing action/QR exchange. Do **not** present a button that imports or transmits recovery words from Jade to the page.
- Recipient must explicitly review/authorize **each matured release** with Jade or another trusted offline signer, using unsigned PSBT QR, returned signed PSBT QR, and browser-side public verification/broadcast.
- For a 24-annual-release gift, repeat claiming only as releases mature; there is no requirement for signing 24 transactions at once.
- Same 12-word wallet backup must restore signing authority on a trusted offline replacement device without managing a second unrelated recovery phrase. 12 words NEVER entered in browser, CI, ChatGPT or website.
- Gift link is a public gift locator, NOT authorization or a custody secret; protection comes from the device-held keys, schedule validation and CLTV. Preserve privacy/security of metadata shown by link.
- Public site may be needed for convenient display and broadcast, but offline, self-service restoration/discovery independent of bc1q21 infrastructure is a separate **must-prove** technical requirement.

**Open engineering gates:**
1. Determine deep link gift ID/locator public-only data, current retail recipient route semantics and page behavior; test with disposable gift only.
2. Prototype isolated Professional gift-specific recipient page using *public-only* gift metadata and clear button: 'Sign release with offline wallet'.
3. Integrate with already proven Jade QR signed PSBT capture/validation for ONE matured regtest gift, not arbitrary batch-signing.
4. Restore same recipient wallet 12 words solely within offline device and recover the gift's schedule; BC1Q21G1 retail secret /0/2 offline decrypt and gift discovery remain unproven.
5. Separate professional page does not alter retail main branch, production routing, domains or deployment until independent audit/approval.
