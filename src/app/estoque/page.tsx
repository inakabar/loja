'use client';

import React, { useState } from 'react';
import { Plus, Layers, Wrench, CheckCircle2, Tag } from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';
import { InventoryItem } from '@/types/domain';

export default function EstoquePage() {
  const {
    inventory,
    investments,
    visibleInvestments,
    hasRole,
    canAccessInvestment,
    addInventoryItem,
    updateInventoryItem,
  } = useStore();

  const [filterInvId, setFilterInvId] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<
    'all' | 'initial' | 'trade_in' | 'common'
  >('all');
  const [showModal, setShowModal] = useState(false);

  // Campos Novo Produto
  const [productType, setProductType] = useState<'device' | 'accessory'>(
    'device'
  );
  const [investmentId, setInvestmentId] = useState<string>(
    visibleInvestments[0]?.id || 'loja'
  );
  const [brand, setBrand] = useState('Apple');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [color, setColor] = useState('Preto');
  const [imei, setImei] = useState('');
  const [battery, setBattery] = useState('100');
  const [purchaseCost, setPurchaseCost] = useState('3400');
  const [repairCost, setRepairCost] = useState('0');
  const [costNotes, setCostNotes] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('5800');
  const [quantity, setQuantity] = useState('1');

  // Modal Editar Produto / Lançar Custos de Manutenção/Peças
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editCategory, setEditCategory] = useState<'device' | 'accessory'>(
    'device'
  );
  const [editPurchaseCost, setEditPurchaseCost] = useState('0');
  const [editRepairCost, setEditRepairCost] = useState('0');
  const [editAddExtraCost, setEditAddExtraCost] = useState('0');
  const [editSuggestedPrice, setEditSuggestedPrice] = useState('0');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editNotes, setEditNotes] = useState('');

  const filteredItems = inventory.filter((item) => {
    if (!canAccessInvestment(item.investment_id)) return false;
    if (filterInvId !== 'all' && item.investment_id !== filterInvId) {
      return false;
    }
    if (filterOrigin === 'initial' && item.generation !== 1) return false;
    if (filterOrigin === 'trade_in' && item.generation === 1) return false;
    if (filterOrigin === 'common' && item.category === 'device') return false;
    return true;
  });

  const handleOpenNewModal = () => {
    setInvestmentId(visibleInvestments[0]?.id || 'loja');
    setProductType('device');
    setBrand('Apple');
    setModel('');
    setStorage('128GB');
    setColor('Preto');
    setImei('');
    setBattery('100');
    setPurchaseCost('3400');
    setRepairCost('0');
    setCostNotes('');
    setSuggestedPrice('5800');
    setQuantity('1');
    setShowModal(true);
  };

  const handleSwitchProductType = (type: 'device' | 'accessory') => {
    setProductType(type);
    if (type === 'accessory') {
      setInvestmentId('loja');
      setBrand('Acessório');
      setStorage('');
      setImei('');
      setBattery('');
      setPurchaseCost('15');
      setRepairCost('0');
      setSuggestedPrice('50');
      setQuantity('10');
    } else {
      setBrand('Apple');
      setStorage('128GB');
      setBattery('100');
      setPurchaseCost('3400');
      setSuggestedPrice('5800');
      setQuantity('1');
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) return;
    addInventoryItem({
      investment_id: investmentId || 'loja',
      origin_sale_id: null,
      category: productType,
      brand: brand.trim() || (productType === 'accessory' ? 'Loja' : 'Apple'),
      model: model.trim(),
      storage: productType === 'device' ? storage : '',
      color: color.trim(),
      imei: productType === 'device' ? imei.trim() : '',
      battery_health:
        productType === 'device' ? Number(battery) || 100 : undefined,
      condition: 'novo',
      purchase_cost: Number(purchaseCost) || 0,
      repair_cost: Number(repairCost) || 0,
      suggested_price: Number(suggestedPrice) || 0,
      quantity: Number(quantity) || 1,
      status: 'in_stock',
      notes: costNotes.trim() || undefined,
    });
    setModel('');
    setImei('');
    setCostNotes('');
    setShowModal(false);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditCategory(item.category === 'accessory' ? 'accessory' : 'device');
    setEditPurchaseCost(String(item.purchase_cost || 0));
    setEditRepairCost(String(item.repair_cost || 0));
    setEditAddExtraCost('0');
    setEditSuggestedPrice(String(item.suggested_price || 0));
    setEditQuantity(String(item.quantity || 1));
    setEditNotes(item.notes || '');
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const totalRepair =
      (Number(editRepairCost) || 0) + (Number(editAddExtraCost) || 0);

    updateInventoryItem(editingItem.id, {
      category: editCategory,
      purchase_cost: Number(editPurchaseCost) || 0,
      repair_cost: totalRepair,
      suggested_price: Number(editSuggestedPrice) || 0,
      quantity: Math.max(0, Number(editQuantity) || 0),
      notes: editNotes.trim() || undefined,
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Estoque de Aparelhos (Crediário), Produtos Comuns & Custos
          </h1>
          <p className="text-xs text-slate-500">
            Defina se o produto permite Crediário ou é Produto Comum (ex: capinha) e lance custos de manutenção/troca de peças.
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Produto / Compra</span>
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold text-slate-700">Origem/Planilha:</span>
          <select
            value={filterInvId}
            onChange={(e) => setFilterInvId(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold"
          >
            <option value="all">Todas Liberadas</option>
            {hasRole('venda_loja') && (
              <option value="loja">Estoque Próprio da Loja</option>
            )}
            {visibleInvestments.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'initial', label: 'Compra Direta (G1)' },
            { id: 'trade_in', label: 'Recebidos em Troca (G2+)' },
            { id: 'common', label: 'Produtos Comuns (Capinhas/Acessórios)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setFilterOrigin(
                  tab.id as 'all' | 'initial' | 'trade_in' | 'common'
                )
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                filterOrigin === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela Compacta de Estoque */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2.5 px-3">Produto / Aparelho</th>
                <th className="py-2.5 px-3">Modalidade</th>
                <th className="py-2.5 px-3">Origem (Planilha / Loja)</th>
                <th className="py-2.5 px-3 text-center">Qtd</th>
                <th className="py-2.5 px-3 text-right">Custo Compra</th>
                <th className="py-2.5 px-3 text-right">
                  Custos Extras (Manut/Peças)
                </th>
                <th className="py-2.5 px-3 text-right">Custo Total</th>
                <th className="py-2.5 px-3 text-right">Preço Venda</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Nenhum produto cadastrado neste filtro. Clique em{' '}
                    <strong>Novo Produto / Compra</strong> para adicionar.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const inv = investments.find(
                    (i) => i.id === item.investment_id
                  );
                  const allowsCrediario = item.category === 'device';
                  const totalCost =
                    (item.purchase_cost || 0) + (item.repair_cost || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {item.brand} {item.model}{' '}
                          {item.storage || item.color ? (
                            <span className="font-normal text-slate-500">
                              ({[item.storage, item.color].filter(Boolean).join(' • ')})
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {item.imei && (
                            <span className="font-mono">IMEI: {item.imei}</span>
                          )}
                          {item.battery_health && (
                            <span>Bat: {item.battery_health}%</span>
                          )}
                          {item.notes && (
                            <span className="text-amber-700 font-medium">
                              • Obs/Custos: {item.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {allowsCrediario ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Permite Crediário (G{item.generation})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold">
                            <Tag className="w-3 h-3" />
                            <span>Comum (Só à Vista)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {item.investment_id === 'loja'
                          ? 'Estoque Próprio da Loja'
                          : inv?.name.split('—')[0] || 'Planilha'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                        {item.quantity}
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatCurrencyBRL(item.purchase_cost || 0)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {(item.repair_cost || 0) > 0 ? (
                          <span className="font-bold text-amber-700">
                            +{formatCurrencyBRL(item.repair_cost)}
                          </span>
                        ) : (
                          <span className="text-slate-400">R$ 0,00</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrencyBRL(totalCost)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrencyBRL(item.suggested_price)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'in_stock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'in_repair'
                              ? 'bg-amber-100 text-amber-800'
                              : item.status === 'withdrawn'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.status === 'in_stock'
                            ? 'Disponível'
                            : item.status === 'in_repair'
                            ? 'Manutenção'
                            : item.status === 'withdrawn'
                            ? 'Retirado'
                            : 'Vendido'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          <Wrench className="w-3 h-3 text-amber-600" />
                          <span>+ Custos / Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Produto / Compra */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-3.5 shadow-xl text-xs max-h-[92vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Produto no Estoque
            </h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              {/* Seletor de Tipo: Crediário vs Produto Comum */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Tipo de Produto (Definir se pode usar no Crediário)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSwitchProductType('device')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                      productType === 'device'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      📱 Aparelho / Permite Crediário
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Pode ser vendido no Crediário ou à Vista (Ex: iPhones, Xiaomi, iPads)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchProductType('accessory')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                      productType === 'accessory'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      🛍️ Produto Comum (Só à Vista)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Capinhas, películas, cabos, fontes — bloqueado no Crediário
                    </div>
                  </button>
                </div>
              </div>

              {/* Origem: Planilha ou Loja */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  2. Vincular a qual Estoque (Planilha ou Loja)?
                </label>
                <select
                  value={investmentId}
                  onChange={(e) => setInvestmentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  {hasRole('venda_loja') && (
                    <option value="loja">Estoque Próprio da Loja</option>
                  )}
                  {visibleInvestments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      Planilha: {inv.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Marca / Categoria
                  </label>
                  <input
                    type="text"
                    placeholder={
                      productType === 'accessory' ? 'Ex: Acessório' : 'Ex: Apple'
                    }
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome / Modelo do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      productType === 'accessory'
                        ? 'Ex: Capinha MagSafe iPhone 16'
                        : 'Ex: iPhone 16 Pro 128GB'
                    }
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {productType === 'device' ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Capacidade
                    </label>
                    <input
                      type="text"
                      placeholder="128GB"
                      value={storage}
                      onChange={(e) => setStorage(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Cor
                    </label>
                    <input
                      type="text"
                      placeholder="Preto"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Bateria (%)
                    </label>
                    <input
                      type="number"
                      placeholder="100"
                      value={battery}
                      onChange={(e) => setBattery(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      IMEI
                    </label>
                    <input
                      type="text"
                      placeholder="Opcional"
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Cor / Detalhe (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Transparente / Silicone"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quantidade em Estoque
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Bloco de Custos do Produto (Compra + Manutenção / Peças) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>3. Custos do Produto & Preço de Venda</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Custo de Compra (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={purchaseCost}
                      onChange={(e) => setPurchaseCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-amber-800 mb-1">
                      Custos Manut./Peças (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={repairCost}
                      onChange={(e) => setRepairCost(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/40 font-bold text-amber-950"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      Preço de Venda (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={suggestedPrice}
                      onChange={(e) => setSuggestedPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-400 bg-white font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Descrição dos Custos / Peças Trocadas (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Troca de bateria R$ 150 + troca de conector R$ 80"
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 border-t border-slate-200">
                  <span>
                    Custo Total Unitário:{' '}
                    <strong className="text-slate-900">
                      {formatCurrencyBRL(
                        (Number(purchaseCost) || 0) + (Number(repairCost) || 0)
                      )}
                    </strong>
                  </span>
                  <span>
                    Margem Unitária:{' '}
                    <strong className="text-emerald-700">
                      {formatCurrencyBRL(
                        (Number(suggestedPrice) || 0) -
                          ((Number(purchaseCost) || 0) +
                            (Number(repairCost) || 0))
                      )}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Salvar Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Produto / Lançar Custos de Manutenção e Peças */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3.5 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Custos de Manutenção / Peças & Edição — {editingItem.brand}{' '}
              {editingItem.model}
            </h3>

            <form onSubmit={handleSaveEditItem} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Modalidade de Venda do Produto
                </label>
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value as 'device' | 'accessory')
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="device">
                    📱 Aparelho — Pode ser usado no Crediário ou à Vista
                  </option>
                  <option value="accessory">
                    🛍️ Produto Comum — Apenas Venda à Vista (Ex: Capinha)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custo de Compra (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPurchaseCost}
                    onChange={(e) => setEditPurchaseCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custos Manut. Já Lançados (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editRepairCost}
                    onChange={(e) => setEditRepairCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <label className="block font-bold text-amber-900">
                  + Somar Novo Custo de Manutenção / Peça Agora (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 150.00"
                  value={editAddExtraCost}
                  onChange={(e) => setEditAddExtraCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-white font-bold text-amber-950"
                />
                <div className="text-[11px] text-amber-800">
                  Novo Custo Total de Manutenção/Peças:{' '}
                  <strong>
                    {formatCurrencyBRL(
                      (Number(editRepairCost) || 0) +
                        (Number(editAddExtraCost) || 0)
                    )}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Histórico / Descrição dos Custos (Manutenção, Peças, etc.)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Troca de tela R$ 220 + bateria R$ 120"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editSuggestedPrice}
                    onChange={(e) => setEditSuggestedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Quantidade Disponível
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                >
                  Salvar Custos & Produto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
