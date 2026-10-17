import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Check, Palette, Leaf } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeSwitcher() {
  const { currentThemeId, setTheme, activeTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [isOpen]);

  const renderIcon = (themeId) => {
    if (themeId === 'emerald-agri') return <Leaf className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
    if (themeId === 'sunlight-field') return <Sun className="w-3.5 h-3.5 text-foreground shrink-0" />;
    return <Moon className="w-3.5 h-3.5 text-foreground shrink-0" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1-Click Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground text-xs font-semibold shadow-sm transition active:scale-95"
        title="Switch Visual Theme"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0 border border-border"
          style={{ backgroundColor: activeTheme.accentColor }}
        />
        {renderIcon(activeTheme.id)}
        <span className="hidden sm:inline font-bold">{activeTheme.name}</span>
        <Palette className="w-3.5 h-3.5 text-muted-fg shrink-0 ml-0.5" />
      </button>

      {/* Theme Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card text-foreground shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1.5 text-[10px] font-bold text-muted-fg uppercase tracking-widest border-b border-border/60">
            Select Visual Theme
          </div>

          {themes.map((t) => {
            const isSelected = t.id === currentThemeId;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition ${
                  isSelected
                    ? 'bg-secondary text-foreground font-bold border border-border'
                    : 'hover:bg-secondary/60 text-muted-fg hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {/* Color Swatch Preview */}
                  <div className="flex items-center gap-0.5 p-1 rounded-md border border-border bg-background">
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.preview.bg }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.preview.primary }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: t.preview.accent }}
                    />
                  </div>

                  <div>
                    <div className="font-bold text-foreground text-xs">{t.name}</div>
                    <div className="text-[10px] text-muted-fg line-clamp-1">{t.tagline}</div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
