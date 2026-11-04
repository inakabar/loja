'use client';

import React, { useState } from 'react';
import {
  Plus,
  Layers,
  Wrench,
  CheckCircle2,
  Tag,
  PackagePlus,
  History,
  Search,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';
import {
  InventoryItem,
  PRODUCT_SUBCATEGORY_LABELS,
  ProductSubcategory,
} from '@/types/domain';

export default function EstoquePage() {
  const {
    inventory,
    investments,
    visibleInvestments,
    hasRole,
    canAccessInvestment,
    addInventoryItem,
    updateInventoryItem,
    addPurchaseToInventoryItem,
  } = useStore();

  const [filterInvId, setFilterInvId] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<
    | 'all'
    | 'devices'
    | 'trade_in'
    | 'cases_films'
    | 'cables_audio'
    | 'parts'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Campos Novo Produto
  const [productType, setProductType] = useState<
    'device' | 'accessory' | 'part'
  >('device');
  const [subcategory, setSubcategory] = useState<ProductSubcategory>('celular');
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

  // Modal Inserir Nova Compra Associada ao Produto (Repor Estoque & Histórico)
  const [purchasingItem, setPurchasingItem] = useState<InventoryItem | null>(
    null
  );
  const [buyQty, setBuyQty] = useState('5');
  const [buyUnitCost, setBuyUnitCost] = useState('0');
  const [buyExtraCost, setBuyExtraCost] = useState('0');
  const [buySuggestedPrice, setBuySuggestedPrice] = useState('0');
  const [buySupplierNotes, setBuySupplierNotes] = useState('');

  // Modal Editar Produto / Lançar Custos de Manutenção/Peças
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editInvestmentId, setEditInvestmentId] = useState<string>('loja');
  const [editCategory, setEditCategory] = useState<
    'device' | 'accessory' | 'part'
  >('device');
  const [editSubcategory, setEditSubcategory] =
    useState<ProductSubcategory>('celular');
  const [editPurchaseCost, setEditPurchaseCost] = useState('0');
  const [editRepairCost, setEditRepairCost] = useState('0');
  const [editAddExtraCost, setEditAddExtraCost] = useState('0');
  const [editSuggestedPrice, setEditSuggestedPrice] = useState('0');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editNotes, setEditNotes] = useState('');

  const getEffectiveSubcategory = (item: InventoryItem): ProductSubcategory => {
    if (item.subcategory) return item.subcategory;
    if (item.category === 'part') return 'peca_outros';
    if (item.category === 'accessory') return 'capinha';
    return 'celular';
  };

  const filteredItems = inventory.filter((item) => {
    if (!canAccessInvestment(item.investment_id)) return false;
    if (filterInvId !== 'all' && item.investment_id !== filterInvId) {
      return false;
    }

    const sub = getEffectiveSubcategory(item);
    if (filterGroup === 'devices' && item.category !== 'device') return false;
    if (
      filterGroup === 'trade_in' &&
      (item.category !== 'device' || item.generation === 1)
    ) {
      return false;
    }
    if (
      filterGroup === 'cases_films' &&
      sub !== 'capinha' &&
      sub !== 'pelicula'
    ) {
      return false;
    }
    if (
      filterGroup === 'cables_audio' &&
      sub !== 'carregador_cabo' &&
      sub !== 'fone_audio' &&
      sub !== 'outros'
    ) {
      return false;
    }
    if (filterGroup === 'parts' && item.category !== 'part') {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const text =
        `${item.brand} ${item.model} ${item.color} ${item.storage} ${item.imei || ''} ${PRODUCT_SUBCATEGORY_LABELS[sub] || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }

    return true;
  });

  const handleOpenNewModal = () => {
    setInvestmentId(
      filterInvId !== 'all'
        ? filterInvId
        : hasRole('venda_loja')
        ? 'loja'
        : visibleInvestments[0]?.id || 'loja'
    );
    setProductType('device');
    setSubcategory('celular');
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

  const handleSwitchProductType = (type: 'device' | 'accessory' | 'part') => {
    setProductType(type);
    if (type === 'accessory') {
      setSubcategory('capinha');
      setBrand('Acessório');
      setStorage('');
      setImei('');
      setBattery('');
      setPurchaseCost('15');
      setRepairCost('0');
      setSuggestedPrice('50');
      setQuantity('10');
    } else if (type === 'part') {
      setSubcategory('peca_tela');
      setBrand('Peça');
      setStorage('');
      setImei('');
      setBattery('');
      setPurchaseCost('120');
      setRepairCost('0');
      setSuggestedPrice('280');
      setQuantity('3');
    } else {
      setSubcategory('celular');
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
    const targetInv = investmentId || 'loja';
    addInventoryItem({
      investment_id: targetInv,
      origin_sale_id: null,
      category: productType,
      subcategory,
      brand:
        brand.trim() ||
        (productType === 'part'
          ? 'Peça'
          : productType === 'accessory'
          ? 'Acessório'
          : 'Apple'),
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
    if (filterInvId !== 'all' && filterInvId !== targetInv) {
      setFilterInvId('all');
    }
    setFilterGroup('all');
    setModel('');
    setImei('');
    setCostNotes('');
    setShowModal(false);
  };

  const handleOpenPurchaseModal = (item: InventoryItem) => {
    setPurchasingItem(item);
    setBuyQty('5');
    setBuyUnitCost(String(item.purchase_cost || 0));
    setBuyExtraCost('0');
    setBuySuggestedPrice(String(item.suggested_price || 0));
    setBuySupplierNotes('');
  };

  const handleSaveNewPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchasingItem) return;
    addPurchaseToInventoryItem(purchasingItem.id, {
      quantity: Math.max(1, Number(buyQty) || 1),
      unit_cost: Number(buyUnitCost) || 0,
      extra_cost: Number(buyExtraCost) || 0,
      suggested_price: Number(buySuggestedPrice) || 0,
      supplier_or_notes: buySupplierNotes.trim() || undefined,
    });
    setPurchasingItem(null);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditInvestmentId(item.investment_id || 'loja');
    setEditCategory(item.category);
    setEditSubcategory(getEffectiveSubcategory(item));
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
      investment_id: editInvestmentId,
      category: editCategory,
      subcategory: editSubcategory,
      purchase_cost: Number(editPurchaseCost) || 0,
      repair_cost: totalRepair,
      suggested_price: Number(editSuggestedPrice) || 0,
      quantity: Math.max(0, Number(editQuantity) || 0),
      status: Number(editQuantity) > 0 ? 'in_stock' : editingItem.status,
      notes: editNotes.trim() || undefined,
    });
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Estoque Granular • Aparelhos, Capinhas, Acessórios & Peças de Manutenção
          </h1>
          <p className="text-xs text-slate-500">
            Cadastre produtos uma única vez e vá inserindo novas compras associadas a cada produto (com histórico de lotes e custos).
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* Barra de Filtros Granulares + Busca */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-slate-700">
              Origem/Planilha:
            </span>
            <select
              value={filterInvId}
              onChange={(e) => setFilterInvId(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold"
            >
              <option value="all">Todas Liberadas</option>
              {hasRole('venda_loja') && (
                <option value="loja">🏪 Estoque Próprio da Loja</option>
              )}
              {visibleInvestments.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  📊 {inv.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por modelo, IMEI, cor, peça..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: 'all', label: 'Todos os Itens' },
            { id: 'devices', label: '📱 Celulares & Aparelhos (Crediário)' },
            { id: 'trade_in', label: '🔄 Recebidos na Troca (G2+)' },
            { id: 'cases_films', label: '🛡️ Capinhas & Películas' },
            { id: 'cables_audio', label: '🔌 Cabos, Fontes & Áudio' },
            { id: 'parts', label: '🔧 Peças de Manutenção (OS)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setFilterGroup(
                  tab.id as
                    | 'all'
                    | 'devices'
                    | 'trade_in'
                    | 'cases_films'
                    | 'cables_audio'
                    | 'parts'
                )
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                filterGroup === tab.id
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
                <th className="py-2.5 px-3">Produto / Detalhamento</th>
                <th className="py-2.5 px-3">Subcategoria & Uso</th>
                <th className="py-2.5 px-3">Origem</th>
                <th className="py-2.5 px-3 text-center">Saldo Qtd</th>
                <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                <th className="py-2.5 px-3 text-right">Custos Extras</th>
                <th className="py-2.5 px-3 text-right">Preço Tabelado</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">
                  Compras Associadas & Edição
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Nenhum produto encontrado neste filtro. Clique em{' '}
                    <strong>Cadastrar Novo Produto</strong> para adicionar.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const inv = investments.find(
                    (i) => i.id === item.investment_id
                  );
                  const allowsCrediario = item.category === 'device';
                  const isPart = item.category === 'part';
                  const sub = getEffectiveSubcategory(item);
                  const historyCount = item.purchase_history?.length || 1;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {item.brand} {item.model}{' '}
                          {item.storage || item.color ? (
                            <span className="font-normal text-slate-500">
                              (
                              {[item.storage, item.color]
                                .filter(Boolean)
                                .join(' • ')}
                              )
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {item.imei && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                              IMEI: {item.imei}
                            </span>
                          )}
                          {item.battery_health && item.category === 'device' && (
                            <span>Bat: {item.battery_health}%</span>
                          )}
                          <span className="text-slate-500">
                            • {historyCount} compra(s) registrada(s)
                          </span>
                          {item.notes && (
                            <span className="text-amber-700 font-medium">
                              • Obs: {item.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800 text-[11px]">
                          {PRODUCT_SUBCATEGORY_LABELS[sub]}
                        </div>
                        {allowsCrediario ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold mt-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Crediário ou À Vista (G{item.generation})</span>
                          </span>
                        ) : isPart ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold mt-0.5">
                            <Wrench className="w-2.5 h-2.5" />
                            <span>Peça de Bancada (OS)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-bold mt-0.5">
                            <Tag className="w-2.5 h-2.5" />
                            <span>Produto Comum (À Vista)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        {item.investment_id === 'loja'
                          ? 'Estoque da Loja'
                          : inv?.name.split('—')[0] || 'Planilha'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            item.quantity > 0
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.quantity} un.
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right text-slate-700 font-semibold">
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

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrencyBRL(item.suggested_price)}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.status === 'in_stock' && item.quantity > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'in_repair'
                              ? 'bg-amber-100 text-amber-800'
                              : item.status === 'withdrawn'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.status === 'in_stock' && item.quantity > 0
                            ? 'Em Estoque'
                            : item.status === 'in_repair'
                            ? 'Manutenção'
                            : item.status === 'withdrawn'
                            ? 'Retirado'
                            : 'Sem Saldo'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPurchaseModal(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-[11px] font-bold text-emerald-800 cursor-pointer"
                            title="Inserir nova compra / repor unidades deste produto"
                          >
                            <PackagePlus className="w-3.5 h-3.5 text-emerald-700" />
                            <span>+ Compra / Lotes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 text-amber-600" />
                            <span>Editar</span>
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

      {/* Modal: Inserir Nova Compra Associada ao Produto & Ver Histórico de Compras */}
      {purchasingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-xl text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PackagePlus className="w-4 h-4 text-emerald-600" />
                  <span>
                    Inserir Compra Associada — {purchasingItem.brand}{' '}
                    {purchasingItem.model}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saldo atual: <strong>{purchasingItem.quantity} un.</strong> •
                  Some novas unidades compradas e mantenha o histórico de compras deste produto.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPurchase} className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qtd Comprada (+) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={buyQty}
                    onChange={(e) => setBuyQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-50/40 font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custo Unit. (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={buyUnitCost}
                    onChange={(e) => setBuyUnitCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-800 mb-1">
                    Custo Extra/Frete
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={buyExtraCost}
                    onChange={(e) => setBuyExtraCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-amber-50/30 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Preço Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={buySuggestedPrice}
                    onChange={(e) => setBuySuggestedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-emerald-400 font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fornecedor / Observação desta Compra
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fornecedor SP — Lote com 10 unidades"
                  value={buySupplierNotes}
                  onChange={(e) => setBuySupplierNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                <span>
                  Novo saldo após esta compra:{' '}
                  <strong className="text-emerald-700">
                    {(purchasingItem.quantity || 0) +
                      Math.max(1, Number(buyQty) || 1)}{' '}
                    unidades
                  </strong>
                </span>
                <span>
                  Total desta compra:{' '}
                  <strong className="text-slate-900">
                    {formatCurrencyBRL(
                      Math.max(1, Number(buyQty) || 1) *
                        (Number(buyUnitCost) || 0) +
                        (Number(buyExtraCost) || 0)
                    )}
                  </strong>
                </span>
              </div>

              {/* Histórico de Compras Associadas a este Produto */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Histórico de Compras Associadas a Este Produto (
                    {purchasingItem.purchase_history?.length || 0})
                  </span>
                </div>
                {purchasingItem.purchase_history &&
                purchasingItem.purchase_history.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {purchasingItem.purchase_history.map((ph) => (
                      <div
                        key={ph.id}
                        className="px-3 py-2 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            +{ph.quantity} un.
                          </span>{' '}
                          a {formatCurrencyBRL(ph.unit_cost)}/un.
                          {ph.extra_cost ? (
                            <span className="text-amber-700">
                              {' '}
                              (+{formatCurrencyBRL(ph.extra_cost)} extra)
                            </span>
                          ) : null}
                          <div className="text-[10px] text-slate-500">
                            {ph.supplier_or_notes || 'Compra registrada'}
                          </div>
                        </div>
                        <div className="text-right text-[10px] text-slate-400">
                          {new Date(ph.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Nenhuma compra anterior detalhada.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPurchasingItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                >
                  Confirmar Entrada de Estoque
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastrar Novo Produto */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-5 space-y-3.5 shadow-xl text-xs max-h-[92vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Novo Produto no Estoque
            </h3>

            <form onSubmit={handleAddItem} className="space-y-3">
              {/* 1. Grupo Principal */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Categoria Principal do Item
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                      📱 Aparelho (Crediário)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Celulares, Tablets e Relógios (Aceita Crediário e À Vista)
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
                      🛡️ Capinha & Acessório
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Capinhas, Películas, Cabos, Fontes e Fones (Venda à Vista)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchProductType('part')}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                      productType === 'part'
                        ? 'bg-amber-50 border-amber-500 text-amber-950 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">
                      🔧 Peça de Manutenção
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Telas, Baterias, Conectores e Peças para usar nas OS
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Subcategoria Granular + Origem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    2. Tipo Granular (Subcategoria)
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) =>
                      setSubcategory(e.target.value as ProductSubcategory)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {Object.entries(PRODUCT_SUBCATEGORY_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    3. Vincular a qual Estoque?
                  </label>
                  <select
                    value={investmentId}
                    onChange={(e) => setInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Marca / Fabricante
                  </label>
                  <input
                    type="text"
                    placeholder={
                      productType === 'part'
                        ? 'Ex: Foxconn / Incell'
                        : productType === 'accessory'
                        ? 'Ex: MagSafe'
                        : 'Ex: Apple'
                    }
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nome / Modelo Detalhado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      productType === 'part'
                        ? 'Ex: Tela Frontal iPhone 15 Pro Original'
                        : productType === 'accessory'
                        ? 'Ex: Capinha Silicone iPhone 16'
                        : 'Ex: iPhone 16 Pro'
                    }
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
              </div>

              {productType === 'device' ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Qtd Inicial
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">
                      Cor / Característica
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Transparente / Preto / Original"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Quantidade Inicial Comprada
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

              {/* Bloco de Custos do Produto */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-600" />
                  <span>4. Custos da Compra Inicial & Preço Tabelado</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Custo Compra Unit. (R$)
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
                      Custos Extras/Manut. (R$)
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
                      Preço Tabelado Venda (R$)
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
                    Fornecedor / Detalhe de Custos (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Compra lote distribuidor + revisão"
                    value={costNotes}
                    onChange={(e) => setCostNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
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

      {/* Modal Editar Produto / Lançar Custos de Manutenção */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3.5 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Editar Produto & Custos — {editingItem.brand} {editingItem.model}
            </h3>

            <form onSubmit={handleSaveEditItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Origem (Planilha ou Loja)
                  </label>
                  <select
                    value={editInvestmentId}
                    onChange={(e) => setEditInvestmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {hasRole('venda_loja') && (
                      <option value="loja">🏪 Estoque Próprio da Loja</option>
                    )}
                    {visibleInvestments.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        📊 {inv.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Subcategoria Granular
                  </label>
                  <select
                    value={editSubcategory}
                    onChange={(e) =>
                      setEditSubcategory(e.target.value as ProductSubcategory)
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    {Object.entries(PRODUCT_SUBCATEGORY_LABELS).map(
                      ([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Modalidade de Uso do Produto
                </label>
                <select
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(
                      e.target.value as 'device' | 'accessory' | 'part'
                    )
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                >
                  <option value="device">
                    📱 Aparelho — Permite Crediário ou Venda à Vista
                  </option>
                  <option value="accessory">
                    🛡️ Produto Comum / Acessório — Venda à Vista
                  </option>
                  <option value="part">
                    🔧 Peça de Manutenção — Uso em OS / Bancada
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
                    Custos Extras Já Lançados (R$)
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
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">
                    Preço Tabelado Venda (R$)
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
                    Quantidade em Estoque
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

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Observações / Custos Realizados
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
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
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
