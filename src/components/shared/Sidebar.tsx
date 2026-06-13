"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Wallet,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { title: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { title: "Facturas", href: "/dashboard/invoices", icon: FileText },
  { title: "Reportes", href: "/dashboard/reports", icon: BarChart3 },
  { title: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-border bg-card h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
          <Wallet className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">FinFlow</span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade section */}
      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        <div className="rounded-lg border border-border bg-muted/50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">FinFlow Pro</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Desbloquea reportes avanzados y automatización con IA.
          </p>
          <button className="w-full text-xs font-medium bg-primary text-primary-foreground rounded-md py-2 hover:bg-primary/90 transition-colors">
            Actualizar Plan
          </button>
        </div>
      </div>
    </aside>
  );
}
