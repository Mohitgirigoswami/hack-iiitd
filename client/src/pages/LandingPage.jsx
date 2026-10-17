import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Phone, ArrowRight, ShieldCheck, MapPin, Truck, Building2, 
  BarChart3, Sparkles, Sprout, Activity, Radio, Scale, Banknote, 
  CheckCircle2, Compass, Layers, Zap, Bot, ExternalLink, Check,
  Scan, FileText, ChevronRight
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import CosmicBackground from '../components/CosmicBackground';
import CockpitPreview from '../components/CockpitPreview';
import TickerMarquee from '../components/TickerMarquee';
import QualityScannerLaser from '../components/QualityScannerLaser';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const handleEnterPortal = (roleId) => {
    setRole(roleId);
    navigate('/dashboard');
  };

  return (
    <div className="relative min-h-screen bg-[#080A19] text-[#f0f3ff] overflow-hidden selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* R1: Cosmic Atmosphere Background (3 Ambient Orbs, Starfield, 3D Cyber Grid Floor) */}
      <CosmicBackground />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10 space-y-8">
        {/* Top Headline & Value Proposition */}
        <div className="text-center space-y-5 max-w-4xl mx-auto pt-4">
          {/* Live Corridor Status Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] backdrop-blur-md shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-slate-300 tracking-wide">
              ROHTAK CORRIDOR LIVE &bull; <strong className="text-white">BOLERO 96% LOCKED</strong>
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold hidden sm:inline">
              ICAR VERIFIED
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black tracking-tight leading-[1.08] text-white">
            From Kaccha Rasta to <br />
            <span 
              className="font-serif italic font-normal inline-block my-1"
              style={{
                background: 'linear-gradient(135deg, #34d399 0%, #fbbf24 50%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Pucca Mandi.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Zero-app rural logistics & generic chemical intelligence. Empowering smallholder farmers to pool 1.5T pickup trucks, verify grain at the farm-gate, and lock advance escrow with wholesale millers.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/call"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-white text-sm font-bold transition-all duration-200 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              }}
            >
              <Phone className="w-4 h-4 animate-bounce" />
              Launch 1800-KHET-OS Phone Studio
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="https://t.me/KhetOSSaathiBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-xl text-slate-200 hover:text-white text-sm font-semibold border border-white/[0.08] hover:border-blue-400/40 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md transition-all active:scale-95 group shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <Bot className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              Open @KhetOSSaathiBot
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* Bento KPI Strip */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-4xl mx-auto">
            <div className="p-3.5 rounded-2xl bg-[#0d1224]/80 backdrop-blur-md border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-500/30 transition">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Active Corridor</span>
              </div>
              <span className="font-bold text-white text-xs sm:text-sm block truncate">Rohtak ➔ Azadpur APMC</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1224]/80 backdrop-blur-md border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-blue-500/30 transition">
              <div className="flex items-center gap-1.5 mb-1">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Fleet Vehicle</span>
              </div>
              <span className="font-bold text-white text-xs sm:text-sm block truncate">Mahindra Bolero (1.5T)</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1224]/80 backdrop-blur-md border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-amber-500/30 transition">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-amber-400 font-bold text-xs">₹</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Benchmark Modal</span>
              </div>
              <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm block">₹5,420 / Qtl</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0d1224]/80 backdrop-blur-md border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-emerald-500/30 transition">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Smallholder Gain</span>
              </div>
              <span className="font-bold text-emerald-400 text-xs sm:text-sm block">+₹2,240 Margin</span>
            </div>
          </div>
        </div>

        {/* R2: Interactive 3D Cockpit Preview */}
        <CockpitPreview />

        {/* R2: Double Horizontal Running Ticker Marquees with Edge Fade Masks */}
        <TickerMarquee />
      </section>

      {/* --- R4: THREE 3D TILTED GLOWING ROLE CARDS --- */}
      <section id="portals" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-14 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Three Stakeholders &bull; One Synchronized Corridor</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Select a Portal for{' '}
            <span 
              style={{
                background: 'linear-gradient(135deg, #34d399, #818cf8, #fbbf24)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              1-Click Verified Access
            </span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto">
            Zero friction at the farm gate, maximum capacity on the highway, and 100% verified origin for wholesale processors.
          </p>
        </div>

        {/* Three 3D Tilted Glowing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Farmer Portal (Sprout, Emerald #10b981) */}
          <div 
            className="group relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
            style={{
              background: 'radial-gradient(circle at top left, rgba(16, 185, 129, 0.15) 0%, transparent 65%), rgba(13, 18, 36, 0.85)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={() => handleEnterPortal('FARMER')}
          >
            {/* Top Corner Radial Glow Flare */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            {/* Bottom Glowing Border Beam */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Sprout className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Farmer Portal
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Ramu Sharma &bull; Village Bhalaut
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  KhetPin: HR-ROH-78G4 | Crop: Mustard
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Check live APMC mandi spot prices, run voice & photo chemical diagnostics with ICAR generic salts, and monitor your 4-quintal pooled cargo.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  Live Agmarknet
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  ICAR Rx
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  1800-IVR Connected
                </span>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleEnterPortal('FARMER'); }}
              className="mt-6 w-full py-2.5 px-4 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-white font-bold text-xs rounded-xl border border-emerald-500/30 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 group/btn relative z-10 shadow-sm"
            >
              Enter as Farmer
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 2: Bolero Transporter (Truck, Electric Blue #38bdf8 / Indigo) */}
          <div 
            className="group relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
            style={{
              background: 'radial-gradient(circle at top left, rgba(56, 189, 248, 0.15) 0%, transparent 65%), rgba(13, 18, 36, 0.85)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={() => handleEnterPortal('DRIVER')}
          >
            {/* Top Corner Radial Glow Flare */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-blue-500/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            {/* Bottom Glowing Border Beam */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Transporter Dispatch
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                  Baljit Singh &bull; Mahindra Bolero
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Reg: HR-12-AE-8419 | 15 Quintal Max
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                View rural pickup waypoints along PMGSY dirt roads. Execute 3-point digital quality inspection (stitching, purity, moisture) with ₹0 penalty lot deferral.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  PMGSY Rural Routes
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  3-Point Gatekeeper
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  ₹0 Deferral
                </span>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleEnterPortal('DRIVER'); }}
              className="mt-6 w-full py-2.5 px-4 bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-xs rounded-xl border border-blue-500/30 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 group/btn relative z-10 shadow-sm"
            >
              Enter as Transporter
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Card 3: Institutional Buyer (Building2, Amber Gold #f59e0b) */}
          <div 
            className="group relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] cursor-pointer"
            style={{
              background: 'radial-gradient(circle at top left, rgba(245, 158, 11, 0.15) 0%, transparent 65%), rgba(13, 18, 36, 0.85)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={() => handleEnterPortal('BUYER')}
          >
            {/* Top Corner Radial Glow Flare */}
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-amber-500/20 blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />

            {/* Bottom Glowing Border Beam */}
            <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Wholesale Buyer
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Shree Ram Flour & Oil Mills
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  GSTIN: 07AAAAA0000A1Z5 | Lawrence Road
                </p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Direct farm-gate sourcing for institutional grain processors. Run hybrid knapsack matching and deposit 20% advance escrow via Razorpay checkout.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  Knapsack Allocation
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  20% Escrow Advance
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#12182d] text-slate-300 border border-white/[0.08]">
                  Zero Middleman
                </span>
              </div>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); handleEnterPortal('BUYER'); }}
              className="mt-6 w-full py-2.5 px-4 bg-amber-500/15 hover:bg-amber-600 text-amber-300 hover:text-white font-bold text-xs rounded-xl border border-amber-500/30 transition-all duration-200 cursor-pointer active:scale-95 flex items-center justify-center gap-2 group/btn relative z-10 shadow-sm"
            >
              Enter as Wholesale Buyer
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* APMC Mandi Command Center Flagship Banner */}
        <div className="mt-8 rounded-3xl p-6 sm:p-7 credentia-glass border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Azadpur APMC Division Command Center</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  DIRECTOR CONSOLE
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                High-altitude command center for mandi authorities. Live Bolero cargo fill gauge (73.3% ➔ 100%), verified farmer lot manifests, and dock settlement telemetry.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleEnterPortal('ADMIN')}
            className="shrink-0 py-3 px-6 bg-primary hover:brightness-110 text-primary-foreground font-bold text-xs rounded-xl shadow-lg transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-2 relative z-10"
          >
            Enter Command Center
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* --- R3: FARM-GATE QUALITY SCANNER SECTION --- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto relative z-10">
        <QualityScannerLaser />
      </section>

      {/* --- STANDALONE ROUTE CALLOUT BANNER (/call) --- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative z-10">
        <div className="rounded-3xl p-8 sm:p-10 credentia-glass border border-emerald-500/30 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-3 text-center md:text-left relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <Phone className="w-3.5 h-3.5 animate-bounce" />
              Rural Telephony Simulator (/call)
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Rural 1800-KHET-OS Toll-Free IVR Simulator
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Smallholder farmers don't download smartphone apps. Test the interactive telephone keypad simulator on a standalone route. Press <strong className="text-white">Key 2</strong> to trigger Ramu's call and fill the Bolero truck live!
            </p>
          </div>

          <button
            onClick={() => navigate('/call')}
            className="shrink-0 py-3.5 px-6 bg-primary hover:brightness-110 text-primary-foreground font-extrabold text-sm rounded-xl shadow-glow transition active:scale-95 flex items-center gap-2 relative z-10 cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            Launch /call Phone Studio
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* --- FARM-GATE PLATFORM PRINCIPLES --- */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2 hover:border-indigo-500/30 transition">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Zero-App Ingestion</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              1800-KHET-OS toll-free IVR operable on any ₹1,200 feature phone with zero 4G required.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2 hover:border-emerald-500/30 transition">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Discrete Knapsack</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Strict 50kg standard bag multiples prevent lot fragmentation and simplify physical accounting.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2 hover:border-blue-500/30 transition">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Escrow Custody</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              20% buyer advance locked before ignition; 80% settled electronically against weighbridge slips.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] space-y-2 hover:border-amber-500/30 transition">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">₹0 Farmer Fees</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Zero commission on smallholders. Value captured purely via 1.5% institutional buyer take-rate.
            </p>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-white/[0.08] text-center text-xs text-slate-400 space-y-2 relative z-10">
        <p className="font-bold text-slate-200">
          KhetOS (खेतOS) &bull; The Farm-Gate Operating System
        </p>
        <p className="text-[11px] text-slate-400">
          From Kaccha Rasta to Pucca Mandi &bull; IIIT-Delhi Hackathon 2026 &bull; Theme 3: Agriculture & Rural Development
        </p>
      </footer>
    </div>
  );
}
