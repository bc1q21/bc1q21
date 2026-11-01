"""Targeted, offline regression checks for immutable regtest intent snapshots."""
import json
import tempfile
import unittest
from pathlib import Path

from regtest_intent_registry import (
    IntentRegistryError, fingerprint, load_inspection_intent,
    register_inspection_intent,
)


def sample():
    return {
        "format": "bc1q21-professional-funded-distribution-intent-v1",
        "network": "regtest", "signed": False, "broadcastAuthorized": False,
        "inputs": [{"txid": "ab" * 32, "vout": 0, "valueSats": 100000}],
        "gifts": [{"locktime": 1800000000, "valueSats": 90000,
                   "scriptPubKeyHex": "0020" + "cd" * 32}],
    }


class RegistryTests(unittest.TestCase):
    def test_round_trip_and_immutable(self):
        with tempfile.TemporaryDirectory() as root:
            intent = sample()
            result = register_inspection_intent(intent, root, operator_confirmed=True)
            self.assertFalse(result["broadcastAuthorized"])
            self.assertFalse(result["walletOriginAuthenticated"])
            self.assertEqual(load_inspection_intent(fingerprint(intent), root), intent)
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(intent, root, operator_confirmed=True)

    def test_requires_review_and_rejects_client_approval(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(sample(), root)
            intent = sample()
            intent["broadcastAuthorized"] = True
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(intent, root, operator_confirmed=True)

    def test_tamper_detected(self):
        with tempfile.TemporaryDirectory() as root:
            intent = sample()
            identifier = fingerprint(intent)
            register_inspection_intent(intent, root, operator_confirmed=True)
            path = Path(root) / (identifier + ".json")
            changed = dict(intent, extra="tampered")
            path.write_text(json.dumps(changed))
            with self.assertRaises(IntentRegistryError):
                load_inspection_intent(identifier, root)

    def test_public_registry_directory_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            Path(root).chmod(0o755)
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(sample(), root, operator_confirmed=True)
            Path(root).chmod(0o700)

    def test_duplicate_funding_outpoint_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            intent = sample()
            intent["inputs"].append(dict(intent["inputs"][0]))
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(intent, root, operator_confirmed=True)

    def test_excessive_gift_count_rejected(self):
        with tempfile.TemporaryDirectory() as root:
            intent = sample()
            intent["gifts"] *= 101
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(intent, root, operator_confirmed=True)

    def test_invalid_input_fields(self):
        for field, value in [("txid", "bad"), ("vout", -1), ("vout", True),
                             ("valueSats", -1), ("valueSats", True)]:
            with self.subTest(field=field, value=value):
                with tempfile.TemporaryDirectory() as root:
                    intent = sample()
                    intent["inputs"][0][field] = value
                    with self.assertRaises(IntentRegistryError):
                        register_inspection_intent(intent, root, operator_confirmed=True)

    def test_duplicate_outpoint_case_insensitive(self):
        with tempfile.TemporaryDirectory() as root:
            intent = sample()
            repeated = dict(intent["inputs"][0])
            repeated["txid"] = repeated["txid"].upper()
            intent["inputs"].append(repeated)
            with self.assertRaises(IntentRegistryError):
                register_inspection_intent(intent, root, operator_confirmed=True)

    def test_no_path_traversal(self):
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(IntentRegistryError):
                load_inspection_intent("../secret", root)


if __name__ == "__main__":
    unittest.main()
