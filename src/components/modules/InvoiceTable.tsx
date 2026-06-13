"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus } from "@/types";

const mockInvoices: Invoice[] = [
  { id: "INV-001", date: "2026-06-10", vendor: "AWS México", amount: 45200, currency: "MXN", status: "approved" },
  { id: "INV-002", date: "2026-06-09", vendor: "Google Cloud", amount: 32800, currency: "MXN", status: "processing_ai" },
  { id: "INV-003", date: "2026-06-08", vendor: "Oficina Central S.A.", amount: 18500, currency: "MXN", status: "approved" },
  { id: "INV-004", date: "2026-06-07", vendor: "Stripe Inc.", amount: 1250, currency: "USD", status: "approved" },
  { id: "INV-005", date: "2026-06-06", vendor: "Papelería del Norte", amount: 3400, currency: "MXN", status: "rejected" },
  { id: "INV-006", date: "2026-06-05", vendor: "Uber Empresas", amount: 8900, currency: "MXN", status: "processing_ai" },
  { id: "INV-007", date: "2026-06-04", vendor: "Adobe Systems", amount: 890, currency: "USD", status: "approved" },
  { id: "INV-008", date: "2026-06-03", vendor: "Telmex Empresarial", amount: 12600, currency: "MXN", status: "approved" },
  { id: "INV-009", date: "2026-06-02", vendor: "WeWork México", amount: 52000, currency: "MXN", status: "processing_ai" },
  { id: "INV-010", date: "2026-06-01", vendor: "Copias Express", amount: 1800, currency: "MXN", status: "rejected" },
];

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  processing_ai: {
    label: "Procesando IA",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  approved: {
    label: "Aprobado",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

function formatCurrency(amount: number, currency: "MXN" | "USD"): string {
  return new Intl.NumberFormat(currency === "MXN" ? "es-MX" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

export function InvoiceTable() {
  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="text-right">Estatus</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockInvoices.map((invoice) => {
            const status = statusConfig[invoice.status];
            return (
              <TableRow key={invoice.id} className="cursor-pointer">
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {invoice.id}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(invoice.date)}
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {invoice.vendor}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn("text-xs font-medium", status.className)}
                  >
                    {status.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
