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
    name: "Minimal Dark",
    tagline: "Architectural monochrome: Stark white on deep obsidian black",
    isDark: true,
    accentColor: "#ffffff",
    preview: {
      bg: "#09090b",
      card: "#121215",
      primary: "#ffffff",
      accent: "#27272a",
    },
  },
  {
    id: "sunlight-field",
    name: "Minimal Light",
    tagline: "Clean high-contrast daylight: Deep charcoal on pure white canvas",
    isDark: false,
    accentColor: "#09090b",
    preview: {
      bg: "#fafafa",
      card: "#ffffff",
      primary: "#09090b",
      accent: "#e4e4e7",
    },
  },
  {
    id: "emerald-agri",
    name: "Emerald Agritech",
    tagline: "Botanical agritech: Deep forest green with vibrant leaf mint",
    isDark: true,
    accentColor: "#22c55e",
    preview: {
      bg: "#06160f",
      card: "#0d241a",
      primary: "#22c55e",
      accent: "#eab308",
    },
  },
];

export const DEFAULT_THEME_ID = "dark-mandi";

export function getThemeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
