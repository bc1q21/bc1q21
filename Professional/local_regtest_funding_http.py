"""Isolated bc1q21 Professional regtest funding inspector HTTP adapter.

Local development ONLY. Bind to loopback, never expose publicly or deploy to
Retail. RPC credentials are supplied via environment variables to this process.
No signing, wallet authentication, deposit QR, PSBT approval or broadcasting.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from trusted_core_funding import (
    FundingVerificationError, inspect_professional_funding_request, make_local_core_rpc, _sats
)

HOST = "127.0.0.1"
PORT = 18761
MAX_BODY = 100_000
ALLOWED_ORIGIN = "http://127.0.0.1:8765"


def handle_funding_inspection(payload, rpc_call):
    """Pure request boundary: a caller cannot provide RPC data or permissions."""
    result = inspect_professional_funding_request(payload, rpc_call)
    assert result["canSign"] is False and result["canBroadcast"] is False
    return result


def observe_regtest_outpoint(request, rpc_call):
    """Obtain a public funding UTXO from Core without caller-supplied RPC evidence.

    Not wallet ownership verification. No deposit address, PSBT, or signing grant.
    """
    if not isinstance(request, dict) or set(request) != {"txid", "vout", "scriptPubKeyHex"}:
        raise FundingVerificationError("Public funding outpoint fields required")
    txid, vout, expected_script = (
        request["txid"], request["vout"], request["scriptPubKeyHex"]
    )
    if (not isinstance(txid, str) or len(txid) != 64 or
            any(ch not in "0123456789abcdefABCDEF" for ch in txid) or
            type(vout) is not int or not 0 <= vout <= 0xffffffff or
            not isinstance(expected_script, str) or
            len(expected_script) < 4 or len(expected_script) > 200 or
            len(expected_script) % 2 or
            any(ch not in "0123456789abcdefABCDEF" for ch in expected_script)):
        raise FundingVerificationError("Invalid public funding outpoint")
    chain = rpc_call("getblockchaininfo", [])
    if (not isinstance(chain, dict) or chain.get("chain") != "regtest" or
            chain.get("initialblockdownload") is not False or
            type(chain.get("blocks")) is not int or
            type(chain.get("headers")) is not int or
            chain["blocks"] != chain["headers"]):
        raise FundingVerificationError("Synchronized regtest Core required")
    utxo = rpc_call("gettxout", [txid, vout, True])
    if (not isinstance(utxo, dict) or
            type(utxo.get("confirmations")) is not int or
            utxo["confirmations"] < 1 or
            not isinstance(utxo.get("scriptPubKey"), dict) or
            utxo["scriptPubKey"].get("hex", "").lower() != expected_script.lower()):
        raise FundingVerificationError("Unconfirmed, spent or mismatched funding outpoint")
    return {
        "format": "bc1q21-professional-core-observed-utxo-v1",
        "network": "regtest",
        "txid": txid.lower(), "vout": vout,
        "valueSats": _sats(utxo.get("value")),
        "scriptPubKeyHex": expected_script.lower(),
        "confirmations": utxo["confirmations"],
        "walletOriginAuthenticated": False,
        "signingAuthorized": False,
        "canSign": False, "canBroadcast": False,
    }


class ProfessionalFundingHandler(BaseHTTPRequestHandler):
    rpc_call = None

    def _reply(self, status, body):
        raw = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Vary", "Origin")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path not in ("/professional/regtest/inspect-funding", "/professional/regtest/observe-utxo"):
            self._reply(404, {"error": "Unknown route"})
            return
        if (self.headers.get("Origin") != ALLOWED_ORIGIN or
                self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json"):
            self._reply(403, {"error": "Local preview origin and JSON required"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_BODY:
                raise FundingVerificationError("Invalid request size")
            payload = json.loads(self.rfile.read(length))
            result = (observe_regtest_outpoint(payload, self.rpc_call)
                      if self.path == "/professional/regtest/observe-utxo"
                      else handle_funding_inspection(payload, self.rpc_call))
        except (ValueError, TypeError, FundingVerificationError, json.JSONDecodeError):
            self._reply(400, {"error": "Funding inspection rejected"})
            return
        except Exception:
            self._reply(503, {"error": "Trusted regtest Bitcoin Core unavailable"})
            return
        self._reply(200, result)

    def do_OPTIONS(self):
        if (self.path not in ("/professional/regtest/inspect-funding", "/professional/regtest/observe-utxo") or
                self.headers.get("Origin") != ALLOWED_ORIGIN or
                self.headers.get("Access-Control-Request-Method") != "POST"):
            self._reply(403, {"error": "Not allowed"})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "0")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        self._reply(405, {"error": "Read-only POST inspection only"})


def main():
    user = os.environ.get("BC1Q21_PROFESSIONAL_REGTEST_RPC_USER")
    password = os.environ.get("BC1Q21_PROFESSIONAL_REGTEST_RPC_PASSWORD")
    if not user or not password:
        raise SystemExit("Set isolated regtest RPC credentials in server environment")
    ProfessionalFundingHandler.rpc_call = staticmethod(make_local_core_rpc(
        rpc_url="http://127.0.0.1:18443", rpc_user=user, rpc_password=password
    ))
    with ThreadingHTTPServer((HOST, PORT), ProfessionalFundingHandler) as server:
        print(f"Professional read-only regtest inspector listening on {HOST}:{PORT}")
        server.serve_forever()


if __name__ == "__main__":
    main()
