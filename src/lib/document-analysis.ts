export type DocumentType = "invoice" | "ticket" | "receipt" | "other";
export type DocumentCurrency = "MXN" | "USD" | "unknown";
export type DocumentLineType =
  | "product"
  | "service"
  | "discount"
  | "tax"
  | "charge"
  | "other";

const DOCUMENT_LINE_TYPES: DocumentLineType[] = [
  "product",
  "service",
  "discount",
  "tax",
  "charge",
  "other",
];

export type DocumentLineItem = {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  sku: string;
  inventoryCandidate: boolean;
  confidence: number;
  lineType?: DocumentLineType;
};

export type ExtractedDocumentData = {
  documentType: DocumentType;
  issuerName: string;
  issuerRfc: string;
  date: string;
  subtotal: number;
  iva: number;
  total: number;
  currency: DocumentCurrency;
  paymentMethod: string;
  category: string;
  description: string;
  items?: DocumentLineItem[];
  confidence: number;
  warnings: string[];
  subtotalInferred?: boolean;
  originalSubtotal?: number;
  reviewed?: boolean;
  reviewedAt?: string;
  reviewRequired?: boolean;
  reviewReasons?: string[];
  registeredAsExpense?: boolean;
  cashFlowEntryId?: string;
  inventorySyncedAt?: string;
  inventoryItemIds?: string[];
};

export type DocumentAnalysis = {
  extractedData: ExtractedDocumentData;
  recommendations: string[];
};

export function isDocumentAnalysis(value: unknown): value is DocumentAnalysis {
  if (!value || typeof value !== "object") return false;

  const analysis = value as Record<string, unknown>;
  const extracted = analysis.extractedData;
  if (!extracted || typeof extracted !== "object" || Array.isArray(extracted)) {
    return false;
  }

  const data = extracted as Record<string, unknown>;
  const itemsAreValid =
    data.items === undefined ||
    (Array.isArray(data.items) &&
      data.items.every((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return false;
        }
        const line = item as Record<string, unknown>;
        return (
          typeof line.name === "string" &&
          typeof line.quantity === "number" &&
          typeof line.unit === "string" &&
          typeof line.unitPrice === "number" &&
          typeof line.total === "number" &&
          typeof line.sku === "string" &&
          typeof line.inventoryCandidate === "boolean" &&
          typeof line.confidence === "number" &&
          (line.lineType === undefined ||
            DOCUMENT_LINE_TYPES.includes(
              line.lineType as DocumentLineType,
            ))
        );
      }));

  return (
    ["invoice", "ticket", "receipt", "other"].includes(
      String(data.documentType),
    ) &&
    typeof data.issuerName === "string" &&
    typeof data.issuerRfc === "string" &&
    typeof data.date === "string" &&
    typeof data.subtotal === "number" &&
    typeof data.iva === "number" &&
    typeof data.total === "number" &&
    ["MXN", "USD", "unknown"].includes(String(data.currency)) &&
    typeof data.paymentMethod === "string" &&
    typeof data.category === "string" &&
    typeof data.description === "string" &&
    itemsAreValid &&
    typeof data.confidence === "number" &&
    Array.isArray(data.warnings) &&
    data.warnings.every((warning) => typeof warning === "string") &&
    Array.isArray(analysis.recommendations) &&
    analysis.recommendations.every(
      (recommendation) => typeof recommendation === "string",
    )
  );
}

export function normalizeDocumentItems(
  analysis: DocumentAnalysis,
): DocumentAnalysis {
  const items = analysis.extractedData.items ?? [];
  const documentTotal = Number(analysis.extractedData.total) || 0;
  const tolerance = Math.max(1, Math.abs(documentTotal) * 0.02);
  const warnings = [...analysis.extractedData.warnings];
  const preparedItems = items
    .map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      const total = Number(item.total);

      return {
        ...item,
        name: item.name.trim(),
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unit: item.unit.trim() || "pieza",
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        total: Number.isFinite(total) ? total : 0,
        sku: item.sku.trim(),
        confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0)),
        lineType: inferLineType(item),
      };
    })
    .filter((item) => item.name || item.total !== 0);
  const initialSum = preparedItems.reduce(
    (sum, item) => sum + item.total,
    0,
  );
  const normalizedItems = preparedItems.map((item) => {
    let lineType = item.lineType;
    const balancesAsDiscount =
      lineType !== "discount" &&
      item.total > 0 &&
      looksLikePromotionLine(item.name) &&
      Math.abs(initialSum - item.total * 2 - documentTotal) <= tolerance;

    if (balancesAsDiscount) {
      lineType = "discount";
      const warning = `La linea "${item.name}" se reclasifico como descuento porque asi coincide con el total.`;
      if (!warnings.includes(warning)) warnings.push(warning);
    }

    const isDiscount = lineType === "discount";

    return {
      ...item,
      lineType,
      unitPrice: isDiscount ? -Math.abs(item.unitPrice) : item.unitPrice,
      total: isDiscount ? -Math.abs(item.total) : item.total,
      sku: isDiscount ? "" : item.sku,
      inventoryCandidate:
        lineType === "product" && item.inventoryCandidate,
    };
  });

  return {
    ...analysis,
    extractedData: {
      ...analysis.extractedData,
      items: normalizedItems,
      warnings,
    },
  };
}

export function normalizeDocumentAmounts(
  analysis: DocumentAnalysis,
): DocumentAnalysis {
  const data = analysis.extractedData;
  const subtotal = Number(data.subtotal);
  const iva = Number(data.iva);
  const total = Number(data.total);
  const tolerance = 0.05;

  if (total <= 0 || iva <= 0 || iva >= total) {
    return analysis;
  }

  const subtotalMatchesTotal = Math.abs(subtotal - total) <= tolerance;
  const formulaMatches = Math.abs(subtotal + iva - total) <= tolerance;

  if (formulaMatches) {
    return analysis;
  }

  if (!subtotalMatchesTotal && subtotal > 0) {
    const warning =
      "Subtotal, IVA y total no coinciden con la fórmula esperada; verifica descuentos o datos del ticket.";

    return {
      ...analysis,
      extractedData: {
        ...data,
        warnings: data.warnings.includes(warning)
          ? data.warnings
          : [...data.warnings, warning],
      },
    };
  }

  const inferredSubtotal = Number((total - iva).toFixed(2));
  const warning =
    "El subtotal no aparecía claramente o coincidía con el total; se calculó como total menos IVA.";

  return {
    ...analysis,
    extractedData: {
      ...data,
      subtotal: inferredSubtotal,
      subtotalInferred: true,
      originalSubtotal: subtotal,
      warnings: data.warnings.includes(warning)
        ? data.warnings
        : [...data.warnings, warning],
    },
  };
}

export function applyDocumentReviewRules(
  analysis: DocumentAnalysis,
): DocumentAnalysis {
  const data = analysis.extractedData;
  const reasons: string[] = [];

  if (!data.category.trim()) reasons.push("No se detectó una categoría.");
  if (!data.issuerName.trim()) reasons.push("No se detectó el emisor.");
  if (!data.issuerRfc.trim()) reasons.push("No se detectó el RFC del emisor.");
  if (!data.date.trim()) reasons.push("No se detectó la fecha.");
  if (data.subtotal <= 0) reasons.push("No se detectó un subtotal válido.");
  if (data.iva <= 0) reasons.push("No se detectó un IVA válido.");
  if (data.total <= 0) reasons.push("No se detectó un total válido.");
  if (data.currency === "unknown") reasons.push("No se detectó la moneda.");
  if (!data.paymentMethod.trim()) {
    reasons.push("No se detectó el método de pago.");
  }
  if (!data.description.trim()) reasons.push("No se detectó la descripción.");
  const items = data.items ?? [];
  if (
    ["ticket", "invoice"].includes(data.documentType) &&
    items.length === 0
  ) {
    reasons.push("No se detectó el desglose de productos.");
  }
  items.forEach((item, index) => {
    const label = item.name || `Producto ${index + 1}`;
    const lineType =
      item.lineType ?? (item.inventoryCandidate ? "product" : "other");
    if (!item.name.trim()) {
      reasons.push(`No se detectó el nombre del producto ${index + 1}.`);
    }
    if (lineType === "product" && item.quantity <= 0) {
      reasons.push(`La cantidad de ${label} no es válida.`);
    }
    if (item.confidence < 0.9) {
      reasons.push(
        `La confianza de ${label} es ${Math.round(item.confidence * 100)}%, menor al 90%.`,
      );
    }
  });
  if (items.length > 0 && data.total > 0) {
    const itemTotal = items.reduce((sum, item) => sum + item.total, 0);
    const tolerance = Math.max(1, data.total * 0.02);
    if (Math.abs(itemTotal - data.total) > tolerance) {
      reasons.push(
        "La suma del desglose de productos no coincide con el total del comprobante.",
      );
    }
  }
  if (data.documentType === "other") {
    reasons.push("No se pudo clasificar el tipo de documento.");
  }
  if (data.confidence < 0.9) {
    reasons.push(
      `La confianza del análisis es ${Math.round(data.confidence * 100)}%, menor al 90%.`,
    );
  }

  reasons.push(...data.warnings);
  const reviewReasons = [...new Set(reasons)];
  const reviewRequired = reviewReasons.length > 0;

  return {
    ...analysis,
    extractedData: {
      ...data,
      reviewRequired,
      reviewReasons,
      reviewed: reviewRequired ? Boolean(data.reviewed) : true,
      reviewedAt: reviewRequired ? data.reviewedAt : new Date().toISOString(),
    },
  };
}

function inferLineType(item: DocumentLineItem): DocumentLineType {
  const name = normalizeLabel(item.name);

  if (
    item.total < 0 ||
    item.unitPrice < 0 ||
    /\b(descuento|promocion|promo|ahorro|bonificacion|rebaja|cupon)\b/.test(
      name,
    )
  ) {
    return "discount";
  }

  if (item.lineType && DOCUMENT_LINE_TYPES.includes(item.lineType)) {
    return item.lineType;
  }

  if (normalizeLabel(item.unit) === "servicio") return "service";
  return item.inventoryCandidate ? "product" : "other";
}

function looksLikePromotionLine(name: string) {
  const normalizedName = normalizeLabel(name);
  return (
    /^\d+(?:[.,]\d+)?\s*x\b/.test(normalizedName) ||
    /\b(descuento|promocion|promo|ahorro|bonificacion|rebaja|cupon)\b/.test(
      normalizedName,
    )
  );
}

function normalizeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
