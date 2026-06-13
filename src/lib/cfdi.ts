export type ParsedCfdi = {
  uuid: string | null;
  issuerRfc: string | null;
  issuerName: string | null;
  receiverRfc: string | null;
  receiverName: string | null;
  cfdiUse: string | null;
  date: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
};

function getTagByLocalName(xml: string, localName: string) {
  const regex = new RegExp(`<[a-zA-Z0-9_:-]*:?${localName}\\b[^>]*>`, "i");
  return xml.match(regex)?.[0] ?? null;
}

function getAttr(source: string | null, attrName: string) {
  if (!source) return null;

  const regex = new RegExp(`(?:\\s|^)${attrName}\\s*=\\s*"([^"]*)"`, "i");
  return source.match(regex)?.[1] ?? null;
}

function toNumber(value: string | null) {
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getIva(xml: string) {
  const impuestosTag = getTagByLocalName(xml, "Impuestos");
  const totalImpuestosTrasladados = toNumber(
    getAttr(impuestosTag, "TotalImpuestosTrasladados")
  );

  if (totalImpuestosTrasladados !== null) {
    return totalImpuestosTrasladados;
  }

  const trasladoIvaMatches = [
    ...xml.matchAll(
      /<[^>]*Traslado\b[^>]*Impuesto="002"[^>]*Importe="([^"]+)"[^>]*\/?>/gi
    ),
  ];

  const iva = trasladoIvaMatches.reduce((sum, match) => {
    const value = Number(match[1]);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);

  return iva || null;
}

export function parseCfdiXml(xml: string): ParsedCfdi {
  const comprobanteTag = getTagByLocalName(xml, "Comprobante");
  const emisorTag = getTagByLocalName(xml, "Emisor");
  const receptorTag = getTagByLocalName(xml, "Receptor");
  const timbreTag = getTagByLocalName(xml, "TimbreFiscalDigital");

  return {
    uuid: getAttr(timbreTag, "UUID"),
    issuerRfc: getAttr(emisorTag, "Rfc"),
    issuerName: getAttr(emisorTag, "Nombre"),
    receiverRfc: getAttr(receptorTag, "Rfc"),
    receiverName: getAttr(receptorTag, "Nombre"),
    cfdiUse: getAttr(receptorTag, "UsoCFDI"),
    date: getAttr(comprobanteTag, "Fecha"),
    subtotal: toNumber(getAttr(comprobanteTag, "SubTotal")),
    iva: getIva(xml),
    total: toNumber(getAttr(comprobanteTag, "Total")),
  };
}

export type CfdiValidationResult = {
  valid: boolean;
  status: "validated" | "needs_correction";
  errors: string[];
  humanMessage: string;
};

type ValidateCfdiParams = {
  parsed: ParsedCfdi;
  expectedReceiverRfc?: string | null;
  expectedTotal?: number | null;
};

export function validateCfdi({
  parsed,
  expectedReceiverRfc,
  expectedTotal,
}: ValidateCfdiParams): CfdiValidationResult {
  const errors: string[] = [];

  if (!parsed.uuid) {
    errors.push("missing_uuid");
  }

  if (!parsed.issuerRfc) {
    errors.push("missing_issuer_rfc");
  }

  if (!parsed.receiverRfc) {
    errors.push("missing_receiver_rfc");
  }

  if (
    expectedReceiverRfc &&
    parsed.receiverRfc &&
    parsed.receiverRfc.toUpperCase() !== expectedReceiverRfc.toUpperCase()
  ) {
    errors.push("receiver_rfc_mismatch");
  }

  if (
    expectedTotal !== null &&
    expectedTotal !== undefined &&
    parsed.total !== null
  ) {
    const difference = Math.abs(Number(parsed.total) - Number(expectedTotal));

    if (difference > 1) {
      errors.push("total_mismatch");
    }
  }

  if (!parsed.iva || parsed.iva <= 0) {
    errors.push("missing_iva");
  }

  const valid = errors.length === 0;

  return {
    valid,
    status: valid ? "validated" : "needs_correction",
    errors,
    humanMessage: buildHumanMessage(errors),
  };
}

function buildHumanMessage(errors: string[]) {
  if (errors.length === 0) {
    return "La factura fue validada correctamente y se ligó al egreso.";
  }

  const messages: Record<string, string> = {
    missing_uuid: "No encontramos el UUID fiscal dentro del XML.",
    missing_issuer_rfc: "No encontramos el RFC del emisor dentro del XML.",
    missing_receiver_rfc: "No encontramos el RFC del receptor dentro del XML.",
    receiver_rfc_mismatch:
      "El RFC receptor de la factura no coincide con los datos fiscales del negocio.",
    total_mismatch:
      "El total del XML no coincide con el monto registrado del gasto.",
    missing_iva:
      "No encontramos IVA trasladado dentro del XML.",
  };

  return errors.map((error) => messages[error] ?? error).join(" ");
}