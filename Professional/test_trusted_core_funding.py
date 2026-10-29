import unittest
from trusted_core_funding import (
    verify_funding_with_core, make_local_core_rpc, inspect_professional_funding_request, FundingVerificationError
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
CHAIN = {"chain": "regtest", "initialblockdownload": False, "blocks": 101, "headers": 101}
def mock_rpc(response=RESPONSE, chain=CHAIN):
    return lambda method, params: chain if method == "getblockchaininfo" else response

class TrustedFundingTests(unittest.TestCase):
    def test_matches_only_server_rpc_and_never_authorizes_signing(self):
        called = []
        def rpc(method, params):
            called.append((method, params))
            return CHAIN if method == "getblockchaininfo" else RESPONSE
        result = verify_funding_with_core(INTENT, rpc)
        self.assertEqual(called, [("getblockchaininfo", []), ("gettxout", [TXID, 0, True])])
        self.assertTrue(result["coreNetworkVerified"])
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
                    verify_funding_with_core(INTENT, mock_rpc(response))
        with self.assertRaises(RuntimeError):
            verify_funding_with_core(INTENT, lambda *_: (_ for _ in ()).throw(RuntimeError("offline")))

    def test_no_untrusted_rpc_or_duplicate_outpoints(self):
        with self.assertRaises(FundingVerificationError):
            verify_funding_with_core(INTENT, None)
        with self.assertRaises(FundingVerificationError):
            verify_funding_with_core({**INTENT, "inputs": INTENT["inputs"] * 2}, mock_rpc())

    def test_rejects_wrong_or_unsynced_chain(self):
        invalid = [
            {**CHAIN, "chain": "main"},
            {**CHAIN, "chain": "test"},
            {**CHAIN, "initialblockdownload": True},
            {**CHAIN, "blocks": 100, "headers": 101},
            None,
        ]
        for chain in invalid:
            with self.subTest(chain=chain):
                with self.assertRaises(FundingVerificationError):
                    verify_funding_with_core(INTENT, mock_rpc(chain=chain))

    def test_workspace_inspection_never_authorizes_signing(self):
        result = inspect_professional_funding_request({"intent": INTENT}, mock_rpc())
        self.assertTrue(result["fundingOutpointsVerified"])
        self.assertTrue(result["coreNetworkVerified"])
        self.assertFalse(result["walletOriginAuthenticated"])
        self.assertFalse(result["signingAuthorized"])
        self.assertFalse(result["canRequestPayment"])
        self.assertFalse(result["canSign"])
        self.assertFalse(result["canBroadcast"])

    def test_workspace_rejects_caller_supplied_rpc_or_approval(self):
        for extra in ({"chainVerified": True}, {"rpcSnapshot": RESPONSE},
                      {"rpcPassword": "test"}, {"signingAuthorized": True}):
            with self.subTest(extra=extra):
                with self.assertRaises(FundingVerificationError):
                    inspect_professional_funding_request({"intent": INTENT, **extra}, mock_rpc())
        with self.assertRaises(FundingVerificationError):
            inspect_professional_funding_request({"intent": INTENT},
                                                  mock_rpc(chain={**CHAIN, "chain": "main"}))

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
