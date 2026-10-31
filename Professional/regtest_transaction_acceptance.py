"""Read-only Bitcoin Core regtest acceptance check for Professional Jade transactions.

Runs on the server with authenticated RPC. It never broadcasts Bitcoin,
returns signing permission, or changes the Retail application.
"""

import re


class RegtestAcceptanceError(ValueError):
    pass


def inspect_regtest_acceptance(raw_transaction_hex, expected_txid, rpc_call):
    """Check a finalized regtest transaction using trusted Bitcoin Core RPC."""
    if not callable(rpc_call):
        raise RegtestAcceptanceError("Authenticated Bitcoin Core RPC required")
    if not isinstance(raw_transaction_hex, str) or len(raw_transaction_hex) % 2 or not re.fullmatch(r"[0-9a-fA-F]{120,200000}", raw_transaction_hex):
        raise RegtestAcceptanceError("Invalid raw transaction")
    if not isinstance(expected_txid, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", expected_txid):
        raise RegtestAcceptanceError("Invalid transaction ID")
    chain = rpc_call("getblockchaininfo", [])
    if not isinstance(chain, dict) or chain.get("chain") != "regtest" or chain.get("initialblockdownload") is not False:
        raise RegtestAcceptanceError("Bitcoin Core must be running regtest")
    decoded = rpc_call("decoderawtransaction", [raw_transaction_hex])
    if not isinstance(decoded, dict) or decoded.get("txid", "").lower() != expected_txid.lower():
        raise RegtestAcceptanceError("Decoded transaction ID mismatch")
    result = rpc_call("testmempoolaccept", [[raw_transaction_hex]])
    if not isinstance(result, list) or len(result) != 1 or not isinstance(result[0], dict):
        raise RegtestAcceptanceError("Unexpected Bitcoin Core response")
    decision = result[0]
    if decision.get("txid", "").lower() != expected_txid.lower():
        raise RegtestAcceptanceError("Mempool transaction ID mismatch")
    allowed = decision.get("allowed") is True
    return {
        "format": "bc1q21-professional-regtest-acceptance-v1",
        "network": "regtest",
        "txid": expected_txid.lower(),
        "acceptedAtInspection": allowed,
        "rejectionReason": None if allowed else str(decision.get("reject-reason") or "Not accepted")[:200],
        "broadcast": False,
        "canBroadcast": False,
    }
