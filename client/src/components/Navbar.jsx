import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, RefreshCw, Bell, Radio, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';
import OmnichannelNotificationDrawer from './OmnichannelNotificationDrawer';
import { useRole } from '../context/RoleContext';
import KhetOSLogo from './KhetOSLogo';

export default function Navbar() {
  const location = useLocation();
  const { activeRole, customPhone } = useRole();
  const [resetting, setResetting] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const activePhone = customPhone || activeRole?.phone || '+91 98123 45099';

  const fetchNotifCount = async () => {
    try {
      const res = await fetch(`/api/notifications?phone=${encodeURIComponent(activePhone)}`);
      if (res.ok) {
        const data = await res.json();
        setNotifCount(data.notifications ? data.notifications.length : 0);
      }
    } catch (e) {
      // silently fallback
    }
  };

  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 4000);
    return () => clearInterval(interval);
  }, [activePhone]);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) {
        throw new Error(`Reset failed: ${res.status} ${res.statusText}`);
      }
      window.location.reload();
    } catch (err) {
      console.error('KhetOS Reset Error:', err);
      setResetting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#080A19]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand & Tagline */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-[#0d1224]/90 border border-white/[0.08] flex items-center justify-center p-0.5 shadow-sm group-hover:scale-105 transition">
                <KhetOSLogo size={32} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-lg text-foreground tracking-tight">KhetOS</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border">
                    खेतOS
                  </span>
                </div>
                <p className="text-[10px] text-muted-fg font-medium tracking-wide hidden sm:block">
                  The Farm-Gate Operating System
                </p>
              </div>
            </Link>

            {/* Live Corridor Status Pill */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d1224]/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-foreground font-semibold text-[11px]">Rohtak-Azadpur Corridor</span>
              <span className="text-[10px] text-muted-fg font-mono">Live Synced</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                location.pathname === '/'
                  ? 'bg-[#12182d] text-foreground border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-muted-fg hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              Portals
            </Link>

            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                location.pathname === '/dashboard'
                  ? 'bg-[#12182d] text-foreground border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-muted-fg hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              Dashboard
            </Link>

            {/* Auth / Register Link */}
            <Link
              to="/login"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                location.pathname === '/login' || location.pathname === '/register'
                  ? 'bg-[#12182d] text-foreground border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-muted-fg hover:text-foreground hover:bg-white/[0.04]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Register / Sign In</span>
              <span className="sm:hidden">Auth</span>
            </Link>

            {/* Standalone Route for Calling */}
            <Link
              to="/call"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
                location.pathname === '/call'
                  ? 'bg-primary text-primary-foreground shadow-glow'
                  : 'bg-[#12182d] text-foreground border border-white/[0.08] hover:bg-primary hover:text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              }`}
            >
              <Phone className="w-3.5 h-3.5 animate-pulse" />
              <span>Toll-Free /call</span>
            </Link>
          </nav>

          {/* Right Controls: Notifications, Reset State, Theme Switcher */}
          <div className="flex items-center gap-2">
            {/* Omnichannel Notification Bell */}
            <button
              onClick={() => setIsNotifOpen(true)}
              title="Dual-Channel Notifications (Phone IVR + Telegram)"
              className="relative p-2 rounded-xl border border-white/[0.08] bg-[#0d1224]/80 hover:bg-[#12182d] text-foreground transition active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <Bell className="w-4 h-4" />
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {notifCount}
                </span>
              )}
            </button>

            {/* Demo Reset Button */}
            <button
              onClick={handleReset}
              disabled={resetting}
              title="Reset active pool back to 73.3% baseline"
              className="p-2 rounded-xl border border-white/[0.08] bg-[#0d1224]/80 hover:bg-[#12182d] text-muted-fg hover:text-foreground transition active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin text-foreground' : ''}`} />
            </button>

            {/* Theme Switcher */}
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      {/* Omnichannel Drawer */}
      <OmnichannelNotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        activePhone={activePhone}
      />
    </>
  );
}
