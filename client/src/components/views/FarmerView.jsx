import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Truck, ShieldAlert, Sparkles, Volume2, Upload, 
  AlertCircle, CheckCircle2, Sprout, Play, Square, Plus, Minus, 
  X, Check, RefreshCw, Send, MessageSquare, TrendingUp, ShieldCheck
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function FarmerView({ state, onRefresh }) {
  const { activeRole, customPhone, setCustomPhone } = useRole();
  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'rates' | 'advisory'
  const [prices, setPrices] = useState([]);
  const [advisoryInput, setAdvisoryInput] = useState('सरसों के पत्तों पर सफेद फफूंद (White Rust) और तना सड़न के लक्षण हैं।');
  const [advisoryResult, setAdvisoryResult] = useState(null);
  const [advising, setAdvising] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Dynamic stock state
  const [activePhone, setActivePhone] = useState(customPhone || activeRole?.phone || '+91 98123 45099');
  const [farmerLots, setFarmerLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [updatingLotId, setUpdatingLotId] = useState(null);

  // New lot creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrop, setNewCrop] = useState('Mustard');
  const [newQuantity, setNewQuantity] = useState(4.0);
  const [creatingLot, setCreatingLot] = useState(false);

  // Telegram test alert state
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);

  const toggleAudio = () => {
    if (!advisoryResult?.audio_base64) return;
    if (isPlayingAudio && window.advisoryAudio) {
      window.advisoryAudio.pause();
      window.advisoryAudio.currentTime = 0;
      setIsPlayingAudio(false);
      return;
    }
    try {
      if (window.advisoryAudio) {
        window.advisoryAudio.pause();
      }
      const audio = new Audio("data:audio/mp3;base64," + advisoryResult.audio_base64);
      window.advisoryAudio = audio;
      setIsPlayingAudio(true);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(e => {
        console.warn("Audio playback blocked:", e);
        setIsPlayingAudio(false);
      });
    } catch (e) {
      console.warn("Audio error:", e);
      setIsPlayingAudio(false);
    }
  };

  const fetchFarmerLots = async () => {
    setLoadingLots(true);
    try {
      const res = await fetch(`/api/farmer/lots?phone=${encodeURIComponent(activePhone)}`);
      if (res.ok) {
        const data = await res.json();
        setFarmerLots(data.lots || []);
      }
    } catch (e) {
      console.warn('Failed to fetch farmer lots:', e);
    }
    setLoadingLots(false);
  };

  useEffect(() => {
    fetchPrices();
    fetchFarmerLots();
  }, [activePhone]);

  const handlePhoneSwitch = (phone) => {
    setActivePhone(phone);
    setCustomPhone(phone);
  };

  const handleUpdateQuantity = async (lotId, delta) => {
    setUpdatingLotId(lotId);
    try {
      const res = await fetch('/api/farmer/lot/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: lotId,
          delta_quintals: delta
        })
      });
      if (res.ok) {
        await fetchFarmerLots();
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Update lot error:', e);
    }
    setUpdatingLotId(null);
  };

  const handleDecision = async (lotId, decision) => {
    setUpdatingLotId(lotId);
    try {
      const res = await fetch('/api/farmer/lot/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lot_id: lotId,
          decision: decision
        })
      });
      if (res.ok) {
        await fetchFarmerLots();
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Decision error:', e);
    }
    setUpdatingLotId(null);
  };

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setCreatingLot(true);
    try {
      const res = await fetch('/api/farmer/lot/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          crop: newCrop,
          quantity_quintals: parseFloat(newQuantity)
        })
      });
      if (res.ok) {
        setShowCreateModal(false);
        await fetchFarmerLots();
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Create lot error:', e);
    }
    setCreatingLot(false);
  };

  const handleSendDualAlertTest = async () => {
    setSendingAlert(true);
    try {
      await fetch('/api/telegram/notify-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activePhone })
      });
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 3000);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.warn('Test alert failed:', e);
    }
    setSendingAlert(false);
  };

  const fetchPrices = async () => {
    try {
      const res = await fetch('/api/prices?crop=Mustard');
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setPrices(data.corridor_benchmarks || [
        { mandi: 'Azadpur APMC Mandi, Delhi', modal_price: 5420, min_price: 5200, max_price: 5650, arrival_today_tonnes: 140 },
        { mandi: 'Rohtak APMC Mandi, Haryana', modal_price: 5180, min_price: 4950, max_price: 5350, arrival_today_tonnes: 95 },
        { mandi: 'Najafgarh APMC Mandi, Delhi', modal_price: 5350, min_price: 5100, max_price: 5500, arrival_today_tonnes: 60 },
        { mandi: 'Village Local Trader Gate', modal_price: 4700, min_price: 4500, max_price: 4800, arrival_today_tonnes: 'Distress' }
      ]);
    } catch (err) {
      console.error('Failed to fetch mandi prices:', err);
    }
  };

  const handleRunAdvisory = async () => {
    setAdvising(true);
    try {
      const res = await fetch('/api/advisory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: 'Mustard',
          query: advisoryInput,
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      setAdvisoryResult(data);
      setAdvising(false);
    } catch (err) {
      console.error('Advisory query error:', err);
      setAdvising(false);
    }
  };

  const pool = state?.active_pool || {};
  const currentLots = farmerLots.length > 0 ? farmerLots : (state?.lots || []).filter(l => l.phone === activePhone);

  return (
    <div className="space-y-6">
      {/* Farmer Profile Card & Multi-Session Switcher */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{activeRole.name}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                Verified Smallholder
              </span>
            </div>
            <p className="text-xs text-muted-fg">Village: {activeRole.village} &bull; CLI: {activePhone}</p>
          </div>

          {/* KhetPin Chip & Telegram Sync */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-secondary/80 px-3.5 py-2 rounded-xl border border-border">
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="text-[9px] text-muted-fg font-bold uppercase tracking-wider block">Farm-Gate Pin</span>
                <span className="font-mono font-bold text-foreground text-xs">{activeRole.khetPin}</span>
              </div>
            </div>

            <button
              onClick={handleSendDualAlertTest}
              disabled={sendingAlert}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/25 transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{sendingAlert ? 'Sending...' : alertSuccess ? 'Sent ✓' : 'Dual Alert Test'}</span>
            </button>
          </div>
        </div>

        {/* Profile / Phone Presets Ribbon */}
        <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-fg text-[11px] font-semibold">Test Profile Phone CLI:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => handlePhoneSwitch('+91 98123 45099')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                activePhone === '+91 98123 45099'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-fg border-border hover:text-foreground'
              }`}
            >
              Ramu Sharma (+91 98123)
            </button>
            <button
              onClick={() => handlePhoneSwitch('+91 98991 22334')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                activePhone === '+91 98991 22334'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-fg border-border hover:text-foreground'
              }`}
            >
              Suresh Kumar (+91 98991)
            </button>
            <button
              onClick={() => handlePhoneSwitch('+91 97110 55443')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                activePhone === '+91 97110 55443'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary text-muted-fg border-border hover:text-foreground'
              }`}
            >
              Dinesh Chillar (+91 97110)
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('pool')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'pool'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Truck className="w-4 h-4" />
          1. Dynamic Stock & Pickup Pooling
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'rates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          2. Live Mandi Rates Benchmark
        </button>

        <button
          onClick={() => setActiveTab('advisory')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'advisory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          3. ICAR Chemical & Disease Doctor
        </button>
      </div>

      {/* TAB 1: Dynamic Stock Management & Truck Pool */}
      {activeTab === 'pool' && (
        <div className="space-y-6">
          {/* Top Corridor Status & Truck Progress */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Corridor Pooling Manifest
                </span>
                <h4 className="text-base font-bold text-foreground mt-0.5">{pool.cluster_name || 'Rohtak-Kalanaur Corridor'}</h4>
                <p className="text-xs text-muted-fg">{pool.transporter || 'Mahindra Bolero (HR-12-AE-8419)'}</p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Declare Harvest Lot</span>
                </button>

                <div className="text-right">
                  <span className="text-2xl font-black text-primary font-mono">{pool.capacity_percentage || 73.3}%</span>
                  <span className="text-[10px] text-muted-fg block">Cargo Bay Filled</span>
                </div>
              </div>
            </div>

            {/* Visual Fill Gauge */}
            <div className="space-y-1.5">
              <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pool.capacity_percentage >= 99 ? 'bg-emerald-500 shadow-glow' : 'bg-primary'
                  }`}
                  style={{ width: `${Math.min(pool.capacity_percentage || 73.3, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-fg">
                <span>Loaded: {pool.current_loaded_kg || 1100} kg ({pool.current_loaded_quintals || 11} Qtl)</span>
                <span>Target: {pool.target_capacity_kg || 1500} kg (15 Quintals Max)</span>
              </div>
            </div>
          </div>

          {/* Farmer's Dynamic Lots List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wider">
                My Active Harvest Lots ({currentLots.length})
              </h4>
              <span className="text-[11px] text-muted-fg">
                Adjust stock in real-time or accept/reject scheduled pickup
              </span>
            </div>

            {currentLots.length === 0 ? (
              <div className="p-8 text-center bg-card border border-border rounded-2xl space-y-3">
                <AlertCircle className="w-8 h-8 text-muted-fg mx-auto opacity-50" />
                <p className="text-xs text-muted-fg">No active lots recorded for this phone number.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl"
                >
                  Declare First Harvest Lot
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLots.map((lot) => {
                  const isUpdating = updatingLotId === lot.lot_id;
                  const isAccepted = lot.status === 'ACCEPTED' || lot.status === 'LOADED_ON_TRUCK';
                  const isRejected = lot.status === 'REJECTED_BY_FARMER';
                  const soloCost = 2100;
                  const freight = lot.freight_share_rs || (lot.quantity_quintals * 160);
                  const savings = soloCost - freight;

                  return (
                    <div 
                      key={lot.lot_id}
                      className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm relative overflow-hidden"
                    >
                      {/* Top Lot Meta */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                            {lot.lot_id}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isAccepted 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {lot.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline pt-1">
                          <div>
                            <h4 className="text-xl font-black text-foreground">{lot.crop}</h4>
                            <p className="text-xs text-muted-fg">KhetPin: {lot.khet_pin || 'HR-ROH-78G4'}</p>
                          </div>

                          <div className="text-right">
                            <span className="text-2xl font-black text-foreground font-mono">
                              {lot.quantity_quintals} Qtl
                            </span>
                            <span className="text-[11px] text-muted-fg block">
                              {lot.bags_count || (lot.quantity_quintals * 2)} Discrete 50kg Bags
                            </span>
                          </div>
                        </div>

                        {/* Interactive Quantity Stepper */}
                        <div className="p-3 bg-secondary/70 rounded-xl border border-border space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-fg font-semibold">Modify Lot Stock:</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(lot.lot_id, -1.0)}
                                disabled={isUpdating || lot.quantity_quintals <= 1.0}
                                title="Decrease by 1 Quintal"
                                className="w-7 h-7 rounded-lg bg-card hover:bg-secondary border border-border text-foreground font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-xs px-2 text-foreground">
                                {lot.quantity_quintals} Qtl
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(lot.lot_id, 1.0)}
                                disabled={isUpdating || lot.quantity_quintals >= 15.0}
                                title="Increase by 1 Quintal"
                                className="w-7 h-7 rounded-lg bg-card hover:bg-secondary border border-border text-foreground font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/60 text-[11px]">
                            <div>
                              <span className="text-muted-fg block">Pooled Freight:</span>
                              <span className="font-mono font-bold text-emerald-400">₹{freight.toFixed(0)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-fg block">Net Savings vs Solo:</span>
                              <span className="font-mono font-bold text-emerald-400">+₹{savings.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pickup Decision Actions */}
                      <div className="space-y-2 pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDecision(lot.lot_id, 'ACCEPT')}
                            disabled={isUpdating || isAccepted}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                              isAccepted 
                                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isAccepted ? 'Pickup Locked ✓' : 'Accept Pickup'}</span>
                          </button>

                          <button
                            onClick={() => handleDecision(lot.lot_id, 'REJECT')}
                            disabled={isUpdating || isRejected}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                              isRejected
                                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40 cursor-default'
                                : 'bg-secondary hover:bg-rose-500/20 text-muted-fg hover:text-rose-400 border border-border cursor-pointer'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isRejected ? 'Rejected (₹0)' : 'Reject'}</span>
                          </button>
                        </div>

                        <span className="text-[10px] text-muted-fg block text-center italic">
                          ₹0 penalty guaranteed under ICAR quality protocol.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Live Mandi Rates Benchmark */}
      {activeTab === 'rates' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h4 className="text-lg font-bold text-foreground">APMC Mandi Price Real-Time Feed</h4>
              <p className="text-xs text-muted-fg">Daily Agmarknet auction rates vs predatory farm-gate middleman offers.</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30">
              ● Live Auction Benchmarks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-fg uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Market / Mandi Destination</th>
                  <th className="py-3 px-4">Modal Rate (₹/Qtl)</th>
                  <th className="py-3 px-4">Price Range (Min - Max)</th>
                  <th className="py-3 px-4">Daily Volume</th>
                  <th className="py-3 px-4">Farmer Realization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {prices.map((p, idx) => (
                  <tr key={idx} className={idx === 0 ? 'bg-primary/10 font-bold' : ''}>
                    <td className="py-3 px-4 text-foreground font-semibold flex items-center gap-2">
                      {idx === 0 && <span className="text-primary font-bold">★</span>}
                      {p.mandi}
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-primary">₹{p.modal_price}</td>
                    <td className="py-3 px-4 font-mono text-muted-fg">₹{p.min_price} - ₹{p.max_price}</td>
                    <td className="py-3 px-4 text-muted-fg">{p.arrival_today_tonnes} {typeof p.arrival_today_tonnes === 'number' ? 'Tonnes' : ''}</td>
                    <td className="py-3 px-4">
                      {p.modal_price >= 5200 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">+₹720/Qtl over local trader</span>
                      ) : p.modal_price <= 4800 ? (
                        <span className="text-rose-700 dark:text-rose-400 font-bold">Distress Sale</span>
                      ) : (
                        <span className="text-muted-fg">Fair</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ICAR Chemical Advisory */}
      {activeTab === 'advisory' && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                ICAR Generic Chemical Advisory Engine
              </span>
              <h4 className="text-lg font-bold text-foreground mt-0.5">Plant Disease & Branded Cocktail Replacement</h4>
              <p className="text-xs text-muted-fg">Replaces predatory ₹1,000 branded cocktails with ICAR-approved ₹200 generic chemical salts.</p>
            </div>
            <Sparkles className="w-6 h-6 text-primary" />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-fg block">
              Describe Crop Symptoms or Paste Leaf Condition (Hindi / Vernacular supported):
            </label>
            <textarea
              rows={3}
              value={advisoryInput}
              onChange={(e) => setAdvisoryInput(e.target.value)}
              className="w-full bg-secondary/80 border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:border-primary transition"
              placeholder="e.g. Mustard leaves have white powdery pustules and yellowing..."
            />
            <div className="flex justify-end">
              <button
                onClick={handleRunAdvisory}
                disabled={advising}
                className="py-2.5 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {advising ? 'Querying ICAR Database...' : 'Run ICAR Generic Prescription ⚡'}
              </button>
            </div>
          </div>

          {/* Advisory Result Display */}
          {advisoryResult && (
            <div className="p-5 bg-secondary/70 border border-border rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Diagnosis: {typeof advisoryResult.diagnosis === 'object' 
                    ? (advisoryResult.diagnosis?.disease || 'White Rust (Albugo candida)') 
                    : (advisoryResult.diagnosis || 'White Rust (Albugo candida)')}
                </span>
                <span className="text-xs text-muted-fg font-mono">
                  {typeof advisoryResult.diagnosis === 'object' && advisoryResult.diagnosis?.confidence 
                    ? `${Math.round(advisoryResult.diagnosis.confidence * 100)}% Confidence` 
                    : 'ICAR Protocol Ref: #ICAR-MUST-2024'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-rose-700 dark:text-rose-400 font-bold block mb-1">Branded Commercial Chemical</span>
                  <p className="text-foreground font-medium">{advisoryResult.branded_cocktail || 'Ridomil MZ / Proprietary Cocktails'}</p>
                  <p className="text-muted-fg text-[11px] mt-1">Average Cost: ₹1,200 per acre</p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1">ICAR Approved Generic Salt</span>
                  <p className="text-foreground font-medium">
                    {advisoryResult.prescription?.chemical_salt || advisoryResult.generic_chemical || 'Mancozeb 75% WP'}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] mt-1">Direct Generic Cost: ₹240 per acre (80% Savings)</p>
                </div>
              </div>

              <div className="p-3 bg-card rounded-lg border border-border text-xs space-y-1">
                <span className="font-semibold text-primary block">Official ICAR Dosage & Spray Guidance:</span>
                <p className="text-muted-fg">
                  {advisoryResult.prescription?.dosage_hi || advisoryResult.prescription?.dosage || advisoryResult.dosage || 'Dissolve 2.0g Mancozeb per 1 Liter of clean water (approx. 500g in 200L water per acre). Spray during calm morning hours with standard knapsack flat-fan nozzle.'}
                </p>
              </div>

              {(advisoryResult.audio_prescription_hi || advisoryResult.spoken_text_hi || advisoryResult.audio_base64) && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-primary/10 rounded-xl border border-primary/25">
                  <div className="flex items-center gap-2.5 text-xs text-foreground">
                    <Volume2 className={`w-4 h-4 text-primary shrink-0 ${isPlayingAudio ? 'animate-bounce' : 'animate-pulse'}`} />
                    <div>
                      <span className="font-semibold text-primary block">Vernacular Voice Note (ICAR Prescription)</span>
                      <span className="text-muted-fg text-[11px] line-clamp-1">{advisoryResult.spoken_text_hi || 'Audio prescription ready in Hindi'}</span>
                    </div>
                  </div>
                  {advisoryResult.audio_base64 && (
                    <button
                      onClick={toggleAudio}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        isPlayingAudio 
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Audio</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play Hindi Audio</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Declare New Harvest Lot */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Declare New Harvest Lot
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-muted-fg hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLot} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-fg block">Farmer Phone CLI</label>
                <input
                  type="text"
                  disabled
                  value={activePhone}
                  className="w-full bg-secondary/80 border border-border rounded-xl p-2.5 font-mono text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-fg block">Select Harvest Crop</label>
                <select
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value)}
                  className="w-full bg-secondary/80 border border-border rounded-xl p-2.5 text-foreground font-semibold focus:outline-none focus:border-primary"
                >
                  <option value="Mustard">Mustard (सरसों)</option>
                  <option value="Wheat">Wheat (गेहूं)</option>
                  <option value="Gram">Gram (चना)</option>
                  <option value="Barley">Barley (जौ)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-fg block">
                  Quantity in Quintals (1 Qtl = 2 &times; 50kg Bags)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="15"
                    step="0.5"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="flex-1 bg-secondary/80 border border-border rounded-xl p-2.5 font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="font-bold text-foreground">{parseFloat(newQuantity || 0) * 2} Bags</span>
                </div>
              </div>

              <div className="p-3 bg-secondary/60 rounded-xl border border-border space-y-1 text-[11px] text-muted-fg">
                <span className="font-semibold text-foreground block">Instant Freight Estimation:</span>
                <p>Pooled Mahindra Bolero Share: <strong className="text-emerald-400">₹{(parseFloat(newQuantity || 0) * 160).toFixed(0)}</strong> (vs Solo Tempo ₹2,100)</p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-secondary text-muted-fg hover:text-foreground font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingLot}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm"
                >
                  {creatingLot ? 'Adding Lot...' : 'Confirm & Add to Pool'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
