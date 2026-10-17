import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Truck, ShieldAlert, Sparkles, Volume2, Upload, AlertCircle, CheckCircle2, Sprout, Play, Square } from 'lucide-react';
import { useRole } from '../../context/RoleContext';

export default function FarmerView({ state, onRefresh }) {
  const { activeRole } = useRole();
  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'rates' | 'advisory'
  const [prices, setPrices] = useState([]);
  const [advisoryInput, setAdvisoryInput] = useState('सरसों के पत्तों पर सफेद फफूंद (White Rust) और तना सड़न के लक्षण हैं।');
  const [advisoryResult, setAdvisoryResult] = useState(null);
  const [advising, setAdvising] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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

  useEffect(() => {
    fetchPrices();
  }, []);

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
  const lots = state?.lots || [];
  const ramuLot = lots.find(l => l.farmer_name?.includes('Ramu')) || {
    lot_id: 'LOT-ROH-904',
    farmer_name: 'Ramu Sharma',
    village: 'Bhalaut',
    khet_pin: 'HR-ROH-78G4',
    crop: 'Mustard',
    quantity_quintals: 4.0,
    bags_count: 8,
    status: pool.capacity_percentage >= 99 ? 'LOADED_ON_TRUCK' : 'PENDING_CORRIDOR_PICKUP',
    freight_share_rs: 640
  };

  return (
    <div className="space-y-6">
      {/* Farmer Profile Card & KhetPin Banner */}
      <div className="bg-card/80 backdrop-blur-sm border border-border/80 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <p className="text-xs text-muted-fg">Village: {activeRole.village} &bull; Phone: {activeRole.phone}</p>
        </div>

        {/* KhetPin Chip */}
        <div className="flex items-center gap-3 bg-secondary/80 px-4 py-2.5 rounded-xl border border-border">
          <MapPin className="w-5 h-5 text-primary shrink-0" />
          <div>
            <span className="text-[10px] text-muted-fg font-bold uppercase tracking-wider block">Farm-Gate Digital Pin</span>
            <span className="font-mono font-bold text-foreground text-sm tracking-wide">{activeRole.khetPin}</span>
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
          1. Active Truck Pool & Cargo Status
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'rates'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <span>📈</span>
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

      {/* TAB 1: Active Truck Pool Status */}
      {activeTab === 'pool' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Cargo Fill Progress Card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 md:col-span-2">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    Corridor Truck Pooling
                  </span>
                  <h4 className="text-base font-bold text-foreground mt-0.5">{pool.cluster_name || 'Rohtak-Kalanaur Corridor'}</h4>
                  <p className="text-xs text-muted-fg">{pool.transporter || 'Mahindra Bolero (HR-12-AE-8419)'}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">{pool.capacity_percentage || 73.3}%</span>
                  <span className="text-[10px] text-muted-fg block">Cargo Bay Filled</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      pool.capacity_percentage >= 99 ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(pool.capacity_percentage || 73.3, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-fg">
                  <span>Loaded: {pool.current_loaded_kg || 1100} kg ({pool.current_loaded_quintals || 11} Qtl)</span>
                  <span>Target: {pool.target_capacity_kg || 1500} kg (15 Quintals Max)</span>
                </div>
              </div>

              {/* Status Alert */}
              {pool.capacity_percentage >= 99 ? (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-400 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Pool 100% Full! Truck dispatch locked for Azadpur APMC Mandi. Pickup ETA: 25 mins.</span>
                </div>
              ) : (
                <div className="p-3 bg-primary/20 border border-primary/40 rounded-xl text-xs text-primary flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Waiting for final 4 Quintals. Dial <strong>1800-KHET-OS</strong> (/call) and press <strong>Key 2</strong> to dispatch!</span>
                </div>
              )}
            </div>

            {/* Ramu's Specific Lot Card */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-muted-fg uppercase tracking-wider block">My Declared Lot</span>
                <h4 className="text-xl font-black text-foreground mt-1">4.0 Quintals</h4>
                <p className="text-xs text-muted-fg">8 Standard 50kg Bags &bull; Mustard</p>

                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-fg">Status:</span>
                    <span className="font-bold text-primary">{ramuLot.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-fg">Pooled Freight Cost:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">₹{ramuLot.freight_share_rs || 640}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-fg">Solo Tempo Cost:</span>
                    <span className="text-rose-700 dark:text-rose-400 line-through font-semibold">₹2,100</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-fg">Net Freight Savings:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">+₹1,460 (69% saved)</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-muted-fg block italic">
                  ₹0 penalty guaranteed if lot deferred for moisture.
                </span>
              </div>
            </div>
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
                      {idx === 0 && <span className="text-primary">★</span>}
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
                className="py-2.5 px-5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-sm transition active:scale-95 flex items-center gap-2"
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
                  <span className="text-rose-700 dark:text-rose-400 font-bold block mb-1">❌ Predatory Branded Chemical</span>
                  <p className="text-foreground font-medium">{advisoryResult.branded_cocktail || 'Ridomil MZ / Proprietary Cocktails'}</p>
                  <p className="text-muted-fg text-[11px] mt-1">Average Cost: ₹1,200 per acre</p>
                </div>

                <div className="p-3 bg-card rounded-lg border border-border">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1">✅ ICAR Approved Generic Salt</span>
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
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
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
                          <span>Play Hindi Audio (gTTS)</span>
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
    </div>
  );
}
