"""Read-only inspection of a stored Professional regtest gift plan.

The registry fingerprint identifies the exact local snapshot. This module
does not authenticate Jade ownership, grant signing rights, or broadcast.
"""
from regtest_intent_registry import load_inspection_intent
from regtest_transaction_acceptance import inspect_regtest_transaction_against_intent
from trusted_core_funding import verify_funding_with_core


def inspect_stored_plan(fingerprint, raw_hex, txid, registry_directory, rpc_call):
    intent = load_inspection_intent(fingerprint, registry_directory)
    transaction = inspect_regtest_transaction_against_intent(
        raw_hex, txid, intent, rpc_call)
    if transaction["acceptedAtInspection"] is not True:
        raise ValueError("Transaction was not accepted at inspection")
    funding = verify_funding_with_core(intent, rpc_call)
    if funding["fundingOutpointsVerified"] is not True:
        raise ValueError("Funding is not verified")
    return {
        "format": "bc1q21-professional-stored-plan-inspection-v1",
        "network": "regtest",
        "intentFingerprint": fingerprint,
        "txid": txid.lower(),
        "outputsMatchStoredPlan": True,
        "fundingVerifiedAtInspection": True,
        "mempoolAcceptedAtInspection": True,
        "walletOriginAuthenticated": False,
        "recipientRecoveryReady": False,
        "inspectionOnly": True,
        "broadcastAuthorized": False,
        "canBroadcast": False,
    }
