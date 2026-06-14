"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Expense,
  InvoiceUploadResult,
  buildValidationTitle,
  createExpense,
  formatCurrency,
  getExpenseStatusLabel,
  getExpenses,
  getValidationErrorAction,
  getValidationErrorLabel,
  requestInvoice,
  uploadInvoiceXml,
} from "@/lib/fiscal-api";
import { Loader2, Plus, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
export function InvoicesClient() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] =
  useState<InvoiceUploadResult | null>(null);

  const [form, setForm] = useState({
    supplierName: "",
    supplierEmail: "",
    amount: "",
    description: "",
    expenseDate: new Date().toISOString().slice(0, 10),
  });

  async function loadExpenses() {
    try {
      setLoading(true);
      const data = await getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error("Error loading expenses:", error);
      setMessage("No se pudieron cargar los egresos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getExpenses()
      .then((data) => {
        if (active) setExpenses(data);
      })
      .catch((error) => {
        console.error("Error loading expenses:", error);
        if (active) setMessage("No se pudieron cargar los egresos.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setCreating(true);
      setMessage(null);

      await createExpense({
        supplierName: form.supplierName,
        supplierEmail: form.supplierEmail,
        amount: Number(form.amount),
        description: form.description,
        expenseDate: form.expenseDate,
      });

      setForm({
        supplierName: "",
        supplierEmail: "",
        amount: "",
        description: "",
        expenseDate: new Date().toISOString().slice(0, 10),
      });

      setMessage("Egreso registrado correctamente.");
      await loadExpenses();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRequestInvoice(expenseId: string) {
    try {
      setRequestingId(expenseId);
      setMessage(null);
      const result = await requestInvoice(expenseId);
      setMessage(
        result.status === "sent"
          ? "Solicitud de factura enviada al proveedor."
          : "La solicitud quedo como borrador porque el workflow no pudo enviarla.",
      );
      await loadExpenses();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setRequestingId(null);
    }
  }

  async function handleUploadXml(
  expenseId: string,
  event: ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  try {
    setMessage(null);
    const result = await uploadInvoiceXml(expenseId, file);

    setValidationResult(result);

    if (result.valid) {
      setMessage("XML validado correctamente y ligado al egreso.");
    } else {
      setMessage("El XML requiere corrección. Revisa el detalle abajo.");
    }

    await loadExpenses();
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Error inesperado.");
  } finally {
    event.target.value = "";
  }
}

  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Facturas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registra egresos, solicita XML/PDF y valida facturas de proveedores.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {message}
        </div>
      )}
      {validationResult && (
  <div
    className={`rounded-xl border p-4 text-sm ${
      validationResult.valid
        ? "border-green-200 bg-green-50 text-green-950"
        : "border-orange-200 bg-orange-50 text-orange-950"
    }`}
  >
    <h3 className="font-semibold">{buildValidationTitle(validationResult)}</h3>

    {validationResult.valid ? (
      <p className="mt-2">
        La factura coincide con el egreso registrado. Se detectó un total de{" "}
        {formatCurrency(validationResult.invoice.total ?? 0)} y un IVA de{" "}
        {formatCurrency(validationResult.invoice.iva ?? 0)}.
      </p>
    ) : (
      <div className="mt-3 space-y-3">
        <div>
          <p className="font-medium">Problemas detectados:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {validationResult.errors.map((error) => (
              <li key={error}>{getValidationErrorLabel(error)}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium">Acción sugerida:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {validationResult.errors.map((error) => (
              <li key={error}>{getValidationErrorAction(error)}</li>
            ))}
          </ul>
        </div>
      </div>
    )}

    <div className="mt-4 grid gap-2 rounded-lg border bg-white/60 p-3 text-xs md:grid-cols-2">
      <p>
        <span className="font-medium">UUID:</span>{" "}
        {validationResult.invoice.uuid ?? "No detectado"}
      </p>
      <p>
        <span className="font-medium">RFC emisor:</span>{" "}
        {validationResult.invoice.issuerRfc ?? "No detectado"}
      </p>
      <p>
        <span className="font-medium">RFC receptor:</span>{" "}
        {validationResult.invoice.receiverRfc ?? "No detectado"}
      </p>
      <p>
        <span className="font-medium">Total:</span>{" "}
        {formatCurrency(validationResult.invoice.total ?? 0)}
      </p>
      <p>
        <span className="font-medium">IVA:</span>{" "}
        {formatCurrency(validationResult.invoice.iva ?? 0)}
      </p>
      <p>
        <span className="font-medium">Uso CFDI:</span>{" "}
        {validationResult.invoice.cfdiUse ?? "No detectado"}
      </p>
    </div>
  </div>
)}

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <h2 className="font-semibold">Nuevo egreso sin factura</h2>
        </div>

        <form
          onSubmit={handleCreateExpense}
          className="grid gap-3 md:grid-cols-2"
        >
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Proveedor"
            value={form.supplierName}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, supplierName: event.target.value }))
            }
            required
          />

          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Correo del proveedor"
            value={form.supplierEmail}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, supplierEmail: event.target.value }))
            }
          />

          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Monto"
            type="number"
            min="1"
            value={form.amount}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            required
          />

          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            type="date"
            value={form.expenseDate}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, expenseDate: event.target.value }))
            }
            required
          />

          <input
            className="rounded-md border bg-background px-3 py-2 text-sm md:col-span-2"
            placeholder="Descripción"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
          />

          <Button type="submit" disabled={creating} className="w-full md:w-fit">
            {creating ? "Registrando..." : "Registrar egreso"}
          </Button>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Egresos y facturas pendientes</h2>

        {loading ? (
          <p className="text-muted-foreground mt-4 text-sm">
            Cargando egresos...
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left">
                  <th className="py-3 pr-4">Proveedor</th>
                  <th className="py-3 pr-4">Descripción</th>
                  <th className="py-3 pr-4">Monto</th>
                  <th className="py-3 pr-4">IVA en riesgo</th>
                  <th className="py-3 pr-4">Fecha</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b">
                    <td className="py-3 pr-4 font-medium">
                      {expense.supplierName}
                    </td>
                    <td className="text-muted-foreground py-3 pr-4">
                      {expense.description ?? "-"}
                    </td>
                    <td className="py-3 pr-4">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatCurrency(expense.ivaAmount)}
                    </td>
                    <td className="py-3 pr-4">{expense.expenseDate}</td>
                    <td className="py-3 pr-4">
                      <span className="rounded-full border px-2 py-1 text-xs">
                        {getExpenseStatusLabel(expense.status)}
                      </span>
                    </td>
                    <td className="space-x-2 py-3 pr-4">
                      {expense.status === "missing_invoice" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestingId === expense.id}
                          onClick={() => handleRequestInvoice(expense.id)}
                        >
                          {requestingId === expense.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Send />
                          )}
                          {requestingId === expense.id
                            ? "Enviando..."
                            : "Solicitar factura"}
                        </Button>
                      )}

                      {expense.status !== "validated" && (
                        <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-xs font-medium">
                          <Upload className="mr-2 h-3 w-3" />
                          Subir XML
                          <input
                            type="file"
                            accept=".xml,text/xml,application/xml"
                            className="hidden"
                            onChange={(event) =>
                              handleUploadXml(expense.id, event)
                            }
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {expenses.length === 0 && (
              <p className="text-muted-foreground py-6 text-sm">
                Todavía no hay egresos registrados.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
