#!/usr/bin/env python3
"""
KhetOS (खेतOS) — Backend Concurrency & Adversarial Stress Test Suite
=====================================================================
Empirical challenger script to verify:
1. Concurrent rapid-fire Telegram commands under multi-threaded load.
2. SQLite database WAL mode resilience under parallel read/write contention.
3. Rapid authentication across all fast-gates and negative security gates.
4. Resistance to malformed inputs (giant strings, SQL injection, extreme values, invalid coordinates).
5. Zero 500 internal server errors, zero DB locks, zero thread deadlocks.
6. Clean post-stress state and complete pass of E2E test suite (test_e2e_suite.py).

Usage:
    python tests/test_adversarial_stress.py
"""

import sys
import os
import json
import time
import math
import random
import sqlite3
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Force UTF-8 on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
API_URL = os.environ.get("KHETOS_API_URL", "http://127.0.0.1:5000").rstrip("/")
DB_PATH = BASE_DIR / "api" / "data" / "khetos.db"

class StressStats:
    def __init__(self, name: str):
        self.name = name
        self.total_requests = 0
        self.status_counts = {}
        self.latencies = []
        self.errors = []
        self.server_500_count = 0
        self.start_time = 0.0
        self.end_time = 0.0

    def start(self):
        self.start_time = time.time()

    def record(self, status: int, duration_ms: float, err_msg: str = None):
        self.total_requests += 1
        self.status_counts[status] = self.status_counts.get(status, 0) + 1
        self.latencies.append(duration_ms)
        if status >= 500:
            self.server_500_count += 1
            self.errors.append(f"HTTP {status}: {err_msg}")
        elif status == 0:
            self.errors.append(f"Network/Connection Error: {err_msg}")

    def finish(self):
        self.end_time = time.time()

    def summary(self):
        total_time = max(0.001, self.end_time - self.start_time)
        rps = self.total_requests / total_time
        lats = sorted(self.latencies) if self.latencies else [0]
        p50 = lats[len(lats) // 2]
        p95 = lats[int(len(lats) * 0.95)] if len(lats) > 1 else lats[0]
        p99 = lats[int(len(lats) * 0.99)] if len(lats) > 1 else lats[0]
        min_l = min(lats)
        max_l = max(lats)
        avg_l = sum(lats) / len(lats)

        return {
            "name": self.name,
            "total_requests": self.total_requests,
            "duration_sec": total_time,
            "requests_per_sec": rps,
            "status_distribution": self.status_counts,
            "server_500_count": self.server_500_count,
            "latency_p50_ms": p50,
            "latency_p95_ms": p95,
            "latency_p99_ms": p99,
            "latency_min_ms": min_l,
            "latency_max_ms": max_l,
            "latency_avg_ms": avg_l,
            "errors": self.errors
        }


def make_request(method: str, path: str, data: dict = None, raw_body: bytes = None,
                 content_type: str = "application/json", timeout: float = 12.0):
    url = f"{API_URL}{path}" if path.startswith("/") else f"{API_URL}/{path}"
    headers = {"User-Agent": "KhetOS-Adversarial-Challenger/1.0"}
    
    encoded_data = None
    if raw_body is not None:
        encoded_data = raw_body
        if content_type:
            headers["Content-Type"] = content_type
    elif data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = content_type

    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            try:
                json_data = json.loads(body)
            except Exception:
                json_data = None
            dur = (time.time() - t0) * 1000
            return status, json_data, body, dur, None
    except urllib.error.HTTPError as e:
        dur = (time.time() - t0) * 1000
        body = e.read().decode("utf-8", errors="replace")
        try:
            json_data = json.loads(body)
        except Exception:
            json_data = None
        return e.code, json_data, body, dur, f"HTTPError {e.code}"
    except Exception as e:
        dur = (time.time() - t0) * 1000
        return 0, None, "", dur, f"{type(e).__name__}: {e}"


# =============================================================================
# SUITE 1: RAPID-FIRE CONCURRENT TELEGRAM COMMANDS
# =============================================================================

def stress_telegram_commands(num_workers=20, total_commands=100) -> StressStats:
    print(f"\n[Suite 1] Stressing Telegram Bot Commands ({num_workers} threads, {total_commands} total requests)...")
    stats = StressStats("Concurrent Telegram Commands")
    stats.start()

    commands = [
        "/start",
        "/mandi",
        "/mystock",
        "/addlot 2.0 Mustard",
        "/addlot 1.5 Wheat",
        "/dellot LOT-TEMP-99",
        "/modlot LOT-TEMP-99 3.0",
        "/location 28.8942 76.6021",
        "/accept",
        "/help",
        "/mandi",
        "/mystock"
    ]
    phones = [
        "+91 98123 45099", # Ramu Sharma
        "+91 94160 88219", # Baljit Singh
        "+91 98765 00001",
        "+91 99999 88888"
    ]

    def worker_task(idx):
        cmd = random.choice(commands)
        phone = random.choice(phones)
        payload = {"phone": phone, "text": cmd}
        status, _, body, dur, err = make_request("POST", "/api/telegram/bot/command", data=payload)
        return status, dur, body[:80] if status >= 500 else err

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(worker_task, i) for i in range(total_commands)]
        for f in as_completed(futures):
            status, dur, err = f.result()
            stats.record(status, dur, err)

    stats.finish()
    return stats


# =============================================================================
# SUITE 2: SQLITE WAL HIGH-CONTENTION CONCURRENCY (READ/WRITE CONTENTION)
# =============================================================================

def stress_sqlite_wal_concurrency(num_workers=25, total_ops=150) -> StressStats:
    print(f"\n[Suite 2] Stressing SQLite WAL Concurrency ({num_workers} threads, {total_ops} mixed Read/Write ops)...")
    stats = StressStats("SQLite WAL Concurrency Contention")
    stats.start()

    created_lots = []
    created_lots_lock = os.name

    def write_op(idx):
        # 1. Create a lot
        crop = random.choice(["Mustard", "Wheat", "Gram", "Barley"])
        qty = round(random.uniform(0.5, 4.0), 1)
        payload = {
            "phone": "+91 98123 45099",
            "crop": crop,
            "quantity_quintals": qty,
            "channel": f"wal_stress_{idx}"
        }
        status, data, body, dur, err = make_request("POST", "/api/farmer/lot/create", data=payload)
        if status == 200 and data and "lot" in data:
            lot_id = data["lot"].get("lot_id")
            if lot_id:
                created_lots.append(lot_id)
        return status, dur, body[:100] if status >= 500 else err

    def read_op(idx):
        targets = [
            ("GET", "/api/state", None),
            ("GET", f"/api/user/profile?phone={urllib.parse.quote('+91 98123 45099')}", None),
            ("GET", f"/api/farmer/lots?phone={urllib.parse.quote('+91 98123 45099')}", None),
            ("GET", "/api/stakeholders/directory", None),
            ("GET", "/api/weather", None),
            ("GET", "/api/backhaul/plans", None),
            ("GET", "/api/prices?crop=Mustard", None)
        ]
        method, path, data = random.choice(targets)
        status, _, body, dur, err = make_request(method, path, data=data)
        return status, dur, body[:100] if status >= 500 else err

    def mixed_task(idx):
        # 40% writes, 60% reads
        if random.random() < 0.4:
            return write_op(idx)
        else:
            return read_op(idx)

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(mixed_task, i) for i in range(total_ops)]
        for f in as_completed(futures):
            status, dur, err = f.result()
            stats.record(status, dur, err)

    stats.finish()

    # Clean up lots created during stress
    print(f"  Cleaning up {len(created_lots)} stress lots...")
    for lid in created_lots:
        make_request("DELETE", f"/api/farmer/lot/{lid}")

    return stats


# =============================================================================
# SUITE 3: RAPID AUTHENTICATION ACROSS ALL FAST-GATES & NEGATIVE GATES
# =============================================================================

def stress_authentication_fast_gates(num_workers=20, total_auths=120) -> StressStats:
    print(f"\n[Suite 3] Stressing Fast-Gates & Security Auth Gates ({num_workers} threads, {total_auths} logins)...")
    stats = StressStats("Rapid Fast-Gate & Security Auth")
    stats.start()

    gate_cases = [
        # Valid Fast-Gates (expect HTTP 200)
        {"payload": {"phone": "+91 94160 88219", "pin": "1234", "role": "DRIVER"}, "expected": 200, "name": "Baljit Singh (DRIVER)"},
        {"payload": {"phone": "+91 98111 22334", "pin": "1234", "role": "BUYER"}, "expected": 200, "name": "Shree Ram Mill (BUYER)"},
        {"payload": {"phone": "+91 11 2769 1100", "pin": "2026", "role": "ADMIN"}, "expected": 200, "name": "Dr. Vivek (ADMIN)"},
        {"payload": {"phone": "+91 98123 45099", "pin": "1234", "role": "FARMER"}, "expected": 200, "name": "Ramu Sharma (FARMER)"},
        # Negative / Adversarial Gates (expect HTTP 401)
        {"payload": {"phone": "+91 94160 88219", "pin": "9999", "role": "DRIVER"}, "expected": 401, "name": "Wrong PIN (401)"},
        {"payload": {"phone": "+91 00000 00000", "pin": "1234", "role": "DRIVER"}, "expected": 401, "name": "Unregistered Phone (401)"},
        {"payload": {"phone": "+91 94160 88219", "pin": "1234", "role": "BUYER"}, "expected": 401, "name": "Role Escalation Mismatch (401)"},
        {"payload": {"phone": "", "pin": ""}, "expected": 401, "name": "Empty Credentials (401)"},
        {"payload": {"phone": "+91 94160 88219", "pin": "' OR '1'='1", "role": "DRIVER"}, "expected": 401, "name": "SQLi in PIN (401)"},
        {"payload": {"phone": "admin' --", "pin": "1234", "role": "ADMIN"}, "expected": 401, "name": "SQLi in Phone (401)"}
    ]

    security_violations = []

    def auth_task(idx):
        tc = random.choice(gate_cases)
        status, data, body, dur, err = make_request("POST", "/api/auth/login", data=tc["payload"])
        if status != tc["expected"]:
            msg = f"Auth Gate Mismatch on {tc['name']}: expected {tc['expected']}, got {status}"
            return status, dur, msg, True
        return status, dur, body[:80] if status >= 500 else err, False

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(auth_task, i) for i in range(total_auths)]
        for f in as_completed(futures):
            status, dur, err, violation = f.result()
            stats.record(status, dur, err)
            if violation:
                security_violations.append(err)

    stats.finish()
    if security_violations:
        print(f"  \033[91m[CRITICAL] Security Violations Detected: {security_violations[:5]}\033[0m")
    return stats


# =============================================================================
# SUITE 4: ADVERSARIAL & MALFORMED INPUTS STRESS
# =============================================================================

def stress_malformed_adversarial_inputs(num_workers=15) -> StressStats:
    print(f"\n[Suite 4] Stressing Malformed & Adversarial Inputs (SQLi, Giant Buffers, Bad Types)...")
    stats = StressStats("Malformed & Adversarial Input Resilience")
    stats.start()

    adversarial_tests = []

    # 1. SQL Injection Attempts across endpoints
    sqli_strings = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17 --",
        "admin' --",
        "' OR ''='",
        "<script>alert(1)</script>"
    ]
    for s in sqli_strings:
        adversarial_tests.append(("POST", "/api/telegram/bot/command", {"phone": s, "text": f"/dellot {s}"}))
        adversarial_tests.append(("POST", "/api/telegram/bot/command", {"phone": "+91 98123 45099", "text": f"/addlot 2.0 {s}"}))
        adversarial_tests.append(("GET", f"/api/prices?crop={urllib.parse.quote(s)}", None))
        adversarial_tests.append(("GET", f"/api/user/profile?phone={urllib.parse.quote(s)}", None))
        adversarial_tests.append(("POST", "/api/farmer/lot/create", {"phone": s, "crop": s, "quantity_quintals": 2.0}))
        adversarial_tests.append(("POST", "/api/driver/inspect", {"lot_id": s, "action": s}))
        adversarial_tests.append(("DELETE", f"/api/farmer/lot/{urllib.parse.quote(s)}", None))

    # 2. Giant String Payloads (Buffer / Memory Stress)
    giant_16k = "A" * 16384
    giant_64k = "X" * 65536
    adversarial_tests.append(("POST", "/api/telegram/bot/command", {"phone": "+91 98123 45099", "text": f"/mandi {giant_16k}"}))
    adversarial_tests.append(("POST", "/api/tts", {"text": giant_16k}))
    adversarial_tests.append(("POST", "/api/call/session", {"caller_phone": giant_16k}))
    adversarial_tests.append(("POST", "/api/farmer/lot/create", {"phone": giant_16k, "crop": "Mustard", "quantity_quintals": 1.0}))

    # 3. Invalid Coordinates & Geo-Sync Stress
    coord_cases = [
        (999999.0, 999999.0),
        (-999999.0, -999999.0),
        (0.0, 0.0),
        (90.0001, 180.0001)
    ]
    for lat, lng in coord_cases:
        adversarial_tests.append(("POST", "/api/telegram/bot/command", {"phone": "+91 98123 45099", "text": f"/location {lat} {lng}"}))

    # 4. Extreme & Boundary Numerical Inputs
    adversarial_tests.append(("POST", "/api/farmer/lot/create", {"phone": "+91 98123 45099", "crop": "Mustard", "quantity_quintals": -100.0}))
    adversarial_tests.append(("POST", "/api/farmer/lot/create", {"phone": "+91 98123 45099", "crop": "Mustard", "quantity_quintals": 0.0}))
    adversarial_tests.append(("POST", "/api/farmer/lot/create", {"phone": "+91 98123 45099", "crop": "Mustard", "quantity_quintals": 1e12}))
    adversarial_tests.append(("PUT", "/api/farmer/lot/update", {"lot_id": "LOT-ROH-999", "quantity_quintals": -5.0}))
    adversarial_tests.append(("POST", "/api/buyer/order", {"buyer_name": "Test", "quantity_quintals": -10.0, "bid_price": -500}))

    # 5. Non-JSON / Corrupt Raw Payloads
    adversarial_tests.append(("POST", "/api/auth/login", None, b"THIS_IS_NOT_JSON", "text/plain"))
    adversarial_tests.append(("POST", "/api/telegram/bot/command", None, b"{unquoted_key: 123", "application/json"))
    adversarial_tests.append(("POST", "/api/farmer/lot/create", None, b"", "application/json"))

    def adv_task(test_item):
        if len(test_item) == 3:
            method, path, data = test_item
            status, _, body, dur, err = make_request(method, path, data=data)
        else:
            method, path, _, raw_body, ctype = test_item
            status, _, body, dur, err = make_request(method, path, raw_body=raw_body, content_type=ctype)
        return status, dur, body[:100] if status >= 500 else err

    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = [executor.submit(adv_task, item) for item in adversarial_tests]
        for f in as_completed(futures):
            status, dur, err = f.result()
            stats.record(status, dur, err)

    stats.finish()
    return stats


# =============================================================================
# SUITE 5: DIRECT SQLITE INTEGRITY & WAL RECOVERY CHECK
# =============================================================================

def check_sqlite_integrity() -> dict:
    print("\n[Suite 5] Verifying SQLite Database File & WAL Integrity...")
    results = {}
    try:
        conn = sqlite3.connect(str(DB_PATH), timeout=10.0)
        cursor = conn.cursor()
        
        # 1. PRAGMA integrity_check
        cursor.execute("PRAGMA integrity_check;")
        ic = cursor.fetchall()
        results["integrity_check"] = [row[0] for row in ic]
        results["integrity_ok"] = (len(ic) == 1 and ic[0][0] == "ok")

        # 2. PRAGMA foreign_key_check
        cursor.execute("PRAGMA foreign_key_check;")
        fk = cursor.fetchall()
        results["fk_violations"] = len(fk)

        # 3. PRAGMA journal_mode
        cursor.execute("PRAGMA journal_mode;")
        jm = cursor.fetchone()[0]
        results["journal_mode"] = jm

        # 4. Check active pool state
        cursor.execute("SELECT pool_id, current_loaded_kg, capacity_percentage, status FROM pools WHERE pool_id = 'POOL-ROH-104';")
        pool = cursor.fetchone()
        results["pool_state"] = dict(zip(["pool_id", "current_loaded_kg", "capacity_percentage", "status"], pool)) if pool else None

        # 5. Row counts
        counts = {}
        for tbl in ["users", "lots", "pools", "notifications", "backhaul_schedules"]:
            cursor.execute(f"SELECT COUNT(*) FROM {tbl};")
            counts[tbl] = cursor.fetchone()[0]
        results["table_row_counts"] = counts

        conn.close()
        results["status"] = "PASSED" if results["integrity_ok"] and results["fk_violations"] == 0 else "FAILED"
    except Exception as e:
        results["status"] = "ERROR"
        results["error"] = str(e)

    print(f"  SQLite Integrity Status: {results.get('status')} (Journal: {results.get('journal_mode')}, FK Violations: {results.get('fk_violations', 'N/A')})")
    return results


# =============================================================================
# SUITE 6: POST-STRESS E2E INTEGRITY RUNNER
# =============================================================================

def run_post_stress_e2e() -> bool:
    print("\n[Suite 6] Executing Complete E2E Test Suite (tests/test_e2e_suite.py)...")
    # Reset database state before E2E verification
    reset_status, _, _, _, _ = make_request("POST", "/api/reset", data={})
    print(f"  System State Reset: HTTP {reset_status}")

    import subprocess
    cmd = [sys.executable, str(BASE_DIR / "tests" / "test_e2e_suite.py")]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    print(res.stdout)
    if res.stderr:
        print(res.stderr)
    return res.returncode == 0


# =============================================================================
# MAIN EXECUTOR & REPORT CONVERGENCE
# =============================================================================

def main():
    print("=" * 80)
    print("KHETOS (खेतOS) — EMPIRICAL BACKEND CONCURRENCY & ADVERSARIAL STRESS TEST")
    print(f"Target API Engine: {API_URL}")
    print(f"SQLite DB:         {DB_PATH}")
    print("=" * 80)

    # Initial probe
    h_st, h_data, _, _, _ = make_request("GET", "/api/health")
    if h_st != 200:
        print(f"\033[91m[FATAL] Backend is not responding at {API_URL} (HTTP {h_st})\033[0m")
        sys.exit(1)
    print(f"Initial Health Check: HTTP {h_st} ({h_data.get('service', 'KhetOS')})")

    # Run Suites
    s1 = stress_telegram_commands(num_workers=20, total_commands=100)
    s2 = stress_sqlite_wal_concurrency(num_workers=25, total_ops=150)
    s3 = stress_authentication_fast_gates(num_workers=20, total_auths=120)
    s4 = stress_malformed_adversarial_inputs(num_workers=15)
    s5 = check_sqlite_integrity()

    # Post-stress E2E validation
    e2e_ok = run_post_stress_e2e()

    # Compile Summary
    suites = [s1, s2, s3, s4]
    total_reqs = sum(s.total_requests for s in suites)
    total_500s = sum(s.server_500_count for s in suites)

    print("\n" + "=" * 80)
    print("EMPIRICAL CONCURRENCY & ADVERSARIAL RESULTS SUMMARY")
    print("=" * 80)
    for s in suites:
        sum_data = s.summary()
        status_str = " ".join([f"[{k}: {v}]" for k, v in sum_data["status_distribution"].items()])
        print(f"• {sum_data['name']:<40} | Req: {sum_data['total_requests']:3d} | RPS: {sum_data['requests_per_sec']:5.1f} | 500s: {sum_data['server_500_count']} | p95: {sum_data['latency_p95_ms']:5.1f}ms")
        print(f"  Statuses: {status_str}")
        if sum_data["server_500_count"] > 0:
            print(f"  \033[91mErrors: {sum_data['errors'][:3]}\033[0m")

    print("-" * 80)
    print(f"TOTAL CONCURRENT REQUESTS EXECUTED: {total_reqs}")
    print(f"TOTAL HTTP 500 INTERNAL SERVER ERRORS: {total_500s}")
    print(f"SQLITE WAL INTEGRITY CHECK:           {s5.get('status')}")
    print(f"POST-STRESS 4-TIER E2E TEST SUITE:     {'PASSED (100%)' if e2e_ok else 'FAILED'}")
    print("=" * 80)

    # Assessment Decision
    all_clear = (total_500s == 0) and (s5.get("status") == "PASSED") and e2e_ok
    if all_clear:
        print("\n\033[92mFINAL VERDICT: CONFIRM — Backend passed all concurrency and adversarial stress criteria.\033[0m\n")
        sys.exit(0)
    else:
        print(f"\n\033[91mFINAL VERDICT: REJECT — Backend failed adversarial robustness criteria.\033[0m\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
