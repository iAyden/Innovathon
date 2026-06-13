import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceTable } from "@/components/modules/InvoiceTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Facturas",
};

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona y revisa todas tus facturas y comprobantes
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Invoice table */}
      <InvoiceTable />
    </div>
  );
}
