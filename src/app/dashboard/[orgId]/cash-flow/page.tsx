import type { Metadata } from "next";
import { CashFlowClient } from "./CashFlowClient";

export const metadata: Metadata = {
  title: "Flujo de caja",
};

export default function CashFlowPage() {
  return <CashFlowClient />;
}
