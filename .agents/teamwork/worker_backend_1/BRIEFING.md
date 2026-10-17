# BRIEFING — 2026-10-18T04:23:00Z

## Mission
Implement R5: Production-grade Telegram Bot Daemon, full command suite, GPS pin drop to Khet-PIN sync, and Flask integration.

## 🔒 My Identity
- Archetype: worker_backend_1
- Roles: implementer, qa, specialist
- Working directory: C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\worker_backend_1
- Original parent: 991d5f41-5ed5-421f-9dd8-9b27a294f676
- Milestone: Milestone 2 / R5: Telegram Bot Daemon & Geo-Sync

## 🔒 Key Constraints
- Exclusive write ownership: `api/.env`, `api/adapters/telegram_bot.py`, `api/app.py`, `api/run_telegram_daemon.py`.
- DO NOT touch any frontend code in `client/`.
- Hard fallback token: `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`.
- Real state & genuine implementation: No hardcoded test results, no dummy facades.
- Non-blocking daemon: Ensure polling daemon runs safely in background without blocking Flask or port 5000.

## Current Parent
- Conversation ID: 991d5f41-5ed5-421f-9dd8-9b27a294f676
- Updated: 2026-10-18T04:23:00Z

## Task Summary
- **What to build**: Full Telegram command suite (`/start`, `/help`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`, `/accept`, `/reject`), GPS location handler (Khet-PIN generation, user/lot update, activity log, audio response), auto-binding to demo farmer Ramu Sharma, Telegram polling daemon integration in `api/app.py` / `run_telegram_daemon.py`, token in `api/.env`.
- **Success criteria**: All 5 verification steps from `explorer_survey_2/handoff.md` pass without error; bot daemon active and responding to Telegram API updates; SQLite database tables correctly updated.
- **Interface contracts**: PROJECT.md & explorer_survey_2/handoff.md
- **Code layout**: `api/adapters/telegram_bot.py`, `api/app.py`, `api/.env`

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pending verification
- **Lint status**: Clean
- **Tests added/modified**: Verification suite via CLI/test script

## Loaded Skills
- None loaded yet

## Key Decisions Made
- Will review survey findings and proposed scripts before modifying `api/adapters/telegram_bot.py` and `api/app.py`.

## Artifact Index
- `DISPATCH.md` — Assignment instructions
- `BRIEFING.md` — Working memory and context
- `progress.md` — Heartbeat and step tracking
