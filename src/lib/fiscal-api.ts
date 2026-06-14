export type DashboardSummary = {
  monthlyExpenses: number;
  expensesWithoutInvoice: number;
  ivaAtRisk: number;
  ivaRecovered: number;
  pendingInvoices: number;
  validatedInvoices: number;
  suppliersWithLowCompliance: number;
  cashFlow: {
    month: string;
    income: number;
    expenses: number;
  }[];
};

export type ExpenseStatus =
  | "missing_invoice"
  | "request_sent"
  | "invoice_received"
  | "validated"
  | "needs_correction"
  | "expired";

export type Expense = {
  id: string;
  supplierName: string;
  supplierEmail?: string | null;
  description?: string | null;
  amount: number;
  ivaAmount: number;
  expenseDate: string;
  status: ExpenseStatus;
  createdAt: string;
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch("/api/dashboard/summary", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar el resumen del dashboard.");
  }

  return response.json();
}
export type DashboardInsight = {
  title: string;
  message: string;
  recommendedAction: string;
  riskLevel: "low" | "medium" | "high" | string;
  source: "n8n" | "rules";
};

export async function getDashboardInsight(): Promise<DashboardInsight> {
  const response = await fetch("/api/dashboard/insight", {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudo cargar el insight del dashboard.");
  }

  return response.json();
}

export async function getExpenses(): Promise<Expense[]> {
  const response = await fetch("/api/expenses", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los egresos.");
  }

  return response.json();
}

export async function createExpense(input: {
  supplierName: string;
  supplierEmail?: string;
  amount: number;
  description?: string;
  expenseDate: string;
}) {
  const response = await fetch("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "No se pudo crear el egreso.");
  }

  return response.json();
}

export async function requestInvoice(expenseId: string) {
  const response = await fetch(`/api/expenses/${expenseId}/request-invoice`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "No se pudo solicitar la factura.");
  }

  return response.json();
}

export async function uploadInvoiceXml(
  expenseId: string,
  file: File
): Promise<InvoiceUploadResult> {
  const formData = new FormData();

  formData.append("expenseId", expenseId);
  formData.append("file", file);

  const response = await fetch("/api/invoices/upload", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? "No se pudo subir el XML.");
  }

  return data;
}

export function getExpenseStatusLabel(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    missing_invoice: "Sin factura",
    request_sent: "Solicitud enviada",
    invoice_received: "Factura recibida",
    validated: "Validada",
    needs_correction: "Requiere corrección",
    expired: "Vencida",
  };

  return labels[status] ?? status;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
export type InvoiceValidationError =
  | "missing_uuid"
  | "missing_issuer_rfc"
  | "missing_receiver_rfc"
  | "receiver_rfc_mismatch"
  | "total_mismatch"
  | "missing_iva"
  | string;

export type InvoiceUploadResult = {
  fileName: string;
  valid: boolean;
  status: "validated" | "needs_correction";
  invoice: {
    uuid: string | null;
    issuerRfc: string | null;
    issuerName: string | null;
    receiverRfc: string | null;
    receiverName: string | null;
    cfdiUse: string | null;
    date: string | null;
    subtotal: number | null;
    iva: number | null;
    total: number | null;
  };
  errors: InvoiceValidationError[];
  humanMessage: string;
};

export function getValidationErrorLabel(error: InvoiceValidationError) {
  const labels: Record<string, string> = {
    missing_uuid: "No encontramos el UUID fiscal del CFDI.",
    missing_issuer_rfc: "No encontramos el RFC del proveedor emisor.",
    missing_receiver_rfc: "No encontramos el RFC receptor.",
    receiver_rfc_mismatch:
      "El RFC receptor no coincide con los datos fiscales del negocio.",
    total_mismatch:
      "El total de la factura no coincide con el monto del egreso registrado.",
    missing_iva: "No encontramos IVA trasladado dentro del XML.",
  };

  return labels[error] ?? error;
}

export function getValidationErrorAction(error: InvoiceValidationError) {
  const actions: Record<string, string> = {
    missing_uuid:
      "Solicita al proveedor el XML timbrado correctamente, no solo una pre-factura.",
    receiver_rfc_mismatch:
      "Pide al proveedor cancelar y reemitir la factura con el RFC correcto.",
    total_mismatch:
      "Revisa si el monto capturado del egreso es correcto o si el proveedor facturó otro importe.",
    missing_iva:
      "Verifica si el producto o servicio causa IVA. Si debería incluir IVA, pide corrección al proveedor.",
    missing_issuer_rfc:
      "Pide al proveedor reenviar el XML completo con los datos del emisor.",
    missing_receiver_rfc:
      "Pide al proveedor reenviar el XML completo con los datos del receptor.",
  };

  return actions[error] ?? "Revisa el XML o solicita apoyo al proveedor.";
}

export function buildValidationTitle(result: InvoiceUploadResult) {
  if (result.valid) {
    return "XML validado correctamente";
  }

  if (result.errors.includes("receiver_rfc_mismatch")) {
    return "La factura fue emitida con RFC incorrecto";
  }

  if (result.errors.includes("total_mismatch")) {
    return "El monto de la factura no coincide";
  }

  if (result.errors.includes("missing_uuid")) {
    return "El XML no parece estar timbrado";
  }

  return "El XML requiere revisión";
}

export type Supplier = {
  id: string;
  name: string;
  rfc?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  complianceScore?: number | null;
  avgResponseDays?: number | null;
  createdAt: string;
};

export async function getSuppliers(): Promise<Supplier[]> {
  const response = await fetch("/api/suppliers", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("No se pudieron cargar los proveedores.");
  }

  return response.json();
}

export async function createSupplier(input: {
  name: string;
  email?: string;
  rfc?: string;
  whatsapp?: string;
}) {
  const response = await fetch("/api/suppliers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error ?? "No se pudo crear el proveedor.");
  }

  return response.json();
}
