"use client";

import { useBusiness } from "@/contexts/BusinessContext";
import { Topbar } from "@/components/shared/Topbar";
import { Building2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function GlobalHubPage() {
  const { businesses } = useBusiness();
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Simple Topbar for Global Hub */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">Pulso AI Hub</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 max-w-5xl mx-auto w-full">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Tus Negocios</h1>
              <p className="text-muted-foreground mt-1">Selecciona una organización para administrarla o crea una nueva.</p>
            </div>
            <Button onClick={() => router.push("/onboarding")} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Negocio
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <div key={business.id} className="group relative rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-1 text-lg font-semibold">{business.name}</h3>
                <p className="mb-4 text-sm text-muted-foreground capitalize">
                  Tipo: {business.type}
                </p>
                <div className="flex items-center text-sm font-medium text-primary">
                  <Link href={`/dashboard/${business.id}`} className="flex items-center gap-1 after:absolute after:inset-0">
                    Ir al panel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}

            <div 
              onClick={() => router.push("/onboarding")}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-transparent p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Agregar Negocio</h3>
              <p className="mt-1 text-sm text-muted-foreground">Configuración inteligente con IA</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}