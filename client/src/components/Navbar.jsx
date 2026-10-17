import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Phone, RefreshCw } from 'lucide-react';
import ThemeSwitcher from './ThemeSwitcher';

export default function Navbar() {
  const location = useLocation();
  const [resetting, setResetting] = useState(false);

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
    <header className="sticky top-0 z-50 bg-card/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-lg shadow-sm group-hover:scale-105 transition">
              ख
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
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              location.pathname === '/'
                ? 'bg-secondary text-foreground'
                : 'text-muted-fg hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            Portals
          </Link>

          <Link
            to="/dashboard"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              location.pathname === '/dashboard'
                ? 'bg-secondary text-foreground'
                : 'text-muted-fg hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            Dashboard
          </Link>

          {/* Standalone Route for Calling */}
          <Link
            to="/call"
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm ${
              location.pathname === '/call'
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-secondary text-foreground border border-border hover:bg-primary hover:text-primary-foreground'
            }`}
          >
            <Phone className="w-3.5 h-3.5 animate-pulse" />
            <span>Toll-Free /call</span>
          </Link>
        </nav>

        {/* Right Controls: Reset State, Theme Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Demo Reset Button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            title="Reset active pool back to 73.3% baseline"
            className="p-2 rounded-xl border border-border bg-card hover:bg-secondary text-muted-fg hover:text-foreground transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${resetting ? 'animate-spin text-foreground' : ''}`} />
          </button>

          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
