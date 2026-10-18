import React, { useState, useEffect } from 'react';
import { 
  Truck, CheckCircle2, XCircle, MapPin, ShieldAlert, AlertTriangle, 
  ArrowRight, CloudRain, Volume2, Package, Repeat, Sparkles, Navigation, 
  Thermometer, Wind, Check, Sun, Calendar, Clock, RefreshCw, Send, DollarSign
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function DriverView({ state, onRefresh }) {
  const { activeRole, setCustomPhone } = useRole();
  const [activeRunTab, setActiveRunTab] = useState('outbound'); // 'outbound' | 'backhaul'
  const [weather, setWeather] = useState(null);
  const [backhaul, setBackhaul] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [backhaulDispatched, setBackhaulDispatched] = useState(false);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState(null);

  // 3-Point Pre-Loading Quality Checklist
  const [checks, setChecks] = useState({
    stitched: false,
    visual: false,
    dryness: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState(null);

  // Reverse Backhaul Date Pooling State
  const [poolDate, setPoolDate] = useState('Tomorrow, 02:30 PM (24h Prior)');
  const [poolCapacityKg, setPoolCapacityKg] = useState(1500);
  const [poolingDate, setPoolingDate] = useState(false);
  const [poolSuccessMsg, setPoolSuccessMsg] = useState(null);

  // Mandi Weighbridge Settlement
  const [settlingSale, setSettlingSale] = useState(false);
  const [settlementReport, setSettlementReport] = useState(null);

  const lots = state?.lots || [];
  const pool = state?.active_pool || {};

  const currentLot = lots.find(l => l.lot_id === selectedLotId) || lots[0];

  useEffect(() => {
    setChecks({ stitched: false, visual: false, dryness: false });
  }, [selectedLotId]);

  useEffect(() => {
    fetchWeather();
    fetchBackhaul();
    fetchActiveTrip();
  }, []);

  const fetchActiveTrip = async () => {
    setTripLoading(true);
    try {
      const res = await fetch('/api/trips/active');
      if (res.ok) {
        const data = await res.json();
        setActiveTrip(data.trip || null);
        if (data.trip?.stops && data.trip.stops.length > 0) {
          const currIdx = data.trip.current_stop_index || 0;
          const activeStop = data.trip.stops[currIdx];
          if (activeStop && !selectedLotId) {
            setSelectedLotId(activeStop.lot_id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch active trip:', e);
    } finally {
      setTripLoading(false);
    }
  };

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    setStartingTrip(true);
    try {
      const res = await fetch('/api/trips/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: activeTrip.trip_id })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTrip(data.trip);
        setLastActionMsg(`🚀 Trip #${data.trip.trip_id} started! Heading to Stop #1.`);
        fetchActiveTrip();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Start trip error:', err);
    } finally {
      setStartingTrip(false);
    }
  };

  const handleAdvanceStop = async (lotId) => {
    try {
      const res = await fetch('/api/trips/advance-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip?.trip_id,
          lot_id: lotId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTrip(data.trip);
        fetchActiveTrip();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Advance stop error:', err);
    }
  };

  const handleArriveMandi = async () => {
    try {
      const res = await fetch('/api/trips/arrive-mandi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_id: activeTrip?.trip_id })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTrip(data.trip);
        setLastActionMsg("🏛️ Arrived at Azadpur APMC Mandi. Ready for weighbridge sale settlement.");
        fetchActiveTrip();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Arrive mandi error:', err);
    }
  };

  const handleSettleSale = async () => {
    setSettlingSale(true);
    try {
      const res = await fetch('/api/mandi/settle-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trip_id: activeTrip?.trip_id,
          mandi_price: 5420,
          mandi_name: 'Azadpur APMC Mandi'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSettlementReport(data);
        fetchActiveTrip();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Mandi sale settlement error:', err);
    } finally {
      setSettlingSale(false);
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
          transporter_phone: '+91 94160 88219'
        })
      });
      if (res.ok) {
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
      if (action === 'APPROVE') {
        handleAdvanceStop(currentLot.lot_id);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Driver inspection error:', err);
      setLastActionMsg(err.message || `Failed to record ${action.toLowerCase()} action.`);
    } finally {
      setSubmitting(false);
    }
  };

  const isChecklistComplete = checks.stitched && checks.visual && checks.dryness;
  const isLotFinalized = currentLot?.status === 'LOADED_ON_TRUCK' || currentLot?.status === 'DEFERRED_FOR_SUN_DRYING' || currentLot?.status === 'SOLD_AND_SETTLED';

  const isTripAssigned = activeTrip?.status === 'ASSIGNED_TO_DRIVER';
  const isTripInProgress = activeTrip?.status === 'TRIP_IN_PROGRESS';
  const isAllLoaded = activeTrip?.status === 'ALL_STOPS_LOADED' || pool.capacity_percentage >= 99;
  const isArrivedMandi = activeTrip?.status === 'ARRIVED_AT_MANDI';
  const isTripSettled = activeTrip?.status === 'SETTLED_COMPLETED';

  return (
    <div className="space-y-6">
      {/* 1. Transporter Profile Banner (Single Seeded Vehicle: Bolero Maxi Truck HR-12-AE-8419) */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">Baljit Singh</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/30">
                  Assigned Transporter
                </span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-fg mt-0.5">
            Vehicle: <strong className="text-foreground">Mahindra Bolero Maxi Truck (HR-12-AE-8419)</strong> &bull; CLI: +91 94160 88219
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Live Open-Meteo Weather Badge */}
          {weather && (
            <div className="flex items-center gap-2.5 bg-secondary/80 px-3.5 py-2 rounded-xl border border-border text-xs">
              <CloudRain className={`w-4 h-4 ${weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN' ? 'text-amber-400 animate-pulse' : 'text-blue-400'}`} />
              <div>
                <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Corridor Weather</span>
                <span className="font-semibold text-foreground">
                  {weather.temperature_c}°C &bull; Rain: {weather.precipitation_probability_pct}%
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}>
                {weather.tarpaulin_protocol === 'MANDATORY_TIE_DOWN' ? 'Tie Down Tarpaulin' : 'Dry Transit Optimal'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-secondary/80 px-4 py-2.5 rounded-xl border border-border">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Assigned Corridor</span>
              <span className="text-xs font-bold text-foreground">Rohtak-Kalanaur ➔ Azadpur APMC Mandi</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. UPCOMING RIDE / ASSIGNED TRIP CARD (Updated when Admin Dispatches) */}
      {isTripAssigned && (
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-2 border-primary rounded-2xl p-6 shadow-xl space-y-4 animate-scale-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-primary/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md animate-bounce">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">New Ride Assigned by Mandi Admin!</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold">READY TO START</span>
                </div>
                <h3 className="text-lg font-black text-foreground mt-0.5">
                  Milk-Run Trip #{activeTrip.trip_id} &bull; Rohtak ➔ Azadpur Mandi
                </h3>
              </div>
            </div>

            <button
              onClick={handleStartTrip}
              disabled={startingTrip}
              className="py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-sm rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer btn-tactile shrink-0"
            >
              <Navigation className="w-4 h-4" />
              {startingTrip ? 'Starting Corridor Run...' : 'Start Trip / Make Trip Now 🚀'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-card rounded-xl border border-border">
              <span className="text-muted-fg block">Procuring Entity:</span>
              <span className="text-sm font-bold text-foreground">Shree Ram Flour Mill</span>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border">
              <span className="text-muted-fg block">Consignment Load:</span>
              <span className="text-sm font-bold text-primary font-mono">{activeTrip.total_quintals || 15.0} Qtl (30 Bags)</span>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border">
              <span className="text-muted-fg block">Scheduled Stops:</span>
              <span className="text-sm font-bold text-foreground font-mono">{activeTrip.stops?.length || 3} Farm-Gate Stops</span>
            </div>
            <div className="p-3 bg-card rounded-xl border border-border">
              <span className="text-muted-fg block">Est. Transporter Pay:</span>
              <span className="text-sm font-bold text-emerald-500 font-mono">+₹1,850 Forward</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. TRIP IN PROGRESS / ALL STOPS LOADED BANNER */}
      {isTripInProgress && (
        <div className="p-4 bg-blue-500/15 border border-blue-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping" />
            <div>
              <span className="font-bold text-blue-700 dark:text-blue-400 block text-sm">
                Trip #{activeTrip.trip_id} In Progress — Making Farm-Gate Pickups
              </span>
              <span className="text-muted-fg">
                Current Stop: <strong>Stop #{((activeTrip.current_stop_index || 0) + 1)} of {activeTrip.stops?.length || 3}</strong>. Complete digital inspection to load cargo.
              </span>
            </div>
          </div>

          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 font-mono font-bold rounded-lg border border-blue-500/30">
            EN ROUTE TO FARMERS
          </span>
        </div>
      )}

      {isAllLoaded && !isArrivedMandi && !isTripSettled && (
        <div className="p-5 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
            <div>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 block">
                All 3 Smallholder Lots Verified & 100% Loaded in Bolero Flatbed!
              </span>
              <span className="text-muted-fg">
                Consignment: 1,500 kg (30 gunny sacks). Flatbed is sealed. Proceed to Azadpur APMC Mandi Gate 4.
              </span>
            </div>
          </div>

          <button
            onClick={handleArriveMandi}
            className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer btn-tactile shrink-0"
          >
            <Building2 className="w-4 h-4" />
            Arrive at Azadpur APMC Mandi (Weighbridge) 🏛️
          </button>
        </div>
      )}

      {isArrivedMandi && !isTripSettled && (
        <div className="p-5 bg-primary/20 border-2 border-primary rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary shrink-0" />
            <div>
              <span className="text-sm font-extrabold text-foreground block">
                Arrived at Azadpur Mandi Gate 4 &bull; Electronic Weighbridge Ready
              </span>
              <span className="text-muted-fg">
                Click below to finalize weighbridge sale. Itemized payout receipts will be sent to farmers via @KhetOSSaathiBot.
              </span>
            </div>
          </div>

          <button
            onClick={handleSettleSale}
            disabled={settlingSale}
            className="py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer btn-tactile shrink-0"
          >
            <Send className="w-4 h-4" />
            {settlingSale ? 'Settling & Sending Telegram Alerts...' : 'Finalize Mandi Sale & Dispatch Telegram Receipts 💰'}
          </button>
        </div>
      )}

      {settlementReport && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Mandi Sale Finalized & Telegram Receipts Dispatched to Farmers!
            </span>
            <span className="font-mono text-muted-fg">Azadpur APMC Settlement</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {settlementReport.settlements?.map((s, idx) => (
              <div key={idx} className="p-3 bg-card rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between items-center font-bold">
                  <span>{s.farmer_name}</span>
                  <span className="text-primary font-mono">{s.quantity_quintals} Qtl ({s.bags} Bags)</span>
                </div>
                <div className="text-[11px] text-muted-fg space-y-0.5">
                  <div className="flex justify-between"><span>Gross Value:</span><span>₹{s.gross_value.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Delivery Freight:</span><span className="text-rose-500">-₹{s.delivery_freight}</span></div>
                  <div className="flex justify-between"><span>1% APMC Cess:</span><span className="text-rose-500">-₹{s.mandi_cess}</span></div>
                  <div className="flex justify-between"><span>Handling:</span><span className="text-rose-500">-₹{s.labor_charge}</span></div>
                </div>
                <div className="pt-1 border-t border-border flex justify-between font-bold text-sm">
                  <span>Net Payout Credited:</span>
                  <span className="text-emerald-500 font-mono">₹{s.net_payout.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
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
          1. Outbound Harvest Milk-Run (Rohtak ➔ Azadpur)
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

      {/* TAB 1: Outbound Harvest Run */}
      {activeRunTab === 'outbound' && (
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
                        lot.status === 'LOADED_ON_TRUCK' || lot.status === 'SOLD_AND_SETTLED' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                      }`}>
                        {lot.status === 'LOADED_ON_TRUCK' ? 'Loaded' : lot.status === 'SOLD_AND_SETTLED' ? 'Sold' : 'Pending'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Farm-Gate Quality Gatekeeper */}
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

                {isLotFinalized ? (
                  <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between gap-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <span className="font-bold text-emerald-400 text-sm block">Cargo Bay Loaded & Quality Verified</span>
                        <span className="text-[11px] text-muted-fg block mt-0.5">
                          All 3 quality criteria verified. Tamper-proof dispatch lock engaged.
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold text-xs border border-emerald-500/40 shrink-0">
                      ✓ LOCKED
                    </span>
                  </div>
                ) : (
                  <>
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

      {/* TAB 2: Reverse Backhaul Run */}
      {activeRunTab === 'backhaul' && (
        <div className="space-y-6">
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
                Payload: {backhaul?.return_cargo?.reduce((acc, i) => acc + (i.quantity_kg || 0), 0) || 1000} kg
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
                      <td className="py-3 px-3 text-muted-fg">{item.source || 'Central APMC Hub'}</td>
                      <td className="py-3 px-3 text-muted-fg">{item.destination}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{item.quantity_kg} kg ({item.bags || Math.round(item.quantity_kg / 50)} Bags)</td>
                      <td className="py-3 px-3">
                        {item.wholesale_rate_rs ? (
                          <span className="text-emerald-400 font-bold">Wholesale ₹{item.wholesale_rate_rs}/Qtl</span>
                        ) : item.subsidized_mrp_rs ? (
                          <span className="text-blue-400 font-bold">Subsidized MRP ₹{item.subsidized_mrp_rs}</span>
                        ) : (
                          <span className="text-emerald-400 font-bold">80% Cost Cut</span>
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
