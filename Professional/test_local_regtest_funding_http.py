import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from local_regtest_funding_http import (
    ProfessionalFundingHandler, handle_funding_inspection, observe_regtest_outpoint, scan_regtest_funding_address, ALLOWED_ORIGIN
)
from test_trusted_core_funding import INTENT, mock_rpc, TXID, SCRIPT, CHAIN, RESPONSE


class ProfessionalLocalFundingHttpTests(unittest.TestCase):
    def test_adapter_returns_only_non_authorizing_verified_snapshot(self):
        result = handle_funding_inspection({"intent": INTENT}, mock_rpc())
        self.assertTrue(result["fundingOutpointsVerified"])
        self.assertFalse(result["canSign"])
        self.assertFalse(result["canBroadcast"])
        self.assertFalse(result["walletOriginAuthenticated"])

    def test_core_observation_never_authorizes_signing(self):
        observed = observe_regtest_outpoint(
            {"txid": TXID, "vout": 0, "scriptPubKeyHex": SCRIPT}, mock_rpc())
        self.assertEqual(observed["valueSats"], 100000)
        self.assertFalse(observed["walletOriginAuthenticated"])
        self.assertFalse(observed["canSign"])
        self.assertFalse(observed["canBroadcast"])
        for bad_rpc in (mock_rpc(response=None),
                        mock_rpc(response={**RESPONSE, "confirmations": 0}),
                        mock_rpc(chain={**CHAIN, "chain": "main"})):
            with self.assertRaises(ValueError):
                observe_regtest_outpoint(
                    {"txid": TXID, "vout": 0, "scriptPubKeyHex": SCRIPT}, bad_rpc)

    def test_auto_scan_checks_core_outpoints_and_never_grants_signing(self):
        address = "bcrt1q" + "q" * 35
        base = mock_rpc()
        def rpc(method, params):
            if method == "scantxoutset":
                self.assertEqual(params, ["start", [f"addr({address})"]])
                return {"success": True, "unspents": [
                    {"txid": TXID, "vout": 0, "scriptPubKey": SCRIPT, "amount": 0.001}
                ]}
            return base(method, params)
        result = scan_regtest_funding_address(
            {"address": address, "scriptPubKeyHex": SCRIPT}, rpc)
        self.assertEqual(result["totalConfirmedSats"], 100000)
        self.assertEqual(len(result["confirmedUtxos"]), 1)
        self.assertFalse(result["canSign"])
        self.assertFalse(result["canBroadcast"])
        with self.assertRaises(ValueError):
            scan_regtest_funding_address(
                {"address": address, "scriptPubKeyHex": SCRIPT, "signingAuthorized": True}, rpc)

    def test_http_rejects_wrong_origin_and_untrusted_approval(self):
        class Handler(ProfessionalFundingHandler):
            rpc_call = staticmethod(mock_rpc())

            def log_message(self, *_):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{server.server_port}/professional/regtest/inspect-funding"

        def send(body, origin):
            raw = json.dumps(body).encode()
            request = Request(url, data=raw, headers={
                "Content-Type": "application/json", "Origin": origin
            }, method="POST")
            try:
                with urlopen(request, timeout=2) as reply:
                    return reply.status, json.load(reply)
            except HTTPError as error:
                return error.code, json.load(error)

        try:
            status, body = send({"intent": INTENT}, ALLOWED_ORIGIN)
            self.assertEqual(status, 200)
            self.assertTrue(body["fundingOutpointsVerified"])
            self.assertFalse(body["canSign"])
            observation_url = url.replace("inspect-funding", "observe-utxo")
            raw = json.dumps({"txid": TXID, "vout": 0, "scriptPubKeyHex": SCRIPT}).encode()
            request = Request(observation_url, data=raw, headers={
                "Content-Type": "application/json", "Origin": ALLOWED_ORIGIN
            }, method="POST")
            with urlopen(request, timeout=2) as reply:
                observed = json.load(reply)
            self.assertEqual(observed["valueSats"], 100000)
            self.assertFalse(observed["canSign"])
            status, _ = send({"intent": INTENT}, "https://bc1q21.com")
            self.assertEqual(status, 403)
            status, _ = send({"intent": INTENT, "signingAuthorized": True}, ALLOWED_ORIGIN)
            self.assertEqual(status, 400)
            status, _ = send({"intent": INTENT}, "null")
            self.assertEqual(status, 403)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)


if __name__ == "__main__":
    unittest.main()
