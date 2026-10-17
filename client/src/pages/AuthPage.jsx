import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Truck, Building2, ShieldCheck, UserCheck, Phone, Lock, 
  ArrowRight, CheckCircle2, AlertCircle, Sparkles, Sprout, ArrowLeft,
  KeyRound, FileText, MapPin, Hash, Car
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import KhetOSLogo from '../components/KhetOSLogo';

export default function AuthPage({ initialTab = 'signin' }) {
  const navigate = useNavigate();
  const { setRole, setCustomPhone } = useRole();
  const [activeTab, setActiveTab] = useState(initialTab); // 'signin' | 'driver' | 'buyer' | 'farmer_info'

  // Sign In State
  const [loginPhone, setLoginPhone] = useState('+91 94160 88219');
  const [loginPin, setLoginPin] = useState('1234');
  const [loginRole, setLoginRole] = useState('DRIVER');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Driver Registration State
  const [driverForm, setDriverForm] = useState({
    name: 'Baljit Singh',
    phone: '+91 94160 88219',
    vehicle_model: 'Mahindra Bolero Pickup (1.5T)',
    vehicle_number: 'HR-12-AE-8419',
    route: 'Rohtak ➔ Bhalaut ➔ Kalanaur ➔ Azadpur APMC',
    license_number: 'DL-042018009214',
    pin_code: '1234',
    telegram_username: '@baljit_transporter'
  });
  const [driverLoading, setDriverLoading] = useState(false);
  const [driverSuccess, setDriverSuccess] = useState(null);
  const [driverError, setDriverError] = useState('');

  // Buyer Registration State
  const [buyerForm, setBuyerForm] = useState({
    company_name: 'Shree Ram Flour & Oil Mill',
    representative_name: 'Anil Singhal',
    phone: '+91 98111 22334',
    gstin: '07AAAAA0000A1Z5',
    location: 'Lawrence Road Industrial Area, Delhi',
    target_crop: 'Mustard (सरसों)',
    pin_code: '1234',
    telegram_username: '@shreeram_buyer'
  });
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [buyerSuccess, setBuyerSuccess] = useState(null);
  const [buyerError, setBuyerError] = useState('');

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: loginPhone,
          pin: loginPin,
          role: loginRole
        })
      });

      const data = await res.json();
      if (!res.ok || data.status === 'ERROR') {
        throw new Error(data.message || 'Authentication failed. Please check credentials.');
      }

      // Set role in context
      const user = data.user;
      const targetRole = user.role || loginRole;
      setRole(targetRole);
      setCustomPhone(user.phone);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  // Quick 1-Click Fast Gate Credentials
  const handleQuickCredential = (phone, pin, role) => {
    setLoginPhone(phone);
    setLoginPin(pin);
    setLoginRole(role);
    setLoginError('');
  };

  // Handle Driver Sign-Up
  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setDriverLoading(true);
    setDriverError('');
    setDriverSuccess(null);

    try {
      const res = await fetch('/api/auth/register-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Driver registration failed.');
      }

      setDriverSuccess(data.user);
      setRole('DRIVER');
      setCustomPhone(driverForm.phone);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setDriverError(err.message || 'Failed to register driver');
    } finally {
      setDriverLoading(false);
    }
  };

  // Handle Buyer Sign-Up
  const handleBuyerSubmit = async (e) => {
    e.preventDefault();
    setBuyerLoading(true);
    setBuyerError('');
    setBuyerSuccess(null);

    try {
      const res = await fetch('/api/auth/register-buyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buyerForm)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Buyer registration failed.');
      }

      setBuyerSuccess(data.user);
      setRole('BUYER');
      setCustomPhone(buyerForm.phone);

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setBuyerError(err.message || 'Failed to register buyer');
    } finally {
      setBuyerLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Breadcrumb & Return to Dashboard */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-2 text-xs font-bold text-muted-fg hover:text-foreground transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
          Official APMC & Corridor Auth Gateway
        </span>
      </div>

      {/* Main Container */}
      <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-card via-secondary/40 to-card border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-secondary border border-border flex items-center justify-center p-1.5 shadow-sm shrink-0">
              <KhetOSLogo size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">KhetOS Stakeholder Portal</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30 font-bold">
                  v2.4 Production
                </span>
              </div>
              <p className="text-xs text-muted-fg mt-0.5">
                Verified corridor access for Transporters, Institutional Buyers & Mandi Regulators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              Mandi Grid Online
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-border bg-secondary/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('signin')}
            className={`py-3.5 px-5 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'signin'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-fg hover:text-foreground'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Sign In / Quick Access
          </button>

          <button
            onClick={() => setActiveTab('driver')}
            className={`py-3.5 px-5 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'driver'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-fg hover:text-foreground'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-400" />
            Transporter Onboarding (Driver)
          </button>

          <button
            onClick={() => setActiveTab('buyer')}
            className={`py-3.5 px-5 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'buyer'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-fg hover:text-foreground'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            Processor Onboarding (Buyer)
          </button>

          <button
            onClick={() => setActiveTab('farmer_info')}
            className={`py-3.5 px-5 text-xs font-bold transition flex items-center gap-2 whitespace-nowrap border-b-2 ${
              activeTab === 'farmer_info'
                ? 'border-primary text-primary bg-card'
                : 'border-transparent text-muted-fg hover:text-foreground'
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-400" />
            Farmer Zero-App Guide
          </button>
        </div>

        {/* TAB 1: Sign In / Direct Verification */}
        {activeTab === 'signin' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground">Stakeholder Sign In</h3>
              <p className="text-xs text-muted-fg mt-0.5">
                Enter your registered mobile number and 4-digit security PIN to access your console.
              </p>
            </div>

            {loginError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" /> Registered Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={loginPhone}
                  onChange={(e) => setLoginPhone(e.target.value)}
                  placeholder="+91 94160 88219"
                  className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" /> 4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground tracking-widest focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1.5">Stakeholder Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'DRIVER', label: 'Transporter', icon: Truck },
                    { id: 'BUYER', label: 'Buyer', icon: Building2 },
                    { id: 'ADMIN', label: 'APMC Admin', icon: ShieldCheck }
                  ].map((r) => {
                    const Icon = r.icon;
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => setLoginRole(r.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                          loginRole === r.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-secondary text-muted-fg border-border hover:text-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-primary hover:brightness-110 text-primary-foreground font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Console'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick 1-Click Fast Gate for Judges & Mentors */}
            <div className="pt-6 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-fg uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Quick Demo Fast-Gates (Instant Fill & Test)
                </span>
                <span className="text-[10px] text-muted-fg">Pre-verified credentials</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleQuickCredential('+91 94160 88219', '1234', 'DRIVER')}
                  className="p-3 bg-secondary/60 hover:bg-secondary border border-border hover:border-blue-500/40 rounded-xl text-left transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs group-hover:text-blue-400">Baljit Singh</span>
                    <Truck className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <span className="text-[10px] text-muted-fg block mt-0.5">Bolero Transporter (Rohtak)</span>
                  <span className="text-[9px] font-mono text-primary mt-1 block">+91 94160 88219 &bull; PIN: 1234</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickCredential('+91 98111 22334', '1234', 'BUYER')}
                  className="p-3 bg-secondary/60 hover:bg-secondary border border-border hover:border-amber-500/40 rounded-xl text-left transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs group-hover:text-amber-400">Shree Ram Mill</span>
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <span className="text-[10px] text-muted-fg block mt-0.5">Institutional Oil Processor</span>
                  <span className="text-[9px] font-mono text-primary mt-1 block">+91 98111 22334 &bull; PIN: 1234</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickCredential('+91 11 2769 1100', '2026', 'ADMIN')}
                  className="p-3 bg-secondary/60 hover:bg-secondary border border-border hover:border-indigo-500/40 rounded-xl text-left transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs group-hover:text-indigo-400">Dr. Vivek Swaminathan</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                  <span className="text-[10px] text-muted-fg block mt-0.5">APMC Mandi Director</span>
                  <span className="text-[9px] font-mono text-primary mt-1 block">+91 11 2769 1100 &bull; PIN: 2026</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Transporter (Driver) Sign Up */}
        {activeTab === 'driver' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-foreground">Transporter Onboarding & KYC</h3>
              </div>
              <p className="text-xs text-muted-fg mt-0.5">
                Register your commercial pickup vehicle to receive real-time lot aggregation dispatches and backhaul cargo.
              </p>
            </div>

            {driverSuccess && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transporter Account Activated! Redirecting to Console...</span>
                </div>
                <p className="text-[11px] text-muted-fg">
                  Vehicle {driverSuccess.vehicle_number} registered on corridor.
                </p>
              </div>
            )}

            {driverError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{driverError}</span>
              </div>
            )}

            <form onSubmit={handleDriverSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Driver Full Name</label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    placeholder="e.g. Ravinder Gujjar"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Primary Mobile Number (CLI)
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                    placeholder="+91 94160 88219"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-primary" /> Vehicle Model & Payload
                  </label>
                  <select
                    value={driverForm.vehicle_model}
                    onChange={(e) => setDriverForm({ ...driverForm, vehicle_model: e.target.value })}
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Mahindra Bolero Pickup (1.5T)">Mahindra Bolero Pickup (1.5T payload)</option>
                    <option value="Tata 407 LPT (2.5T)">Tata 407 LPT (2.5T payload)</option>
                    <option value="Ashok Leyland Dost (1.25T)">Ashok Leyland Dost (1.25T payload)</option>
                    <option value="Mahindra Bolero Maxi Truck (1.7T)">Mahindra Bolero Maxi Truck (1.7T payload)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-primary" /> Commercial Registration No
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.vehicle_number}
                    onChange={(e) => setDriverForm({ ...driverForm, vehicle_number: e.target.value })}
                    placeholder="HR-12-AE-8419"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground uppercase focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Operating Corridor
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.route}
                    onChange={(e) => setDriverForm({ ...driverForm, route: e.target.value })}
                    placeholder="Rohtak ➔ Azadpur APMC"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> Commercial Driving License No
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.license_number}
                    onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                    placeholder="DL-042018009214"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground uppercase focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" /> 4-Digit Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={driverForm.pin_code}
                    onChange={(e) => setDriverForm({ ...driverForm, pin_code: e.target.value })}
                    placeholder="••••"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground tracking-widest focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Telegram Username (Optional)</label>
                  <input
                    type="text"
                    value={driverForm.telegram_username}
                    onChange={(e) => setDriverForm({ ...driverForm, telegram_username: e.target.value })}
                    placeholder="@username"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={driverLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {driverLoading ? 'Registering Transporter...' : 'Complete Transporter Registration & Launch Console'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: Institutional Processor (Buyer) Sign Up */}
        {activeTab === 'buyer' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-foreground">Institutional Processor Onboarding</h3>
              </div>
              <p className="text-xs text-muted-fg mt-0.5">
                Connect your oil mill, flour mill, or processing plant for direct farm-gate lot procurement and automated escrow settlements.
              </p>
            </div>

            {buyerSuccess && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 space-y-1">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Buyer Escrow Profile Onboarded! Redirecting to Console...</span>
                </div>
                <p className="text-[11px] text-muted-fg">
                  Entity {buyerSuccess.company_name} activated for {buyerSuccess.target_crop}.
                </p>
              </div>
            )}

            {buyerError && (
              <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{buyerError}</span>
              </div>
            )}

            <form onSubmit={handleBuyerSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Processing Mill / Company Name</label>
                  <input
                    type="text"
                    required
                    value={buyerForm.company_name}
                    onChange={(e) => setBuyerForm({ ...buyerForm, company_name: e.target.value })}
                    placeholder="Shree Ram Flour & Oil Mill"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Authorized Representative Name</label>
                  <input
                    type="text"
                    required
                    value={buyerForm.representative_name}
                    onChange={(e) => setBuyerForm({ ...buyerForm, representative_name: e.target.value })}
                    placeholder="Anil Singhal"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" /> Primary Contact Mobile (CLI)
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.phone}
                    onChange={(e) => setBuyerForm({ ...buyerForm, phone: e.target.value })}
                    placeholder="+91 98111 22334"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" /> GSTIN (Goods & Services Tax ID)
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.gstin}
                    onChange={(e) => setBuyerForm({ ...buyerForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="07AAAAA0000A1Z5"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground uppercase focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> Mill / Processing Plant Location
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.location}
                    onChange={(e) => setBuyerForm({ ...buyerForm, location: e.target.value })}
                    placeholder="Lawrence Road Industrial Area, Delhi"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Sprout className="w-3.5 h-3.5 text-primary" /> Primary Target Commodity
                  </label>
                  <select
                    value={buyerForm.target_crop}
                    onChange={(e) => setBuyerForm({ ...buyerForm, target_crop: e.target.value })}
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="Mustard (सरसों)">Mustard (सरसों) - High Oil Content</option>
                    <option value="Wheat (गेहूं)">Wheat (गेहूं) - Sharbati / MP Grade</option>
                    <option value="Paddy (धान)">Paddy (धान) - Basmati 1121</option>
                    <option value="Soybean (सोयाबीन)">Soybean (सोयाबीन) - High Protein</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-primary" /> 4-Digit Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={buyerForm.pin_code}
                    onChange={(e) => setBuyerForm({ ...buyerForm, pin_code: e.target.value })}
                    placeholder="••••"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground tracking-widest focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">Telegram Username (Optional)</label>
                  <input
                    type="text"
                    value={buyerForm.telegram_username}
                    onChange={(e) => setBuyerForm({ ...buyerForm, telegram_username: e.target.value })}
                    placeholder="@username"
                    className="w-full bg-secondary/80 border border-border rounded-xl px-3.5 py-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={buyerLoading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                {buyerLoading ? 'Activating Escrow Account...' : 'Complete Buyer Escrow Onboarding & Enter Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: Farmer Zero-App Architecture Philosophy */}
        {activeTab === 'farmer_info' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <Sprout className="w-5 h-5" />
                <span>The Zero-App Farmer Philosophy (शून्य-ऐप सिद्धांत)</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Over <strong>86% of Indian farmers</strong> are marginal smallholders owning under 2 hectares of land. 
                Expecting rural farmers to download 80MB React Native apps, register with passwords, and navigate complex English GUIs fails consistently in the field.
              </p>
              <p className="text-xs text-foreground/90 leading-relaxed">
                <strong>KhetOS eliminates all web/app friction for farmers:</strong>
              </p>
              <ul className="text-xs text-muted-fg space-y-1.5 list-disc pl-5">
                <li><strong className="text-foreground">Zero Web Registration:</strong> Farmers never sign up on desktop web forms.</li>
                <li><strong className="text-foreground">Automated Caller Authentication (CLI):</strong> Dialing <code>1800-KHET-OS</code> automatically identifies the farmer, binds their KhetPin, and speaks in native Hindi.</li>
                <li><strong className="text-foreground">Dual-Channel Mirroring:</strong> Any action taken on the IVR call instantly mirrors to their vernacular Telegram Bot and vice versa.</li>
                <li><strong className="text-foreground">Multi-Key DTMF Keypad:</strong> Farmers press Key 1 (Mandi Rates), Key 2 (Instant Pool), Key 3 (Stock Submenu: 31 +1 Qtl, 32 -1 Qtl, 33 Cancel with ₹0 Penalty).</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-secondary/50 border border-border rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>Interactive 1800-KHET-OS Telephony</span>
                </div>
                <p className="text-xs text-muted-fg leading-relaxed">
                  Experience how Ramu Sharma and marginal farmers interact with KhetOS using a feature phone dialpad with Azure Neural Hindi voice.
                </p>
                <Link
                  to="/call"
                  className="w-full py-2.5 px-3 bg-primary text-primary-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 hover:brightness-110 transition active:scale-95 shadow-sm block text-center"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Launch Feature Phone Simulator (/call)
                </Link>
              </div>

              <div className="p-5 bg-secondary/50 border border-border rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-foreground font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>Vernacular Telegram Bot</span>
                </div>
                <p className="text-xs text-muted-fg leading-relaxed">
                  Interact with KhetOS via conversational commands (<code>/mandi</code>, <code>/mystock</code>, <code>/addlot</code>, <code>/modlot</code>, <code>/dellot</code>) with live caller binding.
                </p>
                <button
                  onClick={() => {
                    setRole('FARMER');
                    navigate('/dashboard');
                  }}
                  className="w-full py-2.5 px-3 bg-secondary hover:bg-card border border-border text-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 block text-center"
                >
                  <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                  View Farmer Console & Bot in Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
