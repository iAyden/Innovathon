export type ReceivableStatus =
  | "pending"
  | "partial"
  | "paid"
  | "overdue"
  | "cancelled";

export type Customer = {
  id: string;
  name: string;
  rfc: string | null;
  email: string | null;
  phone: string | null;
  paymentTermsDays: number;
  outstandingBalance: number;
  openReceivables: number;
  createdAt: string;
};

export type ReceivablePayment = {
  id: string;
  amount: number;
  paidOn: string;
  paymentMethod: string | null;
  reference: string | null;
  createdAt: string;
};

export type AccountReceivable = {
  id: string;
  customerId: string;
  customerName: string;
  folio: string | null;
  description: string;
  amount: number;
  paidAmount: number;
  balance: number;
  currency: "MXN" | "USD";
  issueDate: string;
  dueDate: string;
  status: ReceivableStatus;
  notes: string | null;
  payments: ReceivablePayment[];
  createdAt: string;
};

export type CollectionsAnalysis = {
  summary: string;
  observations: string[];
  pendingActions: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high";
  generatedAt: string;
  source: "n8n" | "rules";
};
