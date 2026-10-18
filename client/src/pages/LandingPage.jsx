import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Phone, ArrowRight, ShieldCheck, MapPin, Truck, Building2, 
  BarChart3, Sparkles, Sprout, Activity, Radio, Scale, Banknote, 
  CheckCircle2, Compass, Layers, Zap
} from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setRole, ROLES } = useRole();

  const handleEnterPortal = (roleId) => {
    setRole(roleId);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 py-8 px-4 sm:px-6 relative">
      {/* Ambient Top Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <div className="text-center space-y-5 max-w-3xl mx-auto pt-2 animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold tracking-wide shadow-xs animate-float">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>The Farm-Gate Operating System &bull; खेतOS</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
          From Kaccha Rasta to <span className="text-primary underline decoration-primary/40 underline-offset-8">Pucca Mandi</span>.
        </h1>
        <p className="text-base sm:text-lg text-muted-fg leading-relaxed max-w-2xl mx-auto font-normal">
          Zero-app rural logistics & generic chemical intelligence. Empowering smallholder farmers to pool 1.5T pickup trucks, verify grain at the farm-gate, and lock advance escrow with wholesale millers.
        </p>

        {/* Live Corridor Status Bar - Bento KPI Strip */}
        <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
          <div className="p-3.5 bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl shadow-xs interactive-card animate-slide-up stagger-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-muted-fg uppercase tracking-wider font-semibold">Active Corridor</span>
            </div>
            <span className="font-bold text-foreground text-xs sm:text-sm block truncate">Rohtak ➔ Azadpur APMC</span>
          </div>

          <div className="p-3.5 bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl shadow-xs interactive-card animate-slide-up stagger-2">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] text-muted-fg uppercase tracking-wider font-semibold">Fleet Vehicle</span>
            </div>
            <span className="font-bold text-foreground text-xs sm:text-sm block truncate">Mahindra Bolero (1.5T)</span>
          </div>

          <div className="p-3.5 bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl shadow-xs interactive-card animate-slide-up stagger-3">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-amber-500 font-bold text-xs">₹</span>
              <span className="text-[10px] text-muted-fg uppercase tracking-wider font-semibold">Benchmark Modal</span>
            </div>
            <span className="font-mono font-bold text-primary text-xs sm:text-sm block">₹5,420 / Qtl</span>
          </div>

          <div className="p-3.5 bg-card/80 backdrop-blur-sm border border-border/70 rounded-2xl shadow-xs interactive-card animate-slide-up stagger-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-muted-fg uppercase tracking-wider font-semibold">Smallholder Gain</span>
            </div>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm block">+₹2,240 Margin</span>
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
          <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm hover:border-primary/40 border border-border/70 rounded-3xl p-6 interactive-card space-y-4 flex flex-col justify-between group">
            {/* Ambient Corner Glow */}
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/25 blur-xl transition-all duration-300 pointer-events-none" />
            {/* Bottom Expanding Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300">
                  <Sprout className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">Live Agmarknet</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">ICAR Rx</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">1800-IVR Connected</span>
              </div>
            </div>
            <button
              onClick={() => handleEnterPortal('FARMER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-primary hover:text-primary-foreground text-foreground font-bold text-xs rounded-xl border border-border transition-all duration-200 cursor-pointer btn-tactile flex items-center justify-center gap-2 group/btn shadow-xs"
            >
              Enter as Farmer
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>

          {/* Card 2: Transporter / Driver Console */}
          <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm hover:border-blue-500/40 border border-border/70 rounded-3xl p-6 interactive-card space-y-4 flex flex-col justify-between group">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-blue-500/10 group-hover:bg-blue-500/25 blur-xl transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">PMGSY Rural Routes</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">3-Point Gatekeeper</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">₹0 Deferral</span>
              </div>
            </div>
            <button
              onClick={() => handleEnterPortal('DRIVER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-blue-600 hover:text-white text-foreground font-bold text-xs rounded-xl border border-border transition-all duration-200 cursor-pointer btn-tactile flex items-center justify-center gap-2 group/btn shadow-xs"
            >
              Enter as Transporter
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>

          {/* Card 3: Wholesale Buyer Gateway */}
          <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm hover:border-amber-500/40 border border-border/70 rounded-3xl p-6 interactive-card space-y-4 flex flex-col justify-between group">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-amber-500/10 group-hover:bg-amber-500/25 blur-xl transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">Knapsack Allocation</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">20% Escrow Advance</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">Zero Middleman</span>
              </div>
            </div>
            <button
              onClick={() => handleEnterPortal('BUYER')}
              className="w-full py-2.5 px-4 bg-secondary hover:bg-amber-600 hover:text-white text-foreground font-bold text-xs rounded-xl border border-border transition-all duration-200 cursor-pointer btn-tactile flex items-center justify-center gap-2 group/btn shadow-xs"
            >
              Enter as Wholesale Buyer
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>

          {/* Card 4: APMC Mandi Command Center */}
          <div className="relative overflow-hidden bg-card/80 backdrop-blur-sm hover:border-indigo-500/40 border border-border/70 rounded-3xl p-6 interactive-card space-y-4 flex flex-col justify-between group">
            <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/25 blur-xl transition-all duration-300 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30">
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
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">30-Bag Flatbed Grid</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">Live Manifest</span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-muted-fg border border-border/60">80% Dock Settlement</span>
              </div>
            </div>
            <button
              onClick={() => handleEnterPortal('ADMIN')}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-lg hover:brightness-110 transition-all duration-200 cursor-pointer btn-tactile flex items-center justify-center gap-2 group/btn shadow-xs"
            >
              Enter Command Center
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1.5 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </div>

      {/* Standalone Route for Calling (Separated Feature Banner) */}
      <div className="bg-gradient-to-br from-card via-card to-secondary/80 border border-primary/25 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 text-center sm:text-left relative z-10">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <Phone className="w-4 h-4 animate-bounce" />
            Standalone Telephony Route (/call)
          </div>
          <h3 className="text-2xl font-black text-foreground">
            Rural 1800-KHET-OS Toll-Free IVR Simulator
          </h3>
          <p className="text-xs sm:text-sm text-muted-fg max-w-xl leading-relaxed">
            Smallholder farmers don't download smartphone apps. Test the interactive telephone keypad simulator on a standalone route. Press <strong className="text-foreground">Key 2</strong> to trigger Ramu's call and fill the Bolero truck live!
          </p>
        </div>
        <button
          onClick={() => navigate('/call')}
          className="shrink-0 py-3.5 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-xl shadow-glow transition active:scale-95 flex items-center gap-2 relative z-10"
        >
          <Phone className="w-4 h-4" />
          Launch /call Phone Studio
        </button>
      </div>

      {/* Farm-Gate Platform Security & Economic Principles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border/70">
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-2 hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Zero-App Ingestion</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            1800-KHET-OS toll-free IVR operable on any ₹1,200 feature phone with zero 4G required.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-2 hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Scale className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Discrete Knapsack</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            Strict 50kg standard bag multiples prevent lot fragmentation and simplify physical accounting.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-2 hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-foreground">Escrow Custody</h4>
          <p className="text-[11px] text-muted-fg leading-relaxed">
            20% buyer advance locked before ignition; 80% settled electronically against weighbridge slips.
          </p>
        </div>
        <div className="p-4 bg-card/60 border border-border/80 rounded-2xl space-y-2 hover:border-primary/30 transition-all">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <Banknote className="w-4 h-4" />
          </div>
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
