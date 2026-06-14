import type { Metadata } from "next";
import "@fontsource-variable/fraunces/index.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/ibm-plex-mono/index.css";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: {
    default: "Pulso AI - Gestion para microempresas",
    template: "%s | Pulso AI",
  },
  description:
    "Organizacion financiera, operativa y fiscal accesible para microempresas mexicanas.",
  keywords: ["microempresas", "finanzas", "facturas", "SAT", "Mexico", "IA"],
  icons: {
    icon: "/brand/pulso-icon.png",
    shortcut: "/brand/pulso-icon.png",
    apple: "/brand/pulso-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const getBrightness = (hex) => {
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
                  };

                  const getContrastColor = (hex) => {
                    return getBrightness(hex) > 130 ? "#0f172a" : "#efeee6";
                  };

                  let orgId = null;
                  const path = window.location.pathname;
                  const match = path.match(/\\/dashboard\\/([^\\/]+)/);
                  if (match) orgId = match[1];

                  if (orgId) {
                    const saved = localStorage.getItem("pulso_theme_" + orgId);
                    if (saved) {
                      const theme = JSON.parse(saved);
                      const colors = theme.colors;
                      if (colors) {
                        const root = document.documentElement;
                        root.style.setProperty("--background", colors.background);
                        root.style.setProperty("--card", colors.card);
                        root.style.setProperty("--popover", colors.card);
                        root.style.setProperty("--primary", colors.primary);
                        root.style.setProperty("--accent", colors.accent);
                        root.style.setProperty("--secondary", colors.accent);

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
                    }
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <BusinessProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </BusinessProvider>
      </body>
    </html>
  );
}
