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
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';
import { PRODUCT_SUBCATEGORY_LABELS } from '@/types/domain';

interface CartRow {
  itemId: string;
  quantity: number;
}

export default function VendasPage() {
  const {
    customers,
    inventory,
    investments,
    visibleInvestments,
    sales,
    hasRole,
    canAccessInvestment,
    addCustomer,
    createMultiItemSale,
  } = useStore();

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
  const [paymentMethod, setPaymentMethod] = useState<'avista' | 'cartao'>(
    'avista'
  );

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
    if (item.category === 'part') return false; // Peças de bancada ficam para OS
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

  // Caso o usuário não tenha clicado em "+ Adicionar ao Carrinho" mas tenha 1 produto selecionado, mostramos o carrinho real ou o item atual como prévia
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

  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      cpf: newCustCpf.trim() || '000.000.000-00',
      phone_whatsapp: newCustPhone.trim(),
      whatsapp_opt_in: true,
      credit_score: 'bom',
      address: 'Cadastrado no PDV',
    });
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustCpf('');
    setShowNewCustomerModal(false);
  };

  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeCartRows.length === 0) {
      alert(
        'Adicione ao menos 1 produto ao carrinho clicando em "+ Adicionar Item à Venda".'
      );
      return;
    }
    if (discountVal > 0 && !discountReason.trim()) {
      alert(
        'Por favor, informe obrigatoriamente a nota/motivo do desconto concedido.'
      );
      return;
    }

    try {
      const createdSale = createMultiItemSale({
        customerId: selectedCustomerId || undefined,
        items: activeCartRows.map((r) => ({
          itemId: r.item.id,
          quantity: r.quantity,
        })),
        discount: discountVal,
        discountReason: discountReason.trim() || undefined,
        paymentType: paymentMethod,
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
      });

      setSaleSuccessMessage(
        `Venda ${createdSale.code} concluída (${createdSale.sold_item_name}) — Total: ${formatCurrencyBRL(createdSale.total_sale_final)}!`
      );
      setCart([]);
      setDiscountStr('0');
      setDiscountReason('');
      setHasTradeIn(false);
      setTradeInModel('');
      setTradeInValueStr('0');
      setTimeout(() => setSaleSuccessMessage(null), 6000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar venda');
    }
  };

  const visibleSales = sales.filter((s) =>
    canAccessInvestment(s.investment_id)
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            PDV • Venda de Múltiplos Produtos (À Vista / Cartão / PIX)
          </h1>
          <p className="text-xs text-slate-500">
            Busque clientes por Nome, Telefone ou CPF, filtre produtos por Modelo, IMEI ou Cor, adicione N itens ao carrinho com preço tabelado pelo estoque e justificativa de desconto.
          </p>
        </div>

        {hasRole('crediario') && (
          <Link
            href="/crediario"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
          >
            <Calculator className="w-4 h-4" />
            <span>Ir para Aba Crediário & Parcelamento →</span>
          </Link>
        )}
      </div>

      {saleSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-900 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      <form
        onSubmit={handleCompleteSale}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* Coluna Esquerda: Cliente, Busca Detalhada de Produtos e Carrinho N Itens */}
        <div className="lg:col-span-7 space-y-4">
          {/* 1. Autocomplete de Cliente (Nome, Telefone ou CPF) */}
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
                          (c.phone_whatsapp || '').toLowerCase().includes(q) ||
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
                  Cliente Selecionado: <strong>{selectedCustomer.name}</strong>
                </span>
                <span>
                  Tel: <strong>{selectedCustomer.phone_whatsapp}</strong> • CPF:{' '}
                  <strong>{selectedCustomer.cpf}</strong>
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
                <option value="all">Todas as Origens (Loja + Planilhas)</option>
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

            {/* Busca por Nome, IMEI ou Cor */}
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

            {/* Seletor + Quantidade + Botão Adicionar ao Carrinho */}
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

            {/* Card Detalhado do Produto Selecionado (Para saber exatamente qual está sendo vendido) */}
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
                      IMEI: <strong>{currentHighlightedProduct.imei}</strong>
                    </span>
                  )}
                  {currentHighlightedProduct.battery_health &&
                    currentHighlightedProduct.category === 'device' && (
                      <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                        Bateria:{' '}
                        <strong>
                          {currentHighlightedProduct.battery_health}%
                        </strong>
                      </span>
                    )}
                  <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                    Saldo Disponível:{' '}
                    <strong>{currentHighlightedProduct.quantity} un.</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Lista de Itens no Carrinho (N Produtos na Venda) */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Itens na Venda Atual ({activeCartRows.length} produto(s))
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Valores unitários seguem o preço registrado no estoque</span>
                </span>
              </div>

              {activeCartRows.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
                  Selecione um produto acima e clique em{' '}
                  <strong>+ Adicionar</strong> para montar a venda (Ex: 2 capinhas + 1 celular).
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
                            <span className="font-mono">IMEI: {item.imei}</span>
                          )}
                          <span>
                            Unitário Tabelado:{' '}
                            <strong>
                              {formatCurrencyBRL(item.suggested_price)}
                            </strong>
                          </span>
                          <span>(Máx: {item.quantity} un.)</span>
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
                          title="Remover item"
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
                <span>3. Aparelho Recebido na Troca (Trade-In Opcional)</span>
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

        {/* Coluna Direita: Fechamento, Desconto com Justificativa Obrigatória */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-sm">
                4. Fechamento da Venda (Tabelado pelo Estoque)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                {activeCartRows.reduce((a, b) => a + b.quantity, 0)} un. no carrinho
              </span>
            </div>

            {/* Valor Bruto Bloqueado (Segue o Estoque) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  <span>Subtotal Tabelado (R$)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrencyBRL(grossCartTotal)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] text-amber-300 font-bold mb-1">
                  Desconto Concedido (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500/50 text-amber-300 font-bold"
                />
              </div>
            </div>

            {/* Nota obrigatória quando houver desconto */}
            {discountVal > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 space-y-1.5">
                <label className="block text-[11px] font-bold text-amber-300 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  <span>
                    Nota / Motivo do Desconto de {formatCurrencyBRL(discountVal)} *
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Desconto pagamento à vista no PIX / Cliente fiel"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-amber-500 text-white placeholder-slate-500"
                />
              </div>
            )}

            {/* Forma de Pagamento */}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Modalidade de Recebimento
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('avista')}
                  className={`py-2 rounded-lg font-bold border cursor-pointer ${
                    paymentMethod === 'avista'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  💵 À Vista (PIX / Dinheiro)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cartao')}
                  className={`py-2 rounded-lg font-bold border cursor-pointer ${
                    paymentMethod === 'cartao'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  💳 Cartão
                </button>
              </div>
            </div>

            {/* Resumo Líquido */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal Estoque:</span>
                <span className="font-bold text-white">
                  {formatCurrencyBRL(grossCartTotal)}
                </span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>(-) Desconto Justificado:</span>
                  <span>-{formatCurrencyBRL(discountVal)}</span>
                </div>
              )}
              {hasTradeIn && tradeInVal > 0 && (
                <div className="flex justify-between text-indigo-400">
                  <span>(-) Aparelho na Troca:</span>
                  <span>-{formatCurrencyBRL(tradeInVal)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-800 text-emerald-400 font-black text-sm">
                <span>Total Líquido a Receber:</span>
                <span>{formatCurrencyBRL(netPayable)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={activeCartRows.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
            >
              Finalizar Venda ({formatCurrencyBRL(netPayable)})
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
                <th className="py-2 px-3">Modalidade</th>
                <th className="py-2 px-3">Cliente</th>
                <th className="py-2 px-3">Produtos Vendidos</th>
                <th className="py-2 px-3 text-right">Tabelado</th>
                <th className="py-2 px-3 text-right">Desconto / Nota</th>
                <th className="py-2 px-3 text-right">Total Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">
                    {s.code}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        s.payment_type === 'crediario'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.payment_type === 'crediario'
                        ? `Crediário (${s.installments_count}x)`
                        : s.payment_type === 'cartao'
                        ? 'Cartão'
                        : 'À Vista'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {s.customer_name}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {s.sold_item_name}
                  </td>
                  <td className="py-2 px-3 text-right text-slate-600">
                    {formatCurrencyBRL(s.sale_price)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {s.discount > 0 ? (
                      <div>
                        <span className="font-bold text-amber-700">
                          -{formatCurrencyBRL(s.discount)}
                        </span>
                        {s.notes && (
                          <div className="text-[10px] text-slate-500">
                            {s.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">R$ 0,00</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700">
                    {formatCurrencyBRL(s.total_sale_final)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                placeholder="CPF"
                value={newCustCpf}
                onChange={(e) => setNewCustCpf(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
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
