import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME, getThemeById } from '../lib/themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    return localStorage.getItem('khetos_theme') || DEFAULT_THEME;
  });

  const activeTheme = getThemeById(currentThemeId);

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply data-theme attribute
    root.setAttribute('data-theme', activeTheme.id);
    
    // Toggle dark class
    if (activeTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Apply all CSS variables dynamically
    Object.entries(activeTheme.cssVariables).forEach(([key, val]) => {
      root.style.setProperty(key, val);
    });

    localStorage.setItem('khetos_theme', activeTheme.id);
  }, [activeTheme]);

  const setTheme = (themeId) => {
    setCurrentThemeId(themeId);
  };

  return (
    <ThemeContext.Provider value={{ currentThemeId, activeTheme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
