import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { RoleProvider } from './context/RoleContext';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import CallSimulator from './pages/CallSimulator';

import AuthPage from './pages/AuthPage';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <ThemeProvider>
      <RoleProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-200">
            {/* Global Sticky Navigation */}
            <Navbar />

            {/* Dynamic Application Routing */}
            <main className="flex-1 pb-16">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/call" element={<CallSimulator />} />
                  <Route path="/login" element={<AuthPage initialTab="signin" />} />
                  <Route path="/register" element={<AuthPage initialTab="driver" />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ErrorBoundary>
            </main>

            {/* Professional Footer */}
            <footer className="border-t border-border bg-card/60 py-6 text-center text-xs text-muted-fg">
              <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">KhetOS (खेतOS)</span>
                  <span>&bull;</span>
                  <span>The Farm-Gate Operating System</span>
                </div>
                <p className="text-[11px]">
                  Built for Bharat Smallholders &bull; ICAR Standards &bull; Zero App Requirement
                </p>
              </div>
            </footer>
          </div>
        </BrowserRouter>
      </RoleProvider>
    </ThemeProvider>
  );
}
