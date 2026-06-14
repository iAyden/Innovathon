"use client";

import { useEffect, useState } from "react";
import { Bot, Check, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ModuleItem = {
  slug: string;
  name: string;
  description: string;
  category: string;
  workflow: string;
  status: "recommended" | "active" | "paused" | "dismissed";
  reason: string | null;
  source: string;
};

export function ModulesClient() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadModules() {
    const response = await fetch("/api/modules", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar.");
    setModules(data.modules);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/modules", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "No se pudieron cargar.");
        if (active) setModules(data.modules);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Error inesperado."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function updateModule(moduleSlug: string, status: ModuleItem["status"]) {
    setWorking(moduleSlug);
    setMessage(null);
    try {
      const response = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleSlug, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      await loadModules();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setWorking(null);
    }
  }

  async function requestRecommendations() {
    setWorking("recommend");
    setMessage(null);
    try {
      const response = await fetch("/api/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommend" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo recomendar.");
      setMessage(
        data.automationSucceeded
          ? "n8n actualizo las recomendaciones."
          : data.automationConfigured
            ? "n8n no respondio correctamente; se aplicaron reglas locales."
            : "Se aplicaron reglas locales. El workflow de n8n aun no esta configurado.",
      );
      await loadModules();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Modulos del negocio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Activa solo las herramientas que necesita tu operacion.
          </p>
        </div>
        <Button onClick={requestRecommendations} disabled={working !== null}>
          {working === "recommend" ? (
            <RefreshCw className="animate-spin" />
          ) : (
            <Bot />
          )}
          {working === "recommend" ? "Analizando perfil..." : "Recomendar con IA"}
        </Button>
      </div>

      {message && <div className="rounded-lg border bg-muted px-4 py-3 text-sm">{message}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando modulos...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.slug}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{module.name}</CardTitle>
                    <CardDescription className="mt-1">{module.category}</CardDescription>
                  </div>
                  <Badge variant={module.status === "active" ? "default" : "outline"}>
                    {module.status === "active" ? "Activo" : module.status === "recommended" ? "Recomendado" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{module.description}</p>
                {module.reason && <p className="rounded-lg bg-muted p-3 text-xs">{module.reason}</p>}
                <p className="text-xs text-muted-foreground">
                  Workflow: <code>{module.workflow}</code>
                </p>
                <Button
                  variant={module.status === "active" ? "outline" : "default"}
                  disabled={working === module.slug}
                  onClick={() =>
                    updateModule(
                      module.slug,
                      module.status === "active" ? "paused" : "active",
                    )
                  }
                >
                  {working === module.slug ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-4 w-4" />
                  )}
                  {module.status === "active" ? "Pausar" : "Activar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
