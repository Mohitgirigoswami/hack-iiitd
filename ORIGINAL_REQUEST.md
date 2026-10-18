# Original User Request

## Initial Request — 2026-10-17T22:35:32Z

Replicate the award-winning cosmic dark aesthetic, 3D perspective cyber grid, and rich animations of https://www.credentiaonline.in/ across KhetOS (खेतOS), while activating the live Telegram bot token (`@KhetOSSaathiBot`) and unifying the phone location architecture.

Working directory: C:\Users\mohit\coding\hackathons\iiitd
Integrity mode: demo

## Requirements

### R1. Credentia-Inspired Visual Theme & Atmosphere
Implement the cosmic obsidian design language (`#080A19` / `#06090e`), top glowing 3px progress laser bar, 3 ambient radial blur orbs (Emerald `#10b981`, Amber Gold `#f59e0b`, Indigo `#818cf8`), starfield micro-dot grid, and perspective 3D cyber grid horizon (`rotateX(62deg)` with horizon laser glow).

### R2. Interactive 3D Cockpit Preview & Infinite Ticker Marquees
Replicate the angled 3D dashboard cockpit frame (`perspective: 1000px`) with Mac-style window controls, simulated URL breadcrumb, live SVG spline area wave chart, capacity metric pills (96% locked), and live checklist verification items. Add double horizontal running ticker marquees with gradient fade masks showcasing APMC mandis and core logistics guarantees.

### R3. Farm-Gate Quality Scanner Laser Animation
Replicate Credentia's document verification scanner for agricultural lots: an authentic grain lot inspection card with an animated teal laser beam line sweeping vertically, paired with real-time extracted telemetry (moisture 7.2%, purity 98.4%, ICAR salts, benchmark match).

### R4. Three Glowing Portals & Glassmorphic Consoles
Build 3D tilted glowing cards for Farmer, Bolero Transporter, and Institutional Buyer with corner radial spot glows, glowing bottom border beams, and Lucide icons. Align Navbar and auth forms with hairline borders (`border-white/[0.08]`) and inner top highlights (`inset 0 1px 0 rgba(255,255,255,0.08)`).

### R5. Live Telegram Bot Daemon & Location Geo-Sync
Connect the backend to `@KhetOSSaathiBot` using token `REDACTED_TELEGRAM_BOT_TOKEN`. Implement background long-polling handling `/start`, `/mandi`, `/mystock`, `/addlot`, `/modlot`, `/dellot`, native GPS pin drop conversion to Khet-PIN, and voice note audio dispatch.

## Acceptance Criteria

### Visual & Animation Quality
- [ ] Top 3px glowing gradient laser bar renders across the viewport.
- [ ] Ambient radial blur orbs and 3D perspective cyber grid floor render with 60fps performance and zero layout shift.
- [ ] Interactive 3D cockpit preview displays responsive SVG area charts and interactive role tabs.
- [ ] Automated lot scanning laser line sweeps smoothly over the inspection card with dynamic readouts.
- [ ] Dual infinite running ticker marquees scroll seamlessly without stutter or clipping.

### Live Bot & Telephony Execution
- [ ] Telegram bot listener polls `@KhetOSSaathiBot` with zero crashes.
- [ ] Sending `/mandi` to `@KhetOSSaathiBot` returns real-time Azadpur APMC prices.
- [ ] Sending `/addlot [qty]` updates the SQLite database and updates the active Bolero pool.
- [ ] Location pin drop automatically updates farmer Khet-PIN (`HR-ROH-...`) in SQLite.

### Build & System Integrity
- [ ] `npm run build` in `client/` succeeds with zero errors.
- [ ] Both Flask backend (`http://localhost:5000`) and Vite dev server (`http://localhost:5173`) remain active and responsive.
- [ ] All existing demo fast-gates (Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan) continue to authenticate with HTTP 200.
