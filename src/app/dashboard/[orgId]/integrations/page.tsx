import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getN8nStatus } from "@/lib/server/n8n";

export const metadata: Metadata = {
  title: "Integraciones",
};

const descriptions: Record<string, string> = {
  "request-invoice": "Genera y envia solicitudes de factura a proveedores.",
  "dashboard-insight": "Convierte indicadores mensuales en acciones prioritarias.",
  "fiscal-profile": "Analiza la Constancia de Situacion Fiscal.",
  "module-recommendation": "Recomienda modulos segun giro, retos y metas.",
  "cashflow-forecast": "Produce escenarios de liquidez a 30, 60 y 90 dias.",
  "document-analysis": "Extrae informacion de tickets y documentos operativos.",
};

const workflowRoutes: Record<string, string> = {
  "request-invoice": "/invoices",
  "dashboard-insight": "",
  "fiscal-profile": "/profile",
  "module-recommendation": "/modules",
  "cashflow-forecast": "/cash-flow",
  "document-analysis": "",
};

export default async function IntegrationsPage({
  params,
}: PageProps<"/dashboard/[orgId]/integrations">) {
  const { orgId } = await params;
  const workflows = getN8nStatus();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integraciones n8n</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contratos preparados para conectar automatizaciones sin exponer
          credenciales al navegador.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Estado de workflows
          </CardTitle>
          <CardDescription>
            Cada webhook recibe un sobre versionado con correlationId,
            organizationId y firma HMAC opcional.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {workflows.map((workflow) => (
            <div key={workflow.workflow} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium">{workflow.workflow}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {descriptions[workflow.workflow]}
                  </p>
                </div>
                <Badge variant={workflow.configured ? "default" : "outline"}>
                  {workflow.configured ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <CircleDashed className="mr-1 h-3 w-3" />
                  )}
                  {workflow.configured ? "Conectado" : "Pendiente"}
                </Badge>
              </div>
              <code className="mt-3 block break-all rounded bg-muted px-2 py-1 text-xs">
                {workflow.environmentVariable}
              </code>
              <Link
                href={`/dashboard/${orgId}${workflowRoutes[workflow.workflow]}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "mt-3",
                })}
              >
                Abrir modulo
                <ArrowRight />
              </Link>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Callback para n8n</CardTitle>
          <CardDescription>
            Para procesos asincronos, n8n puede responder a esta ruta usando el
            mismo correlationId.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block rounded-lg bg-muted p-3 text-xs">
            POST /api/integrations/n8n/callback/[workflow]
          </code>
          <p className="mt-3 text-sm text-muted-foreground">
            Header requerido: <code>x-pulso-callback-secret</code>. Configura
            <code> N8N_CALLBACK_SECRET</code> en ambos sistemas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
