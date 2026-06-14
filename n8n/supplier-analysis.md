# Workflow: supplier-analysis

Este workflow analiza todos los proveedores del negocio en una sola ejecución.
Solo se llama cuando el usuario pulsa `Analizar proveedores`, por lo que abrir o
recargar la página no consume tokens.

## Configuración

- Método: `POST`
- Path: `pulso/supplier-analysis`
- Variable en Pulso AI: `N8N_SUPPLIER_ANALYSIS_WEBHOOK_URL`
- Respuesta: nodo `Respond to Webhook`

Reutiliza los nodos de validación HMAC de los otros workflows. La firma llega en
`x-pulso-signature` y utiliza `N8N_WEBHOOK_SECRET`.

## Nodos

1. `Webhook`
2. Validación HMAC existente
3. `Basic LLM Chain`
4. `OpenAI Chat Model`
5. `Structured Output Parser`
6. `Respond to Webhook`

Conecta el modelo y el parser a los puertos correspondientes del
`Basic LLM Chain`.

## Prompt

```text
Eres un analista operativo para microempresas mexicanas.

Analiza el portafolio completo de proveedores usando solamente los datos
recibidos. No recalcules complianceScore y no inventes compras, facturas,
contactos, tiempos ni riesgos.

Totales del portafolio:
{{ JSON.stringify($json.body.data.totals) }}

Proveedores y métricas calculadas por Pulso AI:
{{ JSON.stringify($json.body.data.suppliers) }}

Identifica:
1. Observaciones generales sobre desempeño, concentración de gasto y calidad de
   los datos.
2. Pendientes concretos, mencionando el proveedor cuando corresponda.
3. Recomendaciones prudentes y accionables para la microempresa.

Devuelve únicamente el objeto solicitado. Usa riskLevel low, medium o high.
```

## JSON Schema

Selecciona `JSON Schema` en `Structured Output Parser`:

```json
{
  "type": "object",
  "properties": {
    "summary": {
      "type": "string"
    },
    "observations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "pendingActions": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "riskLevel": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    }
  },
  "required": [
    "summary",
    "observations",
    "pendingActions",
    "recommendations",
    "riskLevel"
  ],
  "additionalProperties": false
}
```

El modelo debe devolver los valores del análisis, no una descripción del schema.

## Respuesta

En `Respond to Webhook`:

- Respond With: `JSON`
- Response Body: `={{ $json.output }}`
- Response Code: `200`

URL de producción esperada:

```dotenv
N8N_SUPPLIER_ANALYSIS_WEBHOOK_URL=https://TU_INSTANCIA.app.n8n.cloud/webhook/pulso/supplier-analysis
```
