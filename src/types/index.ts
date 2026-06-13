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
