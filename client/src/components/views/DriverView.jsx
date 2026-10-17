import React, { useState } from 'react';
import { Truck, CheckCircle2, XCircle, MapPin, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function DriverView({ state, onRefresh }) {
  const { activeRole } = useRole();
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [checks, setChecks] = useState({
    stitched: true,
    visual: true,
    dryness: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState(null);

  const lots = state?.lots || [];
  const pool = state?.active_pool || {};

  const currentLot = lots.find(l => l.lot_id === selectedLotId) || lots[0];

  const handleAction = async (action) => {
    if (!currentLot) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/driver/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: currentLot.lot_id,
          action: action
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      setLastActionMsg(
        action === 'APPROVE'
          ? `Approved and loaded ${currentLot.farmer_name}'s lot into cargo bay.`
          : `Deferred ${currentLot.farmer_name}'s lot for sun-drying with ₹0 penalty.`
      );
      if (onRefresh) onRefresh();
      setSubmitting(false);
    } catch (err) {
      console.error('Driver inspection error:', err);
      setLastActionMsg(`Failed to record ${action.toLowerCase()} action. Please try again.`);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Transporter Profile & Route Banner */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{activeRole.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/30">
              Corridor Transporter
            </span>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">Vehicle: {activeRole.vehicle} &bull; Reg: {activeRole.regNumber}</p>
        </div>

        <div className="flex items-center gap-3 bg-secondary/80 px-4 py-2.5 rounded-xl border border-border">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div>
            <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Assigned Corridor Itinerary</span>
            <span className="text-xs font-bold text-foreground">{activeRole.route}</span>
          </div>
        </div>
      </div>

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pickup Stops Queue */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Pickup Route Stops</h4>
            <p className="text-xs text-muted-fg">PMGSY road-snapped waypoints for this corridor run.</p>
          </div>

          <div className="space-y-2">
            {lots.map((lot, index) => {
              const isSelected = (currentLot?.lot_id === lot.lot_id);
              return (
                <button
                  key={lot.lot_id}
                  onClick={() => setSelectedLotId(lot.lot_id)}
                  className={`w-full p-3 rounded-xl border text-left transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary/20 border-primary text-foreground shadow-sm'
                      : 'bg-secondary/60 border-border text-muted-fg hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">Stop #{index + 1}</span>
                      <span className="text-xs font-bold text-foreground">{lot.farmer_name}</span>
                    </div>
                    <p className="text-[11px] text-muted-fg">{lot.village} &bull; KhetPin: {lot.khet_pin}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-foreground block">{lot.quantity_quintals} Qtl</span>
                    <span className={`text-[10px] font-semibold ${
                      lot.status === 'LOADED_ON_TRUCK' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                    }`}>
                      {lot.status === 'LOADED_ON_TRUCK' ? 'Loaded' : 'Pending'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Farm-Gate Quality Gatekeeper (3-Point Checklist) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Farm-Gate Quality Gatekeeper
              </span>
              <h3 className="text-xl font-bold text-foreground mt-0.5">Digital Pre-Loading Checklist</h3>
              <p className="text-xs text-muted-fg">Protects consolidated vehicle cargo bay from wet or substandard grain.</p>
            </div>
            <Truck className="w-8 h-8 text-primary" />
          </div>

          {currentLot ? (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/80 rounded-xl border border-border flex justify-between items-center">
                <div>
                  <span className="text-xs text-muted-fg">Inspecting Batch for:</span>
                  <h4 className="text-base font-bold text-foreground">{currentLot.farmer_name} &bull; {currentLot.village}</h4>
                  <p className="text-xs font-mono text-primary mt-0.5">KhetPin: {currentLot.khet_pin}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-fg">Declared Quantity:</span>
                  <p className="text-lg font-bold text-foreground">{currentLot.bags_count} Bags ({currentLot.quantity_quintals} Qtl)</p>
                </div>
              </div>

              {/* 3 Checklist Items */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition">
                  <input
                    type="checkbox"
                    checked={checks.stitched}
                    onChange={(e) => setChecks({ ...checks, stitched: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">1. Bag Stitching & Farmer ID Stencil</span>
                    <span className="text-[11px] text-muted-fg">Standard 50kg gunny bags, double stitched, zero tears or leaking seams.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition">
                  <input
                    type="checkbox"
                    checked={checks.visual}
                    onChange={(e) => setChecks({ ...checks, visual: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">2. Visual Seed Cleanliness</span>
                    <span className="text-[11px] text-muted-fg">Uniform dark seed color, zero stones, soil clumps, or insect infestation.</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition">
                  <input
                    type="checkbox"
                    checked={checks.dryness}
                    onChange={(e) => setChecks({ ...checks, dryness: e.target.checked })}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <div>
                    <span className="text-xs font-bold text-foreground block">3. Tactile Grain Dryness Rub</span>
                    <span className="text-[11px] text-muted-fg">Grains rattle crisply when rubbed; absence of fermented odor (&lt;8% moisture).</span>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleAction('DEFER')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 font-bold rounded-xl border border-rose-500/30 transition active:scale-95 text-xs"
                >
                  <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                  Defer Lot for Sun-Drying (₹0 Penalty)
                </button>

                <button
                  onClick={() => handleAction('APPROVE')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg transition active:scale-95 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Load Cargo Bay
                </button>
              </div>

              {lastActionMsg && (
                <div className="p-3 bg-secondary rounded-xl border border-border text-xs text-foreground text-center animate-fade-in">
                  {lastActionMsg}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-fg">No lots available for inspection.</p>
          )}
        </div>
      </div>
    </div>
  );
}
