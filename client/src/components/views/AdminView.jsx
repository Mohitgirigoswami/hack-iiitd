import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, CheckCircle2, AlertCircle, RefreshCw, Phone, 
  ShieldCheck, ChevronRight, BarChart3, Activity, Users, Search, 
  Building2, Sprout, Filter, ExternalLink, Sparkles, Navigation,
  Repeat, Package, Clock, Send, DollarSign, Check
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';

export default function AdminView({ state, onRefresh }) {
  const navigate = useNavigate();
  const { activeRole } = useRole();
  const [adminTab, setAdminTab] = useState('grid'); // 'grid' | 'directory'
  const [directory, setDirectory] = useState({ users: [], counts: {} });
  const [dirLoading, setDirLoading] = useState(false);
  const [dirFilter, setDirFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Trip & Order Dispatch States
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [dispatchingTrip, setDispatchingTrip] = useState(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState(null);

  // Reverse Backhaul Ingestion States
  const [backhaulList, setBackhaulList] = useState([]);
  const [addingBackhaul, setAddingBackhaul] = useState(false);
  const [customItem, setCustomItem] = useState({ item: '', quantity_kg: 200, destination: 'Village PACS' });
  const [backhaulSuccessMsg, setBackhaulSuccessMsg] = useState(null);

  // Mandi Sale Settlement States
  const [settlingSale, setSettlingSale] = useState(false);
  const [settlementReport, setSettlementReport] = useState(null);

  useEffect(() => {
    fetchDirectory();
    fetchBuyerOrders();
    fetchActiveTrip();
    fetchBackhaulManifest();
  }, []);

  const fetchDirectory = async () => {
    setDirLoading(true);
    try {
      const res = await fetch('/api/stakeholders/directory');
      if (res.ok) {
        const data = await res.json();
        setDirectory(data.directory || { users: [], counts: {} });
      }
    } catch (e) {
      console.warn('Directory fetch error:', e);
    }
    setDirLoading(false);
  };

  const fetchBuyerOrders = async () => {
    try {
      const res = await fetch('/api/buyer/orders');
      if (res.ok) {
        const data = await res.json();
        setBuyerOrders(data.orders || []);
      }
    } catch (e) {
      console.warn('Buyer orders fetch error:', e);
    }
  };

  const fetchActiveTrip = async () => {
    try {
      const res = await fetch('/api/trips/active');
      if (res.ok) {
        const data = await res.json();
        setActiveTrip(data.trip || null);
      }
    } catch (e) {
      console.warn('Active trip fetch error:', e);
    }
  };

  const fetchBackhaulManifest = async () => {
    try {
      const res = await fetch('/api/backhaul/manifest');
      if (res.ok) {
        const data = await res.json();
        setBackhaulList(data.return_cargo || []);
      }
    } catch (e) {
      console.warn('Backhaul fetch error:', e);
    }
  };

  const handleDispatchTrip = async (orderId = 'ORD-BUY-101') => {
    setDispatchingTrip(true);
    setDispatchSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/dispatch-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, crop: 'Mustard' })
      });
      const data = await res.json();
      if (res.ok) {
        setActiveTrip(data.trip);
        setDispatchSuccessMsg(data.message || 'Milk-Run Trip dispatched to Baljit Singh (HR-12-AE-8419)!');
        fetchActiveTrip();
        fetchBuyerOrders();
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Dispatch trip error:', err);
    } finally {
      setDispatchingTrip(false);
    }
  };

  const handleAddBackhaulPreset = async (preset) => {
    setAddingBackhaul(true);
    setBackhaulSuccessMsg(null);
    try {
      const res = await fetch('/api/backhaul/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: preset })
      });
      const data = await res.json();
      if (res.ok) {
        setBackhaulSuccessMsg(`Added ${preset.item} (${preset.quantity_kg} kg) to reverse manifest!`);
        fetchBackhaulManifest();
        setTimeout(() => setBackhaulSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Add backhaul preset error:', err);
    } finally {
      setAddingBackhaul(false);
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

  const pool = state?.active_pool || {};
  const lots = state?.lots || [];
  const feed = state?.activity_feed || [];

  return (
    <div className="space-y-6">
      {/* 1. Single Seeded Truck Profile & Telemetry Card */}
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
            <span className="text-xs text-muted-fg font-semibold">Active Fleet:</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              1 Dedicated Bolero Seeded Truck
            </span>
          </div>
        </div>

        {/* Dedicated Single Vehicle Card: Mahindra Bolero Maxi Truck */}
        <div className="p-4 rounded-xl border bg-primary/10 border-primary/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              <h4 className="text-sm font-black text-foreground">
                Mahindra Bolero Maxi Truck (HR-12-AE-8419)
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                1.5 Tonne Payload
              </span>
            </div>
            <p className="text-xs text-muted-fg">
              Assigned Transporter: <strong className="text-foreground">Baljit Singh</strong> (+91 94160 88219) &bull; Corridor: <strong className="text-foreground">Rohtak-Kalanaur ➔ Azadpur APMC Mandi</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-xs text-muted-fg block">Vehicle Status:</span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                {activeTrip ? activeTrip.status.replace(/_/g, ' ') : (pool.capacity_percentage >= 99 ? '100% FULL • DISPATCHED' : `${pool.capacity_percentage || 73.3}% FILLED • INTAKE ACTIVE`)}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center font-mono font-bold text-sm text-primary">
              {pool.capacity_percentage || 73.3}%
            </div>
          </div>
        </div>
      </div>

      {/* Module Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setAdminTab('grid')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            adminTab === 'grid'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Activity className="w-4 h-4" />
          1. Corridor Telemetry, Optimization Algorithm & Dispatch
        </button>

        <button
          onClick={() => setAdminTab('directory')}
          className={`pb-3 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            adminTab === 'directory'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-fg hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-400" />
          2. Stakeholders Directory & KYC Ledger
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30">
            {directory.counts?.total || 0} Registered
          </span>
        </button>
      </div>

      {adminTab === 'grid' && (
        <div className="space-y-6">
          {/* 2. Knapsack Route Optimization Algorithm on Screen */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-black text-foreground">
                    Milk-Run Cluster Optimization Algorithm (On Screen)
                  </h3>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Evaluates pending buyer orders against DB farm lots to compute the optimal 100% capacity pickup sequence.
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-secondary text-primary border border-border">
                Greedy Knapsack + Geometric TSP
              </span>
            </div>

            {dispatchSuccessMsg && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 animate-fade-in font-medium">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{dispatchSuccessMsg}</span>
              </div>
            )}

            {/* Algorithm Steps Visualizer */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* Step 1: Knapsack Capacity */}
              <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between text-muted-fg">
                  <span className="font-bold uppercase tracking-wider text-primary">Step 1: Knapsack Packing</span>
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground font-semibold">
                  Packs 3 Smallholder Lots into 30 Discrete 50kg Units:
                </p>
                <div className="space-y-1 font-mono text-[11px] text-muted-fg">
                  <div>&bull; Dinesh Chillar: 5.0 Qtl (10 Bags)</div>
                  <div>&bull; Suresh Kumar: 6.0 Qtl (12 Bags)</div>
                  <div>&bull; Ramu Sharma: 4.0 Qtl (8 Bags)</div>
                </div>
                <div className="pt-1 border-t border-border/60 flex justify-between font-bold text-foreground">
                  <span>Total Payload:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">15.0 Qtl / 30 Bags (100.0%)</span>
                </div>
              </div>

              {/* Step 2: PMGSY Geographic Sequencing */}
              <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between text-muted-fg">
                  <span className="font-bold uppercase tracking-wider text-blue-400">Step 2: TSP Route Sequencing</span>
                  <Navigation className="w-4 h-4 text-blue-400" />
                </div>
                <p className="text-foreground font-semibold">
                  Road-Snapped PMGSY Turnoff Sequence:
                </p>
                <div className="space-y-1 text-[11px] text-muted-fg">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-card border border-border text-[9px] font-bold flex items-center justify-center">1</span>
                    <span>Kalanaur (HR-ROH-62K9)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-card border border-border text-[9px] font-bold flex items-center justify-center">2</span>
                    <span>Bhalaut (HR-ROH-78G4)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-card border border-border text-[9px] font-bold flex items-center justify-center">3</span>
                    <span>Najafgarh (HR-ROH-91P2)</span>
                  </div>
                </div>
                <div className="pt-1 border-t border-border/60 flex justify-between font-bold text-foreground">
                  <span>Destination:</span>
                  <span className="text-primary">Azadpur APMC Gate 4</span>
                </div>
              </div>

              {/* Step 3: Economic Advantage */}
              <div className="p-4 bg-secondary/60 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between text-muted-fg">
                  <span className="font-bold uppercase tracking-wider text-emerald-400">Step 3: Route Savings</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-foreground font-semibold">
                  Zero Fragmentation & Deadhead Cuts:
                </p>
                <div className="space-y-1 text-[11px] text-muted-fg">
                  <div>&bull; Total Corridor Run: <strong>68 KM</strong></div>
                  <div>&bull; Empty Deadhead Cut: <strong>42 KM</strong></div>
                  <div>&bull; Smallholder Freight Cut: <strong>80% Savings</strong></div>
                </div>
                <div className="pt-1 border-t border-border/60 flex justify-between font-bold text-foreground">
                  <span>Corridor Status:</span>
                  <span className="text-emerald-500 font-bold">100% Balanced Run</span>
                </div>
              </div>
            </div>

            {/* Algorithm Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-muted-fg">
                Target Transporter: <strong className="text-foreground">Baljit Singh</strong> &bull; Assigned Order: <strong className="text-foreground">Shree Ram Flour & Oil Mill (15 Qtl)</strong>
              </div>

              <button
                onClick={() => handleDispatchTrip()}
                disabled={dispatchingTrip}
                className="py-3 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Truck className="w-4 h-4" />
                {dispatchingTrip ? 'Assigning Trip to Driver...' : 'Approve & Dispatch Milk-Run Trip to Baljit Singh (Bolero HR-12-AE-8419) 🚀'}
              </button>
            </div>
          </div>

          {/* 3. Visual Bolero Cargo Bay (30 Discrete 50kg Sacks) */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-black text-foreground">
                    Bolero Flatbed Cargo Telemetry (30 Gunny Sacks)
                  </h3>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Single vehicle manifest &bull; 1,500 kg capacity &bull; Zero lot fragmentation.
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xl font-black text-primary font-mono">
                  {pool.capacity_percentage || 73.3}%
                </span>
                <span className="text-[10px] text-muted-fg font-bold block uppercase tracking-wider">
                  Vehicle Fill Rate
                </span>
              </div>
            </div>

            {/* Progress Bar */}
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

            {/* 30 Discrete Bag Grid */}
            <div className="p-4 bg-secondary/50 rounded-2xl border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <span className="font-bold text-foreground">Bolero Flatbed Cargo Manifest (30 &times; 50kg Sacks)</span>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-fg">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Suresh (12 Bags)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block" /> Dinesh (10 Bags)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Ramu (8 Bags)</span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5 pt-1">
                {Array.from({ length: 30 }).map((_, i) => {
                  let bgClass = "bg-secondary border border-dashed border-border text-muted-fg/40";
                  if (i < 12) {
                    bgClass = "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold border shadow-xs";
                  } else if (i < 22) {
                    bgClass = "bg-blue-500/20 border-blue-500/50 text-blue-400 font-bold border shadow-xs";
                  } else if (pool.capacity_percentage >= 99) {
                    bgClass = "bg-amber-500/25 border-amber-500/60 text-amber-400 font-bold border shadow-xs";
                  } else {
                    bgClass = "border border-dashed border-primary/50 bg-primary/10 text-primary font-bold animate-pulse";
                  }

                  return (
                    <div
                      key={i}
                      className={`h-8 rounded-lg flex items-center justify-center text-[10px] font-mono transition-all duration-500 select-none ${bgClass}`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4. Admin Reverse Backhaul Logistics Ingestion */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-black text-foreground">
                    Admin Reverse Backhaul Cargo Dispatch (0% Khali Phera)
                  </h3>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Select and ingest return commodities from demo data to ensure Baljit Singh's Bolero truck never returns empty.
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/30">
                Current Backhaul Load: {backhaulList.reduce((acc, i) => acc + (i.quantity_kg || 0), 0)} kg
              </span>
            </div>

            {backhaulSuccessMsg && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 animate-fade-in font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{backhaulSuccessMsg}</span>
              </div>
            )}

            {/* Quick Demo Item Preset Buttons */}
            <div>
              <span className="text-xs font-bold text-foreground block mb-2">
                Click to Ingest Return Cargo from Demo Data Presets:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  {
                    item: "Pashu Aahar (Mustard Cattle Feed Cake)",
                    category: "Feed / Byproduct",
                    source: "Shree Ram Oil Mill Byproduct",
                    destination: "Bhalaut Dairy Cooperative",
                    quantity_kg: 500,
                    bags: 10,
                    wholesale_rate_rs: 1850
                  },
                  {
                    item: "IFFCO Neem-Coated Urea",
                    category: "Fertilizer",
                    source: "Central IFFCO Wholesale Depot",
                    destination: "Village Bhalaut PACS Society",
                    quantity_kg: 400,
                    bags: 8,
                    subsidized_mrp_rs: 266
                  },
                  {
                    item: "Certified ICAR Seeds & Bio-Pesticides",
                    category: "Certified Input",
                    source: "Pusa ICAR Agricultural Hub",
                    destination: "Khad-Beej Kendra Bhalaut",
                    quantity_kg: 100,
                    bags: 2,
                    saving_vs_retail_pct: 80
                  },
                  {
                    item: "Reusable Heavy-Duty Harvest Crates",
                    category: "Packaging Logistics",
                    source: "Azadpur APMC Central Depot",
                    destination: "Village Kalanaur Farmer PACS",
                    quantity_kg: 200,
                    bags: 4,
                    wholesale_rate_rs: 400
                  }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddBackhaulPreset(preset)}
                    disabled={addingBackhaul}
                    className="p-3 rounded-xl bg-secondary/70 hover:bg-secondary border border-border hover:border-emerald-500/50 text-left transition flex flex-col justify-between group active:scale-95 text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground group-hover:text-emerald-400 block truncate">
                        + {preset.item}
                      </span>
                      <span className="text-[10px] text-muted-fg mt-0.5 block truncate">
                        {preset.destination}
                      </span>
                    </div>
                    <div className="mt-2 pt-1 border-t border-border/60 flex justify-between items-center text-[11px] font-mono">
                      <span className="text-primary font-bold">{preset.quantity_kg} kg</span>
                      <span className="text-emerald-500 font-bold">Add &bull;</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Backhaul Return Cargo Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-fg font-semibold">
                    <th className="py-2.5 px-3">Return Cargo Item</th>
                    <th className="py-2.5 px-3">Pickup Source</th>
                    <th className="py-2.5 px-3">Destination Village</th>
                    <th className="py-2.5 px-3">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {backhaulList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/40">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        {item.item}
                        <span className="text-[10px] text-primary block">{item.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-muted-fg">{item.source || 'APMC Depot'}</td>
                      <td className="py-2.5 px-3 text-foreground">{item.destination}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">{item.quantity_kg} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Mandi Weighbridge Sale Settlement & Telegram Bot Alert */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-black text-foreground">
                    Electronic Weighbridge Sale & Telegram Payout Settlement
                  </h3>
                </div>
                <p className="text-xs text-muted-fg mt-0.5">
                  Finalizes the Mandi sale, itemizes delivery & APMC cess deductions, and dispatches detailed receipts via @KhetOSSaathiBot.
                </p>
              </div>

              <button
                onClick={handleSettleSale}
                disabled={settlingSale}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {settlingSale ? 'Settling & Sending Telegram Alerts...' : 'Finalize Mandi Sale & Dispatch Telegram Receipts 💰'}
              </button>
            </div>

            {settlementReport && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Mandi Sale Finalized & Telegram Receipts Dispatched!
                  </span>
                  <span className="text-xs font-mono text-muted-fg">{settlementReport.settled_lots_count} Smallholder Lots Settled</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {settlementReport.settlements?.map((s, idx) => (
                    <div key={idx} className="p-3.5 bg-card rounded-xl border border-border space-y-2">
                      <div className="flex justify-between items-center border-b border-border/60 pb-1.5">
                        <span className="font-bold text-foreground">{s.farmer_name}</span>
                        <span className="font-mono text-primary font-bold">{s.quantity_quintals} Qtl ({s.bags} Bags)</span>
                      </div>
                      <div className="space-y-1 text-[11px] text-muted-fg">
                        <div className="flex justify-between"><span>Gross Value (@ ₹5,420/Qtl):</span><span className="font-mono font-bold text-foreground">₹{s.gross_value.toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Delivery Freight (Pooling):</span><span className="font-mono text-rose-500">-₹{s.delivery_freight}</span></div>
                        <div className="flex justify-between"><span>APMC Mandi Cess (1%):</span><span className="font-mono text-rose-500">-₹{s.mandi_cess}</span></div>
                        <div className="flex justify-between"><span>Weighbridge Handling:</span><span className="font-mono text-rose-500">-₹{s.labor_charge}</span></div>
                      </div>
                      <div className="pt-1.5 border-t border-border flex justify-between font-bold text-sm">
                        <span className="text-foreground">Net Payout Credited:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹{s.net_payout.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3" />
                        <span>Dispatched to Telegram chat & phone CLI ({s.phone})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Stakeholders Directory & KYC Ledger */}
      {adminTab === 'directory' && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  APMC Corridor Stakeholders & KYC Ledger
                </h3>
                <p className="text-xs text-muted-fg mt-0.5">
                  Universal registry of farmers, transport operators, and institutional buyers mapped to official mobile CLIs.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDirectory}
                  disabled={dirLoading}
                  className="p-2 rounded-xl border border-border bg-secondary hover:bg-card text-muted-fg hover:text-foreground transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dirLoading ? 'animate-spin text-primary' : ''}`} />
                </button>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-sm hover:brightness-110 transition flex items-center gap-1.5"
                >
                  <span>+ Onboard Stakeholder</span>
                </Link>
              </div>
            </div>

            {/* Search and Role Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-muted-fg absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, village, corridor..."
                  className="w-full bg-secondary/80 border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {['ALL', 'FARMER', 'DRIVER', 'BUYER', 'ADMIN'].map((rf) => (
                  <button
                    key={rf}
                    onClick={() => setDirFilter(rf)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition shrink-0 ${
                      dirFilter === rf
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-muted-fg border-border hover:text-foreground'
                    }`}
                  >
                    {rf}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-muted-fg">
                    <th className="pb-3 px-3 font-semibold">Stakeholder / Enterprise</th>
                    <th className="pb-3 px-3 font-semibold">Role</th>
                    <th className="pb-3 px-3 font-semibold">Contact CLI</th>
                    <th className="pb-3 px-3 font-semibold">Location / Corridor / Fleet</th>
                    <th className="pb-3 px-3 font-semibold">Verification Channel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {directory.users
                    .filter((u) => {
                      if (dirFilter !== 'ALL' && u.role !== dirFilter) return false;
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (u.name || '').toLowerCase().includes(q) ||
                        (u.phone || '').toLowerCase().includes(q) ||
                        (u.village || '').toLowerCase().includes(q) ||
                        (u.route || '').toLowerCase().includes(q) ||
                        (u.company_name || '').toLowerCase().includes(q)
                      );
                    })
                    .map((u, i) => (
                      <tr key={i} className="hover:bg-secondary/40 transition">
                        <td className="py-3 px-3">
                          <span className="font-bold text-foreground block">
                            {u.company_name ? `${u.company_name} (${u.name})` : u.name}
                          </span>
                          {u.khet_pin && (
                            <span className="font-mono text-[10px] text-primary">KhetPin: {u.khet_pin}</span>
                          )}
                          {u.gstin && (
                            <span className="font-mono text-[10px] text-amber-500">GSTIN: {u.gstin}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'FARMER'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : u.role === 'DRIVER'
                              ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                              : u.role === 'BUYER'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-fg font-semibold">
                          {u.phone}
                        </td>
                        <td className="py-3 px-3 text-muted-fg">
                          {u.vehicle_number ? (
                            <span>{u.vehicle_model} &bull; <strong className="text-foreground">{u.vehicle_number}</strong></span>
                          ) : u.route ? (
                            <span>{u.route}</span>
                          ) : u.location ? (
                            <span>{u.location}</span>
                          ) : (
                            <span>{u.village || 'Azadpur APMC Grid'}</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25">
                            <ShieldCheck className="w-3 h-3" />
                            {u.role === 'FARMER' ? 'Caller CLI Auto-Verified' : 'Official KYC Locked'}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
