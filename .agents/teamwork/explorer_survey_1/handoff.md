# Frontend Architecture & Credentia Styling Exploration Report

## 1. Observation

### 1.1 Codebase & Build Environment
- **Project Structure**: Located at `C:\Users\mohit\coding\hackathons\iiitd\client`.
- **Package Specifications** (`client/package.json` lines 11-25):
  - React 19.0.0 (`react`, `react-dom`)
  - React Router DOM 7.18.4 (`react-router-dom`)
  - Lucide React 1.16.0 (`lucide-react`)
  - Tailwind CSS 3.4.16 (`tailwindcss`, `postcss`, `autoprefixer`)
  - Vite 6.0.3 (`vite`, `@vitejs/plugin-react`)
- **Build Status**: Command `npm run build` in `client/` executed successfully:
  - 1963 modules transformed
  - Build output: `dist/index.html` (0.75 kB), `dist/assets/index-YOIA5poe.css` (42.20 kB), `dist/assets/index-CnJswBqE.js` (465.45 kB)
  - Exit code: 0, 0 build errors.

### 1.2 Existing Styling & Theme Architecture
- **`client/src/index.css`** (lines 5-36):
  - Default theme is `dark-mandi` (Obsidian Mandi), configured with CSS variables:
    ```css
    --color-bg: 10 13 18;       /* #0a0d12 deep luxury obsidian slate */
    --color-fg: 248 250 252;    /* #f8fafc */
    --color-card: 16 21 29;     /* #10151d */
    --color-primary: 16 185 129;/* #10b981 emerald */
    --color-accent: 245 158 11; /* #f59e0b amber */
    --color-border: 30 38 51;   /* #1e2633 */
    ```
  - Currently lacks Credentia's cosmic deep void (`#080A19` / `#06090e`), starfield micro-dots, 3D perspective cyber grid, and laser sweeping animations.
- **`client/src/lib/themes.js`** (lines 9-22):
  - `dark-mandi` preview background is `#090d10`, card `#11161d`, primary `#10b981`.
- **`client/tailwind.config.js`** (lines 8-41):
  - Extends colors with CSS custom properties (`rgb(var(--color-bg) / <alpha-value>)`).
  - Extends `boxShadow` with `glow: '0 0 25px -5px rgb(var(--color-primary) / 0.25)'`.
  - Currently lacks custom 3D perspective utilities (`perspective: 1000px`), keyframes for marquees, lasers, or cyber grids.

### 1.3 Component & Page Hierarchy
- **`client/src/App.jsx`** (lines 13-54):
  - Root container: `<div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">`
  - Mounts `<Navbar />` at line 20, followed by `<Routes>`, and footer.
  - No top laser bar currently exists.
- **`client/src/pages/LandingPage.jsx`** (lines 1-296):
  - Current hero has a simple radial top blur (`bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl`).
  - 4 static cards in a 2x2 grid (Farmer, Transporter, Buyer, Admin) with standard `border-border/70` and `bg-card/80`.
  - No interactive 3D dashboard cockpit frame.
  - No dual horizontal running ticker marquees.
  - No farm-gate quality scanner laser animation.
- **`client/src/components/Navbar.jsx`** (lines 52-166):
  - Sticky header (`sticky top-0 z-40 bg-card/90 backdrop-blur-md border-b border-border`).
  - Contains branding, corridor status indicator (`Rohtak-Azadpur Corridor`), navigation tabs (`Portals`, `Dashboard`, `Register / Sign In`, `Toll-Free /call`), notification drawer bell, reset button, and `ThemeSwitcher`.
- **`client/src/pages/AuthPage.jsx`** (lines 180-398):
  - Card container uses standard `bg-card border border-border`.
  - Contains verified demo 1-click fast-gate buttons:
    - Baljit Singh (`+91 94160 88219`, PIN: `1234`, DRIVER)
    - Shree Ram Mill (`+91 98111 22334`, PIN: `1234`, BUYER)
    - Dr. Vivek Swaminathan (`+91 11 2769 1100`, PIN: `2026`, ADMIN)

---

## 2. Logic Chain

### 2.1 Fulfilling R1: Cosmic Obsidian Design Language & Atmosphere
1. **Color Tokens Transition**:
   - In `client/src/index.css`, update `:root` and `[data-theme="dark-mandi"]` variables:
     - `--color-bg: 8 10 25;` (RGB for `#080A19`)
     - `--background: #080a19;`
     - Card background updated to `#0d1224` (RGB `13 18 36`) with glassmorphic opacity `rgba(13, 18, 36, 0.75)`.
     - Hairline borders: `border-white/[0.08]` (1px solid `rgba(255, 255, 255, 0.08)`).
     - Inner highlights: `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08)`.
2. **Top Glowing 3px Progress Laser Bar**:
   - Create component `client/src/components/TopLaserBar.jsx` mounted in `client/src/App.jsx` right at the root before `<Navbar />`.
   - Fixed styling: `fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none`.
   - Multi-color laser gradient: `linear-gradient(90deg, #10b981 0%, #818cf8 50%, #f59e0b 100%, #10b981 100%)`.
   - Animation: `@keyframes laserShimmer` with `background-size: 200% 100%`, infinite loop.
   - Laser beam drop-shadow: `box-shadow: 0 0 10px 2px rgba(16, 185, 129, 0.7), 0 0 18px 4px rgba(129, 140, 248, 0.5)`.
3. **Three Ambient Radial Blur Orbs**:
   - Encapsulated in `client/src/components/CosmicBackground.jsx` (or directly within `LandingPage.jsx`):
     - **Orb 1 (Emerald `#10b981`)**: Top-left / center, diameter 480px, `filter: blur(120px)`, opacity `0.18`, subtle breathing animation.
     - **Orb 2 (Amber Gold `#f59e0b`)**: Mid-right, diameter 420px, `filter: blur(140px)`, opacity `0.14`.
     - **Orb 3 (Cosmic Indigo `#818cf8`)**: Top-right, diameter 520px, `filter: blur(130px)`, opacity `0.16`.
4. **Starfield Micro-Dot Grid**:
   - Layered CSS background pattern:
     ```css
     background-image: radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px);
     background-size: 28px 28px;
     ```
   - Blended with subtle CSS stars across the background layer.
5. **Perspective 3D Cyber Grid Horizon (`rotateX(62deg)` with Horizon Laser Glow)**:
   - Container with `perspective: 500px; overflow: hidden;` positioned under the hero.
   - Plane styling:
     ```css
     transform: rotateX(62deg);
     transform-origin: 50% 0%;
     background-image: 
       linear-gradient(to right, rgba(16, 185, 129, 0.22) 1px, transparent 1px),
       linear-gradient(to bottom, rgba(16, 185, 129, 0.22) 1px, transparent 1px);
     background-size: 36px 36px;
     mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%);
     -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%);
     animation: gridMove 20s linear infinite;
     ```
   - **Horizon Laser Glow**: Horizontal 2px beam at the vanishing horizon with gradient `linear-gradient(90deg, transparent, #10b981, #818cf8, #f59e0b, transparent)` and `box-shadow: 0 0 24px 4px rgba(16, 185, 129, 0.75)`.

---

### 2.2 Fulfilling R2: Interactive 3D Cockpit Preview & Infinite Ticker Marquees
1. **Interactive 3D Cockpit Preview (`perspective: 1000px`)**:
   - Create component `client/src/components/CockpitPreview.jsx`.
   - Outer wrapper has `perspective: 1000px`.
   - Frame has resting tilt: `transform: rotateX(7deg) scale(0.97)` with smooth hover leveling `hover:rotateX(0deg) hover:scale-100 transition-transform duration-500 ease-out`.
   - Frame styling: Obsidian dark glass chassis (`background: rgba(12, 16, 32, 0.85); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 30px 70px -15px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.1)`).
2. **Mac-Style Window Controls & Simulated Breadcrumb**:
   - Three circular traffic lights: Red (`#ff5f56`), Yellow (`#ffbd2e`), Green (`#27c93f`).
   - Browser URL breadcrumb pill:
     `https://khetos.gov.in/corridor/rohtak-azadpur/telemetry` with green SSL padlock icon and `Live 60FPS` badge.
3. **Live SVG Spline Area Wave Chart**:
   - Area spline rendered with responsive SVG viewBox `0 0 600 180`:
     - Spline Path: `<path d="M 0 140 C 90 120, 150 70, 220 90 C 290 110, 360 40, 430 55 C 500 70, 550 25, 600 35 L 600 180 L 0 180 Z" fill="url(#emeraldSplineGrad)" />`
     - Stroke Path: `<path d="..." fill="none" stroke="#10b981" strokeWidth="2.5" />`
     - Secondary Benchmark Spline: `#818cf8` / `#f59e0b` dashed line showing Agmarknet modal benchmark (₹5,420/Qtl).
     - Pulsing node on the latest data point with SVG glowing filter and tooltip (`₹5,420 / Qtl (+2.4%)`).
4. **Capacity Metric Pills (96% Locked)**:
   - Interactive KPI pill: "Mahindra Bolero 1.5T • 1,440 / 1,500 kg (96% Locked)".
   - Progress bar with glowing emerald tip and animated pulse badge.
5. **Live Checklist Verification Items**:
   - 4-item live verification grid:
     - "PMGSY Geo-Route Locked: Rohtak ➔ Bhalaut ➔ Kalanaur" (`CheckCircle2` text-emerald-400)
     - "ICAR Quality Benchmark: Grade-A Mustard (>40% Oil)" (`CheckCircle2` text-emerald-400)
     - "20% Escrow Advance: Locked via Razorpay" (`CheckCircle2` text-emerald-400)
     - "Weighbridge Electronic Slip Sync: Connected" (`CheckCircle2` text-emerald-400)
6. **Double Horizontal Running Ticker Marquees**:
   - Create component `client/src/components/TickerMarquee.jsx`.
   - **Marquee 1 (APMC Mandis & Live Spot Prices)**:
     - Moves leftwards (`animation: marqueeLeft 30s linear infinite`).
     - Real mandis: `Azadpur APMC ₹5,420/Qtl (+2.4%)` • `Lawrence Road ₹5,460/Qtl` • `Alwar Mandi ₹5,380/Qtl` • `Jaipur APMC ₹5,410/Qtl` • `Hapur APMC ₹5,395/Qtl` • `Bhiwani Sub-Yard ₹5,405/Qtl` • `Najafgarh Mandi ₹5,430/Qtl`.
   - **Marquee 2 (Core Logistics Guarantees)**:
     - Moves in opposite direction or synchronized speed (`animation: marqueeRight 32s linear infinite`).
     - Core pillars: `⚡ 1.5T Bolero Capacity Pooling` • `🔒 20% Buyer Escrow Advance` • `⚖️ 50kg Discrete Knapsack Multiples` • `🌾 ₹0 Farmer Fee (100% Free)` • `🛰️ PMGSY Dirt-Road Snapping` • `📞 1800-KHET-OS Toll-Free IVR` • `🛡️ 0% Khali Phera Return Guarantee`.
   - **Gradient Fade Masks**:
     - Masked with CSS:
       `mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);`
       `-webkit-mask-image: linear-gradient(to right, transparent, black 12%, black 88%, transparent);`

---

### 2.3 Fulfilling R3: Farm-Gate Quality Scanner Laser Animation
1. **Lot Inspection Card Architecture**:
   - Create component `client/src/components/QualityScannerLaser.jsx`.
   - Structure of the authentic Agricultural Lot Quality Card:
     - Card Header: ICAR (Indian Council of Agricultural Research) & Agmarknet Farm-Gate Optical Scan.
     - Lot Metadata: `LOT-2026-MUSTARD-8812` • Farmer: `Ramu Sharma (HR-ROH-78G4)` • Commodity: `Brassica juncea (Pusa Mustard-30)`.
     - Inspection Canvas: High-tech grain lot sample viewport with micro-particles/seed graphic.
2. **Teal Animated Laser Beam Sweep**:
   - Horizontal beam line sweeping vertically from top to bottom and returning:
     - Styling: `h-[2px] bg-gradient-to-r from-transparent via-[#14b8a6] to-transparent`
     - Glow: `box-shadow: 0 0 14px 3px rgba(20, 184, 166, 0.8), 0 0 28px 6px rgba(6, 182, 212, 0.45)`
     - Trailing light sheet: A translucent teal gradient trapezoid/glow trailing behind the laser beam (`background: linear-gradient(to bottom, rgba(20,184,166,0.15), transparent)`).
     - Keyframe: `@keyframes laserSweep { 0%, 100% { top: 2%; opacity: 0.8; } 50% { top: 96%; opacity: 1; } }` (duration 3.5s ease-in-out infinite).
3. **Real-Time Extracted Telemetry Grid**:
   - 4 live telemetry gauges with animated status:
     - **Moisture**: `7.2%` (Safe threshold: <8.0% | Status: OPTIMAL DRYNESS • PASSED)
     - **Purity**: `98.4%` (Foreign matter: 1.6% | Benchmark: >97.0% Grade A • PASSED)
     - **ICAR Salts & Residue**: `0.00 ppm` (MRL Safe Limit Compliance: 100% • VERIFIED)
     - **Oil Content**: `41.8%` (Benchmark Match: Premium Mill Grade +₹120/Qtl bonus • GRADE A)
   - Real-time scanning status pill: "Multi-Spectral Laser Active • 60 FPS Optical Stream".

---

### 2.4 Fulfilling R4: Three 3D Tilted Glowing Cards & System-Wide Alignment
1. **Three 3D Tilted Glowing Cards for Core Stakeholders**:
   - Refactor the role gateway on `LandingPage.jsx` into 3 dedicated flagship cards:
     1. **Farmer Portal** (`Sprout` icon, Emerald `#10b981` theme)
     2. **Bolero Transporter Portal** (`Truck` icon, Electric Blue/Cyan `#38bdf8` theme)
     3. **Institutional Buyer Portal** (`Building2` icon, Amber Gold `#f59e0b` theme)
     (Plus an expansive Command Center bar for APMC Mandi Regulators).
   - Card Specifications:
     - **Hairline Border**: `border border-white/[0.08]`
     - **Inner Top Highlight**: `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08)`
     - **Corner Radial Spot Glow**:
       `background: radial-gradient(circle at top left, rgba(16, 185, 129, 0.15) 0%, transparent 65%), rgba(12, 16, 32, 0.75)`
     - **Glowing Bottom Border Beam**:
       An absolute positioned 2px gradient line along the bottom border: `bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 group-hover:opacity-100 transition-opacity`.
     - **3D Tilt Interaction**:
       `hover:-translate-y-2 hover:rotate-[-0.5deg] hover:shadow-2xl transition-all duration-300 ease-out`.
2. **Navbar Alignment**:
   - `client/src/components/Navbar.jsx`:
     - Update header container to:
       `bg-[#080A19]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`
     - Ensure brand logo, corridor status pill, and navigation links use `border-white/[0.08]` and clean hover highlights.
3. **AuthPage Alignment**:
   - `client/src/pages/AuthPage.jsx`:
     - Main chassis: `bg-[#0c1020]/90 backdrop-blur-xl border border-white/[0.08] shadow-2xl` with `shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`.
     - Inputs: `bg-[#12182d]/80 border border-white/[0.08] text-foreground focus:border-primary`.
     - All 3 quick 1-click credentials (Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan) preserved with 100% functional integrity.

---

## 3. Caveats

1. **Hardware Acceleration & Performance**:
   - 3D transforms (`rotateX(62deg)`, `perspective: 1000px`) and infinite marquee animations must use `transform: translate3d(...)` or `will-change: transform` to run exclusively on the GPU compositor thread without triggering layout reflows (ensuring 60fps and CLS < 0.1).
2. **Accessibility & Reduced Motion**:
   - In accordance with the UI/UX design skill guidelines (`references/quick-reference.md`), keyframe animations should respect `@media (prefers-reduced-motion: reduce)`. When reduced motion is enabled, tickers and laser beams should render as elegant static snapshots rather than continuous loops.
3. **Multi-Theme Support**:
   - The cosmic obsidian styling must be cleanly applied to `:root` and `[data-theme="dark-mandi"]` while ensuring that switching to `sunlight-field` (daylight) or `emerald-agri` (botanical) in `ThemeSwitcher.jsx` continues to operate smoothly without hardcoded color clashes.
4. **Preservation of Core Functionality**:
   - The standalone telephony route `/call` (`CallSimulator.jsx`), the IVR audio playback, DTMF tone generators, dual-channel Telegram bot drawer, and all API endpoints (`/api/state`, `/api/auth/login`, `/api/reset`, etc.) must remain completely untouched.

---

## 4. Conclusion & Concrete Implementation Blueprints

The frontend codebase is lean, modular, and ideally structured for these enhancements. To fulfill requirements R1, R2, R3, and R4, the implementation phase should execute the following clear steps:

### 4.1 Step 1: Update CSS Variables & Add Credentia Keyframes in `client/src/index.css`
Add the following additions to `client/src/index.css`:
```css
/* Update cosmic dark-mandi theme colors */
:root,
[data-theme="dark-mandi"] {
  --color-bg: 8 10 25;                 /* #080a19 cosmic obsidian */
  --color-fg: 248 250 252;             /* #f8fafc */
  --color-card: 13 18 36;              /* #0d1224 glassmorphic panel */
  --color-card-fg: 248 250 252;
  --color-primary: 16 185 129;         /* #10b981 emerald */
  --color-primary-fg: 255 255 255;
  --color-secondary: 18 24 45;         /* #12182d */
  --color-secondary-fg: 226 232 240;
  --color-muted: 15 20 38;             /* #0f1426 */
  --color-muted-fg: 148 163 184;
  --color-accent: 245 158 11;          /* #f59e0b amber gold */
  --color-border: 255 255 255 / 0.08;  /* hairline white/0.08 */

  --background: #080a19;
  --foreground: #f8fafc;
  --card: #0d1224;
  --border: rgba(255, 255, 255, 0.08);
}

/* Credentia 3D Perspective & Laser Keyframes */
@keyframes laserShimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes laserSweep {
  0%, 100% { top: 4%; opacity: 0.85; }
  50% { top: 94%; opacity: 1; }
}

@keyframes gridMove {
  0% { background-position: 0 0; }
  100% { background-position: 0 40px; }
}

@keyframes marqueeLeft {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

@keyframes marqueeRight {
  0% { transform: translate3d(-50%, 0, 0); }
  100% { transform: translate3d(0, 0, 0); }
}

/* Credentia Utility Classes */
.laser-progress-bar {
  background: linear-gradient(90deg, #10b981, #818cf8, #f59e0b, #10b981);
  background-size: 300% 100%;
  animation: laserShimmer 5s ease infinite;
  box-shadow: 0 0 12px 2px rgba(16, 185, 129, 0.7), 0 0 20px 4px rgba(129, 140, 248, 0.45);
}

.cosmic-cyber-grid {
  transform: rotateX(62deg);
  transform-origin: 50% 0%;
  background-image: 
    linear-gradient(to right, rgba(16, 185, 129, 0.18) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 185, 129, 0.18) 1px, transparent 1px);
  background-size: 40px 40px;
  animation: gridMove 16s linear infinite;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%);
}

.scanner-laser-line {
  box-shadow: 0 0 16px 3px rgba(20, 184, 166, 0.85), 0 0 32px 6px rgba(6, 182, 212, 0.5);
  animation: laserSweep 3.2s ease-in-out infinite;
}
```

### 4.2 Step 2: Implement Component Blueprints

1. **`client/src/components/TopLaserBar.jsx`**:
   - Renders a 3px glowing laser bar fixed at the top of the viewport.
   - Self-contained, rendered in `App.jsx` above `<Navbar />`.

2. **`client/src/components/CockpitPreview.jsx`**:
   - Interactive 3D container (`perspective: 1000px`).
   - Mac window buttons (red, yellow, green).
   - Simulated URL breadcrumb with lock icon and live pulse.
   - Live SVG spline area wave chart with dual curves (Mandi spot price vs. benchmark modal).
   - 96% locked capacity progress pill (1,440/1,500 kg).
   - Live checklist verification items with Lucide check icons.

3. **`client/src/components/TickerMarquee.jsx`**:
   - Double horizontal running ticker marquees.
   - Ticker 1: Mandi spot prices (Azadpur, Lawrence Road, Alwar, Jaipur, etc.).
   - Ticker 2: Logistics & trust guarantees (1.5T Bolero pooling, 20% advance escrow, discrete knapsack, etc.).
   - Gradient fade masks on left and right edges.

4. **`client/src/components/QualityScannerLaser.jsx`**:
   - Agricultural lot inspection card (ICAR & Agmarknet verification).
   - High-tech vertical sweeping teal laser line with trailing light sheet.
   - Real-time telemetry readouts: Moisture (7.2%), Purity (98.4%), ICAR Salts (0.00 ppm), Oil Content (41.8%).

5. **`client/src/pages/LandingPage.jsx`**:
   - Integrate `TopLaserBar`, 3 ambient blur orbs, starfield micro-dot grid, and 3D cyber grid horizon (`rotateX(62deg)` with horizon laser glow).
   - Place `CockpitPreview` right in the hero section.
   - Mount `TickerMarquee` directly beneath the cockpit.
   - Mount `QualityScannerLaser` in an interactive farm-gate inspection section.
   - Refactor stakeholder portals into three 3D tilted glowing cards (Farmer, Bolero Transporter, Institutional Buyer) with corner radial spot glows, bottom glowing beams, Lucide icons, hairline borders (`border-white/[0.08]`), and inner highlights (`inset 0 1px 0 rgba(255,255,255,0.08)`).
   - Keep APMC Mandi Command Center as a flagship command banner.

6. **`client/src/components/Navbar.jsx` & `client/src/pages/AuthPage.jsx`**:
   - Apply cosmic obsidian glassmorphism (`bg-[#080A19]/80`, `border-white/[0.08]`, `shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]`).
   - Retain all demo fast-gate authentication buttons and credentials.

---

## 5. Verification Method

To independently verify the implementation:

1. **Build Verification**:
   ```bash
   cd C:\Users\mohit\coding\hackathons\iiitd\client
   npm run build
   ```
   Must succeed with exit code 0 and zero compilation or syntax errors.

2. **Visual Inspection**:
   - Open `http://localhost:5173` in a browser.
   - **R1 Check**: Verify top 3px laser bar shimmers across the viewport, the 3 ambient radial blur orbs (emerald, amber, indigo) render without layout shift, and the perspective 3D cyber grid horizon (`rotateX(62deg)`) animates smoothly with a glowing horizon laser line.
   - **R2 Check**: Verify the 3D cockpit preview tilts smoothly, displays Mac window controls, live SVG spline waves, 96% locked capacity metric, and that both ticker marquees scroll horizontally with edge fade masks.
   - **R3 Check**: Verify the teal laser beam sweeps vertically across the grain lot card, displaying real-time telemetry (7.2% moisture, 98.4% purity, 0.00 ppm ICAR salts, 41.8% oil).
   - **R4 Check**: Verify the three 3D tilted glowing role cards have corner radial glows, glowing bottom border beams, hairline `border-white/[0.08]`, and inner highlights.
   - **Auth Check**: Navigate to `/login` and test all 3 fast-gate buttons (Baljit Singh, Shree Ram Mill, Dr. Vivek Swaminathan) to ensure HTTP 200 authentication remains intact.

3. **Invalidation Conditions**:
   - Any layout shift (CLS > 0.1) caused by non-GPU animations.
   - Any failure during `npm run build`.
   - Broken fast-gate login or broken route to `/call`.
