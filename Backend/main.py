from fastapi import FastAPI, Query, HTTPException, Response, Request
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Any, Dict, List
import os
import httpx
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.concurrency import run_in_threadpool
from pathlib import Path
from urllib.parse import quote_plus
import io
import qrcode
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PyPDF2 import PdfReader, PdfWriter
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

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:80",
    "http://127.0.0.1",
    "http://127.0.0.1:80",
    "https://www.bc1q21.com",
    "http://bc1q21.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,          # or ["*"] for quick dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_DIR  = Path(__file__).resolve().parent
GIFT_CARD_TEMPLATE = BACKEND_DIR / "giftcard.pdf"
GIFT_CARD_QR = {
    "size": 170,       # points ~= 2.36"
    "offset_x": 365,   # from left-bottom origin
    "offset_y": 140
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
    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


@app.get("/bitcoin/tx/{txid}/hex")
async def get_tx_hex(txid: str):
    """
    Proxy to fetch raw transaction hex from mempool.space.
    """
    try:
        url = f"https://mempool.space/api/tx/{txid}/hex"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return {"txid": txid, "hex": resp.text.strip()}
    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}

@app.post("/bitcoin/sendrawtransaction")
async def send_raw_transaction(raw: RawTx):
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    # Basic sanity check
    tx_hex = (raw.hex or "").strip()
    if not tx_hex or any(c not in "0123456789abcdefABCDEF" for c in tx_hex):
        return {"error": "Invalid or empty transaction hex."}

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
                # Typical errors: non-final, non-mandatory-script-verify, etc.
                return {"error": data["error"].get("message", "Unknown RPC error")}
            return {"txid": data.get("result")}
    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


@app.get("/bitcoin/scan-utxos")
async def scan_utxos(address: str = Query(..., description="P2SH address to scan")):
    rpc_url = os.environ["BITCOIN_RPC_URL"]
    rpc_user = os.environ["RPC_USER"]
    rpc_password = os.environ["RPC_PASSWORD"]

    try:
        async with httpx.AsyncClient() as client:
            # Step 1: Confirmed UTXOs from UTXO set
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

            # Step 2: Unconfirmed UTXOs from mempool
            mempool_resp = await client.post(
                rpc_url,
                json={
                    "jsonrpc": "1.0",
                    "id": "mempool",
                    "method": "getrawmempool",
                    "params": [True]  # returns full metadata
                },
                auth=(rpc_user, rpc_password),
                timeout=20.0
            )
            mempool_resp.raise_for_status()
            mempool = mempool_resp.json().get("result", {})

            mempool_utxos = []

            for txid in mempool:
                tx_resp = await client.post(
                    rpc_url,
                    json={
                        "jsonrpc": "1.0",
                        "id": "getrawtx",
                        "method": "getrawtransaction",
                        "params": [txid, True]
                    },
                    auth=(rpc_user, rpc_password),
                    timeout=10.0
                )
                tx_resp.raise_for_status()
                tx = tx_resp.json().get("result", {})
                for vout in tx.get("vout", []):
                    spk = vout.get("scriptPubKey", {})
                    if address in spk.get("addresses", []):
                        mempool_utxos.append({
                            "source": "mempool",
                            "txid": tx.get("txid"),
                            "vout": vout["n"],
                            "amount": vout["value"],
                            "height": None
                        })

            combined = [
                {
                    "source": "confirmed",
                    "txid": utxo["txid"],
                    "vout": utxo["vout"],
                    "amount": utxo["amount"],
                    "height": utxo.get("height", 0)
                }
                for utxo in confirmed_utxos
            ] + mempool_utxos

            return {
                "address": address,
                "utxos": combined
            }

    except httpx.HTTPError as e:
        return {"error": f"HTTP error: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


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
    qr_size = GIFT_CARD_QR["size"]
    c.drawImage(
        ImageReader(qr_buffer),
        221,
        93,
        width=130,
        height=130,
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
        raise FileNotFoundError("Gift card template is missing on the server. ")

    with GIFT_CARD_TEMPLATE.open("rb") as template_file:
        template_reader = PdfReader(template_file)
        writer = PdfWriter()

        if not template_reader.pages:
            raise ValueError("Gift card template contains no pages.")

        first_page = template_reader.pages[0]
        width = float(first_page.mediabox.width)
        height = float(first_page.mediabox.height)
        overlay_reader = _create_giftcard_overlay(width, height, recipient_url)
        first_page.merge_page(overlay_reader.pages[0])
        writer.add_page(first_page)

        for page in template_reader.pages[1:]:
            writer.add_page(page)

        output = io.BytesIO()
        writer.write(output)
        output.seek(0)
        return output


@app.get("/bitcoin/giftcard.pdf")
async def build_giftcard_pdf(
    request: Request,
    recipientUrl: str = Query(None, description="Absolute recipient page URL that should be encoded in the PDF QR code."),
    address: str = Query(None, description="Optional funding address used to build the recipient URL if recipientUrl is omitted.")
):
    recipient_url = (recipientUrl or "").strip()
    address_value = (address or "").strip()

    if not recipient_url and address_value:
        base_url = str(request.base_url).rstrip("/")
        recipient_url = f"{base_url}/app/gift/?address={quote_plus(address_value)}"

    if not recipient_url:
        raise HTTPException(status_code=400, detail="Provide either recipientUrl or address to build the giftcard PDF.")

    try:
        pdf_buffer = await run_in_threadpool(_build_giftcard_pdf_bytes, recipient_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to generate gift card PDF: {exc}")

    headers = {"Content-Disposition": 'inline; filename="giftcard.pdf"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)

# ---------- Simple in-memory cache for BTC price ----------
_price_cache = {
    "value": None,            # float (BTC in USD)
    "fetched_at": None,       # datetime
    "ttl": timedelta(seconds=20)
}

# ---------- Existing routes ----------

# ---------- New: BTC price (USD) ----------
async def _fetch_bitcoin_price_usd() -> float:
    """
    Calls K1's upstream rate service and returns BTC price in USD as float.
    Upstream shape:
      { "currencies": [ {"currency":"BTC","amount":...}, {"currency":"USD","amount":...}, ... ] }
    """
    url = "https://k1technology.net/api/ExchangeRate"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            btc = next((x for x in data.get("currencies", []) if x.get("currency") == "BTC"), None)
            usd = next((x for x in data.get("currencies", []) if x.get("currency") == "USD"), None)
            if not (btc and usd) or "amount" not in btc or "amount" not in usd:
                raise ValueError("Invalid exchange rate data")
            # If 'amount' means value per 1 unit of currency, USD/BTC gives price of 1 BTC in USD.
            price = usd["amount"] / btc["amount"]
            if not isinstance(price, (int, float)) or price <= 0:
                raise ValueError("Computed invalid BTC price")
            return float(price)
    except (httpx.HTTPError, ValueError) as e:
        # Let caller decide how to surface
        raise RuntimeError(str(e)) from e

@app.get("/bitcoin/price-usd")
async def bitcoin_price_usd():
    # Serve cached value if still fresh
    now = datetime.utcnow()
    if _price_cache["value"] is not None and _price_cache["fetched_at"] and (now - _price_cache["fetched_at"] < _price_cache["ttl"]):
        return {
            "btc_usd": _price_cache["value"],
            "cached": True,
            "fetched_at": _price_cache["fetched_at"].isoformat() + "Z",
            "source": "https://k1technology.net/api/ExchangeRate"
        }

    try:
        price = await _fetch_bitcoin_price_usd()
        _price_cache["value"] = price
        _price_cache["fetched_at"] = now
        return {
            "btc_usd": price,
            "cached": False,
            "fetched_at": now.isoformat() + "Z",
            "source": "https://k1technology.net/api/ExchangeRate"
        }
    except RuntimeError as e:
        # If we have a stale cached value, return it with a warning
        if _price_cache["value"] is not None:
            return {
                "btc_usd": _price_cache["value"],
                "cached": True,
                "stale": True,
                "warning": f"Upstream error: {str(e)}",
                "fetched_at": _price_cache["fetched_at"].isoformat() + "Z",
                "source": "https://k1technology.net/api/ExchangeRate"
            }
        return {"error": f"Price fetch failed: {str(e)}"}





# ---------- Simple per-address in-memory cache for UTXOs ----------
# Structure: { address: {"value": List[dict], "fetched_at": datetime, "ttl": timedelta} }
_utxo_cache: Dict[str, Dict[str, Any]] = {}
_UTXO_TTL = timedelta(seconds=15)

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
    now = datetime.utcnow()
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
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/utxo"
        response.headers["x-cached"] = "false"
        response.headers["x-fetched-at"] = now.isoformat() + "Z"
        return data
    except RuntimeError as e:
        # On upstream error, serve stale cache if available
        if cache and cache.get("value") is not None:
            response.headers["x-source"] = f"https://mempool.space/api/address/{address}/utxo"
            response.headers["x-cached"] = "true"
            response.headers["x-stale"] = "true"
            response.headers["x-warning"] = f"Upstream error: {str(e)}"
            response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
            return cache["value"]

        # No cache to fall back on
        raise HTTPException(status_code=502, detail=f"UTXO fetch failed: {str(e)}")




# ---------- Simple per-address in-memory cache for TXs ----------
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
            
            
            # ---- BEGIN LOCAL SHIM (easy to remove) ----
            # ---- BEGIN LOCAL SHIM (easy to remove) ----
            # ---- BEGIN LOCAL SHIM (easy to remove) ----
            TARGET_TXID = "99d4df65654d262c1e1230f1088684584496370b6ca466a450a49cd3e4126359"

            OP_RETURN_VOUT = {
                "scriptpubkey": (
                    "6a4053616c7465645f5f8d96c753cb757dd510c0fe694e7174bd53ca7668bd63"
                    "8873e00cb81cd2ed8adc205a90610743561319af6e707f4d419a041b1b2977cb882f"
                ),
                "scriptpubkey_asm": (
                    "OP_RETURN OP_PUSHBYTES_64 "
                    "53616c7465645f5f8d96c753cb757dd510c0fe694e7174bd53ca7668bd63"
                    "8873e00cb81cd2ed8adc205a90610743561319af6e707f4d419a041b1b2977cb882f"
                ),   
                "scriptpubkey_type": "op_return",
                "value": 0,
            }        

            for tx in data:
                if tx.get("txid") == TARGET_TXID:
                    vout = tx.setdefault("vout", [])
                    vout.append(OP_RETURN_VOUT)
                    break
            # ---- END LOCAL SHIM ----
            # ---- END LOCAL SHIM ----
            # ---- END LOCAL SHIM ----


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
    now = datetime.utcnow()

    # If later you add query params (pagination), include them in cache_key.
    cache_key = address
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
        response.headers["x-source"] = f"https://mempool.space/api/address/{address}/txs"
        response.headers["x-cached"] = "false"
        response.headers["x-fetched-at"] = now.isoformat() + "Z"
        return data
    except RuntimeError as e:
        # On upstream error, serve stale cache if available
        if cache and cache.get("value") is not None:
            response.headers["x-source"] = f"https://mempool.space/api/address/{address}/txs"
            response.headers["x-cached"] = "true"
            response.headers["x-stale"] = "true"
            response.headers["x-warning"] = f"Upstream error: {str(e)}"
            response.headers["x-fetched-at"] = cache["fetched_at"].isoformat() + "Z"
            return cache["value"]

        # No cache to fall back on
        raise HTTPException(status_code=502, detail=f"TX fetch failed: {str(e)}")


@app.post("/contact")
async def contact_form(request: Request):
    form = await request.form()
    name = (form.get("name") or "Anonymous").strip()
    email_raw = (form.get("email") or "").strip()
    message = (form.get("field") or "").strip()
    email_display = email_raw or "No email provided"

    try:
        await run_in_threadpool(_send_contact_email, name, email_display, message)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unable to send email: {exc}")

    return {"status": "success", "message": "Thank you for contacting us!"}



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
