"use client";

import { useEffect, useState } from "react";
import { FileUp, ListChecks } from "lucide-react";
import { UploadTicket } from "@/components/modules/UploadTicket";
import { Button } from "@/components/ui/button";
import { DocumentsClient } from "../documents/DocumentsClient";

type OrdersView = "upload" | "documents";

type OrdersClientProps = {
  initialView?: OrdersView;
};

export function OrdersClient({ initialView = "upload" }: OrdersClientProps) {
  const [activeView, setActiveView] = useState<OrdersView>(initialView);

  useEffect(() => {
    function syncViewFromUrl() {
      const view = new URLSearchParams(window.location.search).get("view");
      setActiveView(view === "documents" ? "documents" : "upload");
    }

    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  function changeView(view: OrdersView) {
    setActiveView(view);
    const url = new URL(window.location.href);

    if (view === "documents") {
      url.searchParams.set("view", "documents");
    } else {
      url.searchParams.delete("view");
    }

    window.history.pushState(null, "", url);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube, revisa y clasifica tus comprobantes procesados con inteligencia
          artificial.
        </p>
      </div>

      <div
        className="flex w-fit gap-1 rounded-lg border bg-muted/40 p-1"
        role="tablist"
        aria-label="Vistas de pedidos"
      >
        <Button
          type="button"
          size="sm"
          variant={activeView === "upload" ? "default" : "ghost"}
          role="tab"
          aria-selected={activeView === "upload"}
          onClick={() => changeView("upload")}
        >
          <FileUp />
          Cargar comprobante
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeView === "documents" ? "default" : "ghost"}
          role="tab"
          aria-selected={activeView === "documents"}
          onClick={() => changeView("documents")}
        >
          <ListChecks />
          Documentos analizados
        </Button>
      </div>

      <div role="tabpanel">
        {activeView === "upload" ? (
          <UploadTicket />
        ) : (
          <DocumentsClient embedded />
        )}
      </div>
    </div>
  );
}
