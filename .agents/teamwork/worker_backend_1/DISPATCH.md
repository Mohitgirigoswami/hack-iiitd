## 2026-10-17T22:52:07Z
You are worker_backend_1 (Backend, Telegram Daemon & Geo-Sync Specialist).
Your working directory is: C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\worker_backend_1
Your parent is: 991d5f41-5ed5-421f-9dd8-9b27a294f676 (Project Orchestrator).

MANDATORY FIRST STEPS:
1. Read the authoritative user request at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project specification at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\orchestrator_1\PROJECT.md
3. Read the backend survey handoff report at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2\handoff.md
4. Read the prepared reference code at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2\proposed_telegram_bot.py
5. Read the app integration guide at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2\proposed_app_py_integration.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may modify:
- `api/.env`
- `api/adapters/telegram_bot.py`
- `api/app.py`
- `api/run_telegram_daemon.py` (if created)
DO NOT touch any frontend code in `client/`.

OBJECTIVE & DELIVERABLES:
Implement R5:
1. Token & Environment:
   - Configure `TELEGRAM_BOT_TOKEN=8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo` in `api/.env`.
   - Update `api/adapters/telegram_bot.py` with hard fallback to token `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`.
2. Implement Full Telegram Command Suite in `api/adapters/telegram_bot.py`:
   - `/start` and `/help`: Welcome message, command guide, interactive reply keyboard.
   - `/mandi`: Real-time Azadpur APMC prices (modal ₹5,420 vs local ₹4,700, +₹720 profit) and dispatch vernacular Hindi audio summary.
   - `/mystock`: Active farmer harvest lots and bag count.
   - `/addlot [qty]`: Adds harvest lot to SQLite, updates Bolero pool (`POOL-ROH-104`), locks at 100% when full, and dispatches voice note.
   - `/modlot [lot_id] [qty]`: Modifies lot quantity in SQLite.
   - `/dellot [lot_id]`: Deletes lot with ₹0 penalty.
   - `/accept` & `/reject`: Transporter pickup confirmation.
3. Native GPS Location Pin Drop to Khet-PIN Sync:
   - When a location pin drop is received, convert coordinates via `generate_khet_pin(lat, lng)`.
   - Update `khet_pin` in SQLite table `users` and active lots.
   - Record activity feed entry.
   - Dispatch confirmation message with Khet-PIN (`HR-ROH-...`) and audio note.
4. Auto-Bind Unknown Telegram Users:
   - Resolve user by `telegram_chat_id`, then `telegram_username`, and default/bind to demo farmer Ramu Sharma (`+91 98123 45099`) so evaluation messages instantly update the active corridor and live dashboard.
5. Live Bot Daemon Activation:
   - Ensure the bot polling daemon is actively running in background (either launched as daemon thread in `app.py` or as a background service) without blocking Flask API or conflicting on port 5000.
6. Verification: Run all 5 verification steps from `explorer_survey_2\handoff.md` and ensure zero errors.

OUTPUT REQUIREMENTS:
Document all changes and verification outputs in your handoff report:
`C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\worker_backend_1\handoff.md`
Report back via send_message to recipient `991d5f41-5ed5-421f-9dd8-9b27a294f676` when complete.
