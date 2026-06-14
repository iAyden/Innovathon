import type { Metadata } from "next";
import { OrdersClient } from "./OrdersClient";

export const metadata: Metadata = {
  title: "Pedidos",
  description: "Sube y procesa tus comprobantes de pedidos.",
};

export default function OrdersPage() {
  return <OrdersClient />;
}
