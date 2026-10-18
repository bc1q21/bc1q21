# bc1q21 Professional — creator 24-output unsigned PSBT gate

Date: 2026-10-18
Branch: professional/isolated-release-prototype
Status: preparation only, not executed.

Construct one unsigned Bitcoin Core regtest creator funding PSBT with 24 distinct recipient CLTV outputs and optional creator change. Creator inputs must belong to a disposable synthetic creator wallet; recipient outputs derive only from synthetic public descriptors.

Verify every script and satoshi amount by actual script bytes, not assumed output order. Verify creator input provenance, fee, change, unsigned PSBT status and SHA-256. Encode one PSBT as animated BC-UR crypto-psbt, check each QR pixel payload and reconstruct identical PSBT bytes. Generate an offline review page.

Do not confuse one 24-output transaction with 24 separate release transactions. Hardware scan and number of approvals remain unverified. No seed phrases, private keys, production, retail edits, mainnet, Start9 or real Bitcoin.
