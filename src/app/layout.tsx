import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource-variable/fraunces/index.css";
import "@fontsource-variable/inter/index.css";
import "@fontsource/ibm-plex-mono/index.css";
import "./globals.css";
import { BusinessProvider } from "@/contexts/BusinessContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pulso AI - Gestion para microempresas",
    template: "%s | Pulso AI",
  },
  description:
    "Organizacion financiera, operativa y fiscal accesible para microempresas mexicanas.",
  keywords: ["microempresas", "finanzas", "facturas", "SAT", "Mexico", "IA"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  );
}
