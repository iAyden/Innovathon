"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

type CashEntry = {
  id: string;
  entry_type: "income" | "expense";
  category: string | null;
  description: string | null;
  amount: number | string;
  occurred_on: string;
};

export function CashFlowClient() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [forecast, setForecast] = useState<unknown>(null);
  const [form, setForm] = useState({
    entryType: "income",
    amount: "",
    category: "",
    description: "",
    occurredOn: new Date().toISOString().slice(0, 10),
  });

  async function loadEntries() {
    const response = await fetch("/api/cash-flow", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "No se pudo cargar.");
    setEntries(data.entries);
    if (data.migrationRequired) {
      setMessage("Aplica la migracion de Pulso AI para habilitar movimientos.");
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/cash-flow", { cache: "no-store" })
      .then((response) => response.json().then((data) => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar.");
        if (!active) return;
        setEntries(data.entries);
        if (data.migrationRequired) {
          setMessage("Aplica la migracion de Pulso AI para habilitar movimientos.");
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

  async function createEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cash-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo registrar.");
      setForm((current) => ({ ...current, amount: "", description: "" }));
      await loadEntries();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setWorking(false);
    }
  }

  async function requestForecast() {
    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cash-flow/forecast", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo pronosticar.");
      setForecast(data.forecast);
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setWorking(false);
    }
  }

  const income = entries
    .filter((entry) => entry.entry_type === "income")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const expenses = entries
    .filter((entry) => entry.entry_type === "expense")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flujo de caja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra movimientos y solicita escenarios de liquidez.
          </p>
        </div>
        <Button onClick={requestForecast} disabled={working || entries.length === 0}>
          <Bot className="mr-2 h-4 w-4" />
          Pronosticar 30, 60 y 90 dias
        </Button>
      </div>

      {message && <div className="rounded-lg border bg-muted px-4 py-3 text-sm">{message}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Entradas" value={formatCurrency(income)} />
        <Metric label="Salidas" value={formatCurrency(expenses)} />
        <Metric label="Balance" value={formatCurrency(income - expenses)} />
      </div>

      {forecast !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Pronostico recibido</CardTitle>
            <CardDescription>Respuesta estructurada del workflow de n8n.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-xs">
              {JSON.stringify(forecast, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nuevo movimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEntry} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="entryType">Tipo</Label>
                <select
                  id="entryType"
                  className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
                  value={form.entryType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      entryType: event.target.value,
                    }))
                  }
                >
                  <option value="income">Entrada</option>
                  <option value="expense">Salida</option>
                </select>
              </div>
              <Field label="Monto" type="number" min="1" value={form.amount} onChange={(value) => setForm((current) => ({ ...current, amount: value }))} />
              <Field label="Categoria" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
              <Field label="Descripcion" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} />
              <Field label="Fecha" type="date" value={form.occurredOn} onChange={(value) => setForm((current) => ({ ...current, occurredOn: value }))} />
              <Button type="submit" disabled={working || !form.amount}>Registrar</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Movimientos recientes</CardTitle>
            <CardDescription>{loading ? "Cargando..." : `${entries.length} movimientos registrados`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{entry.description || entry.category || "Movimiento"}</p>
                  <p className="text-xs text-muted-foreground">{entry.occurred_on}</p>
                </div>
                <span className={entry.entry_type === "income" ? "text-emerald-600" : "text-orange-600"}>
                  {entry.entry_type === "income" ? "+" : "-"}{formatCurrency(Number(entry.amount))}
                </span>
              </div>
            ))}
            {!loading && entries.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">Aun no hay movimientos.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "onChange"> & {
  label: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}
