# Workflow: document-analysis

Este workflow analiza imágenes o PDF de facturas, tickets y recibos. Además de
los totales, debe devolver cada producto con su cantidad para preparar una
integración posterior con Inventario.

## Flujo

```text
Webhook
  -> Validar HMAC
  -> Convertir base64 a archivo binario
  -> Analyze Image
  -> Basic LLM Chain
       -> OpenAI Chat Model
       -> Structured Output Parser
  -> Respond to Webhook
```

El webhook conserva:

- Método: `POST`
- Path: `pulso/document-analysis`
- Respuesta: `Using Respond to Webhook Node`

## Analyze Image

Usa un modelo con visión y solicita:

```text
Transcribe toda la información visible del comprobante sin inventar datos.

Incluye:
- emisor y RFC;
- fecha, subtotal, IVA, total, moneda y método de pago;
- cada línea de producto o servicio;
- cantidad, unidad, precio unitario, importe y SKU cuando aparezcan;
- descuentos, promociones, impuestos o cargos como líneas separadas;
- texto ilegible o ambiguo.

Conserva los nombres tal como aparecen. Si una línea no muestra cantidad pero
claramente corresponde a una sola pieza, indica cantidad 1 y deja constancia de
la incertidumbre en el texto. Conserva el signo de los descuentos y no combines
promociones con productos.
```

## Basic LLM Chain

Activa `Require Specific Output Format`.

Prompt:

```text
Eres un extractor estructurado de comprobantes de compra mexicanos.

Convierte la transcripción en datos estructurados sin inventar información.
Usa cadenas vacías y cero cuando un dato no sea visible.

Transcripción:
{{ $json.sourceText }}

Reglas para items:
- Devuelve una línea por producto o servicio comprado.
- lineType debe ser product, service, discount, tax, charge u other.
- quantity es la cantidad comprada. Usa 1 únicamente cuando la línea representa
  claramente una sola unidad.
- unit debe ser "pieza", "kg", "g", "l", "ml", "servicio" u otra unidad visible.
- unitPrice es el precio por unidad y total es el importe de la línea.
- Los descuentos y promociones deben usar lineType "discount", total y
  unitPrice negativos, e inventoryCandidate false.
- Los impuestos y cargos deben usar lineType "tax" o "charge" e
  inventoryCandidate false.
- Una línea como "2 x [texto]" no es automáticamente un producto: compara sus
  importes contra el total para determinar si representa una promoción.
- inventoryCandidate solo es true para bienes físicos que razonablemente pueden
  incorporarse a inventario.
- sku debe ser cadena vacía cuando no esté impreso literalmente. Nunca generes
  ni deduzcas un SKU.
- confidence va de 0 a 1 para cada línea.
- Si no se distinguen productos, devuelve items vacío y agrega una advertencia.

La suma de los items, incluyendo descuentos o cargos, debe aproximarse al total
del comprobante. No alteres importes para forzar la coincidencia.

Responde exclusivamente con un único objeto JSON.
No uses bloques Markdown ni agregues texto antes o después.
```

Si el nodo anterior tiene otra estructura, abre su salida y ajusta únicamente la
expresión de `Transcripción` para apuntar al campo que contiene el texto.

## Structured Output Parser

Selecciona `JSON Schema`, no `Generate from JSON Example`, y pega:

```json
{
  "type": "object",
  "properties": {
    "extractedData": {
      "type": "object",
      "properties": {
        "documentType": {
          "type": "string",
          "enum": ["invoice", "ticket", "receipt", "other"]
        },
        "issuerName": {
          "type": "string"
        },
        "issuerRfc": {
          "type": "string"
        },
        "date": {
          "type": "string"
        },
        "subtotal": {
          "type": "number"
        },
        "iva": {
          "type": "number"
        },
        "total": {
          "type": "number"
        },
        "currency": {
          "type": "string",
          "enum": ["MXN", "USD", "unknown"]
        },
        "paymentMethod": {
          "type": "string"
        },
        "category": {
          "type": "string"
        },
        "description": {
          "type": "string"
        },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string"
              },
              "quantity": {
                "type": "number"
              },
              "unit": {
                "type": "string"
              },
              "unitPrice": {
                "type": "number"
              },
              "total": {
                "type": "number"
              },
              "sku": {
                "type": "string"
              },
              "inventoryCandidate": {
                "type": "boolean"
              },
              "lineType": {
                "type": "string",
                "enum": [
                  "product",
                  "service",
                  "discount",
                  "tax",
                  "charge",
                  "other"
                ]
              },
              "confidence": {
                "type": "number",
                "minimum": 0,
                "maximum": 1
              }
            },
            "required": [
              "name",
              "quantity",
              "unit",
              "unitPrice",
              "total",
              "sku",
              "inventoryCandidate",
              "lineType",
              "confidence"
            ],
            "additionalProperties": false
          }
        },
        "confidence": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "warnings": {
          "type": "array",
          "items": {
            "type": "string"
          }
        }
      },
      "required": [
        "documentType",
        "issuerName",
        "issuerRfc",
        "date",
        "subtotal",
        "iva",
        "total",
        "currency",
        "paymentMethod",
        "category",
        "description",
        "items",
        "confidence",
        "warnings"
      ],
      "additionalProperties": false
    },
    "recommendations": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": ["extractedData", "recommendations"],
  "additionalProperties": false
}
```

## Respond to Webhook

- Respond With: `JSON`
- Response Body: `={{ $json.output }}`
- Response Code: `200`

La aplicación guarda `items` dentro del JSONB `extracted_data`; no requiere una
migración adicional. Un ticket pasa a revisión cuando no detecta productos, una
cantidad no es válida, la confianza de una línea es menor al 90% o la suma de
líneas no coincide con el total.
