import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
