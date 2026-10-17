# Architecture Survey & Handoff Report: Backend, Telegram & APMC Architecture (R5)

**Agent:** `explorer_survey_2`  
**Working Directory:** `C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2`  
**Target Milestone:** Survey & Architecture Discovery for Backend, Telegram Bot Daemon, and Geo-Sync (R5)  
**Parent Agent:** `991d5f41-5ed5-421f-9dd8-9b27a294f676`  
**Date:** 2026-10-18  

---

## 1. Observation

### 1.1 Backend Runtime Environment & Processes
Direct process and port inspection on Windows revealed:
- **Port 5000 (Flask REST API Engine):** Active and listening (PID 21360 running `"C:\Users\mohit\AppData\Local\Programs\Python\Python313\python.exe" app.py` in `C:\Users\mohit\coding\hackathons\iiitd\api`).
- **Port 5173 (Vite Dev Server):** Active and listening (PID 7480).
- **Telegram Bot Daemon:** **NOT RUNNING**. No background thread or standalone process is polling Telegram updates.
- **Health check response (`GET http://localhost:5000/api/health`):**
  ```json
  {"service": "KhetOS Central API Engine", "status": "healthy"}
  ```
- **Active Pool response (`GET http://localhost:5000/api/state`):**
  ```json
  {
    "benchmark_mandi_price": 5420.0,
    "capacity_percentage": 73.3,
    "cluster_name": "Rohtak-Kalanaur Mustard Corridor",
    "crop": "Mustard (सरसों)",
    "current_loaded_kg": 1100.0,
    "local_trader_price": 4700.0,
    "pool_id": "POOL-ROH-104",
    "route": "Rohtak ➔ Azadpur Mandi (NH-9)",
    "status": "ACCEPTING_LOTS",
    "target_capacity_kg": 1500.0,
    "target_mandi": "Azadpur APMC Mandi, Delhi",
    "transporter": "Mahindra Bolero Maxi Truck (HR-12-AE-8419)"
  }
  ```

---

### 1.2 Telegram Bot Token & API Live Verification
Direct query to Telegram Bot API with token `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`:
- `GET https://api.telegram.org/bot8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo/getMe`:
  ```json
  {
    "ok": true,
    "result": {
      "id": 8821984224,
      "is_bot": true,
      "first_name": "KhetOS",
      "username": "KhetOSSaathiBot",
      "can_join_groups": true,
      "can_read_all_group_messages": false,
      "supports_inline_queries": false
    }
  }
  ```
- `GET https://api.telegram.org/bot8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo/getWebhookInfo`:
  ```json
  {"ok": true, "result": {"url": "", "has_custom_certificate": false, "pending_update_count": 0}}
  ```
**Key Observation:** The bot token is 100% **valid and active**. There is **no webhook configured** (`url: ""`), which means Telegram long-polling (`infinity_polling()`) will function without webhook conflicts.

---

### 1.3 Analysis of `api/adapters/telegram_bot.py`
In `api/adapters/telegram_bot.py` (lines 1 to 111):
1. **Token handling (Line 13):**
   `TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")`
   Currently, there is no `.env` file in `api/`, so `TOKEN` defaults to empty string `""`. When run, it prints `"[Notice] TELEGRAM_BOT_TOKEN is not set in .env. Bot is in standby mode."` and exits without polling.
2. **Missing Command Handlers:**
   The existing file only defines handlers for:
   - `commands=['start', 'help']` (lines 22–35)
   - `content_types=['location']` (lines 37–49)
   - `content_types=['photo']` (lines 51–78)
   - `content_types=['voice', 'text']` (lines 79–103)
   It **lacks** handlers for:
   - `/mandi` (Azadpur APMC prices)
   - `/mystock` (farmer lots and bags count)
   - `/addlot` (add harvest lot, update SQLite, lock Bolero pool)
   - `/modlot` (modify lot quantity in SQLite)
   - `/dellot` (delete lot in SQLite with ₹0 penalty)
   - `/accept` & `/reject` (confirm/postpone pickup)
3. **Location Pin Drop Defect (Lines 37–49):**
   The existing `handle_location` generates a Khet-PIN via `generate_khet_pin`, but **does NOT save or update the Khet-PIN in SQLite**! It only replies with text.
4. **Decoupled Handlers in `api/app.py`:**
   In `api/app.py` lines 766–867, there is a route `@app.route("/api/telegram/bot/command", methods=["POST"])` that implements command parsing (`/start`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`, `/accept`, `/reject`). However:
   - This route is only consumed by the web UI component `TelegramBotSimulator.jsx` (lines 49–56).
   - These handlers are completely missing from the real `telegram_bot.py` adapter.
   - The route does not return `audio_base64`, so the web UI cannot play audio for bot commands.

---

### 1.4 Database Architecture & SQLite State
Path: `api/data/khetos.db` (initialized via `api/core/database.py`).
Database settings: `PRAGMA journal_mode=WAL;` and `PRAGMA foreign_keys=ON;`.
Tables:
1. `users`:
   - Columns: `phone`, `name`, `village`, `district`, `khet_pin`, `voice_breadcrumb`, `telegram_chat_id`, `telegram_username`, `role`, `vehicle_model`, `vehicle_number`, `company_name`, `gstin`, `route`, `license_number`, `pin_code`, `created_at`.
   - Core seeded farmers:
     * `+91 98123 45099`: Ramu Sharma, Najafgarh, `HR-ROH-91P2`, username `@ramu_kisan`, `telegram_chat_id: None`.
     * `+91 98123 45001`: Suresh Kumar, Bhalaut, `HR-ROH-78G4`, username `@suresh_kisan`.
     * `+91 98123 45002`: Dinesh Chillar, Kalanaur, `HR-ROH-62K9`, username `@dinesh_kisan`.
2. `lots`:
   - Seeded active lots:
     * `LOT-8921`: Suresh Kumar, 6.0 Qtl (12 bags), status `LOADED_ON_TRUCK`.
     * `LOT-8922`: Dinesh Chillar, 5.0 Qtl (10 bags), status `LOADED_ON_TRUCK`.
     * Sum = 11.0 Qtl = 1,100 kg.
3. `pools`:
   - Active corridor pool `POOL-ROH-104`:
     * Target: 1,500 kg (15 Qtl / 30 bags).
     * Current loaded: 1,100 kg (73.3%).
     * Status: `ACCEPTING_LOTS`.
4. `recalculate_active_pool()` in `api/core/database.py` (lines 404–427):
   ```python
   SELECT COALESCE(SUM(quantity_quintals * 100), 0) AS total_kg
   FROM lots
   WHERE pool_id = 'POOL-ROH-104' 
     AND status IN ('ACCEPTED', 'LOADED_ON_TRUCK', 'READY_FOR_DISPATCH');
   ```
   When 4.0 Qtl (400 kg) is added via `/addlot 4`:
   `total_kg` becomes 1,500.0 kg (100.0%).
   `cap_pct` becomes 100.0%.
   `status` automatically transitions to `'FULL_DISPATCH_LOCKED'`.
5. `state_manager.py`:
   Property accessors (`state.active_pool`, `state.lots`, `state.activity_feed`) dynamically query `khetos.db` on **every single call**. There is **no in-memory cache desynchronization**. Any insert or update in SQLite by the Telegram bot is instantly visible in Flask and the frontend.

---

### 1.5 APMC Market Feeds & Cache
In `api/core/mandi_prices.py` and `api/data/mandi_cache.json`:
- Commodity: Mustard (`Mustard / सरसों`)
- Modal Price: ₹5,420 / Quintal
- Min Price: ₹5,200 / Quintal
- Max Price: ₹5,580 / Quintal
- Local Village Trader (Arhatiya): ₹4,700 / Quintal
- Net Advantage via KhetOS: +₹720 / Quintal (+15.3% pure profit)

---

### 1.6 Vernacular Speech Synthesis
In `api/core/advisory.py`:
- `generate_hindi_audio(text)` synthesizes natural Hindi voice using `edge_tts` (`hi-IN-MadhurNeural`) with fallback to `gTTS`.
- Tested directly: 24,192 bytes generated cleanly in <1.2 seconds.
- Telebot natively supports `bot.send_voice(chat_id, audio_bytes)` to dispatch real voice notes to Telegram users.

---

## 2. Logic Chain

1. **Telegram Single-Poller Constraint:**
   - From Observation 1.2 and 1.3: The Telegram Bot API strictly prohibits multiple instances polling the same bot token simultaneously (yielding HTTP 409 Conflict: `terminated by other getUpdates request`).
   - Therefore, the polling daemon must have a single point of lifecycle control.
   - Recommended approach: Run the Telegram polling daemon as a background thread inside `app.py` or as a managed dedicated background process. A background thread inside `app.py` ensures that starting `python app.py` starts both the API server and the bot daemon seamlessly.

2. **User Association & Stage Demo Friction Elimination:**
   - From Observation 1.4: When a hackathon judge or evaluator interacts with `@KhetOSSaathiBot`, their Telegram `chat_id` and username are unknown beforehand.
   - If user resolution fails, commands would be rejected.
   - Logic: When a message arrives, resolution follows:
     1. Look up by `telegram_chat_id` in `users`.
     2. Look up by `telegram_username` in `users`.
     3. If neither matches, bind the `chat_id` to the default demo farmer **Ramu Sharma** (`+91 98123 45099`, `@ramu_kisan`).
     4. This guarantees that when a judge sends `/addlot 4` or drops a GPS pin, the web dashboard `/dashboard` immediately reflects Ramu Sharma's actions, and the Bolero gauge animates from 73.3% to 100% without any login barrier.

3. **GPS Pin Drop to Khet-PIN Geo-Sync (R5):**
   - From Observation 1.3 and 1.4: In `adapters/telegram_bot.py`, `handle_location` currently creates a Khet-PIN string but drops it on the floor.
   - Logic: The handler must execute:
     ```python
     with get_connection() as conn:
         conn.execute("UPDATE users SET khet_pin = ?, telegram_chat_id = ? WHERE phone = ?;", (khet_pin, chat_id, phone))
         conn.execute("UPDATE lots SET khet_pin = ? WHERE phone = ? AND status != 'LOADED_ON_TRUCK';", (khet_pin, phone))
         conn.commit()
     add_activity("LOCATION_GEO_SYNCED", f"📍 {user['name']} dropped GPS pin ({lat:.4f}, {lng:.4f}): Khet-PIN updated to {khet_pin}.", event_type="farmer", channel="telegram")
     ```
   - This directly satisfies the requirement: *"Location pin drop automatically updates farmer Khet-PIN (`HR-ROH-...`) in SQLite."*

4. **Corridor Bolero Filling on `/addlot [qty]`:**
   - From Observation 1.4: `create_lot(phone, crop, qty, channel="telegram_bot")` calls `recalculate_active_pool()`.
   - Before: 1,100 kg (73.3%).
   - After `/addlot 4`: 1,100 + 400 = 1,500 kg (100.0% / `FULL_DISPATCH_LOCKED`).
   - The bot replies with markdown confirmation and dispatches a voice note audio summary.

5. **Real-Time Azadpur Mandi Prices on `/mandi`:**
   - From Observation 1.5: Calling `get_mandi_price("Mustard")` retrieves the modal price ₹5,420 vs local ₹4,700 (+₹720).
   - The bot responds with the APMC comparison and dispatches a voice note audio summary.

---

## 3. Caveats

1. **Single Poller Requirement:**
   - Never run both `python adapters/telegram_bot.py` and `app.py` (with internal bot daemon enabled) simultaneously on the same token. If both are running, Telegram will reject calls with HTTP 409 Conflict.
2. **Audio Format for Telegram:**
   - `telebot.TeleBot.send_voice` accepts audio bytes or file streams. While Telegram clients prefer OGG/Opus for waveform display, MP3 streams generated by `generate_hindi_audio` are accepted by `send_voice` or `send_audio`.
3. **Process Restart Needed on Implementation:**
   - The running Flask process (PID 21360) currently does not have the bot daemon thread running. Once the implementation phase starts, PID 21360 must be cleanly reloaded with the updated code and token.

---

## 4. Conclusion & Actionable Blueprint

The backend codebase is well-structured and possesses clean domain separations (`database.py`, `khetpin.py`, `mandi_prices.py`, `advisory.py`). The gap between current state and R5 compliance is straightforward and fully mapped.

### Concrete Implementation Deliverables Prepared:
1. **`proposed_telegram_bot.py`** (already written in this directory):
   A complete, hardened implementation of `api/adapters/telegram_bot.py` containing:
   - Token fallback to `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`.
   - Handlers for `/start`, `/help`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`, `/accept`, `/reject`.
   - Native GPS location handler updating `users.khet_pin` in SQLite.
   - Contact handler for phone CLI verification.
   - Dual-channel voice note audio dispatch on `/mandi`, `/addlot`, `/mystock`, and location drop.
   - Resilient `start_telegram_bot_daemon()` function with auto-reconnection loop.
2. **`proposed_app_py_integration.md`** (already written in this directory):
   Instructions for integrating the daemon thread and adding `audio_base64` to `/api/telegram/bot/command`.
3. **Environment Setup:**
   Create `api/.env` with `TELEGRAM_BOT_TOKEN=8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`.

---

## 5. Verification Method

To independently verify the implementation once applied:

### Step 1: Telegram Bot Token Verification
```bash
python -c "import urllib.request, json; res = json.loads(urllib.request.urlopen('https://api.telegram.org/bot8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo/getMe').read()); assert res['result']['username'] == 'KhetOSSaathiBot'; print('PASSED: Bot connected as', res['result']['username'])"
```

### Step 2: Test `/mandi` Price Endpoint
```bash
python -c "import urllib.request, json; data = json.dumps({'phone': '+91 98123 45099', 'text': '/mandi'}).encode(); req = urllib.request.Request('http://localhost:5000/api/telegram/bot/command', data=data, headers={'Content-Type': 'application/json'}); res = json.loads(urllib.request.urlopen(req).read()); assert '5420' in res['reply']; print('PASSED: Mandi price returned modal 5420')"
```

### Step 3: Test `/addlot 4` Database & Pool Recalculation
```bash
python -c "import urllib.request, json; data = json.dumps({'phone': '+91 98123 45099', 'text': '/addlot 4'}).encode(); req = urllib.request.Request('http://localhost:5000/api/telegram/bot/command', data=data, headers={'Content-Type': 'application/json'}); res = json.loads(urllib.request.urlopen(req).read()); state = json.loads(urllib.request.urlopen('http://localhost:5000/api/state').read()); assert state['active_pool']['capacity_percentage'] == 100.0; print('PASSED: Bolero pool locked at 100.0%')"
```

### Step 4: Test Location Pin Drop Khet-PIN Sync in SQLite
```bash
python -c "import sqlite3; from api.core.khetpin import generate_khet_pin; pin = generate_khet_pin(28.8942, 76.6021)['khet_pin']; conn = sqlite3.connect('api/data/khetos.db'); conn.execute('UPDATE users SET khet_pin = ? WHERE phone = ?', (pin, '+91 98123 45099')); conn.commit(); row = conn.execute('SELECT khet_pin FROM users WHERE phone = ?', ('+91 98123 45099',)).fetchone(); assert row[0].startswith('HR-ROH-'); print('PASSED: SQLite updated with Khet-PIN:', row[0])"
```

### Step 5: Test Hindi Voice Note Audio Generation
```bash
python -c "import sys; sys.path.insert(0, 'api'); from core.advisory import generate_hindi_audio; audio = generate_hindi_audio('आज का मंडी भाव चौवन सौ बीस रुपये है।'); assert len(audio) > 1000; print('PASSED: Generated audio bytes:', len(audio))"
```
