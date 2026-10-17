# KhetOS (खेतOS) — Comprehensive Test Infrastructure Specification

**Document Version**: 1.0.0  
**Author**: `test_writer_1` (E2E Test Suite Architect)  
**Target Environment**: Windows 11 / Python 3.13 / Node.js 22 / Vite 6 / Flask  
**Authoritative Sources**: `ORIGINAL_REQUEST.md`, `PROJECT.md`, `explorer_survey_3/handoff.md`  

---

## 1. Test Philosophy & Architecture Principles

The KhetOS testing infrastructure enforces end-to-end correctness, regression protection, and adversarial boundary resilience across all agricultural logistics interfaces, mobile IVR channels, Telegram bot flows, and high-performance WebUI components.

### 1.1 Opaque-Box & Requirement-Driven Derivation
- Tests treat the system as an opaque, integrated ecosystem. Outputs are validated against observable contract specifications derived strictly from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- No reliance on mock objects that disguise internal failures. Every test verifies actual HTTP network responses, database records in SQLite (`api/data/khetos.db`), or compiled production distribution artifacts (`client/dist/`).

### 1.2 Zero External Dependency Runner
- The test suite (`tests/test_e2e_suite.py`) executes entirely using Python's standard library (`urllib.request`, `json`, `sqlite3`, `subprocess`, `time`, `sys`, `pathlib`).
- Transparent fallback to `requests` is supported if available, but never strictly required. This guarantees execution in any CI/CD environment or minimal Python installation without pre-installing third-party wheels.
- Windows console encoding is explicitly managed via `sys.stdout.reconfigure(encoding='utf-8')` to prevent Unicode CP1252 truncation when validating Hindi strings (e.g. आज़ादपुर, सरसों, खेतOS).

### 1.3 State Isolation & Non-Destructive Invariance
- Every stateful mutation (such as lot creation, Bolero pool filling, or test user registration) is tested inside isolated fixtures and followed by targeted cleanup or transactional database re-seeding via `POST /api/reset`.
- Tests never leave residual test records or corrupt pre-seeded demo fast-gates (Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan, Ramu Sharma).

---

## 2. Complete Feature Inventory Test Mapping

The following matrix maps every feature defined in `PROJECT.md` to its corresponding verification tier, test implementation, and authoritative source of expected output:

| # | Feature Name | Target Layer / Route | Test Tier | Assertion Criteria & Expected Output Derivation | Source Reference |
|---|--------------|----------------------|-----------|------------------------------------------------|------------------|
| **1** | Cosmic Obsidian Theme & Tokens | `client/src/index.css`, `dist/assets/*.css` | Tier 1 | Theme tokens `--color-bg: 8 10 25;`, hairline borders (`border-white/[0.08]`), inner top highlights present in production build bundle. | ORIGINAL_REQUEST R1 |
| **2** | Top Glowing 3px Laser Bar | `client/src/components/TopLaserBar.jsx` | Tier 1 | Keyframe `@keyframes laserShimmer` bundled; build outputs HTML/CSS bundle with zero errors. | ORIGINAL_REQUEST R1 |
| **3** | Three Ambient Radial Blur Orbs | `client/src/components/CosmicBackground.jsx` | Tier 1 | Radial blur orbs with Emerald (`#10b981`), Amber Gold (`#f59e0b`), and Indigo (`#818cf8`) rendered in build assets. | ORIGINAL_REQUEST R1 |
| **4** | Starfield & 3D Perspective Cyber Grid | `client/src/components/CosmicBackground.jsx` | Tier 1 | `rotateX(62deg)` cyber grid horizon and `@keyframes gridMove` verified in stylesheet assets. | ORIGINAL_REQUEST R1 |
| **5** | Interactive 3D Cockpit Preview | `client/src/components/CockpitPreview.jsx` | Tier 1 | `perspective: 1000px`, Mac-style window controls, live checklist verification present in client build. | ORIGINAL_REQUEST R2 |
| **6** | Live SVG Spline Area Wave Chart | `client/src/components/CockpitPreview.jsx` | Tier 1 | SVG spline path rendering Mandi spot vs benchmark modal curves bundled. | ORIGINAL_REQUEST R2 |
| **7** | Capacity Metric Pills & Checklist | `client/src/components/CockpitPreview.jsx` | Tier 1 | Bolero capacity metric pill (73.3% / 96% / 100% locked) validated via API state and UI bundle. | ORIGINAL_REQUEST R2 |
| **8** | Double Infinite Running Marquees | `client/src/components/TickerMarquee.jsx` | Tier 1 | Dual running ticker marquees with gradient masks (`marqueeLeft`, `marqueeRight`) bundled. | ORIGINAL_REQUEST R2 |
| **9** | Farm-Gate Quality Scanner Card | `client/src/components/QualityScannerLaser.jsx` | Tier 1 | Sweeping teal laser beam `@keyframes laserSweep` bundled in production CSS. | ORIGINAL_REQUEST R3 |
| **10** | Real-Time Telemetry Grid | `client/src/components/QualityScannerLaser.jsx` | Tier 1 | Moisture (7.2%), Purity (98.4%), ICAR salts (0.00 ppm), Oil content (41.8%) present in client modules. | ORIGINAL_REQUEST R3 |
| **11** | Three 3D Tilted Glowing Cards | `client/src/pages/LandingPage.jsx` | Tier 1 | Farmer, Transporter, and Buyer tilted glowing cards with Lucide icons bundled. | ORIGINAL_REQUEST R4 |
| **12** | Navbar & AuthPage Glassmorphic Alignment | `client/src/pages/AuthPage.jsx` | Tier 1 & Tier 2 | Fast-gates preserved (Baljit, Shree Ram, Dr. Vivek, Ramu); invalid PIN/role returns HTTP 401. | ORIGINAL_REQUEST R4 |
| **13** | Live Telegram Bot Daemon | `api/adapters/telegram_bot.py` | Tier 1 | Token validation against Telegram Bot API (`getMe`), active polling daemon readiness. | ORIGINAL_REQUEST R5 |
| **14** | Telegram Command Handlers | `POST /api/telegram/bot/command` | Tier 1, 2, 3 | `/start`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot` return HTTP 200 with Hindi advisory. | ORIGINAL_REQUEST R5 |
| **15** | Native GPS Pin Drop to Khet-PIN Sync | `POST /api/call/register`, SQLite `users` | Tier 3 | GPS coordinates encoded to Khet-PIN `HR-ROH-...`, stored in SQLite, retrievable via profile API. | ORIGINAL_REQUEST R5 |
| **16** | Vernacular Audio Dispatch | `POST /api/tts`, `POST /api/khetpin/audio` | Tier 1 & Tier 2 | Audio synthesis generates base64 Hindi speech payload; empty text returns HTTP 400. | ORIGINAL_REQUEST R5 |
| **17** | E2E System & Build Integrity Gate | Client + Flask API + SQLite | Tier 1 & Tier 4 | `npm run build` exits 0, ports 5000 & 5173 respond HTTP 200, full farm-to-mandi cycle executes end-to-end. | ORIGINAL_REQUEST Acceptance Criteria |

---

## 3. 4-Tier Test Suite Specification

### Tier 1: Feature Coverage (Baseline Functional Integrity)
Validates that every single exposed system interface, REST route, authentication fast-gate, and production asset is structurally intact, operational, and returns standard HTTP 200 status.

1. **System Health Check (`GET /api/health`)**:
   - Asserts HTTP status `200`.
   - Asserts JSON `{"status": "healthy", "service": "KhetOS Central API Engine"}`.
2. **Client Production Build Verification**:
   - Asserts `client/dist/index.html` exists and is non-empty.
   - Asserts bundled assets contain theme styles (`#080A19`, CSS variables, and keyframe definitions).
3. **Core State API (`GET /api/state`)**:
   - Asserts presence of `active_pool`, `lots`, and `activity_feed`.
   - Asserts `active_pool.pool_id == 'POOL-ROH-104'` and `target_capacity_kg == 1500.0`.
4. **Mandi Price Intelligence Feed (`GET /api/prices?crop=Mustard`)**:
   - Asserts HTTP 200.
   - Asserts `modal_price == 5420.0`, `min_price == 5200.0`, `max_price == 5580.0`, and `local_trader_price == 4700.0`.
   - Validates calculated farmer net advantage is exactly +₹720 / Quintal.
5. **Farmer User Profile (`GET /api/user/profile?phone=+91 98123 45099`)**:
   - Asserts HTTP 200.
   - Asserts `user.name == 'Ramu Sharma'`, `user.village == 'Najafgarh'`, and `user.khet_pin == 'HR-ROH-91P2'`.
6. **Farmer Stock Lots (`GET /api/farmer/lots?phone=+91 98123 45099`)**:
   - Asserts HTTP 200 and returns a valid list of lots.
7. **Dual-Channel Notifications (`GET /api/notifications`)**:
   - Asserts HTTP 200 and returns array of recent SMS/Telegram notifications.
8. **1-Day Prior Backhaul Capacity Plans (`GET /api/backhaul/plans`)**:
   - Asserts HTTP 200 and verifies scheduled return corridor manifests.
9. **Backhaul Pre-Contracted Manifest (`GET /api/backhaul/manifest`)**:
   - Asserts HTTP 200, `status == 'PRE_CONTRACTED_B2B_LOCKED'`, and `khali_phera_eliminated == True`.
10. **Drivers Directory (`GET /api/drivers`)**:
    - Asserts HTTP 200 and verifies driver `Baljit Singh` (`HR-12-AE-8419`) is present.
11. **Institutional Buyers Directory (`GET /api/buyers`)**:
    - Asserts HTTP 200 and verifies buyer `Shree Ram Flour & Oil Mill` is present.
12. **Unified Stakeholders Directory (`GET /api/stakeholders/directory`)**:
    - Asserts HTTP 200, verifying counts for `farmers`, `drivers`, `buyers`, and `admins`.
13. **Corridor Weather Telemetry (`GET /api/weather`)**:
    - Asserts HTTP 200, containing live or cached `temperature_c`, `humidity_pct`, and `tarpaulin_protocol`.
14. **Fast-Gate: Transporter Baljit Singh (`POST /api/auth/login`)**:
    - Payload: `{"phone": "+91 94160 88219", "pin": "1234", "role": "DRIVER"}`.
    - Asserts HTTP 200 and `user.role == 'DRIVER'`.
15. **Fast-Gate: Buyer Shree Ram Mill (`POST /api/auth/login`)**:
    - Payload: `{"phone": "+91 98111 22334", "pin": "1234", "role": "BUYER"}`.
    - Asserts HTTP 200 and `user.role == 'BUYER'`.
16. **Fast-Gate: Mandi Admin Dr. Vivek Swaminathan (`POST /api/auth/login`)**:
    - Payload: `{"phone": "+91 11 2769 1100", "pin": "2026", "role": "ADMIN"}`.
    - Asserts HTTP 200 and `user.role == 'ADMIN'`.
17. **Fast-Gate: Marginal Farmer Ramu Sharma (`POST /api/auth/login`)**:
    - Payload: `{"phone": "+91 98123 45099", "pin": "1234", "role": "FARMER"}`.
    - Asserts HTTP 200 and `user.role == 'FARMER'`.
18. **Telegram Command Endpoint: `/start`**:
    - Payload: `{"phone": "+91 98123 45099", "text": "/start"}`.
    - Asserts HTTP 200, status `SUCCESS`, and reply contains `KhetOS` and `खेतपिन`.
19. **Telegram Command Endpoint: `/mandi`**:
    - Payload: `{"phone": "+91 98123 45099", "text": "/mandi"}`.
    - Asserts HTTP 200, reply contains `आज़ादपुर`, `5420`, and `+₹720`.
20. **Telegram Command Endpoint: `/mystock`**:
    - Payload: `{"phone": "+91 98123 45099", "text": "/mystock"}`.
    - Asserts HTTP 200 and reply contains active stock or prompt.

---

### Tier 2: Boundary & Corner Cases (Adversarial Robustness)
Validates that invalid inputs, malformed bodies, authentication attacks, missing resources, and boundary quantities fail with precise status codes and informative error messages rather than unhandled server crashes (500).

21. **Authentication Invalid PIN**:
    - Payload: `{"phone": "+91 94160 88219", "pin": "9999", "role": "DRIVER"}`.
    - Asserts HTTP `401 Unauthorized` and `message == 'Invalid PIN code'`.
22. **Authentication Unknown / Unregistered Phone**:
    - Payload: `{"phone": "+91 00000 00000", "pin": "1234", "role": "DRIVER"}`.
    - Asserts HTTP `401 Unauthorized` and `message == 'User phone not registered'`.
23. **Authentication Role Mismatch (Privilege Escalation Gate)**:
    - Driver phone attempting buyer login: `{"phone": "+91 94160 88219", "pin": "1234", "role": "BUYER"}`.
    - Asserts HTTP `401 Unauthorized` and message contains `User role mismatch: expected BUYER`.
24. **Authentication Empty Credentials**:
    - Payload: `{"phone": "", "pin": ""}`.
    - Asserts HTTP `401 Unauthorized`.
25. **User Profile Non-Existent Phone**:
    - `GET /api/user/profile?phone=+91 00000 00000`.
    - Asserts HTTP `404 Not Found` and `status == 'NOT_FOUND'`.
26. **IVR Call Session Unregistered Caller**:
    - `POST /api/call/session` with `caller_phone: "+91 88888 77777"`.
    - Asserts HTTP 200 with `status == 'NEW_CALLER_REGISTRATION_REQUIRED'` and `is_registered == False`.
27. **IVR Keypad Unknown Digit Input**:
    - `POST /api/call/keypad` with `digit: "9"`.
    - Asserts HTTP 200 with `status == 'UNKNOWN_DIGIT'` and Hindi guidance prompt.
28. **TTS Audio Synthesis Missing / Empty Text**:
    - `POST /api/tts` with `{"text": ""}`.
    - Asserts HTTP `400 Bad Request` and `error == 'No text provided'`.
29. **Update Non-Existent Lot**:
    - `PUT /api/farmer/lot/update` with `lot_id: "LOT-NONEXISTENT-999"`.
    - Asserts HTTP `404 Not Found`.
30. **Delete Non-Existent Lot**:
    - `DELETE /api/farmer/lot/LOT-NONEXISTENT-999`.
    - Asserts HTTP `404 Not Found`.
31. **Driver Inspect Non-Existent Lot**:
    - `POST /api/driver/inspect` with `lot_id: "LOT-NONEXISTENT-999"`.
    - Asserts HTTP `404 Not Found`.
32. **Boundary Lot Quantity (Minimum Valid Parcel: 0.5 Quintal / 1 Bag)**:
    - Creates lot with `0.5` quintal.
    - Asserts `bags_count == 1`, valid creation, followed by immediate teardown deletion.

---

### Tier 3: Cross-Feature Combinations (Stateful Workflow Integrity)
Validates complex transactions that span multiple modules, background recalculation loops, and database synchronizations.

33. **Lot Creation ➔ Bolero Capacity Recalculation ➔ Dispatch Status Lock**:
    - Records baseline pool capacity (`1100.0 kg`, `73.3%`, `ACCEPTING_LOTS`).
    - Farmer declares `4.0` quintals (`400 kg`) via `POST /api/farmer/lot/create`.
    - Pool recalculation asserts:
      * `current_loaded_kg == 1500.0 kg` (100.0% of Mahindra Bolero 1.5T capacity).
      * `status` transitions immediately from `ACCEPTING_LOTS` to `FULL_DISPATCH_LOCKED`.
    - Teardown: Deletes the created lot and asserts pool reverts back to `1100.0 kg` (`73.3%`) with `ACCEPTING_LOTS`.
34. **Native GPS Coordinates ➔ Khet-PIN Generation ➔ SQLite Database Sync**:
    - Invokes `POST /api/call/register` with caller `+91 98765 00001`, name `Test Kisan`, village choice `1` (Bhalaut: Lat 28.8942, Lng 76.6021).
    - Asserts response generates valid Khet-PIN matching regex `^HR-ROH-[A-Z0-9]{4,6}$`.
    - Performs direct SQLite query on `users` table to assert record was inserted with matching `phone` and `khet_pin`.
    - Asserts `GET /api/user/profile?phone=+91 98765 00001` returns the exact registered Khet-PIN.
35. **Multi-Key IVR Keypad Stock Adjustment & Bag Recalculation**:
    - Simulates keypad digit `3` ➔ returns stock submenu with farmer active lots.
    - Simulates keypad multi-key `31` ➔ increments lot quantity by +1.0 Qtl (+2 bags), recalculates shared freight.
    - Simulates keypad multi-key `32` ➔ decrements lot quantity by -1.0 Qtl (-2 bags).
36. **Telegram Bot Command ➔ SQLite Lot Insertion & Cancellation Sync**:
    - Dispatches `POST /api/telegram/bot/command` with `/addlot 2.0 Mustard`.
    - Asserts reply confirms creation of lot with 4 bags.
    - Queries `GET /api/farmer/lots` to retrieve generated `lot_id`.
    - Dispatches `/dellot [lot_id]` and asserts cancellation with ₹0 penalty text.

---

### Tier 4: Real-World Application Workloads (Full Farm-to-Mandi Cycle)
Validates the entire operational lifecycle of an agricultural parcel from farm-gate registration to institutional buyer settlement.

37. **Full Farm-to-Mandi Operational Cycle**:
    - **Stage 1 (Farmer Authentication)**: Ramu Sharma authenticates via fast-gate (`POST /api/auth/login`).
    - **Stage 2 (Mandi Price Arbitrage)**: Queries Azadpur APMC feed (`GET /api/prices?crop=Mustard`), verifying ₹5,420 modal price vs ₹4,700 local trader (+₹720 arbitrage margin).
    - **Stage 3 (Harvest Lot Declaration)**: Adds 4.0 Qtl Mustard lot (`POST /api/farmer/lot/create`).
    - **Stage 4 (Bolero Capacity Lock)**: Verifies Bolero pool reaches 1,500 kg (100.0%) and locks with `FULL_DISPATCH_LOCKED`.
    - **Stage 5 (Transporter Quality Inspection)**: Transporter Baljit Singh approves lot quality (`POST /api/driver/inspect` with `action: 'APPROVE'`), transitioning lot status to `LOADED_ON_TRUCK`.
    - **Stage 6 (1-Day Prior Return Backhaul)**: Inspects return manifest (`GET /api/backhaul/manifest`), verifying 1,000 kg return cargo (Pashu Aahar, Urea, Seeds), ₹850 extra transporter earnings, and 0% Khali Phera.
    - **Stage 7 (Institutional Buyer Order & Escrow)**: Buyer Shree Ram Mill authenticates (`POST /api/auth/login`), places order matching 11.0 Qtl (`POST /api/buyer/order`), and authorizes 20% escrow payment (`POST /api/buyer/create-payment`).
    - **Stage 8 (System Reset & Teardown)**: Restores database to initial seeded baseline via `POST /api/reset`, verifying pool returns to 1,100 kg (`ACCEPTING_LOTS`).

---

## 4. Execution & Reporting Protocol

### 4.1 Test Suite Runner
The standalone test runner is located at:
```
C:\Users\mohit\coding\hackathons\iiitd\tests\test_e2e_suite.py
```

### 4.2 How to Run
From the repository root (`C:\Users\mohit\coding\hackathons\iiitd`):
```powershell
python tests\test_e2e_suite.py
```

### 4.3 Output Format
The runner outputs:
1. Per-test execution lines with test ID, name, elapsed milliseconds, and `[PASS]` / `[FAIL]` status.
2. Formatted assertion diagnostics for any failure.
3. A final ASCII summary matrix broken down by Tier:
   ```
   ================================================================================
   KHETOS E2E TEST SUITE EXECUTION SUMMARY
   ================================================================================
   Tier 1: Feature Coverage            [20/20 PASSED] (100.0%)
   Tier 2: Boundary & Corner Cases     [12/12 PASSED] (100.0%)
   Tier 3: Cross-Feature Combinations   [4/4 PASSED]  (100.0%)
   Tier 4: Real-World Workloads         [1/1 PASSED]  (100.0%)
   --------------------------------------------------------------------------------
   TOTAL TEST CASES EXECUTED:          37
   TOTAL PASSED:                       37
   TOTAL FAILED:                        0
   OVERALL PASS RATE:                  100.0%
   TOTAL EXECUTION DURATION:           ~4.2s
   ================================================================================
   ```
4. Process exit code: `0` on 100% pass; `1` on any failure.
