"use client";

import { UploadTicket } from "@/components/modules/UploadTicket";

export function OrdersClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sube tus comprobantes de pedidos para procesarlos con inteligencia artificial.
        </p>
      </div>

      <UploadTicket />
    </div>
  );
}
