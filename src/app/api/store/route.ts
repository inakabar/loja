import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TABLES = new Set([
  'store_settings',
  'app_users',
  'investments',
  'investment_withdrawals',
  'customers',
  'inventory_items',
  'sales',
  'installments',
  'service_orders',
  'collection_logs',
]);

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ connected: false });
  }

  try {
    const supabase = getAdminClient();
    const [
      { data: settings },
      { data: users },
      { data: investments },
      { data: withdrawals },
      { data: customers },
      { data: inventory },
      { data: sales },
      { data: installments },
      { data: serviceOrders },
      { data: collectionLogs },
    ] = await Promise.all([
      supabase.from('store_settings').select('*').limit(1),
      supabase.from('app_users').select('*'),
      supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('investment_withdrawals')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('installments')
        .select('*')
        .order('due_date', { ascending: true }),
      supabase
        .from('service_orders')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('collection_logs')
        .select('*')
        .order('sent_at', { ascending: false }),
    ]);

    return NextResponse.json({
      connected: true,
      settings: settings?.[0] || null,
      users: users || [],
      investments: investments || [],
      withdrawals: withdrawals || [],
      customers: customers || [],
      inventory: inventory || [],
      sales: sales || [],
      installments: installments || [],
      serviceOrders: serviceOrders || [],
      collectionLogs: collectionLogs || [],
    });
  } catch (err) {
    return NextResponse.json(
      {
        connected: false,
        error: err instanceof Error ? err.message : 'Erro ao consultar Supabase',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Supabase não configurado' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const supabase = getAdminClient();

    // Sincronização completa (seed / backup de todas as 10 tabelas)
    if (body.action === 'sync_all') {
      const { payload } = body;
      if (payload.settings) {
        await supabase.from('store_settings').upsert(payload.settings);
      }
      if (payload.users?.length) {
        await supabase.from('app_users').upsert(payload.users);
      }
      if (payload.investments?.length) {
        await supabase.from('investments').upsert(payload.investments);
      }
      if (payload.customers?.length) {
        await supabase.from('customers').upsert(payload.customers);
      }
      if (payload.inventory?.length) {
        await supabase.from('inventory_items').upsert(payload.inventory);
      }
      if (payload.sales?.length) {
        await supabase.from('sales').upsert(payload.sales);
      }
      if (payload.installments?.length) {
        await supabase.from('installments').upsert(payload.installments);
      }
      if (payload.withdrawals?.length) {
        await supabase
          .from('investment_withdrawals')
          .upsert(payload.withdrawals);
      }
      if (payload.serviceOrders?.length) {
        await supabase.from('service_orders').upsert(payload.serviceOrders);
      }
      if (payload.collectionLogs?.length) {
        await supabase.from('collection_logs').upsert(payload.collectionLogs);
      }

      return NextResponse.json({
        ok: true,
        message:
          'Todas as 10 tabelas foram gravadas com sucesso no Supabase!',
      });
    }

    // Upsert unitário ou em lote em uma tabela permitida
    const { table, data } = body;
    if (!table || !ALLOWED_TABLES.has(table)) {
      return NextResponse.json(
        { ok: false, error: 'Tabela inválida' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from(table).upsert(data);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro interno',
      },
      { status: 500 }
    );
  }
}
