import React, { useState, useEffect } from 'react';

/**
 * ScrollProgress — Hairline progress bar at the top of the viewport
 * Tracks page scroll percentage dynamically using theme-aware semantic tokens.
 */
export default function ScrollProgress() {
  const [scroll, setScroll] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScroll(total > 0 ? (window.scrollY / total) * 100 : 0);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[2.5px] z-50 pointer-events-none bg-transparent">
      <div 
        className="h-full bg-primary transition-all duration-75 shadow-xs"
        style={{ width: `${scroll}%` }}
      />
    </div>
  );
}
