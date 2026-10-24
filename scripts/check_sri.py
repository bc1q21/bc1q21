#!/usr/bin/env python3
"""Fail closed if local SRI-protected frontend assets differ from their HTML hashes."""
import base64
import hashlib
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / "Frontend"

class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = []

    def handle_starttag(self, tag, attrs):
        if tag not in ("script", "link"):
            return
        a = dict(attrs)
        url = a.get("src") if tag == "script" else a.get("href")
        if not url:
            return
        parsed = urlsplit(url)
        if parsed.scheme or parsed.netloc or url.startswith("//") or url.startswith("#"):
            return
        # Check all local script sources, stylesheets and modulepreloads.
        if tag == "link" and a.get("rel", "").lower() not in ("stylesheet", "modulepreload"):
            return
        self.items.append((url, a.get("integrity")))

def main():
    failures = []
    count = 0
    pages = sorted(ROOT.rglob("*.html"))
    if not pages:
        raise SystemExit("FAIL: no frontend HTML pages found")
    for page in pages:
        parser = Assets()
        parser.feed(page.read_text(encoding="utf-8"))
        for url, integrity in parser.items:
            count += 1
            parsed = urlsplit(url)
            pathpart = unquote(parsed.path)
            if pathpart.startswith("/"):
                asset = ROOT / pathpart.lstrip("/")
            else:
                asset = page.parent / pathpart
            asset = asset.resolve()
            if not asset.is_relative_to(ROOT.resolve()):
                failures.append(f"{page.relative_to(ROOT)}: asset escapes frontend: {url}")
                continue
            if not asset.is_file():
                failures.append(f"{page.relative_to(ROOT)}: missing local asset: {url}")
                continue
            if not integrity:
                failures.append(f"{page.relative_to(ROOT)}: missing SRI: {url}")
                continue
            hashes = integrity.split()
            if not hashes or any(not h.startswith("sha384-") for h in hashes):
                failures.append(f"{page.relative_to(ROOT)}: expected SHA-384 SRI: {url}")
                continue
            actual = "sha384-" + base64.b64encode(hashlib.sha384(asset.read_bytes()).digest()).decode("ascii")
            if actual not in hashes:
                failures.append(f"{page.relative_to(ROOT)}: SRI mismatch: {url} (expected {actual})")
    for failure in failures:
        print("ERROR:", failure)
    print(f"Checked {count} local script/stylesheet/modulepreload references across {len(pages)} HTML pages.")
    if failures:
        raise SystemExit(f"FAIL: {len(failures)} asset integrity error(s)")
    print("PASS: all local asset SHA-384 integrity references match.")

if __name__ == "__main__":
    main()
