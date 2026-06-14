"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardCheck,
  Loader2,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { DocumentAnalysisCard } from "@/components/modules/UploadTicket";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DocumentAnalysis, DocumentType } from "@/lib/document-analysis";

type DocumentRecord = {
  id: string;
  fileName: string;
  documentType: string;
  analysisStatus: "pending" | "processing" | "completed" | "failed";
  analysis: DocumentAnalysis | null;
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = [
  "Alimentos y bebidas",
  "Insumos",
  "Transporte",
  "Servicios",
  "Renta",
  "Mantenimiento",
  "Equipo",
  "Impuestos",
  "Otros",
];

type DocumentFilter = DocumentType | "all" | "review";

const TYPE_LABELS: Record<DocumentFilter, string> = {
  all: "Todos",
  review: "En revisión",
  invoice: "Facturas",
  ticket: "Tickets",
  receipt: "Recibos",
  other: "Otros",
};

export function DocumentsClient() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<DocumentFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadDocuments() {
    const response = await fetch("/api/documents", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error ?? "No se pudieron cargar los documentos.");
    }
    const nextDocuments = data.documents ?? [];
    setDocuments(nextDocuments);
    setExpandedId(
      (current) =>
        current ??
        nextDocuments.find((document: DocumentRecord) =>
          documentNeedsReview(document),
        )?.id ??
        null,
    );
  }

  useEffect(() => {
    let active = true;
    fetch("/api/documents", { cache: "no-store" })
      .then((response) =>
        response.json().then((data) => ({ response, data })),
      )
      .then(({ response, data }) => {
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar los documentos.");
        }
        if (active) {
          const nextDocuments = data.documents ?? [];
          setDocuments(nextDocuments);
          setExpandedId(
            nextDocuments.find((document: DocumentRecord) =>
              documentNeedsReview(document),
            )?.id ?? null,
          );
        }
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Error inesperado."),
      )
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          typeFilter === "all" ||
          (typeFilter === "review" &&
            document.analysis?.extractedData.reviewRequired &&
            !document.analysis.extractedData.reviewed) ||
          document.analysis?.extractedData.documentType === typeFilter,
      ),
    [documents, typeFilter],
  );

  async function updateDocument(
    id: string,
    payload: Record<string, string>,
    successMessage: string,
  ) {
    setWorkingId(id);
    setMessage(null);
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo actualizar.");
      setDocuments((current) =>
        current.map((document) =>
          document.id === id
            ? { ...document, analysis: data.analysis ?? document.analysis }
            : document,
        ),
      );
      window.dispatchEvent(new Event("pulso:notifications-changed"));
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Documentos analizados
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa, clasifica y convierte tickets confirmados en salidas.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => loadDocuments().catch((error) => setMessage(error.message))}
          disabled={loading}
        >
          <RefreshCw />
          Actualizar
        </Button>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-wrap gap-2">
          {(Object.keys(TYPE_LABELS) as DocumentFilter[]).map((type) => (
            <Button
              key={type}
              size="sm"
              variant={typeFilter === type ? "default" : "outline"}
              onClick={() => setTypeFilter(type)}
            >
              {TYPE_LABELS[type]}
            </Button>
          ))}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando documentos...
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((document) => {
            const expanded = expandedId === document.id;
            const needsReview = documentNeedsReview(document);
            const extractedData = document.analysis?.extractedData;

            return (
              <Card key={document.id} className="gap-0 overflow-hidden py-0">
                <button
                  type="button"
                  className="w-full px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  aria-expanded={expanded}
                  aria-controls={`document-${document.id}`}
                  onClick={() =>
                    setExpandedId((current) =>
                      current === document.id ? null : document.id,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">
                          {extractedData?.issuerName || document.fileName}
                        </p>
                        <Badge
                          variant={
                            needsReview
                              ? "destructive"
                              : document.analysisStatus === "completed"
                                ? "default"
                                : document.analysisStatus === "failed"
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {needsReview
                            ? "En revisión"
                            : document.analysisStatus === "completed"
                              ? "Analizado"
                              : document.analysisStatus === "failed"
                                ? "Falló"
                                : "Procesando"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="truncate">{document.fileName}</span>
                        <span>
                          {new Intl.DateTimeFormat("es-MX", {
                            dateStyle: "medium",
                          }).format(new Date(document.createdAt))}
                        </span>
                        {extractedData && (
                          <span className="font-medium text-foreground">
                            {formatDocumentAmount(
                              extractedData.total,
                              extractedData.currency,
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
                        expanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expanded && (
                  <div
                    id={`document-${document.id}`}
                    className="border-t"
                  >
                    {document.analysis ? (
                      <CardContent className="space-y-4 py-4">
                  <DocumentAnalysisCard analysis={document.analysis} />

                  <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
                    <label className="flex-1 space-y-2 text-sm">
                      <span className="font-medium">Clasificación confirmada</span>
                      <select
                        className="h-9 w-full rounded-lg border bg-background px-3"
                        value={document.analysis.extractedData.category || ""}
                        onChange={(event) =>
                          updateDocument(
                            document.id,
                            {
                              action: "classify",
                              category: event.target.value,
                            },
                            "Categoría actualizada.",
                          )
                        }
                        disabled={workingId === document.id}
                      >
                        <option value="" disabled>
                          Selecciona una categoría
                        </option>
                        {document.analysis.extractedData.category &&
                          !CATEGORIES.includes(
                            document.analysis.extractedData.category,
                          ) && (
                            <option
                              value={document.analysis.extractedData.category}
                            >
                              {document.analysis.extractedData.category}
                            </option>
                          )}
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    {document.analysis.extractedData.reviewRequired &&
                      !document.analysis.extractedData.reviewed && (
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateDocument(
                              document.id,
                              { action: "mark-reviewed" },
                              "Documento marcado como revisado.",
                            )
                          }
                          disabled={workingId === document.id}
                        >
                          {workingId === document.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <ClipboardCheck />
                          )}
                          Marcar revisado
                        </Button>
                      )}

                    <Button
                      onClick={() =>
                        updateDocument(
                          document.id,
                          { action: "register-expense" },
                          "Ticket registrado como salida en flujo de caja.",
                        )
                      }
                      disabled={
                        workingId === document.id ||
                        (document.analysis.extractedData.reviewRequired &&
                          !document.analysis.extractedData.reviewed) ||
                        document.analysis.extractedData.registeredAsExpense
                      }
                    >
                      {workingId === document.id ? (
                        <Loader2 className="animate-spin" />
                      ) : document.analysis.extractedData.registeredAsExpense ? (
                        <Check />
                      ) : (
                        <WalletCards />
                      )}
                      {document.analysis.extractedData.registeredAsExpense
                        ? "Salida registrada"
                        : document.analysis.extractedData.reviewRequired &&
                            !document.analysis.extractedData.reviewed
                          ? "Revisa antes de registrar"
                        : "Registrar como salida"}
                    </Button>
                  </div>

                  {document.analysis.extractedData.reviewRequired &&
                    !document.analysis.extractedData.reviewed && (
                      <p className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Confirma los datos antes de registrar este documento como
                        salida.
                      </p>
                    )}
                      </CardContent>
                    ) : (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        El análisis de este documento todavía no está disponible.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}

          {filteredDocuments.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No hay documentos en esta categoría.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function documentNeedsReview(document: DocumentRecord) {
  return Boolean(
    document.analysis?.extractedData.reviewRequired &&
      !document.analysis.extractedData.reviewed,
  );
}

function formatDocumentAmount(
  amount: number | null | undefined,
  currency: string | null | undefined,
) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "Total no disponible";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "MXN",
  }).format(numericAmount);
}
