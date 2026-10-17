import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import CallSimulator from './pages/CallSimulator';
import DriverChecklist from './pages/DriverChecklist';
import BuyerPortal from './pages/BuyerPortal';
import { Truck, PhoneCall, CheckSquare, Building2, LayoutDashboard } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Identity */}
          <div
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <span className="text-xl">🌾</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black text-white tracking-tight">KhetOS</h1>
                <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  खेतOS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">From Kaccha Rasta to Pucca Mandi</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Projector Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentPage('call')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'call'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>/call (Phone)</span>
            </button>

            <button
              onClick={() => setCurrentPage('driver')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'driver'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">/driver (Checklist)</span>
            </button>

            <button
              onClick={() => setCurrentPage('buyer')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'buyer'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">/buyer (Escrow)</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentPage === 'dashboard' && <Dashboard onNavigate={setCurrentPage} />}
        {currentPage === 'call' && <CallSimulator onNavigate={setCurrentPage} />}
        {currentPage === 'driver' && <DriverChecklist onNavigate={setCurrentPage} />}
        {currentPage === 'buyer' && <BuyerPortal onNavigate={setCurrentPage} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        KhetOS (खेतOS) &bull; Built for IIIT-Delhi Hackathon &bull; Empowering 140M Indian Smallholders
      </footer>
    </div>
  );
}
