"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Building2, ChevronDown, Menu, WalletCards, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusiness, type ModuleType } from "@/contexts/BusinessContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { dashboardNavItems } from "./Sidebar";

import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles } from "lucide-react";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams();
  const orgId = params.orgId as string;
  const { activeBusiness, businesses } = useBusiness();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="lg:hidden" />}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-6 py-5">
          <SheetTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <WalletCards className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Pulso AI</span>
          </SheetTitle>
        </SheetHeader>
        <div className="px-4 py-4">
          {/* Workspace Switcher MOCK */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors w-full text-left">
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                  <Building2 className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="text-sm font-semibold truncate max-w-[120px]">{activeBusiness?.name || "Cargando..."}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Tus Negocios</DropdownMenuLabel>
              {businesses.map((business) => (
                <DropdownMenuItem key={business.id} onClick={() => router.push(`/dashboard/${business.id}`)}>
                  {business.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  router.push("/onboarding");
                  setOpen(false);
                }}
                className="cursor-pointer text-primary"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Nuevo Negocio (IA)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <Separator />
        <nav className="space-y-1 px-3 py-4 flex-1">
          {dashboardNavItems.filter((item) => {
            if (item.href === "" || item.href === "/profile" || item.href === "/theme" || item.href === "/modules") return true;
            const moduleKey = item.href.replace("/", "");
            return activeBusiness?.activeModules.includes(moduleKey as any);
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
                onClick={() => setOpen(false)}
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
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    pathname.startsWith(`/dashboard/${orgId}/theme`) && "bg-muted text-foreground font-medium"
                  )}
                >
                  Personalizar Pulso
                </Link>
              </div>
            )}
          </div>


        </div>
      </SheetContent>
    </Sheet>
  );
}
