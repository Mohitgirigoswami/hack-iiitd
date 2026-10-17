# 🌾 KhetOS (खेतOS)
### *The Farm-Gate Operating System: From Kaccha Rasta to Pucca Mandi*

[![Hackathon](https://img.shields.io/badge/IIIT--Delhi-Hackathon_2026-10b981?style=for-the-badge&logo=target)](https://iiitd.ac.in)
[![Theme](https://img.shields.io/badge/Theme-Agriculture_&_Rural_Development-059669?style=for-the-badge)](https://iiitd.ac.in)
[![Phase](https://img.shields.io/badge/Milestone-Phase_1_Core_Prototype-3b82f6?style=for-the-badge)]
[![License](https://img.shields.io/badge/License-MIT-gray?style=for-the-badge)](LICENSE)

> **KhetOS** is an open farm-gate aggregation and micro-logistics operating system designed for India's 86% smallholder farmers. It bypasses predatory village middlemen by transforming unmapped dirt roads (*kaccha rasta*) into consolidated freight corridors through zero-app toll-free IVR telephony, discrete 50kg-bag knapsack pooling, farm-gate digital quality gatekeeping, and institutional wholesale escrow settlement.

---

## 📌 Executive Summary & Problem Landscape

In Indian agriculture, **86% of farmers are smallholders** operating on less than 2 hectares. At harvest, an individual smallholder yields small micro-lots—typically **4 to 10 quintals** (400 kg – 1,000 kg).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          THE SMALLHOLDER MARKET ACCESS TRAP                            │
├────────────────────────────────┬───────────────────────────────┬───────────────────────┤
│ PHYSICAL REALITY               │ COMMERCIAL BOTTLENECK         │ PREDATORY RESULT      │
├────────────────────────────────┼───────────────────────────────┼───────────────────────┤
│ Harvest: 4 Quintals (Mustard)  │ Solo Tempo Hire: ₹2,100       │ Prohibitive Freight   │
│ Location: 1.2km unmapped dirt  │ Google Maps stops at Highway  │ Commercial trucks     │
│ road off PMGSY highway         │ (deadzone for tempos)         │ refuse micro-pickups  │
│ Device: ₹1,200 Feature Phone   │ Zero 4G/App Literacy          │ Excluded from apps    │
├────────────────────────────────┴───────────────────────────────┴───────────────────────┤
│ ➔ Village Middleman (Arhatiya) pays ₹4,700/Qtl (Azadpur APMC rate: ₹5,420/Qtl)        │
│ ➔ Smallholder loses ₹2,880 in pure profit on a single 4-quintal harvest                                                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**KhetOS eliminates this structural market failure** without requiring farmers to purchase expensive IoT hardware, download 4G apps, or surrender margins to intermediaries.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph S1["1. Zero-App Farm-Gate Ingestion"]
        A["Smallholder Farmer<br/>(Feature Phone / Basic 2G)"] -->|"Toll-Free 1800-KHET-OS<br/>DTMF Keypad Press 2"| B["Telephony Ingestion Gateway<br/>(Flask REST + Microsoft Azure Neural Audio)"]
    end

    subgraph S2["2. Micro-Corridor Aggregation Engine"]
        B --> C["Discrete Bag Knapsack Optimizer<br/>(50kg Integer Allocation)"]
        C --> D["Mahindra Bolero Maxi Truck<br/>(1,500 kg / 30 Bag Cargo Matrix)"]
        D -->|"73.3% ➔ 100% Full"| E["Dispatch Lock & Manifest Generation"]
    end

    subgraph S3["3. Farm-Gate Quality Gatekeeper"]
        E --> F["Transporter Quality Checklist<br/>(Tactile & Visual Pre-Loading Inspection)"]
        F -->|"Moisture > 8%"| G["₹0 Sun-Drying Deferral<br/>(Zero Wasted Freight)"]
        F -->|"Inspection Passed"| H["Double-Stitched Gunny Bags Loaded<br/>(Farmer-Specific Ink Stencils)"]
    end

    subgraph S4["4. Institutional Wholesale Escrow"]
        H --> I["APMC Electronic Weighbridge<br/>(Kanta Parchi Digital Dock Slip)"]
        J["Institutional Wholesale Buyer<br/>(Flour Mills / Oil Processors)"] -->|"20% Advance Custody Lock"| K["Razorpay Platform Escrow"]
        K -->|"Weighbridge Dock Verification"| L["Direct Farmer Payouts (UPI/NEFT)<br/>+ Transporter Freight Clearance"]
    end
```

---

## ⚡ Core Platform Capabilities

### 1. Toll-Free IVR Telephony Gateway (`/call`)
* **Zero Smartphone Barrier:** Operational over basic feature phones via standard dual-tone multi-frequency (DTMF) dialpad inputs.
* **Natural Hindi Neural Speech:** Integrated with high-fidelity Microsoft Azure Neural Voice (`hi-IN-MadhurNeural`) and Google TTS fallback, delivering human-like voice prompts with authentic regional intonation.
* **One-Touch Booking:** Farmers dial `1800-KHET-OS`, hear prevailing APMC Azadpur mandi rates, and press **Key 2** to instantly bind their micro-lot to an active corridor truck.

### 2. Discrete 50kg-Bag Knapsack Optimization Engine
* **Physical-to-Digital Integrity:** Prevents grain lot contamination by modeling loads as discrete **50kg gunny bags (*bori*)** rather than continuous bulk volume.
* **Corridor Consolidation:** Aggregates fractional loads (e.g., Suresh: 12 bags, Dinesh: 10 bags, Ramu: 8 bags) to reach **100% payload capacity (1,500 kg / 30 bags)** on standard rural transport vehicles (Mahindra Bolero Maxi Truck).
* **Zero Lot Fragmentation:** Bags are stenciled per farmer and physically segregated by tarpaulin bulkheads in the vehicle bay.

### 3. Pre-Loading Quality Gatekeeper (`/driver`)
* **Transporter-Led Verification:** Equips corridor drivers with a mandatory 3-point digital gatekeeping checklist before loading:
  1. *Bag Packaging:* Double-stitched standard gunny bags with visible farmer ID stencil.
  2. *Visual Purity:* Absence of stones, chaff, or insect infestation.
  3. *Tactile Moisture Rub:* Grains snap cleanly under thumb pressure (<8% moisture).
* **₹0 Sun-Drying Deferral:** If damp grain is detected at the farm gate, the lot is deferred for on-farm sun drying at **₹0 penalty**, eliminating downstream mandi rejection and wasted transit freight.

### 4. Institutional Wholesale Escrow (`/buyer`)
* **Advance Custody Lock:** Wholesale institutional buyers (processors, oil expellers) deposit a **20% advance escrow via Razorpay** before transporter dispatch authorization.
* **Default Protection:** If a buyer cancels while cargo is in transit, the 20% escrow is forfeited to cover 100% of driver round-trip freight plus farmer distress compensation.
* **Weighbridge Settlement:** Payouts release automatically upon physical dock arrival against the official APMC digital weighbridge slip (*Kanta Parchi*).

### 5. ICAR Chemical & Disease Advisory Doctor (`/farmer`)
* **Deterministic Prescription Engine:** Replaces predatory ₹1,200 branded chemical cocktails with ICAR-certified ₹200 generic chemical salts (e.g. *Mancozeb 75% WP* for White Rust in Mustard).
* **Zero LLM Dosage Hallucinations:** Chemical salts, dilution ratios, and Pre-Harvest Intervals (PHI) are strictly validated against official ICAR Package of Practices.
* **Vernacular Audio Output:** Automatically synthesizes actionable Hindi voice notes for illiterate smallholders.

---

## 🖥️ Multi-Persona Platform Consoles

KhetOS provides unified, role-based interfaces styled in our signature **Obsidian Mandi** design system (dark-mode first, zero raw emojis, accessible hairline borders):

| Persona | Route | Primary Responsibility |
| :--- | :--- | :--- |
| **APMC Mandi Admin** | `/admin` | Live 30-bag flatbed cargo matrix telemetry, corridor capacity tracking, and fleet dispatch locks. |
| **Smallholder Farmer** | `/farmer` | Active corridor truck pooling status, live Agmarknet benchmark rates, and ICAR advisory doctor. |
| **Corridor Transporter** | `/driver` | PMGSY dirt road navigation, multi-stop manifest, and 3-point digital pre-loading quality gate. |
| **Wholesale Buyer** | `/buyer` | Knapsack RFQ corridor matching, single-origin procurement, and 20% advance Razorpay custody lock. |
| **IVR Telephony Studio** | `/call` | Standalone virtual telephone simulator with real DTMF dual-tone audio and natural Hindi speech. |

---

## 📊 Grounded Agronomy & Unit Economics

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        KHETOS REAL-WORLD AGRONOMY METRICS CARD                        │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ METRIC                        │ CONVENTIONAL MIDDLEMAN ROUTE  │ KHETOS PRODUCTION RUN  │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ Smallholder Freight Cost      │ ₹2,100 (Solo Tata Ace / Tempo)│ ₹640 (Pooled Bolero)   │
│ Freight Savings Percentage    │ 0% (Prohibitive Solo Trip)    │ 69.5% Net Freight Cut  │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ Crop Protection Input Cost    │ ₹1,200 / acre (Dealer Brand)  │ ₹240 / acre (ICAR Salt)│
│ Input Chemical Cost Savings   │ 0% (Exploited by Dealer)      │ 80.0% Direct Savings   │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ Moisture Rejection Penalty    │ -₹350 to -₹500 / Qtl docked   │ ₹0 Penalty Deferral    │
│ Harvest Sale Price (Mustard)  │ ₹4,700 / Qtl (Village Trader) │ ₹5,420 / Qtl (APMC Rate)│
│ Net Profit Gain per 4 Quintals│ Baseline Reference            │ +₹2,240 to +₹2,880     │
├───────────────────────────────┼───────────────────────────────┼────────────────────────┤
│ Technology Barrier            │ High (Requires 4G PWA / App)  │ ZERO (1800-IVR Keypad) │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

### Business Model & Sustainability
* **Farmers Pay 0% Platform Fees:** Eliminates rural friction and ensures rapid viral adoption.
* **1.5% Wholesale Take-Rate:** Corporate buyers (mills, food processors) gladly pay 1.5% on gross merchandise value to eliminate 5%–8% in broker fees, mandi cess, and transit shrinkage.
* **5% Transporter Freight Spread:** Transporters turn dead return mileage (*khali phera*) into profitable, fully booked corridor routes.

---

## 🛠️ Technology Stack

```
Frontend:
├── React 19 (Hooks, Context Architecture)
├── Vite 6.4 (Production Bundling)
├── Tailwind CSS (Obsidian Mandi Design System)
├── Lucide React (Accessible SVG Icon Badges)
└── Web Audio API & HTML5 Audio (Synthesized DTMF Sine Waves & MP3 Streams)

Backend & Micro-Services:
├── Python 3.13 / Flask RESTful Core
├── Microsoft Azure Neural TTS (hi-IN-MadhurNeural via Edge-TTS)
├── Google Translate TTS (gTTS Graceful Fallback)
├── Discrete 0-1 Knapsack & 2-Opt CVRP Corridor Optimizer
├── ICAR Verified Chemical Database (Package of Practices)
└── Razorpay Payment Gateway Integration
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18.0.0 or higher)
* **Python** (v3.10 to v3.13)
* **Git**

### Installation

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/mohit/khetos.git
   cd khetos
   ```

2. **Backend Setup:**
   ```bash
   cd api
   pip install -r requirements.txt
   python app.py
   ```
   *The Flask API engine will start on `http://localhost:5000`.*

3. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   npm run dev
   ```
   *The client interface will launch on `http://localhost:5173`.*

---

## 🧪 Live Stage Demonstration Flow

To reproduce the IIIT-Delhi Hackathon stage demonstration:

1. **Open the Telemetry Display:** Navigate to `http://localhost:5173/dashboard` (Admin View). The active corridor capacity shows **73.3% / 1,100 kg** filled (Suresh: 12 bags, Dinesh: 10 bags).
2. **Open the Telephony Studio:** In a side tab or mobile browser, navigate to `http://localhost:5173/call`.
3. **Dial 1800-KHET-OS:** Click **Dial 1800-KHET-OS**. The system initiates the call and speaks Hindi welcome instructions.
4. **Trigger Keypad Ingestion:** Press **Key 2** (`Pool Truck ⚡`).
   * DTMF dual-tone beeps.
   * Natural Hindi neural voice confirms: *"रामू चाचा, आपकी 4 क्विंटल सरसों गाड़ी में जुड़ गई है..."*
5. **Observe Instant Corridor Fill:** Switch back to `/dashboard`.
   * The cargo gauge animates dynamically from **73.3% ➔ 100% FULL • DISPATCH LOCKED**.
   * Ramu's 8 bags (400 kg) lock into the 30-bag cargo matrix.
6. **Execute Pre-Loading Inspection:** Switch role to **Transporter** (`/driver`). Complete the 3-point checklist and click **Approve & Load**.
7. **Lock Wholesale Escrow:** Switch role to **Buyer** (`/buyer`). Click **Calculate Knapsack Allocation ⚡** and deposit the **20% advance Razorpay custody lock**.
8. **Reset Demo State:**
   ```bash
   curl -X POST http://localhost:5000/api/reset
   ```

---

## 🗺️ Product Roadmap

* **Phase 1 (Current Core Prototype):**
  * Toll-Free IVR Phone Simulator with DTMF Key 2 booking and Hindi neural voice.
  * Discrete 50kg bag integer knapsack pooling (73.3% ➔ 100%).
  * Farm-gate driver checklist with ₹0 sun-drying deferral.
  * 20% advance Razorpay wholesale custody lock.
  * ICAR generic chemical advisory doctor with Hindi audio notes.
* **Phase 2 (Next Sprint):**
  * Aadhaar & Mobile OTP authentication with role-based JWT session management.
  * Live GPS telematics tracking along unmapped rural dirt tracks (*KhetPin*).
  * Automated UPI disbursement webhooks upon APMC weighbridge dock crossing.
  * Live reverse auction multi-bidding for consolidated corridor lots.
* **Phase 3 (Grand Vision):**
  * APMC Kanta Parchi OCR slip parser using computer vision.
  * WhatsApp Cloud API integration for voice-note transcription and geo-pin snapping.
  * Offline-first ServiceWorker PWA for 2G rural deadzones.
  * IoT ESP32 moisture gateway sample validator.

---

## 👥 Hackathon Team & Acknowledgements

Developed for the **IIIT-Delhi Hackathon 2026** under **Theme 3: Agriculture & Rural Development**.

*Special thanks to the mentors, agricultural economists, and technical evaluators at IIIT-Delhi for their guidance on rural logistics and smallholder unit economics.*
