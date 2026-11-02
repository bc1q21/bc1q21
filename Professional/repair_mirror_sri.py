#!/usr/bin/env python3
"""Reconcile SRI for Professional Retail Mirror against the checked-out Frontend.
Fail closed if a referenced file is missing. No Retail source files are modified.
Usage: py Professional/repair_mirror_sri.py
"""
from pathlib import Path
import base64
import hashlib
import re
import sys
from urllib.parse import urljoin, urlsplit, unquote

root = Path(__file__).resolve().parent.parent
target = root / "Professional" / "retail-mirror" / "index.html"
html = target.read_text(encoding="utf-8")
base_match = re.search(r'<base\s+href=["\']([^"\']+)["\']', html, re.I)
if not base_match:
    sys.exit("ERROR: base href not found; no changes made")
base_url = urljoin("/Professional/retail-mirror/index.html", base_match.group(1))
tag_re = re.compile(r'<(?:script|link)\b[^>]*>', re.I | re.S)
attr_re = re.compile(r'\b(?:src|href)\s*=\s*(["\'])(.*?)\1', re.I | re.S)
integrity_re = re.compile(r'\bintegrity\s*=\s*(["\'])sha384-[^"\']*\1', re.I)
counts = [0, 0]
missing = []

def replace_tag(match):
    tag = match.group(0)
    integrity = integrity_re.search(tag)
    source = attr_re.search(tag)
    if not integrity or not source:
        return tag
    uri = source.group(2)
    parts = urlsplit(urljoin(base_url, uri))
    if parts.scheme or parts.netloc:
        return tag  # Never alter third-party SRI.
    local = (root / unquote(parts.path).lstrip("/")).resolve()
    if not local.is_relative_to(root) or not local.is_file():
        missing.append(uri)
        return tag
    digest = base64.b64encode(hashlib.sha384(local.read_bytes()).digest()).decode("ascii")
    new = 'integrity="sha384-' + digest + '"'
    counts[0] += 1
    if tag[integrity.start():integrity.end()] != new:
        counts[1] += 1
    return tag[:integrity.start()] + new + tag[integrity.end():]

updated = tag_re.sub(replace_tag, html)
if missing:
    sys.exit("ERROR: Missing SRI resources (no changes made): " + ", ".join(missing))
if counts[0] < 10:
    sys.exit("ERROR: Too few SRI resources found; no changes made")
if updated != html:
    target.write_text(updated, encoding="utf-8")
print(f"Professional mirror SRI verified: {counts[0]} local resources, {counts[1]} corrected.")
print("Retail and main unchanged. Refresh the local Professional mirror after running.")
