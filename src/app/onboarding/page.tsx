"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useBusiness, Business } from "@/contexts/BusinessContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [description, setDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();
  const { addBusiness } = useBusiness();

  const handleCreateBusiness = async () => {
    if (!description.trim()) return;
    
    setIsProcessing(true);

    // Simulamos la llamada a la IA de Pulso (2.5s)
    await new Promise(resolve => setTimeout(resolve, 2500));

    const desc = description.toLowerCase();
    
    // Simple heuristic para mockear la IA
    let type: Business["type"] = "comercio";
    let modules: Business["activeModules"] = ["inventory", "sales", "orders", "reports", "settings"];
    let name = "Nuevo Negocio";

    if (desc.includes("taller") || desc.includes("servicio") || desc.includes("consultor")) {
      type = "servicios";
      modules = ["invoices", "sales", "integrations", "reports", "settings"];
      name = desc.includes("taller") ? "Taller Mecánico" : "Servicios Profesionales";
    } else if (desc.includes("b2b") || desc.includes("empresa") || desc.includes("proveedor")) {
      type = "b2b";
      modules = ["invoices", "providers", "orders", "cash-flow", "reports", "settings"];
      name = "Empresa B2B";
    }

    const newBusiness: Business = {
      id: `org-${Date.now()}`,
      name: name,
      type: type,
      activeModules: modules,
      settings: {
        whatsappNotifications: desc.includes("whatsapp"),
      }
    };

    addBusiness(newBusiness);
    // addBusiness ya setea activeBusinessId y redirige lógicamente, pero forzamos el router
    router.push(`/dashboard/${newBusiness.id}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Image
          src="/brand/pulso-logo-central.png"
          alt="Pulso AI"
          width={280}
          height={280}
          className="mx-auto mb-6 h-40 w-40 object-contain"
          priority
        />

        <h1 className="mb-2 text-center text-2xl font-bold">Configuración Inteligente</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Cuéntanos sobre tu negocio. La Inteligencia Artificial configurará los módulos perfectos para ti al instante.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <Textarea
              placeholder="Ej. Tengo un taller mecánico, cobro 50% de anticipo y quiero notificar a mis clientes por WhatsApp..."
              className="min-h-[160px] resize-none bg-background p-4 text-base focus-visible:ring-primary/50"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isProcessing}
            />
            {!description && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-sm text-muted-foreground/60">
                <Sparkles className="h-4 w-4" />
                No necesitas configurar nada a mano.
              </div>
            )}
          </div>

          <Button 
            className="w-full h-12 text-base gap-2" 
            size="lg"
            disabled={!description.trim() || isProcessing}
            onClick={handleCreateBusiness}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generando tu Workspace...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Crear Mi Negocio
              </>
            )}
          </Button>
        </div>

        {isProcessing && (
          <div className="mt-6 flex flex-col items-center gap-2 animate-pulse text-sm text-muted-foreground">
            <p>Analizando requerimientos...</p>
            <p>Activando módulos ({description.toLowerCase().includes("taller") ? "Servicios" : "Comercio"})...</p>
          </div>
        )}
      </div>
    </div>
  );
}
