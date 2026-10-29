"""bc1q21 Professional — server-side, read-only Bitcoin Core regtest funding check.

This module must run in a trusted backend environment, NEVER in a browser.
RPC credentials stay on the server. This is an isolated prototype: it does not
expose an HTTP endpoint, issue a signing authorization, or touch production.
"""
from decimal import Decimal, InvalidOperation
import base64
import json
import urllib.request

class FundingVerificationError(ValueError):
    pass

def _sats(value):
    try:
        number = Decimal(str(value)) * 100_000_000
    except (InvalidOperation, ValueError):
        raise FundingVerificationError("Invalid Bitcoin Core amount") from None
    if number != number.to_integral_value() or not 0 < number <= 21_000_000 * 100_000_000:
        raise FundingVerificationError("Non-integral or invalid satoshi amount")
    return int(number)

def verify_funding_with_core(intent, rpc_call, minimum_confirmations=1):
    """Compare intent inputs to fresh authenticated Core gettxout RPC results.

    rpc_call must be a trusted server-side authenticated Core RPC transport.
    The return is intentionally NOT an authorization accepted by the browser
    lifecycle gate. No client-supplied RPC snapshots may replace rpc_call.
    """
    if not callable(rpc_call):
        raise FundingVerificationError("Authenticated server-side RPC required")
    if not isinstance(intent, dict) or intent.get("format") != "bc1q21-professional-funded-distribution-intent-v1" or intent.get("network") != "regtest":
        raise FundingVerificationError("Regtest intent required")
    if intent.get("signed") is not False or intent.get("broadcastAuthorized") is not False:
        raise FundingVerificationError("Unsigned, non-broadcast intent required")
    if type(minimum_confirmations) is not int or minimum_confirmations < 1:
        raise FundingVerificationError("At least one confirmation required")
    inputs = intent.get("inputs")
    if not isinstance(inputs, list) or not inputs or len(inputs) > 100:
        raise FundingVerificationError("Invalid funding inputs")
    chain_info = rpc_call("getblockchaininfo", [])
    if (not isinstance(chain_info, dict) or chain_info.get("chain") != "regtest" or
            chain_info.get("initialblockdownload") is not False or
            type(chain_info.get("blocks")) is not int or
            type(chain_info.get("headers")) is not int or
            chain_info["blocks"] != chain_info["headers"]):
        raise FundingVerificationError("Bitcoin Core must be synced regtest")
    verified, seen = [], set()
    for item in inputs:
        if not isinstance(item, dict):
            raise FundingVerificationError("Malformed funding input")
        txid, vout = item.get("txid"), item.get("vout")
        if not isinstance(txid, str) or len(txid) != 64 or any(c not in "0123456789abcdefABCDEF" for c in txid):
            raise FundingVerificationError("Invalid funding transaction ID")
        if type(vout) is not int or not 0 <= vout <= 0xffffffff:
            raise FundingVerificationError("Invalid funding output index")
        outpoint = (txid.lower(), vout)
        if outpoint in seen:
            raise FundingVerificationError("Duplicate funding input")
        seen.add(outpoint)
        # Include mempool spends: a confirmed UTXO spent in mempool is not usable.
        response = rpc_call("gettxout", [txid, vout, True])
        if not isinstance(response, dict):
            raise FundingVerificationError("Funding output spent, missing or unavailable")
        if type(response.get("confirmations")) is not int or response["confirmations"] < minimum_confirmations:
            raise FundingVerificationError("Insufficient funding confirmations")
        script = response.get("scriptPubKey")
        if not isinstance(script, dict) or not isinstance(script.get("hex"), str):
            raise FundingVerificationError("Invalid Core funding script")
        expected_script = item.get("scriptPubKeyHex")
        if (not isinstance(expected_script, str) or
                script["hex"].lower() != expected_script.lower() or
                _sats(response.get("value")) != item.get("valueSats")):
            raise FundingVerificationError("Funding script or value mismatch")
        verified.append({"txid": txid.lower(), "vout": vout, "valueSats": item["valueSats"]})
    return {
        "format": "bc1q21-professional-server-core-funding-inspection-v1",
        "network": "regtest",
        "inputsChecked": verified,
        "authenticatedRpcRequired": True,
        "chainSnapshotMatched": True,
        "coreNetworkVerified": True,
        "coreSynchronizedAtInspection": True,
        "fundingOutpointsVerified": True,
        "giftSpecificVerified": False,
        "chainVerified": False,
        "broadcastAuthorized": False,
        "canSign": False,
        "canBroadcast": False,
        "note": "Server-side point-in-time input verification only; no gift-script attestation or browser authorization."
    }

def make_local_core_rpc(*, rpc_url, rpc_user, rpc_password, timeout_seconds=8):
    """Localhost-only authenticated JSON-RPC transport, never expose credentials."""
    if rpc_url not in ("http://127.0.0.1:18443", "http://localhost:18443"):
        raise FundingVerificationError("Disposable regtest loopback RPC only")
    if not rpc_user or not rpc_password:
        raise FundingVerificationError("Server-side Core credentials required")
    token = base64.b64encode(f"{rpc_user}:{rpc_password}".encode()).decode()
    def call(method, params):
        if not ((method == "scantxoutset" and isinstance(params, list) and
                 len(params) == 2 and params[0] == "start" and
                 isinstance(params[1], list) and len(params[1]) == 1 and
                 isinstance(params[1][0], str) and
                 params[1][0].startswith("addr(bcrt1") and
                 params[1][0].endswith(")") and len(params[1][0]) <= 110) or
                (method == "getblockchaininfo" and params == []) or
                (method == "gettxout" and isinstance(params, list) and
                 len(params) == 3 and params[2] is True)):
            raise FundingVerificationError("Only bounded regtest chain and UTXO RPC allowed")
        payload = json.dumps({"jsonrpc": "1.0", "id": "professional-read-only", "method": method, "params": params}).encode()
        request = urllib.request.Request(rpc_url, data=payload, headers={
            "Content-Type": "application/json", "Authorization": f"Basic {token}"})
        try:
            with urllib.request.urlopen(request, timeout=timeout_seconds) as reply:
                result = json.load(reply)
        except Exception as error:
            raise FundingVerificationError("Trusted Core RPC unavailable") from error
        if not isinstance(result, dict) or result.get("error") is not None:
            raise FundingVerificationError("Trusted Core RPC returned an error")
        return result.get("result")
    return call

def inspect_professional_funding_request(request, rpc_call, minimum_confirmations=1):
    """Server-only integration entry for the Professional funding workspace.

    Accepts the public intent and compares it with *server-obtained* Core data.
    Does not accept user-supplied Core responses, credentials or authorizations.
    Never returns an approval token, deposit instruction or signing permission.
    """
    if not isinstance(request, dict) or set(request) != {"intent"}:
        raise FundingVerificationError("Only the unsigned public intent is accepted")
    intent = request["intent"]
    result = verify_funding_with_core(intent, rpc_call, minimum_confirmations)
    return {
        "format": "bc1q21-professional-funding-workspace-inspection-v1",
        "network": "regtest",
        "inputsChecked": result["inputsChecked"],
        "coreNetworkVerified": result["coreNetworkVerified"],
        "coreSynchronizedAtInspection": result["coreSynchronizedAtInspection"],
        "fundingOutpointsVerified": result["fundingOutpointsVerified"],
        "inspectionOnly": True,
        "walletOriginAuthenticated": False,
        "giftScriptsAuthenticated": False,
        "signingAuthorized": False,
        "canRequestPayment": False,
        "canSign": False,
        "canBroadcast": False,
        "nextStep": "INDEPENDENT_WALLET_ORIGIN_AND_GIFT_APPROVAL",
    }
