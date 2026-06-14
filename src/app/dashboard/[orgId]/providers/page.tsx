import type { Metadata } from "next";
import { ProvidersClient } from "./ProvidersClient";

export const metadata: Metadata = {
  title: "Proveedores",
  description: "Mide el cumplimiento y tiempos de respuesta de tus proveedores.",
};

export default function ProvidersPage() {
  return <ProvidersClient />;
}
