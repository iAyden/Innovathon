"use client";

import React, { useState } from "react";
import { useTheme, THEME_PRESETS, getContrastColor, getBrightness, ThemeColors } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette, Save, RotateCcw, Check, Sparkles, Building2, LayoutDashboard, CreditCard, ArrowUpRight } from "lucide-react";

export function ThemeClient() {
  const {
    activeThemeId,
    customColors,
    activeColors,
    setPresetTheme,
    setCustomThemeColors,
    saveTheme,
    resetTheme,
  } = useTheme();

  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Local inputs state for typing hex colors manually
  const [bgInput, setBgInput] = useState(activeColors.background);
  const [cardInput, setCardInput] = useState(activeColors.card);
  const [primaryInput, setPrimaryInput] = useState(activeColors.primary);
  const [accentInput, setAccentInput] = useState(activeColors.accent);

  // Synchronize inputs when preset or parent color state changes
  React.useEffect(() => {
    setBgInput(activeColors.background);
    setCardInput(activeColors.card);
    setPrimaryInput(activeColors.primary);
    setAccentInput(activeColors.accent);
  }, [activeColors]);

  const handleHexChange = (key: keyof ThemeColors, value: string) => {
    let sanitized = value.trim();
    if (sanitized && !sanitized.startsWith("#")) {
      sanitized = "#" + sanitized;
    }
    if (sanitized.length > 7) {
      sanitized = sanitized.substring(0, 7);
    }

    if (key === "background") setBgInput(sanitized);
    else if (key === "card") setCardInput(sanitized);
    else if (key === "primary") setPrimaryInput(sanitized);
    else if (key === "accent") setAccentInput(sanitized);

    // If it's a valid hex, update customThemeColors globally
    if (/^#[0-9A-Fa-f]{6}$/.test(sanitized)) {
      setCustomThemeColors({ [key]: sanitized });
    }
  };

  const handlePickerChange = (key: keyof ThemeColors, value: string) => {
    if (key === "background") setBgInput(value);
    else if (key === "card") setCardInput(value);
    else if (key === "primary") setPrimaryInput(value);
    else if (key === "accent") setAccentInput(value);

    setCustomThemeColors({ [key]: value });
  };

  const handleBlur = (key: keyof ThemeColors) => {
    const currentActive = activeColors[key];
    if (key === "background" && !/^#[0-9A-Fa-f]{6}$/.test(bgInput)) setBgInput(currentActive);
    else if (key === "card" && !/^#[0-9A-Fa-f]{6}$/.test(cardInput)) setCardInput(currentActive);
    else if (key === "primary" && !/^#[0-9A-Fa-f]{6}$/.test(primaryInput)) setPrimaryInput(currentActive);
    else if (key === "accent" && !/^#[0-9A-Fa-f]{6}$/.test(accentInput)) setAccentInput(currentActive);
  };

  const handleSave = () => {
    setIsSaving(true);
    setSavedMessage(null);
    
    // Simulate minor save latency for premium feel
    setTimeout(() => {
      saveTheme();
      setIsSaving(false);
      setSavedMessage("¡Apariencia guardada correctamente para esta organización!");
      
      // Auto-hide alert after 4 seconds
      setTimeout(() => {
        setSavedMessage(null);
      }, 4000);
    }, 600);
  };

  const handleReset = () => {
    resetTheme();
    setSavedMessage("Tema restablecido a los valores por defecto.");
    setTimeout(() => {
      setSavedMessage(null);
    }, 3000);
  };

  // Derive contrast colors for mockup preview
  const bgText = getContrastColor(activeColors.background);
  const cardText = getContrastColor(activeColors.card);
  const cardBorder = getBrightness(activeColors.card) > 130 
    ? "rgba(15, 23, 42, 0.08)" 
    : "rgba(255, 255, 255, 0.12)";
  
  const mockMutedText = getBrightness(activeColors.card) > 130 
    ? "rgba(15, 23, 42, 0.55)" 
    : "rgba(255, 255, 255, 0.6)";

  const mockBadgeBg = activeColors.accent;
  const mockBadgeText = getContrastColor(activeColors.accent);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Personalizar Apariencia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajusta los colores corporativos de tu panel o crea tu propia paleta de 4 colores. Las fuentes y contrastes se adaptarán automáticamente.
          </p>
        </div>
      </div>

      {savedMessage && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3.5 text-sm text-foreground flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Main Grid: Controls vs Preview */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Controls Section (8 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Presets Card */}
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Paletas Predefinidas</CardTitle>
              <CardDescription>Selecciona un tema curado por diseñadores para Pulso AI.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {THEME_PRESETS.map((preset) => {
                  const isActive = activeThemeId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => setPresetTheme(preset.id)}
                      className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${
                        isActive
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border bg-card hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-semibold">{preset.name}</span>
                        {isActive && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      {/* Colors preview row */}
                      <div className="mt-4 flex gap-1.5 items-center">
                        <span className="text-xs text-muted-foreground mr-1.5">Colores:</span>
                        <div className="flex -space-x-1.5 overflow-hidden">
                          <span
                            className="inline-block h-6 w-6 rounded-full border border-card shadow-sm"
                            style={{ backgroundColor: preset.colors.background }}
                            title="Fondo"
                          />
                          <span
                            className="inline-block h-6 w-6 rounded-full border border-card shadow-sm"
                            style={{ backgroundColor: preset.colors.card }}
                            title="Tarjeta"
                          />
                          <span
                            className="inline-block h-6 w-6 rounded-full border border-card shadow-sm"
                            style={{ backgroundColor: preset.colors.primary }}
                            title="Primario"
                          />
                          <span
                            className="inline-block h-6 w-6 rounded-full border border-card shadow-sm"
                            style={{ backgroundColor: preset.colors.accent }}
                            title="Acento"
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({preset.isDark ? "Oscuro" : "Claro"})
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Custom Theme Card */}
          <Card className="border border-border/40 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                Creador de Paleta Personalizada
                <span className="rounded-full bg-primary/10 text-primary text-[10px] px-2 py-0.5 font-medium">4 Colores</span>
              </CardTitle>
              <CardDescription>Crea un tema único. Ajusta cada color y observa el preview en tiempo real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              
              {/* Color inputs list */}
              <div className="grid gap-4 sm:grid-cols-2">
                
                {/* 1. Background */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80">1. Color de Fondo</label>
                  <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                    {/* Circle picker */}
                    <div
                      className="h-7 w-7 rounded-full border border-border shrink-0 shadow-sm relative cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: activeColors.background }}
                    >
                      <input
                        type="color"
                        value={activeColors.background}
                        onChange={(e) => handlePickerChange("background", e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Hex input */}
                    <input
                      type="text"
                      value={bgInput}
                      onChange={(e) => handleHexChange("background", e.target.value)}
                      onBlur={() => handleBlur("background")}
                      className="bg-transparent text-xs font-mono uppercase border-none focus:outline-none focus:ring-0 p-0 text-foreground w-20"
                      maxLength={7}
                    />
                    <span className="text-[10px] text-muted-foreground ml-auto select-none">Fondo general</span>
                  </div>
                </div>

                {/* 2. Card */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80">2. Color de Tarjetas</label>
                  <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                    {/* Circle picker */}
                    <div
                      className="h-7 w-7 rounded-full border border-border shrink-0 shadow-sm relative cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: activeColors.card }}
                    >
                      <input
                        type="color"
                        value={activeColors.card}
                        onChange={(e) => handlePickerChange("card", e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Hex input */}
                    <input
                      type="text"
                      value={cardInput}
                      onChange={(e) => handleHexChange("card", e.target.value)}
                      onBlur={() => handleBlur("card")}
                      className="bg-transparent text-xs font-mono uppercase border-none focus:outline-none focus:ring-0 p-0 text-foreground w-20"
                      maxLength={7}
                    />
                    <span className="text-[10px] text-muted-foreground ml-auto select-none">Paneles e items</span>
                  </div>
                </div>

                {/* 3. Primary Accent */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80">3. Color Primario</label>
                  <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                    {/* Circle picker */}
                    <div
                      className="h-7 w-7 rounded-full border border-border shrink-0 shadow-sm relative cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: activeColors.primary }}
                    >
                      <input
                        type="color"
                        value={activeColors.primary}
                        onChange={(e) => handlePickerChange("primary", e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Hex input */}
                    <input
                      type="text"
                      value={primaryInput}
                      onChange={(e) => handleHexChange("primary", e.target.value)}
                      onBlur={() => handleBlur("primary")}
                      className="bg-transparent text-xs font-mono uppercase border-none focus:outline-none focus:ring-0 p-0 text-foreground w-20"
                      maxLength={7}
                    />
                    <span className="text-[10px] text-muted-foreground ml-auto select-none">Botones primarios</span>
                  </div>
                </div>

                {/* 4. Secondary Accent */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80">4. Color de Acento</label>
                  <div className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
                    {/* Circle picker */}
                    <div
                      className="h-7 w-7 rounded-full border border-border shrink-0 shadow-sm relative cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: activeColors.accent }}
                    >
                      <input
                        type="color"
                        value={activeColors.accent}
                        onChange={(e) => handlePickerChange("accent", e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Hex input */}
                    <input
                      type="text"
                      value={accentInput}
                      onChange={(e) => handleHexChange("accent", e.target.value)}
                      onBlur={() => handleBlur("accent")}
                      className="bg-transparent text-xs font-mono uppercase border-none focus:outline-none focus:ring-0 p-0 text-foreground w-20"
                      maxLength={7}
                    />
                    <span className="text-[10px] text-muted-foreground ml-auto select-none">Badges y detalles</span>
                  </div>
                </div>

              </div>

              {/* Warning/Info alert about automatic contrast */}
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">💡 Tip inteligente: </span> 
                No te preocupes por el color del texto. Nuestro motor calcula la legibilidad en tiempo real para evitar textos invisibles.
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              className="px-6 flex items-center gap-2"
              disabled={isSaving}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Guardar Paleta"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="px-4 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restablecer
            </Button>
          </div>

        </div>

        {/* Preview Section (5 Columns) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold tracking-wider uppercase text-muted-foreground">Vista Previa Interactiva</h2>
            <span className="text-xs rounded-full border px-2.5 py-0.5 bg-muted font-medium text-foreground">Mockup Reactivo</span>
          </div>

          {/* Interactive Mock Dashboard */}
          <div 
            className="w-full rounded-2xl border border-border/80 shadow-lg overflow-hidden transition-all duration-300 flex flex-col h-[480px]"
            style={{ 
              backgroundColor: activeColors.background, 
              color: bgText 
            }}
          >
            {/* Mock Header/Window bar */}
            <div className="h-8 border-b flex items-center px-4 gap-1.5 bg-card/40 shrink-0" style={{ borderColor: cardBorder }}>
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-[10px] text-muted-foreground ml-auto font-medium tracking-tight">Pulso AI - Dashboard Preview</span>
            </div>

            {/* Mock Layout Body */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Mock Sidebar */}
              <div 
                className="w-[120px] border-r flex flex-col p-2 gap-3 shrink-0"
                style={{ 
                  backgroundColor: activeColors.card, 
                  borderColor: cardBorder
                }}
              >
                {/* Logo mock */}
                <div className="flex items-center gap-1.5 px-1 pb-1">
                  <div className="h-5 w-5 rounded bg-primary flex items-center justify-center shrink-0" style={{ backgroundColor: activeColors.primary }}>
                    <Building2 className="h-3 w-3" style={{ color: getContrastColor(activeColors.primary) }} />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight truncate" style={{ color: getContrastColor(activeColors.card) }}>Mi Negocio</span>
                </div>

                {/* Nav links */}
                <div className="space-y-1">
                  {/* Link 1 (Active) */}
                  <div 
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-semibold"
                    style={{ 
                      backgroundColor: activeColors.primary, 
                      color: getContrastColor(activeColors.primary) 
                    }}
                  >
                    <LayoutDashboard className="h-2.5 w-2.5 shrink-0" />
                    <span>Inicio</span>
                  </div>
                  {/* Link 2 */}
                  <div 
                    className="flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-medium"
                    style={{ color: getContrastColor(activeColors.card) }}
                  >
                    <CreditCard className="h-2.5 w-2.5 shrink-0 opacity-70" />
                    <span className="opacity-70">Facturas</span>
                  </div>
                </div>

                {/* Footer mock banner */}
                <div 
                  className="mt-auto p-1.5 rounded text-[8px] border"
                  style={{ 
                    backgroundColor: activeColors.background, 
                    borderColor: cardBorder,
                    color: bgText
                  }}
                >
                  <p className="font-semibold" style={{ color: activeColors.primary }}>Pulso AI</p>
                  <p className="opacity-60 scale-90 origin-left">Premium Activo</p>
                </div>
              </div>

              {/* Mock Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* Mock Topbar */}
                <div 
                  className="h-10 border-b px-4 flex items-center justify-between shrink-0"
                  style={{ 
                    backgroundColor: activeColors.card, 
                    borderColor: cardBorder
                  }}
                >
                  <div className="h-4 w-24 bg-background/50 rounded" style={{ backgroundColor: activeColors.background + "80" }} />
                  
                  {/* Avatar bubble */}
                  <div className="h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ backgroundColor: activeColors.primary, color: getContrastColor(activeColors.primary) }}>
                    PA
                  </div>
                </div>

                {/* Mock Workspace Content */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  
                  {/* Header mock */}
                  <div className="space-y-0.5">
                    <h3 className="text-[11px] font-bold" style={{ color: bgText }}>Panel de Control</h3>
                    <p className="text-[8px] opacity-70" style={{ color: bgText }}>Evolución fiscal y gastos de tu negocio</p>
                  </div>

                  {/* KPI card */}
                  <div 
                    className="rounded-lg border p-2.5 space-y-1.5 shadow-sm"
                    style={{ 
                      backgroundColor: activeColors.card, 
                      borderColor: cardBorder, 
                      color: cardText 
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[9px]" style={{ color: mockMutedText }}>Gastos del Mes</span>
                      <CreditCard className="h-3 w-3 opacity-60" style={{ color: activeColors.primary }} />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-bold">$14,500.00 MXN</span>
                      <span 
                        className="text-[8px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0"
                        style={{ backgroundColor: mockBadgeBg, color: mockBadgeText }}
                      >
                        <ArrowUpRight className="h-2 w-2" />
                        +8%
                      </span>
                    </div>
                  </div>

                  {/* Chart Mock */}
                  <div 
                    className="rounded-lg border p-2.5 space-y-2.5"
                    style={{ 
                      backgroundColor: activeColors.card, 
                      borderColor: cardBorder, 
                      color: cardText 
                    }}
                  >
                    <span className="text-[9px]" style={{ color: mockMutedText }}>Flujo de Caja Mensual</span>
                    {/* Columns mock */}
                    <div className="h-16 flex items-end justify-between px-1 gap-2 pt-2">
                      <div className="w-full rounded bg-primary" style={{ height: "45%", backgroundColor: activeColors.primary, opacity: 0.6 }} />
                      <div className="w-full rounded bg-primary" style={{ height: "70%", backgroundColor: activeColors.primary, opacity: 0.8 }} />
                      <div className="w-full rounded bg-primary" style={{ height: "55%", backgroundColor: activeColors.primary, opacity: 0.7 }} />
                      <div className="w-full rounded bg-primary" style={{ height: "95%", backgroundColor: activeColors.primary }} />
                    </div>
                  </div>

                  {/* Primary & secondary action preview */}
                  <div className="flex items-center gap-2 pt-1">
                    <button 
                      className="flex-1 rounded py-1 px-2 text-[9px] font-semibold shadow-sm transition-opacity"
                      style={{ 
                        backgroundColor: activeColors.primary, 
                        color: getContrastColor(activeColors.primary) 
                      }}
                    >
                      Acción Principal
                    </button>
                    <button 
                      className="flex-1 rounded py-1 px-2 text-[9px] font-medium border transition-opacity"
                      style={{ 
                        backgroundColor: "transparent", 
                        borderColor: cardBorder,
                        color: bgText
                      }}
                    >
                      Cancelar
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
