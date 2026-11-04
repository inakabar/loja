'use client';

import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Calculator,
  CheckCircle2,
  QrCode,
  RefreshCw,
  Edit3,
  Plus,
  Wrench,
  Banknote,
  Layers,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { calculateCrediario } from '@/lib/calculators/crediario';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';
import { Sale } from '@/types/domain';

export default function VendasPage() {
  const {
    customers,
    inventory,
    investments,
    visibleInvestments,
    sales,
    settings,
    hasRole,
    canAccessInvestment,
    createSaleWithTradeIn,
    addCustomer,
  } = useStore();

  // 1. Flag principal: Venda no Crediário (true) vs Compra à Vista já paga (false)
  const [isCrediario, setIsCrediario] = useState<boolean>(false);

  // 2. Combo que decide de onde vem o produto (Planilha específica, Loja ou Todas)
  const [productOriginFilter, setProductOriginFilter] = useState<string>('all');

  // Filtra os produtos do estoque conforme:
  // - Perfis do vendedor
  // - Combo de origem (Planilha ou Loja)
  // - Se for Crediário, exibe apenas produtos habilitados para Crediário (category === 'device')
  const availableItems = useMemo(() => {
    return inventory.filter((i) => {
      if (i.status !== 'in_stock' || i.quantity <= 0) return false;
      if (i.investment_id === 'loja') {
        if (!hasRole('venda_loja')) return false;
      } else {
        if (
          !hasRole('venda_investimento') ||
          !canAccessInvestment(i.investment_id)
        ) {
          return false;
        }
      }

      if (
        productOriginFilter !== 'all' &&
        i.investment_id !== productOriginFilter
      ) {
        return false;
      }

      // Produtos comuns (capinhas/acessórios) não podem ser usados no Crediário
      if (isCrediario && i.category !== 'device') {
        return false;
      }

      return true;
    });
  }, [
    inventory,
    hasRole,
    canAccessInvestment,
    productOriginFilter,
    isCrediario,
  ]);

  const [customerId, setCustomerId] = useState<string>(customers[0]?.id || '');
  const [soldItemId, setSoldItemId] = useState<string>(
    availableItems[0]?.id || ''
  );

  const selectedProduct = useMemo(
    () =>
      availableItems.find((i) => i.id === soldItemId) || availableItems[0],
    [availableItems, soldItemId]
  );

  const [customSalePrice, setCustomSalePrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [cashDownPayment, setCashDownPayment] = useState<string>('0');

  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [tradeInBrand, setTradeInBrand] = useState<string>('Apple');
  const [tradeInModel, setTradeInModel] = useState<string>('iPhone 15');
  const [tradeInStorage, setTradeInStorage] = useState<string>('128GB');
  const [tradeInColor, setTradeInColor] = useState<string>('Preto');
  const [tradeInImei, setTradeInImei] = useState<string>('');
  const [tradeInBattery, setTradeInBattery] = useState<string>('90');
  const [tradeInValue, setTradeInValue] = useState<string>('2000');
  const [tradeInSuggestedResalePrice, setTradeInSuggestedResalePrice] =
    useState<string>('3200');
  const [tradeInNeedsRepair, setTradeInNeedsRepair] = useState<boolean>(false);
  const [tradeInRepairDefect, setTradeInRepairDefect] = useState<string>(
    'Troca de bateria preventiva'
  );
  const [tradeInRepairPartsCost, setTradeInRepairPartsCost] =
    useState<string>('180');

  const [installmentsCount, setInstallmentsCount] = useState<number>(6);
  const [monthlyRatePercent, setMonthlyRatePercent] = useState<string>(
    String(settings.default_monthly_rate_percent)
  );
  const [manualInstallmentStr, setManualInstallmentStr] = useState<string>('');
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('55119');
  const [newCustCpf, setNewCustCpf] = useState('');

  const effectiveSalePrice =
    customSalePrice !== ''
      ? Number(customSalePrice)
      : selectedProduct?.suggested_price || 0;

  const netSalePrice = Math.max(
    0,
    effectiveSalePrice - (Number(discount) || 0)
  );
  const effectiveTradeIn = hasTradeIn ? Number(tradeInValue) || 0 : 0;
  const cashPaidAvista = Math.max(0, netSalePrice - effectiveTradeIn);

  const calculation = useMemo(
    () =>
      calculateCrediario({
        salePrice: effectiveSalePrice,
        discount: Number(discount) || 0,
        cashDownPayment: isCrediario
          ? Number(cashDownPayment) || 0
          : cashPaidAvista,
        tradeInValue: effectiveTradeIn,
        monthlyRatePercent: Number(monthlyRatePercent) || 0,
        installmentsCount,
        manualInstallmentValue:
          manualInstallmentStr !== '' ? Number(manualInstallmentStr) : null,
      }),
    [
      effectiveSalePrice,
      discount,
      isCrediario,
      cashDownPayment,
      cashPaidAvista,
      effectiveTradeIn,
      monthlyRatePercent,
      installmentsCount,
      manualInstallmentStr,
    ]
  );

  const productInvestment = investments.find(
    (inv) => inv.id === selectedProduct?.investment_id
  );

  const handleCreateQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      cpf: newCustCpf.trim() || '000.000.000-00',
      phone_whatsapp: newCustPhone.replace(/\D/g, ''),
      address: '',
      whatsapp_opt_in: true,
      credit_score: 'bom',
    });
    setCustomerId(created.id);
    setNewCustName('');
    setShowNewCustomer(false);
  };

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (isCrediario && !customerId) return;

    const created = createSaleWithTradeIn({
      customerId: customerId || '',
      soldItemId: selectedProduct.id,
      salePrice: effectiveSalePrice,
      discount: Number(discount) || 0,
      cashDownPayment: isCrediario
        ? Number(cashDownPayment) || 0
        : cashPaidAvista,
      hasTradeIn,
      tradeInBrand,
      tradeInModel,
      tradeInStorage,
      tradeInColor,
      tradeInImei,
      tradeInBattery: Number(tradeInBattery) || 88,
      tradeInValue: effectiveTradeIn,
      tradeInSuggestedResalePrice: Number(tradeInSuggestedResalePrice) || 0,
      tradeInNeedsRepair,
      tradeInRepairDefect,
      tradeInRepairPartsCost: Number(tradeInRepairPartsCost) || 0,
      paymentType: isCrediario ? 'crediario' : 'avista',
      monthlyRatePercent: isCrediario ? Number(monthlyRatePercent) || 0 : 0,
      installmentsCount: isCrediario ? installmentsCount : 0,
      suggestedInstallmentValue: isCrediario
        ? calculation.suggestedInstallmentValue
        : 0,
      finalInstallmentValue: isCrediario
        ? calculation.finalInstallmentValue
        : 0,
      firstDueDate,
    });

    setCompletedSale(created);
    setManualInstallmentStr('');
  };

  const visibleSales = sales.filter((s) =>
    canAccessInvestment(s.investment_id)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            PDV • Venda à Vista & Crediário com Troca
          </h1>
          <p className="text-xs text-slate-500">
            Ative a flag de Crediário para abrir a calculadora de parcelas ou mantenha desmarcada para Venda à Vista (Já Paga).
          </p>
        </div>

        {/* Flag Principal: Compra à Vista vs Crediário */}
        <label className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white shadow-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isCrediario}
            onChange={(e) => setIsCrediario(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-xs font-bold text-slate-900">
            Venda no Crediário (Habilitar Calculadora)
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              isCrediario
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            {isCrediario ? 'Crediário Parcelado' : 'À Vista (Já Paga)'}
          </span>
        </label>
      </div>

      <form
        onSubmit={handleSubmitSale}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs"
      >
        {/* Coluna Esquerda (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                1. Origem, Produto & Cliente
              </span>
              <button
                type="button"
                onClick={() => setShowNewCustomer(true)}
                className="text-emerald-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Cliente
              </button>
            </div>

            {/* Combo: De onde vem o produto (Planilha ou Loja) */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  De onde vem o produto? (Escolher Planilha ou Estoque da Loja)
                </span>
              </label>
              <select
                value={productOriginFilter}
                onChange={(e) => {
                  setProductOriginFilter(e.target.value);
                  setSoldItemId('');
                  setCustomSalePrice('');
                }}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
              >
                <option value="all">
                  Todas as Origens Liberadas (Loja + Planilhas)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cliente {isCrediario ? '*' : '(Opcional no À Vista)'}
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required={isCrediario}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  {!isCrediario && (
                    <option value="">Cliente Balcão (Venda à Vista)</option>
                  )}
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone_whatsapp})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Produto ({availableItems.length} disponíveis)
                </label>
                <select
                  value={selectedProduct?.id || ''}
                  onChange={(e) => {
                    setSoldItemId(e.target.value);
                    setCustomSalePrice('');
                  }}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  {availableItems.length === 0 ? (
                    <option value="">
                      {isCrediario
                        ? 'Nenhum aparelho de crediário disponível nesta origem'
                        : 'Nenhum produto disponível nesta origem'}
                    </option>
                  ) : (
                    availableItems.map((item) => {
                      const invName =
                        item.investment_id === 'loja'
                          ? 'LOJA'
                          : investments
                              .find((inv) => inv.id === item.investment_id)
                              ?.name.split('—')[0]
                              .trim() || 'PLANILHA';
                      return (
                        <option key={item.id} value={item.id}>
                          [{invName}] {item.brand} {item.model} —{' '}
                          {formatCurrencyBRL(item.suggested_price)} (Qtd:{' '}
                          {item.quantity})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            </div>

            <div
              className={`grid gap-3 ${
                isCrediario ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'
              }`}
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Valor Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={
                    customSalePrice !== ''
                      ? customSalePrice
                      : selectedProduct?.suggested_price || 0
                  }
                  onChange={(e) => setCustomSalePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              {isCrediario && (
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Entrada Dinheiro/PIX (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashDownPayment}
                    onChange={(e) => setCashDownPayment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50/40 font-bold text-emerald-950"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Entrada de Aparelho na Troca */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-4 h-4 text-indigo-600" />
                2. Aparelho Recebido na Troca (Trade-In)
              </span>
              <label className="inline-flex items-center gap-1.5 font-bold text-indigo-700 cursor-pointer">
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
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                      Modelo (Ex: iPhone 15)
                    </label>
                    <input
                      type="text"
                      value={tradeInModel}
                      onChange={(e) => setTradeInModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Capacidade
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-indigo-800 mb-1">
                      Valor Abatido na Troca (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeInValue}
                      onChange={(e) => setTradeInValue(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-400 bg-indigo-50/40 font-bold text-indigo-950"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Preço Futura Revenda (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tradeInSuggestedResalePrice}
                      onChange={(e) =>
                        setTradeInSuggestedResalePrice(e.target.value)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold text-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      IMEI
                    </label>
                    <input
                      type="text"
                      value={tradeInImei}
                      onChange={(e) => setTradeInImei(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-1.5 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tradeInNeedsRepair}
                    onChange={(e) => setTradeInNeedsRepair(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <Wrench className="w-3.5 h-3.5" />
                  <span>
                    Abrir OS interna de revisão para este aparelho de troca
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita (5 cols): Venda à Vista (se flag = false) OU Calculadora do Crediário (se flag = true) */}
        <div className="lg:col-span-5">
          {!isCrediario ? (
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  3. Fechamento à Vista (Já Paga)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {productInvestment?.name.split('—')[0] || 'Estoque da Loja'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Valor do Produto:</span>
                  <span className="text-white font-semibold">
                    {formatCurrencyBRL(effectiveSalePrice)}
                  </span>
                </div>
                {Number(discount) > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>(−) Desconto:</span>
                    <span>-{formatCurrencyBRL(Number(discount) || 0)}</span>
                  </div>
                )}
                {hasTradeIn && (
                  <div className="flex justify-between text-indigo-300">
                    <span>(−) Aparelho na Troca:</span>
                    <span>-{formatCurrencyBRL(effectiveTradeIn)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-emerald-400 text-sm">
                  <span>Valor Pago à Vista (PIX / Dinheiro):</span>
                  <span>{formatCurrencyBRL(cashPaidAvista)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-[11px] text-emerald-200">
                ✓ Esta venda será registrada como <strong>100% Paga à Vista</strong> e o valor de{' '}
                <strong>{formatCurrencyBRL(cashPaidAvista)}</strong> entrará imediatamente no caixa líquido de{' '}
                <strong>
                  {productInvestment?.name.split('—')[0] || 'Estoque da Loja'}
                </strong>
                .
              </div>

              <button
                type="submit"
                disabled={!selectedProduct}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black cursor-pointer"
              >
                Finalizar Venda à Vista ({formatCurrencyBRL(cashPaidAvista)})
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3.5 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  3. Calculadora do Crediário
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                  {productInvestment?.name.split('—')[0] || 'Estoque da Loja'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Preço Líquido:</span>
                  <span className="text-white font-semibold">
                    {formatCurrencyBRL(calculation.netSalePrice)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>(−) Entrada R$:</span>
                  <span>-{formatCurrencyBRL(Number(cashDownPayment) || 0)}</span>
                </div>
                {hasTradeIn && (
                  <div className="flex justify-between text-indigo-300">
                    <span>(−) Aparelho na Troca:</span>
                    <span>-{formatCurrencyBRL(effectiveTradeIn)}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-slate-800 flex justify-between font-bold text-amber-300 text-sm">
                  <span>Saldo a Parcelar:</span>
                  <span>{formatCurrencyBRL(calculation.financedPrincipal)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1">Parcelas</label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => {
                      setInstallmentsCount(Number(e.target.value));
                      setManualInstallmentStr('');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18].map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Taxa % a.m.</label>
                  <input
                    type="number"
                    step="0.1"
                    value={monthlyRatePercent}
                    onChange={(e) => {
                      setMonthlyRatePercent(e.target.value);
                      setManualInstallmentStr('');
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">1º Venc.</label>
                  <input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 space-y-2">
                <div className="flex justify-between text-emerald-300">
                  <span>Sugestão Automática:</span>
                  <strong>
                    {installmentsCount}x de{' '}
                    {formatCurrencyBRL(calculation.suggestedInstallmentValue)}
                  </strong>
                </div>
                <div>
                  <label className="block font-bold text-white mb-1 flex items-center gap-1">
                    <Edit3 className="w-3 h-3 text-amber-400" />
                    <span>Parcela Fixa Final (Alterável pelo Vendedor):</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={String(calculation.suggestedInstallmentValue)}
                    value={manualInstallmentStr}
                    onChange={(e) => setManualInstallmentStr(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-amber-400/60 text-amber-300 font-black text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between font-bold text-sm pt-1">
                <span>Total Geral da Venda:</span>
                <span className="text-emerald-400">
                  {formatCurrencyBRL(calculation.totalSaleFinal)}
                </span>
              </div>

              <button
                type="submit"
                disabled={!selectedProduct || !customerId}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black cursor-pointer"
              >
                Fechar Venda no Crediário ({installmentsCount}x de{' '}
                {formatCurrencyBRL(calculation.finalInstallmentValue)})
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Tabela Compacta de Vendas Recentes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-800">
          Vendas Registradas ({visibleSales.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] text-slate-500">
                <th className="py-2 px-3">Venda</th>
                <th className="py-2 px-3">Modalidade</th>
                <th className="py-2 px-3">Origem</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Produto</th>
                <th className="py-2 px-3 text-right">Pago à Vista / Entrada</th>
                <th className="py-2 px-3">Aparelho na Troca</th>
                <th className="py-2 px-3 text-right">Parcelas</th>
                <th className="py-2 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSales.map((s) => {
                const invName =
                  s.investment_id === 'loja'
                    ? 'Loja'
                    : investments
                        .find((inv) => inv.id === s.investment_id)
                        ?.name.split('—')[0] || 'Planilha';
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {s.code}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.payment_type === 'avista'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.payment_type === 'avista'
                          ? 'À Vista (Pago)'
                          : 'Crediário'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-medium">
                      {invName}
                    </td>
                    <td className="py-2 px-3 text-slate-800">
                      {s.customer_name}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {s.sold_item_name}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-semibold">
                      {formatCurrencyBRL(s.cash_down_payment)}
                    </td>
                    <td className="py-2 px-3">
                      {s.trade_in_value > 0
                        ? `${s.trade_in_model} (${formatCurrencyBRL(s.trade_in_value)})`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {s.payment_type === 'avista' || s.installments_count === 0
                        ? 'À Vista'
                        : `${s.installments_count}x ${formatCurrencyBRL(
                            s.final_installment_value
                          )}`}
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

      {/* Modal Pós-Venda */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Venda {completedSale.code} Concluída!
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p>
                <strong>Cliente:</strong> {completedSale.customer_name}
              </p>
              <p>
                <strong>Produto:</strong> {completedSale.sold_item_name}
              </p>
              {completedSale.payment_type === 'avista' ? (
                <p>
                  <strong>Pagamento:</strong> À Vista (Já Pago:{' '}
                  {formatCurrencyBRL(completedSale.cash_down_payment)})
                </p>
              ) : (
                <p>
                  <strong>Crediário:</strong> {completedSale.installments_count}x de{' '}
                  {formatCurrencyBRL(completedSale.final_installment_value)}
                </p>
              )}
            </div>
            {completedSale.payment_type === 'crediario' && (
              <div className="p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Opt-In Anti-Ban WhatsApp do Cliente</span>
                </div>
                <a
                  href={`https://wa.me/${settings.store_whatsapp}?text=${encodeURIComponent(
                    `Confirmo meu carnê ${completedSale.code}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 font-bold"
                >
                  Abrir Link
                </a>
              </div>
            )}
            <button
              onClick={() => setCompletedSale(null)}
              className="w-full py-2 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {showNewCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">Novo Cliente</h3>
            <form onSubmit={handleCreateQuickCustomer} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="Nome"
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                required
                placeholder="WhatsApp (55119...)"
                value={newCustPhone}
                onChange={(e) => setNewCustPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                placeholder="CPF"
                value={newCustCpf}
                onChange={(e) => setNewCustCpf(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCustomer(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
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
