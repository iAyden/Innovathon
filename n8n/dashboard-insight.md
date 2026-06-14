# Workflow: dashboard-insight

Este workflow analiza la situacion general del negocio. Incluye liquidez,
cobranza, facturacion, inventario, proveedores y contexto del perfil.

Solo se ejecuta cuando el usuario pulsa `Generar con IA`.

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
- Path: `pulso/dashboard-insight`
- Response: `Using Respond to Webhook Node`
- Variable: `AI_DASHBOARD_INSIGHT_WEBHOOK_URL`

## Prompt

Reemplaza el prompt anterior enfocado en IVA por este:

```text
Eres un asesor financiero y operativo para microempresas mexicanas.

Analiza la situacion general del negocio usando exclusivamente los indicadores
recibidos. Considera liquidez, ingresos y egresos, cuentas por cobrar,
facturacion e IVA, inventario, proveedores, metas y calidad de los datos.

Indicadores:
{{ JSON.stringify($("Webhook").item.json.body.data) }}

Reglas:
- Prioriza el riesgo que tenga mayor impacto inmediato en la continuidad del
  negocio.
- No inventes ventas, demanda, obligaciones fiscales ni datos faltantes.
- Si faltan datos importantes, indicalo como la accion prioritaria.
- No presentes el IVA como problema principal si existe un riesgo mayor de
  liquidez, cobranza u operacion.
- Genera una recomendacion breve, concreta y prudente.

Devuelve unicamente un objeto JSON con esta forma:

{
  "title": "Texto breve",
  "message": "Explicacion",
  "recommendedAction": "Accion concreta",
  "riskLevel": "low"
}

riskLevel debe ser exclusivamente "low", "medium" o "high".
No incluyas las propiedades "output", "type", "properties", "required" ni
"enum".
No devuelvas el esquema JSON.
```

## Structured Output Parser

Selecciona `JSON Schema` y pega:

```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string"
    },
    "message": {
      "type": "string"
    },
    "recommendedAction": {
      "type": "string"
    },
    "riskLevel": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    }
  },
  "required": [
    "title",
    "message",
    "recommendedAction",
    "riskLevel"
  ],
  "additionalProperties": false
}
```

## Respond to Webhook

- Respond With: `JSON`
- Response Body: `={{ $json.output }}`
- Response Code: `200`
