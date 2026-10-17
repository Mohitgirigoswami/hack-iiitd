import React, { useState } from 'react';
import { Truck, MapPin, CheckCircle2, AlertCircle, RefreshCw, Phone, ShieldCheck, ChevronRight, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

export default function AdminView({ state, onRefresh }) {
  const navigate = useNavigate();
  const { activeRole } = useRole();
  const [selectedCorridor, setSelectedCorridor] = useState('CORR-ROH-01');

  const pool = state?.active_pool || {};
  const lots = state?.lots || [];
  const feed = state?.activity_feed || [];

  const corridors = [
    {
      id: 'CORR-ROH-01',
      name: 'Rohtak-Kalanaur ➔ Azadpur APMC',
      vehicle: 'Mahindra Bolero (HR-12-AE-8419)',
      driver: 'Baljit Singh',
      capacityT: '1.5T',
      status: pool.capacity_percentage >= 99 ? '100% FULL • DISPATCHED' : `${pool.capacity_percentage || 73.3}% FILLED • INTAKE ACTIVE`,
      isLive: true,
    },
    {
      id: 'CORR-HPR-02',
      name: 'Hapur-Meerut ➔ Sahibabad APMC',
      vehicle: 'Tata 407 (UP-14-BT-5102)',
      driver: 'Ravinder Gujjar',
      capacityT: '2.5T',
      status: '85% FILLED • EN ROUTE',
      isLive: false,
    },
    {
      id: 'CORR-ALW-03',
      name: 'Alwar-Khairthal ➔ Jaipur APMC',
      vehicle: 'Ashok Leyland Dost (RJ-02-GB-9921)',
      driver: 'Mahesh Meena',
      capacityT: '1.25T',
      status: '40% FILLED • ACCEPTING LOTS',
      isLive: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Admin Profile & Multi-Corridor Fleet Selector */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{activeRole.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-secondary text-foreground font-semibold border border-border">
                APMC Command Center
              </span>
            </div>
            <p className="text-xs text-muted-fg mt-0.5">{activeRole.mandi} &bull; {activeRole.region}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-fg font-semibold">Corridor Network:</span>
            <span className="text-xs font-bold px-2 py-1 bg-secondary rounded-lg text-foreground border border-border">
              3 Trucks Active Across Bharat
            </span>
          </div>
        </div>

        {/* Multi-Truck Corridor Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {corridors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCorridor(c.id)}
              className={`p-3 rounded-xl border text-left transition ${
                selectedCorridor === c.id
                  ? 'bg-primary/20 border-primary shadow-sm'
                  : 'bg-secondary/60 border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground truncate">{c.name}</span>
                {c.isLive && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 animate-pulse">
                    LIVE DEMO
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-fg mt-1 truncate">{c.vehicle} &bull; {c.driver}</p>
              <span className="text-[10px] font-bold text-primary mt-1 block">{c.status}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hero Visual Capacity Gauge for Active Corridor */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-black text-foreground">
                Corridor Truck Cargo Capacity Telemetry
              </h3>
            </div>
            <p className="text-xs text-muted-fg mt-0.5">
              Mahindra Bolero Pickup (1.5 Tonne / 15 Quintal Payload) &bull; Zero lot fragmentation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-3xl font-black text-primary font-mono">
                {pool.capacity_percentage || 73.3}%
              </span>
              <span className="text-[10px] text-muted-fg font-bold block uppercase tracking-wider">
                Vehicle Fill Rate
              </span>
            </div>
          </div>
        </div>

        {/* Large Visual Progress Bar */}
        <div className="space-y-2">
          <div className="h-6 bg-secondary rounded-full overflow-hidden border border-border p-1 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                pool.capacity_percentage >= 99
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-glow'
                  : 'bg-primary'
              }`}
              style={{ width: `${Math.min(pool.capacity_percentage || 73.3, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">
              Loaded: <strong>{pool.current_loaded_kg || 1100} kg</strong> ({pool.current_loaded_quintals || 11.0} Qtl / 22 Bags)
            </span>
            <span className="font-semibold text-muted-fg">
              Remaining: <strong>{Math.max(0, (pool.target_capacity_kg || 1500) - (pool.current_loaded_kg || 1100))} kg</strong> (8 Bags)
            </span>
          </div>
        </div>

        {/* Visual Bolero Cargo Bay (30 Discrete 50kg Gunny Sacks) */}
        <div className="p-4 bg-secondary/50 rounded-2xl border border-border space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Bolero Flatbed Cargo Manifest (30 &times; 50kg Sacks)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-card border border-border text-muted-fg">
                Discrete Knapsack
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-fg">
              {lots.map((lot, idx) => {
                const colors = [
                  { dot: "bg-emerald-500" },
                  { dot: "bg-blue-500" },
                  { dot: "bg-amber-500" },
                  { dot: "bg-purple-500" },
                  { dot: "bg-cyan-500" }
                ];
                const col = colors[idx % colors.length];
                return (
                  <span key={lot.lot_id} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded ${col.dot} inline-block`} />
                    {lot.farmer_name?.split(' ')[0] || 'Farmer'} ({lot.bags_count || (lot.quantity_quintals * 2)})
                  </span>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-1">
            {(() => {
              const farmerPalette = [
                { bg: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold", dot: "bg-emerald-500" },
                { bg: "bg-blue-500/20 border-blue-500/50 text-blue-400 font-bold", dot: "bg-blue-500" },
                { bg: "bg-amber-500/25 border-amber-500/60 text-amber-400 font-bold", dot: "bg-amber-500" },
                { bg: "bg-purple-500/20 border-purple-500/50 text-purple-400 font-bold", dot: "bg-purple-500" },
                { bg: "bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-bold", dot: "bg-cyan-500" },
              ];

              const flatbedBags = [];
              lots.forEach((lot, lotIdx) => {
                const palette = farmerPalette[lotIdx % farmerPalette.length];
                const bagCount = Math.round(lot.bags_count || (lot.quantity_quintals * 2));
                for (let b = 0; b < bagCount && flatbedBags.length < 30; b++) {
                  flatbedBags.push({
                    lotId: lot.lot_id,
                    farmerName: lot.farmer_name,
                    bagNumInLot: b + 1,
                    totalLotBags: bagCount,
                    palette: palette,
                    isLoaded: lot.status === 'LOADED_ON_TRUCK' || lot.status === 'ACCEPTED' || (pool.capacity_percentage >= 99)
                  });
                }
              });

              return Array.from({ length: 30 }).map((_, i) => {
                const bag = flatbedBags[i];
                let bgClass = "bg-secondary border border-dashed border-border text-muted-fg/40";
                let title = `Empty Bay Slot #${i + 1} (50kg)`;

                if (bag) {
                  if (bag.isLoaded) {
                    bgClass = `${bag.palette.bg} border shadow-xs`;
                    title = `${bag.farmerName} • Bag #${bag.bagNumInLot}/${bag.totalLotBags} (50kg)`;
                  } else {
                    bgClass = "border border-dashed border-primary/50 bg-primary/10 text-primary font-bold animate-pulse";
                    title = `Reserved for ${bag.farmerName} • Key 2 pending`;
                  }
                }

                return (
                  <div
                    key={i}
                    title={title}
                    className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-mono transition-all duration-500 select-none ${bgClass}`}
                  >
                    {i + 1}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Live Call Telephony Prompt Banner */}
        {pool.capacity_percentage < 99 ? (
          <div className="p-4 bg-primary/15 border border-primary/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-sm">
                <Phone className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Ready for Live Telephony Demo!
                </p>
                <p className="text-[11px] text-muted-fg">
                  Launch the standalone <strong className="text-primary">/call</strong> telephony route and press <strong className="text-primary">Key 2</strong>. Ramu's 4 Quintals will instantly fill this gauge to 100%!
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/call')}
              className="shrink-0 py-2 px-4 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-sm hover:brightness-110 transition active:scale-95 flex items-center gap-1.5"
            >
              Open /call Simulator
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                Consolidated Cargo Bay 100% Full & Dispatched!
              </p>
              <p className="text-[11px] text-muted-fg">
                3 smallholder lots consolidated (1,500 kg total). Driver Baljit Singh en route to Azadpur APMC Mandi.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Grid: Lots Table & Live Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Lots Manifest */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div>
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Consolidated Farmer Manifest
              </h4>
              <p className="text-xs text-muted-fg">Individual lot allocations packed in discrete 50kg bag units.</p>
            </div>
            <span className="text-xs font-bold text-primary font-mono">{lots.length} Lots Active</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-fg uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Lot ID</th>
                  <th className="py-2.5 px-3">Farmer & Village</th>
                  <th className="py-2.5 px-3">KhetPin</th>
                  <th className="py-2.5 px-3">Bags / Qtl</th>
                  <th className="py-2.5 px-3">Freight</th>
                  <th className="py-2.5 px-3">Gate Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {lots.map((lot) => (
                  <tr key={lot.lot_id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-primary">{lot.lot_id}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-foreground block">{lot.farmer_name}</span>
                      <span className="text-[10px] text-muted-fg">{lot.village}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-fg">{lot.khet_pin}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      {lot.bags_count} Bags ({lot.quantity_quintals} Qtl)
                    </td>
                    <td className="py-2.5 px-3 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      ₹{lot.freight_share_rs}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        {lot.status === 'LOADED_ON_TRUCK' ? 'Loaded' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Event Stream Timeline */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
              Corridor Event Log
            </h4>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              LIVE
            </span>
          </div>

          <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {feed.map((item, idx) => (
              <div key={idx} className="p-2.5 bg-secondary/60 rounded-xl border border-border text-xs space-y-1">
                <div className="flex justify-between items-center text-[10px] text-muted-fg font-semibold">
                  <span className="uppercase tracking-wider text-primary">{item.type}</span>
                  <span>{item.timestamp}</span>
                </div>
                <p className="text-foreground font-medium text-[11px] leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
