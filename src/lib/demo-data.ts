import { estimateIva } from "@/lib/format";
import type { Expense, DashboardSummary, CashFlowEntry } from "@/types";

export const demoExpenses: Expense[] = [
  {
    id: "exp-001",
    supplierName: "Insumos Médicos Norte",
    supplierEmail: "facturas@insumosnorte.mx",
    description: "Compra de material clínico",
    amount: 5800,
    ivaAmount: 800,
    expenseDate: "2026-06-12",
    status: "request_sent",
    createdAt: "2026-06-12T10:00:00Z",
  },
  {
    id: "exp-002",
    supplierName: "Papelería Central",
    supplierEmail: "contacto@papeleriacentral.mx",
    description: "Papelería y tóner",
    amount: 2320,
    ivaAmount: 320,
    expenseDate: "2026-06-10",
    status: "missing_invoice",
    createdAt: "2026-06-10T10:00:00Z",
  },
  {
    id: "exp-003",
    supplierName: "Laboratorio ABC",
    supplierEmail: "facturacion@laboratorioabc.mx",
    description: "Estudios de laboratorio",
    amount: 3480,
    ivaAmount: 480,
    expenseDate: "2026-06-08",
    status: "needs_correction",
    createdAt: "2026-06-08T10:00:00Z",
  },
  {
    id: "exp-004",
    supplierName: "Office Depot",
    supplierEmail: "facturacion@officedepot.com.mx",
    description: "Insumos de oficina",
    amount: 1160,
    ivaAmount: 160,
    expenseDate: "2026-06-05",
    status: "validated",
    createdAt: "2026-06-05T10:00:00Z",
  },
  {
    id: "exp-005",
    supplierName: "Telmex Empresarial",
    supplierEmail: "facturacion@telmex.com",
    description: "Internet empresarial",
    amount: 1856,
    ivaAmount: 256,
    expenseDate: "2026-06-03",
    status: "validated",
    createdAt: "2026-06-03T10:00:00Z",
  },
];

export const demoCashFlow: CashFlowEntry[] = [
  { month: "Ene", income: 186000, expenses: 120000 },
  { month: "Feb", income: 205000, expenses: 135000 },
  { month: "Mar", income: 237000, expenses: 148000 },
  { month: "Abr", income: 193000, expenses: 142000 },
  { month: "May", income: 259000, expenses: 156000 },
  { month: "Jun", income: 274000, expenses: 163400 },
];

export function buildDemoSummary(expenses: Expense[] = demoExpenses): DashboardSummary {
  const monthlyExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
  const riskyStatuses = ["missing_invoice", "request_sent", "needs_correction"];
  const expensesWithoutInvoice = expenses
    .filter((item) => riskyStatuses.includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const ivaAtRisk = expenses
    .filter((item) => riskyStatuses.includes(item.status))
    .reduce((sum, item) => sum + (item.ivaAmount || estimateIva(item.amount)), 0);
  const ivaRecovered = expenses
    .filter((item) => item.status === "validated")
    .reduce((sum, item) => sum + (item.ivaAmount || estimateIva(item.amount)), 0);

  return {
    monthlyExpenses,
    expensesWithoutInvoice,
    ivaAtRisk,
    ivaRecovered,
    pendingInvoices: expenses.filter((item) => item.status !== "validated").length,
    validatedInvoices: expenses.filter((item) => item.status === "validated").length,
    suppliersWithLowCompliance: 2,
    insight:
      "Tienes gastos sin XML ligado este mes. Prioriza Insumos Médicos Norte y Laboratorio ABC porque concentran el mayor IVA en riesgo.",
  };
}
