import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Palette, Check } from 'lucide-react';

export default function ThemeSwitcher() {
  const { currentThemeId, activeTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/90 hover:bg-secondary text-xs font-medium text-foreground transition shadow-sm active:scale-95"
        title="Switch visual theme"
      >
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: activeTheme.accentColor }}
        />
        <span className="hidden md:inline font-semibold">{activeTheme.name}</span>
        <Palette className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card/95 backdrop-blur-md text-card-foreground shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-2.5 py-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 pb-1.5">
            Select Visual Theme
          </div>

          <div className="max-h-80 overflow-y-auto space-y-1 pt-1">
            {themes.map((t) => {
              const isSelected = t.id === currentThemeId;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                    isSelected
                      ? 'bg-secondary text-foreground font-semibold border border-border/80'
                      : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Preview Color Chips */}
                    <div className="flex items-center gap-0.5 p-1 rounded border border-border bg-background">
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: t.previewColors.bg }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: t.previewColors.primary }}
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: t.previewColors.accent }}
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground line-clamp-1">{t.tagline}</div>
                    </div>
                  </div>

                  {isSelected && <Check className="w-4 h-4 text-primary ml-2 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
