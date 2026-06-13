import type { XmlInvoiceData } from "@/types";

function getTag(xml: string, tagName: string) {
  const escaped = tagName.replace(":", "\\:");
  return xml.match(new RegExp(`<[^>]*${escaped}[^>]*>`, "i"))?.[0] ?? null;
}

function getAttribute(tag: string | null, attr: string) {
  if (!tag) return null;
  return tag.match(new RegExp(`${attr}=[\"']([^\"']+)[\"']`, "i"))?.[1] ?? null;
}

function getNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseCfdiXml(xml: string): XmlInvoiceData {
  const comprobante = getTag(xml, "Comprobante");
  const emisor = getTag(xml, "Emisor");
  const receptor = getTag(xml, "Receptor");
  const timbre = getTag(xml, "TimbreFiscalDigital");
  const traslados = Array.from(xml.matchAll(/<[^>]*Traslado[^>]*>/gi)).map(
    (match) => match[0]
  );
  const ivaTraslado = traslados.find((tag) =>
    /Impuesto=[\"']002[\"']/i.test(tag)
  );

  return {
    uuid: getAttribute(timbre, "UUID"),
    issuerRfc: getAttribute(emisor, "Rfc") ?? getAttribute(emisor, "rfc"),
    issuerName: getAttribute(emisor, "Nombre") ?? getAttribute(emisor, "nombre"),
    receiverRfc:
      getAttribute(receptor, "Rfc") ?? getAttribute(receptor, "rfc"),
    receiverName:
      getAttribute(receptor, "Nombre") ?? getAttribute(receptor, "nombre"),
    cfdiUse: getAttribute(receptor, "UsoCFDI"),
    date: getAttribute(comprobante, "Fecha"),
    subtotal: getNumber(getAttribute(comprobante, "SubTotal")),
    iva: getNumber(getAttribute(ivaTraslado ?? null, "Importe")),
    total: getNumber(getAttribute(comprobante, "Total")),
  };
}

export function validateInvoiceAgainstExpense(input: {
  xml: string;
  businessRfc?: string | null;
  expenseAmount?: number | null;
}) {
  const invoice = parseCfdiXml(input.xml);
  const errors: string[] = [];

  if (!input.xml.trim().startsWith("<")) errors.push("invalid_xml");
  if (!invoice.uuid) errors.push("missing_uuid");
  if (!invoice.issuerRfc) errors.push("missing_issuer_rfc");
  if (!invoice.receiverRfc) errors.push("missing_receiver_rfc");
  if (!invoice.total) errors.push("missing_total");

  if (
    input.businessRfc &&
    invoice.receiverRfc &&
    input.businessRfc.toUpperCase() !== invoice.receiverRfc.toUpperCase()
  ) {
    errors.push("receiver_rfc_mismatch");
  }

  if (input.expenseAmount && invoice.total) {
    const difference = Math.abs(input.expenseAmount - invoice.total);
    if (difference > 1) errors.push("total_mismatch");
  }

  if (!invoice.iva || invoice.iva <= 0) errors.push("missing_iva");

  return {
    valid: errors.length === 0,
    invoice,
    errors,
    humanMessage: buildHumanValidationMessage(errors),
  };
}

export function buildHumanValidationMessage(errors: string[]) {
  if (errors.length === 0) {
    return "Factura validada correctamente. El XML ya puede ligarse al egreso.";
  }

  const messages: Record<string, string> = {
    invalid_xml: "El archivo no parece ser un XML válido.",
    missing_uuid: "No encontramos el UUID fiscal dentro del XML.",
    missing_issuer_rfc: "No encontramos el RFC emisor del proveedor.",
    missing_receiver_rfc: "No encontramos el RFC receptor del negocio.",
    receiver_rfc_mismatch:
      "El RFC receptor no coincide con los datos fiscales registrados del negocio.",
    missing_total: "No encontramos el total de la factura.",
    total_mismatch: "El total del XML no coincide con el monto registrado del gasto.",
    missing_iva:
      "No encontramos IVA trasladado en el XML. Requiere revisión antes de considerarlo acreditable.",
  };

  return errors.map((error) => messages[error] ?? error).join(" ");
}
