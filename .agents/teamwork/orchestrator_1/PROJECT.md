# Project: KhetOS (खेतOS) Cosmic Obsidian & Live Telegram Bot System

## Architecture
- **Frontend (`client/`)**: Vite 6 + React 19 + Tailwind CSS 3 + Lucide React.
  - Layered visual container: Cosmic Obsidian background (`#080A19`), 3 ambient blur orbs (Emerald, Amber, Indigo), starfield micro-dot grid, and perspective 3D cyber grid horizon (`rotateX(62deg)`).
  - Global viewport top laser bar: 3px animated shimmering gradient bar.
  - Interactive 3D Cockpit (`perspective: 1000px`): Mac window controls, URL breadcrumbs, live SVG spline area charts, capacity metric pills, live checklist.
  - Double horizontal running ticker marquees with gradient fade masks.
  - Farm-gate quality scanner card: vertical sweeping teal laser beam with real-time extracted telemetry.
  - Three 3D tilted glowing role cards (Farmer, Bolero Transporter, Institutional Buyer) with radial spot glows and glowing bottom beams.
  - Glassmorphic consoles: Navbar and AuthPage aligned with hairline borders (`border-white/[0.08]`) and top inner highlights (`inset 0 1px 0 rgba(255,255,255,0.08)`).
- **Backend (`api/`)**: Flask REST API Engine + SQLite (`khetos.db` in WAL mode).
  - Telegram bot adapter: pyTelegramBotAPI daemon long-polling `@KhetOSSaathiBot` with token `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`.
  - Command handlers: `/start`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`.
  - Location handler: native GPS pin drop converting coordinates into Khet-PIN (`HR-ROH-...`) and saving to SQLite.
  - Vernacular voice dispatch: Hindi audio synthesis via `generate_hindi_audio`.
  - Corridor pooling: Bolero capacity recalculation (73.3% -> 100% on lot addition).
  - Fast-gates: HTTP 200 authentication for Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan, and Ramu Sharma.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Cosmic Obsidian Theme & Tokens | Color variables (`#080A19`/`#06090e`), glassmorphic panels, hairline borders (`border-white/[0.08]`), inner highlights | M1 | Survey 1 |
| 2 | Top Glowing 3px Progress Laser Bar | Fixed viewport top laser with animated shimmer gradient and drop glow | M1 | Survey 1 |
| 3 | Three Ambient Radial Blur Orbs | Emerald (`#10b981`), Amber Gold (`#f59e0b`), Indigo (`#818cf8`) with soft breathing blur | M1 | Survey 1 |
| 4 | Starfield & 3D Perspective Cyber Grid | Starfield micro-dot grid and `rotateX(62deg)` cyber grid horizon with laser glow | M1 | Survey 1 |
| 5 | Interactive 3D Cockpit Preview | `perspective: 1000px` angled glassmorphic dashboard frame, Mac controls, URL breadcrumb | M2 | Survey 1 |
| 6 | Live SVG Spline Area Wave Chart | Dual spline curves (Mandi spot price vs benchmark modal) with pulsing node | M2 | Survey 1 |
| 7 | Capacity Metric Pills & Checklist | Bolero 96% locked capacity pill and live checklist verification items | M2 | Survey 1 |
| 8 | Double Infinite Running Marquees | APMC mandis marquee + core logistics guarantees marquee with edge gradient fade masks | M2 | Survey 1 |
| 9 | Farm-Gate Quality Scanner Card | ICAR/Agmarknet lot card with animated teal laser beam sweeping vertically | M3 | Survey 1 |
| 10 | Real-Time Telemetry Grid | Moisture (7.2%), Purity (98.4%), ICAR salts (0.00 ppm), Oil content (41.8%) readouts | M3 | Survey 1 |
| 11 | Three 3D Tilted Glowing Cards | Farmer, Transporter, Buyer cards with spot glows, bottom border beams, Lucide icons | M4 | Survey 1 |
| 12 | Navbar & AuthPage Glassmorphic Alignment | Hairline borders, inner top highlights, preserving all demo fast-gates | M4 | Survey 1 |
| 13 | Live Telegram Bot Daemon | Background polling daemon for `@KhetOSSaathiBot` (token `8821984224:AAHtUCnBxFpnid72Q35Ui0C27-3JmJxyqXo`) | M5 | Survey 2 |
| 14 | Telegram Command Handlers | `/start`, `/mandi` (Azadpur APMC prices), `/mystock`, `/addlot`, `/modlot`, `/dellot` | M5 | Survey 2 |
| 15 | Native GPS Pin Drop to Khet-PIN Sync | GPS location drop converted to Khet-PIN (`HR-ROH-...`) and saved to SQLite `users` table | M5 | Survey 2 |
| 16 | Vernacular Audio Dispatch | Voice note audio dispatch via `generate_hindi_audio` sent to Telegram users | M5 | Survey 2 |
| 17 | E2E System & Build Integrity Gate | Zero errors in `npm run build`, active servers on 5000 & 5173, demo fast-gates HTTP 200 | M6 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Cosmic Theme, Horizon & Laser Bar | `client/src/index.css`, `TopLaserBar.jsx`, `CosmicBackground.jsx` | none | IN_PROGRESS (worker_frontend_1) |
| M2 | 3D Cockpit Preview & Ticker Marquees | `CockpitPreview.jsx`, `TickerMarquee.jsx` | M1 | IN_PROGRESS (worker_frontend_1) |
| M3 | Farm-Gate Quality Scanner & Telemetry | `QualityScannerLaser.jsx` | M1 | IN_PROGRESS (worker_frontend_1) |
| M4 | 3D Tilted Glowing Cards & Consoles | `LandingPage.jsx`, `Navbar.jsx`, `AuthPage.jsx` | M1, M2, M3 | IN_PROGRESS (worker_frontend_1) |
| M5 | Live Telegram Bot Daemon & Geo-Sync | `api/adapters/telegram_bot.py`, `api/app.py`, `api/.env` | none | IN_PROGRESS (worker_backend_1) |
| M6 | Final Acceptance & Adversarial Gate | Full 4-tier E2E tests, fast-gates HTTP 200, build verification | M1, M2, M3, M4, M5 | PLANNED (test_writer_1 prep) |

## Interface Contracts
### Client Styling ↔ Components
- CSS Variables: `--color-bg: 8 10 25;`, `--color-card: 13 18 36;`, `--color-primary: 16 185 129;`, `--color-accent: 245 158 11;`, `--color-border: 255 255 255 / 0.08;`
- Keyframes: `@keyframes laserShimmer`, `@keyframes laserSweep`, `@keyframes gridMove`, `@keyframes marqueeLeft`, `@keyframes marqueeRight`.
- Class names: `.laser-progress-bar`, `.cosmic-cyber-grid`, `.scanner-laser-line`.

### Telegram Daemon ↔ SQLite Database
- Database path: `api/data/khetos.db`
- `UPDATE users SET khet_pin = ?, telegram_chat_id = ? WHERE phone = ?`
- `recalculate_active_pool()` updates `pools` table and sets status `FULL_DISPATCH_LOCKED` when `capacity_percentage == 100.0`.
- Telemetry & Mandi prices: `get_mandi_price("Mustard")` returns modal ₹5,420 / Qtl.

## Code Layout
- `client/src/index.css`: Global theme variables, cosmic obsidian styles, laser and cyber grid keyframes.
- `client/src/components/TopLaserBar.jsx`: Viewport top 3px laser progress bar.
- `client/src/components/CosmicBackground.jsx`: Radial blur orbs, micro-dots, perspective 3D cyber grid.
- `client/src/components/CockpitPreview.jsx`: 3D angled cockpit dashboard with SVG wave chart and checklist.
- `client/src/components/TickerMarquee.jsx`: Dual running ticker marquees with gradient edge masks.
- `client/src/components/QualityScannerLaser.jsx`: Agricultural lot scanner card with vertical teal laser line.
- `client/src/pages/LandingPage.jsx`: Hero assembly, 3D tilted role cards (Farmer, Transporter, Buyer), APMC banner.
- `client/src/components/Navbar.jsx`: Cosmic glassmorphic styling, hairline borders, inner highlights.
- `client/src/pages/AuthPage.jsx`: Obsidian glassmorphism with fast-gates intact.
- `api/adapters/telegram_bot.py`: Live Telegram polling daemon for `@KhetOSSaathiBot`.
- `api/app.py`: Background daemon thread launcher, `/api/telegram/bot/command` with audio base64.
- `api/.env`: Active Telegram bot token.
