/**
 * KhetOS - Minimalist Visual Theme System
 * 
 * 1. Minimal Dark: Architectural Obsidian Black & Crisp Stark White
 * 2. Minimal Light: Clean High-Contrast Daylight Canvas
 * 3. Emerald Agritech: Lush Botanical Forest Green & Organic Mint
 */

export const THEMES = [
  {
    id: "dark-mandi",
    name: "Obsidian Mandi",
    tagline: "Cyber-agritech dark mode: Deep obsidian slate with electric emerald highlights",
    isDark: true,
    accentColor: "#10b981",
    preview: {
      bg: "#090d10",
      card: "#11161d",
      primary: "#10b981",
      accent: "#f59e0b",
    },
  },
  {
    id: "sunlight-field",
    name: "Sunlight Field",
    tagline: "Clean daylight canvas: Crisp white surfaces with rich field emerald",
    isDark: false,
    accentColor: "#059669",
    preview: {
      bg: "#f8fafc",
      card: "#ffffff",
      primary: "#059669",
      accent: "#d97706",
    },
  },
  {
    id: "emerald-agri",
    name: "Midnight Botanical",
    tagline: "Lush botanical forest: Midnight pine green with vibrant organic leaf mint",
    isDark: true,
    accentColor: "#22c55e",
    preview: {
      bg: "#04130c",
      card: "#092317",
      primary: "#22c55e",
      accent: "#eab308",
    },
  },
];

export const DEFAULT_THEME_ID = "dark-mandi";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
