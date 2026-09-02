from fastapi import FastAPI, Query, HTTPException, Response, Request
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Any, Dict, List
import os
import math
import re
import httpx
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.concurrency import run_in_threadpool
from pathlib import Path
from urllib.parse import quote_plus, urlsplit
import io
import json
import logging
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from dotenv import load_dotenv
import smtplib
import ssl
from email.message import EmailMessage

load_dotenv()
required_env = ["BITCOIN_RPC_URL", "RPC_USER", "RPC_PASSWORD"]
missing = [v for v in required_env if v not in os.environ]

if missing:
    raise RuntimeError(f"Missing environment variables: {', '.join(missing)}")


class RawTx(BaseModel):
    hex: str


_TXID_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_BASE58_ADDRESS_RE = re.compile(r"^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$")
_BECH32_ADDRESS_RE = re.compile(r"^bc1[ac-hj-np-z02-9]{6,87}$", re.IGNORECASE)


def _require_txid(txid: str) -> str:
    """Accept only a canonical 32-byte transaction identifier."""
    if not _TXID_RE.fullmatch(txid):
        raise HTTPException(status_code=400, detail="Invalid transaction ID.")
    return txid


def _require_bitcoin_address(address: str) -> str:
    """Accept only a syntactically valid mainnet Bitcoin address."""
    is_base58 = _BASE58_ADDRESS_RE.fullmatch(address) is not None
    is_bech32 = _BECH32_ADDRESS_RE.fullmatch(address) is not None
    is_mixed_case_bech32 = (
        address.lower().startswith("bc1")
        and address != address.lower()
        and address != address.upper()
    )

    if (not is_base58 and not is_bech32) or is_mixed_case_bech32:
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address.")
    return address

app = FastAPI(
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

@app.middleware("http")
async def strip_server_header(request: Request, call_next):
    response = await call_next(request)
    for h in ("server", "x-powered-by"):
        if h in response.headers:
            del response.headers[h]
    return response


origins = [
    "https://bc1q21.com",
    "https://www.bc1q21.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

BACKEND_DIR  = Path(__file__).resolve().parent
GIFT_CARD_TEMPLATE = BACKEND_DIR / "giftcard.pdf"
GIFT_CARD_QR = {
    "size": 130,       # points ~= 2.36"
    "offset_x": 92,   # from left-bottom origin
    "offset_y": 442 
}


@app.get("/")
def read_root():
    return {"message": "Home of www.bc1q21.com"}


@app.get("/bitcoin/getblockchaininfo")
async def get_blockchain_info():
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "1.0",
                    "id": "bc1q21",
                    "method": "getblockchaininfo",
                    "params": []
                },
                auth=(rpc_user, rpc_password),
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()["result"]
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to communicate with the Bitcoin service."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve blockchain information."
        )

async def _bitcoin_rpc(method: str, params: list):
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            rpc_url,
            json={
                "jsonrpc": "1.0",
                "id": "bc1q21",
                "method": method,
                "params": params,
            },
            auth=(rpc_user, rpc_password),
            timeout=10.0,
        )

        response.raise_for_status()
        data = response.json()

        if data.get("error"):
            raise RuntimeError(
                data["error"].get("message", "Unknown Bitcoin Core RPC error")
            )

        return data.get("result")


def _btc_per_kvb_to_sat_per_vb(value) -> float:
    rate = float(value)
    if rate <= 0:
        raise ValueError("Invalid Bitcoin Core fee rate.")
    return rate * 100000


@app.get("/bitcoin/fee-estimate")
async def bitcoin_fee_estimate():
    """
    Return current Bitcoin Core fee estimates for bc1q21.

    Normal:
      6-block CONSERVATIVE estimate.

    Low priority:
      12-block ECONOMICAL estimate.

    Fee rates are returned as whole sat/vB values.
    A live mempool minimum is used as the floor.
    If smart fee estimation is unavailable, a 2 sat/vB emergency
    fallback is used, subject to the current mempool minimum.
    """
    normal_rate = None
    low_priority_rate = None
    mempool_min_rate = 1.0

    warnings = []

    try:
        mempool_info = await _bitcoin_rpc("getmempoolinfo", [])
        raw_mempool_min = (mempool_info or {}).get("mempoolminfee")

        if raw_mempool_min is not None:
            mempool_min_rate = _btc_per_kvb_to_sat_per_vb(raw_mempool_min)
    except Exception as exc:
        warnings.append("Unable to read mempool minimum fee.")

    fee_floor = max(1.0, mempool_min_rate)

    try:
        normal = await _bitcoin_rpc(
            "estimatesmartfee",
            [6, "CONSERVATIVE"],
        )
        if normal and normal.get("feerate") is not None:
            normal_rate = _btc_per_kvb_to_sat_per_vb(normal["feerate"])
    except Exception as exc:
        warnings.append("Normal fee estimate unavailable.")

    try:
        low_priority = await _bitcoin_rpc(
            "estimatesmartfee",
            [12, "ECONOMICAL"],
        )
        if low_priority and low_priority.get("feerate") is not None:
            low_priority_rate = _btc_per_kvb_to_sat_per_vb(
                low_priority["feerate"]
            )
    except Exception as exc:
        warnings.append("Low-priority fee estimate unavailable.")
    fallback_rate = max(2.0, fee_floor)

    normal_fallback = normal_rate is None
    low_priority_fallback = low_priority_rate is None

    if normal_fallback:
        normal_rate = fallback_rate

    if low_priority_fallback:
        low_priority_rate = fallback_rate

    normal_rate = math.ceil(max(normal_rate, fee_floor))
    low_priority_rate = math.ceil(max(low_priority_rate, fee_floor))
    mempool_min_rate = math.ceil(fee_floor)

    return {
        "normal": {
            "sat_vb": normal_rate,
            "target_blocks": 6,
            "mode": "CONSERVATIVE",
            "fallback": normal_fallback,
        },
        "low_priority": {
            "sat_vb": low_priority_rate,
            "target_blocks": 12,
            "mode": "ECONOMICAL",
            "fallback": low_priority_fallback,
        },
        "mempool_min_sat_vb": mempool_min_rate,
        "fallback_used": normal_fallback or low_priority_fallback,
        "warnings": warnings,
        "source": "Bitcoin Core",
    }

@app.get("/bitcoin/tx/{txid}/hex")
async def get_tx_hex(txid: str):
    """
    Proxy to fetch raw transaction hex from mempool.space.
    """
    txid = _require_txid(txid)
    try:
        url = f"https://mempool.space/api/tx/{txid}/hex"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return {"txid": txid, "hex": resp.text.strip()}
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve transaction information."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve transaction information."
        )

@app.post("/bitcoin/sendrawtransaction")
async def send_raw_transaction(raw: RawTx):
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    # Basic sanity check
    tx_hex = (raw.hex or "").strip()
    if not tx_hex or any(c not in "0123456789abcdefABCDEF" for c in tx_hex):
        raise HTTPException(
            status_code=400,
            detail="Invalid or empty transaction hex."
        )
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "1.0",
                    "id": "bc1q21",
                    "method": "sendrawtransaction",
                    "params": [tx_hex],
                },
                auth=(rpc_user, rpc_password),
                timeout=20.0,
            )
            # Bitcoin Core RPC always returns 200; errors are in "error"
            data = resp.json()
            if data.get("error"):
                raise HTTPException(
                    status_code=400,
                    detail="Transaction was rejected by the Bitcoin network."
                )
            return {"txid": data.get("result")}
    except HTTPException:
        raise
    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to communicate with the Bitcoin service."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to submit transaction."
        )


@app.get("/bitcoin/scan-utxos")
async def scan_utxos(address: str = Query(..., description="P2SH address to scan")):
    address = _require_bitcoin_address(address)
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    try:
        async with httpx.AsyncClient() as client:
            scan_resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "1.0",
                    "id": "scan",
                    "method": "scantxoutset",
                    "params": ["start", [{"desc": f"addr({address})"}]]
                },
                auth=(rpc_user, rpc_password),
                timeout=20.0
            )
            scan_resp.raise_for_status()
            confirmed_utxos = scan_resp.json().get("result", {}).get("unspents", [])

            return {
                "address": address,
                "utxos": [
                    {
                        "source": "confirmed",
                        "txid": utxo["txid"],
                        "vout": utxo["vout"],
                        "amount": utxo["amount"],
                        "height": utxo.get("height", 0)
                    }
                    for utxo in confirmed_utxos
                ]
            }

    except httpx.HTTPError:
        raise HTTPException(
            status_code=502,
            detail="Unable to communicate with the Bitcoin service."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve UTXO information."
        )

def _create_giftcard_overlay(page_width: float, page_height: float, recipient_url: str) -> PdfReader:
    qr_img = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=1
    )
    qr_img.add_data(recipient_url)
    qr_img.make(fit=True)

    qr_pil = qr_img.make_image(fill_color="black", back_color="white")

    qr_buffer = io.BytesIO()
    qr_pil.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    overlay_buffer = io.BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))

    qr_size = GIFT_CARD_QR.get("size", 100)

    # Coordinates are from bottom-left corner.
    # For the blank square in the visible portrait layout:
    qr_x = GIFT_CARD_QR.get("offset_x", 88)
    qr_y = GIFT_CARD_QR.get("offset_y", 442)

    c.drawImage(
        ImageReader(qr_buffer),
        qr_x,
        qr_y,
        width=qr_size,
        height=qr_size,
        mask="auto"
    )

    c.save()
    overlay_buffer.seek(0)
    return PdfReader(overlay_buffer)


def _build_giftcard_pdf_bytes(recipient_url: str) -> io.BytesIO:
    if not recipient_url:
        raise ValueError("recipientUrl query parameter is required.")
    if not recipient_url.startswith(("http://", "https://")):
        raise ValueError("recipientUrl must be an absolute URL.")
    if not GIFT_CARD_TEMPLATE.exists():
        raise FileNotFoundError("Gift card template is missing on the server.")

    with GIFT_CARD_TEMPLATE.open("rb") as template_file:
        template_reader = PdfReader(template_file)
        writer = PdfWriter()

        if not template_reader.pages:
            raise ValueError("Gift card template contains no pages.")

        first_page = template_reader.pages[0]

        # Important: normalize rotated PDFs before calculating coordinates
        if first_page.rotation:
            first_page.transfer_rotation_to_content()

        width = float(first_page.mediabox.width)
        height = float(first_page.mediabox.height)

        overlay_reader = _create_giftcard_overlay(width, height, recipient_url)
        first_page.merge_page(overlay_reader.pages[0])
        writer.add_page(first_page)

        for page in template_reader.pages[1:]:
            if page.rotation:
                page.transfer_rotation_to_content()
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return output


@app.get("/bitcoin/giftcard.pdf")
async def build_giftcard_pdf(
    request: Request,
    address: str = Query(..., description="Funding address used to build the recipient URL.")
):
    address_value = address.strip()

    if not address_value:
        raise HTTPException(status_code=400, detail="Address is required to build the giftcard PDF.")

    base_url = str(request.base_url).rstrip("/")
    recipient_url = f"{base_url}/app/gift/?address={quote_plus(address_value)}"

    try:
        pdf_buffer = await run_in_threadpool(_build_giftcard_pdf_bytes, recipient_url)
    except (ValueError, FileNotFoundError):
        raise HTTPException(
            status_code=500,
            detail="Unable to generate gift card PDF."
        )
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to generate gift card PDF."
        )
    headers = {"Content-Disposition": 'inline; filename="giftcard.pdf"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)
# ---------- BTC/USD price with validated fallback and bounded stale cache ----------
_PRICE_FRESH_TTL = timedelta(seconds=20)
_PRICE_STALE_MAX_AGE = timedelta(minutes=5)
_PRICE_MIN_USD = 1_000.0
_PRICE_MAX_USD = 10_000_000.0

_price_cache = {
    "value": None,
    "fetched_at": None,
    "source": None,
}


def _validate_bitcoin_price_usd(value) -> float:
    try:
        price = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Invalid BTC/USD price") from exc

    if not math.isfinite(price):
        raise ValueError("Invalid BTC/USD price")

    if price < _PRICE_MIN_USD or price > _PRICE_MAX_USD:
        raise ValueError("BTC/USD price outside accepted range")

    return price


async def _fetch_k1_bitcoin_price_usd(client: httpx.AsyncClient) -> float:
    url = "https://k1technology.net/api/ExchangeRate"
    resp = await client.get(url)
    resp.raise_for_status()
    data = resp.json()

    if not isinstance(data, dict):
        raise ValueError("Invalid K1 exchange rate data")

    currencies = data.get("currencies")
    if not isinstance(currencies, list):
        raise ValueError("Invalid K1 exchange rate data")

    btc = next(
        (
            item
            for item in currencies
            if isinstance(item, dict) and item.get("currency") == "BTC"
        ),
        None,
    )
    usd = next(
        (
            item
            for item in currencies
            if isinstance(item, dict) and item.get("currency") == "USD"
        ),
        None,
    )

    if not btc or not usd:
        raise ValueError("Invalid K1 exchange rate data")

    try:
        btc_amount = float(btc["amount"])
        usd_amount = float(usd["amount"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ValueError("Invalid K1 exchange rate data") from exc

    if not math.isfinite(btc_amount) or btc_amount <= 0:
        raise ValueError("Invalid K1 BTC amount")

    if not math.isfinite(usd_amount) or usd_amount <= 0:
        raise ValueError("Invalid K1 USD amount")

    return _validate_bitcoin_price_usd(usd_amount / btc_amount)


async def _fetch_coinbase_bitcoin_price_usd(client: httpx.AsyncClient) -> float:
    url = "https://api.coinbase.com/v2/exchange-rates"
    resp = await client.get(url, params={"currency": "BTC"})
    resp.raise_for_status()
    data = resp.json()

    try:
        usd_rate = data["data"]["rates"]["USD"]
    except (KeyError, TypeError) as exc:
        raise ValueError("Invalid Coinbase exchange rate data") from exc

    return _validate_bitcoin_price_usd(usd_rate)


async def _fetch_bitcoin_price_usd():
    async with httpx.AsyncClient(timeout=6.0) as client:
        try:
            price = await _fetch_k1_bitcoin_price_usd(client)
            return price, "https://k1technology.net/api/ExchangeRate"
        except (httpx.HTTPError, ValueError):
            pass

        try:
            price = await _fetch_coinbase_bitcoin_price_usd(client)
            return price, "https://api.coinbase.com/v2/exchange-rates"
        except (httpx.HTTPError, ValueError) as exc:
            raise RuntimeError("BTC/USD price providers unavailable") from exc


@app.get("/bitcoin/price-usd")
async def bitcoin_price_usd():
    now = datetime.utcnow()
    cached_value = _price_cache["value"]
    cached_at = _price_cache["fetched_at"]
    cached_source = _price_cache["source"]

    if (
        cached_value is not None
        and cached_at is not None
        and now - cached_at < _PRICE_FRESH_TTL
    ):
        return {
            "btc_usd": cached_value,
            "cached": True,
            "stale": False,
            "fetched_at": cached_at.isoformat() + "Z",
            "source": cached_source,
        }

    try:
        price, source = await _fetch_bitcoin_price_usd()
        fetched_at = datetime.utcnow()

        _price_cache["value"] = price
        _price_cache["fetched_at"] = fetched_at
        _price_cache["source"] = source

        return {
            "btc_usd": price,
            "cached": False,
            "stale": False,
            "fetched_at": fetched_at.isoformat() + "Z",
            "source": source,
        }
    except RuntimeError:
        if (
            cached_value is not None
            and cached_at is not None
            and now - cached_at <= _PRICE_STALE_MAX_AGE
        ):
            return {
                "btc_usd": cached_value,
                "cached": True,
                "stale": True,
                "warning": "Live Bitcoin price is temporarily unavailable.",
                "fetched_at": cached_at.isoformat() + "Z",
                "source": cached_source,
            }

        raise HTTPException(
            status_code=503,
            detail="Live Bitcoin price is temporarily unavailable.",
        )




# ---------- Bounded per-address in-memory caches ----------
_ADDRESS_CACHE_MAX_ENTRIES = 256
_ADDRESS_CACHE_RETENTION = timedelta(minutes=5)

# Structure: { address: {"value": List[dict], "fetched_at": datetime, "ttl": timedelta} }
_utxo_cache: Dict[str, Dict[str, Any]] = {}
_UTXO_TTL = timedelta(seconds=15)


def _prune_address_cache(cache: Dict[str, Dict[str, Any]], now: datetime) -> None:
    """
    Remove entries that have exceeded the stale-retention window and
    enforce a hard maximum number of attacker-controlled address keys.
    """
    cutoff = now - _ADDRESS_CACHE_RETENTION

    expired_keys = [
        key
        for key, entry in cache.items()
        if not entry.get("fetched_at") or entry["fetched_at"] < cutoff
    ]

    for key in expired_keys:
        cache.pop(key, None)

    overflow = len(cache) - _ADDRESS_CACHE_MAX_ENTRIES
    if overflow > 0:
        oldest_keys = sorted(
            cache,
            key=lambda key: cache[key].get("fetched_at") or datetime.min
        )[:overflow]

        for key in oldest_keys:
            cache.pop(key, None)


async def _fetch_mempool_address_utxos(address: str) -> List[Dict[str, Any]]:
    """
    Fetch UTXOs for a bech32/legacy address from mempool.space.
    Returns the raw list as provided by mempool (each item: {txid, vout, status{...}, value}).
    """
    url = f"https://mempool.space/api/address/{address}/utxo"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            # Basic sanity check: mempool returns a list; empty list means no spendable UTXOs
            if not isinstance(data, list):
                raise ValueError("Unexpected response shape (expected a list)")
            return data
    except (httpx.HTTPError, ValueError) as e:
        raise RuntimeError(str(e)) from e


@app.get("/bitcoin/address/{address}/utxo")
async def get_address_utxos(address: str, response: Response):
    """
    Proxy wrapper around mempool.space UTXO endpoint with a 15s per-address cache.

    - Returns EXACTLY the same payload shape as mempool.space: a JSON array of UTXO objects.
    - Adds metadata via HTTP headers:
        x-source: mempool endpoint used
        x-cached: "true" if served from cache
        x-stale: "true" if upstream failed and we served a stale cached value
        x-fetched-at: ISO8601 timestamp of the cached fetch
    """
    address = _require_bitcoin_address(address)
    now = datetime.utcnow()
    _prune_address_cache(_utxo_cache, now)
    cache = _utxo_cache.get(address)

    # Serve fresh cache if valid
    if cache and cache.get("value") is not None and cache.get("fetched_at") and (now - cache["fetched_at"] < cache["ttl"]):
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/utxo"
        response.headers["x-cached"] = "true"
        response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
        return cache["value"]

    # Refresh cache
    try:
        data = await _fetch_mempool_address_utxos(address)
        _utxo_cache[address] = {
            "value": data,
            "fetched_at": now,
            "ttl": _UTXO_TTL
        }
        _prune_address_cache(_utxo_cache, now)
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/utxo"
        response.headers["x-cached"] = "false"
        response.headers["x-fetched-at"] = now.isoformat() + "Z"
        return data
    except RuntimeError:
        # On upstream error, serve stale cache if available
        # without exposing upstream exception details.
        if cache and cache.get("value") is not None:
            response.headers["x-source"] = f"https://mempool.space/api/address/{address}/utxo"
            response.headers["x-cached"] = "true"
            response.headers["x-stale"] = "true"
            response.headers["x-warning"] = "Live UTXO data is temporarily unavailable."
            response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
            return cache["value"]

        # No cache to fall back on
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve UTXO information."
        )


# Structure: { cache_key: {"value": List[dict], "fetched_at": datetime, "ttl": timedelta} }
_txs_cache: Dict[str, Dict[str, Any]] = {}
_TXS_TTL = timedelta(seconds=15)


def _find_distribution_transaction(txs: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Return the first transaction that looks like the distribution tx:
    - contains an OP_RETURN output
    - has at least one CLTV output (P2SH addresses starting with '3')
    """
    for tx in txs or []:
        vouts = tx.get("vout") or []
        has_op_return = any(
            (vout or {}).get("scriptpubkey_type") == "op_return"
            for vout in vouts
        )
        has_cltv = any(
            isinstance((vout or {}).get("scriptpubkey_address"), str)
            and (vout.get("scriptpubkey_address") or "").startswith("3")
            for vout in vouts
        )
        if has_op_return and has_cltv:
            return tx
    return {}


async def _attach_outspend_data(
    tx: Dict[str, Any],
    client: httpx.AsyncClient,
) -> None:
    """
    Fetch `outspends` once for the distribution tx and annotate CLTV outputs with `spent`.
    """
    txid = tx.get("txid")
    if not txid:
        return

    url = f"https://mempool.space/api/tx/{txid}/outspends"
    try:
        resp = await client.get(url)
        resp.raise_for_status()
        outspends = resp.json()
        if not isinstance(outspends, list):
            return
    except httpx.HTTPError:
        return

    vouts = tx.get("vout") or []
    for idx, vout in enumerate(vouts):
        if not isinstance(vout, dict):
            continue
        address = vout.get("scriptpubkey_address") or ""
        if not (isinstance(address, str) and address.startswith("3")):
            continue
        spent_info = outspends[idx] if idx < len(outspends) else {}
        spent_flag = bool(spent_info.get("spent")) if isinstance(spent_info, dict) else False
        vout["spent"] = spent_flag


async def _attach_price(
    tx: Dict[str, Any],
    client: httpx.AsyncClient,
) -> None:
    """
    Fetch block mediantime + historical price exchange rates and store them under tx.status.
    """
    status = tx.get("status")
    if not isinstance(status, dict) or not status.get("confirmed"):
        return

    block_hash = status.get("block_hash") or status.get("block_id")
    if not block_hash:
        return

    try:
        block_resp = await client.get(f"https://mempool.space/api/block/{block_hash}")
        block_resp.raise_for_status()
        block_data = block_resp.json()
    except httpx.HTTPError:
        return

    mediantime = block_data.get("mediantime") or block_data.get("timestamp")
    if not mediantime:
        return

    try:
        price_resp = await client.get(
            "https://mempool.space/api/v1/historical-price",
            params={
                "currency": "USD",
                "timestamp": int(mediantime),
            },
        )
        price_resp.raise_for_status()
        price_data = price_resp.json()
    except (httpx.HTTPError, ValueError):
        return

    price = price_data.get("prices")
    if isinstance(price, list) and price:
        status["price"] = price


async def _fetch_mempool_address_txs(address: str) -> List[Dict[str, Any]]:
    """
    Fetch recent transactions for an address from mempool.space.
    Returns the raw list as provided by mempool (each item: tx object).
    """
    url = f"https://mempool.space/api/address/{address}/txs"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, list):
                raise ValueError("Unexpected response shape (expected a list)")

            target_tx: Dict[str, Any] = {}
            if address.startswith("3") and data:
                target_tx = data[0] or {}
            else:
                target_tx = _find_distribution_transaction(data)

            if target_tx:
                await _attach_outspend_data(target_tx, client)
                await _attach_price(target_tx, client)

            return data
    except (httpx.HTTPError, ValueError) as e:
        raise RuntimeError(str(e)) from e


@app.get("/bitcoin/address/{address}/txs")
async def get_address_txs(address: str, response: Response):
    """
    Proxy wrapper around mempool.space address TX endpoint with a 15s per-address cache.

    - Returns EXACTLY the same payload shape as mempool.space: a JSON array of tx objects.
    - Adds metadata via HTTP headers:
        x-source: mempool endpoint used
        x-cached: "true" if served from cache
        x-stale: "true" if upstream failed and we served a stale cached value
        x-fetched-at: ISO8601 timestamp of the cached fetch
    """
    address = _require_bitcoin_address(address)
    now = datetime.utcnow()

    # If later you add query params (pagination), include them in cache_key.
    cache_key = address
    _prune_address_cache(_txs_cache, now)
    cache = _txs_cache.get(cache_key)

    # Serve fresh cache if valid
    if cache and cache.get("value") is not None and cache.get("fetched_at") and (now - cache["fetched_at"] < cache["ttl"]):
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/txs"
        response.headers["x-cached"] = "true"
        response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
        return cache["value"]

    # Refresh cache
    try:
        data = await _fetch_mempool_address_txs(address)
        _txs_cache[cache_key] = {
            "value": data,
            "fetched_at": now,
            "ttl": _TXS_TTL
        }
        _prune_address_cache(_txs_cache, now)
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/txs"
        response.headers["x-cached"] = "false"
        response.headers["x-fetched-at"] = now.isoformat() + "Z"
        return data
    except RuntimeError:
        # On upstream error, serve stale cache if available
        # without exposing upstream exception details.
        if cache and cache.get("value") is not None:
            response.headers["x-source"] = f"https://mempool.space/api/address/{address}/txs"
            response.headers["x-cached"] = "true"
            response.headers["x-stale"] = "true"
            response.headers["x-warning"] = "Live transaction data is temporarily unavailable."
            response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
            return cache["value"]

        # No cache to fall back on
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve transaction information."
        )
# ---------- CSP violation reporting ----------
_CSP_MAX_REQUEST_BYTES = 16 * 1024
_CSP_MAX_REPORTS_PER_REQUEST = 20
_CSP_ALLOWED_CONTENT_TYPES = {
    "application/reports+json",
    "application/csp-report",
}
_CSP_ALLOWED_HOSTS = {
    "bc1q21.com",
    "www.bc1q21.com",
}
_CSP_LOGGER = logging.getLogger("gunicorn.error")


def _csp_clean_token(value: Any, max_length: int = 100) -> str:
    if not isinstance(value, str):
        return "unknown"

    cleaned = "".join(
        character
        for character in value.strip().lower()
        if character.isalnum() or character in {"-", "_"}
    )
    return cleaned[:max_length] or "unknown"


def _csp_page_path(value: Any) -> str:
    if not isinstance(value, str):
        return "unknown"

    try:
        parsed = urlsplit(value)
    except ValueError:
        return "unknown"

    if not parsed.hostname or parsed.hostname.lower() not in _CSP_ALLOWED_HOSTS:
        return "external"

    path = parsed.path or "/"
    cleaned = " ".join(path.split())
    return cleaned[:256] or "/"


def _csp_blocked_origin(value: Any) -> str:
    if not isinstance(value, str):
        return "unknown"

    candidate = value.strip()
    lowered = candidate.lower()

    if lowered in {"inline", "eval", "self", "data", "blob"}:
        return lowered

    try:
        parsed = urlsplit(candidate)
    except ValueError:
        return "unknown"

    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return f"{parsed.scheme}://{parsed.hostname.lower()}"

    return "other"


def _normalize_csp_report(item: Any) -> Dict[str, str] | None:
    if not isinstance(item, dict):
        return None

    legacy_body = item.get("csp-report")
    modern_body = item.get("body")

    if isinstance(legacy_body, dict):
        report_body = legacy_body
        directive = (
            report_body.get("effective-directive")
            or report_body.get("violated-directive")
        )
        blocked = report_body.get("blocked-uri")
        document = report_body.get("document-uri")
        disposition = report_body.get("disposition")
    elif item.get("type") == "csp-violation" and isinstance(modern_body, dict):
        report_body = modern_body
        directive = report_body.get("effectiveDirective")
        blocked = report_body.get("blockedURL")
        document = report_body.get("documentURL")
        disposition = report_body.get("disposition")
    else:
        return None

    return {
        "directive": _csp_clean_token(directive),
        "blocked": _csp_blocked_origin(blocked),
        "page": _csp_page_path(document),
        "disposition": _csp_clean_token(disposition, max_length=20),
    }


@app.post("/bitcoin/csp-report", status_code=204)
async def receive_csp_report(request: Request):
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > _CSP_MAX_REQUEST_BYTES:
                raise HTTPException(
                    status_code=413,
                    detail="CSP report is too large."
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid Content-Length header."
            )

    content_type = (
        request.headers.get("content-type", "")
        .split(";", 1)[0]
        .strip()
        .lower()
    )
    if content_type not in _CSP_ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported CSP report format."
        )

    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="CSP report is empty.")
    if len(body) > _CSP_MAX_REQUEST_BYTES:
        raise HTTPException(status_code=413, detail="CSP report is too large.")

    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid CSP report.")

    reports = payload if isinstance(payload, list) else [payload]
    for item in reports[:_CSP_MAX_REPORTS_PER_REQUEST]:
        normalized = _normalize_csp_report(item)
        if normalized is None:
            continue

        _CSP_LOGGER.info(
            "csp_violation directive=%s blocked=%s page=%s disposition=%s",
            normalized["directive"],
            normalized["blocked"],
            normalized["page"],
            normalized["disposition"],
        )

    return Response(status_code=204)

# ---------- Contact form abuse protection ----------
_CONTACT_MAX_REQUEST_BYTES = 16 * 1024
_CONTACT_MAX_NAME_LENGTH = 100
_CONTACT_MAX_EMAIL_LENGTH = 254
_CONTACT_MAX_MESSAGE_LENGTH = 5000
_CONTACT_ALLOWED_ORIGINS = {
    "https://bc1q21.com",
    "https://www.bc1q21.com",
}


@app.post("/bitcoin/contact")
async def contact_form(request: Request):
    # Reject obviously oversized requests before parsing the form.
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > _CONTACT_MAX_REQUEST_BYTES:
                raise HTTPException(status_code=413, detail="Contact request is too large.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid Content-Length header.")

    # Check the actual body size as a second line of defence.
    body = await request.body()
    if len(body) > _CONTACT_MAX_REQUEST_BYTES:
        raise HTTPException(status_code=413, detail="Contact request is too large.")

    # Block browser submissions originating from unrelated websites.
    # The Webflow-generated contact form can legitimately submit with
    # Origin: null, so allow that only when the browser also identifies
    # the request as same-origin. Requests without an Origin header remain
    # allowed for compatibility; nginx rate limiting is the primary
    # anti-automation control.
    origin = request.headers.get("origin")
    fetch_site = request.headers.get("sec-fetch-site")

    if origin == "null":
        if fetch_site != "same-origin":
            raise HTTPException(
                status_code=403,
                detail="Contact request origin is not allowed."
            )
    elif origin and origin not in _CONTACT_ALLOWED_ORIGINS:
        raise HTTPException(
            status_code=403,
            detail="Contact request origin is not allowed."
        )

    form = await request.form()

    name = str(form.get("name") or "Anonymous").strip()
    email_raw = str(form.get("email") or "").strip()
    message = str(form.get("field") or "").strip()

    if len(name) > _CONTACT_MAX_NAME_LENGTH:
        raise HTTPException(status_code=400, detail="Name is too long.")

    if "\r" in name or "\n" in name:
        raise HTTPException(status_code=400, detail="Name contains invalid characters.")

    if len(email_raw) > _CONTACT_MAX_EMAIL_LENGTH:
        raise HTTPException(status_code=400, detail="Email address is too long.")

    if "\r" in email_raw or "\n" in email_raw:
        raise HTTPException(status_code=400, detail="Email address contains invalid characters.")

    if email_raw and ("@" not in email_raw or email_raw.startswith("@") or email_raw.endswith("@")):
        raise HTTPException(status_code=400, detail="Email address is invalid.")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    if len(message) > _CONTACT_MAX_MESSAGE_LENGTH:
        raise HTTPException(status_code=400, detail="Message is too long.")

    email_display = email_raw or "No email provided"

    try:
        await run_in_threadpool(_send_contact_email, name, email_display, message)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to send message."
        )
    html = """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Message Sent</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.5; }
          .wrap { max-width: 600px; margin: 0 auto; }
          a { color: #0b57d0; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Thank you!</h1>
          <p>Your message has been sent. We'll get back to you shortly.</p>
          <p><a href="/">Return to homepage</a></p>
        </div>
      </body>
    </html>
    """
    return HTMLResponse(content=html, status_code=200)


def _send_contact_email(name: str, email: str, message: str) -> None:
    smtp_host = os.environ.get("SMTP_HOST", "mail.privateemail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "465"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_password = os.environ.get("SMTP_PASSWORD")
    contact_to = os.environ.get("CONTACT_TO") or smtp_user

    if not smtp_user or not smtp_password or not contact_to:
        raise RuntimeError("SMTP_USER, SMTP_PASSWORD, and CONTACT_TO (or SMTP_USER) must be set.")

    subject = f"New contact form submission from {name}"
    body = (
        f"Name: {name}\n"
        f"Email: {email}\n\n"
        f"Message:\n{message}\n"
    )

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = contact_to
    if email and "@" in email:
        msg["Reply-To"] = email
    msg.set_content(body)

    use_ssl_env = os.environ.get("SMTP_USE_SSL", "").strip().lower()
    use_ssl = (use_ssl_env in {"1", "true", "yes", "on"}) if use_ssl_env else smtp_port == 465

    context = ssl.create_default_context()
    if use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, context=context) as server:
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
