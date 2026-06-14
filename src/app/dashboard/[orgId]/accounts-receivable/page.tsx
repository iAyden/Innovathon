import type { Metadata } from "next";
import { AccountsReceivableClient } from "./AccountsReceivableClient";

export const metadata: Metadata = {
  title: "Cuentas por cobrar",
  description: "Controla clientes, vencimientos y pagos pendientes.",
};

export default function AccountsReceivablePage() {
  return <AccountsReceivableClient />;
}
