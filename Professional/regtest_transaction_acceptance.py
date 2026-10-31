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


def make_regtest_transaction_rpc(*, rpc_url, rpc_user, rpc_password, timeout_seconds=8):
    """Dedicated loopback Bitcoin Core transport for the transaction pipeline.

    Credentials remain server-side. Only regtest inspection, submission, and
    confirmation RPCs are exposed. Do not expose this transport to a browser.
    """
    import base64
    import json
    import urllib.request
    if rpc_url not in ("http://127.0.0.1:18443", "http://localhost:18443"):
        raise RegtestAcceptanceError("Only loopback regtest Bitcoin Core RPC allowed")
    if not isinstance(rpc_user, str) or not rpc_user or not isinstance(rpc_password, str) or not rpc_password:
        raise RegtestAcceptanceError("Server-side Bitcoin Core credentials required")
    if type(timeout_seconds) not in (int, float) or not 0 < timeout_seconds <= 30:
        raise RegtestAcceptanceError("Invalid RPC timeout")
    token = base64.b64encode((rpc_user + ":" + rpc_password).encode()).decode()

    def call(method, params):
        if method == "getblockchaininfo" and params == []:
            pass
        elif method == "decoderawtransaction" and isinstance(params, list) and len(params) == 1 and _raw_hex(params[0]):
            pass
        elif method == "testmempoolaccept" and isinstance(params, list) and len(params) == 1 and isinstance(params[0], list) and len(params[0]) == 1 and _raw_hex(params[0][0]):
            pass
        elif method == "gettxout" and isinstance(params, list) and len(params) == 3 and _txid(params[0]) and type(params[1]) is int and 0 <= params[1] <= 0xffffffff and params[2] is True:
            pass
        elif method == "getrawtransaction" and isinstance(params, list) and len(params) == 2 and _txid(params[0]) and params[1] is True:
            pass
        elif method == "sendrawtransaction" and isinstance(params, list) and len(params) == 1 and _raw_hex(params[0]):
            # The caller must enforce trusted server-side authorization first.
            pass
        else:
            raise RegtestAcceptanceError("RPC method or arguments not permitted")
        payload = json.dumps({"jsonrpc": "1.0", "id": "professional-regtest", "method": method, "params": params}).encode()
        request = urllib.request.Request(rpc_url, data=payload, headers={
            "Content-Type": "application/json", "Authorization": "Basic " + token})
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
                result = json.load(response)
        except Exception as exc:
            raise RegtestAcceptanceError("Regtest Bitcoin Core RPC unavailable") from exc
        if not isinstance(result, dict) or result.get("error") is not None:
            raise RegtestAcceptanceError("Regtest Bitcoin Core RPC rejected request")
        return result.get("result")
    return call


def _txid(value):
    return isinstance(value, str) and re.fullmatch(r"[0-9a-fA-F]{64}", value) is not None


def _raw_hex(value):
    return isinstance(value, str) and len(value) % 2 == 0 and re.fullmatch(r"[0-9a-fA-F]{120,200000}", value) is not None


def inspect_regtest_transaction_against_intent(raw_transaction_hex, expected_txid, intent, rpc_call):
    """Independently reconcile Bitcoin Core's decoded transaction to gift intent.

    This is an inspection, NOT an authorization. The caller must separately
    authenticate the intent, wallet ownership and recipient recovery material.
    """
    from decimal import Decimal, InvalidOperation
    if not isinstance(intent, dict) or intent.get("format") != "bc1q21-professional-funded-distribution-intent-v1" or intent.get("network") != "regtest":
        raise RegtestAcceptanceError("Regtest gift intent required")
    if intent.get("signed") is not False or intent.get("broadcastAuthorized") is not False:
        raise RegtestAcceptanceError("Expected untrusted unsigned intent")
    inspection = inspect_regtest_acceptance(raw_transaction_hex, expected_txid, rpc_call)
    decoded = rpc_call("decoderawtransaction", [raw_transaction_hex])
    inputs = intent.get("inputs")
    gifts = intent.get("gifts")
    if not isinstance(inputs, list) or not inputs or not isinstance(gifts, list) or not gifts:
        raise RegtestAcceptanceError("Gift intent inputs and outputs required")
    expected_inputs = [(item.get("txid"), item.get("vout")) for item in inputs if isinstance(item, dict)]
    actual_inputs = [(item.get("txid"), item.get("vout")) for item in decoded.get("vin", []) if isinstance(item, dict)]
    if len(expected_inputs) != len(inputs) or actual_inputs != expected_inputs:
        raise RegtestAcceptanceError("Funding outpoints do not match approved intent")
    expected_outputs = gifts + ([intent["serviceFee"]] if intent.get("serviceFee") else []) + ([intent["change"]] if intent.get("change") else [])
    actual_outputs = decoded.get("vout")
    if not isinstance(actual_outputs, list) or len(actual_outputs) != len(expected_outputs):
        raise RegtestAcceptanceError("Gift output count mismatch")
    for index, (actual, expected) in enumerate(zip(actual_outputs, expected_outputs)):
        if not isinstance(actual, dict) or not isinstance(expected, dict) or actual.get("n") != index:
            raise RegtestAcceptanceError("Invalid transaction output")
        script = actual.get("scriptPubKey")
        if not isinstance(script, dict) or script.get("hex", "").lower() != expected.get("scriptPubKeyHex", "").lower():
            raise RegtestAcceptanceError("Gift output script mismatch")
        try:
            value = Decimal(str(actual.get("value"))) * 100000000
        except (InvalidOperation, ValueError):
            raise RegtestAcceptanceError("Invalid Bitcoin Core output value") from None
        if value != value.to_integral_value() or int(value) != expected.get("valueSats"):
            raise RegtestAcceptanceError("Gift output amount mismatch")
    # Reconcile the complete satoshi ledger, not only individual outputs.
    # This rejects mismatched fee accounting and malformed intent amounts.
    if type(intent.get("networkFeeSats")) is not int or intent["networkFeeSats"] < 0:
        raise RegtestAcceptanceError("Invalid intended network fee")
    values = [item.get("valueSats") for item in inputs if isinstance(item, dict)]
    output_values = [item.get("valueSats") for item in expected_outputs]
    if (len(values) != len(inputs) or
            any(type(value) is not int or value <= 0 for value in values + output_values)):
        raise RegtestAcceptanceError("Invalid intended satoshi amounts")
    input_total, output_total = sum(values), sum(output_values)
    if (input_total != intent.get("inputTotalSats") or
            output_total != intent.get("outputTotalSats") or
            input_total - output_total != intent["networkFeeSats"]):
        raise RegtestAcceptanceError("Transaction network fee does not match gift intent")
    if any(type(gift.get("locktime")) is not int or
           gift["locktime"] < 500000000 for gift in gifts):
        raise RegtestAcceptanceError("Invalid gift locktime metadata")
    return {
        "format": "bc1q21-professional-regtest-intent-inspection-v1",
        "network": "regtest",
        "txid": expected_txid.lower(),
        "fundingInputsMatch": True,
        "giftOutputsMatch": True,
        "outputCount": len(expected_outputs),
        "acceptedAtInspection": inspection["acceptedAtInspection"],
        "broadcast": False,
        "canBroadcast": False,
        "walletOriginAuthenticated": False,
        "recipientRecoveryReady": False,
    }


def inspect_regtest_distribution_for_authorization(raw_transaction_hex, expected_txid,
                                                    trusted_intent_loader, rpc_call):
    """Server-side integration entry; never accepts a browser-supplied gift intent.

    trusted_intent_loader is a server-controlled lookup of the previously
    approved and authenticated intent by transaction ID. The resulting report
    remains read-only and is not a signing or broadcasting authorization.
    """
    if not callable(trusted_intent_loader):
        raise RegtestAcceptanceError("Trusted server intent lookup required")
    if not _raw_hex(raw_transaction_hex) or not _txid(expected_txid):
        raise RegtestAcceptanceError("Valid finalized transaction and ID required")
    intent = trusted_intent_loader(expected_txid.lower())
    if not isinstance(intent, dict):
        raise RegtestAcceptanceError("No server-authenticated gift intent")
    report = inspect_regtest_transaction_against_intent(
        raw_transaction_hex, expected_txid, intent, rpc_call)
    if not report["acceptedAtInspection"]:
        raise RegtestAcceptanceError("Bitcoin Core mempool acceptance failed")
    # Recheck that the inputs are still available on the trusted node.
    from trusted_core_funding import verify_funding_with_core
    funding = verify_funding_with_core(intent, rpc_call)
    if funding.get("fundingOutpointsVerified") is not True:
        raise RegtestAcceptanceError("Funding inputs not verified")
    return {
        "format": "bc1q21-professional-regtest-distribution-inspection-v1",
        "network": "regtest",
        "txid": expected_txid.lower(),
        "intentMatched": True,
        "fundingOutpointsVerified": True,
        "mempoolAcceptedAtInspection": True,
        "walletOriginAuthenticated": False,
        "recipientRecoveryReady": False,
        "broadcastAuthorized": False,
        "broadcast": False,
    }
