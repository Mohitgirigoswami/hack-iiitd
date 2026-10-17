import React, { useState, useEffect } from 'react';
import { Truck, CheckCircle2, XCircle, ArrowLeft, ShieldAlert, MapPin, AlertTriangle } from 'lucide-react';

export default function DriverChecklist({ onNavigate }) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspectedLot, setInspectedLot] = useState(null);
  const [checks, setChecks] = useState({
    stitched: true,
    visual: true,
    dryness: true,
  });

  const fetchLots = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setLots(data.lots || []);
      if (data.lots && data.lots.length > 0 && !inspectedLot) {
        setInspectedLot(data.lots[data.lots.length - 1]); // Select the most recent lot
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  const handleAction = async (action) => {
    if (!inspectedLot) return;
    try {
      await fetch('/api/driver/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: inspectedLot.lot_id,
          action: action
        })
      });
      await fetchLots();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Projector Dashboard
      </button>

      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-700">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              🚚 Transporter Dispatch Module (/driver)
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Farm-Gate Loading Quality Checklist</h2>
            <p className="text-xs text-slate-400">Protects consolidated truck from wet or substandard grain.</p>
          </div>
          <Truck className="w-8 h-8 text-emerald-400" />
        </div>

        {/* Lot Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Select Farmer Lot at Current Pickup Stop:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {lots.map((lot) => (
              <button
                key={lot.lot_id}
                onClick={() => setInspectedLot(lot)}
                className={`p-3 rounded-xl border text-left transition ${
                  inspectedLot?.lot_id === lot.lot_id
                    ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-emerald-400">{lot.lot_id}</span>
                  <span className="text-[10px] text-slate-400">{lot.quantity_quintals} Qtl</span>
                </div>
                <p className="text-sm font-semibold text-white mt-1 truncate">{lot.farmer_name}</p>
                <span className="text-[11px] text-slate-400 block truncate">{lot.village}</span>
              </button>
            ))}
          </div>
        </div>

        {inspectedLot && (
          <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-700/80 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400">Active Stop Inspection:</span>
                <h4 className="text-lg font-bold text-white">{inspectedLot.farmer_name} &bull; {inspectedLot.village}</h4>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  KhetPin: {inspectedLot.khet_pin}
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Declared Batch:</span>
                <p className="text-sm font-bold text-white">{inspectedLot.bags_count} Bags ({inspectedLot.quantity_quintals} Quintals)</p>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                <input
                  type="checkbox"
                  checked={checks.stitched}
                  onChange={(e) => setChecks({ ...checks, stitched: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">1. Bag Integrity & Stenciling</span>
                  <span className="text-xs text-slate-400">Standard 50kg gunny bags, stitched firmly, labeled with farmer ID.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                <input
                  type="checkbox"
                  checked={checks.visual}
                  onChange={(e) => setChecks({ ...checks, visual: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">2. Visual Purity & Cleanliness</span>
                  <span className="text-xs text-slate-400">Uniform seed color, zero stones, chaff, or insect infestation.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition">
                <input
                  type="checkbox"
                  checked={checks.dryness}
                  onChange={(e) => setChecks({ ...checks, dryness: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                />
                <div>
                  <span className="text-sm font-semibold text-white block">3. Tactile Grain Dryness Check</span>
                  <span className="text-xs text-slate-400">Grains rattle crisply when rubbed; free of damp fermentation smell.</span>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 pt-3">
              <button
                onClick={() => handleAction('DEFER')}
                className="flex items-center justify-center gap-2 py-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 font-semibold rounded-xl border border-rose-500/40 transition active:scale-95 text-xs sm:text-sm"
              >
                <XCircle className="w-4 h-4 text-rose-400" />
                Defer Lot for Sun-Drying (₹0 Penalty)
              </button>

              <button
                onClick={() => handleAction('APPROVE')}
                className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg transition active:scale-95 text-xs sm:text-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Load Cargo Bay
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
