"""Isolated integration checks; no Bitcoin node or Jade device required."""
import tempfile
import unittest
from unittest.mock import patch

from regtest_intent_registry import fingerprint, register_inspection_intent
from stored_plan_inspection import inspect_stored_plan


def plan():
    return {
        "format": "bc1q21-professional-funded-distribution-intent-v1",
        "network": "regtest", "signed": False, "broadcastAuthorized": False,
        "inputs": [{"txid": "ab" * 32, "vout": 0, "valueSats": 100000}],
        "gifts": [{"locktime": 1800000000, "valueSats": 90000,
                   "scriptPubKeyHex": "0020" + "cd" * 32}],
    }


class StoredPlanInspectionTests(unittest.TestCase):
    def test_inspection_is_not_authorization(self):
        with tempfile.TemporaryDirectory() as root:
            intent = plan()
            register_inspection_intent(intent, root, operator_confirmed=True)
            with patch("stored_plan_inspection.inspect_regtest_transaction_against_intent",
                       return_value={"acceptedAtInspection": True}) as check_tx, patch(
                       "stored_plan_inspection.verify_funding_with_core",
                       return_value={"fundingOutpointsVerified": True}) as check_funding:
                result = inspect_stored_plan(fingerprint(intent), "aa" * 100,
                                             "bb" * 32, root, lambda *_: None)
            self.assertEqual(check_tx.call_args.args[2], intent)
            self.assertEqual(check_funding.call_args.args[0], intent)
            self.assertFalse(result["broadcastAuthorized"])
            self.assertFalse(result["walletOriginAuthenticated"])
            self.assertFalse(result["recipientRecoveryReady"])

    def test_rejects_unverified_funding(self):
        with tempfile.TemporaryDirectory() as root:
            intent = plan()
            register_inspection_intent(intent, root, operator_confirmed=True)
            with patch("stored_plan_inspection.inspect_regtest_transaction_against_intent",
                       return_value={"acceptedAtInspection": True}), patch(
                       "stored_plan_inspection.verify_funding_with_core",
                       return_value={"fundingOutpointsVerified": False}):
                with self.assertRaises(ValueError):
                    inspect_stored_plan(fingerprint(intent), "aa" * 100,
                                        "bb" * 32, root, lambda *_: None)

    def test_rejects_unaccepted_transaction(self):
        with tempfile.TemporaryDirectory() as root:
            intent = plan()
            register_inspection_intent(intent, root, operator_confirmed=True)
            with patch("stored_plan_inspection.inspect_regtest_transaction_against_intent",
                       return_value={"acceptedAtInspection": False}):
                with self.assertRaises(ValueError):
                    inspect_stored_plan(fingerprint(intent), "aa" * 100,
                                        "bb" * 32, root, lambda *_: None)


if __name__ == "__main__":
    unittest.main()
