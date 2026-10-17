import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import FarmerView from '../components/views/FarmerView';
import DriverView from '../components/views/DriverView';
import BuyerView from '../components/views/BuyerView';
import AdminView from '../components/views/AdminView';

export default function Dashboard() {
  const { currentRoleId, ROLES } = useRole();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) {
        throw new Error(`Failed to load state: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      setState(data);
      setError(null);
      setLoading(false);
    } catch (err) {
      console.error('KhetOS State Fetch Error:', err);
      setError(err.message || 'Unable to connect to server');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 2500); // Live poll every 2.5s
    return () => clearInterval(interval);
  }, []);

  const activeRole = ROLES[currentRoleId] || ROLES.ADMIN;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Top Console Header */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-muted-fg uppercase tracking-widest block">
            KhetOS Production Console
          </span>
          <h2 className="text-xl font-black text-foreground mt-0.5">
            {activeRole.icon} {activeRole.name} &bull; {activeRole.roleLabel}
          </h2>
        </div>

        {/* Link back to Portals on Home page */}
        <Link
          to="/"
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary hover:bg-card text-foreground text-xs font-semibold transition active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Switch Portal</span>
        </Link>
      </div>

      {/* Dynamic Role Portal View */}
      {loading && !state ? (
        <div className="py-24 text-center text-xs text-muted-fg animate-pulse">
          Connecting to KhetOS Central State Engine...
        </div>
      ) : error && !state ? (
        <div className="py-16 text-center space-y-3 bg-card border border-border rounded-2xl p-6">
          <p className="text-xs text-rose-700 dark:text-rose-400 font-semibold">{error}</p>
          <button
            onClick={fetchState}
            className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl transition hover:brightness-110 active:scale-95"
          >
            Retry Connection
          </button>
        </div>
      ) : (
        <>
          {currentRoleId === 'FARMER' && <FarmerView state={state} onRefresh={fetchState} />}
          {currentRoleId === 'DRIVER' && <DriverView state={state} onRefresh={fetchState} />}
          {currentRoleId === 'BUYER' && <BuyerView state={state} onRefresh={fetchState} />}
          {currentRoleId === 'ADMIN' && <AdminView state={state} onRefresh={fetchState} />}
        </>
      )}
    </div>
  );
}
