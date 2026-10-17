import React, { useState } from 'react';
import { 
  Scan, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, 
  Cpu, FileCheck, Layers, Eye, RefreshCw
} from 'lucide-react';

/**
 * QualityScannerLaser - Replicates Credentia's document verification scanner
 * for farm-gate agricultural lot quality inspection:
 * - Authentic ICAR & Agmarknet lot certificate card
 * - Vertical sweeping teal laser beam line with trailing light sheet
 * - Real-time extracted telemetry (Moisture 7.2%, Purity 98.4%, ICAR Salts 0.00 ppm, Oil Content 41.8%)
 * - Tamper-evident SHA-256 lot digest and 60 FPS optical stream status
 */
export default function QualityScannerLaser() {
  const [scanningActive, setScanningActive] = useState(true);

  return (
    <div className="w-full max-w-4xl mx-auto my-12 p-1 relative">
      {/* Ambient glowing backdrop behind scanner */}
      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-emerald-500/15 to-cyan-500/10 rounded-3xl blur-2xl -z-10 pointer-events-none" />

      {/* Main Glassmorphic Chassis */}
      <div className="credentia-glass rounded-3xl p-6 sm:p-8 border border-white/[0.08] relative overflow-hidden space-y-6">
        {/* Top Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shadow-xs">
              <Scan className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Farm-Gate Optical Quality Scanner
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">
                  ICAR Standards
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Spectroscopic digital grain appraisal before Bolero flatbed loading.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              <span>Multi-Spectral Laser Active</span>
            </div>
            <button
              onClick={() => setScanningActive(!scanningActive)}
              className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-medium border border-white/[0.08] transition"
            >
              {scanningActive ? 'Pause Scan' : 'Resume Scan'}
            </button>
          </div>
        </div>

        {/* Two-Column Inspection Layout: Optical Chamber (Left) + Real-Time Telemetry (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Left Column: Visual Scanner Chamber with Sweeping Teal Laser */}
          <div className="md:col-span-5 relative">
            <div className="w-full h-72 sm:h-80 rounded-2xl bg-[#060814] border border-white/[0.1] overflow-hidden relative shadow-inner p-4 flex flex-col justify-between">
              {/* Background Grain Sample Grid Pattern */}
              <div 
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle at 4px 4px, #14b8a6 1.5px, transparent 1.5px)`,
                  backgroundSize: '18px 18px'
                }}
              />

              {/* Sample Grain Lot Inspection Overlay Graphics */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-44 rounded-full border border-teal-500/20 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-dashed border-teal-400/40 animate-spin" style={{ animationDuration: '40s' }} />
                  <div className="w-20 h-20 rounded-full bg-teal-500/5 border border-teal-500/30 flex items-center justify-center">
                    <span className="text-[9px] font-mono font-bold text-teal-300">PUSA-30</span>
                  </div>
                </div>
              </div>

              {/* Sweeping Teal Laser Beam with Trailing Light Sheet */}
              {scanningActive && (
                <div 
                  className="absolute inset-x-0 h-[2px] scanner-laser-line z-20 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, #14b8a6 20%, #22d3ee 50%, #14b8a6 80%, transparent)'
                  }}
                >
                  {/* Trailing Soft Light Sheet */}
                  <div 
                    className="absolute top-0 inset-x-0 h-10 -translate-y-full opacity-30 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(20, 184, 166, 0.45), transparent)'
                    }}
                  />
                  {/* Leading Ambient Flare */}
                  <div 
                    className="absolute bottom-0 inset-x-0 h-6 opacity-25 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom, rgba(34, 211, 238, 0.4), transparent)'
                    }}
                  />
                </div>
              )}

              {/* Chamber Header Tag */}
              <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-teal-300 bg-[#090e24]/85 px-3 py-1 rounded-lg border border-teal-500/30">
                <span>LOT: MUSTARD-8812</span>
                <span className="text-white font-bold">SAMPLE #04</span>
              </div>

              {/* Chamber Footer Telemetry Stamp */}
              <div className="relative z-10 text-[10px] font-mono text-slate-400 bg-[#090e24]/85 px-3 py-1.5 rounded-lg border border-white/[0.08] flex items-center justify-between">
                <span>SPECTRAL: 540nm</span>
                <span className="text-teal-300 font-bold">100% OPTICAL PASS</span>
              </div>
            </div>

            {/* Cryptographic Digest Pill */}
            <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
              <span>SHA-256: 8f4a...e129</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ICAR Pass Sealed
              </span>
            </div>
          </div>

          {/* Right Column: 4 Real-Time Extracted Telemetry Gauges */}
          <div className="md:col-span-7 space-y-3.5">
            {/* Metric 1: Moisture */}
            <div className="p-3.5 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] hover:border-teal-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Grain Moisture Content</span>
                <span className="text-xs font-mono font-black text-teal-300">7.2%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700" 
                  style={{ width: '45%' }} 
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                <span>Safe Threshold: &lt;8.0%</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> OPTIMAL DRYNESS • PASSED
                </span>
              </div>
            </div>

            {/* Metric 2: Purity */}
            <div className="p-3.5 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] hover:border-teal-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Physical Grain Purity</span>
                <span className="text-xs font-mono font-black text-emerald-400">98.4%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700" 
                  style={{ width: '98.4%' }} 
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                <span>Foreign Matter: 1.6% (Benchmark &gt;97.0%)</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> GRADE-A CLEAN • PASSED
                </span>
              </div>
            </div>

            {/* Metric 3: ICAR Salts & Chemical Residue */}
            <div className="p-3.5 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] hover:border-teal-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">ICAR Chemical Residue & Heavy Salts</span>
                <span className="text-xs font-mono font-black text-emerald-400">0.00 ppm</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700" 
                  style={{ width: '100%' }} 
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                <span>MRL Safe Limit Compliance: 100%</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ZERO HARMFUL RESIDUE • VERIFIED
                </span>
              </div>
            </div>

            {/* Metric 4: Oil Content (Benchmark Match) */}
            <div className="p-3.5 rounded-2xl bg-[#0c1226]/80 border border-white/[0.08] hover:border-teal-500/30 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Crude Oil Content (Spectroscopy)</span>
                <span className="text-xs font-mono font-black text-amber-400">41.8%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-700" 
                  style={{ width: '83.6%' }} 
                />
              </div>
              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400 font-mono">
                <span>Benchmark: &gt;40.0% (+₹120/Qtl bonus)</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> PREMIUM MILL GRADE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lot Certificate Signature Footer */}
        <div className="p-3 rounded-xl bg-[#060a1a]/80 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Lot Owner: <strong className="text-white">Ramu Sharma</strong> (HR-ROH-78G4) &bull; 8 x 50kg Bags (400 kg)
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400">Pre-Dispatch Gate:</span>
            <span className="text-emerald-400 font-bold">APPROVED FOR BOLERO LOADING</span>
          </div>
        </div>
      </div>
    </div>
  );
}
