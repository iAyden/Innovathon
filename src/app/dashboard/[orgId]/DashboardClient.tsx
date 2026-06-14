"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Sparkles,
} from "lucide-react";
import { CashFlowChart } from "@/components/modules/CashFlowChart";
import { KpiCard } from "@/components/modules/KpiCard";
import { UploadTicket } from "@/components/modules/UploadTicket";
import { Button } from "@/components/ui/button";
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
  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDashboardSummary()
      .then((summaryData) => {
        if (!active) return;
        setSummary(summaryData);
      })
      .catch((error) => console.error("Error loading dashboard:", error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function generateInsight() {
    setGeneratingInsight(true);
    setInsightError(null);

    try {
      setInsight(await getDashboardInsight());
    } catch (error) {
      setInsightError(
        error instanceof Error
          ? error.message
          : "No se pudo generar la recomendacion.",
      );
    } finally {
      setGeneratingInsight(false);
    }
  }

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
      <div className="rounded-xl border bg-card p-5">
        {insight ? (
          <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{insight.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {insight.message}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {insight.source === "n8n"
                  ? "Generado por el workflow de IA."
                  : "Recomendacion local: el workflow de IA no respondio."}
              </p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs">
              Riesgo {insight.riskLevel}
            </span>
          </div>
          <div className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm">
            <span className="font-medium">Acción recomendada: </span>
            {insight.recommendedAction}
          </div>
          <Button
            className="mt-4"
            variant="outline"
            onClick={generateInsight}
            disabled={generatingInsight}
          >
            {generatingInsight ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Volver a generar
          </Button>
          </>
        ) : (
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold">Analisis con IA</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Genera una recomendacion usando los indicadores actuales. Solo
                consume tokens cuando pulses el boton.
              </p>
              {insightError && (
                <p className="mt-2 text-sm text-destructive">{insightError}</p>
              )}
            </div>
            <Button onClick={generateInsight} disabled={generatingInsight}>
              {generatingInsight ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Sparkles />
              )}
              {generatingInsight ? "Generando..." : "Generar con IA"}
            </Button>
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CashFlowChart data={summary?.cashFlow ?? []} />
        </div>

        {/* Derecha: Métricas Financieras */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight mb-2">Métricas Financieras</h2>
          {kpis.map((kpi) => (
            <KpiCard key={kpi.title} {...kpi} />
          ))}
        </div>
      </div>
    </div>
  );
}
