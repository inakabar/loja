'use client';

import React, { useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  Cloud,
  CheckCircle2,
  UploadCloud,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';

export default function ConfiguracoesPage() {
  const {
    settings,
    updateSettings,
    resetDemoData,
    syncAllToSupabase,
    supabaseConnected,
  } = useStore();
  const [savedBanner, setSavedBanner] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const handleSyncSupabase = async () => {
    setSyncResult('Sincronizando 10 tabelas com o Supabase...');
    const res = await syncAllToSupabase();
    setSyncResult(res.message);
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="border-b border-slate-200 pb-3">
        <h1 className="text-lg font-bold text-slate-900">
          Configurações, Banco Supabase & Publicação Vercel
        </h1>
        <p className="text-xs text-slate-500">
          Ajuste taxas do crediário, multa/mora, chave PIX e sincronize o banco Supabase.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 text-xs"
      >
        <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-emerald-600" />
          <span>Parâmetros Financeiros & Cadência WhatsApp</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nome da Loja
            </label>
            <input
              type="text"
              value={settings.store_name}
              onChange={(e) => updateSettings({ store_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Chave PIX para Cobrança
            </label>
            <input
              type="text"
              value={settings.pix_key}
              onChange={(e) => updateSettings({ pix_key: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-emerald-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Taxa Mensal Padrão do Crediário (% ao mês)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.default_monthly_rate_percent}
              onChange={(e) =>
                updateSettings({
                  default_monthly_rate_percent: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              WhatsApp Oficial da Loja (Opt-In)
            </label>
            <input
              type="text"
              value={settings.store_whatsapp}
              onChange={(e) =>
                updateSettings({ store_whatsapp: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Multa Fixa por Atraso (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={settings.late_fee_percent}
              onChange={(e) =>
                updateSettings({ late_fee_percent: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Juros de Mora Diário (%/dia)
            </label>
            <input
              type="number"
              step="0.01"
              value={settings.daily_interest_percent}
              onChange={(e) =>
                updateSettings({
                  daily_interest_percent: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Intervalo Mínimo Entre Mensagens WhatsApp (s)
            </label>
            <input
              type="number"
              value={settings.min_delay_seconds}
              onChange={(e) =>
                updateSettings({ min_delay_seconds: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-indigo-700"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Intervalo Máximo Entre Mensagens WhatsApp (s)
            </label>
            <input
              type="number"
              value={settings.max_delay_seconds}
              onChange={(e) =>
                updateSettings({ max_delay_seconds: Number(e.target.value) })
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-indigo-700"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Dados Iniciais</span>
            </button>

            <button
              type="button"
              onClick={handleSyncSupabase}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Sincronizar Dados Locais → Supabase</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {savedBanner && (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Salvo!
              </span>
            )}
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          </div>
        </div>

        {syncResult && (
          <div className="p-2.5 rounded-lg bg-slate-100 text-slate-800 font-medium">
            {syncResult}
          </div>
        )}
      </form>

      <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-5 space-y-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <h3 className="font-bold">
            Status da Conexão Supabase:{' '}
            <span className="text-emerald-400">
              {supabaseConnected
                ? 'Conectado ao Supabase!'
                : 'Aguardando chaves no .env.local'}
            </span>
          </h3>
        </div>
        <p className="text-slate-400">
          O SQL completo com as 10 tabelas (incluindo <code className="text-emerald-300">app_users</code> e <code className="text-emerald-300">investment_withdrawals</code>) está em{' '}
          <code className="text-amber-300">
            supabase/migrations/20261031000000_initial_schema.sql
          </code>
          .
        </p>
      </div>
    </div>
  );
}
