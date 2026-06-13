export type InvoiceStatus = "processing_ai" | "approved" | "rejected";

export interface Invoice {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  currency: "MXN" | "USD";
  status: InvoiceStatus;
}

export interface KpiData {
  title: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

export interface CashFlowEntry {
  month: string;
  income: number;
  expenses: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
}

export interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  status: "idle" | "uploading" | "success" | "error";
}
export type ExpenseStatus =
  | "missing_invoice"
  | "request_sent"
  | "invoice_received"
  | "validated"
  | "needs_correction"
  | "expired";

export interface Expense {
  id: string;
  supplierName: string;
  supplierEmail?: string | null;
  description?: string | null;
  amount: number;
  ivaAmount: number;
  expenseDate: string;
  status: ExpenseStatus;
  createdAt?: string;
}

export interface DashboardSummary {
  monthlyExpenses: number;
  expensesWithoutInvoice: number;
  ivaAtRisk: number;
  ivaRecovered: number;
  pendingInvoices: number;
  validatedInvoices: number;
  suppliersWithLowCompliance: number;
  insight?: string;
}

export interface CashFlowEntry {
  month: string;
  income: number;
  expenses: number;
}

export interface XmlInvoiceData {
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
}