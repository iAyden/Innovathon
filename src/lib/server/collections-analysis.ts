import "server-only";

import type {
  AccountReceivable,
  CollectionsAnalysis,
  Customer,
} from "@/lib/accounts-receivable";

export function buildCollectionsFallback(
  customers: Customer[],
  receivables: AccountReceivable[],
): Omit<CollectionsAnalysis, "generatedAt" | "source"> {
  const open = receivables.filter(
    (item) => !["paid", "cancelled"].includes(item.status),
  );
  const overdue = open.filter((item) => item.status === "overdue");
  const outstanding = open.reduce((sum, item) => sum + item.balance, 0);
  const overdueBalance = overdue.reduce((sum, item) => sum + item.balance, 0);
  const observations = [
    `${open.length} cuenta${open.length === 1 ? "" : "s"} abierta${open.length === 1 ? "" : "s"} por ${formatCurrency(outstanding)}.`,
  ];
  const pendingActions: string[] = [];
  const recommendations: string[] = [];

  if (overdue.length > 0) {
    observations.push(
      `${overdue.length} cuenta${overdue.length === 1 ? "" : "s"} vencida${overdue.length === 1 ? "" : "s"} concentra${overdue.length === 1 ? "" : "n"} ${formatCurrency(overdueBalance)}.`,
    );
    for (const item of [...overdue].sort((a, b) => b.balance - a.balance).slice(0, 3)) {
      pendingActions.push(
        `Dar seguimiento a ${item.customerName} por ${formatCurrency(item.balance)} vencidos.`,
      );
    }
  }

  const missingContact = customers.filter(
    (customer) => !customer.email && !customer.phone,
  );
  if (missingContact.length > 0) {
    pendingActions.push(
      `Completar el contacto de ${missingContact.length} cliente${missingContact.length === 1 ? "" : "s"}.`,
    );
  }

  recommendations.push(
    overdue.length > 0
      ? "Prioriza los saldos vencidos de mayor monto y acuerda una fecha concreta de pago."
      : "Confirma la recepción de cada cuenta antes de su fecha de vencimiento.",
  );
  recommendations.push(
    "Registra cada abono para mantener sincronizados la cobranza y el flujo de caja.",
  );

  return {
    summary:
      open.length === 0
        ? "No hay cuentas pendientes con los datos disponibles."
        : overdue.length > 0
          ? "La cartera requiere atención por saldos vencidos."
          : "La cartera está vigente, pero conviene dar seguimiento preventivo.",
    observations,
    pendingActions,
    recommendations,
    riskLevel:
      overdueBalance > 0
        ? overdueBalance / Math.max(outstanding, 1) >= 0.4
          ? "high"
          : "medium"
        : "low",
  };
}

export function normalizeCollectionsAnalysis(
  value: Record<string, unknown> | null,
  fallback: Omit<CollectionsAnalysis, "generatedAt" | "source">,
  source: "n8n" | "rules",
): CollectionsAnalysis {
  const risk = String(value?.riskLevel ?? fallback.riskLevel).toLowerCase();

  return {
    summary: text(value?.summary, fallback.summary),
    observations: list(value?.observations, fallback.observations),
    pendingActions: list(value?.pendingActions, fallback.pendingActions),
    recommendations: list(value?.recommendations, fallback.recommendations),
    riskLevel:
      risk === "high" || risk === "alto"
        ? "high"
        : risk === "low" || risk === "bajo"
          ? "low"
          : "medium",
    generatedAt: new Date().toISOString(),
    source,
  };
}

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function list(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const entries = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : fallback;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
