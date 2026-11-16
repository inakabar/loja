'use client';

import React, { useState } from 'react';
import {
  Eye,
  Pencil,
  Trash2,
  Send,
  Smartphone,
  User,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  buildWhatsAppWebUrl,
  formatCPF,
  formatCurrencyBRL,
  formatDateBR,
} from '@/lib/calculators/spintax-whatsapp';
import { Sale, SalePaymentBreakdown } from '@/types/domain';

export function buildPaymentBreakdownSummary(pb?: SalePaymentBreakdown): string {
  if (!pb) return '';
  const parts: string[] = [];
  if (pb.cash_received > 0) {
    const changes: string[] = [];
    if (pb.change_cash > 0) {
      changes.push(`Troco Espécie: ${formatCurrencyBRL(pb.change_cash)}`);
    }
    if (pb.change_pix > 0) {
      changes.push(`Troco PIX: ${formatCurrencyBRL(pb.change_pix)}`);
    }
    parts.push(
      `Dinheiro: ${formatCurrencyBRL(pb.cash_received)}${
        changes.length > 0
          ? ` (${changes.join(' + ')} → Líq: ${formatCurrencyBRL(pb.cash_net)})`
          : ''
      }`
    );
  }
  if (pb.pix_amount > 0) parts.push(`PIX: ${formatCurrencyBRL(pb.pix_amount)}`);
  if (pb.credit_card_amount > 0) {
    parts.push(`Crédito: ${formatCurrencyBRL(pb.credit_card_amount)}`);
  }
  if (pb.debit_card_amount > 0) {
    parts.push(`Débito: ${formatCurrencyBRL(pb.debit_card_amount)}`);
  }
  if (pb.pending_amount > 0) {
    parts.push(`Pendente: ${formatCurrencyBRL(pb.pending_amount)}`);
  }
  return parts.join(' • ') || 'À Vista';
}

interface SaleRowActionsProps {
  sale: Sale;
  onView: (sale: Sale) => void;
  onEdit?: (sale: Sale) => void;
  onDelete?: (sale: Sale) => void;
  isAdmin: boolean;
}

export function SaleRowActions({
  sale,
  onView,
  onEdit,
  onDelete,
  isAdmin,
}: SaleRowActionsProps) {
  return (
    <div
      className="inline-flex items-center justify-end gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onView(sale)}
        title="Ver Detalhamento Completo da Venda"
        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-[11px] cursor-pointer"
      >
        <Eye className="w-3 h-3 text-indigo-600" />
        <span>Detalhes</span>
      </button>

      {isAdmin && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(sale)}
          title="Editar Venda (Admin)"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-[11px] cursor-pointer"
        >
          <Pencil className="w-3 h-3 text-amber-700" />
          <span>Editar</span>
        </button>
      )}

      {isAdmin && onDelete && (
        <button
          type="button"
          onClick={() => onDelete(sale)}
          title="Excluir Venda (Admin)"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-[11px] cursor-pointer"
        >
          <Trash2 className="w-3 h-3 text-rose-600" />
          <span>Excluir</span>
        </button>
      )}
    </div>
  );
}

interface SaleDetailAndAdminModalsProps {
  viewingSale: Sale | null;
  editingSale: Sale | null;
  deletingSale: Sale | null;
  onCloseView: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onSwitchViewToEdit?: (sale: Sale) => void;
  onSwitchViewToDelete?: (sale: Sale) => void;
}

export function SaleDetailAndAdminModals({
  viewingSale,
  editingSale,
  deletingSale,
  onCloseView,
  onCloseEdit,
  onCloseDelete,
  onSwitchViewToEdit,
  onSwitchViewToDelete,
}: SaleDetailAndAdminModalsProps) {
  const {
    settings,
    customers,
    inventory,
    investments,
    installments,
    hasRole,
    updateSale,
    deleteSale,
  } = useStore();

  const isAdmin = hasRole('admin');

  // Estados de Edição da Venda
  const [editCustomerId, setEditCustomerId] = useState<string>('');
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editInvestmentId, setEditInvestmentId] = useState<string>('loja');
  const [editSoldItemName, setEditSoldItemName] = useState<string>('');
  const [editSalePrice, setEditSalePrice] = useState<string>('0');
  const [editDiscount, setEditDiscount] = useState<string>('0');
  const [editCashDown, setEditCashDown] = useState<string>('0');
  const [editTradeInModel, setEditTradeInModel] = useState<string>('');
  const [editTradeInValue, setEditTradeInValue] = useState<string>('0');
  const [editInstallmentsCount, setEditInstallmentsCount] =
    useState<string>('0');
  const [editFinalInstallmentValue, setEditFinalInstallmentValue] =
    useState<string>('0');
  const [editPendingAmount, setEditPendingAmount] = useState<string>('0');
  const [editTotalSaleFinal, setEditTotalSaleFinal] = useState<string>('0');
  const [editNotes, setEditNotes] = useState<string>('');

  // Estados de Exclusão da Venda
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);

  // Sincroniza quando editingSale muda
  React.useEffect(() => {
    if (!editingSale) return;
    setEditCustomerId(editingSale.customer_id || '');
    setEditCustomerName(editingSale.customer_name || '');
    setEditInvestmentId(editingSale.investment_id || 'loja');
    setEditSoldItemName(editingSale.sold_item_name || '');
    setEditSalePrice(String(editingSale.sale_price ?? 0));
    setEditDiscount(String(editingSale.discount ?? 0));
    setEditCashDown(String(editingSale.cash_down_payment ?? 0));
    setEditTradeInModel(editingSale.trade_in_model || '');
    setEditTradeInValue(String(editingSale.trade_in_value ?? 0));
    setEditInstallmentsCount(String(editingSale.installments_count ?? 0));
    setEditFinalInstallmentValue(
      String(editingSale.final_installment_value ?? 0)
    );
    const pend =
      editingSale.payment_type === 'crediario'
        ? editingSale.financed_principal
        : Number(
            editingSale.payment_breakdown?.pending_amount ??
              editingSale.financed_principal ??
              0
          );
    setEditPendingAmount(String(pend ?? 0));
    setEditTotalSaleFinal(String(editingSale.total_sale_final ?? 0));
    setEditNotes(editingSale.notes || '');
  }, [editingSale]);

  React.useEffect(() => {
    if (deletingSale) {
      setRestoreStockOnDelete(true);
    }
  }, [deletingSale]);

  const handleSaveSaleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    const salePriceNum = Number(editSalePrice) || 0;
    const discountNum = Number(editDiscount) || 0;
    const cashDownNum = Number(editCashDown) || 0;
    const tradeValNum = Number(editTradeInValue) || 0;
    const instCountNum = Math.max(0, Number(editInstallmentsCount) || 0);
    const instValNum = Math.max(0, Number(editFinalInstallmentValue) || 0);
    const pendingNum = Math.max(0, Number(editPendingAmount) || 0);
    const totalFinalNum = Number(editTotalSaleFinal) || 0;

    const updatedBreakdown: SalePaymentBreakdown | undefined =
      editingSale.payment_breakdown
        ? {
            ...editingSale.payment_breakdown,
            pending_amount:
              editingSale.payment_type === 'crediario' ? 0 : pendingNum,
          }
        : undefined;

    updateSale(editingSale.id, {
      customer_id: editCustomerId || null,
      customer_name: editCustomerName.trim() || 'Cliente Balcão',
      investment_id: editInvestmentId || 'loja',
      sold_item_name: editSoldItemName.trim(),
      sale_price: salePriceNum,
      discount: discountNum,
      cash_down_payment: cashDownNum,
      trade_in_model: tradeValNum > 0 ? editTradeInModel.trim() || null : null,
      trade_in_value: tradeValNum,
      installments_count: instCountNum,
      final_installment_value: instValNum,
      financed_principal: pendingNum,
      total_financed_with_interest:
        editingSale.payment_type === 'crediario'
          ? Number((instCountNum * instValNum).toFixed(2))
          : pendingNum,
      total_sale_final: totalFinalNum,
      payment_breakdown: updatedBreakdown,
      notes: editNotes.trim() || undefined,
    });

    onCloseEdit();
  };

  const handleConfirmDeleteSale = () => {
    if (!deletingSale) return;
    deleteSale(deletingSale.id, { restoreStock: restoreStockOnDelete });
    onCloseDelete();
  };

  return (
    <>
      {/* =================================================================== */}
      {/* 1. MODAL DE DETALHAMENTO COMPLETO DA VENDA                          */}
      {/* =================================================================== */}
      {viewingSale && (() => {
        const cust = customers.find((c) => c.id === viewingSale.customer_id);
        const soldItem = inventory.find(
          (i) => i.id === viewingSale.sold_item_id
        );
        const tradeInItem = viewingSale.trade_in_item_id
          ? inventory.find((i) => i.id === viewingSale.trade_in_item_id)
          : null;
        const inv = investments.find(
          (i) => i.id === viewingSale.investment_id
        );
        const saleInstallments = installments
          .filter((inst) => inst.sale_id === viewingSale.id)
          .sort((a, b) => a.installment_number - b.installment_number);

        const pb = viewingSale.payment_breakdown;
        const pendingVal =
          viewingSale.payment_type === 'crediario'
            ? 0
            : Number(pb?.pending_amount ?? viewingSale.financed_principal ?? 0);

        const whatsappReceiptMsg = [
          `*COMPROVANTE DE VENDA ${viewingSale.code} — ${settings.store_name}*`,
          `Data: ${formatDateBR(viewingSale.created_at)}`,
          `Cliente: ${viewingSale.customer_name}`,
          `Produto(s): ${viewingSale.sold_item_name}`,
          soldItem?.imei ? `IMEI: ${soldItem.imei}` : '',
          `Valor Tabelado: ${formatCurrencyBRL(viewingSale.sale_price)}`,
          viewingSale.discount > 0
            ? `Desconto: -${formatCurrencyBRL(viewingSale.discount)}`
            : '',
          viewingSale.trade_in_value > 0
            ? `Aparelho na Troca (${viewingSale.trade_in_model}): -${formatCurrencyBRL(viewingSale.trade_in_value)}`
            : '',
          `Pago no Ato / Entrada: ${formatCurrencyBRL(viewingSale.cash_down_payment)}`,
          pb ? `Pagamentos: ${buildPaymentBreakdownSummary(pb)}` : '',
          viewingSale.installments_count > 0
            ? `Crediário: ${viewingSale.installments_count}x de ${formatCurrencyBRL(viewingSale.final_installment_value)}`
            : '',
          pendingVal > 0
            ? `Saldo Pendente a Pagar: *${formatCurrencyBRL(pendingVal)}*`
            : '',
          `*Total Final: ${formatCurrencyBRL(viewingSale.total_sale_final)}*`,
        ]
          .filter(Boolean)
          .join('\n');

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
              {/* Cabeçalho */}
              <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      Detalhamento da Venda {viewingSale.code}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        viewingSale.payment_type === 'crediario'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {viewingSale.payment_type === 'crediario'
                        ? 'Contrato de Crediário'
                        : 'Venda Direta / PDV'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Registrada em {formatDateBR(viewingSale.created_at)} •
                    Origem:{' '}
                    <strong>
                      {viewingSale.investment_id === 'loja'
                        ? 'Estoque Próprio da Loja'
                        : inv?.name || 'Planilha de Investimento'}
                    </strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseView}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Grid Cliente + Produto Vendido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dados do Cliente</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {viewingSale.customer_name}
                  </div>
                  {cust ? (
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        CPF:{' '}
                        <strong className="font-mono">
                          {cust.cpf ? formatCPF(cust.cpf) : 'Não informado'}
                        </strong>
                      </div>
                      <div>
                        WhatsApp:{' '}
                        <strong className="font-mono">
                          {cust.phone_whatsapp || '—'}
                        </strong>
                      </div>
                      {cust.address && <div>Endereço: {cust.address}</div>}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400">
                      Cliente Balcão (Sem vínculo de cadastro)
                    </div>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Produto(s) Vendido(s)</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {viewingSale.sold_item_name}
                  </div>
                  {soldItem && (
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div>
                        Detalhes:{' '}
                        <strong>
                          {[soldItem.storage, soldItem.color]
                            .filter(Boolean)
                            .join(' • ') || 'Padrão'}
                        </strong>{' '}
                        • Geração: <strong>G{soldItem.generation || 1}</strong>
                      </div>
                      {soldItem.imei && (
                        <div>
                          IMEI:{' '}
                          <strong className="font-mono">{soldItem.imei}</strong>
                        </div>
                      )}
                      <div>
                        Custo no Estoque:{' '}
                        <strong>
                          {formatCurrencyBRL(
                            (soldItem.purchase_cost || 0) +
                              (soldItem.repair_cost || 0)
                          )}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detalhamento Financeiro & Métodos de Pagamento */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px] uppercase">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Detalhamento Financeiro & Pagamentos</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      Valor Bruto Tabelado
                    </div>
                    <div className="font-bold text-white text-sm">
                      {formatCurrencyBRL(viewingSale.sale_price)}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Desconto</div>
                    <div className="font-bold text-amber-300 text-sm">
                      {viewingSale.discount > 0
                        ? `-${formatCurrencyBRL(viewingSale.discount)}`
                        : 'R$ 0,00'}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      Pago no Ato / Entrada
                    </div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {formatCurrencyBRL(viewingSale.cash_down_payment)}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      Total Final da Venda
                    </div>
                    <div className="font-black text-white text-sm">
                      {formatCurrencyBRL(viewingSale.total_sale_final)}
                    </div>
                  </div>
                </div>

                {/* Breakdown de Meios de Pagamento se existir */}
                {pb && (
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-slate-400 font-semibold">
                      Meios de Pagamento Utilizados:
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                      {pb.cash_received > 0 && (
                        <div>
                          Dinheiro Entregue:{' '}
                          <strong className="text-emerald-300">
                            {formatCurrencyBRL(pb.cash_received)}
                          </strong>
                        </div>
                      )}
                      {pb.change_cash > 0 && (
                        <div>
                          Troco em Espécie:{' '}
                          <strong className="text-amber-300">
                            -{formatCurrencyBRL(pb.change_cash)}
                          </strong>
                        </div>
                      )}
                      {pb.change_pix > 0 && (
                        <div>
                          Troco em PIX:{' '}
                          <strong className="text-cyan-300">
                            -{formatCurrencyBRL(pb.change_pix)}
                          </strong>
                        </div>
                      )}
                      {pb.cash_net > 0 && (
                        <div>
                          Dinheiro Líquido:{' '}
                          <strong className="text-emerald-400">
                            {formatCurrencyBRL(pb.cash_net)}
                          </strong>
                        </div>
                      )}
                      {pb.pix_amount > 0 && (
                        <div>
                          Pago em PIX:{' '}
                          <strong className="text-emerald-400">
                            {formatCurrencyBRL(pb.pix_amount)}
                          </strong>
                        </div>
                      )}
                      {pb.credit_card_amount > 0 && (
                        <div>
                          Cartão Crédito:{' '}
                          <strong className="text-cyan-300">
                            {formatCurrencyBRL(pb.credit_card_amount)}
                          </strong>
                        </div>
                      )}
                      {pb.debit_card_amount > 0 && (
                        <div>
                          Cartão Débito:{' '}
                          <strong className="text-indigo-300">
                            {formatCurrencyBRL(pb.debit_card_amount)}
                          </strong>
                        </div>
                      )}
                      {pb.pending_amount > 0 && (
                        <div>
                          Saldo Pendente:{' '}
                          <strong className="text-amber-400">
                            {formatCurrencyBRL(pb.pending_amount)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Aparelho Recebido na Troca */}
                {viewingSale.trade_in_value > 0 && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-700/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      <span className="text-indigo-300 font-bold">
                        🔄 Aparelho Recebido na Troca:
                      </span>{' '}
                      <strong className="text-white">
                        {viewingSale.trade_in_model}
                      </strong>
                      {tradeInItem?.imei && (
                        <span className="text-indigo-200 font-mono ml-2">
                          (IMEI: {tradeInItem.imei})
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-indigo-300">
                      Valor Abatido: {formatCurrencyBRL(viewingSale.trade_in_value)}
                    </div>
                  </div>
                )}

                {viewingSale.notes && (
                  <div className="text-[11px] text-amber-300 pt-1">
                    <strong>Observações / Desconto:</strong> {viewingSale.notes}
                  </div>
                )}
              </div>

              {/* Parcelas do Crediário Vinculadas a Esta Venda */}
              {saleInstallments.length > 0 && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>
                      Parcelas do Crediário desta Venda ({saleInstallments.length})
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <th className="py-1.5 px-2.5">Parcela</th>
                          <th className="py-1.5 px-2.5">Vencimento</th>
                          <th className="py-1.5 px-2.5 text-right">Valor</th>
                          <th className="py-1.5 px-2.5 text-right">Pago</th>
                          <th className="py-1.5 px-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {saleInstallments.map((inst) => (
                          <tr key={inst.id}>
                            <td className="py-1.5 px-2.5 font-bold">
                              {inst.installment_number}/{inst.total_installments}
                            </td>
                            <td className="py-1.5 px-2.5">
                              {formatDateBR(inst.due_date)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-semibold">
                              {formatCurrencyBRL(inst.original_amount)}
                            </td>
                            <td className="py-1.5 px-2.5 text-right text-emerald-700 font-bold">
                              {formatCurrencyBRL(inst.paid_amount || 0)}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  inst.status === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : inst.status === 'loss'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {inst.status === 'paid'
                                  ? 'Paga'
                                  : inst.status === 'loss'
                                  ? 'Perda'
                                  : 'Em Aberto'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rodapé do Modal de Detalhes */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {isAdmin && onSwitchViewToEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingSale;
                        onCloseView();
                        onSwitchViewToEdit(target);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar Venda</span>
                    </button>
                  )}
                  {isAdmin && onSwitchViewToDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = viewingSale;
                        onCloseView();
                        onSwitchViewToDelete(target);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Venda</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {cust?.phone_whatsapp && (
                    <a
                      href={buildWhatsAppWebUrl(
                        cust.phone_whatsapp,
                        whatsappReceiptMsg
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reenviar Comprovante WhatsApp</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={onCloseView}
                    className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =================================================================== */}
      {/* 2. MODAL DE EDIÇÃO DE VENDA (EXCLUSIVO ADMIN)                       */}
      {/* =================================================================== */}
      {isAdmin && editingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Editar Registro de Venda — {editingSale.code} (Admin)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Altere valores, cliente, origem, troca ou pendências desta venda.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseEdit}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cliente Vinculado
                  </label>
                  <select
                    value={editCustomerId}
                    onChange={(e) => {
                      setEditCustomerId(e.target.value);
                      const found = customers.find(
                        (c) => c.id === e.target.value
                      );
                      if (found) setEditCustomerName(found.name);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">Cliente Balcão (Sem cadastro)</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome Exibido na Venda *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Origem (Planilha ou Loja)
                  </label>
                  <select
                    value={editInvestmentId}
                    onChange={(e) => setEditInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="loja">🏪 Estoque Próprio da Loja</option>
                    {investments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        📊 {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Produto(s) Vendido(s) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSoldItemName}
                    onChange={(e) => setEditSoldItemName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor Bruto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSalePrice}
                    onChange={(e) => setEditSalePrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Pago no Ato / Entrada (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCashDown}
                    onChange={(e) => setEditCashDown(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Aparelho na Troca (Modelo)
                  </label>
                  <input
                    type="text"
                    placeholder="Sem aparelho na troca"
                    value={editTradeInModel}
                    onChange={(e) => setEditTradeInModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-indigo-800 mb-1">
                    Valor Abatido na Troca (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTradeInValue}
                    onChange={(e) => setEditTradeInValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qtd Parcelas Crediário
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editInstallmentsCount}
                    onChange={(e) => setEditInstallmentsCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Valor da Parcela (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editFinalInstallmentValue}
                    onChange={(e) =>
                      setEditFinalInstallmentValue(e.target.value)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Saldo Pendente / Financiado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPendingAmount}
                    onChange={(e) => setEditPendingAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-black text-slate-900 mb-1">
                    Total Final da Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTotalSaleFinal}
                    onChange={(e) => setEditTotalSaleFinal(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-400 bg-slate-50 font-black text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Observações / Nota do Desconto
                  </label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. MODAL DE EXCLUSÃO DE VENDA (EXCLUSIVO ADMIN)                     */}
      {/* =================================================================== */}
      {isAdmin && deletingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-200 max-w-md w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Excluir Venda {deletingSale.code}?
                </h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Cliente: <strong>{deletingSale.customer_name}</strong> • Produto:{' '}
                  <strong>{deletingSale.sold_item_name}</strong> (Total:{' '}
                  {formatCurrencyBRL(deletingSale.total_sale_final)})
                </p>
              </div>
            </div>

            <label className="flex items-start gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-emerald-600"
              />
              <div>
                <span className="font-bold text-slate-800 block">
                  Reverter movimentação de estoque desta venda
                </span>
                <span className="text-[10px] text-slate-500">
                  Devolve a unidade vendida para o estoque como Disponível e remove eventual aparelho/OS de troca que tenha entrado por esta venda. As parcelas vinculadas também serão removidas.
                </span>
              </div>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCloseDelete}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSale}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
