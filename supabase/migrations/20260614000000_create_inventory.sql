CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  article_id TEXT,
  name TEXT NOT NULL,
  stock NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Habilitar RLS
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Política para miembros de la organización
DROP POLICY IF EXISTS "members manage inventory items" ON public.inventory_items;
CREATE POLICY "members manage inventory items"
  ON public.inventory_items FOR ALL
  USING (public.is_organization_member(organization_id))
  WITH CHECK (public.is_organization_member(organization_id));

-- Indexes
CREATE INDEX IF NOT EXISTS inventory_items_org_idx ON public.inventory_items(organization_id);
CREATE INDEX IF NOT EXISTS inventory_items_name_idx ON public.inventory_items(name);
