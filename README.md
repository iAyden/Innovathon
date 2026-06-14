# Pulso AI

Plataforma de organizacion financiera, operativa y fiscal para microempresas
mexicanas.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicacion usa Next.js 16, React 19, Supabase y Tailwind CSS.

## Base de datos

El esquema fiscal existente incluye organizaciones, miembros, perfiles fiscales,
proveedores, egresos, archivos CFDI y solicitudes de factura.

Antes de usar perfil operativo, modulos, flujo de caja o integraciones, aplica:

```text
supabase/migrations/202606130001_pulso_ai_core.sql
supabase/migrations/202606140001_accounts_receivable.sql
```

La migracion agrega:

- `business_profiles`
- `module_catalog`
- `organization_modules`
- `cash_flow_entries`
- `business_documents`
- `integration_events`
- `customers`
- `accounts_receivable`
- `receivable_payments`
- politicas RLS por membresia de organizacion

Los pagos de cuentas por cobrar generan automaticamente una entrada en
`cash_flow_entries`.

## n8n

Copia `.env.example` a tu configuracion local y agrega solo los webhooks que
quieras activar. La pantalla `/dashboard/integrations` muestra el estado de cada
workflow.

Cada webhook recibe:

```json
{
  "version": "1.0",
  "event": "cashflow-forecast",
  "correlationId": "uuid",
  "organizationId": "uuid",
  "occurredAt": "ISO-8601",
  "data": {}
}
```

Si existe `N8N_WEBHOOK_SECRET`, Pulso envia la firma HMAC SHA-256 en
`x-pulso-signature`.

Los procesos asincronos pueden responder en:

```text
POST /api/integrations/n8n/callback/[workflow]
```

El callback requiere `x-pulso-callback-secret`, cuyo valor debe coincidir con
`N8N_CALLBACK_SECRET`.

## Verificacion

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```
