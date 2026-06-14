"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Building2, ChevronDown, LogOut, Menu, WalletCards } from "lucide-react";
import { logout } from "@/app/auth/actions";
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
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <Building2 className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold truncate max-w-[120px]">{activeBusiness?.name || "Cargando..."}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
        <Separator />
        <nav className="space-y-1 px-3 py-4">
          {dashboardNavItems.filter((item) => {
            if (item.href === "" || item.href === "/profile" || item.href === "/theme" || item.href === "/modules") return true;
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
        <div className="absolute bottom-6 left-0 w-full px-6">
          <form action={logout}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
