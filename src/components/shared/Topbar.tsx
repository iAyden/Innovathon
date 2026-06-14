"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Bell } from "lucide-react";
import { logout } from "@/app/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./MobileNav";

import { useBusiness } from "@/contexts/BusinessContext";

export function Topbar({
  displayName,
  email,
}: {
  displayName: string;
  email: string;
}) {
  const params = useParams<{ orgId?: string }>();
  const { activeBusiness } = useBusiness();
  const dashboardBase = params.orgId
    ? `/dashboard/${params.orgId}`
    : "/dashboard";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center">
        <MobileNav />
      </div>
      
      <div className="flex-1 flex justify-center">
        {activeBusiness && (
          <span className="hidden md:block text-lg md:text-xl font-bold text-primary tracking-tight">
            {activeBusiness.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notificaciones</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full"
              />
            }
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                {initials || "PA"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href={`${dashboardBase}/profile`} />}
            >
              Perfil del negocio
            </DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href={`${dashboardBase}/integrations`} />}
            >
              Integraciones
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => logout()}
            >
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
