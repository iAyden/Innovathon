import { DollarSign, CreditCard, Receipt } from "lucide-react";
import { KpiCard } from "@/components/modules/KpiCard";
import { CashFlowChart } from "@/components/modules/CashFlowChart";
import { UploadTicket } from "@/components/modules/UploadTicket";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

const kpis = [
  {
    title: "Ingresos del Mes",
    value: "$274,000",
    change: "+12.5%",
    changeType: "positive" as const,
    icon: DollarSign,
  },
  {
    title: "Gastos Aprobados",
    value: "$163,400",
    change: "+4.3%",
    changeType: "negative" as const,
    icon: CreditCard,
  },
  {
    title: "Impuestos Estimados",
    value: "$38,200",
    change: "0.0%",
    changeType: "neutral" as const,
    icon: Receipt,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Control</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen financiero del mes actual
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      {/* Chart + Upload */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CashFlowChart />
        </div>
        <div className="lg:col-span-2">
          <UploadTicket />
        </div>
      </div>
    </div>
  );
}
