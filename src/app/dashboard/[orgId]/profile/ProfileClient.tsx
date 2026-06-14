"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Building2, FileSearch, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileResponse = {
  organization: { name: string };
  businessProfile: Record<string, unknown> | null;
  taxProfile: Record<string, unknown> | null;
  user: { email: string | null };
};

const initialForm = {
  businessName: "",
  legalName: "",
  rfc: "",
  sector: "",
  businessType: "microempresa",
  employeeCount: "1",
  monthlyRevenue: "",
  state: "",
  municipality: "",
  phone: "",
  contactEmail: "",
  operationStartDate: "",
  taxRegime: "",
  cfdiUsage: "G03",
  fiscalEmail: "",
  fiscalZipCode: "",
  goals: "",
  challenges: "",
};

function value(record: Record<string, unknown> | null, key: string) {
  const field = record?.[key];
  return field === null || field === undefined ? "" : String(field);
}

export function ProfileClient() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el perfil.");
        return response.json() as Promise<ProfileResponse>;
      })
      .then((data) => {
        if (!active) return;
        const business = data.businessProfile;
        const tax = data.taxProfile;
        setForm({
          businessName:
            value(business, "trade_name") || data.organization.name || "",
          legalName:
            value(business, "legal_name") || value(tax, "business_name"),
          rfc: value(business, "rfc") || value(tax, "rfc"),
          sector: value(business, "sector"),
          businessType: value(business, "business_type") || "microempresa",
          employeeCount: value(business, "employee_count") || "1",
          monthlyRevenue: value(business, "monthly_revenue"),
          state: value(business, "state"),
          municipality: value(business, "municipality"),
          phone: value(business, "phone"),
          contactEmail:
            value(business, "contact_email") || data.user.email || "",
          operationStartDate: value(business, "operation_start_date"),
          taxRegime: value(tax, "tax_regime"),
          cfdiUsage: value(tax, "cfdi_usage") || "G03",
          fiscalEmail: value(tax, "fiscal_email") || data.user.email || "",
          fiscalZipCode: value(tax, "fiscal_zip_code"),
          goals: Array.isArray(business?.goals)
            ? business.goals.join(", ")
            : "",
          challenges: Array.isArray(business?.challenges)
            ? business.challenges.join(", ")
            : "",
        });
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Error inesperado."),
      )
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);

  function updateField(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employeeCount: Number(form.employeeCount),
          monthlyRevenue: Number(form.monthlyRevenue || 0),
          goals: form.goals.split(",").map((item) => item.trim()).filter(Boolean),
          challenges: form.challenges
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo guardar.");
      setMessage("Perfil actualizado. Las recomendaciones ya pueden usar estos datos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function analyzeCertificate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzing(true);
    setMessage(null);

    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/profile/analyze", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "No se pudo analizar.");
      setMessage(data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setAnalyzing(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando perfil...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Perfil del negocio</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta informacion alimenta las recomendaciones operativas y fiscales.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Constancia de Situacion Fiscal
          </CardTitle>
          <CardDescription>
            Envia el documento al workflow fiscal de n8n para extraer datos y
            generar recomendaciones.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label className="inline-flex cursor-pointer items-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted">
            <Upload className="mr-2 h-4 w-4" />
            {analyzing ? "Analizando..." : "Subir constancia"}
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              disabled={analyzing}
              onChange={analyzeCertificate}
            />
          </label>
        </CardContent>
      </Card>

      <form onSubmit={saveProfile}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informacion empresarial
            </CardTitle>
            <CardDescription>
              Completa el contexto minimo para personalizar Pulso AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Nombre comercial" name="businessName" value={form.businessName} onChange={updateField} required />
            <Field label="Razon social" name="legalName" value={form.legalName} onChange={updateField} />
            <Field label="RFC" name="rfc" value={form.rfc} onChange={updateField} maxLength={13} />
            <SelectField label="Giro" name="sector" value={form.sector} onChange={updateField}>
              <option value="">Selecciona un giro</option>
              <option value="commerce">Comercio</option>
              <option value="services">Servicios</option>
              <option value="manufacturing">Manufactura</option>
              <option value="food">Alimentos</option>
              <option value="health">Salud</option>
              <option value="other">Otro</option>
            </SelectField>
            <Field label="Numero de empleados" name="employeeCount" value={form.employeeCount} onChange={updateField} type="number" min="1" max="250" />
            <Field label="Ingreso mensual aproximado" name="monthlyRevenue" value={form.monthlyRevenue} onChange={updateField} type="number" min="0" />
            <Field label="Estado" name="state" value={form.state} onChange={updateField} />
            <Field label="Municipio" name="municipality" value={form.municipality} onChange={updateField} />
            <Field label="Telefono" name="phone" value={form.phone} onChange={updateField} />
            <Field label="Correo de contacto" name="contactEmail" value={form.contactEmail} onChange={updateField} type="email" />
            <Field label="Inicio de operaciones" name="operationStartDate" value={form.operationStartDate} onChange={updateField} type="date" />
            <Field label="Regimen fiscal" name="taxRegime" value={form.taxRegime} onChange={updateField} placeholder="Ej. 626" />
            <Field label="Uso CFDI habitual" name="cfdiUsage" value={form.cfdiUsage} onChange={updateField} placeholder="Ej. G03" />
            <Field label="Codigo postal fiscal" name="fiscalZipCode" value={form.fiscalZipCode} onChange={updateField} />
            <Field label="Correo fiscal" name="fiscalEmail" value={form.fiscalEmail} onChange={updateField} type="email" />
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="goals">Metas, separadas por coma</Label>
              <textarea id="goals" name="goals" value={form.goals} onChange={updateField} className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="challenges">Retos principales, separados por coma</Label>
              <textarea id="challenges" name="challenges" value={form.challenges} onChange={updateField} className="min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
            </div>
            <Button type="submit" disabled={saving} className="md:col-span-2 md:w-fit">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar perfil"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

type FieldProps = React.ComponentProps<typeof Input> & {
  label: string;
  name: string;
};

function Field({ label, name, ...props }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function SelectField({
  label,
  name,
  children,
  ...props
}: React.ComponentProps<"select"> & { label: string; name: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        className="h-8 w-full rounded-lg border bg-background px-2.5 text-sm"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
