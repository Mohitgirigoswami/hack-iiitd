#!/usr/bin/env python3
"""
KhetOS (खेतOS) — Comprehensive 4-Tier E2E Test Suite
======================================================
Zero External Dependency Test Runner.
Derives all expected outputs strictly from ORIGINAL_REQUEST.md & PROJECT.md.

Tiers:
  Tier 1: Feature Coverage (Health, Client Build, API Routes, Fast-Gates, Bot Commands)
  Tier 2: Boundary & Corner Cases (Invalid Credentials, Unknown Phone, Role Mismatch, 404s, Empty Payloads)
  Tier 3: Cross-Feature Combinations (Lot Creation -> Bolero Lock, GPS -> Khet-PIN Sync, IVR Keypad, Bot Lots)
  Tier 4: Real-World Application Workloads (Full Farm-to-Mandi Operational Cycle)

Usage:
  python tests/test_e2e_suite.py
"""

import sys
import os
import json
import time
import sqlite3
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path

# Force UTF-8 on Windows stdout/stderr for Hindi characters
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Base directory configuration
BASE_DIR = Path(__file__).resolve().parent.parent
API_URL = os.environ.get("KHETOS_API_URL", "http://127.0.0.1:5000").rstrip("/")
CLIENT_DIST_DIR = BASE_DIR / "client" / "dist"
DB_PATH = BASE_DIR / "api" / "data" / "khetos.db"


class HTTPClient:
    """Zero-dependency HTTP client using urllib.request with JSON support."""

    def __init__(self, base_url: str, timeout: float = 10.0):
        self.base_url = base_url
        self.timeout = timeout

    def request(self, method: str, path: str, data: dict = None, headers: dict = None):
        url = f"{self.base_url}{path}" if path.startswith("/") else f"{self.base_url}/{path}"
        req_headers = {"User-Agent": "KhetOS-E2E-Runner/1.0"}
        if headers:
            req_headers.update(headers)

        encoded_data = None
        if data is not None:
            encoded_data = json.dumps(data).encode("utf-8")
            req_headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=encoded_data, headers=req_headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                status_code = resp.status
                body = resp.read().decode("utf-8")
                try:
                    json_data = json.loads(body)
                except Exception:
                    json_data = None
                return status_code, json_data, body
        except urllib.error.HTTPError as e:
            status_code = e.code
            body = e.read().decode("utf-8")
            try:
                json_data = json.loads(body)
            except Exception:
                json_data = None
            return status_code, json_data, body
        except Exception as e:
            return 0, None, f"{type(e).__name__}: {e}"

    def get(self, path: str, headers: dict = None):
        return self.request("GET", path, headers=headers)

    def post(self, path: str, data: dict = None, headers: dict = None):
        return self.request("POST", path, data=data, headers=headers)

    def put(self, path: str, data: dict = None, headers: dict = None):
        return self.request("PUT", path, data=data, headers=headers)

    def delete(self, path: str, headers: dict = None):
        return self.request("DELETE", path, headers=headers)


class TestResult:
    def __init__(self, test_id: str, tier: str, name: str):
        self.test_id = test_id
        self.tier = tier
        self.name = name
        self.passed = False
        self.duration_ms = 0.0
        self.error_message = ""


class KhetOSTestSuite:
    def __init__(self):
        self.client = HTTPClient(API_URL)
        self.results = []

    def run_test(self, test_id: str, tier: str, name: str, func):
        res = TestResult(test_id, tier, name)
        t0 = time.time()
        try:
            func()
            res.passed = True
        except AssertionError as ae:
            res.passed = False
            res.error_message = f"AssertionError: {ae}"
        except Exception as e:
            res.passed = False
            res.error_message = f"Unexpected Error: {type(e).__name__}: {e}"
        finally:
            res.duration_ms = (time.time() - t0) * 1000
            self.results.append(res)
            status_tag = "\033[92m[PASS]\033[0m" if res.passed else "\033[91m[FAIL]\033[0m"
            print(f"  {status_tag} {res.test_id}: {res.name} ({res.duration_ms:.1f}ms)")
            if not res.passed:
                print(f"         \033[91m--> {res.error_message}\033[0m")

    # =========================================================================
    # TIER 1: FEATURE COVERAGE
    # =========================================================================

    def test_t1_01_health_check(self):
        status, data, body = self.client.get("/api/health")
        assert status == 200, f"Expected HTTP 200, got {status} (Body: {body})"
        assert data.get("status") == "healthy", f"Expected status 'healthy', got {data.get('status')}"
        assert "KhetOS" in data.get("service", ""), f"Service name missing KhetOS: {data.get('service')}"

    def test_t1_02_client_build_artifacts(self):
        dist_index = CLIENT_DIST_DIR / "index.html"
        assert dist_index.exists(), f"Client build artifact missing: {dist_index}"
        content = dist_index.read_text(encoding="utf-8")
        assert "KhetOS" in content or "खेतOS" in content, "index.html does not contain KhetOS title"
        
        # Verify CSS bundle contains obsidian styling tokens
        assets_dir = CLIENT_DIST_DIR / "assets"
        assert assets_dir.exists(), f"Assets directory missing: {assets_dir}"
        css_files = list(assets_dir.glob("*.css"))
        assert len(css_files) > 0, "No CSS files found in client/dist/assets"
        css_text = css_files[0].read_text(encoding="utf-8")
        assert "--color-bg" in css_text or "background" in css_text, "CSS token variables missing in bundle"

    def test_t1_03_core_state(self):
        status, data, body = self.client.get("/api/state")
        assert status == 200, f"Expected HTTP 200, got {status} (Body: {body})"
        assert "active_pool" in data, "Missing 'active_pool' in state"
        pool = data["active_pool"]
        assert pool.get("pool_id") == "POOL-ROH-104", f"Unexpected pool_id: {pool.get('pool_id')}"
        assert pool.get("target_capacity_kg") == 1500.0, f"Unexpected target capacity: {pool.get('target_capacity_kg')}"
        assert "lots" in data, "Missing 'lots' in state"

    def test_t1_04_mandi_prices_feed(self):
        status, data, _ = self.client.get("/api/prices?crop=Mustard")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert data.get("modal_price") == 5420.0, f"Expected modal price 5420.0, got {data.get('modal_price')}"
        assert data.get("min_price") == 5200.0, f"Expected min price 5200.0, got {data.get('min_price')}"
        assert data.get("max_price") == 5580.0, f"Expected max price 5580.0, got {data.get('max_price')}"
        assert data.get("local_trader_price") == 4700.0, f"Expected local trader 4700.0, got {data.get('local_trader_price')}"
        # Validate net farmer advantage calculation (+720)
        assert data.get("modal_price") - data.get("local_trader_price") == 720.0

    def test_t1_05_farmer_user_profile(self):
        encoded_phone = urllib.parse.quote("+91 98123 45099")
        status, data, _ = self.client.get(f"/api/user/profile?phone={encoded_phone}")
        assert status == 200, f"Expected HTTP 200, got {status}"
        user = data.get("user", {})
        assert user.get("name") == "Ramu Sharma", f"Expected Ramu Sharma, got {user.get('name')}"
        assert user.get("khet_pin") == "HR-ROH-91P2", f"Expected HR-ROH-91P2, got {user.get('khet_pin')}"
        assert user.get("village") == "Najafgarh", f"Expected Najafgarh, got {user.get('village')}"

    def test_t1_06_farmer_lots_route(self):
        encoded_phone = urllib.parse.quote("+91 98123 45099")
        status, data, _ = self.client.get(f"/api/farmer/lots?phone={encoded_phone}")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert "lots" in data, "Missing 'lots' key in response"
        assert isinstance(data["lots"], list), "Expected 'lots' to be a list"

    def test_t1_07_notifications_feed(self):
        status, data, _ = self.client.get("/api/notifications")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert "notifications" in data, "Missing 'notifications' in response"
        assert isinstance(data["notifications"], list)

    def test_t1_08_backhaul_plans(self):
        status, data, _ = self.client.get("/api/backhaul/plans")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert "schedules" in data, "Missing 'schedules' in response"
        assert len(data["schedules"]) >= 1, "Expected at least 1 backhaul schedule"

    def test_t1_09_backhaul_manifest(self):
        status, data, _ = self.client.get("/api/backhaul/manifest")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert data.get("status") == "PRE_CONTRACTED_B2B_LOCKED"
        assert data.get("khali_phera_eliminated") is True, "khali_phera_eliminated should be True"
        assert data.get("total_backhaul_weight_kg") == 1000

    def test_t1_10_drivers_directory(self):
        status, data, _ = self.client.get("/api/drivers")
        assert status == 200, f"Expected HTTP 200, got {status}"
        drivers = data.get("drivers", [])
        driver_names = [d.get("name") for d in drivers]
        assert "Baljit Singh" in driver_names, f"Baljit Singh not in drivers: {driver_names}"

    def test_t1_11_buyers_directory(self):
        status, data, _ = self.client.get("/api/buyers")
        assert status == 200, f"Expected HTTP 200, got {status}"
        buyers = data.get("buyers", [])
        buyer_companies = [b.get("company_name") for b in buyers]
        assert "Shree Ram Flour & Oil Mill" in buyer_companies, f"Shree Ram Flour not in buyers: {buyer_companies}"

    def test_t1_12_stakeholders_directory(self):
        status, data, _ = self.client.get("/api/stakeholders/directory")
        assert status == 200, f"Expected HTTP 200, got {status}"
        counts = data.get("directory", {}).get("counts", {})
        assert counts.get("farmers", 0) >= 3, "Expected at least 3 farmers"
        assert counts.get("drivers", 0) >= 2, "Expected at least 2 drivers"
        assert counts.get("buyers", 0) >= 2, "Expected at least 2 buyers"
        assert counts.get("admins", 0) >= 1, "Expected at least 1 admin"

    def test_t1_13_weather_telemetry(self):
        status, data, _ = self.client.get("/api/weather")
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert "temperature_c" in data
        assert "humidity_pct" in data
        assert data.get("tarpaulin_protocol") in ["MANDATORY_TIE_DOWN", "STANDBY_CLEAR"]

    def test_t1_14_fast_gate_driver(self):
        payload = {"phone": "+91 94160 88219", "pin": "1234", "role": "DRIVER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 200, f"Driver fast-gate failed: status {status}"
        assert data.get("user", {}).get("role") == "DRIVER"
        assert data.get("user", {}).get("name") == "Baljit Singh"

    def test_t1_15_fast_gate_buyer(self):
        payload = {"phone": "+91 98111 22334", "pin": "1234", "role": "BUYER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 200, f"Buyer fast-gate failed: status {status}"
        assert data.get("user", {}).get("role") == "BUYER"
        assert "Shree Ram" in data.get("user", {}).get("company_name", "")

    def test_t1_16_fast_gate_admin(self):
        payload = {"phone": "+91 11 2769 1100", "pin": "2026", "role": "ADMIN"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 200, f"Admin fast-gate failed: status {status}"
        assert data.get("user", {}).get("role") == "ADMIN"
        assert "Vivek" in data.get("user", {}).get("name", "")

    def test_t1_17_fast_gate_farmer(self):
        payload = {"phone": "+91 98123 45099", "pin": "1234", "role": "FARMER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 200, f"Farmer fast-gate failed: status {status}"
        assert data.get("user", {}).get("role") == "FARMER"
        assert data.get("user", {}).get("name") == "Ramu Sharma"

    def test_t1_18_bot_command_start(self):
        payload = {"phone": "+91 98123 45099", "text": "/start"}
        status, data, _ = self.client.post("/api/telegram/bot/command", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        reply = data.get("reply", "")
        assert "KhetOS" in reply or "खेतOS" in reply, f"Reply missing KhetOS branding: {reply}"
        assert "खेतपिन" in reply or "HR-ROH" in reply, f"Reply missing Khet-PIN: {reply}"

    def test_t1_19_bot_command_mandi(self):
        payload = {"phone": "+91 98123 45099", "text": "/mandi"}
        status, data, _ = self.client.post("/api/telegram/bot/command", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        reply = data.get("reply", "")
        assert "आज़ादपुर" in reply, f"Reply missing Azadpur: {reply}"
        assert "5420" in reply, f"Reply missing modal price 5420: {reply}"
        assert "720" in reply, f"Reply missing profit arbitrage 720: {reply}"

    def test_t1_20_bot_command_mystock(self):
        payload = {"phone": "+91 98123 45099", "text": "/mystock"}
        status, data, _ = self.client.post("/api/telegram/bot/command", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert data.get("status") == "SUCCESS"
        assert len(data.get("reply", "")) > 10

    # =========================================================================
    # TIER 2: BOUNDARY & CORNER CASES
    # =========================================================================

    def test_t2_01_auth_invalid_pin(self):
        payload = {"phone": "+91 94160 88219", "pin": "9999", "role": "DRIVER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 401, f"Expected HTTP 401 for wrong PIN, got {status}"
        assert data.get("message") == "Invalid PIN code"

    def test_t2_02_auth_unknown_phone(self):
        payload = {"phone": "+91 00000 00000", "pin": "1234", "role": "DRIVER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 401, f"Expected HTTP 401 for unknown phone, got {status}"
        assert "User phone not registered" in data.get("message", "")

    def test_t2_03_auth_role_mismatch(self):
        payload = {"phone": "+91 94160 88219", "pin": "1234", "role": "BUYER"}
        status, data, _ = self.client.post("/api/auth/login", payload)
        assert status == 401, f"Expected HTTP 401 for role mismatch, got {status}"
        assert "role mismatch" in data.get("message", "").lower()

    def test_t2_04_auth_empty_credentials(self):
        payload = {"phone": "", "pin": ""}
        status, _, _ = self.client.post("/api/auth/login", payload)
        assert status == 401, f"Expected HTTP 401 for empty credentials, got {status}"

    def test_t2_05_profile_unknown_phone(self):
        encoded_phone = urllib.parse.quote("+91 00000 00000")
        status, data, _ = self.client.get(f"/api/user/profile?phone={encoded_phone}")
        assert status == 404, f"Expected HTTP 404, got {status}"
        assert data.get("status") == "NOT_FOUND"

    def test_t2_06_ivr_call_session_unregistered_caller(self):
        payload = {"caller_phone": "+91 88888 77777"}
        status, data, _ = self.client.post("/api/call/session", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert data.get("status") == "NEW_CALLER_REGISTRATION_REQUIRED"
        assert data.get("is_registered") is False

    def test_t2_07_ivr_keypad_unknown_digit(self):
        payload = {"caller_phone": "+91 98123 45099", "digit": "9"}
        status, data, _ = self.client.post("/api/call/keypad", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        assert data.get("status") == "UNKNOWN_DIGIT"
        assert "कृपया सही बटन दबाएं" in data.get("voice_prompt_hi", "")

    def test_t2_08_tts_empty_text(self):
        payload = {"text": ""}
        status, data, _ = self.client.post("/api/tts", payload)
        assert status == 400, f"Expected HTTP 400 for empty TTS text, got {status}"
        assert "error" in data

    def test_t2_09_update_nonexistent_lot(self):
        payload = {"lot_id": "LOT-NONEXISTENT-999", "quantity_quintals": 5.0}
        status, _, _ = self.client.put("/api/farmer/lot/update", payload)
        assert status == 404, f"Expected HTTP 404 for updating nonexistent lot, got {status}"

    def test_t2_10_delete_nonexistent_lot(self):
        status, _, _ = self.client.delete("/api/farmer/lot/LOT-NONEXISTENT-999")
        assert status == 404, f"Expected HTTP 404 for deleting nonexistent lot, got {status}"

    def test_t2_11_driver_inspect_nonexistent_lot(self):
        payload = {"lot_id": "LOT-NONEXISTENT-999", "action": "APPROVE"}
        status, _, _ = self.client.post("/api/driver/inspect", payload)
        assert status == 404, f"Expected HTTP 404 for inspecting nonexistent lot, got {status}"

    def test_t2_12_boundary_lot_quantity(self):
        # Test minimum fractional lot creation (0.5 Quintal / 1 50kg bag)
        payload = {
            "phone": "+91 98123 45099",
            "crop": "Mustard",
            "quantity_quintals": 0.5,
            "channel": "test_boundary"
        }
        status, data, _ = self.client.post("/api/farmer/lot/create", payload)
        assert status == 200, f"Expected HTTP 200, got {status}"
        lot = data.get("lot", {})
        assert lot.get("bags_count") == 1, f"Expected 1 bag for 0.5 Qtl, got {lot.get('bags_count')}"
        lot_id = lot.get("lot_id")
        
        # Cleanup
        if lot_id:
            del_status, _, _ = self.client.delete(f"/api/farmer/lot/{lot_id}")
            assert del_status == 200, f"Failed to cleanup boundary lot: {del_status}"

    # =========================================================================
    # TIER 3: CROSS-FEATURE COMBINATIONS
    # =========================================================================

    def test_t3_01_lot_creation_bolero_capacity_lock(self):
        # 1. Inspect initial state (should be 1100kg, 73.3%, ACCEPTING_LOTS)
        _, init_state, _ = self.client.get("/api/state")
        init_pool = init_state["active_pool"]
        assert init_pool["status"] == "ACCEPTING_LOTS", f"Expected ACCEPTING_LOTS initially, got {init_pool['status']}"
        assert init_pool["current_loaded_kg"] == 1100.0, f"Expected 1100.0 kg initially, got {init_pool['current_loaded_kg']}"

        # 2. Add 4.0 Quintal lot (400 kg) to hit exactly 1500 kg (100%)
        create_payload = {
            "phone": "+91 98123 45099",
            "crop": "Mustard",
            "quantity_quintals": 4.0,
            "channel": "e2e_test_tier3"
        }
        status, create_data, _ = self.client.post("/api/farmer/lot/create", create_payload)
        assert status == 200, f"Failed to create lot: {status}"
        created_lot = create_data.get("lot", {})
        lot_id = created_lot.get("lot_id")
        assert lot_id, "No lot_id returned"

        # 3. Assert active pool is now 100% and FULL_DISPATCH_LOCKED
        _, post_state, _ = self.client.get("/api/state")
        locked_pool = post_state["active_pool"]
        assert locked_pool["current_loaded_kg"] == 1500.0, f"Expected 1500.0 kg, got {locked_pool['current_loaded_kg']}"
        assert locked_pool["capacity_percentage"] == 100.0, f"Expected 100%, got {locked_pool['capacity_percentage']}%"
        assert locked_pool["status"] == "FULL_DISPATCH_LOCKED", f"Expected FULL_DISPATCH_LOCKED, got {locked_pool['status']}"

        # 4. Clean up: Delete the test lot and verify pool reverts to 1100 kg & ACCEPTING_LOTS
        del_status, _, _ = self.client.delete(f"/api/farmer/lot/{lot_id}")
        assert del_status == 200, f"Failed to delete test lot: {del_status}"

        _, revert_state, _ = self.client.get("/api/state")
        revert_pool = revert_state["active_pool"]
        assert revert_pool["current_loaded_kg"] == 1100.0, f"Expected 1100.0 kg, got {revert_pool['current_loaded_kg']}"
        assert revert_pool["status"] == "ACCEPTING_LOTS", f"Expected ACCEPTING_LOTS, got {revert_pool['status']}"

    def test_t3_02_gps_khetpin_database_sync(self):
        # 1. Register a new farmer via IVR location/village choice
        test_phone = "+91 98765 00001"
        reg_payload = {
            "caller_phone": test_phone,
            "farmer_name": "Kishan Lal Test",
            "village_choice": "1",  # Bhalaut
            "voice_breadcrumb_text": "Shiv Mandir ke paas se canal road"
        }
        status, reg_data, _ = self.client.post("/api/call/register", reg_payload)
        assert status == 200, f"Failed to register caller: {status}"
        assert reg_data.get("status") == "REGISTRATION_SUCCESSFUL"
        khet_pin = reg_data.get("khet_pin")
        assert khet_pin.startswith("HR-ROH-"), f"Expected KhetPin format HR-ROH-*, got {khet_pin}"

        # 2. Check profile endpoint returns the same registered Khet-PIN
        encoded_phone = urllib.parse.quote(test_phone)
        p_status, p_data, _ = self.client.get(f"/api/user/profile?phone={encoded_phone}")
        assert p_status == 200, f"Failed to fetch profile: {p_status}"
        assert p_data.get("user", {}).get("khet_pin") == khet_pin

        # 3. Direct SQLite verification on users table
        assert DB_PATH.exists(), f"Database not found at {DB_PATH}"
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        cursor.execute("SELECT phone, name, khet_pin, village FROM users WHERE phone = ?", (test_phone,))
        row = cursor.fetchone()
        conn.close()
        assert row is not None, f"User {test_phone} not found in SQLite"
        assert row[0] == test_phone
        assert row[1] == "Kishan Lal Test"
        assert row[2] == khet_pin
        assert row[3] == "Bhalaut"

    def test_t3_03_ivr_stock_keypad_recalculation(self):
        caller_phone = "+91 98123 45099"
        # 1. Request stock submenu (key 3)
        status, data, _ = self.client.post("/api/call/keypad", {"caller_phone": caller_phone, "digit": "3"})
        assert status == 200
        assert data.get("status") == "STOCK_SUBMENU"
        assert "user_lots" in data

        # 2. Multi-key 31: Increment/create stock
        status_inc, data_inc, _ = self.client.post("/api/call/keypad", {"caller_phone": caller_phone, "digit": "31"})
        assert status_inc == 200
        assert data_inc.get("status") == "STOCK_INCREASED"
        inc_lot = data_inc.get("lot", {})
        assert inc_lot.get("bags_count") >= 2

        # 3. Multi-key 32: Decrement stock back by 1 quintal
        status_dec, data_dec, _ = self.client.post("/api/call/keypad", {"caller_phone": caller_phone, "digit": "32"})
        assert status_dec == 200
        assert data_dec.get("status") == "STOCK_DECREASED"

        # 4. Multi-key 33: Cancel and delete lot with 0 penalty (guarantees clean teardown)
        status_del, data_del, _ = self.client.post("/api/call/keypad", {"caller_phone": caller_phone, "digit": "33"})
        assert status_del == 200
        assert data_del.get("status") == "LOT_CANCELLED"
        assert "शून्य पेनाल्टी" in data_del.get("voice_prompt_hi", "")

    def test_t3_04_telegram_bot_lot_crud_sync(self):
        phone = "+91 98123 45099"
        # 1. Add 2.0 Quintal lot via Telegram bot command
        add_status, add_data, _ = self.client.post("/api/telegram/bot/command", {"phone": phone, "text": "/addlot 2.0 Mustard"})
        assert add_status == 200, f"Expected add_status 200, got {add_status} (Data: {add_data})"
        reply = add_data.get("reply", "")
        assert "लॉट #" in reply, f"Add reply did not contain 'लॉट #': {reply}"

        # 2. Extract lot_id from reply text (format: "लॉट #LOT-XXXX ...")
        lot_id = None
        for word in reply.replace("#", " #").split():
            if word.startswith("#LOT-") or word.startswith("LOT-"):
                lot_id = word.lstrip("#").rstrip(" ,.:;!?")
                break
        assert lot_id, f"Could not extract lot_id from bot reply: {reply}"

        # 3. Verify lot exists in farmer lots
        encoded_phone = urllib.parse.quote(phone)
        lots_status, lots_data, _ = self.client.get(f"/api/farmer/lots?phone={encoded_phone}")
        assert lots_status == 200, f"Expected lots_status 200, got {lots_status}"
        lot_ids = [l.get("lot_id") for l in lots_data.get("lots", [])]
        assert lot_id in lot_ids, f"Created lot {lot_id} not in user lots {lot_ids}"

        # 4. Delete lot via bot command /dellot [lot_id]
        del_status, del_data, _ = self.client.post("/api/telegram/bot/command", {"phone": phone, "text": f"/dellot {lot_id}"})
        assert del_status == 200, f"Expected del_status 200, got {del_status} (Data: {del_data})"
        del_reply = del_data.get("reply", "")
        assert "हटा दिया गया है" in del_reply, f"Del reply did not contain 'हटा दिया गया है': {del_reply}"
        assert "₹0 पेनाल्टी" in del_reply, f"Del reply did not contain '₹0 पेनाल्टी': {del_reply}"

    # =========================================================================
    # TIER 4: REAL-WORLD APPLICATION WORKLOADS
    # =========================================================================

    def test_t4_01_full_farm_to_mandi_cycle(self):
        """
        Executes complete end-to-end farm-to-mandi operational cycle:
        1. Farmer Login via fast-gate
        2. Mandi Price intelligence fetch (Azadpur APMC ₹5420 vs local ₹4700)
        3. Lot addition (4.0 Qtl) -> Bolero capacity recalculation (hits 1500kg / 100%)
        4. Bolero Dispatch status lock verification (FULL_DISPATCH_LOCKED)
        5. Transporter inspection and lot load approval
        6. Return backhaul 1-day prior pre-allocation check (0% Khali Phera)
        7. Institutional Buyer login, order placement & escrow authorization
        8. System reset back to clean initial state
        """
        # Step 1: Farmer Login
        login_st, login_data, _ = self.client.post("/api/auth/login", {
            "phone": "+91 98123 45099", "pin": "1234", "role": "FARMER"
        })
        assert login_st == 200, f"Farmer login failed with status {login_st}"
        assert login_data.get("user", {}).get("name") == "Ramu Sharma"

        # Step 2: Mandi Price Fetch
        p_st, p_data, _ = self.client.get("/api/prices?crop=Mustard")
        assert p_st == 200, f"Price fetch failed with status {p_st}"
        assert p_data.get("modal_price") == 5420.0
        assert p_data.get("local_trader_price") == 4700.0

        # Step 3: Farmer Adds Lot to Bolero Pool (4.0 Quintals)
        lot_st, lot_data, _ = self.client.post("/api/farmer/lot/create", {
            "phone": "+91 98123 45099",
            "crop": "Mustard",
            "quantity_quintals": 4.0,
            "channel": "e2e_workload_cycle"
        })
        assert lot_st == 200, f"Lot creation failed with status {lot_st}"
        created_lot = lot_data.get("lot", {})
        lot_id = created_lot.get("lot_id")
        assert lot_id, "Missing lot_id in lot creation response"

        # Step 4: Verify Bolero Pool Capacity hits 100% and Locks
        pool_st, state_data, _ = self.client.get("/api/state")
        assert pool_st == 200, f"State fetch failed with status {pool_st}"
        pool = state_data.get("active_pool", {})
        assert pool.get("current_loaded_kg") == 1500.0, f"Expected 1500.0 kg, got {pool.get('current_loaded_kg')}"
        assert pool.get("capacity_percentage") == 100.0, f"Expected 100.0%, got {pool.get('capacity_percentage')}"
        assert pool.get("status") == "FULL_DISPATCH_LOCKED", f"Expected FULL_DISPATCH_LOCKED, got {pool.get('status')}"

        # Step 5: Transporter Quality Inspection
        insp_st, insp_data, _ = self.client.post("/api/driver/inspect", {
            "lot_id": lot_id,
            "action": "APPROVE"
        })
        assert insp_st == 200, f"Inspection failed with status {insp_st}"
        assert insp_data.get("lot", {}).get("status") == "LOADED_ON_TRUCK"

        # Step 6: Verify 1-Day Prior Return Backhaul
        bh_st, bh_data, _ = self.client.get("/api/backhaul/manifest")
        assert bh_st == 200, f"Backhaul check failed with status {bh_st}"
        assert bh_data.get("khali_phera_eliminated") is True
        assert bh_data.get("transporter_backhaul_earning_rs") == 850

        # Step 7: Institutional Buyer Login & Order Fulfillment
        buyer_st, buyer_login, _ = self.client.post("/api/auth/login", {
            "phone": "+91 98111 22334", "pin": "1234", "role": "BUYER"
        })
        assert buyer_st == 200, f"Buyer login failed with status {buyer_st}"

        order_st, order_data, _ = self.client.post("/api/buyer/order", {
            "buyer_name": "Shree Ram Flour & Oil Mill",
            "quantity_quintals": 11.0,
            "bid_price": 5420.0
        })
        assert order_st == 200, f"Buyer order failed with status {order_st}"
        assert order_data.get("status") == "ORDER_MATCHED"

        # Escrow Payment Authorization
        pay_st, pay_data, _ = self.client.post("/api/buyer/create-payment", {
            "amount_rs": 50000.0,
            "order_id": order_data.get("order", {}).get("order_id", "ORD-E2E-1"),
            "buyer_name": "Shree Ram Flour & Oil Mill"
        })
        assert pay_st == 200, f"Escrow payment creation failed with status {pay_st}"
        assert "order_id" in pay_data or "amount_rs" in pay_data

        # Step 8: Clean up by deleting the workload lot
        del_st, _, _ = self.client.delete(f"/api/farmer/lot/{lot_id}")
        assert del_st == 200, f"Cleanup delete failed with status {del_st}"

        # Confirm pool has safely reverted back to 1100 kg & ACCEPTING_LOTS
        _, final_state, _ = self.client.get("/api/state")
        final_pool = final_state.get("active_pool", {})
        assert final_pool.get("current_loaded_kg") == 1100.0, f"Expected 1100.0 kg after cleanup, got {final_pool.get('current_loaded_kg')}"
        assert final_pool.get("status") == "ACCEPTING_LOTS", f"Expected ACCEPTING_LOTS, got {final_pool.get('status')}"

    # =========================================================================
    # SUITE EXECUTION & REPORTING
    # =========================================================================

    def run_all(self):
        print("=" * 80)
        print("KHETOS (खेतOS) 4-TIER E2E TEST SUITE RUNNER")
        print(f"Target API Engine: {API_URL}")
        print(f"SQLite Database:   {DB_PATH}")
        print("=" * 80)

        # Baseline Reset to guarantee clean initial state
        reset_st, _, _ = self.client.post("/api/reset", {})
        if reset_st != 200:
            print(f"[Warning] Initial state reset returned status {reset_st}")

        # Tier 1
        print("\n\033[1m[TIER 1: FEATURE COVERAGE]\033[0m")
        self.run_test("T1_01", "Tier 1", "System Health Endpoint (/api/health)", self.test_t1_01_health_check)
        self.run_test("T1_02", "Tier 1", "Client Production Build Artifacts (HTML/CSS)", self.test_t1_02_client_build_artifacts)
        self.run_test("T1_03", "Tier 1", "Core System State (/api/state)", self.test_t1_03_core_state)
        self.run_test("T1_04", "Tier 1", "Mandi Price Intelligence Feed (/api/prices)", self.test_t1_04_mandi_prices_feed)
        self.run_test("T1_05", "Tier 1", "Farmer User Profile (/api/user/profile)", self.test_t1_05_farmer_user_profile)
        self.run_test("T1_06", "Tier 1", "Farmer Harvest Lots Feed (/api/farmer/lots)", self.test_t1_06_farmer_lots_route)
        self.run_test("T1_07", "Tier 1", "Dual-Channel Notifications (/api/notifications)", self.test_t1_07_notifications_feed)
        self.run_test("T1_08", "Tier 1", "1-Day Prior Backhaul Schedules (/api/backhaul/plans)", self.test_t1_08_backhaul_plans)
        self.run_test("T1_09", "Tier 1", "Backhaul Locked Manifest (/api/backhaul/manifest)", self.test_t1_09_backhaul_manifest)
        self.run_test("T1_10", "Tier 1", "Drivers Directory (/api/drivers)", self.test_t1_10_drivers_directory)
        self.run_test("T1_11", "Tier 1", "Institutional Buyers Directory (/api/buyers)", self.test_t1_11_buyers_directory)
        self.run_test("T1_12", "Tier 1", "Stakeholders Unified Directory (/api/stakeholders/directory)", self.test_t1_12_stakeholders_directory)
        self.run_test("T1_13", "Tier 1", "Corridor Weather & Tarpaulin Advisory (/api/weather)", self.test_t1_13_weather_telemetry)
        self.run_test("T1_14", "Tier 1", "Fast-Gate Login: Baljit Singh (Transporter)", self.test_t1_14_fast_gate_driver)
        self.run_test("T1_15", "Tier 1", "Fast-Gate Login: Shree Ram Mill (Buyer)", self.test_t1_15_fast_gate_buyer)
        self.run_test("T1_16", "Tier 1", "Fast-Gate Login: Dr. Vivek Swaminathan (Admin)", self.test_t1_16_fast_gate_admin)
        self.run_test("T1_17", "Tier 1", "Fast-Gate Login: Ramu Sharma (Farmer)", self.test_t1_17_fast_gate_farmer)
        self.run_test("T1_18", "Tier 1", "Telegram Bot Command: /start", self.test_t1_18_bot_command_start)
        self.run_test("T1_19", "Tier 1", "Telegram Bot Command: /mandi", self.test_t1_19_bot_command_mandi)
        self.run_test("T1_20", "Tier 1", "Telegram Bot Command: /mystock", self.test_t1_20_bot_command_mystock)

        # Tier 2
        print("\n\033[1m[TIER 2: BOUNDARY & CORNER CASES]\033[0m")
        self.run_test("T2_01", "Tier 2", "Auth Gate: Invalid PIN Code (401)", self.test_t2_01_auth_invalid_pin)
        self.run_test("T2_02", "Tier 2", "Auth Gate: Unregistered Phone (401)", self.test_t2_02_auth_unknown_phone)
        self.run_test("T2_03", "Tier 2", "Auth Gate: Role Mismatch Privilege Escalation (401)", self.test_t2_03_auth_role_mismatch)
        self.run_test("T2_04", "Tier 2", "Auth Gate: Empty Credentials Payload (401)", self.test_t2_04_auth_empty_credentials)
        self.run_test("T2_05", "Tier 2", "User Profile: Non-Existent Phone (404)", self.test_t2_05_profile_unknown_phone)
        self.run_test("T2_06", "Tier 2", "IVR Session: Unregistered Calling Line (New Registration Prompt)", self.test_t2_06_ivr_call_session_unregistered_caller)
        self.run_test("T2_07", "Tier 2", "IVR Keypad: Unknown Digit Handling", self.test_t2_07_ivr_keypad_unknown_digit)
        self.run_test("T2_08", "Tier 2", "TTS Audio Synthesis: Empty Text Rejection (400)", self.test_t2_08_tts_empty_text)
        self.run_test("T2_09", "Tier 2", "Lot Update: Non-Existent Lot ID (404)", self.test_t2_09_update_nonexistent_lot)
        self.run_test("T2_10", "Tier 2", "Lot Deletion: Non-Existent Lot ID (404)", self.test_t2_10_delete_nonexistent_lot)
        self.run_test("T2_11", "Tier 2", "Transporter Inspection: Non-Existent Lot ID (404)", self.test_t2_11_driver_inspect_nonexistent_lot)
        self.run_test("T2_12", "Tier 2", "Lot Creation Boundary: Minimum Parcel 0.5 Qtl (1 Bag)", self.test_t2_12_boundary_lot_quantity)

        # Tier 3
        print("\n\033[1m[TIER 3: CROSS-FEATURE COMBINATIONS]\033[0m")
        self.run_test("T3_01", "Tier 3", "Lot Creation -> Bolero Capacity 100% -> Dispatch Lock Sync", self.test_t3_01_lot_creation_bolero_capacity_lock)
        self.run_test("T3_02", "Tier 3", "GPS Coordinates -> Khet-PIN Generation -> SQLite Database Sync", self.test_t3_02_gps_khetpin_database_sync)
        self.run_test("T3_03", "Tier 3", "Multi-Key IVR Keypad Stock Adjustment & Bag Recalculation", self.test_t3_03_ivr_stock_keypad_recalculation)
        self.run_test("T3_04", "Tier 3", "Telegram Bot /addlot & /dellot with SQLite Sync & ₹0 Penalty", self.test_t3_04_telegram_bot_lot_crud_sync)

        # Tier 4
        print("\n\033[1m[TIER 4: REAL-WORLD APPLICATION WORKLOADS]\033[0m")
        self.run_test("T4_01", "Tier 4", "Full Farm-to-Mandi Operational Cycle (8-Stage Workflow)", self.test_t4_01_full_farm_to_mandi_cycle)

        # Print Summary Matrix
        self.print_summary()

    def print_summary(self):
        print("\n" + "=" * 80)
        print("KHETOS E2E TEST SUITE EXECUTION SUMMARY")
        print("=" * 80)

        tiers = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"]
        tier_labels = {
            "Tier 1": "Tier 1: Feature Coverage       ",
            "Tier 2": "Tier 2: Boundary & Corner Cases",
            "Tier 3": "Tier 3: Cross-Feature Combos   ",
            "Tier 4": "Tier 4: Real-World Workloads    "
        }

        total_passed = 0
        total_failed = 0
        total_duration = sum(r.duration_ms for r in self.results)

        for tier in tiers:
            tier_tests = [r for r in self.results if r.tier == tier]
            passed = sum(1 for r in tier_tests if r.passed)
            total = len(tier_tests)
            total_passed += passed
            total_failed += (total - passed)
            pct = (passed / total * 100.0) if total > 0 else 0.0
            print(f"  {tier_labels[tier]}  [{passed:2d}/{total:2d} PASSED] ({pct:5.1f}%)")

        overall_total = total_passed + total_failed
        overall_pct = (total_passed / overall_total * 100.0) if overall_total > 0 else 0.0
        print("-" * 80)
        print(f"  TOTAL TEST CASES EXECUTED:  {overall_total}")
        print(f"  TOTAL PASSED:               {total_passed}")
        print(f"  TOTAL FAILED:               {total_failed}")
        print(f"  OVERALL PASS RATE:          {overall_pct:.1f}%")
        print(f"  TOTAL EXECUTION DURATION:   {total_duration / 1000.0:.2f}s")
        print("=" * 80)

        if total_failed > 0:
            print(f"\n\033[91mFAILED TESTS ({total_failed}):\033[0m")
            for r in self.results:
                if not r.passed:
                    print(f"  - [{r.test_id}] {r.name}: {r.error_message}")
            sys.exit(1)
        else:
            print("\n\033[92mALL TEST GATES PASSED CLEANLY (100% SUCCESS)\033[0m\n")
            sys.exit(0)


if __name__ == "__main__":
    suite = KhetOSTestSuite()
    suite.run_all()
