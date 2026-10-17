import React, { useState, useEffect } from 'react';
import { Truck, TrendingUp, MapPin, PhoneCall, RefreshCw, CheckCircle2, AlertCircle, ArrowUpRight, ShieldCheck, Users } from 'lucide-react';

export default function Dashboard({ onNavigate }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      const data = await res.json();
      setState(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching state:', err);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1500); // Poll every 1.5 seconds for live reactions
    return () => clearInterval(interval);
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/reset', { method: 'POST' });
      await fetchState();
    } catch (err) {
      console.error(err);
    }
    setIsResetting(false);
  };

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center space-x-3 text-emerald-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-lg font-medium">Connecting to KhetOS Central State Engine...</span>
        </div>
      </div>
    );
  }

  const { active_pool, lots, activity_feed } = state;
  const isFull = active_pool.capacity_percentage >= 100;
  const totalExtraProfit = lots.reduce((acc, l) => acc + (l.extra_profit_earned_rs || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-800/80 backdrop-blur p-4 rounded-xl border border-slate-700 shadow-lg">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Mandi Corridor
            </span>
            <span className="text-xs text-slate-400">Tehsil: Rohtak &bull; Destination: Azadpur APMC</span>
          </div>
          <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            {active_pool.cluster_name}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('call')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg shadow-md transition-all active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            Launch Phone Simulator (/call)
          </button>
          <button
            onClick={handleReset}
            disabled={isResetting}
            title="Reset to 1,100 kg initial demo state"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
            Reset State
          </button>
        </div>
      </div>

      {/* Hero Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Live Truck Capacity */}
        <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
            <span>Pickup Truck Capacity (Bolero)</span>
            <Truck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {active_pool.current_loaded_kg} <span className="text-lg text-slate-400 font-normal">/ {active_pool.target_capacity_kg} kg</span>
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${isFull ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400'}`}>
              {active_pool.capacity_percentage}% Full
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-4 w-full bg-slate-700 rounded-full h-3.5 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isFull ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse' : 'bg-gradient-to-r from-emerald-600 to-amber-500'}`}
              style={{ width: `${Math.min(100, active_pool.capacity_percentage)}%` }}
            ></div>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>Current: {active_pool.current_loaded_quintals} Qtl</span>
            <span className="font-semibold text-emerald-400">
              {isFull ? '🚚 100% Full — Dispatching!' : `Need ${(active_pool.target_capacity_quintals - active_pool.current_loaded_quintals).toFixed(1)} Qtl to Dispatch`}
            </span>
          </div>
        </div>

        {/* Card 2: Price Arbitrage */}
        <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
            <span>Mandi Price Arbitrage</span>
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              ₹{active_pool.benchmark_mandi_price}
            </span>
            <span className="text-xs text-slate-400">/ quintal (Azadpur)</span>
          </div>
          <div className="mt-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60 space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Local Village Middleman:</span>
              <span className="text-rose-400 font-semibold line-through">₹{active_pool.local_trader_price}/qtl</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-emerald-400">
              <span>Direct Mandi Gain:</span>
              <span className="flex items-center">+₹{active_pool.benchmark_mandi_price - active_pool.local_trader_price}/qtl <ArrowUpRight className="w-3.5 h-3.5" /></span>
            </div>
          </div>
        </div>

        {/* Card 3: Collective Farmer Profit */}
        <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md">
          <div className="flex items-center justify-between text-slate-400 text-sm font-medium">
            <span>Collective Farmer Net Gain</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              +₹{totalExtraProfit.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">saved from middlemen</span>
          </div>
          <div className="mt-3 text-xs text-slate-400 leading-relaxed">
            Consolidated freight sharing costs only <span className="text-white font-semibold">₹120/qtl</span> vs individual pickup rental of ₹2,500. Zero hidden deductions.
          </div>
        </div>
      </div>

      {/* Visual Cargo Bay Simulator */}
      <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-400" />
              Mahindra Bolero Cargo Bay ({active_pool.transporter})
            </h3>
            <p className="text-xs text-slate-400">Individual bags are tagged by KhetPin & partitioned with tarpaulin sheets.</p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${isFull ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
            {active_pool.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Visual Truck Bed with Bags */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-slate-900 rounded-lg border border-slate-700/60">
          {lots.map((lot, idx) => (
            <div
              key={lot.lot_id}
              className="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-emerald-500/50 transition relative overflow-hidden group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-400">{lot.lot_id}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                  {lot.channel === 'ivr_call' ? '📞 IVR Call' : '💬 Telegram'}
                </span>
              </div>
              <p className="font-semibold text-white text-sm mt-1">{lot.farmer_name}</p>
              <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>{lot.village} &bull; {lot.khet_pin}</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs">
                <span className="font-bold text-white">{lot.bags_count} Bags ({lot.quantity_quintals} Qtl)</span>
                <span className="text-emerald-400 font-semibold">+₹{lot.extra_profit_earned_rs?.toFixed(0) || '1,800'} profit</span>
              </div>
            </div>
          ))}

          {!isFull && (
            <div className="p-3 border-2 border-dashed border-slate-700 rounded-lg flex flex-col items-center justify-center text-center text-slate-400 hover:border-emerald-500/40 transition">
              <span className="text-xs font-semibold text-amber-400">Remaining Slot</span>
              <p className="text-xs mt-1">Waiting for Ramu Sharma (4 Quintals / 8 Bags)</p>
              <button
                onClick={() => onNavigate('call')}
                className="mt-2 text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
              >
                <PhoneCall className="w-3 h-3" /> Simulate Ramu's Call
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Lots Ledger & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Lots Ledger (2 cols) */}
        <div className="lg:col-span-2 bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Consolidated Farmer Lots (Manifest #HR-104)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 bg-slate-900/60 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Farmer</th>
                  <th className="py-2.5 px-3">KhetPin</th>
                  <th className="py-2.5 px-3">Commodity</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">Freight Share</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 text-slate-300">
                {lots.map((lot) => (
                  <tr key={lot.lot_id} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 font-medium text-white">
                      {lot.farmer_name}
                      <span className="block text-[10px] text-slate-400">{lot.village}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{lot.khet_pin}</td>
                    <td className="py-3 px-3">{lot.crop}</td>
                    <td className="py-3 px-3 font-semibold text-white">{lot.quantity_quintals} Qtl ({lot.bags_count} bags)</td>
                    <td className="py-3 px-3">₹{lot.freight_share_rs}</td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
                        {lot.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Activity Stream (1 col) */}
        <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 shadow-md">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            Real-Time Event Stream
          </h3>
          <div className="space-y-3">
            {activity_feed.map((act, i) => (
              <div key={i} className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60 text-xs">
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider">{act.event}</span>
                  <span>{act.timestamp}</span>
                </div>
                <p className="text-slate-200 mt-1 leading-relaxed">{act.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
