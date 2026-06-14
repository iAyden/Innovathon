"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Activity,
  Blocks,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Sparkles,
  Workflow,
  ChevronDown,
  Palette,
} from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useBusiness, type ModuleType } from "@/contexts/BusinessContext";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

// Rutas relativas, el orgId se antepondrá dinámicamente
export const dashboardNavItems: NavItem[] = [
  { title: "Inicio", href: "", icon: LayoutDashboard },
  { title: "Perfil", href: "/profile", icon: Building2 },
  { title: "Personalizar", href: "/theme", icon: Palette },
  { title: "Modulos", href: "/modules", icon: Blocks },
  { title: "Flujo de caja", href: "/cash-flow", icon: Activity },
  { title: "Facturas", href: "/invoices", icon: FileText },
  { title: "Integraciones", href: "/integrations", icon: Workflow },
];

import { useBusiness } from "@/contexts/BusinessContext";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeBusiness, businesses } = useBusiness();
  const router = useRouter();

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex flex-col px-4 py-4 gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors w-full text-left">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Building2 className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold truncate max-w-[120px]">
                {activeBusiness?.name || "Cargando..."}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[220px]" align="start">
            <DropdownMenuLabel>Mis Negocios</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {businesses.map((business) => (
              <DropdownMenuItem
                key={business.id}
                onClick={() => router.push(`/dashboard/${business.id}`)}
                className="cursor-pointer flex items-center gap-2"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/20">
                  <Building2 className="h-3 w-3 text-primary" />
                </div>
                <span className="truncate">{business.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/onboarding")}
              className="cursor-pointer text-primary"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Nuevo Negocio (IA)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 px-3 py-4">
        {dashboardNavItems.filter((item) => {
          // Si el item es 'Inicio', 'Perfil', 'Personalizar' o 'Modulos', siempre se muestra.
          if (item.href === "" || item.href === "/profile" || item.href === "/theme" || item.href === "/modules") return true;
          // Si no, verificamos que el módulo esté activo para este negocio
          const moduleKey = item.href.replace("/", "");
          return activeBusiness?.activeModules.includes(moduleKey as ModuleType);
        }).map((item) => {
          const fullHref = `/dashboard/${orgId}${item.href}`;
          const active =
            item.href === ""
              ? pathname === `/dashboard/${orgId}`
              : pathname.startsWith(fullHref);
          return (
            <Link
              key={item.href}
              href={fullHref}
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
          href={`/dashboard/${orgId}/profile`}
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
