import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtractedDocumentData } from "@/lib/document-analysis";

export async function syncDocumentInventory(
  admin: SupabaseClient,
  organizationId: string,
  extractedData: ExtractedDocumentData,
) {
  if (extractedData.inventorySyncedAt) {
    return {
      inventorySyncedAt: extractedData.inventorySyncedAt,
      inventoryItemIds: extractedData.inventoryItemIds ?? [],
    };
  }

  const candidates = (extractedData.items ?? []).filter((item) => {
    const lineType =
      item.lineType ?? (item.inventoryCandidate ? "product" : "other");
    return (
      lineType === "product" &&
      item.inventoryCandidate &&
      item.name.trim() &&
      Number(item.quantity) > 0
    );
  });
  const inventoryItemIds: string[] = [];

  for (const item of candidates) {
    const name = item.name.trim();
    const sku = item.sku.trim() || null;
    const quantity = Number(item.quantity);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const { data: existing, error: existingError } = await admin
      .from("inventory_items")
      .select("id, stock, unit_price")
      .eq("organization_id", organizationId)
      .eq("name", name)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    if (existing) {
      const currentStock = Number(existing.stock);
      const nextStock = currentStock + quantity;
      const currentCost = Number(existing.unit_price);
      const weightedCost =
        nextStock > 0
          ? (currentStock * currentCost + quantity * unitPrice) / nextStock
          : unitPrice;
      const { data, error } = await admin
        .from("inventory_items")
        .update({
          stock: nextStock,
          unit_price: Number(weightedCost.toFixed(2)),
          ...(sku ? { article_id: sku } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("organization_id", organizationId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      inventoryItemIds.push(data.id);
      continue;
    }

    const { data, error } = await admin
      .from("inventory_items")
      .insert({
        organization_id: organizationId,
        name,
        article_id: sku,
        stock: quantity,
        unit_price: unitPrice,
        sale_price: 0,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    inventoryItemIds.push(data.id);
  }

  return {
    inventorySyncedAt:
      inventoryItemIds.length > 0 ? new Date().toISOString() : undefined,
    inventoryItemIds,
  };
}
