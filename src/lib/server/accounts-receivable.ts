import "server-only";

import type {
  AccountReceivable,
  Customer,
  ReceivablePayment,
  ReceivableStatus,
} from "@/lib/accounts-receivable";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type AdminClient = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

export async function loadReceivablePortfolio(
  admin: AdminClient,
  organizationId: string,
) {
  const [customerResult, receivableResult, paymentResult] = await Promise.all([
    admin
      .from("customers")
      .select("id, name, rfc, email, phone, payment_terms_days, created_at")
      .eq("organization_id", organizationId)
      .order("name"),
    admin
      .from("accounts_receivable")
      .select(
        "id, customer_id, folio, description, amount, paid_amount, currency, issue_date, due_date, status, notes, created_at, customers(name)",
      )
      .eq("organization_id", organizationId)
      .order("due_date"),
    admin
      .from("receivable_payments")
      .select(
        "id, receivable_id, amount, paid_on, payment_method, reference, created_at",
      )
      .eq("organization_id", organizationId)
      .order("paid_on", { ascending: false }),
  ]);

  if (customerResult.error) throw new Error(customerResult.error.message);
  if (receivableResult.error) throw new Error(receivableResult.error.message);
  if (paymentResult.error) throw new Error(paymentResult.error.message);

  const paymentsByReceivable = new Map<string, ReceivablePayment[]>();
  for (const row of paymentResult.data ?? []) {
    const entries = paymentsByReceivable.get(row.receivable_id) ?? [];
    entries.push({
      id: row.id,
      amount: Number(row.amount),
      paidOn: row.paid_on,
      paymentMethod: row.payment_method,
      reference: row.reference,
      createdAt: row.created_at,
    });
    paymentsByReceivable.set(row.receivable_id, entries);
  }

  const today = new Date().toISOString().slice(0, 10);
  const receivables: AccountReceivable[] = (receivableResult.data ?? []).map(
    (row) => {
      const amount = Number(row.amount);
      const paidAmount = Number(row.paid_amount);
      const storedStatus = row.status as Exclude<ReceivableStatus, "overdue">;
      const status: ReceivableStatus =
        !["paid", "cancelled"].includes(storedStatus) && row.due_date < today
          ? "overdue"
          : storedStatus;
      const customer = Array.isArray(row.customers)
        ? row.customers[0]
        : row.customers;

      return {
        id: row.id,
        customerId: row.customer_id,
        customerName: customer?.name ?? "Cliente",
        folio: row.folio,
        description: row.description,
        amount,
        paidAmount,
        balance: Math.max(0, amount - paidAmount),
        currency: row.currency === "USD" ? "USD" : "MXN",
        issueDate: row.issue_date,
        dueDate: row.due_date,
        status,
        notes: row.notes,
        payments: paymentsByReceivable.get(row.id) ?? [],
        createdAt: row.created_at,
      };
    },
  );

  const customers: Customer[] = (customerResult.data ?? []).map((row) => {
    const open = receivables.filter(
      (item) =>
        item.customerId === row.id &&
        !["paid", "cancelled"].includes(item.status),
    );

    return {
      id: row.id,
      name: row.name,
      rfc: row.rfc,
      email: row.email,
      phone: row.phone,
      paymentTermsDays: row.payment_terms_days,
      outstandingBalance: open.reduce((sum, item) => sum + item.balance, 0),
      openReceivables: open.length,
      createdAt: row.created_at,
    };
  });

  return { customers, receivables };
}
