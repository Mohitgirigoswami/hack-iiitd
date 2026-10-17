import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import ThemeSwitcher from './components/ThemeSwitcher';
import Dashboard from './pages/Dashboard';
import CallSimulator from './pages/CallSimulator';
import DriverChecklist from './pages/DriverChecklist';
import BuyerPortal from './pages/BuyerPortal';
import { Truck, PhoneCall, CheckSquare, Building2, LayoutDashboard } from 'lucide-react';

function MainApp() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      {/* Top Navigation Bar with Glassmorphism */}
      <header className="sticky top-0 z-50 bg-card/85 backdrop-blur-md border-b border-border shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          {/* Logo & Identity */}
          <div
            onClick={() => setCurrentPage('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
              <span className="text-xl">🌾</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-black text-foreground tracking-tight">KhetOS</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-primary/20 text-primary border border-primary/30">
                  खेतOS
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">From Kaccha Rasta to Pucca Mandi</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 bg-secondary/80 p-1 rounded-xl border border-border">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'dashboard'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden md:inline">Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentPage('call')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'call'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <PhoneCall className="w-4 h-4" />
              <span>/call</span>
            </button>

            <button
              onClick={() => setCurrentPage('driver')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'driver'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">/driver</span>
            </button>

            <button
              onClick={() => setCurrentPage('buyer')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                currentPage === 'buyer'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">/buyer</span>
            </button>
          </nav>

          {/* Right Header Actions: Theme Switcher */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
          </div>
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
      <footer className="border-t border-border/80 py-4 text-center text-xs text-muted-foreground bg-card/40">
        KhetOS (खेतOS) &bull; Built for IIIT-Delhi Hackathon &bull; Multi-Theme Engine Inspired by Otium Uni Hub
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
