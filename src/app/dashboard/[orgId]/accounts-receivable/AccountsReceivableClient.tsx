"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import type {
  AccountReceivable,
  CollectionsAnalysis,
  Customer,
  ReceivableStatus,
} from "@/lib/accounts-receivable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";

const today = new Date().toISOString().slice(0, 10);
const EMPTY_CUSTOMER = {
  name: "",
  rfc: "",
  email: "",
  phone: "",
  paymentTermsDays: "0",
};
const EMPTY_RECEIVABLE = {
  customerId: "",
  folio: "",
  description: "",
  amount: "",
  currency: "MXN",
  issueDate: today,
  dueDate: today,
  notes: "",
};
const EMPTY_PAYMENT = {
  amount: "",
  paidOn: today,
  paymentMethod: "",
  reference: "",
  notes: "",
};

type PortfolioResponse = {
  customers: Customer[];
  receivables: AccountReceivable[];
  migrationRequired: boolean;
};

export function AccountsReceivableClient() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [analysis, setAnalysis] = useState<CollectionsAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [receivableOpen, setReceivableOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] =
    useState<AccountReceivable | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | ReceivableStatus | "all">("open");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [receivableForm, setReceivableForm] = useState(EMPTY_RECEIVABLE);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

  async function loadPortfolio() {
    const response = await fetch("/api/accounts-receivable", {
      cache: "no-store",
    });
    const data = (await response.json()) as PortfolioResponse & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(data.error ?? "No se pudo cargar la cartera.");
    }
    setCustomers(data.customers);
    setReceivables(data.receivables);
    if (data.migrationRequired) {
      setMessage(
        "Aplica la migracion de cuentas por cobrar para habilitar el modulo.",
      );
    }
  }

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch("/api/accounts-receivable", { cache: "no-store" }).then(
        async (response) => ({ response, data: await response.json() }),
      ),
      fetch("/api/accounts-receivable/analyze", { cache: "no-store" }).then(
        async (response) => ({ response, data: await response.json() }),
      ),
    ])
      .then(([portfolio, savedAnalysis]) => {
        if (!active) return;
        if (!portfolio.response.ok) {
          throw new Error(
            portfolio.data.error ?? "No se pudo cargar la cartera.",
          );
        }
        setCustomers(portfolio.data.customers ?? []);
        setReceivables(portfolio.data.receivables ?? []);
        setAnalysis(
          savedAnalysis.response.ok ? savedAnalysis.data.analysis : null,
        );
        if (portfolio.data.migrationRequired) {
          setMessage(
            "Aplica la migracion de cuentas por cobrar para habilitar el modulo.",
          );
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar la cartera.",
          );
        }
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const open = receivables.filter(
      (item) => !["paid", "cancelled"].includes(item.status),
    );
    const sevenDays = addDays(today, 7);
    const currentMonth = today.slice(0, 7);

    return {
      outstanding: open.reduce((sum, item) => sum + item.balance, 0),
      overdue: open
        .filter((item) => item.status === "overdue")
        .reduce((sum, item) => sum + item.balance, 0),
      dueSoon: open.filter(
        (item) =>
          item.status !== "overdue" &&
          item.dueDate >= today &&
          item.dueDate <= sevenDays,
      ).length,
      collectedThisMonth: receivables
        .flatMap((item) => item.payments)
        .filter((payment) => payment.paidOn.startsWith(currentMonth))
        .reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [receivables]);

  const filteredReceivables = useMemo(() => {
    const term = search.trim().toLowerCase();
    return receivables.filter((item) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "open"
            ? !["paid", "cancelled"].includes(item.status)
            : item.status === filter;
      const matchesSearch =
        !term ||
        [item.customerName, item.folio, item.description].some((value) =>
          value?.toLowerCase().includes(term),
        );
      return matchesFilter && matchesSearch;
    });
  }, [filter, receivables, search]);

  function openCustomer(customer?: Customer) {
    setEditingCustomer(customer ?? null);
    setCustomerForm(
      customer
        ? {
            name: customer.name,
            rfc: customer.rfc ?? "",
            email: customer.email ?? "",
            phone: customer.phone ?? "",
            paymentTermsDays: String(customer.paymentTermsDays),
          }
        : EMPTY_CUSTOMER,
    );
    setCustomerOpen(true);
  }

  function openReceivable() {
    const firstCustomer = customers[0];
    setReceivableForm({
      ...EMPTY_RECEIVABLE,
      customerId: firstCustomer?.id ?? "",
      dueDate: addDays(today, firstCustomer?.paymentTermsDays ?? 0),
    });
    setReceivableOpen(true);
  }

  async function submitCustomer(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers",
        {
          method: editingCustomer ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...customerForm,
            paymentTermsDays: Number(customerForm.paymentTermsDays),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setCustomerOpen(false);
      setMessage(editingCustomer ? "Cliente actualizado." : "Cliente creado.");
      await loadPortfolio();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setWorking(false);
    }
  }

  async function submitReceivable(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const response = await fetch("/api/accounts-receivable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...receivableForm,
          amount: Number(receivableForm.amount),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setReceivableOpen(false);
      setMessage("Cuenta por cobrar registrada.");
      await loadPortfolio();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setWorking(false);
    }
  }

  async function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!paymentTarget) return;
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/accounts-receivable/${paymentTarget.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...paymentForm,
            amount: Number(paymentForm.amount),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo registrar el pago.");
      }
      setPaymentTarget(null);
      setPaymentForm(EMPTY_PAYMENT);
      setMessage("Pago registrado y agregado al flujo de caja.");
      await loadPortfolio();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setWorking(false);
    }
  }

  async function cancelReceivable(item: AccountReceivable) {
    setWorking(true);
    setError(null);
    try {
      const response = await fetch(`/api/accounts-receivable/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo cancelar.");
      setMessage("Cuenta cancelada.");
      await loadPortfolio();
    } catch (cancelError) {
      setError(errorMessage(cancelError));
    } finally {
      setWorking(false);
    }
  }

  async function analyzePortfolio() {
    setAnalyzing(true);
    setError(null);
    try {
      const response = await fetch("/api/accounts-receivable/analyze", {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar.");
      setAnalysis(data.analysis);
      setMessage(
        data.automationSucceeded
          ? "Analisis de cobranza generado con IA."
          : data.automationConfigured
            ? "n8n no respondio; se genero el analisis con reglas."
            : "Configura el workflow de cobranza; se usaron reglas locales.",
      );
    } catch (analysisError) {
      setError(errorMessage(analysisError));
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Cuentas por cobrar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controla clientes, vencimientos, abonos y recuperación de cartera.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openCustomer()}>
            <UserRoundPlus />
            Nuevo cliente
          </Button>
          <Button onClick={openReceivable} disabled={customers.length === 0}>
            <Plus />
            Nueva cuenta
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CircleDollarSign}
          label="Saldo pendiente"
          value={formatMoney(summary.outstanding)}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Cartera vencida"
          value={formatMoney(summary.overdue)}
          warning={summary.overdue > 0}
        />
        <MetricCard
          icon={CalendarClock}
          label="Vencen en 7 dias"
          value={String(summary.dueSoon)}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Cobrado este mes"
          value={formatMoney(summary.collectedThisMonth)}
        />
      </div>

      <AnalysisCard
        analysis={analysis}
        analyzing={analyzing}
        disabled={receivables.length === 0}
        onAnalyze={analyzePortfolio}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <CardTitle>Cartera de clientes</CardTitle>
              <CardDescription>
                Abre una cuenta para consultar sus pagos registrados.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 sm:w-64"
                  placeholder="Buscar cliente o folio..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-lg border bg-background px-3 text-sm"
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value as typeof filter)
                }
              >
                <option value="open">Pendientes</option>
                <option value="overdue">Vencidas</option>
                <option value="partial">Pago parcial</option>
                <option value="paid">Pagadas</option>
                <option value="cancelled">Canceladas</option>
                <option value="all">Todas</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                onClick={() => loadPortfolio().catch((loadError) => setError(errorMessage(loadError)))}
                aria-label="Actualizar cartera"
              >
                <RefreshCw />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : receivables.length === 0 ? (
            <EmptyReceivables
              hasCustomers={customers.length > 0}
              onCustomer={() => openCustomer()}
              onReceivable={openReceivable}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.map((item) => (
                  <ReceivableRows
                    key={item.id}
                    item={item}
                    expanded={expandedId === item.id}
                    onToggle={() =>
                      setExpandedId(expandedId === item.id ? null : item.id)
                    }
                    onPayment={() => {
                      setPaymentTarget(item);
                      setPaymentForm({
                        ...EMPTY_PAYMENT,
                        amount: String(item.balance),
                      });
                    }}
                    onCancel={() => cancelReceivable(item)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
          {!loading &&
            receivables.length > 0 &&
            filteredReceivables.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No hay cuentas que coincidan con los filtros.
              </p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clientes
          </CardTitle>
          <CardDescription>
            Datos de contacto y condiciones habituales de crédito.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((customer) => (
            <div key={customer.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.email || customer.phone || "Sin contacto"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openCustomer(customer)}
                  aria-label={`Editar ${customer.name}`}
                >
                  <Pencil />
                </Button>
              </div>
              <div className="mt-4 flex justify-between text-sm">
                <span className="text-muted-foreground">Saldo</span>
                <span className="font-medium">
                  {formatMoney(customer.outstandingBalance)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {customer.openReceivables} cuenta
                {customer.openReceivables === 1 ? "" : "s"} abierta
                {customer.openReceivables === 1 ? "" : "s"} · Crédito{" "}
                {customer.paymentTermsDays} días
              </p>
            </div>
          ))}
          {customers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Registra tu primer cliente para comenzar.
            </p>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        editing={editingCustomer}
        form={customerForm}
        setForm={setCustomerForm}
        working={working}
        onSubmit={submitCustomer}
      />
      <ReceivableDialog
        open={receivableOpen}
        onOpenChange={setReceivableOpen}
        customers={customers}
        form={receivableForm}
        setForm={setReceivableForm}
        working={working}
        onSubmit={submitReceivable}
      />
      <PaymentDialog
        target={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        form={paymentForm}
        setForm={setPaymentForm}
        working={working}
        onSubmit={submitPayment}
      />
    </div>
  );
}

function ReceivableRows({
  item,
  expanded,
  onToggle,
  onPayment,
  onCancel,
}: {
  item: AccountReceivable;
  expanded: boolean;
  onToggle: () => void;
  onPayment: () => void;
  onCancel: () => void;
}) {
  const canCollect = !["paid", "cancelled"].includes(item.status);
  return (
    <>
      <TableRow>
        <TableCell>
          <p className="font-medium">{item.customerName}</p>
          <p className="text-xs text-muted-foreground">
            {item.folio || "Sin folio"}
          </p>
        </TableCell>
        <TableCell>{item.description}</TableCell>
        <TableCell>{formatDate(item.dueDate)}</TableCell>
        <TableCell>
          <p className="font-medium">
            {formatMoney(item.balance, item.currency)}
          </p>
          {item.paidAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              de {formatMoney(item.amount, item.currency)}
            </p>
          )}
        </TableCell>
        <TableCell>
          <StatusBadge status={item.status} />
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            {canCollect && (
              <Button size="sm" onClick={onPayment}>
                Registrar abono
              </Button>
            )}
            {canCollect && item.paidAmount === 0 && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              aria-label={`Ver pagos de ${item.customerName}`}
              aria-expanded={expanded}
            >
              <ChevronDown
                className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={6} className="bg-muted/20">
            <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
              <div>
                <p className="text-xs text-muted-foreground">Notas</p>
                <p className="mt-1 text-sm">{item.notes || "Sin notas."}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Emitida el {formatDate(item.issueDate)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Historial de pagos</p>
                <div className="mt-2 space-y-2">
                  {item.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between rounded-lg border bg-background p-3 text-sm"
                    >
                      <div>
                        <p>{payment.paymentMethod || "Pago registrado"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.paidOn)}
                          {payment.reference
                            ? ` · Ref. ${payment.reference}`
                            : ""}
                        </p>
                      </div>
                      <span className="font-medium text-emerald-600">
                        {formatMoney(payment.amount, item.currency)}
                      </span>
                    </div>
                  ))}
                  {item.payments.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aún no hay pagos registrados.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  working,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Customer | null;
  form: typeof EMPTY_CUSTOMER;
  setForm: (form: typeof EMPTY_CUSTOMER) => void;
  working: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          <DialogDescription>
            Registra contacto y plazo de crédito habitual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            id="customer-name"
            label="Nombre / razón social *"
            value={form.name}
            onChange={(name) => setForm({ ...form, name })}
            required
          />
          <FormField
            id="customer-rfc"
            label="RFC"
            value={form.rfc}
            onChange={(rfc) => setForm({ ...form, rfc })}
          />
          <FormField
            id="customer-email"
            label="Correo"
            type="email"
            value={form.email}
            onChange={(email) => setForm({ ...form, email })}
          />
          <FormField
            id="customer-phone"
            label="Teléfono / WhatsApp"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
          />
          <FormField
            id="customer-terms"
            label="Días de crédito"
            type="number"
            min="0"
            max="365"
            value={form.paymentTermsDays}
            onChange={(paymentTermsDays) =>
              setForm({ ...form, paymentTermsDays })
            }
          />
          <Button type="submit" disabled={working}>
            {working && <Loader2 className="animate-spin" />}
            Guardar cliente
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReceivableDialog({
  open,
  onOpenChange,
  customers,
  form,
  setForm,
  working,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  form: typeof EMPTY_RECEIVABLE;
  setForm: (form: typeof EMPTY_RECEIVABLE) => void;
  working: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  function selectCustomer(customerId: string) {
    const customer = customers.find((item) => item.id === customerId);
    setForm({
      ...form,
      customerId,
      dueDate: addDays(form.issueDate, customer?.paymentTermsDays ?? 0),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva cuenta por cobrar</DialogTitle>
          <DialogDescription>
            Registra el monto y la fecha acordada con el cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="receivable-customer">Cliente *</Label>
            <select
              id="receivable-customer"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm"
              value={form.customerId}
              onChange={(event) => selectCustomer(event.target.value)}
              required
            >
              <option value="">Selecciona un cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <FormField
            id="receivable-folio"
            label="Folio"
            value={form.folio}
            onChange={(folio) => setForm({ ...form, folio })}
          />
          <FormField
            id="receivable-amount"
            label="Monto *"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={(amount) => setForm({ ...form, amount })}
            required
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="receivable-description">Concepto *</Label>
            <Input
              id="receivable-description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              required
            />
          </div>
          <FormField
            id="receivable-issue"
            label="Fecha de emisión *"
            type="date"
            value={form.issueDate}
            onChange={(issueDate) => {
              const customer = customers.find(
                (item) => item.id === form.customerId,
              );
              setForm({
                ...form,
                issueDate,
                dueDate: addDays(
                  issueDate,
                  customer?.paymentTermsDays ?? 0,
                ),
              });
            }}
            required
          />
          <FormField
            id="receivable-due"
            label="Fecha de vencimiento *"
            type="date"
            value={form.dueDate}
            onChange={(dueDate) => setForm({ ...form, dueDate })}
            required
          />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="receivable-notes">Notas</Label>
            <Textarea
              id="receivable-notes"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </div>
          <Button type="submit" disabled={working} className="sm:col-span-2">
            {working && <Loader2 className="animate-spin" />}
            Registrar cuenta
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  target,
  onClose,
  form,
  setForm,
  working,
  onSubmit,
}: {
  target: AccountReceivable | null;
  onClose: () => void;
  form: typeof EMPTY_PAYMENT;
  setForm: (form: typeof EMPTY_PAYMENT) => void;
  working: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar abono</DialogTitle>
          <DialogDescription>
            Saldo pendiente:{" "}
            {target ? formatMoney(target.balance, target.currency) : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            id="payment-amount"
            label="Monto *"
            type="number"
            min="0.01"
            max={target?.balance}
            step="0.01"
            value={form.amount}
            onChange={(amount) => setForm({ ...form, amount })}
            required
          />
          <FormField
            id="payment-date"
            label="Fecha de pago *"
            type="date"
            value={form.paidOn}
            onChange={(paidOn) => setForm({ ...form, paidOn })}
            required
          />
          <FormField
            id="payment-method"
            label="Método de pago"
            value={form.paymentMethod}
            onChange={(paymentMethod) => setForm({ ...form, paymentMethod })}
          />
          <FormField
            id="payment-reference"
            label="Referencia"
            value={form.reference}
            onChange={(reference) => setForm({ ...form, reference })}
          />
          <Button type="submit" disabled={working}>
            {working && <Loader2 className="animate-spin" />}
            Confirmar pago
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisCard({
  analysis,
  analyzing,
  disabled,
  onAnalyze,
}: {
  analysis: CollectionsAnalysis | null;
  analyzing: boolean;
  disabled: boolean;
  onAnalyze: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análisis general de cobranza
              </CardTitle>
              {analysis && <StatusRisk risk={analysis.riskLevel} />}
              {analysis && (
                <Badge variant="outline">
                  {analysis.source === "n8n" ? "Generado con IA" : "Reglas"}
                </Badge>
              )}
            </div>
            <CardDescription>
              Prioriza clientes, saldos vencidos y acciones de seguimiento.
            </CardDescription>
          </div>
          <Button onClick={onAnalyze} disabled={analyzing || disabled}>
            {analyzing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {analysis ? "Actualizar análisis" : "Analizar cartera"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {analysis ? (
          <div className="space-y-5">
            <p className="text-sm">{analysis.summary}</p>
            <div className="grid gap-5 lg:grid-cols-3">
              <AnalysisList title="Observaciones" items={analysis.observations} />
              <AnalysisList
                title="Pendientes"
                items={analysis.pendingActions}
                warning
              />
              <AnalysisList
                title="Recomendaciones"
                items={analysis.recommendations}
              />
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Genera el análisis cuando lo necesites. Abrir la sección no consume
            tokens.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AnalysisList({
  title,
  items,
  warning = false,
}: {
  title: string;
  items: string[];
  warning?: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            {warning ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            )}
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof CircleDollarSign;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className={warning ? "h-4 w-4 text-destructive" : "h-4 w-4"} />
          {label}
        </p>
        <p className="mt-2 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ReceivableStatus }) {
  const config: Record<
    ReceivableStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    pending: { label: "Pendiente", variant: "outline" },
    partial: { label: "Pago parcial", variant: "secondary" },
    paid: { label: "Pagada", variant: "default" },
    overdue: { label: "Vencida", variant: "destructive" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}

function StatusRisk({ risk }: { risk: CollectionsAnalysis["riskLevel"] }) {
  return (
    <Badge
      variant={
        risk === "high" ? "destructive" : risk === "medium" ? "secondary" : "default"
      }
    >
      Riesgo {risk === "high" ? "alto" : risk === "medium" ? "medio" : "bajo"}
    </Badge>
  );
}

function EmptyReceivables({
  hasCustomers,
  onCustomer,
  onReceivable,
}: {
  hasCustomers: boolean;
  onCustomer: () => void;
  onReceivable: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Clock3 className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">Aún no hay cuentas registradas</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasCustomers
          ? "Registra el primer saldo pendiente de un cliente."
          : "Primero agrega un cliente para comenzar."}
      </p>
      <Button
        variant="outline"
        className="mt-4"
        onClick={hasCustomers ? onReceivable : onCustomer}
      >
        <Plus />
        {hasCustomers ? "Nueva cuenta" : "Nuevo cliente"}
      </Button>
    </div>
  );
}

function FormField({
  id,
  label,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  id: string;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.target.value)}
        {...props}
      />
    </div>
  );
}

function formatMoney(value: number, currency: "MXN" | "USD" = "MXN") {
  return new Intl.NumberFormat(currency === "MXN" ? "es-MX" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
