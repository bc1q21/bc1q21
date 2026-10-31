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


def broadcast_verified_regtest_transaction(raw_transaction_hex, expected_txid, rpc_call, authorize):
    """Broadcast only after independent trusted server authorization.

    The authorize callback MUST be implemented server-side and validate the
    original approved plan, Jade wallet identity, signed transaction binding,
    recipient recovery readiness, and current Core funding state. Browser
    booleans, session storage and client-provided approvals are not sufficient.
    """
    if not callable(authorize):
        raise RegtestAcceptanceError("Trusted server authorization required")
    inspection = inspect_regtest_acceptance(raw_transaction_hex, expected_txid, rpc_call)
    if not inspection["acceptedAtInspection"]:
        raise RegtestAcceptanceError("Bitcoin Core rejected the transaction")
    # The authorization implementation must be supplied by a trusted service,
    # not by a browser caller. Fail closed unless it explicitly approves.
    if authorize(raw_transaction_hex, expected_txid.lower()) is not True:
        raise RegtestAcceptanceError("Trusted transaction authorization denied")
    txid = rpc_call("sendrawtransaction", [raw_transaction_hex])
    if not isinstance(txid, str) or txid.lower() != expected_txid.lower():
        raise RegtestAcceptanceError("Bitcoin Core broadcast transaction ID mismatch")
    return {
        "format": "bc1q21-professional-regtest-broadcast-v1",
        "network": "regtest",
        "txid": txid.lower(),
        "broadcastSubmitted": True,
        "confirmed": False,
        "recipientDeliveryReady": False,
        "nextStep": "VERIFY_CONFIRMATIONS_BEFORE_RECIPIENT_DELIVERY",
    }


def inspect_regtest_confirmation(expected_txid, rpc_call):
    """Read transaction confirmation state from a trusted regtest node."""
    if not callable(rpc_call) or not isinstance(expected_txid, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", expected_txid):
        raise RegtestAcceptanceError("Trusted Core RPC and valid transaction ID required")
    chain = rpc_call("getblockchaininfo", [])
    if not isinstance(chain, dict) or chain.get("chain") != "regtest" or chain.get("initialblockdownload") is not False:
        raise RegtestAcceptanceError("Regtest Bitcoin Core required")
    transaction = rpc_call("getrawtransaction", [expected_txid.lower(), True])
    if not isinstance(transaction, dict) or transaction.get("txid", "").lower() != expected_txid.lower():
        raise RegtestAcceptanceError("Transaction not available from Bitcoin Core")
    confirmations = transaction.get("confirmations", 0)
    if type(confirmations) is not int or confirmations < 0:
        raise RegtestAcceptanceError("Invalid transaction confirmation count")
    return {
        "format": "bc1q21-professional-regtest-confirmation-v1",
        "network": "regtest",
        "txid": expected_txid.lower(),
        "confirmations": confirmations,
        "confirmed": confirmations >= 1,
        "recipientDeliveryReady": False,
    }
