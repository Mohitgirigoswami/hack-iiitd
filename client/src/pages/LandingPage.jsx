import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, ShieldCheck, MapPin, Truck, Building2, BarChart3, Sparkles } from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setRole, ROLES } = useRole();

  const handleEnterPortal = (roleId) => {
    setRole(roleId);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 px-4 sm:px-6">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-primary text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          The Farm-Gate Operating System
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-foreground tracking-tight leading-tight">
          From Kaccha Rasta to <span className="text-primary underline decoration-primary/40 underline-offset-8">Pucca Mandi</span>.
        </h1>
        <p className="text-base sm:text-lg text-muted-fg leading-relaxed">
          Zero-app rural logistics & generic chemical intelligence. Empowering smallholder farmers to pool 1.5T pickup trucks, verify grain at farm-gate, and settle advance escrow with wholesale millers.
        </p>

        {/* Live Corridor Status Bar */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3 bg-card border border-border rounded-xl">
            <span className="text-[11px] text-muted-fg block">Active Corridor:</span>
            <span className="font-bold text-foreground text-xs sm:text-sm">Rohtak ➔ Azadpur APMC</span>
          </div>
          <div className="p-3 bg-card border border-border rounded-xl">
            <span className="text-[11px] text-muted-fg block">Corridor Vehicle:</span>
            <span className="font-bold text-foreground text-xs sm:text-sm">Mahindra Bolero (1.5T)</span>
          </div>
          <div className="p-3 bg-card border border-border rounded-xl">
            <span className="text-[11px] text-muted-fg block">Benchmark APMC Rate:</span>
            <span className="font-bold text-primary text-xs sm:text-sm">₹5,420 / Quintal</span>
          </div>
          <div className="p-3 bg-card border border-border rounded-xl">
            <span className="text-[11px] text-muted-fg block">Smallholder Freight Cut:</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm">-62% Savings</span>
          </div>
        </div>
      </div>

      {/* Role Selection Gateway (One-Click Portals) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-foreground">Select a Portal for 1-Click Access</h2>
            <p className="text-xs text-muted-fg">Instant role switching with live demonstration profiles.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-secondary text-foreground">
            Hackathon Demo Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Farmer Portal */}
          <div className="bg-card hover:border-primary/50 border border-border rounded-2xl p-6 transition-all hover:shadow-glow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">🌾</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
                  Farmer Portal
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Ramu Sharma &bull; Village Bhalaut</h3>
                <p className="text-xs text-muted-fg font-mono mt-0.5">KhetPin: HR-ROH-78G4 | Crop: Mustard</p>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">
                Check live APMC mandi prices, run photo & voice chemical disease diagnostics with ICAR generic salts, and monitor your 4-quintal pooled cargo.
              </p>
            </div>
            <button
              onClick={() => handleEnterPortal('FARMER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground font-bold text-xs rounded-xl border border-border transition flex items-center justify-center gap-2 group"
            >
              Enter as Farmer
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Transporter / Driver Console */}
          <div className="bg-card hover:border-primary/50 border border-border rounded-2xl p-6 transition-all hover:shadow-glow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">🚚</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
                  Transporter Dispatch
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Baljit Singh &bull; Mahindra Bolero</h3>
                <p className="text-xs text-muted-fg font-mono mt-0.5">Reg: HR-12-AE-8419 | 15 Quintal Max</p>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">
                View rural pickup waypoints along PMGSY dirt roads. Execute 3-point digital quality inspection (stitching, purity, moisture) with ₹0 penalty lot deferral.
              </p>
            </div>
            <button
              onClick={() => handleEnterPortal('DRIVER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground font-bold text-xs rounded-xl border border-border transition flex items-center justify-center gap-2 group"
            >
              Enter as Transporter
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Wholesale Buyer Gateway */}
          <div className="bg-card hover:border-primary/50 border border-border rounded-2xl p-6 transition-all hover:shadow-glow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">🏢</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                  Wholesale Buyer
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Shree Ram Flour & Oil Mills</h3>
                <p className="text-xs text-muted-fg font-mono mt-0.5">GSTIN: 07AAAAA0000A1Z5 | Lawrence Road</p>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">
                Direct farm-gate sourcing for institutional grain processors. Run hybrid knapsack matching and deposit 20% advance escrow via Razorpay checkout.
              </p>
            </div>
            <button
              onClick={() => handleEnterPortal('BUYER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground font-bold text-xs rounded-xl border border-border transition flex items-center justify-center gap-2 group"
            >
              Enter as Wholesale Buyer
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 4: APMC Mandi Command Center */}
          <div className="bg-card hover:border-primary/50 border border-border rounded-2xl p-6 transition-all hover:shadow-glow space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-3xl">📊</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                  Command Center
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Azadpur APMC Division</h3>
                <p className="text-xs text-muted-fg font-mono mt-0.5">Corridor: Rohtak ➔ Azadpur APMC</p>
              </div>
              <p className="text-xs text-muted-fg leading-relaxed">
                High-altitude command center for mandi authorities. Live Bolero cargo fill gauge (73.3% ➔ 100%), verified farmer lot manifests, and settlement telemetry.
              </p>
            </div>
            <button
              onClick={() => handleEnterPortal('ADMIN')}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2 group"
            >
              Enter Command Center
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Route for Calling (Separated Feature Banner) */}
      <div className="bg-secondary/70 border-2 border-primary/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Phone className="w-4 h-4 animate-bounce" />
            Standalone Telephony Route (/call)
          </div>
          <h3 className="text-2xl font-black text-foreground">
            Rural 1800-KHET-OS Toll-Free IVR Simulator
          </h3>
          <p className="text-xs sm:text-sm text-muted-fg max-w-xl">
            Smallholder farmers don't download smartphone apps. Test the interactive telephone keypad simulator on a standalone route. Press <strong className="text-foreground">Key 2</strong> to trigger Ramu's call and fill the Bolero truck live!
          </p>
        </div>
        <button
          onClick={() => navigate('/call')}
          className="shrink-0 py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-xl shadow-glow transition active:scale-95 flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Launch /call Phone Studio
        </button>
      </div>

      {/* Farm-Gate Platform Security & Economic Principles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-1">
          <span className="text-xl">📞</span>
          <h4 className="text-xs font-bold text-foreground">Zero-App Ingestion</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            1800-KHET-OS toll-free IVR operable on any ₹1,200 feature phone with zero 4G required.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-1">
          <span className="text-xl">⚖️</span>
          <h4 className="text-xs font-bold text-foreground">Discrete Knapsack</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            Strict 50kg standard bag multiples prevent lot fragmentation and simplify physical accounting.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-1">
          <span className="text-xl">🛡️</span>
          <h4 className="text-xs font-bold text-foreground">Escrow Custody</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            20% buyer advance locked before ignition; 80% settled electronically against weighbridge slips.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-1">
          <span className="text-xl">🌾</span>
          <h4 className="text-xs font-bold text-foreground">₹0 Farmer Fees</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            Zero commission on smallholders. Value captured purely via 1.5% institutional buyer take-rate.
          </p>
        </div>
      </div>

      {/* Production Footer Signature */}
      <footer className="text-center py-6 border-t border-border/50 text-xs text-muted-fg space-y-1">
        <p className="font-semibold text-foreground/80">
          KhetOS (खेतOS) &bull; The Farm-Gate Operating System
        </p>
        <p className="text-[11px]">
          From Kaccha Rasta to Pucca Mandi &bull; Connecting Smallholder Corridors to Wholesale Processors
        </p>
      </footer>
    </div>
  );
}
