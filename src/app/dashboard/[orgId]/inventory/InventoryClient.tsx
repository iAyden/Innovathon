"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/fiscal-api";

type InventoryItem = {
  id: string;
  article_id: string | null;
  name: string;
  stock: number;
  unit_price: number;
  sale_price: number;
  updated_at: string;
};

export function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function loadInventory() {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error("Error loading inventory:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function handleSavePrice(id: string) {
    try {
      setSaving(true);
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, salePrice: Number(editPrice) }),
      });

      if (res.ok) {
        setEditingId(null);
        await loadInventory();
      } else {
        alert("Error al actualizar el precio.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventario Inteligente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se sincroniza automáticamente cuando subes comprobantes o facturas al escáner IA.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Catálogo Maestro</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 rounded-lg">
            <p className="text-muted-foreground text-sm">
              El inventario está vacío. Los artículos aparecerán aquí en cuanto la IA procese tus comprobantes de compra.
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo (SKU)</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Existencia</TableHead>
                  <TableHead className="text-right">Costo Promedio</TableHead>
                  <TableHead className="text-right">Precio de Venta</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.article_id || "S/N"}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={item.stock > 10 ? "default" : item.stock > 0 ? "secondary" : "destructive"}
                        className={
                          item.stock > 10
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : item.stock > 0
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                            : ""
                        }
                      >
                        {item.stock} unidades
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <Input
                          type="number"
                          className="w-24 ml-auto text-right h-8"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                        />
                      ) : (
                        <span className="font-mono font-medium">
                          {formatCurrency(item.sale_price)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={() => handleSavePrice(item.id)}
                            disabled={saving}
                          >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                            Guardar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => {
                            setEditingId(item.id);
                            setEditPrice(String(item.sale_price));
                          }}
                        >
                          Editar Precio
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
