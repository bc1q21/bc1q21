"""Professional browser smoke test. Run from a local checkout with:
    python -m pip install playwright
    python -m playwright install chromium
    python Professional/test_customer_browser_journey.py
Only static local pages and disposable preview data; no Bitcoin RPC or broadcast.
"""
import contextlib
import http.server
import json
import pathlib
import socketserver
import threading
import unittest

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLAN = {
    "format": "bc1q21-professional-retail-plan-preview-v1",
    "status": "UNFUNDED_PREVIEW_NOT_SIGNABLE",
    "signingAuthorized": False, "fundingAuthorized": False,
    "broadcastAuthorized": False, "totalSats": 50000,
    "releases": [{"date": "2030-01-02", "amountSats": 50000}],
}
SIGNED = {
    "format": "bc1q21-professional-verified-creator-preview-v1",
    "network": "regtest", "diagnosticOnly": True,
    "transactionVerified": True, "broadcast": False, "canBroadcast": False,
    "releaseCount": 1, "totalSats": 50000,
    "releases": [{"date": "2030-01-02", "amountSats": 50000}],
    "fundingInputCount": 1, "networkFeeSats": 150,
    "totalOutputCount": 2, "txid": "ab" * 32,
}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, *args):
        pass


class BrowserJourneyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = socketserver.TCPServer(("127.0.0.1", 0), QuietHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = "http://127.0.0.1:%s/Professional/" % cls.server.server_address[1]
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=3)

    def setUp(self):
        self.context = self.browser.new_context()
        self.page = self.context.new_page()

    def tearDown(self):
        self.context.close()

    def session(self, *, plan=None, verified=None):
        self.page.goto(self.base + "customer-walkthrough.html")
        data = {"bc1q21-professional-profile-draft": {"business": "Test Practice"}}
        if plan is not None:
            data["bc1q21-professional-approved-plan-preview"] = plan
        if verified is not None:
            data["bc1q21-professional-verified-creator-preview"] = verified
        self.page.evaluate("""data => {
            sessionStorage.clear();
            for (const [key, value] of Object.entries(data))
                sessionStorage.setItem(key, JSON.stringify(value));
        }""", data)

    def test_unfunded_plan_stays_unfunded(self):
        self.session(plan=PLAN)
        self.page.goto(self.base + "funding-workspace.html")
        self.assertTrue(self.page.locator("#customer-payment").is_visible())
        self.assertIn("50,000", self.page.locator("body").inner_text())
        self.page.goto(self.base + "finish-workspace.html")
        self.assertTrue(self.page.locator("#verified-transaction").is_hidden())
        self.assertIn("Not broadcast", self.page.locator("body").inner_text())

    def test_verified_regtest_preview_is_not_completion(self):
        self.session(plan=PLAN, verified=SIGNED)
        self.page.goto(self.base + "customer-walkthrough.html")
        self.assertIn("finish-workspace.html", self.page.locator("#progress-next").get_attribute("href"))
        self.page.locator("#progress-next").click()
        self.assertTrue(self.page.locator("#verified-transaction").is_visible())
        self.assertIn("Not broadcast", self.page.locator("body").inner_text())
        self.assertIn("Not issued", self.page.locator("body").inner_text())

    def test_changed_release_is_not_verified(self):
        altered = dict(SIGNED, releases=[{"date": "2030-01-03", "amountSats": 50000}])
        self.session(plan=PLAN, verified=altered)
        self.page.goto(self.base + "customer-walkthrough.html")
        self.assertNotIn("finish-workspace.html", self.page.locator("#progress-next").get_attribute("href"))
        self.page.goto(self.base + "finish-workspace.html")
        self.assertTrue(self.page.locator("#verified-transaction").is_hidden())

    def test_jade_without_handoff_is_locked(self):
        self.session(plan=PLAN)
        self.page.goto(self.base + "jade-signing-workspace.html")
        self.assertTrue(self.page.locator("#scan").is_disabled())
        self.assertTrue(self.page.locator("#verified-next").is_hidden())
        self.assertTrue(self.page.locator("#qr-panel").is_hidden())


if __name__ == "__main__":
    unittest.main()
