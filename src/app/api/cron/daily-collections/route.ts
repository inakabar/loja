import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Rota invocada diariamente pelo Vercel Cron (definido em vercel.json).
 * Funções:
 * 1. Mantém o projeto Supabase Free Tier sempre ativo (evita pausa após 7 dias);
 * 2. Atualiza automaticamente parcelas vencidas de 'pending' para 'overdue'.
 */
export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      mode: 'local_or_unconfigured',
      checkedDate: today,
      message:
        'Cron diário ativo. Configure NEXT_PUBLIC_SUPABASE_URL na Vercel para sincronizar atrasos no PostgreSQL.',
    });
  }

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('installments')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', today)
      .select('id');

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      checkedDate: today,
      updatedOverdueCount: data?.length || 0,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Erro desconhecido',
      },
      { status: 500 }
    );
  }
}
