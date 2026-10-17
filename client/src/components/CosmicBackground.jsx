import React from 'react';

/**
 * CosmicBackground - Replicates Credentia's cosmic obsidian atmosphere:
 * 1. Deep Void base (#080A19)
 * 2. Three ambient radial breathing blur orbs (Emerald #10b981, Amber Gold #f59e0b, Cosmic Indigo #818cf8)
 * 3. Starfield micro-dot grid
 * 4. Perspective 3D cyber grid horizon (rotateX(62deg)) with vanishing line horizon laser glow
 */
export default function CosmicBackground() {
  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none -z-10 select-none"
      aria-hidden="true"
    >
      {/* 1. Starfield Micro-Dot Grid */}
      <div className="absolute inset-0 starfield-micro-dots opacity-60" />

      {/* 2. Three Ambient Radial Blur Orbs */}
      {/* Orb 1: Electric Agri Emerald (Top-Left / Center) */}
      <div 
        className="absolute -top-24 left-[10%] w-[480px] h-[480px] rounded-full bg-[#10b981] opacity-20 blur-[130px] animate-orb-emerald pointer-events-none" 
      />

      {/* Orb 2: Amber Gold (Mid-Right / Lower-Center) */}
      <div 
        className="absolute top-80 -right-20 w-[420px] h-[420px] rounded-full bg-[#f59e0b] opacity-15 blur-[140px] animate-orb-amber pointer-events-none" 
      />

      {/* Orb 3: Cosmic Indigo (Top-Right) */}
      <div 
        className="absolute -top-32 right-[5%] w-[520px] h-[520px] rounded-full bg-[#818cf8] opacity-18 blur-[130px] animate-orb-indigo pointer-events-none" 
      />

      {/* 3. Perspective 3D Cyber Grid Horizon */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[480px] overflow-hidden"
        style={{ perspective: '600px' }}
      >
        {/* Cyber Grid Plane tilted at 62deg */}
        <div 
          className="w-[160%] -left-[30%] absolute bottom-[-40px] h-[560px] cosmic-cyber-grid"
        />

        {/* Horizon Laser Glow Beam along the vanishing line */}
        <div 
          className="absolute top-[80px] inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#10b981] via-[#818cf8] to-transparent opacity-85 shadow-[0_0_24px_4px_rgba(16,185,129,0.75)]"
        />

        {/* Atmospheric horizon fade to blend into the obsidian void */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080A19] via-transparent to-[#080A19]/90" />
      </div>
    </div>
  );
}
