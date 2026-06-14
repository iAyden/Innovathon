import "server-only";

export type SupplierExpense = {
  supplier_id: string | null;
  amount: number | string | null;
  status: string;
};

export type SupplierInvoiceRequest = {
  supplier_id: string | null;
  sent_at: string | null;
  responded_at: string | null;
  status: string | null;
};

export type SupplierMetrics = {
  purchaseCount: number;
  totalSpend: number;
  pendingInvoiceCount: number;
  receivedInvoiceCount: number;
  requestCount: number;
  responseCount: number;
  invoiceCoverageRate: number;
  avgResponseDays: number | null;
  complianceScore: number | null;
  hasActivity: boolean;
};

export type SupplierPortfolioAnalysis = {
  summary: string;
  observations: string[];
  pendingActions: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
  generatedAt: string;
  source: "n8n" | "rules";
};

export type SupplierPortfolioItem = {
  id: string;
  name: string;
  rfc: string | null;
  email: string | null;
  whatsapp: string | null;
  metrics: SupplierMetrics;
};

const RECEIVED_STATUSES = new Set(["invoice_received", "validated"]);
const PENDING_STATUSES = new Set([
  "missing_invoice",
  "request_sent",
  "needs_correction",
  "expired",
]);

export function calculateSupplierMetrics(
  expenses: SupplierExpense[],
  requests: SupplierInvoiceRequest[],
): SupplierMetrics {
  const purchaseCount = expenses.length;
  const totalSpend = round(
    expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
    2,
  );
  const pendingInvoiceCount = expenses.filter((expense) =>
    PENDING_STATUSES.has(expense.status),
  ).length;
  const receivedInvoiceCount = expenses.filter((expense) =>
    RECEIVED_STATUSES.has(expense.status),
  ).length;
  const answeredRequests = requests.filter(
    (request) => request.sent_at && request.responded_at,
  );
  const responseDays = answeredRequests.map((request) =>
    Math.max(
      0,
      (new Date(request.responded_at!).getTime() -
        new Date(request.sent_at!).getTime()) /
        86_400_000,
    ),
  );
  const avgResponseDays =
    responseDays.length > 0
      ? round(
          responseDays.reduce((sum, days) => sum + days, 0) /
            responseDays.length,
          1,
        )
      : null;
  const invoiceCoverageRate =
    purchaseCount > 0
      ? round((receivedInvoiceCount / purchaseCount) * 100, 1)
      : 0;
  const responseRate =
    requests.length > 0
      ? (answeredRequests.length / requests.length) * 100
      : invoiceCoverageRate;
  const speedScore =
    avgResponseDays === null ? responseRate : Math.max(0, 100 - avgResponseDays * 15);
  const complianceScore =
    purchaseCount > 0 || requests.length > 0
      ? Math.round(
          invoiceCoverageRate * 0.7 + responseRate * 0.2 + speedScore * 0.1,
        )
      : null;

  return {
    purchaseCount,
    totalSpend,
    pendingInvoiceCount,
    receivedInvoiceCount,
    requestCount: requests.length,
    responseCount: answeredRequests.length,
    invoiceCoverageRate,
    avgResponseDays,
    complianceScore,
    hasActivity: purchaseCount > 0 || requests.length > 0,
  };
}

export function buildSupplierPortfolioFallback(
  suppliers: SupplierPortfolioItem[],
): Omit<SupplierPortfolioAnalysis, "generatedAt" | "source"> {
  if (suppliers.length === 0) {
    return {
      summary: "Aún no hay proveedores registrados para realizar el análisis.",
      observations: [],
      pendingActions: ["Registra al menos un proveedor y sus compras."],
      recommendations: [
        "Completa los medios de contacto para facilitar el seguimiento.",
      ],
      riskLevel: "medium",
    };
  }

  const withActivity = suppliers.filter((supplier) => supplier.metrics.hasActivity);
  const atRisk = withActivity
    .filter((supplier) => (supplier.metrics.complianceScore ?? 0) < 60)
    .sort(
      (a, b) =>
        b.metrics.pendingInvoiceCount - a.metrics.pendingInvoiceCount ||
        b.metrics.totalSpend - a.metrics.totalSpend,
    );
  const missingContact = suppliers.filter(
    (supplier) => !supplier.email && !supplier.whatsapp,
  );
  const pendingInvoices = suppliers.reduce(
    (sum, supplier) => sum + supplier.metrics.pendingInvoiceCount,
    0,
  );
  const totalSpend = suppliers.reduce(
    (sum, supplier) => sum + supplier.metrics.totalSpend,
    0,
  );
  const topSpend = [...suppliers].sort(
    (a, b) => b.metrics.totalSpend - a.metrics.totalSpend,
  )[0];
  const observations = [
    `${suppliers.length} proveedor${suppliers.length === 1 ? "" : "es"} registrado${suppliers.length === 1 ? "" : "s"} y ${formatCurrency(totalSpend)} en compras acumuladas.`,
  ];
  const pendingActions: string[] = [];
  const recommendations: string[] = [];

  if (topSpend?.metrics.totalSpend > 0) {
    observations.push(
      `${topSpend.name} concentra el mayor gasto registrado con ${formatCurrency(topSpend.metrics.totalSpend)}.`,
    );
  }
  if (pendingInvoices > 0) {
    pendingActions.push(
      `Dar seguimiento a ${pendingInvoices} compra${pendingInvoices === 1 ? "" : "s"} sin factura validada.`,
    );
  }
  for (const supplier of atRisk.slice(0, 3)) {
    pendingActions.push(
      `Revisar a ${supplier.name}: cumplimiento de ${supplier.metrics.complianceScore ?? 0}% y ${supplier.metrics.pendingInvoiceCount} pendiente${supplier.metrics.pendingInvoiceCount === 1 ? "" : "s"}.`,
    );
  }
  if (missingContact.length > 0) {
    pendingActions.push(
      `Completar datos de contacto de ${missingContact.length} proveedor${missingContact.length === 1 ? "" : "es"}.`,
    );
  }
  recommendations.push(
    pendingInvoices > 0
      ? "Prioriza las solicitudes de factura antes del cierre fiscal."
      : "Mantén la revisión mensual del cumplimiento de facturación.",
  );
  if (atRisk.length > 0) {
    recommendations.push(
      "Define plazos de respuesta y considera proveedores alternativos para los casos de mayor riesgo.",
    );
  }
  if (withActivity.length < suppliers.length) {
    recommendations.push(
      "Registra compras y solicitudes para que todos los proveedores tengan historial medible.",
    );
  }

  return {
    summary:
      atRisk.length > 0 || pendingInvoices > 0
        ? "El portafolio de proveedores tiene pendientes que requieren seguimiento."
        : "El portafolio de proveedores se mantiene estable con los datos disponibles.",
    observations,
    pendingActions,
    recommendations,
    riskLevel:
      atRisk.length > 0
        ? "high"
        : pendingInvoices > 0 || missingContact.length > 0
          ? "medium"
          : "low",
  };
}

export function normalizeSupplierPortfolioAnalysis(
  value: Record<string, unknown> | null,
  fallback: Omit<SupplierPortfolioAnalysis, "generatedAt" | "source">,
  source: "n8n" | "rules",
): SupplierPortfolioAnalysis {
  const riskValue = String(value?.riskLevel ?? fallback.riskLevel).toLowerCase();
  const riskLevel =
    riskValue === "high" || riskValue === "alto"
      ? "high"
      : riskValue === "low" || riskValue === "bajo"
        ? "low"
        : "medium";

  return {
    summary: stringValue(value?.summary, fallback.summary),
    observations: stringArray(value?.observations, fallback.observations),
    pendingActions: stringArray(value?.pendingActions, fallback.pendingActions),
    recommendations: stringArray(
      value?.recommendations,
      fallback.recommendations,
    ),
    riskLevel,
    generatedAt: new Date().toISOString(),
    source,
  };
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const entries = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : fallback;
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
