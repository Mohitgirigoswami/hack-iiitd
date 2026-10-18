import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Phone, Truck, ShieldAlert, Sparkles, Volume2, Upload, 
  AlertCircle, CheckCircle2, Sprout, Play, Square, Plus, Minus, 
  X, Check, RefreshCw, Send, MessageSquare, TrendingUp, ShieldCheck, Bot,
  Droplets, Zap, CloudRain, Camera, Image
} from 'lucide-react';
import { useRole } from '../../context/RoleContext';
import TelegramBotSimulator from '../TelegramBotSimulator';

export default function FarmerView({ state, onRefresh }) {
  const { activeRole, customPhone, setCustomPhone } = useRole();
  const [activeTab, setActiveTab] = useState('pool'); // 'pool' | 'rates' | 'advisory' | 'telegram'
  const [prices, setPrices] = useState([]);
  const [advisoryInput, setAdvisoryInput] = useState('सरसों के पत्तों पर सफेद फफूंद (White Rust) और तना सड़न के लक्षण हैं।');
  const [advisoryResult, setAdvisoryResult] = useState(null);
  const [advising, setAdvising] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Smart Tubewell & Irrigation Advisor state
  const [tubewellData, setTubewellData] = useState(null);
  const [tubewellCrop, setTubewellCrop] = useState('Mustard');
  const [loadingTubewell, setLoadingTubewell] = useState(false);
  const [playingTubewellAudio, setPlayingTubewellAudio] = useState(false);

  // Crop Doctor & ICAR Registry catalog state
  const [doctorCrop, setDoctorCrop] = useState('Mustard');
  const [catalogData, setCatalogData] = useState(null);
  const [selectedDiseaseKey, setSelectedDiseaseKey] = useState('Aphids / Mahu');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Leaf photo scanner state
  const [selectedLeafSample, setSelectedLeafSample] = useState(null);
  const [leafFilePreview, setLeafFilePreview] = useState(null);
  const leafUploadRef = useRef(null);

  // Dynamic stock state
  const [activePhone, setActivePhone] = useState(customPhone || activeRole?.phone || '+91 98123 45099');
  const [farmerLots, setFarmerLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [updatingLotId, setUpdatingLotId] = useState(null);

  // New lot creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCrop, setNewCrop] = useState('Mustard');
  const [newBoriCount, setNewBoriCount] = useState(8); // 8 bags = 4.0 Quintals
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

  const fetchTubewellAdvisory = async (crop = tubewellCrop) => {
    setLoadingTubewell(true);
    try {
      const res = await fetch(`/api/advisory/tubewell?crop=${encodeURIComponent(crop)}&village=${encodeURIComponent(activeRole?.village || 'Bhalaut')}`);
      if (res.ok) {
        const data = await res.json();
        setTubewellData(data);
      }
    } catch (e) {
      console.warn('Tubewell fetch error:', e);
    }
    setLoadingTubewell(false);
  };

  const toggleTubewellAudio = () => {
    if (!tubewellData?.audio_base64) return;
    if (playingTubewellAudio && window.khetosTubewellAudio) {
      window.khetosTubewellAudio.pause();
      window.khetosTubewellAudio.currentTime = 0;
      setPlayingTubewellAudio(false);
      return;
    }
    try {
      if (window.khetosTubewellAudio) {
        window.khetosTubewellAudio.pause();
      }
      const audio = new Audio("data:audio/mp3;base64," + tubewellData.audio_base64);
      window.khetosTubewellAudio = audio;
      setPlayingTubewellAudio(true);
      audio.onended = () => setPlayingTubewellAudio(false);
      audio.onerror = () => setPlayingTubewellAudio(false);
      audio.play().catch(e => {
        console.warn("Tubewell audio playback blocked:", e);
        setPlayingTubewellAudio(false);
      });
    } catch (e) {
      console.warn("Tubewell audio error:", e);
      setPlayingTubewellAudio(false);
    }
  };

  const handleTubewellCropChange = (crop) => {
    setTubewellCrop(crop);
    fetchTubewellAdvisory(crop);
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

  const fetchCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const res = await fetch('/api/advisory/catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalogData(data.catalog || {});
      }
    } catch (e) {
      console.warn('Catalog fetch error:', e);
    }
    setLoadingCatalog(false);
  };

  const handleSelectCatalogDisease = async (crop, diseaseKey) => {
    setSelectedDiseaseKey(diseaseKey);
    setAdvising(true);
    try {
      const res = await fetch('/api/advisory/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crop, disease: diseaseKey })
      });
      if (res.ok) {
        const data = await res.json();
        setAdvisoryResult(data);
      }
    } catch (e) {
      console.warn('Prescribe error:', e);
    }
    setAdvising(false);
  };

  useEffect(() => {
    fetchPrices();
    fetchFarmerLots();
    fetchTubewellAdvisory(tubewellCrop);
    fetchCatalog();
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
      const quintals = Number((newBoriCount * 0.5).toFixed(1));
      const res = await fetch('/api/farmer/lot/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: activePhone,
          crop: newCrop,
          quantity_quintals: quintals
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

  const handleLeafSampleClick = (crop, disease, query, imgUrl) => {
    setSelectedLeafSample(disease);
    setLeafFilePreview(imgUrl);
    setAdvisoryInput(query);
    handleRunAdvisory(query, crop);
  };

  const handleLeafUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target.result;
      setLeafFilePreview(b64);
      setSelectedLeafSample(file.name);
      handleRunAdvisory(
        `AI Autonomous Vision Leaf Scan for ${file.name}. Identify crop and disease directly from leaf image.`,
        null,
        b64
      );
    };
    reader.readAsDataURL(file);
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

  const handleRunAdvisory = async (customQuery, customCrop, customImage) => {
    setAdvising(true);
    try {
      const q = typeof customQuery === 'string' ? customQuery : advisoryInput;
      const c = customCrop !== undefined ? customCrop : null;
      const payload = { query: q };
      if (c) payload.crop = c;
      if (customImage) payload.image = customImage;

      const res = await fetch('/api/advisory/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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

        <button
          onClick={() => setActiveTab('telegram')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'telegram'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-blue-400" />
          4. Telegram Vernacular Bot
          <span className="text-[10px] bg-blue-500/15 text-blue-400 px-1.5 py-0.2 rounded font-bold border border-blue-500/30">
            Interactive
          </span>
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

            {/* Scheduled Agricultural Milk-Run Corridor & Route Timeline */}
            <div className="mt-4 pt-3.5 border-t border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-foreground">
                    कृषि मिल्क-रन रूट (Scheduled Agricultural Milk-Run Corridor)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                    कट-ऑफ: आज शाम 6:00 बजे
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    प्रस्थान: कल सुबह 07:00 बजे
                  </span>
                </div>
              </div>

              {/* 3-Stop Milk-Run Route Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2.5 bg-secondary/70 border border-border rounded-xl">
                  <div className="flex items-center justify-between text-muted-fg text-[10px]">
                    <span className="font-semibold">Stop #1 (07:15 AM)</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">✓ 5.0 Qtl</span>
                  </div>
                  <span className="font-bold text-foreground block mt-0.5">दिनेश छिल्लर</span>
                  <span className="text-[10px] text-muted-fg">Kalanaur &bull; 10 कट्टे लोड</span>
                </div>

                <div className="p-2.5 bg-secondary/70 border border-border rounded-xl">
                  <div className="flex items-center justify-between text-muted-fg text-[10px]">
                    <span className="font-semibold">Stop #2 (08:00 AM)</span>
                    <span className="text-emerald-500 dark:text-emerald-400 font-mono font-bold">✓ 6.0 Qtl</span>
                  </div>
                  <span className="font-bold text-foreground block mt-0.5">सुरेश कुमार</span>
                  <span className="text-[10px] text-muted-fg">Bhalaut &bull; 12 कट्टे लोड</span>
                </div>

                <div className="p-2.5 bg-primary/15 border border-primary/40 rounded-xl relative overflow-hidden shadow-sm">
                  <span className="absolute top-1 right-1 text-[8px] font-bold px-1 rounded bg-primary text-primary-foreground">
                    आपका स्लॉट
                  </span>
                  <div className="flex items-center justify-between text-primary text-[10px]">
                    <span className="font-bold">Stop #3 (खेत पिकअप)</span>
                  </div>
                  <span className="font-bold text-foreground block mt-0.5">{activeRole?.name || 'रामू शर्मा'}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">कल सुबह 08:45 - 09:15 AM</span>
                </div>

                <div className="p-2.5 bg-secondary/70 border border-border rounded-xl">
                  <div className="flex items-center justify-between text-muted-fg text-[10px]">
                    <span className="font-semibold">Final APMC Mandi</span>
                    <span className="text-sky-500 dark:text-sky-400 font-mono font-bold">10:45 AM</span>
                  </div>
                  <span className="font-bold text-foreground block mt-0.5">आज़ादपुर APMC मंडी</span>
                  <span className="text-[10px] text-muted-fg">Gate #2 नीलामी पूर्व</span>
                </div>
              </div>
            </div>
          </div>

          {/* Smart Tubewell & Irrigation Advisor Card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Smart Tubewell & Irrigation Advisor (आज ट्यूबवेल कितनी देर चलाएं?)
                  </h4>
                  <p className="text-xs text-muted-fg">
                    ICAR Crop Water Model &bull; Dynamic Rain Forecast &bull; Rural 3-Phase Electricity Clock
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {tubewellData?.audio_base64 && (
                  <button
                    onClick={toggleTubewellAudio}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                      playingTubewellAudio
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    <Volume2 className={`w-3.5 h-3.5 ${playingTubewellAudio ? 'animate-bounce' : 'animate-pulse'}`} />
                    <span>{playingTubewellAudio ? 'Stop Audio' : 'सुनें हिंदी में'}</span>
                  </button>
                )}
                <button
                  onClick={() => fetchTubewellAdvisory(tubewellCrop)}
                  disabled={loadingTubewell}
                  title="Refresh Advisory"
                  className="p-1.5 rounded-lg bg-secondary border border-border text-muted-fg hover:text-foreground transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingTubewell ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Crop Selector Ribbon for Irrigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-muted-fg shrink-0">फसल चुनें:</span>
              {[
                { key: 'Mustard', label: 'सरसों (Mustard)' },
                { key: 'Wheat', label: 'गेहूँ (Wheat)' },
                { key: 'Potato', label: 'आलू (Potato)' },
                { key: 'Paddy', label: 'धान (Paddy)' },
                { key: 'Gram', label: 'चना (Gram)' }
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => handleTubewellCropChange(c.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition shrink-0 ${
                    tubewellCrop === c.key
                      ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                      : 'bg-secondary text-muted-fg border-border hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Advisory Result Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 bg-secondary/80 border border-border rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">
                  अनुशंसित मोटर समय
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-black font-mono ${
                    (tubewellData?.hours_recommended || 0) > 0 ? 'text-sky-400' : 'text-emerald-400'
                  }`}>
                    {tubewellData ? `${tubewellData.hours_recommended} घंटे` : '2.0 घंटे'}
                  </span>
                  <span className="text-[11px] text-muted-fg">
                    {(tubewellData?.hours_recommended || 0) > 0 ? `(~${tubewellData?.water_requirement_mm || 40}mm जल स्तर)` : '0mm जरूरी'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground mt-1">
                  {tubewellData?.headline_hi || 'आज 2.0 घंटे ट्यूबवेल चलाएं'}
                </p>
                <p className="text-[11px] text-muted-fg">
                  {tubewellData?.reason_hi || 'मिट्टी में नमी है और अगले 24 घंटे में बारिश नहीं है।'}
                </p>
              </div>

              <div className="p-3.5 bg-secondary/80 border border-border rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">
                  ग्रामीण 3-फेज बिजली रोस्टर
                </span>
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{tubewellData?.power_roster?.active_slot || '06:00 - 12:00 (Day Batch 1) Active'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-fg">
                  <CloudRain className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>बारिश अनुमान: {tubewellData?.weather_forecast?.rainfall_expected_mm || 0}mm ({tubewellData?.weather_forecast?.rain_probability_pct || 0}% संभावना)</span>
                </div>
                <span className="text-[10px] text-muted-fg block pt-1 border-t border-border/60">
                  {tubewellData?.power_roster?.next_slot || 'अगला स्लॉट: 22:00 - 04:00 (रात)'}
                </span>
              </div>

              <div className="p-3.5 bg-secondary/80 border border-border rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-muted-fg uppercase tracking-wider block">
                  पर्यावरण व लागत बचत
                </span>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <Sprout className="w-4 h-4 shrink-0" />
                  <span>~{tubewellData?.groundwater_saved_liters?.toLocaleString() || '18,000'}L भूजल बचत</span>
                </div>
                <p className="text-[11px] text-muted-fg">
                  बिजली बचत: ~{tubewellData?.electricity_units_saved_kwh || 7.2} kWh यूनिट्स
                </p>
                <div className="text-[10px] text-muted-fg font-mono pt-1 border-t border-border/60">
                  मिट्टी: {tubewellData?.soil_type || 'चिकनी दोमट (Clay Loam)'}
                </div>
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
                  const isLockedOnTruck = lot.status === 'LOADED_ON_TRUCK';
                  const isDeferred = lot.status === 'DEFERRED_FOR_SUN_DRYING';
                  const isAccepted = lot.status === 'ACCEPTED' || isLockedOnTruck;
                  const isRejected = lot.status === 'REJECTED_BY_FARMER';
                  const soloCost = 2100;
                  const formattedQty = Number(lot.quantity_quintals || 0).toFixed(1);
                  const bagsCount = lot.bags_count || Math.round(Number(lot.quantity_quintals || 0) * 2);
                  const freight = lot.freight_share_rs || (Number(lot.quantity_quintals || 0) * 160);
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
                            isLockedOnTruck
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isDeferred
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isAccepted 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isRejected
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {isLockedOnTruck ? '🔒 LOADED ON TRUCK' : isDeferred ? '🔒 DEFERRED' : lot.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-baseline pt-1">
                          <div>
                            <h4 className="text-xl font-black text-foreground">{lot.crop}</h4>
                            <p className="text-xs text-muted-fg">KhetPin: {lot.khet_pin || 'HR-ROH-78G4'}</p>
                          </div>

                          <div className="text-right">
                            <span className="text-2xl font-black text-foreground font-mono">
                              {formattedQty} Qtl
                            </span>
                            <span className="text-[11px] text-muted-fg block">
                              {bagsCount} Discrete 50kg Bags
                            </span>
                          </div>
                        </div>

                        {/* Interactive Quantity Stepper */}
                        <div className="p-3 bg-secondary/70 rounded-xl border border-border space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-fg font-semibold">
                              {isLockedOnTruck ? 'Lot Locked (On Truck):' : isDeferred ? 'Lot Locked (Deferred):' : 'Modify Lot Stock:'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateQuantity(lot.lot_id, -1.0)}
                                disabled={isUpdating || isLockedOnTruck || isDeferred || Number(lot.quantity_quintals || 0) <= 1.0}
                                title={isLockedOnTruck ? "Lot already loaded on truck. Locked." : "Decrease by 1 Quintal"}
                                className="w-7 h-7 rounded-lg bg-card hover:bg-secondary border border-border text-foreground font-bold flex items-center justify-center transition active:scale-95 disabled:opacity-40"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-mono font-bold text-xs px-2 text-foreground">
                                {formattedQty} Qtl
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(lot.lot_id, 1.0)}
                                disabled={isUpdating || isLockedOnTruck || isDeferred || Number(lot.quantity_quintals || 0) >= 15.0}
                                title={isLockedOnTruck ? "Lot already loaded on truck. Locked." : "Increase by 1 Quintal"}
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
                            disabled={isUpdating || isAccepted || isLockedOnTruck}
                            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                              isLockedOnTruck
                                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
                                : isAccepted 
                                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isLockedOnTruck ? 'Cargo Bay Loaded 🔒' : isAccepted ? 'Pickup Locked ✓' : 'Accept Pickup'}</span>
                          </button>

                          <button
                            onClick={() => handleDecision(lot.lot_id, 'REJECT')}
                            disabled={isUpdating || isRejected || isLockedOnTruck}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 ${
                              isLockedOnTruck
                                ? 'bg-secondary/40 text-muted-fg/40 border border-border/40 cursor-not-allowed'
                                : isRejected
                                ? 'bg-rose-600/30 text-rose-400 border border-rose-500/40 cursor-default'
                                : 'bg-secondary hover:bg-rose-500/20 text-muted-fg hover:text-rose-400 border border-border cursor-pointer'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>{isRejected ? 'Rejected (₹0)' : 'Reject'}</span>
                          </button>
                        </div>

                        <span className="text-[10px] text-muted-fg block text-center italic">
                          {isLockedOnTruck ? '🔒 Bolero cargo bay verified and loaded by driver.' : '₹0 penalty guaranteed under ICAR quality protocol.'}
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

          {/* Multi-Crop Agronomic Doctor & Pesticide Advisor (5 Crops & Full ICAR Catalog) */}
          <div className="p-4 bg-secondary/80 border border-border rounded-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-emerald-500" />
                  ICAR बहु-फसल सुरक्षा व कीटनाशक डॉक्टर (5 Crops Protection)
                </span>
                <p className="text-[11px] text-muted-fg mt-0.5">
                  फसल व बीमारी चुनें — पाएं असली टेक्निकल साल्ट, 15 लीटर ढोलकी नाप, जैविक विकल्प व 80% बचत!
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                100% Non-Commercial ICAR
              </span>
            </div>

            {/* 5 Crop Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {[
                { key: 'Mustard', label: '🌿 सरसों (Mustard)' },
                { key: 'Wheat', label: '🌾 गेहूँ (Wheat)' },
                { key: 'Potato', label: '🥔 आलू (Potato)' },
                { key: 'Paddy', label: '🌾 धान (Paddy)' },
                { key: 'Gram', label: '🌱 चना (Gram)' }
              ].map((c) => (
                <button
                  key={c.key}
                  onClick={() => {
                    setDoctorCrop(c.key);
                    const diseases = catalogData?.[c.key] || {};
                    const firstKey = Object.keys(diseases)[0];
                    if (firstKey) handleSelectCatalogDisease(c.key, firstKey);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                    doctorCrop === c.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card hover:bg-secondary text-muted-fg border border-border'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Registered Pest / Disease Chips for the selected crop */}
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(catalogData?.[doctorCrop] || {
                'Aphids / Mahu': { name_hi: 'माहू / चेपा कीट (Aphids)', type: 'pest', savings_pct: 79 },
                'White Rust': { name_hi: 'सफेद रतुआ (White Rust)', type: 'fungal', savings_pct: 69 },
                'Alternaria Blight': { name_hi: 'अल्टरनेरिया झुलसा', type: 'fungal', savings_pct: 64 },
                'Painted Bug': { name_hi: 'चितकबरा कीड़ा', type: 'pest', savings_pct: 63 }
              }).map(([dKey, dVal]) => {
                const isSelected = selectedDiseaseKey === dKey;
                const isPest = dVal.type === 'pest';
                return (
                  <button
                    key={dKey}
                    onClick={() => handleSelectCatalogDisease(doctorCrop, dKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-500/30'
                        : 'bg-card hover:bg-secondary text-foreground border border-border'
                    }`}
                  >
                    <span>{isPest ? '🐛' : '🦠'}</span>
                    <span>{dVal.name_hi || dKey}</span>
                    <span className="text-[10px] opacity-75 font-mono">({dVal.savings_pct || 75}% बचत)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preset Leaf Pathology Samples & Camera Upload */}
          <div className="p-4 bg-secondary/80 border border-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-primary" />
                फसल पत्ती रोग स्कैनर (Leaf Photo Pathology Scanner)
              </span>
              <span className="text-[10px] text-muted-fg font-mono">ICAR Vision Model</span>
            </div>

            <p className="text-xs text-muted-fg">
              बीमार पत्ती का नमूना चुनें या अपने कैमरे / फोन से पत्ती की फोटो अपलोड करें:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                {
                  crop: 'Mustard',
                  disease: 'White Rust (सफेद रतुआ)',
                  latin: 'Albugo candida',
                  symptom: 'सरसों के पत्तों की निचली सतह पर सफेद उभरे हुए छाले (white pustules) और तना मुड़ना।',
                  img: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=400&auto=format&fit=crop&q=80'
                },
                {
                  crop: 'Wheat',
                  disease: 'Yellow Rust (पीला रतुआ)',
                  latin: 'Puccinia striiformis',
                  symptom: 'गेहूँ के पत्तों पर समानांतर पीली धारियां और पीले पाउडर जैसे बीजाणु (yellow stripe pustules)।',
                  img: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&auto=format&fit=crop&q=80'
                },
                {
                  crop: 'Potato',
                  disease: 'Late Blight (आलू झुलसा)',
                  latin: 'Phytophthora infestans',
                  symptom: 'आलू के पत्तों पर भूरे-काले पानीदार धब्बे और निचली सतह पर सफेद फफूंद (water-soaked lesions)।',
                  img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80'
                },
                {
                  crop: 'Paddy',
                  disease: 'Brown Planthopper (भूरा फुदका)',
                  latin: 'Nilaparvata lugens',
                  symptom: 'धान के पौधों के आधार से रस चूसना, पत्तियां पीली पड़कर सूखना (हॉपर बर्न - Hopper Burn लक्षण)।',
                  img: 'https://images.unsplash.com/photo-1536939459926-301728717817?w=400&auto=format&fit=crop&q=80'
                },
                {
                  crop: 'Gram',
                  disease: 'Pod Borer (चना इल्ली)',
                  latin: 'Helicoverpa armigera',
                  symptom: 'चने के डंठल और फली में गोल छेद करके दानों को खाना, पत्तियों को कुतरना (हरा-भूरा कैटरपिलर)।',
                  img: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?w=400&auto=format&fit=crop&q=80'
                }
              ].map((sample) => (
                <button
                  key={sample.disease}
                  onClick={() => handleLeafSampleClick(sample.crop, sample.disease, sample.symptom, sample.img)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between group active:scale-95 ${
                    selectedLeafSample === sample.disease
                      ? 'bg-primary/15 border-primary shadow-sm'
                      : 'bg-card hover:bg-secondary/60 border-border'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="h-24 w-full rounded-lg overflow-hidden border border-border relative">
                      <img src={sample.img} alt={sample.disease} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-white font-bold">
                        {sample.crop}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors">
                        {sample.disease}
                      </span>
                      <span className="text-[10px] text-muted-fg italic block">{sample.latin}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-primary font-semibold mt-2 flex items-center gap-1">
                    क्लिक करें व जांचें ➔
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Leaf Photo Upload Input */}
            <div className="pt-2 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
              <input
                type="file"
                ref={leafUploadRef}
                onChange={handleLeafUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => leafUploadRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2 bg-secondary hover:bg-card border border-border text-foreground rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Upload className="w-4 h-4 text-primary" />
                <span>कैमरे या फोन से पत्ती की फोटो अपलोड करें</span>
              </button>

              {leafFilePreview && (
                <div className="flex items-center gap-2 text-xs text-muted-fg">
                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shrink-0">
                    <img src={leafFilePreview} alt="Leaf Preview" className="w-full h-full object-cover" />
                  </div>
                  <span className="font-mono text-[11px] truncate max-w-[180px]">{selectedLeafSample || 'Custom Leaf Photo'}</span>
                  <span className="text-emerald-400 font-bold text-[10px]">जांच पूर्ण ✓</span>
                </div>
              )}
            </div>
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
                <div className="p-3.5 bg-card rounded-xl border border-border">
                  <span className="text-rose-700 dark:text-rose-400 font-bold block mb-1">
                    महंगा ब्रांडेड कॉकटेल (MNC Branded Cocktail)
                  </span>
                  <p className="text-foreground font-semibold text-sm">
                    {advisoryResult.prescription?.brand_price ? `ब्रांडेड दवा: ${advisoryResult.prescription.brand_price}` : (advisoryResult.branded_cocktail || 'Syngenta / Bayer Branded')}
                  </p>
                  <p className="text-muted-fg text-[11px] mt-1">Average Market Cost: ₹850 – ₹1,200 per acre</p>
                </div>

                <div className="p-3.5 bg-card rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold block mb-1 flex items-center justify-between">
                    <span>ICAR स्वीकृत जेनेरिक टेक्निकल साल्ट</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold">
                      {advisoryResult.prescription?.savings_pct || 80}% बचत
                    </span>
                  </span>
                  <p className="text-foreground font-bold text-sm font-mono">
                    {advisoryResult.prescription?.chemical_salt || advisoryResult.generic_chemical || 'Mancozeb 75% WP'}
                  </p>
                  <p className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] mt-1">
                    Direct Generic Cost: {advisoryResult.prescription?.generic_price || '₹180 – ₹240'} (दुकानदार से केवल यही मांगें)
                  </p>
                </div>
              </div>

              {/* Exact 15L Knapsack Pump Dilution & Spray Advice */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                  <span className="font-bold text-primary block flex items-center gap-1.5">
                    <span>💧</span>
                    <span>15 लीटर ढोलकी पंप नाप (15L Spray Tank Dosage):</span>
                  </span>
                  <p className="text-foreground font-semibold text-xs">
                    {advisoryResult.prescription?.dosage_15l_tank_hi || '35 से 40 ग्राम प्रति 15 लीटर ढोलकी पंप'}
                  </p>
                  <p className="text-[11px] text-muted-fg">
                    {advisoryResult.prescription?.dosage_hi || advisoryResult.prescription?.dosage || '2 ग्राम प्रति लीटर पानी'}
                  </p>
                </div>

                <div className="p-3 bg-card rounded-xl border border-border space-y-1">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1.5">
                    <span>🌿</span>
                    <span>जैविक व घरेलू विकल्प (Organic / Bio Remedy):</span>
                  </span>
                  <p className="text-muted-fg text-xs">
                    {advisoryResult.prescription?.organic_alternative_hi || 'नीम का तेल (10,000 PPM) 40ml प्रति 15 लीटर पानी या ट्राइकोडर्मा विरिडी 50 ग्राम।'}
                  </p>
                </div>
              </div>

              {/* Safety & Spray Timing Warning */}
              {advisoryResult.prescription?.warning_hi && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>ICAR छिड़काव व मधुमक्खी सुरक्षा निर्देश:</span>
                  </span>
                  <p className="text-foreground text-[11px]">
                    {advisoryResult.prescription.warning_hi}
                  </p>
                </div>
              )}

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

      {/* TAB 4: Interactive Vernacular Telegram Bot Simulator */}
      {activeTab === 'telegram' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-foreground block">
                Telegram Vernacular Conversational Terminal
              </span>
              <p className="text-muted-fg text-[11px] mt-0.5">
                Farmers can manage their lot stock, check APMC Mandi modal rates, and accept/reject pickups entirely inside Telegram.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                CLI: {activePhone}
              </span>
            </div>
          </div>

          <TelegramBotSimulator 
            activePhone={activePhone} 
            onRefresh={() => {
              fetchFarmerLots();
              if (onRefresh) onRefresh();
            }} 
          />
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
                <label className="font-semibold text-muted-fg block">Select Harvest Crop (फसल चुनें)</label>
                <select
                  value={newCrop}
                  onChange={(e) => setNewCrop(e.target.value)}
                  className="w-full bg-secondary/80 border border-border rounded-xl p-2.5 text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="Mustard">Mustard (सरसों)</option>
                  <option value="Wheat">Wheat (गेहूँ)</option>
                  <option value="Potato">Potato (आलू)</option>
                  <option value="Paddy">Paddy (धान)</option>
                  <option value="Gram">Gram (चना)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-fg block">
                  Harvest Volume in 50kg Bags (बोरी संख्या)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBoriCount((prev) => Math.max(1, prev - 1))}
                    disabled={newBoriCount <= 1}
                    className="w-9 h-9 rounded-xl bg-secondary border border-border text-foreground font-bold flex items-center justify-center hover:bg-card active:scale-95 disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={newBoriCount}
                    onChange={(e) => setNewBoriCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-secondary/80 border border-border rounded-xl p-2.5 text-center font-mono font-bold text-sm text-foreground focus:outline-none focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={() => setNewBoriCount((prev) => Math.min(30, prev + 1))}
                    disabled={newBoriCount >= 30}
                    className="w-9 h-9 rounded-xl bg-secondary border border-border text-foreground font-bold flex items-center justify-center hover:bg-card active:scale-95 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center text-[11px] text-muted-fg px-1">
                  <span>कुल वजन: <strong className="font-mono text-foreground font-bold">{(newBoriCount * 0.5).toFixed(1)} क्विंटल</strong> ({newBoriCount * 50} kg)</span>
                  <span className="text-emerald-400 font-semibold">{newBoriCount} कट्टे / बोरी</span>
                </div>
              </div>

              <div className="p-3 bg-secondary/60 rounded-xl border border-border space-y-1 text-[11px] text-muted-fg">
                <span className="font-semibold text-foreground block">Instant Freight Estimation:</span>
                <p>Pooled Mahindra Bolero Share: <strong className="text-emerald-400">₹{(newBoriCount * 0.5 * 160).toFixed(0)}</strong> (vs Solo Tempo ₹2,100)</p>
                <span className="text-[10px] text-emerald-400 font-bold block">Net Smallholder Savings: +₹{(2100 - (newBoriCount * 0.5 * 160)).toFixed(0)}</span>
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
