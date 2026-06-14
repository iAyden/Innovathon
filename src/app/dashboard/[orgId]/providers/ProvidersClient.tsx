"use client";

import { useEffect, useState, FormEvent } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { getSuppliers, createSupplier, Supplier } from "@/lib/fiscal-api";
import { Badge } from "@/components/ui/badge";

export function ProvidersClient() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    rfc: "",
    whatsapp: "",
  });

  async function loadSuppliers() {
    try {
      setLoading(true);
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error("Error loading suppliers:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    getSuppliers()
      .then((data) => {
        if (active) setSuppliers(data);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      await createSupplier(form);
      setForm({ name: "", email: "", rfc: "", whatsapp: "" });
      setOpen(false);
      await loadSuppliers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear proveedor");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra el catálogo de proveedores y mide sus tiempos de respuesta.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo proveedor
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Añadir proveedor</DialogTitle>
              <DialogDescription>
                Ingresa los datos del nuevo proveedor. Solo el nombre es
                obligatorio.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre / Razón Social *</Label>
                <Input
                  id="name"
                  placeholder="Ej. Comercializadora del Norte"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  placeholder="Ej. XAXX010101000"
                  value={form.rfc}
                  onChange={(e) =>
                    setForm({ ...form, rfc: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="whatsapp">WhatsApp / Teléfono</Label>
                <Input
                  id="whatsapp"
                  placeholder="Ej. 5512345678"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm({ ...form, whatsapp: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold mb-4">Directorio de Proveedores</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              No tienes proveedores registrados.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Añadir el primero
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Nivel de Cumplimiento</TableHead>
                  <TableHead className="text-right">Respuesta (Días)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {supplier.rfc || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 text-xs">
                        {supplier.email && <span>{supplier.email}</span>}
                        {supplier.whatsapp && (
                          <span className="text-muted-foreground">
                            WA: {supplier.whatsapp}
                          </span>
                        )}
                        {!supplier.email && !supplier.whatsapp && "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.complianceScore != null ? (
                        <Badge
                          variant={
                            supplier.complianceScore >= 80
                              ? "default"
                              : supplier.complianceScore >= 50
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            supplier.complianceScore >= 80
                              ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                              : ""
                          }
                        >
                          {supplier.complianceScore}%
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {supplier.avgResponseDays != null
                        ? supplier.avgResponseDays.toFixed(1)
                        : "-"}
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
