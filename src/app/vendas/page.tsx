'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  Layers,
  Search,
  Plus,
  Trash2,
  Lock,
  Calculator,
  Tag,
  Clock,
  Send,
  Banknote,
  FileCheck2,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  buildWhatsAppWebUrl,
  formatCPF,
  formatCurrencyBRL,
  formatDateBR,
  isValidCPF,
} from '@/lib/calculators/spintax-whatsapp';
import {
  PRODUCT_SUBCATEGORY_LABELS,
  Sale,
  SalePaymentBreakdown,
} from '@/types/domain';

interface CartRow {
  itemId: string;
  quantity: number;
}

export default function VendasPage() {
  const {
    settings,
    customers,
    inventory,
    investments,
    visibleInvestments,
    sales,
    hasRole,
    canAccessInvestment,
    addCustomer,
    createMultiItemSale,
    settleSalePendingAmount,
  } = useStore();

  // Alternador entre Tela de Venda (PDV) e Tela de Pendentes
  const [activeTab, setActiveTab] = useState<'pdv' | 'pendentes'>('pdv');

  // Filtro de origem dos produtos
  const [selectedOriginId, setSelectedOriginId] = useState<string>('all');

  // Busca de Cliente (Autocomplete por Nome, Telefone ou CPF)
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Busca de Produto (Nome, IMEI, Cor, Capacidade)
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qtyToAdd, setQtyToAdd] = useState<string>('1');

  // Carrinho com N itens na venda
  const [cart, setCart] = useState<CartRow[]>([]);

  // Desconto + Nota Obrigatória do motivo do desconto
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [discountReason, setDiscountReason] = useState<string>('');

  // Múltiplos Métodos de Pagamento na Venda (Dinheiro c/ Troco em Dinheiro/PIX, PIX, Crédito, Débito e Pendente)
  const [cashReceivedStr, setCashReceivedStr] = useState<string>('0');
  const [changeCashStr, setChangeCashStr] = useState<string>('0');
  const [changePixStr, setChangePixStr] = useState<string>('0');
  const [pixAmountStr, setPixAmountStr] = useState<string>('0');
  const [creditCardStr, setCreditCardStr] = useState<string>('0');
  const [debitCardStr, setDebitCardStr] = useState<string>('0');

  // Aparelho na Troca (Trade-In opcional)
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [tradeInBrand, setTradeInBrand] = useState<string>('Apple');
  const [tradeInModel, setTradeInModel] = useState<string>('');
  const [tradeInStorage, setTradeInStorage] = useState<string>('128GB');
  const [tradeInColor, setTradeInColor] = useState<string>('Preto');
  const [tradeInImei, setTradeInImei] = useState<string>('');
  const [tradeInBattery, setTradeInBattery] = useState<string>('88');
  const [tradeInValueStr, setTradeInValueStr] = useState<string>('0');
  const [tradeInResaleStr, setTradeInResaleStr] = useState<string>('0');
  const [tradeInNeedsRepair, setTradeInNeedsRepair] = useState<boolean>(false);

  // Pop-up Modal de Resumo da Venda (Com 3 botões: Revisar, Finalizar, Enviar p/ Cliente)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSubmittingSale, setIsSubmittingSale] = useState(false);
  const [whatsappTargetCustomerId, setWhatsappTargetCustomerId] =
    useState<string>('');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState<string>('');

  // Modal Dar Baixa em Venda Pendente
  const [settlingSale, setSettlingSale] = useState<Sale | null>(null);
  const [settleAmountStr, setSettleAmountStr] = useState<string>('0');
  const [settleMethod, setSettleMethod] = useState<string>('PIX');

  // Modal Novo Cliente
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('55119');

  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(
    null
  );

  // Clientes filtrados por Nome, Telefone ou CPF
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone_whatsapp || '').toLowerCase().includes(q) ||
      (c.cpf || '').toLowerCase().includes(q)
    );
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Produtos disponíveis filtrados por Origem e Busca (Nome, IMEI, Cor, Capacidade)
  const availableProducts = inventory.filter((item) => {
    if (item.status !== 'in_stock' || item.quantity <= 0) return false;
    if (item.category === 'part') return false;
    if (!canAccessInvestment(item.investment_id)) return false;
    if (
      selectedOriginId !== 'all' &&
      item.investment_id !== selectedOriginId
    ) {
      return false;
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      const fullText =
        `${item.brand} ${item.model} ${item.color || ''} ${item.storage || ''} ${item.imei || ''}`.toLowerCase();
      if (!fullText.includes(q)) return false;
    }
    return true;
  });

  const effectiveSelectedProductId =
    selectedProductId &&
    availableProducts.some((p) => p.id === selectedProductId)
      ? selectedProductId
      : availableProducts[0]?.id || '';

  const currentHighlightedProduct = availableProducts.find(
    (p) => p.id === effectiveSelectedProductId
  );

  const handleAddItemToCart = () => {
    if (!currentHighlightedProduct) return;
    const maxStock = currentHighlightedProduct.quantity || 1;
    const requestedQty = Math.max(1, Number(qtyToAdd) || 1);

    setCart((prev) => {
      const existing = prev.find(
        (r) => r.itemId === currentHighlightedProduct.id
      );
      if (existing) {
        const nextQty = Math.min(maxStock, existing.quantity + requestedQty);
        return prev.map((r) =>
          r.itemId === currentHighlightedProduct.id
            ? { ...r, quantity: nextQty }
            : r
        );
      }
      return [
        ...prev,
        {
          itemId: currentHighlightedProduct.id,
          quantity: Math.min(maxStock, requestedQty),
        },
      ];
    });
    setQtyToAdd('1');
  };

  const handleUpdateCartQuantity = (itemId: string, newQty: number) => {
    const prod = inventory.find((i) => i.id === itemId);
    if (!prod) return;
    const clamped = Math.max(1, Math.min(prod.quantity || 1, newQty));
    setCart((prev) =>
      prev.map((r) => (r.itemId === itemId ? { ...r, quantity: clamped } : r))
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((r) => r.itemId !== itemId));
  };

  const activeCartRows: Array<{
    item: (typeof inventory)[number];
    quantity: number;
  }> = cart
    .map((r) => {
      const found = inventory.find((i) => i.id === r.itemId);
      return found ? { item: found, quantity: r.quantity } : null;
    })
    .filter(Boolean) as Array<{
    item: (typeof inventory)[number];
    quantity: number;
  }>;

  const grossCartTotal = activeCartRows.reduce(
    (acc, row) => acc + Number(row.item.suggested_price || 0) * row.quantity,
    0
  );

  const discountVal = Math.max(0, Number(discountStr) || 0);
  const tradeInVal = hasTradeIn ? Math.max(0, Number(tradeInValueStr) || 0) : 0;
  const netPayable = Math.max(0, grossCartTotal - discountVal - tradeInVal);

  // Cálculos dos Métodos de Pagamento e Troco (Em Dinheiro e/ou PIX)
  const cashReceived = Math.max(0, Number(cashReceivedStr) || 0);
  const changeCash = Math.max(0, Number(changeCashStr) || 0);
  const changePix = Math.max(0, Number(changePixStr) || 0);
  const totalChangeGiven = Number((changeCash + changePix).toFixed(2));
  const cashNet = Math.max(
    0,
    Number((cashReceived - totalChangeGiven).toFixed(2))
  );

  const pixAmount = Math.max(0, Number(pixAmountStr) || 0);
  const creditCardAmount = Math.max(0, Number(creditCardStr) || 0);
  const debitCardAmount = Math.max(0, Number(debitCardStr) || 0);

  const totalPaidNow = Number(
    (cashNet + pixAmount + creditCardAmount + debitCardAmount).toFixed(2)
  );

  // Quanto ainda falta pagar (Fica como Pendente automaticamente)
  const pendingAmount = Math.max(
    0,
    Number((netPayable - totalPaidNow).toFixed(2))
  );

  // Sugestão de troco caso o valor bruto entregue supere o que falta pagar
  const rawDeliveredBeforeChange =
    cashReceived + pixAmount + creditCardAmount + debitCardAmount;
  const suggestedChangeTotal = Math.max(
    0,
    Number((rawDeliveredBeforeChange - netPayable).toFixed(2))
  );

  const handleQuickFillPayment = (
    mode: 'pix' | 'dinheiro' | 'credito' | 'debito' | 'pendente'
  ) => {
    setCashReceivedStr(mode === 'dinheiro' ? String(netPayable) : '0');
    setChangeCashStr('0');
    setChangePixStr('0');
    setPixAmountStr(mode === 'pix' ? String(netPayable) : '0');
    setCreditCardStr(mode === 'credito' ? String(netPayable) : '0');
    setDebitCardStr(mode === 'debito' ? String(netPayable) : '0');
  };

  // Limpa 100% dos campos da tela de venda após concluir
  const clearAllSaleFormFields = () => {
    setCart([]);
    setSelectedProductId('');
    setProductSearch('');
    setQtyToAdd('1');
    setCustomerSearch('');
    setSelectedCustomerId('');
    setDiscountStr('0');
    setDiscountReason('');
    setCashReceivedStr('0');
    setChangeCashStr('0');
    setChangePixStr('0');
    setPixAmountStr('0');
    setCreditCardStr('0');
    setDebitCardStr('0');
    setHasTradeIn(false);
    setTradeInModel('');
    setTradeInImei('');
    setTradeInValueStr('0');
    setTradeInResaleStr('0');
    setTradeInNeedsRepair(false);
    setShowSummaryModal(false);
    setIsSubmittingSale(false);
  };

  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    if (newCustCpf.trim() && !isValidCPF(newCustCpf)) {
      alert(
        'CPF inválido! Digite um CPF válido ou deixe em branco (obrigatório apenas para o Crediário).'
      );
      return;
    }
    const created = addCustomer({
      name: newCustName.trim(),
      cpf: newCustCpf.trim() ? formatCPF(newCustCpf) : '',
      phone_whatsapp: newCustPhone.trim(),
      whatsapp_opt_in: true,
      credit_score: 'bom',
      address: 'Cadastrado no PDV',
    });
    setSelectedCustomerId(created.id);
    setWhatsappTargetCustomerId(created.id);
    setNewCustName('');
    setNewCustCpf('');
    setShowNewCustomerModal(false);
  };

  // Abre o Pop-up de Resumo da Venda
  const handleOpenSaleSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCartRows.length === 0) {
      alert(
        'Adicione ao menos 1 produto ao carrinho clicando em "+ Adicionar".'
      );
      return;
    }
    if (discountVal > 0 && !discountReason.trim()) {
      alert(
        'Por favor, informe obrigatoriamente a nota/motivo do desconto concedido.'
      );
      return;
    }
    if (totalChangeGiven > cashReceived) {
      alert(
        'O valor do troco não pode ser maior do que o valor recebido em dinheiro.'
      );
      return;
    }
    if (pendingAmount > 0 && !selectedCustomerId) {
      alert(
        'Quando há valor Pendente na venda, selecione o cliente (ou cadastre em + Novo Cliente) para registrar na Tela de Pendentes.'
      );
      return;
    }

    setWhatsappTargetCustomerId(selectedCustomerId || customers[0]?.id || '');
    const cust = customers.find((c) => c.id === selectedCustomerId);
    setWhatsappCustomPhone(cust?.phone_whatsapp || '');
    setShowSummaryModal(true);
  };

  const buildPaymentSummaryText = (pb: SalePaymentBreakdown) => {
    const parts: string[] = [];
    if (pb.cash_received > 0) {
      let d = `Dinheiro: ${formatCurrencyBRL(pb.cash_received)}`;
      if (pb.change_cash > 0 || pb.change_pix > 0) {
        const ch: string[] = [];
        if (pb.change_cash > 0)
          ch.push(`Troco Espécie: ${formatCurrencyBRL(pb.change_cash)}`);
        if (pb.change_pix > 0)
          ch.push(`Troco PIX: ${formatCurrencyBRL(pb.change_pix)}`);
        d += ` (${ch.join(' + ')} → Líquido: ${formatCurrencyBRL(pb.cash_net)})`;
      }
      parts.push(d);
    }
    if (pb.pix_amount > 0) parts.push(`PIX: ${formatCurrencyBRL(pb.pix_amount)}`);
    if (pb.credit_card_amount > 0)
      parts.push(`Crédito: ${formatCurrencyBRL(pb.credit_card_amount)}`);
    if (pb.debit_card_amount > 0)
      parts.push(`Débito: ${formatCurrencyBRL(pb.debit_card_amount)}`);
    if (pb.pending_amount > 0)
      parts.push(`PENDENTE: ${formatCurrencyBRL(pb.pending_amount)}`);
    return parts.join(' | ') || 'À Vista';
  };

  const buildWhatsAppSaleReceiptText = (
    sale: Sale,
    customerName: string,
    pb: SalePaymentBreakdown
  ) => {
    const lines = [
      `*COMPROVANTE DE VENDA ${sale.code} — ${settings.store_name}*`,
      `Data: ${formatDateBR(sale.created_at)}`,
      `Cliente: ${customerName}`,
      ``,
      `*Itens da Venda:*`,
      ...activeCartRows.map(
        (r) =>
          `• ${r.quantity}x ${r.item.brand} ${r.item.model} ${r.item.storage || ''} ${r.item.color || ''} — ${formatCurrencyBRL(Number(r.item.suggested_price || 0) * r.quantity)}`.trim()
      ),
      ``,
      `Subtotal Tabelado: ${formatCurrencyBRL(grossCartTotal)}`,
    ];

    if (discountVal > 0) {
      lines.push(
        `Desconto Concedido: -${formatCurrencyBRL(discountVal)} (${discountReason.trim()})`
      );
    }
    if (hasTradeIn && tradeInVal > 0) {
      lines.push(
        `Aparelho na Troca (${tradeInBrand} ${tradeInModel}): -${formatCurrencyBRL(tradeInVal)}`
      );
    }

    lines.push(`*Total Líquido da Venda: ${formatCurrencyBRL(netPayable)}*`);
    lines.push(``);
    lines.push(`*Detalhamento do Pagamento:*`);
    if (pb.cash_received > 0) {
      lines.push(`• Dinheiro Entregue: ${formatCurrencyBRL(pb.cash_received)}`);
      if (pb.change_cash > 0) {
        lines.push(
          `  ↳ Troco em Dinheiro: -${formatCurrencyBRL(pb.change_cash)}`
        );
      }
      if (pb.change_pix > 0) {
        lines.push(`  ↳ Troco via PIX: -${formatCurrencyBRL(pb.change_pix)}`);
      }
    }
    if (pb.pix_amount > 0) {
      lines.push(`• Pago via PIX: ${formatCurrencyBRL(pb.pix_amount)}`);
    }
    if (pb.credit_card_amount > 0) {
      lines.push(
        `• Cartão de Crédito: ${formatCurrencyBRL(pb.credit_card_amount)}`
      );
    }
    if (pb.debit_card_amount > 0) {
      lines.push(
        `• Cartão de Débito: ${formatCurrencyBRL(pb.debit_card_amount)}`
      );
    }
    if (pb.pending_amount > 0) {
      lines.push(
        `• *Saldo Pendente a Pagar: ${formatCurrencyBRL(pb.pending_amount)}*`
      );
    } else {
      lines.push(`• Status: *100% Quitado*`);
    }

    lines.push(``);
    lines.push(`Obrigado pela preferência!`);
    return lines.join('\n');
  };

  // Executa o registro definitivo da venda (Botão 2: Finalizar ou Botão 3: Finalizar + WhatsApp)
  const executeFinalizeSale = (sendWhatsApp: boolean) => {
    if (isSubmittingSale) return; // Trava contra duplo clique!
    setIsSubmittingSale(true);

    try {
      const targetCustomerForSale =
        selectedCustomerId ||
        (sendWhatsApp && whatsappTargetCustomerId
          ? whatsappTargetCustomerId
          : undefined);

      const pb: SalePaymentBreakdown = {
        cash_received: cashReceived,
        change_cash: changeCash,
        change_pix: changePix,
        cash_net: cashNet,
        pix_amount: pixAmount,
        credit_card_amount: creditCardAmount,
        debit_card_amount: debitCardAmount,
        pending_amount: pendingAmount,
        original_pending_amount: pendingAmount,
      };

      const dominantPaymentType: 'avista' | 'cartao' =
        creditCardAmount + debitCardAmount > cashNet + pixAmount
          ? 'cartao'
          : 'avista';

      const createdSale = createMultiItemSale({
        customerId: targetCustomerForSale,
        items: activeCartRows.map((r) => ({
          itemId: r.item.id,
          quantity: r.quantity,
        })),
        discount: discountVal,
        discountReason: discountReason.trim() || undefined,
        paymentType: dominantPaymentType,
        paymentBreakdown: pb,
        hasTradeIn,
        tradeInBrand,
        tradeInModel,
        tradeInStorage,
        tradeInColor,
        tradeInImei,
        tradeInBattery: Number(tradeInBattery) || 88,
        tradeInValue: tradeInVal,
        tradeInSuggestedResalePrice: Number(tradeInResaleStr) || 0,
        tradeInNeedsRepair,
        notes: buildPaymentSummaryText(pb),
      });

      if (sendWhatsApp) {
        const chosenCust = customers.find(
          (c) => c.id === (whatsappTargetCustomerId || selectedCustomerId)
        );
        const targetPhone =
          whatsappCustomPhone.trim() || chosenCust?.phone_whatsapp || '';
        const targetName = chosenCust?.name || createdSale.customer_name;

        if (targetPhone) {
          const text = buildWhatsAppSaleReceiptText(
            createdSale,
            targetName,
            pb
          );
          const url = buildWhatsAppWebUrl(targetPhone, text);
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      }

      // Limpa todos os dados da tela de venda imediatamente para evitar duplicação
      clearAllSaleFormFields();

      setSaleSuccessMessage(
        `Venda ${createdSale.code} registrada com sucesso (${createdSale.sold_item_name})! Formulário limpo.`
      );
      setTimeout(() => setSaleSuccessMessage(null), 6000);
    } catch (err) {
      setIsSubmittingSale(false);
      alert(err instanceof Error ? err.message : 'Erro ao registrar venda');
    }
  };

  const handleConfirmSettlePending = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingSale) return;
    const val = Number(settleAmountStr) || 0;
    if (val <= 0) return;
    settleSalePendingAmount({
      saleId: settlingSale.id,
      amountPaidNow: val,
      paymentMethodLabel: settleMethod,
    });
    setSettlingSale(null);
  };

  const visibleSales = sales.filter((s) =>
    canAccessInvestment(s.investment_id)
  );

  const pendingSales = visibleSales.filter(
    (s) =>
      s.payment_type !== 'crediario' &&
      (Number(s.payment_breakdown?.pending_amount || 0) > 0 ||
        Number(s.financed_principal || 0) > 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            PDV • Venda Multi-Pagamentos, Troco (Dinheiro/PIX) & Controle de Pendentes
          </h1>
          <p className="text-xs text-slate-500">
            Combine Dinheiro (com troco em espécie e/ou PIX), PIX, Crédito, Débito e Valor Pendente, com confirmação em pop-up antes de finalizar.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botões Alternadores: PDV vs Tela de Pendentes */}
          <button
            type="button"
            onClick={() => setActiveTab('pdv')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border ${
              activeTab === 'pdv'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Nova Venda (PDV)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pendentes')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer border ${
              activeTab === 'pendentes'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Vendas Pendentes ({pendingSales.length})</span>
          </button>

          {hasRole('crediario') && (
            <Link
              href="/crediario"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
            >
              <Calculator className="w-4 h-4" />
              <span>Aba Crediário →</span>
            </Link>
          )}
        </div>
      </div>

      {saleSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* TELA DE VENDAS COM SALDO PENDENTE                                   */}
      {/* =================================================================== */}
      {activeTab === 'pendentes' ? (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h2 className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  Controle de Vendas com Saldo Pendente ({pendingSales.length}{' '}
                  em aberto)
                </span>
              </h2>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Vendas em que o cliente pagou parte no ato e deixou um saldo pendente para acertar depois.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-amber-700 block">
                Total Pendente a Receber
              </span>
              <strong className="text-base font-black text-amber-950">
                {formatCurrencyBRL(
                  pendingSales.reduce(
                    (acc, s) =>
                      acc +
                      Number(
                        s.payment_breakdown?.pending_amount ??
                          s.financed_principal ??
                          0
                      ),
                    0
                  )
                )}
              </strong>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                    <th className="py-2.5 px-3">Venda / Data</th>
                    <th className="py-2.5 px-3">Cliente</th>
                    <th className="py-2.5 px-3">Produtos</th>
                    <th className="py-2.5 px-3">Pagamentos no Ato</th>
                    <th className="py-2.5 px-3 text-right">Total Venda</th>
                    <th className="py-2.5 px-3 text-right">Já Pago</th>
                    <th className="py-2.5 px-3 text-right">Valor Pendente</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingSales.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        Nenhuma venda com saldo pendente no momento.
                      </td>
                    </tr>
                  ) : (
                    pendingSales.map((s) => {
                      const pendVal = Number(
                        s.payment_breakdown?.pending_amount ??
                          s.financed_principal ??
                          0
                      );
                      const cust = customers.find(
                        (c) => c.id === s.customer_id
                      );

                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">
                              {s.code}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {formatDateBR(s.created_at)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">
                              {s.customer_name}
                            </div>
                            {cust?.phone_whatsapp && (
                              <div className="text-[10px] font-mono text-slate-500">
                                {cust.phone_whatsapp}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {s.sold_item_name}
                          </td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-600">
                            {s.payment_breakdown
                              ? buildPaymentSummaryText(s.payment_breakdown)
                              : s.notes || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700">
                            {formatCurrencyBRL(s.total_sale_final)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                            {formatCurrencyBRL(s.cash_down_payment)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-black">
                              {formatCurrencyBRL(pendVal)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {cust?.phone_whatsapp && (
                                <a
                                  href={buildWhatsAppWebUrl(
                                    cust.phone_whatsapp,
                                    `Olá ${s.customer_name}, tudo bem? Passando da *${settings.store_name}* referente ao saldo pendente de *${formatCurrencyBRL(pendVal)}* da compra *${s.code}* (${s.sold_item_name}). Segue nossa chave PIX: *${settings.pix_key}*`
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px]"
                                >
                                  WhatsApp
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setSettlingSale(s);
                                  setSettleAmountStr(String(pendVal));
                                  setSettleMethod('PIX');
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer"
                              >
                                Receber / Quitar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* =================================================================== */
        /* TELA PRINCIPAL DO PDV DE VENDAS                                     */
        /* =================================================================== */
        <>
          <form
            onSubmit={handleOpenSaleSummary}
            className="grid grid-cols-1 lg:grid-cols-12 gap-4"
          >
            {/* Coluna Esquerda: Cliente, Busca Detalhada de Produtos e Carrinho N Itens */}
            <div className="lg:col-span-7 space-y-4">
              {/* 1. Autocomplete de Cliente */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-emerald-600" />
                    <span>
                      1. Cliente da Venda (Filtrar por Nome, Telefone ou CPF)
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Novo Cliente</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Digite Nome, Telefone ou CPF..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        const q = e.target.value.toLowerCase().trim();
                        if (q) {
                          const match = customers.find(
                            (c) =>
                              c.name.toLowerCase().includes(q) ||
                              (c.phone_whatsapp || '')
                                .toLowerCase()
                                .includes(q) ||
                              (c.cpf || '').toLowerCase().includes(q)
                          );
                          if (match) setSelectedCustomerId(match.id);
                        }
                      }}
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white"
                    />
                  </div>

                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">
                      Cliente Balcão (Sem cadastro / À Vista)
                    </option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} • Tel: {c.phone_whatsapp}{' '}
                        {c.cpf ? `• CPF: ${c.cpf}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCustomer && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Cliente Selecionado:{' '}
                      <strong>{selectedCustomer.name}</strong>
                    </span>
                    <span>
                      Tel: <strong>{selectedCustomer.phone_whatsapp}</strong>{' '}
                      {selectedCustomer.cpf
                        ? `• CPF: ${selectedCustomer.cpf}`
                        : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Seleção Detalhada de Produtos & Adicionar N Itens ao Carrinho */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>
                      2. Filtrar Produtos (Por Nome, IMEI, Cor ou Origem)
                    </span>
                  </h2>

                  <select
                    value={selectedOriginId}
                    onChange={(e) => setSelectedOriginId(e.target.value)}
                    className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-[11px]"
                  >
                    <option value="all">
                      Todas as Origens (Loja + Planilhas)
                    </option>
                    {hasRole('venda_loja') && (
                      <option value="loja">🏪 Estoque Próprio da Loja</option>
                    )}
                    {visibleInvestments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        📊 Planilha: {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar produto por Modelo, IMEI (quando celular), Cor ou Capacidade..."
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setSelectedProductId('');
                    }}
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-7">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Produto Disponível ({availableProducts.length} encontrados)
                    </label>
                    <select
                      value={effectiveSelectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                    >
                      {availableProducts.length === 0 ? (
                        <option value="">
                          Nenhum produto encontrado com este filtro...
                        </option>
                      ) : (
                        availableProducts.map((item) => {
                          const invName =
                            item.investment_id === 'loja'
                              ? 'LOJA'
                              : investments
                                  .find((i) => i.id === item.investment_id)
                                  ?.name.split('—')[0]
                                  .trim() || 'PLANILHA';
                          return (
                            <option key={item.id} value={item.id}>
                              [{invName}] {item.brand} {item.model}{' '}
                              {item.storage ? `${item.storage} ` : ''}
                              {item.color ? `• ${item.color} ` : ''}
                              {item.imei ? `• IMEI: ${item.imei} ` : ''}—{' '}
                              {formatCurrencyBRL(item.suggested_price)} (Saldo:{' '}
                              {item.quantity})
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Qtd
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={currentHighlightedProduct?.quantity || 1}
                      value={qtyToAdd}
                      onChange={(e) => setQtyToAdd(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 font-bold text-center"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddItemToCart}
                      disabled={!currentHighlightedProduct}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {/* Card Detalhado do Produto Selecionado */}
                {currentHighlightedProduct && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs">
                        {currentHighlightedProduct.brand}{' '}
                        {currentHighlightedProduct.model}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Preço Tabelado no Estoque:{' '}
                        {formatCurrencyBRL(
                          currentHighlightedProduct.suggested_price
                        )}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
                      {currentHighlightedProduct.subcategory && (
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          {
                            PRODUCT_SUBCATEGORY_LABELS[
                              currentHighlightedProduct.subcategory
                            ]
                          }
                        </span>
                      )}
                      {currentHighlightedProduct.color && (
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          Cor: <strong>{currentHighlightedProduct.color}</strong>
                        </span>
                      )}
                      {currentHighlightedProduct.storage && (
                        <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          Capacidade:{' '}
                          <strong>{currentHighlightedProduct.storage}</strong>
                        </span>
                      )}
                      {currentHighlightedProduct.imei && (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono">
                          IMEI:{' '}
                          <strong>{currentHighlightedProduct.imei}</strong>
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                        Saldo Disponível:{' '}
                        <strong>
                          {currentHighlightedProduct.quantity} un.
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Lista de Itens no Carrinho */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Itens na Venda Atual ({activeCartRows.length} produto(s))
                    </span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Preços seguem o estoque</span>
                    </span>
                  </div>

                  {activeCartRows.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                      Selecione um produto acima e clique em{' '}
                      <strong>+ Adicionar</strong> para montar a venda.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {activeCartRows.map(({ item, quantity }) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-white flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900">
                              {item.brand} {item.model}{' '}
                              {item.color || item.storage
                                ? `(${[item.storage, item.color].filter(Boolean).join(' • ')})`
                                : ''}
                            </div>
                            <div className="text-[10px] text-slate-500 flex flex-wrap gap-2">
                              {item.imei && (
                                <span className="font-mono">
                                  IMEI: {item.imei}
                                </span>
                              )}
                              <span>
                                Unitário:{' '}
                                <strong>
                                  {formatCurrencyBRL(item.suggested_price)}
                                </strong>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max={item.quantity}
                              value={quantity}
                              onChange={(e) =>
                                handleUpdateCartQuantity(
                                  item.id,
                                  Number(e.target.value) || 1
                                )
                              }
                              className="w-16 px-2 py-1 rounded border border-slate-300 text-center font-bold"
                            />
                            <div className="w-24 text-right font-bold text-emerald-700">
                              {formatCurrencyBRL(
                                Number(item.suggested_price || 0) * quantity
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(item.id)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Aparelho Recebido na Troca (Opcional) */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <RefreshCw className="w-4 h-4 text-indigo-600" />
                    <span>
                      3. Aparelho Recebido na Troca (Trade-In Opcional)
                    </span>
                  </div>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700">
                    <input
                      type="checkbox"
                      checked={hasTradeIn}
                      onChange={(e) => setHasTradeIn(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Incluir aparelho na troca</span>
                  </label>
                </div>

                {hasTradeIn && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Marca
                      </label>
                      <input
                        type="text"
                        value={tradeInBrand}
                        onChange={(e) => setTradeInBrand(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Modelo *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: iPhone 14"
                        value={tradeInModel}
                        onChange={(e) => setTradeInModel(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        Capacidade / Cor
                      </label>
                      <input
                        type="text"
                        value={tradeInStorage}
                        onChange={(e) => setTradeInStorage(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">
                        IMEI da Troca
                      </label>
                      <input
                        type="text"
                        value={tradeInImei}
                        onChange={(e) => setTradeInImei(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-bold text-indigo-700 mb-1">
                        Valor Abatido na Troca (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeInValueStr}
                        onChange={(e) => setTradeInValueStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50/40 font-bold"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block font-semibold text-slate-600 mb-1">
                        Preço Futura Revenda (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tradeInResaleStr}
                        onChange={(e) => setTradeInResaleStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita: Desconto e Múltiplos Métodos de Pagamento Combinados */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="font-bold text-sm">
                    4. Pagamentos da Venda (Combinados + Troco)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    Total Líquido: {formatCurrencyBRL(netPayable)}
                  </span>
                </div>

                {/* Subtotal e Desconto */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" />
                      <span>Subtotal Estoque (R$)</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={formatCurrencyBRL(grossCartTotal)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-amber-300 font-bold mb-1">
                      Desconto (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountStr}
                      onChange={(e) => setDiscountStr(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-500/50 text-amber-300 font-bold"
                    />
                  </div>
                </div>

                {discountVal > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 space-y-1">
                    <label className="block text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      <span>
                        Motivo do Desconto de {formatCurrencyBRL(discountVal)} *
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Pagamento à vista / Cliente fiel"
                      value={discountReason}
                      onChange={(e) => setDiscountReason(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-amber-500 text-white"
                    />
                  </div>
                )}

                {/* Atalhos Rápidos de Preenchimento */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    Atalho Rápido (100% em um método) ou preencha combinado abaixo:
                  </span>
                  <div className="grid grid-cols-5 gap-1">
                    <button
                      type="button"
                      onClick={() => handleQuickFillPayment('pix')}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-300 cursor-pointer"
                    >
                      100% PIX
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillPayment('dinheiro')}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-300 cursor-pointer"
                    >
                      100% Dinheiro
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillPayment('credito')}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-cyan-300 cursor-pointer"
                    >
                      100% Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillPayment('debito')}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-indigo-300 cursor-pointer"
                    >
                      100% Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFillPayment('pendente')}
                      className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-amber-300 cursor-pointer"
                    >
                      Zerar / Pendente
                    </button>
                  </div>
                </div>

                {/* Bloco 1: Dinheiro Recebido + Troco (Em Dinheiro e/ou em PIX) */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5" />
                      <span>
                        Dinheiro em Espécie & Troco (Dinheiro e/ou PIX)
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Líquido Dinheiro:{' '}
                      <strong className="text-emerald-300">
                        {formatCurrencyBRL(cashNet)}
                      </strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-300 font-semibold mb-1">
                        Entrou Dinheiro (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashReceivedStr}
                        onChange={(e) => setCashReceivedStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-emerald-600/60 text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-amber-300 font-semibold mb-1">
                        Troco Dinheiro (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={changeCashStr}
                        onChange={(e) => setChangeCashStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-500/50 text-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-cyan-300 font-semibold mb-1">
                        Troco em PIX (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={changePixStr}
                        onChange={(e) => setChangePixStr(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/50 text-cyan-300 font-bold"
                      />
                    </div>
                  </div>

                  {suggestedChangeTotal > 0 &&
                    Math.abs(totalChangeGiven - suggestedChangeTotal) > 0.01 && (
                      <div className="flex items-center justify-between pt-1 text-[10px] text-amber-300">
                        <span>
                          Troco sugerido pelos valores digitados:{' '}
                          <strong>
                            {formatCurrencyBRL(suggestedChangeTotal)}
                          </strong>
                        </span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setChangeCashStr(String(suggestedChangeTotal));
                              setChangePixStr('0');
                            }}
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-200 cursor-pointer"
                          >
                            Tudo Espécie
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setChangePixStr(String(suggestedChangeTotal));
                              setChangeCashStr('0');
                            }}
                            className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 cursor-pointer"
                          >
                            Tudo PIX
                          </button>
                        </div>
                      </div>
                    )}
                </div>

                {/* Bloco 2: PIX, Cartão de Crédito e Cartão de Débito */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-emerald-300 font-bold mb-1">
                      Pago em PIX (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={pixAmountStr}
                      onChange={(e) => setPixAmountStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-cyan-300 font-bold mb-1">
                      Cartão Crédito (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditCardStr}
                      onChange={(e) => setCreditCardStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-indigo-300 font-bold mb-1">
                      Cartão Débito (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={debitCardStr}
                      onChange={(e) => setDebitCardStr(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-bold"
                    />
                  </div>
                </div>

                {/* Resumo Final de Pagamentos + Valor Pendente */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Líquido a Pagar:</span>
                    <span className="font-bold text-white">
                      {formatCurrencyBRL(netPayable)}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Soma Paga Agora (Dinheiro Líq. + PIX + Cartões):</span>
                    <span className="font-bold">
                      {formatCurrencyBRL(totalPaidNow)}
                    </span>
                  </div>
                  <div
                    className={`flex justify-between pt-1.5 border-t border-slate-800 font-black text-sm ${
                      pendingAmount > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    <span>
                      {pendingAmount > 0
                        ? '⏳ Saldo que Ficará Pendente:'
                        : '✓ Situação da Venda:'}
                    </span>
                    <span>
                      {pendingAmount > 0
                        ? formatCurrencyBRL(pendingAmount)
                        : '100% Quitada'}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={activeCartRows.length === 0}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Gerar Resumo da Venda & Confirmar →</span>
                </button>
              </div>
            </div>
          </form>

          {/* Histórico de Vendas */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800">
              Vendas Registradas ({visibleSales.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                    <th className="py-2 px-3">Venda</th>
                    <th className="py-2 px-3">Cliente</th>
                    <th className="py-2 px-3">Produtos Vendidos</th>
                    <th className="py-2 px-3">Detalhamento de Pagamentos</th>
                    <th className="py-2 px-3 text-right">Pago</th>
                    <th className="py-2 px-3 text-right">Pendente</th>
                    <th className="py-2 px-3 text-right">Total Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleSales.map((s) => {
                    const pend =
                      s.payment_type === 'crediario'
                        ? 0
                        : Number(
                            s.payment_breakdown?.pending_amount ??
                              s.financed_principal ??
                              0
                          );
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {s.code}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {s.customer_name}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {s.sold_item_name}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-600">
                          {s.payment_breakdown
                            ? buildPaymentSummaryText(s.payment_breakdown)
                            : s.payment_type === 'crediario'
                            ? `Crediário (${s.installments_count}x de ${formatCurrencyBRL(s.final_installment_value)})`
                            : s.notes || 'À Vista'}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                          {formatCurrencyBRL(s.cash_down_payment)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {pend > 0 ? (
                            <button
                              type="button"
                              onClick={() => setActiveTab('pendentes')}
                              className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] cursor-pointer"
                            >
                              {formatCurrencyBRL(pend)} (Ver Pendentes)
                            </button>
                          ) : (
                            <span className="text-slate-400">R$ 0,00</span>
                          )}
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
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* POP-UP MODAL DE RESUMO DA VENDA (COM OS 3 BOTÕES SOLICITADOS)       */}
      {/* =================================================================== */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Resumo da Venda — Conferência Final
                </h3>
                <p className="text-[11px] text-slate-500">
                  Confira os itens e os valores de cada método de pagamento antes de registrar.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                Total Líquido: {formatCurrencyBRL(netPayable)}
              </span>
            </div>

            {/* Itens do Resumo */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-700 uppercase text-[10px]">
                Produtos Vendidos ({activeCartRows.length})
              </div>
              {activeCartRows.map(({ item, quantity }) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-slate-800 font-medium"
                >
                  <span>
                    {quantity}x {item.brand} {item.model}{' '}
                    {item.storage || item.color
                      ? `(${[item.storage, item.color].filter(Boolean).join(' • ')})`
                      : ''}
                  </span>
                  <span className="font-bold">
                    {formatCurrencyBRL(
                      Number(item.suggested_price || 0) * quantity
                    )}
                  </span>
                </div>
              ))}
              {discountVal > 0 && (
                <div className="flex items-center justify-between text-amber-700 pt-1 border-t border-slate-200">
                  <span>Desconto ({discountReason}):</span>
                  <span className="font-bold">
                    -{formatCurrencyBRL(discountVal)}
                  </span>
                </div>
              )}
              {hasTradeIn && tradeInVal > 0 && (
                <div className="flex items-center justify-between text-indigo-700 pt-1 border-t border-slate-200">
                  <span>
                    Aparelho na Troca ({tradeInBrand} {tradeInModel}):
                  </span>
                  <span className="font-bold">
                    -{formatCurrencyBRL(tradeInVal)}
                  </span>
                </div>
              )}
            </div>

            {/* Detalhamento de Pagamentos e Troco */}
            <div className="space-y-1.5 bg-slate-900 text-white p-3.5 rounded-xl">
              <div className="font-bold text-slate-400 uppercase text-[10px]">
                Detalhamento dos Métodos de Pagamento & Troco
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Dinheiro Entregue:
                  </span>
                  <strong className="text-white">
                    {formatCurrencyBRL(cashReceived)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Troco (Espécie / PIX):
                  </span>
                  <strong className="text-amber-300">
                    Espécie: {formatCurrencyBRL(changeCash)} • PIX:{' '}
                    {formatCurrencyBRL(changePix)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Líquido em Dinheiro:
                  </span>
                  <strong className="text-emerald-400">
                    {formatCurrencyBRL(cashNet)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Pago via PIX:
                  </span>
                  <strong className="text-emerald-400">
                    {formatCurrencyBRL(pixAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Cartão de Crédito:
                  </span>
                  <strong className="text-cyan-300">
                    {formatCurrencyBRL(creditCardAmount)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Cartão de Débito:
                  </span>
                  <strong className="text-indigo-300">
                    {formatCurrencyBRL(debitCardAmount)}
                  </strong>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm font-black">
                <span className="text-amber-300">Valor Pendente:</span>
                <span className="text-amber-300">
                  {formatCurrencyBRL(pendingAmount)}
                </span>
              </div>
            </div>

            {/* Seleção do Cliente para Envio via WhatsApp */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <label className="block font-bold text-emerald-950">
                Cliente para Registro / Envio do Resumo no WhatsApp:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={whatsappTargetCustomerId}
                  onChange={(e) => {
                    setWhatsappTargetCustomerId(e.target.value);
                    const found = customers.find(
                      (c) => c.id === e.target.value
                    );
                    if (found) setWhatsappCustomPhone(found.phone_whatsapp);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-semibold text-slate-900"
                >
                  <option value="">Cliente Balcão (Digitar WhatsApp ao lado)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone_whatsapp})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="WhatsApp (Ex: 5511999999999)"
                  value={whatsappCustomPhone}
                  onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono"
                />
              </div>
            </div>

            {/* OS 3 BOTÕES SOLICITADOS: 1. Revisar | 2. Finalizar | 3. Enviar para o Cliente */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingSale}
                onClick={() => setShowSummaryModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Revisar</span>
              </button>

              <button
                type="button"
                disabled={isSubmittingSale}
                onClick={() => executeFinalizeSale(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finalizar (Só Registrar)</span>
              </button>

              <button
                type="button"
                disabled={isSubmittingSale}
                onClick={() => executeFinalizeSale(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar p/ Cliente (WhatsApp)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Receber / Quitar Saldo Pendente de uma Venda */}
      {settlingSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3.5 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Receber Saldo Pendente — {settlingSale.code}
            </h3>
            <p className="text-slate-500">
              Cliente: <strong>{settlingSale.customer_name}</strong>
            </p>
            <form onSubmit={handleConfirmSettlePending} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Valor Recebido Agora (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmountStr}
                  onChange={(e) => setSettleAmountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 font-bold text-emerald-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Método Utilizado na Quitação
                </label>
                <select
                  value={settleMethod}
                  onChange={(e) => setSettleMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingSale(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Confirmar Recebimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido de Novo Cliente */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">Novo Cliente</h3>
            <form onSubmit={handleQuickCreateCustomer} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="Nome Completo *"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                maxLength={14}
                placeholder="CPF (Opcional • 000.000.000-00)"
                value={newCustCpf}
                onChange={(e) => setNewCustCpf(formatCPF(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
              />
              <input
                type="text"
                required
                placeholder="WhatsApp (Ex: 5511999999999)"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
