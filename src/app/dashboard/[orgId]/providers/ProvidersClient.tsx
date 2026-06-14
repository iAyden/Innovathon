"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  analyzeSupplierPortfolio,
  createSupplier,
  getSupplierPortfolioAnalysis,
  getSuppliers,
  updateSupplier,
  type Supplier,
  type SupplierPortfolioAnalysis,
} from "@/lib/fiscal-api";

const EMPTY_FORM = {
  name: "",
  email: "",
  rfc: "",
  whatsapp: "",
};

export function ProvidersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [portfolioAnalysis, setPortfolioAnalysis] =
    useState<SupplierPortfolioAnalysis | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadSuppliers() {
    setLoading(true);
    setError(null);
    try {
      setSuppliers(await getSuppliers());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No se pudieron cargar los proveedores.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    Promise.all([getSuppliers(), getSupplierPortfolioAnalysis()])
      .then(([supplierData, analysis]) => {
        if (!active) return;
        setSuppliers(supplierData);
        setPortfolioAnalysis(analysis);
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los proveedores.",
          );
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.rfc, supplier.email, supplier.whatsapp].some(
        (value) => value?.toLowerCase().includes(term),
      ),
    );
  }, [search, suppliers]);

  const summary = useMemo(() => {
    const suppliersWithActivity = suppliers.filter(
      (supplier) => supplier.metrics.hasActivity,
    );
    const responseTimes = suppliersWithActivity
      .map((supplier) => supplier.metrics.avgResponseDays)
      .filter((value): value is number => value !== null);

    return {
      total: suppliers.length,
      atRisk: suppliersWithActivity.filter(
        (supplier) => (supplier.metrics.complianceScore ?? 0) < 60,
      ).length,
      pendingInvoices: suppliers.reduce(
        (sum, supplier) => sum + supplier.metrics.pendingInvoiceCount,
        0,
      ),
      avgResponseDays:
        responseTimes.length > 0
          ? responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length
          : null,
    };
  }, [suppliers]);

  function openCreateDialog() {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      email: supplier.email ?? "",
      rfc: supplier.rfc ?? "",
      whatsapp: supplier.whatsapp ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setCreating(true);

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, form);
        setMessage("Proveedor actualizado.");
      } else {
        await createSupplier(form);
        setMessage("Proveedor creado.");
      }
      setDialogOpen(false);
      setEditingSupplier(null);
      setForm(EMPTY_FORM);
      await loadSuppliers();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo guardar el proveedor.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleAnalyzePortfolio() {
    setAnalyzing(true);
    setError(null);
    setMessage(null);

    try {
      const result = await analyzeSupplierPortfolio();
      setPortfolioAnalysis(result.analysis);
      await loadSuppliers();
      setMessage(
        result.automationSucceeded
          ? "Análisis general generado con IA."
          : result.automationConfigured
            ? "n8n no respondió; se generó un análisis general con reglas."
            : "Configura el webhook de proveedores; se usó el análisis general por reglas.",
      );
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "No se pudieron analizar los proveedores.",
      );
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controla contactos, facturación, tiempos de respuesta y riesgos.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger render={<Button onClick={openCreateDialog} />}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proveedor
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar proveedor" : "Añadir proveedor"}
              </DialogTitle>
              <DialogDescription>
                Completa sus datos de contacto. Solo el nombre es obligatorio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <SupplierForm form={form} setForm={setForm} />
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {message}
        </div>
      )}
      {error && !dialogOpen && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={WalletCards}
          label="Proveedores"
          value={String(summary.total)}
          detail="registrados"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Requieren atención"
          value={String(summary.atRisk)}
          detail="cumplimiento menor a 60%"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Facturas pendientes"
          value={String(summary.pendingInvoices)}
          detail="compras por regularizar"
        />
        <SummaryCard
          icon={Clock3}
          label="Respuesta promedio"
          value={
            summary.avgResponseDays === null
              ? "Sin datos"
              : `${summary.avgResponseDays.toFixed(1)} días`
          }
          detail="solicitudes respondidas"
        />
      </div>

      <PortfolioAnalysisCard
        analysis={portfolioAnalysis}
        analyzing={analyzing}
        disabled={suppliers.length === 0}
        onAnalyze={handleAnalyzePortfolio}
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold">Directorio de proveedores</h2>
            <p className="text-sm text-muted-foreground">
              Abre un registro para revisar sus métricas operativas.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="w-full pl-9 sm:w-64"
                placeholder="Buscar proveedor..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadSuppliers()}
              disabled={loading}
              aria-label="Actualizar proveedores"
            >
              <RefreshCw className={loading ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState onCreate={openCreateDialog} />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Cumplimiento</TableHead>
                  <TableHead>Compras</TableHead>
                  <TableHead>Pendientes</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => {
                  const expanded = expandedId === supplier.id;

                  return (
                    <SupplierRows
                      key={supplier.id}
                      supplier={supplier}
                      expanded={expanded}
                      onToggle={() =>
                        setExpandedId(expanded ? null : supplier.id)
                      }
                      onEdit={() => openEditDialog(supplier)}
                    />
                  );
                })}
              </TableBody>
            </Table>
            {filteredSuppliers.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No hay proveedores que coincidan con la búsqueda.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SupplierRows({
  supplier,
  expanded,
  onToggle,
  onEdit,
}: {
  supplier: Supplier;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <>
      <TableRow>
        <TableCell>
          <div>
            <p className="font-medium">{supplier.name}</p>
            <p className="text-xs text-muted-foreground">
              {supplier.rfc || "RFC no registrado"}
            </p>
          </div>
        </TableCell>
        <TableCell>
          <div className="space-y-1 text-xs">
            {supplier.email && (
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {supplier.email}
              </p>
            )}
            {supplier.whatsapp && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {supplier.whatsapp}
              </p>
            )}
            {!supplier.email && !supplier.whatsapp && (
              <span className="text-muted-foreground">Sin contacto</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <ComplianceBadge supplier={supplier} />
        </TableCell>
        <TableCell>
          <p className="font-medium">{supplier.metrics.purchaseCount}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(supplier.metrics.totalSpend)}
          </p>
        </TableCell>
        <TableCell>
          <Badge
            variant={
              supplier.metrics.pendingInvoiceCount > 0
                ? "destructive"
                : "outline"
            }
          >
            {supplier.metrics.pendingInvoiceCount}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={`Editar ${supplier.name}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-label={`Ver detalle de ${supplier.name}`}
            >
              <ChevronDown
                className={`transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-muted/20 p-4">
            <SupplierDetail supplier={supplier} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function SupplierDetail({ supplier }: { supplier: Supplier }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="Cobertura de facturas">
        {supplier.metrics.invoiceCoverageRate.toFixed(0)}%
      </Metric>
      <Metric label="Facturas recibidas">
        {supplier.metrics.receivedInvoiceCount}
      </Metric>
      <Metric label="Solicitudes respondidas">
        {supplier.metrics.responseCount} de {supplier.metrics.requestCount}
      </Metric>
      <Metric label="Respuesta promedio">
        {supplier.metrics.avgResponseDays === null
          ? "Sin datos"
          : `${supplier.metrics.avgResponseDays.toFixed(1)} días`}
      </Metric>
    </div>
  );
}

function PortfolioAnalysisCard({
  analysis,
  analyzing,
  disabled,
  onAnalyze,
}: {
  analysis: SupplierPortfolioAnalysis | null;
  analyzing: boolean;
  disabled: boolean;
  onAnalyze: () => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Análisis general de proveedores
            </h2>
            {analysis && <RiskBadge analysis={analysis} />}
            {analysis && (
              <Badge variant="outline">
                {analysis.source === "n8n" ? "Generado con IA" : "Reglas"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa en conjunto desempeño, pendientes y concentración de compras.
          </p>
        </div>
        <Button onClick={onAnalyze} disabled={analyzing || disabled}>
          {analyzing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {analysis ? "Actualizar análisis general" : "Analizar proveedores"}
        </Button>
      </div>

      {analysis ? (
        <div className="mt-5 space-y-5">
          <p className="text-sm">{analysis.summary}</p>
          <div className="grid gap-5 lg:grid-cols-3">
            <AnalysisList
              title="Observaciones"
              entries={analysis.observations}
              empty="No hay observaciones relevantes."
            />
            <AnalysisList
              title="Pendientes"
              entries={analysis.pendingActions}
              empty="No hay pendientes prioritarios."
              warning
            />
            <AnalysisList
              title="Recomendaciones"
              entries={analysis.recommendations}
              empty="Mantén la revisión periódica."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Actualizado el{" "}
            {new Intl.DateTimeFormat("es-MX", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(analysis.generatedAt))}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
          Genera el diagnóstico cuando lo necesites. Abrir la sección no consume
          tokens.
        </p>
      )}
    </section>
  );
}

function SupplierForm({
  form,
  setForm,
}: {
  form: typeof EMPTY_FORM;
  setForm: (value: typeof EMPTY_FORM) => void;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="supplier-name">Nombre / Razón social *</Label>
        <Input
          id="supplier-name"
          placeholder="Ej. Comercializadora del Norte"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplier-rfc">RFC</Label>
        <Input
          id="supplier-rfc"
          placeholder="Ej. XAXX010101000"
          value={form.rfc}
          onChange={(event) => setForm({ ...form, rfc: event.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplier-email">Correo electrónico</Label>
        <Input
          id="supplier-email"
          type="email"
          placeholder="contacto@empresa.com"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="supplier-whatsapp">WhatsApp / Teléfono</Label>
        <Input
          id="supplier-whatsapp"
          placeholder="Ej. 5512345678"
          value={form.whatsapp}
          onChange={(event) =>
            setForm({ ...form, whatsapp: event.target.value })
          }
        />
      </div>
    </>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{children}</p>
    </div>
  );
}

function ComplianceBadge({ supplier }: { supplier: Supplier }) {
  const score = supplier.metrics.complianceScore;
  if (score === null) return <Badge variant="outline">Sin historial</Badge>;

  return (
    <Badge
      variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"}
    >
      {score}%
    </Badge>
  );
}

function RiskBadge({ analysis }: { analysis: SupplierPortfolioAnalysis }) {
  return (
    <Badge
      variant={
        analysis.riskLevel === "high"
          ? "destructive"
          : analysis.riskLevel === "medium"
            ? "secondary"
            : "default"
      }
    >
      Riesgo{" "}
      {analysis.riskLevel === "high"
        ? "alto"
        : analysis.riskLevel === "medium"
          ? "medio"
          : "bajo"}
    </Badge>
  );
}

function AnalysisList({
  title,
  entries,
  empty,
  warning = false,
}: {
  title: string;
  entries: string[];
  empty: string;
  warning?: boolean;
}) {
  return (
    <div>
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {(entries.length > 0 ? entries : [empty]).map((entry) => (
          <li key={entry} className="flex gap-2">
            {warning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground">
        No tienes proveedores registrados.
      </p>
      <Button variant="outline" className="mt-4" onClick={onCreate}>
        <Plus className="mr-2 h-4 w-4" />
        Añadir el primero
      </Button>
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}
