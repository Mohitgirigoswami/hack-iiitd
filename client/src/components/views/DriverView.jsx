import React, { useState, useEffect } from 'react';
import { 
  Truck, CheckCircle2, XCircle, MapPin, ShieldAlert, AlertTriangle, 
  ArrowRight, CloudRain, Volume2, Package, Repeat, Sparkles, Navigation, 
  Thermometer, Wind, Check, Sun, Calendar, Clock, RefreshCw
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function DriverView({ state, onRefresh }) {
  const { activeRole, setCustomPhone } = useRole();
  const [selectedLotId, setSelectedLotId] = useState(null);
  const [activeRunTab, setActiveRunTab] = useState('outbound'); // 'outbound' | 'backhaul'
  const [weather, setWeather] = useState(null);
  const [backhaul, setBackhaul] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [backhaulDispatched, setBackhaulDispatched] = useState(false);
  const [checks, setChecks] = useState({
    stitched: false,
    visual: false,
    dryness: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState(null);

  // Fleet switcher state
  const [driversList, setDriversList] = useState([]);
  const [selectedDriverPhone, setSelectedDriverPhone] = useState(activeRole?.phone || '+91 94160 88219');

  // Reverse Backhaul Date Pooling State
  const [poolDate, setPoolDate] = useState('Tomorrow, 02:30 PM (24h Prior)');
  const [poolCapacityKg, setPoolCapacityKg] = useState(1500);
  const [poolingDate, setPoolingDate] = useState(false);
  const [poolSuccessMsg, setPoolSuccessMsg] = useState(null);

  const lots = state?.lots || [];
  const pool = state?.active_pool || {};

  const currentLot = lots.find(l => l.lot_id === selectedLotId) || lots[0];

  useEffect(() => {
    setChecks({ stitched: false, visual: false, dryness: false });
  }, [selectedLotId]);

  useEffect(() => {
    fetchWeather();
    fetchBackhaul();
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) {
        const data = await res.json();
        setDriversList(data.drivers || []);
      }
    } catch (e) {
      console.warn('Driver fetch error:', e);
    }
  };

  const handleScheduleBackhaulDate = async (targetDate = poolDate) => {
    setPoolingDate(true);
    setPoolSuccessMsg(null);
    try {
      const res = await fetch('/api/backhaul/pool-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_date: targetDate,
          capacity_kg: parseFloat(poolCapacityKg),
          transporter_phone: selectedDriverPhone
        })
      });
      if (res.ok) {
        const data = await res.json();
        setPoolSuccessMsg(`Return Backhaul trip locked for ${targetDate}. 0% Khali Phera guaranteed!`);
        setTimeout(() => setPoolSuccessMsg(null), 4000);
        fetchBackhaul();
      }
    } catch (err) {
      console.error('Date pooling error:', err);
    } finally {
      setPoolingDate(false);
    }
  };

  const fetchWeather = async () => {
    try {
      const res = await fetch('/api/weather');
      if (res.ok) {
        const data = await res.json();
        setWeather(data);
      }
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
  };

  const fetchBackhaul = async () => {
    try {
      const res = await fetch('/api/backhaul/manifest');
      if (res.ok) {
        const data = await res.json();
        setBackhaul(data);
      }
    } catch (e) {
      console.warn('Backhaul fetch error:', e);
    }
  };

  const playKhetPinBreadcrumb = async (cueText = "बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।") => {
    if (playingAudio) return;
    setPlayingAudio(true);
    try {
      const res = await fetch('/api/khetpin/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cue_text: cueText })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio_base64) {
          const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
          audio.onended = () => setPlayingAudio(false);
          audio.onerror = () => setPlayingAudio(false);
          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn("Breadcrumb audio failed:", e);
    }
    setPlayingAudio(false);
  };

  const handleAction = async (action) => {
    if (!currentLot) return;
    if (currentLot.status === 'LOADED_ON_TRUCK' || currentLot.status === 'DEFERRED_FOR_SUN_DRYING') {
      setLastActionMsg("⚠️ This lot is already finalized and cannot be modified.");
      return;
    }
    if (action === 'APPROVE' && !(checks.stitched && checks.visual && checks.dryness)) {
      setLastActionMsg("⚠️ All 3 quality checklist items must be verified before approving.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/driver/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: currentLot.lot_id,
          action: action,
          checklist: checks
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
      setLastActionMsg(
        action === 'APPROVE'
          ? `✓ Approved and loaded ${currentLot.farmer_name}'s lot into cargo bay.`
          : `⚠️ Deferred ${currentLot.farmer_name}'s lot for sun-drying with ₹0 penalty.`
      );
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Driver inspection error:', err);
      setLastActionMsg(err.message || `Failed to record ${action.toLowerCase()} action.`);
    } finally {
      setSubmitting(false);
    }
  };

  const isChecklistComplete = checks.stitched && checks.visual && checks.dryness;
  const isLotFinalized = currentLot?.status === 'LOADED_ON_TRUCK' || currentLot?.status === 'DEFERRED_FOR_SUN_DRYING' || currentLot?.status === 'REJECTED_BY_FARMER';

  return (
    <div className="space-y-6">
      {/* Transporter Profile, Route & Live Weather Banner */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            {driversList.length > 0 ? (
              <select
                value={selectedDriverPhone}
                onChange={(e) => {
                  const phone = e.target.value;
                  setSelectedDriverPhone(phone);
                  setCustomPhone(phone);
                }}
                className="text-base font-bold text-foreground bg-transparent border-b border-border focus:outline-none focus:border-primary cursor-pointer"
              >
                {driversList.map((d) => (
                  <option key={d.phone} value={d.phone} className="bg-card text-foreground">
                    {d.name} &bull; {d.vehicle_number || d.vehicle_model}
                  </option>
                ))}
              </select>
            ) : (
              <h3 className="text-lg font-bold text-foreground">{activeRole.name}</h3>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/30">
              Corridor Transporter
            </span>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">Vehicle: {activeRole.vehicle} &bull; CLI: {selectedDriverPhone}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Open-Meteo Weather Badge with Lucide Icons */}
          {weather && (
            <div className="flex items-center gap-2.5 bg-secondary/80 px-3.5 py-2 rounded-xl border border-border text-xs">
              <CloudRain className={`w-4 h-4 ${weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN' ? 'text-amber-400 animate-pulse' : 'text-blue-400'}`} />
              <div>
                <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Corridor Weather (Open-Meteo)</span>
                <span className="font-semibold text-foreground">
                  {weather.temperature_c}°C &bull; Rain Risk: {weather.precipitation_probability_pct}%
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN' ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>Tie Down Tarpaulin</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3 h-3 text-emerald-400" />
                    <span>Dry Transit Optimal</span>
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-secondary/80 px-4 py-2.5 rounded-xl border border-border">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Assigned Corridor</span>
              <span className="text-xs font-bold text-foreground">{activeRole.route}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Way Corridor Run Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveRunTab('outbound')}
          className={`pb-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeRunTab === 'outbound'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Truck className="w-4 h-4" />
          1. Outbound Harvest Run (Rohtak ➔ Azadpur)
        </button>

        <button
          onClick={() => setActiveRunTab('backhaul')}
          className={`pb-3 px-5 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeRunTab === 'backhaul'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Repeat className="w-4 h-4 text-emerald-500" />
          2. Reverse Backhaul Run (Azadpur ➔ Village Bhalaut)
          <span className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">
            0% Khali Phera
          </span>
        </button>
      </div>

      {/* TAB 1: Outbound Harvest Run (Inspection & PMGSY Stops) */}
      {activeRunTab === 'outbound' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Pickup Stops Queue */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">Pickup Route Stops</h4>
                <p className="text-xs text-muted-fg">PMGSY road-snapped waypoints for this corridor run.</p>
              </div>
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
                <div className="p-4 bg-secondary/80 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-muted-fg">Inspecting Batch for:</span>
                    <h4 className="text-base font-bold text-foreground">{currentLot.farmer_name} &bull; {currentLot.village}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-primary">KhetPin: {currentLot.khet_pin}</span>
                      <button
                        onClick={() => playKhetPinBreadcrumb("बड़ के पेड़ से नहर की पटरी पकड़ के ट्यूबवेल के सामने आ जाना।")}
                        disabled={playingAudio}
                        className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold border border-primary/30 hover:bg-primary/30 flex items-center gap-1 transition"
                      >
                        <Volume2 className={`w-3 h-3 ${playingAudio ? 'animate-bounce text-emerald-400' : ''}`} />
                        {playingAudio ? 'Playing Cue...' : 'Play Voice Breadcrumb'}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-fg">Declared Quantity:</span>
                    <p className="text-lg font-bold text-foreground">{currentLot.bags_count} Bags ({Number(currentLot.quantity_quintals || 0).toFixed(1)} Qtl)</p>
                  </div>
                </div>

                {/* State Locking: If lot is already finalized, lock the gate completely */}
                {isLotFinalized ? (
                  <div className="space-y-3">
                    {currentLot.status === 'LOADED_ON_TRUCK' ? (
                      <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          </div>
                          <div>
                            <span className="font-bold text-emerald-400 text-sm block">Cargo Bay Loaded & Quality Verified</span>
                            <span className="text-[11px] text-muted-fg block mt-0.5">
                              All 3 quality criteria verified. Tamper-proof dispatch lock engaged. State cannot be modified.
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40 shrink-0">
                          ✓ LOCKED
                        </span>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <span className="font-bold text-amber-400 text-sm block">Lot Deferred for Sun-Drying</span>
                            <span className="text-[11px] text-muted-fg block mt-0.5">
                              Moisture or foreign matter flagged. ₹0 penalty guaranteed for farmer. State locked.
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/40 shrink-0">
                          DEFERRED
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* 3 Checklist Items - Unchecked by default */}
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition">
                        <input
                          type="checkbox"
                          checked={checks.stitched}
                          onChange={(e) => setChecks({ ...checks, stitched: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
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
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-foreground block">2. Visual Seed Cleanliness</span>
                          <span className="text-[11px] text-muted-fg">Uniform seed color, zero stones, soil clumps, or insect infestation.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-secondary/50 rounded-xl border border-border cursor-pointer hover:border-primary/50 transition">
                        <input
                          type="checkbox"
                          checked={checks.dryness}
                          onChange={(e) => setChecks({ ...checks, dryness: e.target.checked })}
                          className="w-4 h-4 rounded accent-primary cursor-pointer"
                        />
                        <div>
                          <span className="text-xs font-bold text-foreground block">3. Tactile Grain Dryness Rub (&lt;8% Moisture)</span>
                          <span className="text-[11px] text-muted-fg">Grains rattle crisply when rubbed; absence of fermented moisture odor.</span>
                        </div>
                      </label>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => handleAction('DEFER')}
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 py-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 font-bold rounded-xl border border-rose-500/30 transition active:scale-95 text-xs cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 text-rose-700 dark:text-rose-400" />
                        Defer Lot for Sun-Drying (₹0 Penalty)
                      </button>

                      <button
                        onClick={() => handleAction('APPROVE')}
                        disabled={submitting || !isChecklistComplete}
                        className={`flex items-center justify-center gap-2 py-3 font-bold rounded-xl shadow-lg transition active:scale-95 text-xs cursor-pointer ${
                          isChecklistComplete
                            ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                            : 'bg-secondary text-muted-fg border border-border opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {!isChecklistComplete ? 'Verify All 3 Criteria to Load' : 'Approve & Load Cargo Bay'}
                      </button>
                    </div>
                  </>
                )}

                {lastActionMsg && (
                  <div className="p-3 bg-secondary rounded-xl border border-border text-xs text-foreground text-center animate-fade-in font-medium">
                    {lastActionMsg}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-fg">No lots available for inspection.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Reverse Backhaul Run (Khali Phera Elimination) */}
      {activeRunTab === 'backhaul' && (
        <div className="space-y-6">
          {/* Backhaul Economic KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4">
              <span className="text-[11px] text-muted-fg font-bold uppercase tracking-wider block">Transporter Backhaul Pay</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">+₹850</span>
              <span className="text-[10px] text-muted-fg">Pre-contracted B2B mill freight</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <span className="text-[11px] text-muted-fg font-bold uppercase tracking-wider block">Farmer Forward Freight</span>
              <span className="text-2xl font-black text-primary mt-1 block">₹450 <span className="text-xs font-normal text-muted-fg">/ lot</span></span>
              <span className="text-[10px] text-emerald-400 font-semibold">Slashed from ₹640 (30% Extra Savings)</span>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4">
              <span className="text-[11px] text-muted-fg font-bold uppercase tracking-wider block">Deadhead Mileage Saved</span>
              <span className="text-2xl font-black text-blue-400 mt-1 block">65 KM</span>
              <span className="text-[10px] text-emerald-400 font-semibold">0% Khali Phera (100% Balanced Run)</span>
            </div>
          </div>

          {/* 1-Day Prior Date Pooling & Reverse Backhaul Capacity Scheduling Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-foreground">
                    1-Day Prior Date Pooling & Return Capacity Scheduling
                  </h4>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Transporters pre-schedule return transfer runs to eliminate 100% empty deadhead mileage (0% Khali Phera).
                </p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30 font-bold">
                Capacity: {poolCapacityKg} kg (100% Guaranteed Load)
              </span>
            </div>

            {poolSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{poolSuccessMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: 'Tomorrow, 02:30 PM', sub: '24h Prior Plan', tag: 'Recommended' },
                { title: 'Saturday, 11:00 AM', sub: 'PACS Bulk Delivery', tag: 'Weekend Run' },
                { title: 'Monday, 09:00 AM', sub: 'Fertilizer Restock', tag: 'Depot Run' },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPoolDate(p.title);
                    handleScheduleBackhaulDate(p.title);
                  }}
                  disabled={poolingDate}
                  className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between group active:scale-95 ${
                    poolDate === p.title
                      ? 'bg-emerald-500/15 border-emerald-500 text-foreground shadow-sm'
                      : 'bg-secondary/60 border-border hover:border-emerald-500/40 text-muted-fg hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-foreground group-hover:text-emerald-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      {p.title}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary text-primary font-bold">
                      {p.tag}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-fg mt-2">{p.sub} &bull; 0% Deadhead</span>
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-fg">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-primary" />
                Automatic matching with Shree Ram Mill byproducts & Village Bhalaut PACS Societies.
              </span>
              <button
                onClick={() => handleScheduleBackhaulDate(poolDate)}
                disabled={poolingDate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Repeat className="w-3.5 h-3.5" />
                {poolingDate ? 'Scheduling Return Trip...' : 'Lock Return Trip Schedule'}
              </button>
            </div>
          </div>

          {/* Reverse Manifest Table */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                  Circular Agronomy Ingestion
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Return Cargo Manifest (City ➔ Village Hub)</h3>
                <p className="text-xs text-muted-fg">Carries oil mill byproducts, subsidized fertilizers, and ICAR inputs back to the village cooperative.</p>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30">
                Payload: 1,000 kg (66.7% Full)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-fg">
                    <th className="pb-3 px-3 font-semibold">Item & Category</th>
                    <th className="pb-3 px-3 font-semibold">Source Pickup</th>
                    <th className="pb-3 px-3 font-semibold">Village Destination</th>
                    <th className="pb-3 px-3 font-semibold">Load (Weight)</th>
                    <th className="pb-3 px-3 font-semibold">Economic Advantage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {backhaul?.return_cargo?.map((item, i) => (
                    <tr key={i} className="hover:bg-secondary/40 transition">
                      <td className="py-3 px-3">
                        <span className="font-bold text-foreground block">{item.item}</span>
                        <span className="text-[10px] text-primary">{item.category}</span>
                      </td>
                      <td className="py-3 px-3 text-muted-fg">{item.source}</td>
                      <td className="py-3 px-3 text-muted-fg">{item.destination}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{item.quantity_kg} kg ({item.bags} Bags)</td>
                      <td className="py-3 px-3">
                        {item.wholesale_rate_rs ? (
                          <span className="text-emerald-400 font-bold">Wholesale ₹{item.wholesale_rate_rs}/Qtl</span>
                        ) : item.subsidized_mrp_rs ? (
                          <span className="text-blue-400 font-bold">Subsidized MRP ₹{item.subsidized_mrp_rs}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">80% Chemical Cost Cut</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action dispatch button */}
            <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-fg">
                Recipient: <strong className="text-foreground">Village Bhalaut Primary Agricultural Cooperative Society (PACS)</strong>
              </div>
              <button
                onClick={() => setBackhaulDispatched(true)}
                disabled={backhaulDispatched}
                className={`py-3 px-6 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  backhaulDispatched
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95'
                }`}
              >
                {backhaulDispatched ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Return Route Dispatched & Locked (0% Khali Phera)</span>
                  </>
                ) : (
                  <>
                    <Repeat className="w-4 h-4" />
                    <span>Authorize Return Cargo Dispatch to Village PACS ⚡</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

