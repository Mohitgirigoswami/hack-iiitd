## 2026-10-17T22:52:07Z
You are worker_frontend_1 (Frontend UI & 3D Animation Specialist).
Your working directory is: C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\worker_frontend_1
Your parent is: 991d5f41-5ed5-421f-9dd8-9b27a294f676 (Project Orchestrator).

MANDATORY FIRST STEPS:
1. Read the authoritative user request at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\ORIGINAL_REQUEST.md
2. Read the project specification at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\orchestrator_1\PROJECT.md
3. Read the detailed frontend exploration handoff report at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\explorer_survey_1\handoff.md
4. Read the UI/UX design skill instructions at:
   C:\Users\mohit\coding\hackathons\iiitd\.agents\skills\ui-ux-pro-max\SKILL.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

EXCLUSIVE WRITE OWNERSHIP:
You exclusively own and may modify or create the following files:
- `client/src/index.css`
- `client/src/components/TopLaserBar.jsx`
- `client/src/components/CosmicBackground.jsx`
- `client/src/components/CockpitPreview.jsx`
- `client/src/components/TickerMarquee.jsx`
- `client/src/components/QualityScannerLaser.jsx`
- `client/src/pages/LandingPage.jsx`
- `client/src/components/Navbar.jsx`
- `client/src/pages/AuthPage.jsx`
- `client/src/App.jsx`
DO NOT modify any backend files in `api/`.

OBJECTIVE & DELIVERABLES:
Implement R1, R2, R3, R4 with pixel-perfect cosmic obsidian aesthetics and fluid 60fps animations:
1. R1: Cosmic obsidian theme variables in `client/src/index.css` (`#080A19` / `#06090e`), top glowing 3px progress laser bar (`TopLaserBar.jsx`), 3 ambient radial blur orbs (Emerald `#10b981`, Amber Gold `#f59e0b`, Cosmic Indigo `#818cf8`), starfield micro-dot grid, and perspective 3D cyber grid horizon (`rotateX(62deg)` with horizon laser glow).
2. R2: Interactive 3D cockpit preview (`CockpitPreview.jsx`, `perspective: 1000px`, Mac-style window controls, simulated URL breadcrumbs, live SVG spline wave chart with pulsing node, Bolero 96% locked capacity metric pill, live checklist verification items), and double horizontal running ticker marquees (`TickerMarquee.jsx`) with gradient fade masks.
3. R3: Farm-gate quality scanner card (`QualityScannerLaser.jsx`): authentic ICAR agricultural lot card, vertical sweeping teal laser beam line with trailing light sheet, real-time extracted telemetry (moisture 7.2%, purity 98.4%, ICAR salts 0.00 ppm, oil content 41.8%).
4. R4: Three 3D tilted glowing role cards on `LandingPage.jsx` (Farmer, Bolero Transporter, Institutional Buyer) with corner radial spot glows, bottom glowing border beams, Lucide icons, hairline borders (`border-white/[0.08]`), inner top highlights (`inset 0 1px 0 rgba(255,255,255,0.08)`). Align `Navbar.jsx` and `AuthPage.jsx` with cosmic obsidian glassmorphic styling, preserving all 3 demo fast-gate buttons (Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan) and `/call` route intact.
5. Verification: Run `npm run build` in `client/` and verify it succeeds with 0 errors.

OUTPUT REQUIREMENTS:
Document all modified files, components, and the passing build output in your handoff report:
`C:\Users\mohit\coding\hackathons\iiitd\.agents\teamwork\worker_frontend_1\handoff.md`
Report back via send_message to recipient `991d5f41-5ed5-421f-9dd8-9b27a294f676` when complete.
