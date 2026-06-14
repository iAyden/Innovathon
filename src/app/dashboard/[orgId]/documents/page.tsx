import type { Metadata } from "next";
import { DocumentsClient } from "./DocumentsClient";

export const metadata: Metadata = {
  title: "Documentos",
};

export default function DocumentsPage() {
  return <DocumentsClient />;
}

