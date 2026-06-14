export type ModuleStatus = "recommended" | "active" | "paused" | "dismissed";

export type BusinessModule = {
  slug: string;
  name: string;
  description: string;
  category: "Finanzas" | "Fiscal" | "Operacion";
  type: "function" | "module";
  workflow: string;
  recommendedFor: string[];
};

export const MODULE_CATALOG: BusinessModule[] = [
  // --- FUNCIONES ---
  {
    slug: "cash-flow",
    name: "Flujo de caja",
    description: "Controla entradas, salidas y la liquidez disponible.",
    category: "Finanzas",
    type: "function",
    workflow: "cashflow-forecast",
    recommendedFor: ["all"],
  },
  {
    slug: "invoices",
    name: "Facturas",
    description: "Emisión y recepción de facturas, complementos de pago.",
    category: "Finanzas",
    type: "function",
    workflow: "invoices-manager",
    recommendedFor: ["all"],
  },
  {
    slug: "providers",
    name: "Proveedores",
    description: "Mide cumplimiento y tiempos de respuesta de proveedores.",
    category: "Operacion",
    type: "function",
    workflow: "supplier-analysis",
    recommendedFor: ["commerce", "manufacturing", "food"],
  },
  {
    slug: "inventory",
    name: "Inventario",
    description: "Organiza existencias, compras y alertas de reposicion.",
    category: "Operacion",
    type: "function",
    workflow: "inventory-manager",
    recommendedFor: ["commerce", "manufacturing", "food"],
  },
  {
    slug: "orders",
    name: "Pedidos",
    description: "Gestión de pedidos de clientes y cotizaciones.",
    category: "Operacion",
    type: "function",
    workflow: "orders-manager",
    recommendedFor: ["commerce", "services", "manufacturing"],
  },

  // --- MODULOS ---
  {
    slug: "invoice-recovery",
    name: "Recuperacion de facturas",
    description: "Da seguimiento a XML pendientes y al IVA en riesgo.",
    category: "Fiscal",
    type: "module",
    workflow: "request-invoice",
    recommendedFor: ["commerce", "services", "manufacturing"],
  },
  {
    slug: "fiscal-guide",
    name: "Guia fiscal",
    description: "Explica obligaciones y oportunidades de mejora fiscal.",
    category: "Fiscal",
    type: "module",
    workflow: "fiscal-profile",
    recommendedFor: ["all"],
  },
  {
    slug: "accounts-receivable",
    name: "Cuentas por cobrar",
    description: "Prioriza clientes y cobros pendientes.",
    category: "Finanzas",
    type: "module",
    workflow: "collections-advisor",
    recommendedFor: ["services", "commerce"],
  },
];

export function recommendModules(sector?: string | null) {
  const normalizedSector = sector?.trim().toLowerCase() || "all";

  return MODULE_CATALOG.filter(
    (module) =>
      module.recommendedFor.includes("all") ||
      module.recommendedFor.includes(normalizedSector),
  );
}
