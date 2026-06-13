"use client";

import * as React from "react";

type FontSize = "normal" | "large";
type Contrast = "normal" | "high";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  contrast: Contrast;
  setContrast: (contrast: Contrast) => void;
}

const AccessibilityContext = React.createContext<AccessibilityContextType | undefined>(
  undefined
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [fontSize, setFontSize] = React.useState<FontSize>("normal");
  const [contrast, setContrast] = React.useState<Contrast>("normal");

  // Load from localStorage on mount
  React.useEffect(() => {
    const savedFontSize = localStorage.getItem("a11y-font-size") as FontSize;
    const savedContrast = localStorage.getItem("a11y-contrast") as Contrast;
    
    if (savedFontSize) setFontSize(savedFontSize);
    if (savedContrast) setContrast(savedContrast);
  }, []);

  // Apply classes to HTML element when state changes
  React.useEffect(() => {
    const html = document.documentElement;
    
    // Handle Font Size
    if (fontSize === "large") {
      html.classList.add("text-large");
    } else {
      html.classList.remove("text-large");
    }
    localStorage.setItem("a11y-font-size", fontSize);

    // Handle Contrast
    if (contrast === "high") {
      html.classList.add("high-contrast");
    } else {
      html.classList.remove("high-contrast");
    }
    localStorage.setItem("a11y-contrast", contrast);
  }, [fontSize, contrast]);

  return (
    <AccessibilityContext.Provider
      value={{ fontSize, setFontSize, contrast, setContrast }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = React.useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
