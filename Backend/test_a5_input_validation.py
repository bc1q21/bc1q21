import os
import unittest

from fastapi import HTTPException
from fastapi.testclient import TestClient


os.environ.setdefault("BITCOIN_RPC_URL", "http://127.0.0.1:8332")
os.environ.setdefault("RPC_USER", "test")
os.environ.setdefault("RPC_PASSWORD", "test")

from main import app, _require_bitcoin_address, _require_txid


class A5InputValidationTests(unittest.TestCase):
    def test_accepts_canonical_txid(self):
        txid = "ab" * 32
        self.assertEqual(_require_txid(txid), txid)

    def test_rejects_txid_url_delimiters(self):
        values = (
            "ab" * 31 + "%3F",
            "ab" * 31 + "%23",
            "ab" * 31 + "?x",
            "ab" * 31 + "#x",
        )
        for value in values:
            with self.subTest(value=value), self.assertRaises(HTTPException) as error:
                _require_txid(value)
            self.assertEqual(error.exception.status_code, 400)

    def test_routes_reject_encoded_url_delimiters(self):
        client = TestClient(app)
        address = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
        paths = (
            f"/bitcoin/address/{address}%3Ffoo/utxo",
            f"/bitcoin/address/{address}%23foo/txs",
            f"/bitcoin/address/{address}%253Ffoo/utxo",
            "/bitcoin/tx/" + "ab" * 31 + "%3F/hex",
        )

        for path in paths:
            with self.subTest(path=path):
                response = client.get(path)
                self.assertEqual(response.status_code, 400)

    def test_scan_route_rejects_query_delimiters(self):
        client = TestClient(app)
        address = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy%3Ffoo"
        response = client.get("/bitcoin/scan-utxos", params={"address": address})
        self.assertEqual(response.status_code, 400)

    def test_accepts_supported_mainnet_addresses(self):
        addresses = (
            "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
            "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
        )
        for address in addresses:
            with self.subTest(address=address):
                self.assertEqual(_require_bitcoin_address(address), address)

    def test_rejects_address_url_delimiters(self):
        address = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
        for suffix in ("%3Ffoo", "%23foo", "?foo", "#foo", "/foo"):
            with self.subTest(suffix=suffix), self.assertRaises(HTTPException) as error:
                _require_bitcoin_address(address + suffix)
            self.assertEqual(error.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
