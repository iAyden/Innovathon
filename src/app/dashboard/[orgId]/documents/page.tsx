import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Documentos",
};

export default async function DocumentsPage({
  params,
}: PageProps<"/dashboard/[orgId]/documents">) {
  const { orgId } = await params;
  redirect(`/dashboard/${orgId}/orders?view=documents`);
}
