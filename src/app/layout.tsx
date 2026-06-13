import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    default: "FinFlow — Gestión Financiera Inteligente",
    template: "%s | FinFlow",
  },
  description:
    "Plataforma SaaS para la gestión inteligente de gastos, facturas y flujo de caja empresarial. Automatiza tu contabilidad con IA.",
  keywords: ["finanzas", "gastos", "facturas", "contabilidad", "SaaS", "IA"],
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
