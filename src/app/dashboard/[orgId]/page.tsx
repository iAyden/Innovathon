import type { Metadata } from "next";
import { DashboardClient } from "./DashboardClient";

export const metadata: Metadata = {
  title: "Dashboard del Negocio",
};

export default function BusinessDashboardPage() {
  return <DashboardClient />;
}
