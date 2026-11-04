'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  MessageSquareWarning,
  ShoppingBag,
  Wrench,
  ArrowRight,
  Store,
  Calculator,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  calculateInstallmentLateFees,
  calculateInvestmentMetrics,
} from '@/lib/calculators/crediario';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';
import { USER_ROLE_LABELS } from '@/types/domain';

export default function DashboardPage() {
  const {
    visibleInvestments,
    inventory,
    sales,
    installments,
    serviceOrders,
    withdrawals,
    settings,
    currentUser,
    hasRole,
    canAccessInvestment,
  } = useStore();

  // 1. Métricas das Planilhas de Investimento
  const investmentReports = visibleInvestments.map((inv) =>
    calculateInvestmentMetrics(
      inv,
      inventory,
      sales,
      installments,
      serviceOrders,
      settings,
      withdrawals
    )
  );

  // 2. Métricas das Vendas e Estoque Próprio da Loja (investment_id === 'loja')
  const canSeeLoja = hasRole('venda_loja') || hasRole('admin');
  const lojaSales = canSeeLoja
    ? sales.filter((s) => s.investment_id === 'loja')
    : [];
  const lojaInstallments = canSeeLoja
    ? installments.filter((i) => i.investment_id === 'loja')
    : [];
  const lojaStockItems = canSeeLoja
    ? inventory.filter(
        (i) =>
          i.investment_id === 'loja' &&
          i.status === 'in_stock' &&
          i.quantity > 0 &&
          i.category !== 'part'
      )
    : [];

  const lojaCashDown = lojaSales.reduce(
    (acc, s) => acc + (Number(s.cash_down_payment) || 0),
    0
  );
  const lojaPaidInstallments = lojaInstallments
    .filter((i) => i.status === 'paid')
    .reduce((acc, i) => acc + (Number(i.paid_amount) || 0), 0);

  let lojaPendingOnTime = 0;
  let lojaOverdueWithFees = 0;
  lojaInstallments
    .filter((i) => i.status !== 'paid' && i.status !== 'loss')
    .forEach((inst) => {
      const b = calculateInstallmentLateFees(inst, settings);
      if (b.isOverdue) {
        lojaOverdueWithFees += b.updatedTotalAmount;
      } else {
        lojaPendingOnTime += inst.original_amount;
      }
    });

  const lojaStockValue = lojaStockItems.reduce(
    (acc, item) =>
      acc + (Number(item.suggested_price) || 0) * (Number(item.quantity) || 1),
    0
  );

  // Custo dos produtos vendidos na loja para apurar lucro líquido das vendas da loja
  const lojaSoldCost = lojaSales.reduce((acc, s) => {
    const item = inventory.find((i) => i.id === s.sold_item_id);
    if (!item) return acc;
    const unitCost = (item.purchase_cost || 0) + (item.repair_cost || 0);
    return acc + unitCost;
  }, 0);

  const lojaCashRealized = Number(
    (lojaCashDown + lojaPaidInstallments).toFixed(2)
  );
  const lojaNetProfit = Number(
    (
      lojaCashRealized +
      lojaPendingOnTime +
      lojaOverdueWithFees -
      lojaSoldCost
    ).toFixed(2)
  );

  // 3. Métricas de Manutenção / Ordens de Serviço (OS de Clientes)
  const canSeeManutencao =
    hasRole('manutencao') || hasRole('venda_loja') || hasRole('admin');
  const customerServiceOrders = canSeeManutencao
    ? serviceOrders.filter((os) => os.order_type === 'customer')
    : [];

  const osGrossRevenue = customerServiceOrders.reduce(
    (acc, os) => acc + (Number(os.service_price) || 0),
    0
  );
  const osPartsCost = customerServiceOrders.reduce(
    (acc, os) => acc + (Number(os.parts_cost) || 0),
    0
  );
  const osNetProfit = Number((osGrossRevenue - osPartsCost).toFixed(2));

  // 4. Soma Consolidada Geral (Planilhas + Vendas da Loja + Manutenção OS)
  const planilhasSum = investmentReports.reduce(
    (acc, rep) => ({
      initialCapital: acc.initialCapital + rep.initialCapital,
      grossGenerated: acc.grossGenerated + rep.grossCashGenerated,
      withdrawalsTotal: acc.withdrawalsTotal + rep.totalWithdrawalsDeducted,
      cashRealized: acc.cashRealized + rep.totalCashRealized,
      pendingOnTime: acc.pendingOnTime + rep.pendingReceivablesOnTime,
      overdueWithFees: acc.overdueWithFees + rep.overdueReceivablesWithFees,
      stockValue: acc.stockValue + rep.stockValueAtSuggestedPrice,
      projectedProfit: acc.projectedProfit + rep.projectedNetProfit,
    }),
    {
      initialCapital: 0,
      grossGenerated: 0,
      withdrawalsTotal: 0,
      cashRealized: 0,
      pendingOnTime: 0,
      overdueWithFees: 0,
      stockValue: 0,
      projectedProfit: 0,
    }
  );

  const consolidated = {
    initialCapital: planilhasSum.initialCapital,
    grossGenerated:
      planilhasSum.grossGenerated + lojaCashRealized + osGrossRevenue,
    withdrawalsTotal: planilhasSum.withdrawalsTotal,
    cashRealized: planilhasSum.cashRealized + lojaCashRealized + osNetProfit,
    pendingOnTime: planilhasSum.pendingOnTime + lojaPendingOnTime,
    overdueWithFees: planilhasSum.overdueWithFees + lojaOverdueWithFees,
    stockValue: planilhasSum.stockValue + lojaStockValue,
    projectedProfit:
      planilhasSum.projectedProfit + lojaNetProfit + osNetProfit,
  };

  const alertInstallments = installments
    .filter(
      (i) =>
        i.status !== 'paid' &&
        i.status !== 'loss' &&
        canAccessInvestment(i.investment_id)
    )
    .map((inst) => ({
      inst,
      breakdown: calculateInstallmentLateFees(inst, settings),
    }))
    .filter((x) => x.breakdown.isOverdue || x.breakdown.isDueToday)
    .sort((a, b) => b.breakdown.daysLate - a.breakdown.daysLate);

  return (
    <div className="space-y-5">
      {/* Cabeçalho Enxuto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Visão Consolidada Geral (Planilhas + Vendas da Loja + Manutenção OS)
          </h1>
          <p className="text-xs text-slate-500">
            Operador: <strong>{currentUser.name}</strong> • Perfis:{' '}
            {currentUser.roles.map((r) => USER_ROLE_LABELS[r]).join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/vendas"
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>PDV à Vista</span>
          </Link>
          {hasRole('crediario') && (
            <Link
              href="/crediario"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Crediário</span>
            </Link>
          )}
          <Link
            href="/cobrancas"
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>Cobranças ({alertInstallments.length})</span>
          </Link>
        </div>
      </div>

      {/* Faixa Horizontal Compacta de Indicadores (Soma Geral: Planilhas + Loja + OS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-slate-500 block">
            Capital Aportado (Planilhas)
          </span>
          <strong className="text-sm font-bold text-slate-900">
            {formatCurrencyBRL(consolidated.initialCapital)}
          </strong>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-slate-500 block">
            Caixa Líquido (Planilhas + Loja + OS)
          </span>
          <strong className="text-sm font-bold text-emerald-700">
            {formatCurrencyBRL(consolidated.cashRealized)}
          </strong>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-slate-500 block">
            Retiradas Abatidas
          </span>
          <strong className="text-sm font-bold text-amber-700">
            -{formatCurrencyBRL(consolidated.withdrawalsTotal)}
          </strong>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-slate-500 block">
            A Receber (Em Dia)
          </span>
          <strong className="text-sm font-bold text-cyan-700">
            {formatCurrencyBRL(consolidated.pendingOnTime)}
          </strong>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-rose-600 block">
            Em Atraso (+Multa)
          </span>
          <strong className="text-sm font-bold text-rose-700">
            {formatCurrencyBRL(consolidated.overdueWithFees)}
          </strong>
        </div>

        <div className="bg-slate-900 text-white rounded-xl px-3.5 py-2.5">
          <span className="text-[11px] text-slate-400 block">
            Resultado Líquido Consolidado
          </span>
          <strong
            className={`text-sm font-bold ${
              consolidated.projectedProfit >= 0
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {consolidated.projectedProfit > 0 ? '+' : ''}
            {formatCurrencyBRL(consolidated.projectedProfit)}
          </strong>
        </div>
      </div>

      {/* Resumo Operacional da Loja Própria & Manutenção (OS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Store className="w-4 h-4 text-emerald-600" />
              <span>
                Vendas do Estoque Próprio da Loja ({lojaSales.length} vendas)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-3">
              <span>
                Caixa Recebido:{' '}
                <strong className="text-emerald-700">
                  {formatCurrencyBRL(lojaCashRealized)}
                </strong>
              </span>
              <span>
                A Receber:{' '}
                <strong className="text-cyan-700">
                  {formatCurrencyBRL(lojaPendingOnTime + lojaOverdueWithFees)}
                </strong>
              </span>
              <span>
                Estoque Loja:{' '}
                <strong className="text-indigo-700">
                  {formatCurrencyBRL(lojaStockValue)}
                </strong>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Lucro Vendas Loja
            </span>
            <strong
              className={`text-sm font-black ${
                lojaNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {lojaNetProfit > 0 ? '+' : ''}
              {formatCurrencyBRL(lojaNetProfit)}
            </strong>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Wrench className="w-4 h-4 text-cyan-600" />
              <span>
                Bancada de Manutenção / OS de Clientes (
                {customerServiceOrders.length} OS)
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex flex-wrap gap-3">
              <span>
                Faturamento Serviços:{' '}
                <strong className="text-emerald-700">
                  {formatCurrencyBRL(osGrossRevenue)}
                </strong>
              </span>
              <span>
                Custo de Peças:{' '}
                <strong className="text-rose-600">
                  -{formatCurrencyBRL(osPartsCost)}
                </strong>
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Lucro Líquido OS
            </span>
            <strong
              className={`text-sm font-black ${
                osNetProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {osNetProfit > 0 ? '+' : ''}
              {formatCurrencyBRL(osNetProfit)}
            </strong>
          </div>
        </div>
      </div>

      {/* Tabela Principal: Planilhas de Investimento */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Planilhas de Investimento (Resumo Contábil)
            </h2>
          </div>
          <Link
            href="/investimentos"
            className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>Gerenciar Planilhas & Retiradas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500 bg-slate-50/40">
                <th className="py-2.5 px-3 font-semibold">Planilha</th>
                <th className="py-2.5 px-3 font-semibold text-right">Aporte</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Bruto Gerado
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Retiradas (-)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Caixa Líquido
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  A Receber
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Atrasado
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Estoque (Trocas)
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Lucro Líquido
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investmentReports.map((rep) => (
                <tr key={rep.investment.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">
                    <Link
                      href="/investimentos"
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {rep.investment.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                    {formatCurrencyBRL(rep.initialCapital)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-700">
                    {formatCurrencyBRL(rep.grossCashGenerated)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-700 font-medium">
                    {rep.totalWithdrawalsDeducted > 0
                      ? `-${formatCurrencyBRL(rep.totalWithdrawalsDeducted)}`
                      : 'R$ 0,00'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                    {formatCurrencyBRL(rep.totalCashRealized)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-cyan-700">
                    {formatCurrencyBRL(rep.pendingReceivablesOnTime)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                    {formatCurrencyBRL(rep.overdueReceivablesWithFees)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-indigo-700">
                    {formatCurrencyBRL(rep.stockValueAtSuggestedPrice)} (
                    {rep.tradeInDevicesReceivedCount} trocas)
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      rep.projectedNetProfit >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {rep.projectedNetProfit > 0 ? '+' : ''}
                    {formatCurrencyBRL(rep.projectedNetProfit)}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-bold ${
                      rep.projectedRoiPercent >= 0
                        ? 'text-slate-900'
                        : 'text-rose-600'
                    }`}
                  >
                    {rep.projectedRoiPercent > 0 ? '+' : ''}
                    {rep.projectedRoiPercent}%
                  </td>
                </tr>
              ))}
              {investmentReports.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-6 text-center text-slate-400 text-xs"
                  >
                    Nenhuma planilha vinculada ao seu usuário atual.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duas Tabelas Lado a Lado: Cobranças Pendentes & OS em Bancada */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tabela Compacta de Devedores */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Cobranças Prioritárias (Suas Planilhas & Loja)
            </span>
            <Link
              href="/cobrancas"
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Ir para Fila WhatsApp →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-500">
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">Parcela</th>
                  <th className="py-2 px-3">Situação</th>
                  <th className="py-2 px-3 text-right">Atualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alertInstallments.slice(0, 6).map(({ inst, breakdown }) => (
                  <tr key={inst.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">
                      {inst.customer_name}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {inst.installment_number}/{inst.total_installments} •{' '}
                      {inst.sold_item_name}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          breakdown.isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {breakdown.isOverdue
                          ? `${breakdown.daysLate}d atraso`
                          : 'Vence Hoje'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrencyBRL(breakdown.updatedTotalAmount)}
                    </td>
                  </tr>
                ))}
                {alertInstallments.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-5 text-center text-slate-400 text-xs"
                    >
                      Nenhuma cobrança atrasada nas planilhas do seu perfil.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela Compacta de Ordens de Serviço */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-cyan-600" />
              Ordens de Serviço Recentes (OS)
            </span>
            <Link
              href="/manutencao"
              className="text-xs font-semibold text-cyan-700 hover:underline"
            >
              Abrir Bancada →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] text-slate-500">
                  <th className="py-2 px-3">OS</th>
                  <th className="py-2 px-3">Cliente / Aparelho</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3 text-right">Custo / Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {serviceOrders.slice(0, 6).map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {os.code}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {os.device_model}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {os.customer_name}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          os.order_type === 'internal_stock'
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-cyan-50 text-cyan-700'
                        }`}
                      >
                        {os.order_type === 'internal_stock'
                          ? 'Interna (Troca)'
                          : 'Cliente'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-800">
                      {os.order_type === 'customer' ? (
                        <span className="text-emerald-700">
                          +{formatCurrencyBRL(os.service_price)}
                        </span>
                      ) : (
                        <span className="text-rose-600">
                          -{formatCurrencyBRL(os.parts_cost)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {serviceOrders.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-5 text-center text-slate-400 text-xs"
                    >
                      Nenhuma Ordem de Serviço aberta.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
