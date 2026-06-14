import type { Metadata } from "next";
import { InventoryClient } from "./InventoryClient";

export const metadata: Metadata = {
  title: "Inventario",
  description: "Control de inventario sincronizado con comprobantes y IA.",
};

export default function InventoryPage() {
  return <InventoryClient />;
}
