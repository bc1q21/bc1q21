import unittest
from trusted_core_funding import (
    verify_funding_with_core, make_local_core_rpc, FundingVerificationError
)
TXID = "ab" * 32
SCRIPT = "0014" + "11" * 20
INTENT = {
    "format": "bc1q21-professional-funded-distribution-intent-v1",
    "network": "regtest", "signed": False, "broadcastAuthorized": False,
    "inputs": [{"txid": TXID, "vout": 0, "valueSats": 100000,
                "scriptPubKeyHex": SCRIPT}]
}
RESPONSE = {"value": 0.001, "confirmations": 3, "scriptPubKey": {"hex": SCRIPT}}

class TrustedFundingTests(unittest.TestCase):
    def test_matches_only_server_rpc_and_never_authorizes_signing(self):
        called = []
        def rpc(method, params):
            called.append((method, params))
            return RESPONSE
        result = verify_funding_with_core(INTENT, rpc)
        self.assertEqual(called, [("gettxout", [TXID, 0, True])])
        self.assertTrue(result["chainSnapshotMatched"])
        self.assertFalse(result["canSign"])
        self.assertFalse(result["chainVerified"])
        self.assertFalse(result["giftSpecificVerified"])
        self.assertFalse(result["canBroadcast"])

    def test_rejects_mismatches_spends_unconfirmed_and_rpc_failure(self):
        bad = [
            None, {**RESPONSE, "value": 0.002},
            {**RESPONSE, "confirmations": 0},
            {**RESPONSE, "scriptPubKey": {"hex": "0014" + "22" * 20}}
        ]
        for response in bad:
            with self.subTest(response=response):
                with self.assertRaises(FundingVerificationError):
                    verify_funding_with_core(INTENT, lambda *_: response)
        with self.assertRaises(RuntimeError):
            verify_funding_with_core(INTENT, lambda *_: (_ for _ in ()).throw(RuntimeError("offline")))

    def test_no_untrusted_rpc_or_duplicate_outpoints(self):
        with self.assertRaises(FundingVerificationError):
            verify_funding_with_core(INTENT, None)
        with self.assertRaises(FundingVerificationError):
            verify_funding_with_core({**INTENT, "inputs": INTENT["inputs"] * 2}, lambda *_: RESPONSE)

    def test_no_remote_rpc_and_only_read_only_methods(self):
        with self.assertRaises(FundingVerificationError):
            make_local_core_rpc(rpc_url="http://api.bc1q21.com:18443",
                                rpc_user="test", rpc_password="test")
        rpc = make_local_core_rpc(rpc_url="http://127.0.0.1:18443",
                                  rpc_user="test", rpc_password="test")
        with self.assertRaises(FundingVerificationError):
            rpc("sendrawtransaction", ["00"])

if __name__ == "__main__":
    unittest.main()
