import React, { createContext, useContext, useState, useEffect } from 'react';
import { THEMES, DEFAULT_THEME_ID, getThemeById } from '../lib/themes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    return localStorage.getItem('khetos_theme') || DEFAULT_THEME_ID;
  });

  const activeTheme = getThemeById(currentThemeId);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Apply data-theme attribute directly to both html and body
    root.setAttribute('data-theme', activeTheme.id);
    if (body) {
      body.setAttribute('data-theme', activeTheme.id);
    }

    // Toggle dark class
    if (activeTheme.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('khetos_theme', activeTheme.id);
  }, [activeTheme]);

  const toggleTheme = () => {
    const themeIds = THEMES.map((t) => t.id);
    const currentIndex = themeIds.indexOf(currentThemeId);
    const nextIndex = (currentIndex + 1) % themeIds.length;
    setCurrentThemeId(themeIds[nextIndex]);
  };

  const setTheme = (themeId) => {
    setCurrentThemeId(themeId);
  };

  return (
    <ThemeContext.Provider value={{ currentThemeId, activeTheme, setTheme, toggleTheme, themes: THEMES }}>
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
