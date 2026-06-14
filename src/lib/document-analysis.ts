export type DocumentType = "invoice" | "ticket" | "receipt" | "other";
export type DocumentCurrency = "MXN" | "USD" | "unknown";

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
  items?: { name: string; quantity: number; unitPrice: number; articleId?: string }[];
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
    typeof data.confidence === "number" &&
    Array.isArray(data.warnings) &&
    data.warnings.every((warning) => typeof warning === "string") &&
    Array.isArray(analysis.recommendations) &&
    analysis.recommendations.every(
      (recommendation) => typeof recommendation === "string",
    )
  );
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
