export type ModuleStatus = "recommended" | "active" | "paused" | "dismissed";

export type BusinessModule = {
  slug: string;
  name: string;
  description: string;
  category: "Finanzas" | "Fiscal" | "Operacion";
  workflow: string;
  recommendedFor: string[];
};

export const MODULE_CATALOG: BusinessModule[] = [
  {
    slug: "cash-flow",
    name: "Flujo de caja",
    description: "Controla entradas, salidas y la liquidez disponible.",
    category: "Finanzas",
    workflow: "cashflow-forecast",
    recommendedFor: ["all"],
  },
  {
    slug: "invoice-recovery",
    name: "Recuperacion de facturas",
    description: "Da seguimiento a XML pendientes y al IVA en riesgo.",
    category: "Fiscal",
    workflow: "request-invoice",
    recommendedFor: ["commerce", "services", "manufacturing"],
  },
  {
    slug: "fiscal-guide",
    name: "Guia fiscal",
    description: "Explica obligaciones y oportunidades de mejora fiscal.",
    category: "Fiscal",
    workflow: "fiscal-profile",
    recommendedFor: ["all"],
  },
  {
    slug: "inventory",
    name: "Inventario",
    description: "Organiza existencias, compras y alertas de reposicion.",
    category: "Operacion",
    workflow: "inventory-advisor",
    recommendedFor: ["commerce", "manufacturing", "food"],
  },
  {
    slug: "accounts-receivable",
    name: "Cuentas por cobrar",
    description: "Prioriza clientes y cobros pendientes.",
    category: "Finanzas",
    workflow: "collections-advisor",
    recommendedFor: ["services", "commerce"],
  },
  {
    slug: "supplier-control",
    name: "Proveedores",
    description: "Mide cumplimiento y tiempos de respuesta.",
    category: "Operacion",
    workflow: "supplier-analysis",
    recommendedFor: ["commerce", "manufacturing", "food"],
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
