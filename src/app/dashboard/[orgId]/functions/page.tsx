import type { Metadata } from "next";
import { FunctionsClient } from "./FunctionsClient";

export const metadata: Metadata = {
  title: "Funciones",
};

export default function FunctionsPage() {
  return <FunctionsClient />;
}
