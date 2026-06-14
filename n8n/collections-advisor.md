# Workflow: collections-advisor

Este workflow analiza toda la cartera de clientes. No se ejecuta al abrir la
pagina; solo cuando el usuario pulsa `Analizar cartera`.

## Flujo

```text
Webhook
  -> Validar HMAC
  -> Basic LLM Chain
       -> OpenAI Chat Model
       -> Structured Output Parser
  -> Respond to Webhook
```

## Webhook

- Method: `POST`
- Path: `pulso/collections-advisor`
- Response: `Using Respond to Webhook Node`

Agrega la URL de produccion en:

```text
N8N_COLLECTIONS_ADVISOR_WEBHOOK_URL=
```

El portafolio se recibe en `{{ $json.body.data }}`. Incluye `customers`,
`receivables` y `totals`.

## Basic LLM Chain

Activa `Require Specific Output Format` y usa:

```text
Eres un asesor prudente de cobranza para microempresas mexicanas.

Analiza la cartera completa. Prioriza liquidez, saldos vencidos, concentracion
por cliente y acciones concretas de seguimiento. No amenaces, no inventes datos
y no des asesoria legal.

Cartera:
{{ JSON.stringify($json.body.data) }}

Devuelve un resumen breve, observaciones verificables, pendientes accionables,
recomendaciones y un nivel de riesgo.
```

## Structured Output Parser

Selecciona `JSON Schema`:

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

## Respond to Webhook

- Respond With: `JSON`
- Response Body: `={{ { analysis: $json.output } }}`
- Response Code: `200`

La aplicacion conserva el ultimo analisis. Si el webhook no esta configurado o
falla, genera recomendaciones locales sin consumir tokens.
