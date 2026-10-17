import React from 'react';

/**
 * TopLaserBar - Credentia-inspired 3px glowing progress laser bar
 * Fixed across the very top of the viewport with a fluid 60fps shimmer
 * and multi-stop gradient (Emerald -> Indigo -> Amber Gold -> Emerald).
 */
export default function TopLaserBar() {
  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none overflow-visible"
      aria-hidden="true"
    >
      {/* Primary 3px Laser Bar with multi-stop gradient & glowing drop-shadow */}
      <div className="w-full h-full laser-progress-bar relative">
        {/* Soft atmospheric light spill below the laser beam */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-emerald-500/15 via-indigo-500/5 to-transparent blur-sm pointer-events-none" />
      </div>
    </div>
  );
}
