'use client';

import React, { useMemo, useState } from 'react';
import {
  Calculator,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  Layers,
  Search,
  Lock,
  Tag,
  Smartphone,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { calculateCrediario } from '@/lib/calculators/crediario';
import {
  buildWhatsAppWebUrl,
  formatCPF,
  formatCurrencyBRL,
  formatDateBR,
  isValidCPF,
} from '@/lib/calculators/spintax-whatsapp';

export default function CrediarioPage() {
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
    updateCustomer,
    createSaleWithTradeIn,
  } = useStore();

  // 1. Combo que decide de onde vem o produto (Planilha ou Loja)
  const [selectedOriginId, setSelectedOriginId] = useState<string>(
    visibleInvestments[0]?.id || 'loja'
  );

  // 2. Autocomplete de Cliente (Nome, Telefone ou CPF)
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ''
  );

  // 3. Filtro de Produto por Nome, IMEI, Cor ou Capacidade
  const [productSearch, setProductSearch] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantitySoldStr, setQuantitySoldStr] = useState<string>('1');

  // 4. Desconto + Nota Obrigatória do motivo do desconto + Entrada
  const [discountStr, setDiscountStr] = useState<string>('0');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [cashDownStr, setCashDownStr] = useState<string>('1000');

  // 5. Aparelho Recebido na Troca (Trade-In)
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(true);
  const [tradeInBrand, setTradeInBrand] = useState<string>('Apple');
  const [tradeInModel, setTradeInModel] = useState<string>('');
  const [tradeInStorage, setTradeInStorage] = useState<string>('128GB');
  const [tradeInColor, setTradeInColor] = useState<string>('Preto');
  const [tradeInImei, setTradeInImei] = useState<string>('');
  const [tradeInBattery, setTradeInBattery] = useState<string>('88');
  const [tradeInValueStr, setTradeInValueStr] = useState<string>('0');
  const [tradeInResaleStr, setTradeInResaleStr] = useState<string>('0');
  const [tradeInNeedsRepair, setTradeInNeedsRepair] = useState<boolean>(false);

  // 6. Calculadora de Crediário (Sobre o produto vendido)
  const [installmentsCount, setInstallmentsCount] = useState<number>(6);
  const [monthlyRateStr, setMonthlyRateStr] = useState<string>(
    String(settings.default_monthly_rate_percent || 6)
  );
  const [manualInstallmentStr, setManualInstallmentStr] = useState<string>('');
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Modal Novo Cliente
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('55119');
  const [inlineCpfInput, setInlineCpfInput] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [isSubmittingCrediario, setIsSubmittingCrediario] = useState(false);
  const [whatsappTargetCustomerId, setWhatsappTargetCustomerId] =
    useState<string>('');
  const [whatsappCustomPhone, setWhatsappCustomPhone] = useState<string>('');

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

  const effectiveCustomerId =
    selectedCustomerId && customers.some((c) => c.id === selectedCustomerId)
      ? selectedCustomerId
      : filteredCustomers[0]?.id || '';

  const selectedCustomer = customers.find((c) => c.id === effectiveCustomerId);

  // Produtos Elegíveis ao Crediário (category === 'device') filtrados por Origem e Busca (Nome, IMEI, Cor)
  const availableCrediarioItems = inventory.filter((item) => {
    if (item.status !== 'in_stock' || item.quantity <= 0) return false;
    if (item.category !== 'device') return false;
    if (!canAccessInvestment(item.investment_id)) return false;
    if (
      selectedOriginId !== 'all' &&
      item.investment_id !== selectedOriginId
    ) {
      return false;
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase().trim();
      const text =
        `${item.brand} ${item.model} ${item.color || ''} ${item.storage || ''} ${item.imei || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const activeItemId =
    selectedItemId &&
    availableCrediarioItems.some((i) => i.id === selectedItemId)
      ? selectedItemId
      : availableCrediarioItems[0]?.id || '';

  const selectedItem = availableCrediarioItems.find(
    (i) => i.id === activeItemId
  );

  const maxAvailableQty = selectedItem?.quantity || 1;
  const effectiveQtySold = Math.max(
    1,
    Math.min(maxAvailableQty, Number(quantitySoldStr) || 1)
  );

  // Valor da venda segue obrigatoriamente o registrado no estoque
  const lockedStockPrice = selectedItem
    ? Number(selectedItem.suggested_price || 0) * effectiveQtySold
    : 0;
  const discountVal = Math.max(0, Number(discountStr) || 0);
  const cashDownVal = Math.max(0, Number(cashDownStr) || 0);
  const tradeInVal = hasTradeIn ? Math.max(0, Number(tradeInValueStr) || 0) : 0;

  const proposal = useMemo(() => {
    const manualVal =
      manualInstallmentStr.trim() !== ''
        ? Number(manualInstallmentStr)
        : undefined;
    return calculateCrediario({
      salePrice: lockedStockPrice,
      discount: discountVal,
      cashDownPayment: cashDownVal,
      tradeInValue: tradeInVal,
      monthlyRatePercent: Number(monthlyRateStr) || 0,
      installmentsCount,
      manualInstallmentValue: manualVal,
    });
  }, [
    lockedStockPrice,
    discountVal,
    cashDownVal,
    tradeInVal,
    monthlyRateStr,
    installmentsCount,
    manualInstallmentStr,
  ]);

  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    if (!isValidCPF(newCustCpf)) {
      alert(
        'Para usar o cliente no Crediário é obrigatório informar um CPF válido de 11 dígitos.'
      );
      return;
    }
    const created = addCustomer({
      name: newCustName.trim(),
      cpf: formatCPF(newCustCpf),
      phone_whatsapp: newCustPhone.trim(),
      whatsapp_opt_in: true,
      credit_score: 'bom',
      address: 'Cadastrado no Crediário',
    });
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustCpf('');
    setShowNewCustomerModal(false);
  };

  const handleSaveInlineCustomerCpf = () => {
    if (!selectedCustomer) return;
    if (!isValidCPF(inlineCpfInput)) {
      alert('CPF inválido! Verifique os 11 dígitos.');
      return;
    }
    updateCustomer(selectedCustomer.id, { cpf: formatCPF(inlineCpfInput) });
    setInlineCpfInput('');
  };

  const handleOpenCrediarioSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      alert('Selecione um aparelho elegível ao crediário.');
      return;
    }
    if (!effectiveCustomerId || !selectedCustomer) {
      alert(
        'Selecione um cliente cadastrado (ou clique em + Novo Cliente) para gerar o contrato de Crediário.'
      );
      return;
    }
    if (!isValidCPF(selectedCustomer.cpf)) {
      alert(
        'O cliente selecionado ainda não possui um CPF válido cadastrado. Preencha o CPF do cliente logo abaixo do seletor antes de fechar o Crediário.'
      );
      return;
    }
    if (discountVal > 0 && !discountReason.trim()) {
      alert(
        'Informe obrigatoriamente a nota/motivo do desconto concedido antes de fechar o Crediário.'
      );
      return;
    }
    setWhatsappTargetCustomerId(effectiveCustomerId);
    setWhatsappCustomPhone(selectedCustomer.phone_whatsapp || '');
    setShowSummaryModal(true);
  };

  const executeFinalizeCrediario = (sendWhatsApp: boolean) => {
    if (isSubmittingCrediario || !selectedItem || !selectedCustomer) return;
    setIsSubmittingCrediario(true);

    try {
      const createdSale = createSaleWithTradeIn({
        customerId: effectiveCustomerId,
        soldItemId: selectedItem.id,
        quantitySold: effectiveQtySold,
        salePrice: lockedStockPrice,
        discount: discountVal,
        cashDownPayment: cashDownVal,
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
        paymentType: 'crediario',
        monthlyRatePercent: Number(monthlyRateStr) || 0,
        installmentsCount,
        suggestedInstallmentValue: proposal.suggestedInstallmentValue,
        finalInstallmentValue: proposal.finalInstallmentValue,
        firstDueDate,
        notes:
          discountVal > 0
            ? `Motivo Desconto (R$ ${discountVal.toFixed(2)}): ${discountReason.trim()}`
            : undefined,
      });

      if (sendWhatsApp) {
        const chosenCust =
          customers.find((c) => c.id === whatsappTargetCustomerId) ||
          selectedCustomer;
        const phoneToSend =
          whatsappCustomPhone.trim() || chosenCust.phone_whatsapp || '';
        if (phoneToSend) {
          const msg = [
            `*RESUMO DO CONTRATO DE CREDIÁRIO ${createdSale.code} — ${settings.store_name}*`,
            `Cliente: ${chosenCust.name} (CPF: ${formatCPF(chosenCust.cpf)})`,
            `Aparelho: ${createdSale.sold_item_name}`,
            `Valor Tabelado: ${formatCurrencyBRL(lockedStockPrice)}`,
            discountVal > 0
              ? `Desconto: -${formatCurrencyBRL(discountVal)} (${discountReason.trim()})`
              : '',
            `Entrada Paga: ${formatCurrencyBRL(cashDownVal)}`,
            hasTradeIn && tradeInVal > 0
              ? `Aparelho na Troca (${tradeInBrand} ${tradeInModel}): -${formatCurrencyBRL(tradeInVal)}`
              : '',
            `*Parcelamento: ${installmentsCount}x de ${formatCurrencyBRL(proposal.finalInstallmentValue)}*`,
            `1º Vencimento: ${formatDateBR(firstDueDate)}`,
            `Total Final do Contrato: *${formatCurrencyBRL(proposal.totalSaleFinal)}*`,
          ]
            .filter(Boolean)
            .join('\n');
          window.open(
            buildWhatsAppWebUrl(phoneToSend, msg),
            '_blank',
            'noopener,noreferrer'
          );
        }
      }

      // Limpa todos os dados da tela após finalizar
      setSelectedItemId('');
      setProductSearch('');
      setQuantitySoldStr('1');
      setDiscountStr('0');
      setDiscountReason('');
      setCashDownStr('0');
      setHasTradeIn(false);
      setTradeInModel('');
      setTradeInImei('');
      setTradeInValueStr('0');
      setTradeInResaleStr('0');
      setTradeInNeedsRepair(false);
      setManualInstallmentStr('');
      setShowSummaryModal(false);
      setIsSubmittingCrediario(false);

      setSaleSuccessMessage(
        `Crediário ${createdSale.code} aprovado (${installmentsCount}x de ${formatCurrencyBRL(proposal.finalInstallmentValue)}) para ${createdSale.customer_name}! Formulário limpo.`
      );
      setTimeout(() => setSaleSuccessMessage(null), 6000);
    } catch (err) {
      setIsSubmittingCrediario(false);
      alert(err instanceof Error ? err.message : 'Erro ao fechar crediário');
    }
  };

  const crediarioSales = sales.filter(
    (s) =>
      s.payment_type === 'crediario' && canAccessInvestment(s.investment_id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Central de Crediário & Simulador de Parcelas por Produto
          </h1>
          <p className="text-xs text-slate-500">
            Aba exclusiva para vendas no Crediário: escolha a origem (Planilha ou Loja), filtre o cliente e o aparelho por IMEI/Cor e calcule o financiamento.
          </p>
        </div>
      </div>

      {saleSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleOpenCrediarioSummary}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Coluna Esquerda: Origem, Cliente, Aparelho Detalhado e Trade-In */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5 text-xs">
            {/* 1. Combo De Onde Vem o Produto (Planilha ou Loja) */}
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
              <label className="block font-bold text-indigo-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  1. De onde vem o aparelho deste Crediário? (Planilha ou Loja)
                </span>
              </label>
              <select
                value={selectedOriginId}
                onChange={(e) => {
                  setSelectedOriginId(e.target.value);
                  setSelectedItemId('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-bold text-slate-900"
              >
                <option value="all">
                  Todas as Origens Liberadas (Planilhas + Loja)
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

            {/* 2. Autocomplete de Cliente (Nome, Telefone ou CPF) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800">
                  2. Cliente do Crediário (Buscar por Nome, Telefone ou CPF) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(true)}
                  className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Novo Cliente</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar por Nome, Telefone ou CPF..."
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
                  value={effectiveCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                >
                  <option value="">Selecione um cliente cadastrado...</option>
                  {filteredCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • Tel: {c.phone_whatsapp}{' '}
                      {c.cpf ? `• CPF: ${c.cpf}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCustomer && isValidCPF(selectedCustomer.cpf) && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Cliente: <strong>{selectedCustomer.name}</strong>
                  </span>
                  <span>
                    WhatsApp: <strong>{selectedCustomer.phone_whatsapp}</strong>{' '}
                    • CPF Válido: <strong>{formatCPF(selectedCustomer.cpf)}</strong>
                  </span>
                </div>
              )}

              {selectedCustomer && !isValidCPF(selectedCustomer.cpf) && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 space-y-2 text-[11px] text-rose-900">
                  <div className="font-bold">
                    ⚠️ O cliente <strong>{selectedCustomer.name}</strong> ainda não possui um CPF válido cadastrado (obrigatório para usar no Crediário).
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      maxLength={14}
                      placeholder="Digite o CPF (000.000.000-00)"
                      value={inlineCpfInput}
                      onChange={(e) =>
                        setInlineCpfInput(formatCPF(e.target.value))
                      }
                      className="px-3 py-1.5 rounded-lg border border-rose-400 bg-white font-mono font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleSaveInlineCustomerCpf}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    >
                      Salvar CPF Válido no Cliente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Busca Detalhada do Aparelho por Nome, IMEI ou Cor */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block font-bold text-slate-800">
                3. Aparelho Financiado (Buscar por Modelo, IMEI, Cor ou Capacidade) *
              </label>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Digite o Modelo, IMEI do aparelho, Cor ou Capacidade..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedItemId('');
                  }}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white"
                />
              </div>

              <select
                value={activeItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  setQuantitySoldStr('1');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
              >
                {availableCrediarioItems.length === 0 ? (
                  <option value="">
                    Nenhum aparelho elegível ao crediário neste filtro...
                  </option>
                ) : (
                  availableCrediarioItems.map((item) => {
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
                        {item.storage || ''} • {item.color || ''}{' '}
                        {item.imei ? `• IMEI: ${item.imei}` : ''} —{' '}
                        {formatCurrencyBRL(item.suggested_price)} (Qtd:{' '}
                        {item.quantity})
                      </option>
                    );
                  })
                )}
              </select>

              {/* Card Detalhado do Aparelho Selecionado */}
              {selectedItem && (
                <div className="p-3 rounded-xl bg-slate-900 text-white space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>
                        {selectedItem.brand} {selectedItem.model} (
                        {selectedItem.storage} • {selectedItem.color})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                      Tabelado Estoque:{' '}
                      {formatCurrencyBRL(selectedItem.suggested_price)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">
                      IMEI: {selectedItem.imei || 'Não informado'}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">
                      Bateria: {selectedItem.battery_health || 100}%
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">
                      Geração: G{selectedItem.generation}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">
                      Saldo: {selectedItem.quantity} un.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Preço Tabelado Bloqueado + Desconto Justificado + Entrada */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Qtd Vendida
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxAvailableQty}
                  value={quantitySoldStr}
                  onChange={(e) => setQuantitySoldStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Valor Estoque (R$)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrencyBRL(lockedStockPrice)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-bold text-slate-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-800 mb-1">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/30 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-700 mb-1">
                  Entrada PIX/Dinheiro (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={cashDownStr}
                  onChange={(e) => setCashDownStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50/30 font-bold text-emerald-950"
                />
              </div>
            </div>

            {discountVal > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
                <label className="block font-bold text-amber-900 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    Nota Obrigatória / Por que foi dado desconto de{' '}
                    {formatCurrencyBRL(discountVal)}? *
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cliente antigo / Negociação gerência"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-white font-semibold"
                />
              </div>
            )}
          </div>

          {/* 5. Aparelho Recebido na Troca (Trade-In) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                <span>4. Aparelho Recebido na Entrada (Trade-In)</span>
              </div>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-bold text-indigo-700">
                <input
                  type="checkbox"
                  checked={hasTradeIn}
                  onChange={(e) => setHasTradeIn(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                <span>Incluir aparelho na entrada</span>
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
                    Modelo (Ex: iPhone 14)
                  </label>
                  <input
                    type="text"
                    placeholder="iPhone 14"
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
                    Bateria (%)
                  </label>
                  <input
                    type="number"
                    value={tradeInBattery}
                    onChange={(e) => setTradeInBattery(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
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
                <div>
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
                <div className="col-span-2">
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
                <div className="col-span-2 sm:col-span-4">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-amber-800 font-semibold">
                    <input
                      type="checkbox"
                      checked={tradeInNeedsRepair}
                      onChange={(e) => setTradeInNeedsRepair(e.target.checked)}
                    />
                    <span>
                      🔧 Abrir OS interna de revisão para este aparelho de troca
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita: Calculadora do Crediário */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>5. Cálculo do Crediário</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                {selectedItem?.investment_id === 'loja'
                  ? 'Estoque da Loja'
                  : investments
                      .find((i) => i.id === selectedItem?.investment_id)
                      ?.name.split('—')[0] || 'Planilha'}
              </span>
            </div>

            <div className="bg-slate-950 rounded-lg p-3 space-y-1.5 border border-slate-800">
              <div className="flex justify-between text-slate-400">
                <span>Preço Líquido ({effectiveQtySold} un.):</span>
                <span className="font-bold text-white">
                  {formatCurrencyBRL(proposal.netSalePrice)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>(-) Entrada R$:</span>
                <span className="text-emerald-400">
                  -{formatCurrencyBRL(cashDownVal)}
                </span>
              </div>
              {hasTradeIn && tradeInVal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>(-) Aparelho na Troca:</span>
                  <span className="text-indigo-400">
                    -{formatCurrencyBRL(tradeInVal)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-800 text-amber-300 font-bold text-sm">
                <span>Saldo a Parcelar:</span>
                <span>{formatCurrencyBRL(proposal.financedPrincipal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Parcelas
                </label>
                <select
                  value={installmentsCount}
                  onChange={(e) => {
                    setInstallmentsCount(Number(e.target.value));
                    setManualInstallmentStr('');
                  }}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n}x
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Taxa % a.m.
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={monthlyRateStr}
                  onChange={(e) => {
                    setMonthlyRateStr(e.target.value);
                    setManualInstallmentStr('');
                  }}
                  className="w-full px-2.5 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  1º Venc.
                </label>
                <input
                  type="date"
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="w-full px-2 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-[11px]"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-700/50 space-y-2">
              <div className="flex justify-between items-center text-[11px] text-emerald-300">
                <span>Sugestão Automática:</span>
                <span className="font-bold">
                  {installmentsCount}x de{' '}
                  {formatCurrencyBRL(proposal.suggestedInstallmentValue)}
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-300 mb-1">
                  ✏️ Parcela Fixa Final (Alterável pelo Operador):
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder={String(proposal.suggestedInstallmentValue)}
                  value={manualInstallmentStr}
                  onChange={(e) => setManualInstallmentStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/60 text-amber-300 font-bold text-sm"
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-slate-400">Total Geral do Contrato:</span>
              <span className="text-sm font-black text-emerald-400">
                {formatCurrencyBRL(proposal.totalSaleFinal)}
              </span>
            </div>

            <button
              type="submit"
              disabled={!selectedItem}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Gerar Resumo do Crediário ({installmentsCount}x de{' '}
              {formatCurrencyBRL(proposal.finalInstallmentValue)}) →
            </button>
          </div>
        </div>
      </form>

      {/* Pop-up de Resumo do Crediário com 3 Botões */}
      {showSummaryModal && selectedItem && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Resumo do Contrato de Crediário
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cliente: <strong>{selectedCustomer.name}</strong> (CPF:{' '}
                  {formatCPF(selectedCustomer.cpf)})
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[11px]">
                {installmentsCount}x de{' '}
                {formatCurrencyBRL(proposal.finalInstallmentValue)}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Aparelho:</span>
                <strong className="text-slate-900">
                  {effectiveQtySold}x {selectedItem.brand} {selectedItem.model}{' '}
                  ({selectedItem.storage} • {selectedItem.color})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Tabelado:</span>
                <strong>{formatCurrencyBRL(lockedStockPrice)}</strong>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Desconto ({discountReason}):</span>
                  <strong>-{formatCurrencyBRL(discountVal)}</strong>
                </div>
              )}
              <div className="flex justify-between text-emerald-700">
                <span>Entrada em Dinheiro/PIX:</span>
                <strong>-{formatCurrencyBRL(cashDownVal)}</strong>
              </div>
              {hasTradeIn && tradeInVal > 0 && (
                <div className="flex justify-between text-indigo-700">
                  <span>
                    Aparelho na Troca ({tradeInBrand} {tradeInModel}):
                  </span>
                  <strong>-{formatCurrencyBRL(tradeInVal)}</strong>
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-black text-slate-900 text-sm">
                <span>Total Final do Contrato:</span>
                <span>{formatCurrencyBRL(proposal.totalSaleFinal)}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
              <label className="block font-bold text-emerald-950">
                Cliente / WhatsApp para Envio do Resumo:
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
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone_whatsapp})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={whatsappCustomPhone}
                  onChange={(e) => setWhatsappCustomPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingCrediario}
                onClick={() => setShowSummaryModal(false)}
                className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Revisar</span>
              </button>
              <button
                type="button"
                disabled={isSubmittingCrediario}
                onClick={() => executeFinalizeCrediario(false)}
                className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finalizar (Só Registrar)</span>
              </button>
              <button
                type="button"
                disabled={isSubmittingCrediario}
                onClick={() => executeFinalizeCrediario(true)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar p/ Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Contratos de Crediário Registrados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800">
          Contratos de Crediário Registrados ({crediarioSales.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                <th className="py-2 px-3">Contrato</th>
                <th className="py-2 px-3">Origem</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Aparelho Financiado</th>
                <th className="py-2 px-3 text-right">Entrada</th>
                <th className="py-2 px-3">Troca</th>
                <th className="py-2 px-3 text-right">Parcelamento</th>
                <th className="py-2 px-3 text-right">Total Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {crediarioSales.map((s) => {
                const inv = investments.find((i) => i.id === s.investment_id);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {s.code}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {s.investment_id === 'loja'
                        ? 'Loja'
                        : inv?.name.split('—')[0] || 'Planilha'}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {s.customer_name}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">
                        {s.sold_item_name}
                      </div>
                      {s.notes && (
                        <div className="text-[10px] text-amber-700">
                          {s.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                      {formatCurrencyBRL(s.cash_down_payment)}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {s.trade_in_model
                        ? `${s.trade_in_model} (${formatCurrencyBRL(s.trade_in_value)})`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
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
      </div>

      {/* Modal Rápido Novo Cliente */}
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
              <div>
                <input
                  type="text"
                  required
                  maxLength={14}
                  placeholder="CPF Obrigatório p/ Crediário (000.000.000-00) *"
                  value={newCustCpf}
                  onChange={(e) => setNewCustCpf(formatCPF(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
                {newCustCpf.trim() && (
                  <span
                    className={`text-[10px] font-bold block mt-0.5 ${
                      isValidCPF(newCustCpf)
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {isValidCPF(newCustCpf)
                      ? '✓ CPF válido para Crediário'
                      : '✗ CPF inválido'}
                  </span>
                )}
              </div>
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
