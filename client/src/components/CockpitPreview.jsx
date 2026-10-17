import React, { useState } from 'react';
import { 
  Lock, CheckCircle2, TrendingUp, Truck, ShieldCheck, 
  MapPin, Activity, Zap, ExternalLink, Sparkles, Scale, RefreshCw
} from 'lucide-react';

/**
 * CockpitPreview - Interactive 3D Cockpit Preview replicating Credentia's dashboard frame:
 * - 3D angled container (perspective: 1000px with rotateX(7deg) and hover leveling)
 * - Mac-style traffic light window controls
 * - Simulated URL breadcrumb with SSL lock & 60 FPS live indicator
 * - Live SVG spline wave chart with pulsing node & modal price benchmark
 * - Bolero 96% locked capacity KPI pill with glowing tip
 * - Live checklist verification items
 * - Interactive telemetry tabs
 */
export default function CockpitPreview() {
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'pooling' | 'escrow'
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="w-full max-w-5xl mx-auto my-8 relative"
      style={{ perspective: '1000px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Ambient background glow behind the cockpit frame */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-amber-500/15 rounded-3xl blur-2xl -z-10 pointer-events-none transform -translate-y-4" />

      {/* 3D Angled Cockpit Frame */}
      <div 
        className="credentia-glass rounded-2xl overflow-hidden transition-all duration-500 ease-out transform"
        style={{
          transform: isHovered 
            ? 'rotateX(0deg) scale(1)' 
            : 'rotateX(6deg) scale(0.985)',
          transformStyle: 'preserve-3d',
          boxShadow: isHovered 
            ? '0 30px 80px -15px rgba(0, 0, 0, 0.8), 0 0 35px 2px rgba(16, 185, 129, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12)' 
            : '0 25px 60px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Frame Top Navigation Bar / Window Header */}
        <div className="px-4 py-3 bg-[#0a0e20]/90 border-b border-white/[0.08] flex items-center justify-between gap-3 flex-wrap">
          {/* Mac-Style Window Controls */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-sm hover:opacity-80 transition cursor-pointer" title="Close" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-sm hover:opacity-80 transition cursor-pointer" title="Minimize" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-sm hover:opacity-80 transition cursor-pointer" title="Expand" />
            <span className="ml-2 text-[11px] font-mono font-medium text-slate-400 hidden sm:inline">
              khetos-cockpit-v2.4
            </span>
          </div>

          {/* Simulated URL Breadcrumb Bar */}
          <div className="flex-1 max-w-md mx-auto hidden md:flex items-center justify-center">
            <div className="w-full px-3 py-1 rounded-lg bg-[#060914]/80 border border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5 truncate">
                <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-400">https://</span>
                <span className="text-white font-medium">khetos.gov.in</span>
                <span className="text-emerald-400">/corridor/rohtak-azadpur/telemetry</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 ml-2">
                SSL 256-BIT
              </span>
            </div>
          </div>

          {/* Live System Indicator */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE 60FPS</span>
            </div>
            <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-slate-400">
              <span>SYNC:</span>
              <span className="text-white font-semibold">0.4ms</span>
            </div>
          </div>
        </div>

        {/* Cockpit Sub-Header: Mode Switcher */}
        <div className="px-5 py-2.5 bg-[#080c1c]/70 border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'telemetry'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Mandi Spot Telemetry
            </button>
            <button
              onClick={() => setActiveTab('pooling')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'pooling'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Bolero Pool Logistics
            </button>
            <button
              onClick={() => setActiveTab('escrow')}
              className={`px-3 py-1 rounded-lg font-semibold transition ${
                activeTab === 'escrow'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Escrow & Settlements
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>COMMODITY:</span>
            <span className="text-amber-400 font-bold">Mustard (सरसों) Grade-A</span>
          </div>
        </div>

        {/* Cockpit Dashboard Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Top KPI Grid inside Cockpit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* KPI 1: Live Spot vs Modal */}
            <div className="p-4 rounded-xl bg-[#0e1428]/80 border border-white/[0.08] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Azadpur APMC Spot</span>
                <span className="text-emerald-400 font-bold font-mono">+2.4% Today</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">₹5,420</span>
                <span className="text-xs text-slate-400">/ Quintal</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Benchmark: ₹5,300 | Premium: +₹120</span>
              </div>
            </div>

            {/* KPI 2: Bolero Capacity Pill (96% Locked) */}
            <div className="p-4 rounded-xl bg-[#0e1428]/80 border border-white/[0.08] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="flex items-center gap-1 text-white font-semibold">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  Mahindra Bolero (1.5T)
                </span>
                <span className="text-emerald-400 font-bold font-mono">96% Locked</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">1,440</span>
                <span className="text-xs text-slate-400">/ 1,500 kg (29/30 Bags)</span>
              </div>
              {/* Animated Capacity Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2.5 overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full relative transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                  style={{ width: '96%' }}
                >
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white animate-ping" />
                </div>
              </div>
            </div>

            {/* KPI 3: Escrow Liquidity */}
            <div className="p-4 rounded-xl bg-[#0e1428]/80 border border-white/[0.08] relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Escrow Advance Pool</span>
                <span className="text-amber-400 font-bold font-mono">Razorpay Verified</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">₹15,600</span>
                <span className="text-xs text-slate-400">20% Locked</span>
              </div>
              <div className="mt-2 text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Balance ₹62,400 on Weighbridge Slip</span>
              </div>
            </div>
          </div>

          {/* Live SVG Spline Area Wave Chart */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#090d1e]/90 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white">Live Multi-Mandi Price Convergence Spline</span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(Agmarknet 10-Day Real-Time Feed)</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 rounded bg-emerald-400 inline-block" />
                  <span className="text-slate-300">Azadpur APMC (₹5,420)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 border-t border-dashed border-indigo-400 inline-block" />
                  <span className="text-slate-400">MSP Benchmark (₹5,300)</span>
                </div>
              </div>
            </div>

            {/* Responsive SVG Chart */}
            <div className="w-full h-44 sm:h-52 relative">
              <svg 
                viewBox="0 0 600 180" 
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                <defs>
                  {/* Emerald Area Gradient */}
                  <linearGradient id="emeraldSplineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>

                  {/* Node Glow Filter */}
                  <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid guidelines */}
                <line x1="0" y1="40" x2="600" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="600" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="600" y2="120" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="600" y2="160" stroke="rgba(255,255,255,0.08)" />

                {/* Secondary MSP Benchmark Curve (Dashed Indigo) */}
                <path 
                  d="M 0 120 C 100 115, 200 125, 300 118 C 400 112, 500 122, 600 116" 
                  fill="none" 
                  stroke="#818cf8" 
                  strokeWidth="1.8" 
                  strokeDasharray="5 5"
                  opacity="0.75"
                />

                {/* Primary Emerald Spline Filled Area */}
                <path 
                  d="M 0 135 C 90 120, 150 70, 220 90 C 290 110, 360 45, 430 55 C 500 70, 540 30, 600 35 L 600 180 L 0 180 Z" 
                  fill="url(#emeraldSplineGrad)" 
                />

                {/* Primary Emerald Spline Stroke */}
                <path 
                  d="M 0 135 C 90 120, 150 70, 220 90 C 290 110, 360 45, 430 55 C 500 70, 540 30, 600 35" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="2.8" 
                  strokeLinecap="round"
                />

                {/* Historical data nodes */}
                <circle cx="150" cy="70" r="3.5" fill="#10b981" opacity="0.6" />
                <circle cx="220" cy="90" r="3.5" fill="#10b981" opacity="0.6" />
                <circle cx="360" cy="45" r="3.5" fill="#10b981" opacity="0.6" />
                <circle cx="430" cy="55" r="3.5" fill="#10b981" opacity="0.6" />

                {/* Latest Active Pulsing Node on Spline Peak (600, 35) */}
                <circle cx="585" cy="36" r="10" fill="#10b981" opacity="0.25" className="animate-ping" />
                <circle cx="585" cy="36" r="6" fill="#10b981" filter="url(#nodeGlow)" />
                <circle cx="585" cy="36" r="3" fill="#ffffff" />
              </svg>

              {/* Floating Tooltip Pill over latest data point */}
              <div className="absolute top-2 right-2 sm:right-6 px-3 py-1.5 rounded-lg bg-[#0c1226]/95 border border-emerald-500/40 shadow-xl flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono font-bold text-white">₹5,420 / Qtl</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1 rounded">+2.4%</span>
              </div>
            </div>
          </div>

          {/* Live Checklist Verification Items */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-white">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Automated Corridor Consensus Checks
              </span>
              <span className="text-[11px] font-mono text-emerald-400">4 / 4 PASSED</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#0c1226]/60 border border-white/[0.06] flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong className="text-white">PMGSY Geo-Route Locked:</strong> Rohtak ➔ Bhalaut ➔ Kalanaur
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1226]/60 border border-white/[0.06] flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong className="text-white">ICAR Quality Benchmark:</strong> Grade-A Mustard (&gt;40% Oil)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1226]/60 border border-white/[0.06] flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong className="text-white">20% Escrow Advance:</strong> Locked via Razorpay Vault
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#0c1226]/60 border border-white/[0.06] flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300">
                  <strong className="text-white">Weighbridge Electronic Slip Sync:</strong> Connected Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
