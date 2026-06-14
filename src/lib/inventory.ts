export type InventoryItem = {
  id: string;
  article_id: string | null;
  name: string;
  stock: number;
  unit_price: number;
  sale_price: number;
  updated_at: string;
};
