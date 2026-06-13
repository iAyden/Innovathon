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
  const [fontSize, setFontSize] = React.useState<FontSize>(() => {
    if (typeof window === "undefined") return "normal";
    return localStorage.getItem("a11y-font-size") === "large"
      ? "large"
      : "normal";
  });
  const [contrast, setContrast] = React.useState<Contrast>(() => {
    if (typeof window === "undefined") return "normal";
    return localStorage.getItem("a11y-contrast") === "high"
      ? "high"
      : "normal";
  });

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
