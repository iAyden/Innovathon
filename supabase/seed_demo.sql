-- Datos demo para Pulso AI.
-- Usa la primera organizacion existente para conservar la membresia del usuario.
-- Si necesitas otra, agrega: where id = 'TU_ORGANIZATION_ID' en la consulta.

do $$
declare
  v_org uuid;
begin
  select id
  into v_org
  from public.organizations
  order by created_at
  limit 1;

  if v_org is null then
    raise exception 'Primero crea una organizacion registrando un usuario en la aplicacion.';
  end if;

  update public.tax_profiles
  set
    business_name = 'Comercializadora Pulso Demo, S.A. de C.V.',
    rfc = 'XAXX010101000',
    tax_regime = 'Regimen Simplificado de Confianza',
    cfdi_usage = 'G03',
    fiscal_email = 'fiscal@pulsodemo.mx',
    fiscal_zip_code = '64000'
  where organization_id = v_org;

  if not found then
    insert into public.tax_profiles (
      id, organization_id, business_name, rfc, tax_regime, cfdi_usage,
      fiscal_email, fiscal_zip_code
    )
    values (
      '10000000-0000-4000-8000-000000000001',
      v_org,
      'Comercializadora Pulso Demo, S.A. de C.V.',
      'XAXX010101000',
      'Regimen Simplificado de Confianza',
      'G03',
      'fiscal@pulsodemo.mx',
      '64000'
    )
    on conflict (id) do nothing;
  end if;

  insert into public.business_profiles (
    organization_id, legal_name, trade_name, rfc, sector, business_type,
    employee_count, monthly_revenue, state, municipality, phone,
    contact_email, operation_start_date, goals, challenges,
    onboarding_completed, updated_at
  )
  values (
    v_org,
    'Comercializadora Pulso Demo, S.A. de C.V.',
    'Pulso Demo',
    'XAXX010101000',
    'commerce',
    'microempresa',
    6,
    185000,
    'Nuevo Leon',
    'Monterrey',
    '8112345678',
    'contacto@pulsodemo.mx',
    current_date - 730,
    array['Mejorar liquidez', 'Controlar inventario', 'Reducir cartera vencida'],
    array['Facturas pendientes', 'Cobranza manual', 'Falta de indicadores'],
    true,
    now()
  )
  on conflict (organization_id) do update set
    legal_name = excluded.legal_name,
    trade_name = excluded.trade_name,
    sector = excluded.sector,
    business_type = excluded.business_type,
    employee_count = excluded.employee_count,
    monthly_revenue = excluded.monthly_revenue,
    goals = excluded.goals,
    challenges = excluded.challenges,
    onboarding_completed = true,
    updated_at = now();

  insert into public.module_catalog (
    slug, name, description, category, n8n_workflow, recommended_for
  )
  values
    ('cash-flow', 'Flujo de caja', 'Control de entradas, salidas y liquidez.', 'Finanzas', 'cashflow-forecast', array['all']),
    ('invoices', 'Facturas', 'Control de facturas y XML.', 'Finanzas', 'invoices-manager', array['all']),
    ('providers', 'Proveedores', 'Cumplimiento y compras por proveedor.', 'Operacion', 'supplier-analysis', array['commerce']),
    ('inventory', 'Inventario', 'Control de existencias y precios.', 'Operacion', 'inventory-advisor', array['commerce']),
    ('orders', 'Pedidos', 'Gestion de pedidos y cotizaciones.', 'Operacion', 'orders-manager', array['commerce']),
    ('invoice-recovery', 'Recuperacion de facturas', 'Seguimiento de XML pendientes.', 'Fiscal', 'request-invoice', array['commerce']),
    ('fiscal-guide', 'Guia fiscal', 'Orientacion fiscal personalizada.', 'Fiscal', 'fiscal-profile', array['all']),
    ('accounts-receivable', 'Cuentas por cobrar', 'Seguimiento de clientes y cobros.', 'Finanzas', 'collections-advisor', array['commerce'])
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    n8n_workflow = excluded.n8n_workflow,
    recommended_for = excluded.recommended_for,
    active = true;

  update public.organization_modules
  set status = 'active', source = 'manual', updated_at = now()
  where organization_id = v_org
    and module_slug in (
      'cash-flow', 'invoices', 'providers', 'inventory', 'orders',
      'invoice-recovery', 'fiscal-guide', 'accounts-receivable'
    );

  insert into public.organization_modules (
    id, organization_id, module_slug, status, source, reason
  )
  select seed.id, v_org, seed.module_slug, 'active', 'manual', 'Datos demo'
  from (
    values
      ('20000000-0000-4000-8000-000000000001'::uuid, 'cash-flow'),
      ('20000000-0000-4000-8000-000000000002'::uuid, 'invoices'),
      ('20000000-0000-4000-8000-000000000003'::uuid, 'providers'),
      ('20000000-0000-4000-8000-000000000004'::uuid, 'inventory'),
      ('20000000-0000-4000-8000-000000000005'::uuid, 'orders'),
      ('20000000-0000-4000-8000-000000000006'::uuid, 'invoice-recovery'),
      ('20000000-0000-4000-8000-000000000007'::uuid, 'fiscal-guide'),
      ('20000000-0000-4000-8000-000000000008'::uuid, 'accounts-receivable')
  ) as seed(id, module_slug)
  where not exists (
    select 1
    from public.organization_modules existing
    where existing.organization_id = v_org
      and existing.module_slug = seed.module_slug
  )
  on conflict (id) do nothing;

  insert into public.suppliers (
    id, organization_id, name, rfc, email, whatsapp,
    compliance_score, avg_response_days
  )
  values
    ('30000000-0000-4000-8000-000000000001', v_org, 'Distribuidora del Norte', 'DNO010101AB1', 'facturacion@disnorte.mx', '8111111111', 92, 1.5),
    ('30000000-0000-4000-8000-000000000002', v_org, 'Empaques Regios', 'ERE020202CD2', 'ventas@empaquesregios.mx', '8122222222', 68, 4),
    ('30000000-0000-4000-8000-000000000003', v_org, 'Servicios Tecnicos MX', 'STM030303EF3', null, '8133333333', 45, 8)
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    name = excluded.name,
    email = excluded.email,
    whatsapp = excluded.whatsapp,
    compliance_score = excluded.compliance_score,
    avg_response_days = excluded.avg_response_days;

  insert into public.expenses (
    id, organization_id, supplier_id, amount, iva_amount,
    expense_date, description, status
  )
  values
    ('40000000-0000-4000-8000-000000000001', v_org, '30000000-0000-4000-8000-000000000001', 11600, 1600, current_date - 20, 'Compra de mercancia', 'validated'),
    ('40000000-0000-4000-8000-000000000002', v_org, '30000000-0000-4000-8000-000000000002', 5800, 800, current_date - 12, 'Cajas y material de empaque', 'request_sent'),
    ('40000000-0000-4000-8000-000000000003', v_org, '30000000-0000-4000-8000-000000000003', 3480, 480, current_date - 5, 'Mantenimiento de equipo', 'missing_invoice')
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    supplier_id = excluded.supplier_id,
    amount = excluded.amount,
    iva_amount = excluded.iva_amount,
    expense_date = excluded.expense_date,
    description = excluded.description,
    status = excluded.status;

  insert into public.invoice_requests (
    id, organization_id, expense_id, supplier_id, channel, subject,
    message, status, retry_count, sent_at, responded_at
  )
  values
    (
      '50000000-0000-4000-8000-000000000001',
      v_org,
      '40000000-0000-4000-8000-000000000002',
      '30000000-0000-4000-8000-000000000002',
      'email',
      'Solicitud de factura pendiente',
      'Solicitamos el XML y PDF de la compra registrada.',
      'sent',
      1,
      now() - interval '3 days',
      null
    )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    status = excluded.status,
    retry_count = excluded.retry_count,
    sent_at = excluded.sent_at;

  insert into public.invoice_files (
    id, organization_id, expense_id, file_name, uuid, issuer_rfc,
    receiver_rfc, subtotal, iva, total, validation_status,
    validation_errors, raw_xml
  )
  values (
    '60000000-0000-4000-8000-000000000001',
    v_org,
    '40000000-0000-4000-8000-000000000001',
    'factura-distribuidora-demo.xml',
    'AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE',
    'DNO010101AB1',
    'XAXX010101000',
    10000,
    1600,
    11600,
    'validated',
    array[]::text[],
    null
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    expense_id = excluded.expense_id,
    validation_status = excluded.validation_status;

  insert into public.cash_flow_entries (
    id, organization_id, entry_type, category, description, amount,
    occurred_on, source, external_id
  )
  values
    ('70000000-0000-4000-8000-000000000001', v_org, 'income', 'Ventas', 'Venta mostrador', 28500, current_date - 25, 'manual', 'demo-income-1'),
    ('70000000-0000-4000-8000-000000000002', v_org, 'expense', 'Mercancia', 'Pago a Distribuidora del Norte', 11600, current_date - 20, 'manual', 'demo-expense-1'),
    ('70000000-0000-4000-8000-000000000003', v_org, 'income', 'Servicios', 'Pedido cliente empresarial', 18000, current_date - 10, 'manual', 'demo-income-2'),
    ('70000000-0000-4000-8000-000000000004', v_org, 'expense', 'Operacion', 'Renta y servicios', 9500, current_date - 4, 'manual', 'demo-expense-2')
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    amount = excluded.amount,
    occurred_on = excluded.occurred_on;

  insert into public.inventory_items (
    id, organization_id, article_id, name, stock, unit_price, sale_price
  )
  values
    ('80000000-0000-4000-8000-000000000001', v_org, 'SKU-CAFE-001', 'Cafe molido 500 g', 24, 82, 125),
    ('80000000-0000-4000-8000-000000000002', v_org, 'SKU-TAZA-002', 'Taza termica', 8, 145, 229),
    ('80000000-0000-4000-8000-000000000003', v_org, 'SKU-FILTRO-003', 'Paquete de filtros', 3, 48, 79)
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    stock = excluded.stock,
    unit_price = excluded.unit_price,
    sale_price = excluded.sale_price,
    updated_at = now();

  insert into public.business_documents (
    id, organization_id, document_type, file_name, analysis_status,
    extracted_data, recommendations
  )
  values (
    '90000000-0000-4000-8000-000000000001',
    v_org,
    'ticket',
    'ticket-oxxo-demo.jpg',
    'completed',
    jsonb_build_object(
      'documentType', 'ticket',
      'issuerName', 'Cadena Comercial OXXO, S.A. de C.V.',
      'issuerRfc', 'CCO8605231N4',
      'date', to_char(current_date - 2, 'YYYY-MM-DD'),
      'subtotal', 62.07,
      'iva', 9.93,
      'total', 72,
      'currency', 'MXN',
      'paymentMethod', 'Tarjeta',
      'category', 'Alimentos y bebidas',
      'description', 'Compra de bebidas',
      'confidence', 0.96,
      'warnings', jsonb_build_array(),
      'items', jsonb_build_array(
        jsonb_build_object(
          'name', 'Bebida energetica',
          'quantity', 2,
          'unit', 'pieza',
          'unitPrice', 48.50,
          'total', 97,
          'sku', '',
          'inventoryCandidate', true,
          'lineType', 'product',
          'confidence', 0.95
        ),
        jsonb_build_object(
          'name', 'Promocion 2 x 1',
          'quantity', 1,
          'unit', 'promocion',
          'unitPrice', -25,
          'total', -25,
          'sku', '',
          'inventoryCandidate', false,
          'lineType', 'discount',
          'confidence', 0.95
        )
      )
    ),
    jsonb_build_array('Revisar si los productos deben incorporarse al inventario.')
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    extracted_data = excluded.extracted_data,
    recommendations = excluded.recommendations,
    updated_at = now();

  insert into public.integration_events (
    id, organization_id, workflow, direction, status, correlation_id,
    request_payload, response_payload, completed_at
  )
  values (
    'a0000000-0000-4000-8000-000000000001',
    v_org,
    'dashboard-insight',
    'outbound',
    'completed',
    'a0000000-0000-4000-8000-000000000002',
    '{"source":"demo"}'::jsonb,
    '{
      "title":"Controla tus pendientes",
      "message":"La operacion es estable, pero existen facturas y cobros que requieren seguimiento.",
      "recommendedAction":"Prioriza la cobranza vencida y solicita los XML pendientes.",
      "riskLevel":"medium"
    }'::jsonb,
    now()
  )
  on conflict (id) do update set
    organization_id = excluded.organization_id,
    response_payload = excluded.response_payload,
    completed_at = now();

  -- Estas tablas existen despues de aplicar:
  -- supabase/migrations/202606140001_accounts_receivable.sql
  if to_regclass('public.customers') is not null
    and to_regclass('public.accounts_receivable') is not null
    and to_regclass('public.receivable_payments') is not null then

    insert into public.customers (
      id, organization_id, name, rfc, email, phone, payment_terms_days
    )
    values
      ('b0000000-0000-4000-8000-000000000001', v_org, 'Restaurante La Plaza', 'RLP040404GH4', 'administracion@laplaza.mx', '8188888888', 15),
      ('b0000000-0000-4000-8000-000000000002', v_org, 'Oficinas del Centro', 'OCE050505IJ5', 'pagos@oficinascentro.mx', '8177777777', 30),
      ('b0000000-0000-4000-8000-000000000003', v_org, 'Cliente Mostrador', null, null, '8166666666', 0)
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      payment_terms_days = excluded.payment_terms_days,
      updated_at = now();

    insert into public.accounts_receivable (
      id, organization_id, customer_id, folio, description, amount,
      currency, issue_date, due_date, notes
    )
    values
      ('c0000000-0000-4000-8000-000000000001', v_org, 'b0000000-0000-4000-8000-000000000001', 'V-1042', 'Suministro mensual', 14500, 'MXN', current_date - 25, current_date - 10, 'Confirmar fecha de pago'),
      ('c0000000-0000-4000-8000-000000000002', v_org, 'b0000000-0000-4000-8000-000000000002', 'V-1051', 'Pedido corporativo', 22000, 'MXN', current_date - 12, current_date + 18, 'Credito a 30 dias'),
      ('c0000000-0000-4000-8000-000000000003', v_org, 'b0000000-0000-4000-8000-000000000003', 'V-1056', 'Venta especial', 3600, 'MXN', current_date - 3, current_date + 4, null)
    on conflict (id) do update set
      organization_id = excluded.organization_id,
      customer_id = excluded.customer_id,
      description = excluded.description,
      amount = excluded.amount,
      issue_date = excluded.issue_date,
      due_date = excluded.due_date,
      updated_at = now();

    insert into public.receivable_payments (
      id, organization_id, receivable_id, amount, paid_on,
      payment_method, reference, notes
    )
    values (
      'd0000000-0000-4000-8000-000000000001',
      v_org,
      'c0000000-0000-4000-8000-000000000001',
      4500,
      current_date - 8,
      'Transferencia',
      'DEMO-ABONO-001',
      'Primer abono'
    )
    on conflict (id) do nothing;
  end if;
end
$$;
