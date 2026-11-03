'use client';

import React, { useState } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';

export default function EstoquePage() {
  const {
    inventory,
    investments,
    visibleInvestments,
    hasRole,
    canAccessInvestment,
    addInventoryItem,
  } = useStore();

  const [filterInvId, setFilterInvId] = useState<string>('all');
  const [filterOrigin, setFilterOrigin] = useState<
    'all' | 'initial' | 'trade_in'
  >('all');
  const [showModal, setShowModal] = useState(false);

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
  const [suggestedPrice, setSuggestedPrice] = useState('5800');
  const [quantity, setQuantity] = useState('1');

  const filteredItems = inventory.filter((item) => {
    if (!canAccessInvestment(item.investment_id)) return false;
    if (filterInvId !== 'all' && item.investment_id !== filterInvId) {
      return false;
    }
    if (filterOrigin === 'initial' && item.generation !== 1) return false;
    if (filterOrigin === 'trade_in' && item.generation === 1) return false;
    return true;
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) return;
    addInventoryItem({
      investment_id: investmentId || 'loja',
      origin_sale_id: null,
      category: 'device',
      brand,
      model: model.trim(),
      storage,
      color,
      imei,
      battery_health: Number(battery) || 100,
      condition: 'novo',
      purchase_cost: Number(purchaseCost) || 0,
      suggested_price: Number(suggestedPrice) || 0,
      quantity: Number(quantity) || 1,
      status: 'in_stock',
    });
    setModel('');
    setImei('');
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Estoque de Aparelhos, Produtos da Loja & Trocas (Trade-In)
          </h1>
          <p className="text-xs text-slate-500">
            Visualização limpa em tabela filtrada pelos perfis do seu usuário (Venda da Loja vs Venda dos Investimentos).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
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

        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'initial', label: 'Compra Direta (G1)' },
            { id: 'trade_in', label: 'Recebidos em Troca (G2+)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setFilterOrigin(tab.id as 'all' | 'initial' | 'trade_in')
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
                <th className="py-2 px-3">Aparelho / Produto</th>
                <th className="py-2 px-3">Planilha / Origem</th>
                <th className="py-2 px-3">Geração</th>
                <th className="py-2 px-3">IMEI</th>
                <th className="py-2 px-3">Bateria</th>
                <th className="py-2 px-3 text-right">Custo Total</th>
                <th className="py-2 px-3 text-right">Preço Venda</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const inv = investments.find((i) => i.id === item.investment_id);
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {item.brand} {item.model}{' '}
                      <span className="font-normal text-slate-500">
                        ({item.storage} • {item.color})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {item.investment_id === 'loja'
                        ? 'Estoque da Loja'
                        : inv?.name.split('—')[0] || 'Planilha'}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.generation > 1
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        G{item.generation}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500">
                      {item.imei || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-600">
                      {item.battery_health ? `${item.battery_health}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {formatCurrencyBRL(
                        item.purchase_cost + item.repair_cost
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700">
                      {formatCurrencyBRL(item.suggested_price)}
                    </td>
                    <td className="py-2 px-3">
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Produto no Estoque
            </h3>
            <form onSubmit={handleAddItem} className="space-y-2.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vincular a qual Estoque / Planilha?
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
                      {inv.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Marca"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  required
                  placeholder="Modelo (Ex: iPhone 17)"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 font-bold"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Capacidade"
                  value={storage}
                  onChange={(e) => setStorage(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  type="text"
                  placeholder="Cor"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
                <input
                  type="number"
                  placeholder="Bateria %"
                  value={battery}
                  onChange={(e) => setBattery(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Preço Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={suggestedPrice}
                    onChange={(e) => setSuggestedPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
