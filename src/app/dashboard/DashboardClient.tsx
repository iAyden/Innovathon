"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CreditCard } from "lucide-react";
import { CashFlowChart } from "@/components/modules/CashFlowChart";
import { KpiCard } from "@/components/modules/KpiCard";
import { UploadTicket } from "@/components/modules/UploadTicket";
import {
  DashboardInsight,
  DashboardSummary,
  formatCurrency,
  getDashboardInsight,
  getDashboardSummary,
} from "@/lib/fiscal-api";

export function DashboardClient() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<DashboardInsight | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getDashboardSummary(), getDashboardInsight()])
      .then(([summaryData, insightData]) => {
        if (!active) return;
        setSummary(summaryData);
        setInsight(insightData);
      })
      .catch((error) => console.error("Error loading dashboard:", error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const kpis = [
    {
      title: "Gastos del mes",
      value: loading
        ? "Cargando..."
        : formatCurrency(summary?.monthlyExpenses ?? 0),
      change: "registrados",
      changeType: "neutral" as const,
      icon: CreditCard,
    },
    {
      title: "IVA en riesgo",
      value: loading ? "Cargando..." : formatCurrency(summary?.ivaAtRisk ?? 0),
      change: `${summary?.pendingInvoices ?? 0} pendientes`,
      changeType: "negative" as const,
      icon: AlertTriangle,
    },
    {
      title: "IVA recuperado",
      value: loading
        ? "Cargando..."
        : formatCurrency(summary?.ivaRecovered ?? 0),
      change: `${summary?.validatedInvoices ?? 0} validadas`,
      changeType: "positive" as const,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen financiero, fiscal y operativo del mes actual.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>
      {insight && (
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{insight.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {insight.message}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs">
              Riesgo {insight.riskLevel}
            </span>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="font-medium">Accion recomendada: </span>
            {insight.recommendedAction}
          </div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CashFlowChart data={summary?.cashFlow ?? []} />
        </div>
        <div className="lg:col-span-2">
          <UploadTicket />
        </div>
      </div>
    </div>
  );
}
