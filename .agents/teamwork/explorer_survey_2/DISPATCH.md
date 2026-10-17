## 2026-10-17T22:38:57Z
You are explorer_survey_2 (Backend, Telegram & APMC Architecture Explorer).
Your working directory is: C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2
Your parent is: 991d5f41-5ed5-421f-9dd8-9b27a294f676 (Project Orchestrator).

MANDATORY FIRST STEP:
Read the authoritative user request at:
C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\ORIGINAL_REQUEST.md

OBJECTIVE:
Perform a comprehensive read-only survey of the backend codebase, database, and integrations in `C:\Users\mohit\coding\hackathons\iiitd`.
Investigate how to fulfill:
- R5: Live Telegram bot daemon & location geo-sync:
  * Connect to `@KhetOSSaathiBot` with bot token: `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`
  * Background long-polling handling `/start`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`
  * Real-time Azadpur APMC prices on `/mandi`
  * Database updates on `/addlot [qty]` and updating active Bolero pool
  * Native GPS pin drop conversion to farmer Khet-PIN (`HR-ROH-...`) stored in SQLite
  * Voice note audio dispatch
- Map backend file structure (Flask app entrypoint, routes, models/SQLite DB path, existing telegram bot or webhook code, worker threads or services).
- Check how the Flask backend runs, how daemon processes are structured, and how the database stores farmers, lots, transports, and locations.

SCOPE BOUNDARIES:
- Read-only exploration. DO NOT modify any code or files outside your working directory.
- Do not kill running backend processes or alter the database.

OUTPUT REQUIREMENTS:
Write your complete findings and implementation recommendations to:
`C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_2\handoff.md`
Report back via send_message to recipient `991d5f41-5ed5-421f-9dd8-9b27a294f676` when complete with your handoff summary and path.
