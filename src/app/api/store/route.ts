import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  buildInitialSeed,
  deserializeUserFromDb,
  serializeUserForDb,
} from '@/lib/supabase/initial-seed';
import { AppUser } from '@/types/domain';

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
      { data: usersRaw },
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
      supabase.from('app_users').select('*').order('created_at', { ascending: true }),
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

    // Garante apenas que exista a configuração inicial e ao menos 1 usuário Admin para login
    if (!usersRaw || usersRaw.length === 0) {
      const seed = buildInitialSeed();
      await supabase.from('store_settings').upsert(seed.settings);
      await supabase
        .from('app_users')
        .upsert(seed.users.map((u) => serializeUserForDb(u)));

      return NextResponse.json({
        connected: true,
        settings: seed.settings,
        users: seed.users,
        investments: investments || [],
        withdrawals: withdrawals || [],
        customers: customers || [],
        inventory: inventory || [],
        sales: sales || [],
        installments: installments || [],
        serviceOrders: serviceOrders || [],
        collectionLogs: collectionLogs || [],
      });
    }

    const users = (usersRaw || []).map((row) =>
      deserializeUserFromDb(row as Record<string, unknown>)
    );

    return NextResponse.json({
      connected: true,
      settings: settings?.[0] || null,
      users,
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
        error:
          err instanceof Error ? err.message : 'Erro ao consultar Supabase',
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

    // Limpeza total de dados operacionais (mantendo apenas configurações e Admin)
    if (body.action === 'clear_all_data') {
      const seed = buildInitialSeed();
      await supabase.from('collection_logs').delete().neq('id', '__none__');
      await supabase.from('installments').delete().neq('id', '__none__');
      await supabase.from('service_orders').delete().neq('id', '__none__');
      await supabase.from('sales').delete().neq('id', '__none__');
      await supabase
        .from('investment_withdrawals')
        .delete()
        .neq('id', '__none__');
      await supabase.from('inventory_items').delete().neq('id', '__none__');
      await supabase.from('customers').delete().neq('id', '__none__');
      await supabase.from('investments').delete().neq('id', '__none__');

      if (body.resetUsersToAdminOnly) {
        await supabase.from('app_users').delete().neq('id', '__none__');
        await supabase
          .from('app_users')
          .upsert(seed.users.map((u) => serializeUserForDb(u)));
      }

      return NextResponse.json({
        ok: true,
        message: 'Todos os dados de demonstração foram limpos do Supabase!',
      });
    }

    // Exclusão de registro específico
    if (body.action === 'delete_row') {
      const { table, id } = body;
      if (!table || !ALLOWED_TABLES.has(table) || !id) {
        return NextResponse.json(
          { ok: false, error: 'Parâmetros inválidos para exclusão' },
          { status: 400 }
        );
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { ok: false, error: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Sincronização completa (backup de todas as 10 tabelas)
    if (body.action === 'sync_all') {
      const { payload } = body;
      if (payload.settings) {
        await supabase.from('store_settings').upsert(payload.settings);
      }
      if (payload.users?.length) {
        await supabase
          .from('app_users')
          .upsert(
            (payload.users as AppUser[]).map((u) => serializeUserForDb(u))
          );
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
        message: 'Dados sincronizados com sucesso no Supabase!',
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

    const formattedData =
      table === 'app_users'
        ? Array.isArray(data)
          ? (data as AppUser[]).map((u) => serializeUserForDb(u))
          : serializeUserForDb(data as AppUser)
        : data;

    const { error } = await supabase.from(table).upsert(formattedData);
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
