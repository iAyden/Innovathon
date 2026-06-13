"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";

export interface ThemeColors {
  background: string;
  card: string;
  primary: string;
  accent: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  colors: ThemeColors;
  isDark: boolean;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "preset-pulso",
    name: "Esmeralda Pulso",
    colors: {
      background: "#0f1612",
      card: "#18221c",
      primary: "#e8c27e",
      accent: "#1e5c3a",
    },
    isDark: true,
  },
  {
    id: "preset-ocean",
    name: "Océano Real",
    colors: {
      background: "#0b0f19",
      card: "#111827",
      primary: "#3b82f6",
      accent: "#1d4ed8",
    },
    isDark: true,
  },
  {
    id: "preset-ember",
    name: "Brasa Terracota",
    colors: {
      background: "#140f0d",
      card: "#1e1613",
      primary: "#f97316",
      accent: "#c2410c",
    },
    isDark: true,
  },
  {
    id: "preset-amethyst",
    name: "Místico Amatista",
    colors: {
      background: "#0e0c15",
      card: "#171422",
      primary: "#a78bfa",
      accent: "#7c3aed",
    },
    isDark: true,
  },
  {
    id: "preset-obsidian",
    name: "Obsidiana Moderna",
    colors: {
      background: "#0d0d0c",
      card: "#161616",
      primary: "#ffffff",
      accent: "#262626",
    },
    isDark: true,
  },
  {
    id: "preset-mint-light",
    name: "Menta Nórdica (Claro)",
    colors: {
      background: "#f0fdf4",
      card: "#ffffff",
      primary: "#16a34a",
      accent: "#dcfce7",
    },
    isDark: false,
  },
];

interface ThemeContextType {
  activeThemeId: string;
  customColors: ThemeColors;
  activeColors: ThemeColors;
  setPresetTheme: (presetId: string) => void;
  setCustomThemeColors: (colors: Partial<ThemeColors>) => void;
  saveTheme: () => void;
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Helper to calculate relative luminance/brightness of a hex color
export function getBrightness(hex: string): number {
  const c = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else if (c.length === 6) {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }
  return (r * 299 + g * 587 + b * 114) / 1000;
}

export function getContrastColor(hex: string): string {
  return getBrightness(hex) > 130 ? "#0f172a" : "#efeee6";
}

// Injects variables into the DOM
export function applyThemeVars(colors: ThemeColors) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;

  // 1. Set key custom properties
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--popover", colors.card);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--secondary", colors.accent);

  // 2. Set text colors
  const fg = getContrastColor(colors.background);
  const cardFg = getContrastColor(colors.card);
  const primFg = getContrastColor(colors.primary);
  const accFg = getContrastColor(colors.accent);

  root.style.setProperty("--foreground", fg);
  root.style.setProperty("--card-foreground", cardFg);
  root.style.setProperty("--popover-foreground", cardFg);
  root.style.setProperty("--primary-foreground", primFg);
  root.style.setProperty("--accent-foreground", accFg);
  root.style.setProperty("--secondary-foreground", accFg);

  // 3. Set borders, inputs, and muted states based on card background brightness
  const isLight = getBrightness(colors.card) > 130;
  if (isLight) {
    root.style.setProperty("--border", "rgba(15, 23, 42, 0.08)");
    root.style.setProperty("--input", "rgba(15, 23, 42, 0.08)");
    root.style.setProperty("--muted", "rgba(15, 23, 42, 0.04)");
    root.style.setProperty("--muted-foreground", "rgba(15, 23, 42, 0.55)");
    root.style.setProperty("--secondary", "rgba(15, 23, 42, 0.04)");
  } else {
    root.style.setProperty("--border", "rgba(255, 255, 255, 0.12)");
    root.style.setProperty("--input", "rgba(255, 255, 255, 0.12)");
    root.style.setProperty("--muted", "rgba(255, 255, 255, 0.06)");
    root.style.setProperty("--muted-foreground", "rgba(255, 255, 255, 0.6)");
    root.style.setProperty("--secondary", "rgba(255, 255, 255, 0.06)");
  }

  // 4. Sync sidebar
  root.style.setProperty("--sidebar", colors.card);
  root.style.setProperty("--sidebar-foreground", cardFg);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-primary-foreground", primFg);
  root.style.setProperty("--sidebar-accent", colors.accent);
  root.style.setProperty("--sidebar-accent-foreground", accFg);
  root.style.setProperty("--sidebar-border", isLight ? "rgba(15, 23, 42, 0.08)" : "rgba(255, 255, 255, 0.12)");
  root.style.setProperty("--sidebar-ring", colors.primary);
  root.style.setProperty("--ring", colors.primary);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { activeBusiness, updateBusiness } = useBusiness();
  const [activeThemeId, setActiveThemeId] = useState<string>("preset-pulso");
  const [customColors, setCustomColors] = useState<ThemeColors>({
    background: "#0f1612",
    card: "#18221c",
    primary: "#e8c27e",
    accent: "#1e5c3a",
  });

  // Calculate which colors are active currently
  const preset = THEME_PRESETS.find((p) => p.id === activeThemeId);
  const activeColors = preset ? preset.colors : customColors;

  // Load theme from active business settings whenever the business changes
  useEffect(() => {
    if (!activeBusiness) {
      // If no active business (Global Hub), restore default theme
      setActiveThemeId("preset-pulso");
      applyThemeVars(THEME_PRESETS[0].colors);
      return;
    }

    const savedTheme = activeBusiness.settings?.theme;
    if (savedTheme) {
      if (savedTheme.id === "custom" && savedTheme.colors) {
        setActiveThemeId("custom");
        setCustomColors(savedTheme.colors);
        applyThemeVars(savedTheme.colors);
      } else {
        const matchingPreset = THEME_PRESETS.find((p) => p.id === savedTheme.id);
        if (matchingPreset) {
          setActiveThemeId(matchingPreset.id);
          applyThemeVars(matchingPreset.colors);
        } else {
          setActiveThemeId("preset-pulso");
          applyThemeVars(THEME_PRESETS[0].colors);
        }
      }
    } else {
      // Default emerald theme
      setActiveThemeId("preset-pulso");
      applyThemeVars(THEME_PRESETS[0].colors);
    }
  }, [activeBusiness]);

  // Apply theme changes to DOM for live preview
  useEffect(() => {
    applyThemeVars(activeColors);
  }, [activeColors, activeThemeId]);

  const setPresetTheme = (presetId: string) => {
    setActiveThemeId(presetId);
  };

  const setCustomThemeColors = (colors: Partial<ThemeColors>) => {
    setActiveThemeId("custom");
    setCustomColors((prev) => {
      const next = { ...prev, ...colors };
      return next;
    });
  };

  const saveTheme = () => {
    if (!activeBusiness) return;

    const themeSetting = {
      id: activeThemeId,
      colors: activeThemeId === "custom" ? customColors : activeColors,
    };

    const updatedBusiness = {
      ...activeBusiness,
      settings: {
        ...activeBusiness.settings,
        theme: themeSetting,
      },
    };

    updateBusiness(updatedBusiness);
    
    // Write directly to local storage for the organization theme (used by the raw head script)
    localStorage.setItem(`pulso_theme_${activeBusiness.id}`, JSON.stringify(themeSetting));
  };

  const resetTheme = () => {
    setActiveThemeId("preset-pulso");
    setCustomColors(THEME_PRESETS[0].colors);
    applyThemeVars(THEME_PRESETS[0].colors);
    
    if (activeBusiness) {
      const updatedBusiness = {
        ...activeBusiness,
        settings: {
          ...activeBusiness.settings,
          theme: { id: "preset-pulso", colors: THEME_PRESETS[0].colors },
        },
      };
      updateBusiness(updatedBusiness);
      localStorage.setItem(`pulso_theme_${activeBusiness.id}`, JSON.stringify({ id: "preset-pulso", colors: THEME_PRESETS[0].colors }));
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        activeThemeId,
        customColors,
        activeColors,
        setPresetTheme,
        setCustomThemeColors,
        saveTheme,
        resetTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
