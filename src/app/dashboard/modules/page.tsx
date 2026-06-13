import type { Metadata } from "next";
import { ModulesClient } from "./ModulesClient";

export const metadata: Metadata = {
  title: "Modulos",
};

export default function ModulesPage() {
  return <ModulesClient />;
}
