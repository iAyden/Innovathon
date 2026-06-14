"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CircleDollarSign,
  Loader2,
  PackagePlus,
  Pencil,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/fiscal-api";
import type { InventoryItem } from "@/lib/inventory";

type ProductForm = {
  name: string;
  articleId: string;
  stock: string;
  unitPrice: string;
  salePrice: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  articleId: "",
  stock: "0",
  unitPrice: "0",
  salePrice: "0",
};

export function InventoryClient() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [productOpen, setProductOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [movement, setMovement] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");

  async function loadInventory() {
    try {
      setLoading(true);
      setError("");
      const inventoryResponse = await fetch("/api/inventory", {
        cache: "no-store",
      });

      if (!inventoryResponse.ok) {
        throw new Error("No se pudo cargar el inventario.");
      }
      const inventory = (await inventoryResponse.json()) as InventoryItem[];
      setItems(inventory.map(normalizeItem));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInventory();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const metrics = useMemo(() => {
    const units = items.reduce((sum, item) => sum + item.stock, 0);
    const value = items.reduce(
      (sum, item) => sum + item.stock * item.unit_price,
      0,
    );
    const potentialSales = items.reduce(
      (sum, item) => sum + item.stock * item.sale_price,
      0,
    );
    const alerts = items.filter((item) => item.stock <= 5).length;
    return { units, value, potentialSales, alerts };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.article_id?.toLowerCase().includes(query);
      const matchesStatus =
        status === "all" ||
        (status === "out" && item.stock <= 0) ||
        (status === "low" && item.stock > 0 && item.stock <= 5) ||
        (status === "healthy" && item.stock > 5);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setProductOpen(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      articleId: item.article_id ?? "",
      stock: String(item.stock),
      unitPrice: String(item.unit_price),
      salePrice: String(item.sale_price),
    });
    setProductOpen(true);
  }

  function openStock(item: InventoryItem, type: "in" | "out") {
    setStockItem(item);
    setMovement(type);
    setQuantity("1");
    setStockOpen(true);
  }

  async function saveProduct() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await fetch(
        editingItem ? `/api/inventory/${editingItem.id}` : "/api/inventory",
        {
          method: editingItem ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            articleId: form.articleId,
            stock: Number(form.stock),
            unitPrice: Number(form.unitPrice),
            salePrice: Number(form.salePrice),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el producto.");
      }

      setProductOpen(false);
      setMessage(editingItem ? "Producto actualizado." : "Producto agregado.");
      await loadInventory();
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }

  async function saveMovement() {
    if (!stockItem) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await fetch(`/api/inventory/${stockItem.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movement, quantity: Number(quantity) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudo actualizar la existencia.");
      }

      setStockOpen(false);
      setMessage(
        movement === "in"
          ? "Entrada de inventario registrada."
          : "Salida de inventario registrada.",
      );
      await loadInventory();
    } catch (movementError) {
      setError(errorMessage(movementError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controla productos, costos, precios y existencias desde un solo lugar.
          </p>
        </div>
        <Button onClick={openCreate}>
          <PackagePlus />
          Agregar producto
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Boxes}
          label="Productos"
          value={String(items.length)}
          detail={`${metrics.units} unidades registradas`}
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Valor a costo"
          value={formatCurrency(metrics.value)}
          detail="Existencia por costo unitario"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Venta potencial"
          value={formatCurrency(metrics.potentialSales)}
          detail="Antes de descuentos e impuestos"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Alertas de stock"
          value={String(metrics.alerts)}
          detail="Productos con 5 unidades o menos"
          warning={metrics.alerts > 0}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Catalogo de productos</CardTitle>
          <CardDescription>
            Los productos detectados en comprobantes aparecen cuando superan la
            revision de datos.
          </CardDescription>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o SKU"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filtrar por existencia"
            >
              <option value="all">Todos los estados</option>
              <option value="healthy">Existencia saludable</option>
              <option value="low">Existencia baja</option>
              <option value="out">Agotados</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center">
              <p className="text-sm font-medium">
                {items.length === 0
                  ? "Aun no hay productos en el inventario."
                  : "No hay productos que coincidan con el filtro."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega uno manualmente o procesa un comprobante con productos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Existencia</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Venta</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          SKU: {item.article_id || "Sin SKU"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StockBadge stock={item.stock} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.sale_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <MarginBadge item={item} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Registrar entrada"
                            onClick={() => openStock(item, "in")}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Registrar salida"
                            onClick={() => openStock(item, "out")}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Editar producto"
                            onClick={() => openEdit(item)}
                          >
                            <Pencil />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={productOpen} onOpenChange={setProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Editar producto" : "Agregar producto"}
            </DialogTitle>
            <DialogDescription>
              Completa la informacion usada para valorar el inventario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <FormField
              label="Nombre"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
            />
            <FormField
              label="SKU o clave interna"
              value={form.articleId}
              onChange={(value) => setForm({ ...form, articleId: value })}
            />
            {!editingItem ? (
              <FormField
                label="Existencia inicial"
                value={form.stock}
                type="number"
                onChange={(value) => setForm({ ...form, stock: value })}
              />
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                label="Costo unitario"
                value={form.unitPrice}
                type="number"
                onChange={(value) => setForm({ ...form, unitPrice: value })}
              />
              <FormField
                label="Precio de venta"
                value={form.salePrice}
                type="number"
                onChange={(value) => setForm({ ...form, salePrice: value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveProduct}
              disabled={saving || !form.name.trim()}
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stockOpen} onOpenChange={setStockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {movement === "in" ? "Registrar entrada" : "Registrar salida"}
            </DialogTitle>
            <DialogDescription>
              {stockItem?.name}. Existencia actual: {stockItem?.stock ?? 0}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="movement">Tipo de movimiento</Label>
              <select
                id="movement"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                value={movement}
                onChange={(event) =>
                  setMovement(event.target.value === "out" ? "out" : "in")
                }
              >
                <option value="in">Entrada</option>
                <option value="out">Salida</option>
              </select>
            </div>
            <FormField
              label="Cantidad"
              value={quantity}
              type="number"
              onChange={setQuantity}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStockOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={saveMovement} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Actualizar existencia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  warning = false,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div
          className={`rounded-lg p-2 ${warning ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"}`}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) return <Badge variant="destructive">Agotado</Badge>;
  if (stock <= 5) return <Badge variant="secondary">{stock} · Bajo</Badge>;
  return <Badge variant="outline">{stock} unidades</Badge>;
}

function MarginBadge({ item }: { item: InventoryItem }) {
  if (item.sale_price <= 0) return <Badge variant="outline">Sin precio</Badge>;
  const margin = ((item.sale_price - item.unit_price) / item.sale_price) * 100;
  return (
    <Badge variant={margin <= 0 ? "destructive" : "outline"}>
      {margin.toFixed(1)}%
    </Badge>
  );
}

function normalizeItem(item: InventoryItem): InventoryItem {
  return {
    ...item,
    stock: Number(item.stock),
    unit_price: Number(item.unit_price),
    sale_price: Number(item.sale_price),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error inesperado.";
}
