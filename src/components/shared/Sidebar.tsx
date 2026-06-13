"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Blocks,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  WalletCards,
  Workflow,
} from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const dashboardNavItems: NavItem[] = [
  { title: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { title: "Perfil", href: "/dashboard/profile", icon: Building2 },
  { title: "Modulos", href: "/dashboard/modules", icon: Blocks },
  { title: "Flujo de caja", href: "/dashboard/cash-flow", icon: Activity },
  { title: "Facturas", href: "/dashboard/invoices", icon: FileText },
  { title: "Integraciones", href: "/dashboard/integrations", icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <WalletCards className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold tracking-tight">Pulso AI</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {dashboardNavItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-4">
        <Separator className="mb-4" />
        <Link
          href="/dashboard/profile"
          className="block rounded-lg border border-border bg-muted/50 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Personaliza Pulso</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Completa tu perfil para mejorar modulos y recomendaciones.
          </p>
        </Link>
        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </form>
      </div>
    </aside>
  );
}
