'use client';

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  ArrowUpRight,
  Users,
  MinusCircle,
  GitBranch,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { calculateInvestmentMetrics } from '@/lib/calculators/crediario';
import {
  formatCurrencyBRL,
  formatDateBR,
} from '@/lib/calculators/spintax-whatsapp';
import {
  USER_ROLE_LABELS,
  WITHDRAWAL_REASON_LABELS,
  WithdrawalReasonType,
} from '@/types/domain';

export default function InvestimentosPage() {
  const {
    investments,
    visibleInvestments,
    withdrawals,
    inventory,
    sales,
    installments,
    serviceOrders,
    settings,
    users,
    hasRole,
    addInvestment,
    toggleUserAccessOnInvestment,
    createWithdrawal,
  } = useStore();

  const [selectedId, setSelectedId] = useState<string>(
    visibleInvestments[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<
    'vendas' | 'retiradas' | 'estoque' | 'acessos'
  >('vendas');

  // Modal Nova Planilha
  const [showNewModal, setShowNewModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [capital, setCapital] = useState('30000');

  // Modal Nova Retirada (Dinheiro ou Aparelho)
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [wdAssetType, setWdAssetType] = useState<'cash' | 'device'>('cash');
  const [wdReasonType, setWdReasonType] =
    useState<WithdrawalReasonType>('custos_loja');
  const [wdAmount, setWdAmount] = useState('500');
  const [wdItemId, setWdItemId] = useState('');
  const [wdTargetInvId, setWdTargetInvId] = useState('');
  const [wdNotes, setWdNotes] = useState('');

  const activeInv =
    visibleInvestments.find((i) => i.id === selectedId) ||
    visibleInvestments[0];

  const metrics = activeInv
    ? calculateInvestmentMetrics(
        activeInv,
        inventory,
        sales,
        installments,
        serviceOrders,
        settings,
        withdrawals
      )
    : null;

  const invSales = sales.filter((s) => s.investment_id === activeInv?.id);
  const invItems = inventory.filter((i) => i.investment_id === activeInv?.id);
  const availableInvDevices = invItems.filter(
    (i) => i.status === 'in_stock' || i.status === 'in_repair'
  );
  const invWithdrawals = withdrawals.filter(
    (w) =>
      w.investment_id === activeInv?.id ||
      w.target_investment_id === activeInv?.id
  );
  const otherInvestments = investments.filter((i) => i.id !== activeInv?.id);

  const handleCreateInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || Number(capital) <= 0) return;
    addInvestment({
      name: name.trim(),
      description:
        description.trim() || 'Planilha de investimento com rastreio isolado.',
      initial_capital: Number(capital),
      start_date: new Date().toISOString().split('T')[0],
      allowed_user_ids: users
        .filter((u) => u.roles.includes('admin'))
        .map((u) => u.id),
    });
    setName('');
    setDescription('');
    setCapital('30000');
    setShowNewModal(false);
  };

  const handleCreateWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInv) return;

    if (wdAssetType === 'device' && !wdItemId) return;
    if (
      wdReasonType === 'mover_planilha' &&
      (!wdTargetInvId || wdTargetInvId === activeInv.id)
    ) {
      return;
    }

    createWithdrawal({
      investmentId: activeInv.id,
      assetType: wdAssetType,
      reasonType: wdReasonType,
      amount: Number(wdAmount) || 0,
      inventoryItemId: wdAssetType === 'device' ? wdItemId : null,
      targetInvestmentId:
        wdReasonType === 'mover_planilha' ? wdTargetInvId : null,
      notes: wdNotes.trim(),
    });

    setWdNotes('');
    setShowWithdrawalModal(false);
    setActiveTab('retiradas');
  };

  return (
    <div className="space-y-5">
      {/* Topo Compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Planilhas de Investimento (Ganhos, Retiradas, Trocas e Acessos)
          </h1>
          <p className="text-xs text-slate-500">
            Visualização limpa em tabela com controle de retiradas (dinheiro ou aparelho) e vínculo de acesso por usuário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeInv && (
            <button
              onClick={() => {
                setWdItemId(availableInvDevices[0]?.id || '');
                if (availableInvDevices[0]) {
                  setWdAmount(
                    String(
                      availableInvDevices[0].purchase_cost +
                        availableInvDevices[0].repair_cost
                    )
                  );
                } else {
                  setWdAmount('500');
                }
                setWdTargetInvId(otherInvestments[0]?.id || '');
                setShowWithdrawalModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Registrar Retirada (R$ / Aparelho)</span>
            </button>
          )}

          {hasRole('admin') && (
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Planilha</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela Seletora de Planilhas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2 px-3">Planilha / Investimento</th>
                <th className="py-2 px-3 text-right">Aporte Inicial</th>
                <th className="py-2 px-3 text-right">Bruto Gerado</th>
                <th className="py-2 px-3 text-right">Retiradas (-)</th>
                <th className="py-2 px-3 text-right">Caixa Líquido</th>
                <th className="py-2 px-3 text-right">Na Rua (Parcelas)</th>
                <th className="py-2 px-3 text-right">Estoque Vivo</th>
                <th className="py-2 px-3 text-right">Lucro Líquido</th>
                <th className="py-2 px-3">Usuários Liberados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleInvestments.map((inv) => {
                const m = calculateInvestmentMetrics(
                  inv,
                  inventory,
                  sales,
                  installments,
                  serviceOrders,
                  settings,
                  withdrawals
                );
                const isSelected = inv.id === activeInv?.id;
                const allowedUsersCount = (inv.allowed_user_ids || []).length;

                return (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedId(inv.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      />
                      <span>{inv.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrencyBRL(m.initialCapital)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {formatCurrencyBRL(m.grossCashGenerated)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">
                      {m.totalWithdrawalsDeducted > 0
                        ? `-${formatCurrencyBRL(m.totalWithdrawalsDeducted)}`
                        : 'R$ 0,00'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                      {formatCurrencyBRL(m.totalCashRealized)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-700">
                      {formatCurrencyBRL(
                        m.pendingReceivablesOnTime +
                          m.overdueReceivablesWithFees
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-indigo-700">
                      {formatCurrencyBRL(m.stockValueAtSuggestedPrice)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        m.projectedNetProfit >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {m.projectedNetProfit > 0 ? '+' : ''}
                      {formatCurrencyBRL(m.projectedNetProfit)} (
                      {m.projectedRoiPercent > 0 ? '+' : ''}
                      {m.projectedRoiPercent}%)
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {allowedUsersCount} usuários
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalhamento da Planilha Selecionada em Abas Limpas */}
      {activeInv && metrics && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Barra de Abas da Planilha */}
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {[
                {
                  id: 'vendas',
                  label: `Vendas & Cascata (${invSales.length})`,
                  icon: GitBranch,
                },
                {
                  id: 'retiradas',
                  label: `Retiradas R$ / Aparelhos (${invWithdrawals.length})`,
                  icon: MinusCircle,
                },
                {
                  id: 'estoque',
                  label: `Estoque da Planilha (${invItems.length})`,
                  icon: Smartphone,
                },
                {
                  id: 'acessos',
                  label: `Usuários com Acesso (${(activeInv.allowed_user_ids || []).length})`,
                  icon: Users,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(
                        tab.id as
                          | 'vendas'
                          | 'retiradas'
                          | 'estoque'
                          | 'acessos'
                      )
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      active
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-600">
              Valor Gerado Líquido (após retiradas):{' '}
              <strong className="text-emerald-700 font-bold">
                {formatCurrencyBRL(metrics.projectedTotalPatrimony)}
              </strong>
            </div>
          </div>

          {/* ABA 1: Vendas & Cascata em Tabela Limpa */}
          {activeTab === 'vendas' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 bg-slate-50/40">
                    <th className="py-2 px-3">Venda</th>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3">Aparelho Vendido</th>
                    <th className="py-2 px-3">Geração</th>
                    <th className="py-2 px-3 text-right">Entrada R$</th>
                    <th className="py-2 px-3">Aparelho na Troca</th>
                    <th className="py-2 px-3 text-right">Crediário</th>
                    <th className="py-2 px-3 text-right">Total Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invSales.map((s) => {
                    const soldItem = invItems.find(
                      (i) => i.id === s.sold_item_id
                    );
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {s.code}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {formatDateBR(s.created_at)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {s.customer_name}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {s.sold_item_name}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              (soldItem?.generation || 1) > 1
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            G{soldItem?.generation || 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                          {formatCurrencyBRL(s.cash_down_payment)}
                        </td>
                        <td className="py-2 px-3">
                          {s.trade_in_value > 0 ? (
                            <span className="text-indigo-700 font-medium">
                              {s.trade_in_model} (
                              {formatCurrencyBRL(s.trade_in_value)})
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-cyan-800">
                          {s.installments_count}x{' '}
                          {formatCurrencyBRL(s.final_installment_value)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCurrencyBRL(s.total_sale_final)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 2: Registro de Retiradas (Dinheiro ou Aparelho) */}
          {activeTab === 'retiradas' && (
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/70 border border-amber-200 rounded-lg px-3.5 py-2 text-xs">
                <div>
                  <strong className="text-amber-900">
                    Resumo de Retiradas desta Planilha:
                  </strong>{' '}
                  <span className="text-amber-800">
                    Dinheiro retirado:{' '}
                    <strong>
                      -{formatCurrencyBRL(metrics.cashWithdrawalsTotal)}
                    </strong>{' '}
                    | Aparelhos retirados:{' '}
                    <strong>
                      -{formatCurrencyBRL(metrics.deviceWithdrawalsTotal)}
                    </strong>{' '}
                    | Total abatido do resultado:{' '}
                    <strong>
                      -{formatCurrencyBRL(metrics.totalWithdrawalsDeducted)}
                    </strong>
                  </span>
                </div>
                <button
                  onClick={() => setShowWithdrawalModal(true)}
                  className="px-2.5 py-1 rounded bg-amber-600 text-white font-semibold cursor-pointer"
                >
                  + Nova Retirada
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                      <th className="py-2 px-3">Data</th>
                      <th className="py-2 px-3">O que foi retirado</th>
                      <th className="py-2 px-3">Tipo de Retirada</th>
                      <th className="py-2 px-3">Destino / Observação</th>
                      <th className="py-2 px-3">Responsável</th>
                      <th className="py-2 px-3 text-right">
                        Impacto na Planilha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invWithdrawals.map((w) => {
                      const isIncoming =
                        w.target_investment_id === activeInv.id &&
                        w.investment_id !== activeInv.id;
                      return (
                        <tr key={w.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500">
                            {formatDateBR(w.created_at)}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {w.asset_type === 'cash'
                              ? 'Dinheiro do Caixa'
                              : `Aparelho: ${w.inventory_item_name}`}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
                              {WITHDRAWAL_REASON_LABELS[w.reason_type]}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {w.target_investment_name
                              ? `Movido para: ${w.target_investment_name} • `
                              : ''}
                            {w.notes || '—'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {w.performed_by_user_name}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-bold ${
                              isIncoming ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {isIncoming ? '+' : '-'}
                            {formatCurrencyBRL(w.amount)}
                          </td>
                        </tr>
                      );
                    })}
                    {invWithdrawals.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-6 text-center text-slate-400"
                        >
                          Nenhuma retirada registrada nesta planilha.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 3: Estoque da Planilha (Incluindo retirados) */}
          {activeTab === 'estoque' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 bg-slate-50/40">
                    <th className="py-2 px-3">Aparelho</th>
                    <th className="py-2 px-3">Geração</th>
                    <th className="py-2 px-3">IMEI</th>
                    <th className="py-2 px-3 text-right">Custo + Reparo</th>
                    <th className="py-2 px-3 text-right">Preço Sugerido</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">
                        {item.brand} {item.model} ({item.storage})
                      </td>
                      <td className="py-2 px-3">
                        G{item.generation}{' '}
                        {item.generation > 1 ? '(Troca)' : '(Inicial)'}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {item.imei || '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrencyBRL(
                          item.purchase_cost + item.repair_cost
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                        {formatCurrencyBRL(item.suggested_price)}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'in_stock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'withdrawn'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.status === 'in_stock'
                            ? 'Em Estoque'
                            : item.status === 'withdrawn'
                              ? 'Retirado da Planilha'
                              : item.status === 'in_repair'
                                ? 'Em Manutenção'
                                : 'Vendido'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ABA 4: Controle de Acesso de Usuários a Esta Planilha */}
          {activeTab === 'acessos' && (
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-600">
                Selecione quais usuários têm acesso a <strong>{activeInv.name}</strong>. Usuários com perfil de <strong>Cobrança</strong> só poderão ver e cobrar as parcelas das planilhas marcadas abaixo:
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                      <th className="py-2 px-3">Acesso Liberado</th>
                      <th className="py-2 px-3">Usuário</th>
                      <th className="py-2 px-3">E-mail</th>
                      <th className="py-2 px-3">Perfis do Usuário</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => {
                      const isAdmin = u.roles.includes('admin');
                      const isAllowed =
                        isAdmin ||
                        (activeInv.allowed_user_ids || []).includes(u.id);

                      return (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              disabled={isAdmin}
                              checked={isAllowed}
                              onChange={() =>
                                toggleUserAccessOnInvestment(
                                  activeInv.id,
                                  u.id
                                )
                              }
                              className="rounded border-slate-300 text-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            {u.name}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{u.email}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {u.roles.map((r) => (
                                <span
                                  key={r}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                                >
                                  {USER_ROLE_LABELS[r]}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar Retirada na Planilha (Dinheiro ou Aparelho) */}
      {showWithdrawalModal && activeInv && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Registrar Retirada — {activeInv.name}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Retire dinheiro ou um aparelho desta planilha. O valor será registrado no histórico e descontado do saldo gerado na planilha.
              </p>
            </div>

            <form onSubmit={handleCreateWithdrawal} className="space-y-3">
              {/* 1. O que está sendo retirado: Dinheiro ou Aparelho */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  O que deseja retirar da planilha?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWdAssetType('cash')}
                    className={`py-2 rounded-lg font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      wdAssetType === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Dinheiro (R$)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWdAssetType('device');
                      const firstDev = availableInvDevices[0];
                      if (firstDev) {
                        setWdItemId(firstDev.id);
                        setWdAmount(
                          String(firstDev.purchase_cost + firstDev.repair_cost)
                        );
                      }
                    }}
                    className={`py-2 rounded-lg font-bold border flex items-center justify-center gap-1.5 cursor-pointer ${
                      wdAssetType === 'device'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Aparelho do Estoque</span>
                  </button>
                </div>
              </div>

              {/* 2. Tipo da Retirada (3 tipos solicitados) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Finalidade / Tipo da Retirada
                </label>
                <select
                  value={wdReasonType}
                  onChange={(e) =>
                    setWdReasonType(e.target.value as WithdrawalReasonType)
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="mover_planilha">
                    1. Mover para outra planilha
                  </option>
                  <option value="uso_proprio">
                    2. Retirada para uso próprio
                  </option>
                  <option value="custos_loja">
                    3. Retirada para custos da loja
                  </option>
                </select>
              </div>

              {/* Se for Mover para outra planilha, escolhe a planilha de destino */}
              {wdReasonType === 'mover_planilha' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Planilha de Destino
                  </label>
                  <select
                    value={wdTargetInvId}
                    onChange={(e) => setWdTargetInvId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {otherInvestments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Se for Aparelho, escolhe qual aparelho da planilha */}
              {wdAssetType === 'device' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Aparelho a Retirar desta Planilha
                  </label>
                  <select
                    value={wdItemId}
                    onChange={(e) => {
                      setWdItemId(e.target.value);
                      const found = availableInvDevices.find(
                        (i) => i.id === e.target.value
                      );
                      if (found) {
                        setWdAmount(
                          String(found.purchase_cost + found.repair_cost)
                        );
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  >
                    {availableInvDevices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.model} (Custo:{' '}
                        {formatCurrencyBRL(d.purchase_cost + d.repair_cost)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Valor Abatido da Planilha (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={wdAmount}
                  onChange={(e) => setWdAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observação / Motivo da Remoção
                </label>
                <input
                  type="text"
                  placeholder="Ex: Retirada para cobrir aluguel da loja / Uso próprio"
                  value={wdNotes}
                  onChange={(e) => setWdNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                >
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nova Planilha */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Nova Planilha de Investimento
            </h3>
            <form onSubmit={handleCreateInvestment} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome da Planilha
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Planilha #03 — Aporte Novembro"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Capital Inicial (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={capital}
                  onChange={(e) => setCapital(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Criar Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
