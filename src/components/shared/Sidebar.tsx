"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import {
  Activity,
  Building2,
  FileText,
  LayoutDashboard,
  Sparkles,
  ChevronDown,
  Settings,
  Package,
  ShoppingCart,
  Truck,
  CircleDollarSign,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useBusiness, type ModuleType } from "@/contexts/BusinessContext";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  moduleSlug?: string;
};

// Rutas relativas, el orgId se antepondrá dinámicamente
export const dashboardNavItems: NavItem[] = [
  { title: "Panel de control", href: "", icon: LayoutDashboard },
  { title: "Flujo de caja", href: "/cash-flow", icon: Activity, moduleSlug: "cash-flow" },
  { title: "Facturas", href: "/invoices", icon: FileText, moduleSlug: "invoices" },
  { title: "Proveedores", href: "/providers", icon: Truck, moduleSlug: "providers" },
  { title: "Inventario", href: "/inventory", icon: Package, moduleSlug: "inventory" },
  { title: "Pedidos", href: "/orders", icon: ShoppingCart, moduleSlug: "orders" },
  {
    title: "Cuentas por cobrar",
    href: "/accounts-receivable",
    icon: CircleDollarSign,
    moduleSlug: "accounts-receivable",
  },
];

import { useState } from "react";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside className="hidden h-full w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="flex flex-col px-4 py-4 gap-4">
        <Link
          href={`/dashboard/${orgId}`}
          className="flex h-20 items-center px-1"
          aria-label="Ir al panel de Pulso AI"
        >
          <Image
            src="/brand/pulso-logo-horizontal-v2.png"
            alt="Pulso AI"
            width={80}
            height={50}
            className="h-16 w-56 object-contain object-left"
            priority
          />
        </Link>
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
          // Si el item es 'Inicio', 'Perfil', 'Personalizar', 'Modulos' o 'Integraciones', siempre se muestra.
          if (item.href === "" || item.href === "/profile" || item.href === "/theme" || item.href === "/modules" || item.href === "/integrations") return true;
          // Si no, verificamos que el módulo esté activo para este negocio
          const moduleKey = item.moduleSlug || item.href.replace("/", "");
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
        
        {/* Settings Toggle */}
        <div className="mb-2">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              Configuracion
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen ? "rotate-180" : "")} />
          </button>
          
          {settingsOpen && (
            <div className="mt-1 flex flex-col pl-9 space-y-1">
              <Link
                href={`/dashboard/${orgId}/theme`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname.startsWith(`/dashboard/${orgId}/theme`) && "bg-muted text-foreground font-medium"
                )}
              >
                Personalizar Pulso
              </Link>
              <Link
                href={`/dashboard/${orgId}/functions`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname.startsWith(`/dashboard/${orgId}/functions`) && "bg-muted text-foreground font-medium"
                )}
              >
                Funciones
              </Link>
              <Link
                href={`/dashboard/${orgId}/modules`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname.startsWith(`/dashboard/${orgId}/modules`) && "bg-muted text-foreground font-medium"
                )}
              >
                Módulos
              </Link>
              <Link
                href={`/dashboard/${orgId}/integrations`}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  pathname.startsWith(`/dashboard/${orgId}/integrations`) && "bg-muted text-foreground font-medium"
                )}
              >
                Integraciones
              </Link>
            </div>
          )}
        </div>


      </div>
    </aside>
  );
}
