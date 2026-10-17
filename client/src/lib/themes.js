/**
 * KhetOS - Extensible Multi-Theme Architecture (Inspired by Otium Uni Hub)
 * 
 * To add a new theme in the future:
 * 1. Add a new theme object to the THEMES array below with its unique id, name, tagline, and CSS variables.
 * 2. That's it! The ThemeSwitcher and ThemeProvider automatically detect and render it.
 */

export const THEMES = [
  {
    id: "golden-harvest",
    name: "Golden Harvest",
    tagline: "Warm amber & fertile earth tones for modern Indian agronomy",
    isDark: true,
    accentColor: "#f59e0b",
    previewColors: {
      bg: "#0c0d0e",
      card: "#16181b",
      primary: "#f59e0b",
      accent: "#10b981",
      border: "#292c33",
    },
    cssVariables: {
      "--background": "#0c0d0e",
      "--foreground": "#f8fafc",
      "--card": "#16181b",
      "--card-foreground": "#f8fafc",
      "--primary": "#f59e0b",
      "--primary-foreground": "#000000",
      "--secondary": "#22252a",
      "--secondary-foreground": "#f1f5f9",
      "--muted": "#1a1d22",
      "--muted-foreground": "#94a3b8",
      "--accent": "#10b981",
      "--accent-foreground": "#ffffff",
      "--border": "#292c33",
      "--ring": "#f59e0b",
      "--glow-color": "rgba(245, 158, 11, 0.15)",
    },
  },
  {
    id: "emerald-campus",
    name: "Emerald Agritech",
    tagline: "Rich botanical forest greens with clean organic contrast",
    isDark: true,
    accentColor: "#10b981",
    previewColors: {
      bg: "#06140e",
      card: "#0d221a",
      primary: "#10b981",
      accent: "#f59e0b",
      border: "#18382c",
    },
    cssVariables: {
      "--background": "#06140e",
      "--foreground": "#f0fdf4",
      "--card": "#0d221a",
      "--card-foreground": "#f0fdf4",
      "--primary": "#10b981",
      "--primary-foreground": "#022c22",
      "--secondary": "#143126",
      "--secondary-foreground": "#e2e8f0",
      "--muted": "#0a1d15",
      "--muted-foreground": "#6ee7b7",
      "--accent": "#34d399",
      "--accent-foreground": "#064e3b",
      "--border": "#1a4031",
      "--ring": "#10b981",
      "--glow-color": "rgba(16, 185, 129, 0.2)",
    },
  },
  {
    id: "obsidian-cyber",
    name: "Obsidian Cyber",
    tagline: "High-contrast dark grid with electric cyan & teal telemetry",
    isDark: true,
    accentColor: "#06b6d4",
    previewColors: {
      bg: "#09090b",
      card: "#111215",
      primary: "#06b6d4",
      accent: "#22d3ee",
      border: "#27272a",
    },
    cssVariables: {
      "--background": "#09090b",
      "--foreground": "#fafafa",
      "--card": "#111215",
      "--card-foreground": "#fafafa",
      "--primary": "#06b6d4",
      "--primary-foreground": "#09090b",
      "--secondary": "#1c1d22",
      "--secondary-foreground": "#f4f4f5",
      "--muted": "#18181b",
      "--muted-foreground": "#a1a1aa",
      "--accent": "#164e63",
      "--accent-foreground": "#e0f2fe",
      "--border": "#27272a",
      "--ring": "#06b6d4",
      "--glow-color": "rgba(6, 182, 212, 0.15)",
    },
  },
  {
    id: "minimal-daylight",
    name: "Minimal Daylight",
    tagline: "High-visibility clean light mode for bright auditorium projectors",
    isDark: false,
    accentColor: "#0f766e",
    previewColors: {
      bg: "#f8fafc",
      card: "#ffffff",
      primary: "#0f766e",
      accent: "#f59e0b",
      border: "#e2e8f0",
    },
    cssVariables: {
      "--background": "#f8fafc",
      "--foreground": "#0f172a",
      "--card": "#ffffff",
      "--card-foreground": "#0f172a",
      "--primary": "#0f766e",
      "--primary-foreground": "#ffffff",
      "--secondary": "#f1f5f9",
      "--secondary-foreground": "#0f172a",
      "--muted": "#e2e8f0",
      "--muted-foreground": "#64748b",
      "--accent": "#0d9488",
      "--accent-foreground": "#ffffff",
      "--border": "#cbd5e1",
      "--ring": "#0f766e",
      "--glow-color": "rgba(15, 118, 110, 0.1)",
    },
  },
];

export const DEFAULT_THEME = "golden-harvest";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
