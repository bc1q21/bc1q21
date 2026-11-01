"""Immutable, local-only record of Professional regtest gift intents.

This is an inspection aid, NOT an approval service. The operator must first
independently validate the plan, recipient recovery and Jade wallet identity.
Neither a browser request nor this registry can authorize signing or broadcast.
"""
import hashlib
import json
import os
from pathlib import Path
import re


class IntentRegistryError(ValueError):
    pass


def _canonical(intent):
    if not isinstance(intent, dict) or intent.get("format") != "bc1q21-professional-funded-distribution-intent-v1" or intent.get("network") != "regtest":
        raise IntentRegistryError("Only Professional regtest distribution intents permitted")
    if intent.get("signed") is not False or intent.get("broadcastAuthorized") is not False:
        raise IntentRegistryError("Intent must remain unsigned and broadcast-disabled")
    inputs, gifts = intent.get("inputs"), intent.get("gifts")
    if not isinstance(inputs, list) or not inputs or not isinstance(gifts, list) or not gifts:
        raise IntentRegistryError("Nonempty funding inputs and gifts required")
    if len(inputs) > 100 or len(gifts) > 100:
        raise IntentRegistryError("Too many inputs or gifts")
    outpoints = []
    for item in inputs:
        if not isinstance(item, dict) or not isinstance(item.get("txid"), str) or not isinstance(item.get("vout"), int) or isinstance(item.get("vout"), bool):
            raise IntentRegistryError("Invalid funding outpoint")
        if (re.fullmatch(r"[0-9a-fA-F]{64}", item["txid"]) is None
                or not 0 <= item["vout"] <= 0xffffffff
                or type(item.get("valueSats")) is not int
                or item["valueSats"] <= 0):
            raise IntentRegistryError("Invalid funding outpoint or amount")
        outpoints.append((item["txid"].lower(), item["vout"]))
    if len(set(outpoints)) != len(outpoints):
        raise IntentRegistryError("Invalid or duplicate funding inputs")
    try:
        encoded = json.dumps(intent, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode("ascii")
    except (TypeError, ValueError, UnicodeError) as exc:
        raise IntentRegistryError("Intent is not canonical JSON") from exc
    if len(encoded) > 256_000:
        raise IntentRegistryError("Intent too large")
    return encoded


def fingerprint(intent):
    """Content address the exact plan; changing one field changes the identifier."""
    return hashlib.sha256(_canonical(intent)).hexdigest()


def register_inspection_intent(intent, directory, *, operator_confirmed=False):
    """Record a locally reviewed snapshot; never callable from an HTTP handler.

    operator_confirmed is an explicit human workflow acknowledgement, NOT
    independent cryptographic verification or broadcast authorization.
    """
    if operator_confirmed is not True:
        raise IntentRegistryError("Explicit offline operator review required")
    encoded = _canonical(intent)
    identifier = hashlib.sha256(encoded).hexdigest()
    root = Path(directory)
    if not root.is_dir() or root.is_symlink():
        raise IntentRegistryError("Existing non-symlink local registry directory required")
    if root.stat().st_mode & 0o077:
        raise IntentRegistryError("Registry directory must be private (mode 0700)")
    path = root / (identifier + ".json")
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    except FileExistsError as exc:
        raise IntentRegistryError("Intent already registered; immutable record") from exc
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(encoded)
            handle.flush()
            os.fsync(handle.fileno())
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return {"intentFingerprint": identifier, "inspectionOnly": True,
            "walletOriginAuthenticated": False, "recipientRecoveryReady": False,
            "broadcastAuthorized": False}


def load_inspection_intent(identifier, directory):
    """Read and hash-verify the immutable snapshot; never grant authority."""
    if not isinstance(identifier, str) or re.fullmatch(r"[0-9a-f]{64}", identifier) is None:
        raise IntentRegistryError("Invalid intent fingerprint")
    root = Path(directory)
    if not root.is_dir() or root.is_symlink():
        raise IntentRegistryError("Invalid registry directory")
    if root.stat().st_mode & 0o077:
        raise IntentRegistryError("Registry directory must be private (mode 0700)")
    path = root / (identifier + ".json")
    if path.is_symlink() or not path.is_file():
        raise IntentRegistryError("Registered intent not found")
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(fd, "rb") as handle:
        if os.fstat(handle.fileno()).st_mode & 0o077:
            raise IntentRegistryError("Registered intent file permissions are not private")
        data = handle.read(256_001)
    if len(data) > 256_000 or hashlib.sha256(data).hexdigest() != identifier:
        raise IntentRegistryError("Registered intent integrity check failed")
    try:
        intent = json.loads(data)
    except (UnicodeError, ValueError) as exc:
        raise IntentRegistryError("Corrupt registered intent") from exc
    if _canonical(intent) != data:
        raise IntentRegistryError("Registered intent is not canonical")
    return intent
