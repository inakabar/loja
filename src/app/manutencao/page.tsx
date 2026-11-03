'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  formatCurrencyBRL,
  formatDateBR,
} from '@/lib/calculators/spintax-whatsapp';
import { ServiceOrder } from '@/types/domain';

export default function ManutencaoPage() {
  const {
    serviceOrders,
    visibleInvestments,
    inventory,
    addServiceOrder,
    updateServiceOrderStatus,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [orderType, setOrderType] = useState<'customer' | 'internal_stock'>(
    'customer'
  );
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('55119');
  const [deviceModel, setDeviceModel] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');
  const [partsCost, setPartsCost] = useState('120');
  const [servicePrice, setServicePrice] = useState('380');
  const [investmentId, setInvestmentId] = useState(
    visibleInvestments[0]?.id || ''
  );
  const [inventoryItemId, setInventoryItemId] = useState('');

  const handleCreateOs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceModel.trim() || !reportedDefect.trim()) return;
    addServiceOrder({
      order_type: orderType,
      customer_id: null,
      customer_name:
        orderType === 'internal_stock'
          ? 'Estoque Interno (Reforma de Troca)'
          : customerName.trim() || 'Cliente Balcão',
      customer_phone: customerPhone,
      inventory_item_id:
        orderType === 'internal_stock' && inventoryItemId
          ? inventoryItemId
          : null,
      investment_id: investmentId || visibleInvestments[0]?.id || null,
      device_model: deviceModel.trim(),
      reported_defect: reportedDefect.trim(),
      technical_diagnosis: 'Em análise na bancada',
      parts_cost: Number(partsCost) || 0,
      service_price:
        orderType === 'internal_stock' ? 0 : Number(servicePrice) || 0,
      status: 'em_bancada',
      warranty_days: 90,
    });
    setDeviceModel('');
    setReportedDefect('');
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Manutenção de Equipamentos Eletrônicos (Ordens de Serviço)
          </h1>
          <p className="text-xs text-slate-500">
            Tabela unificada de consertos de clientes e reformas internas de aparelhos de troca.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova OS</span>
        </button>
      </div>

      {/* Tabela Limpa de Ordens de Serviço */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2 px-3">OS</th>
                <th className="py-2 px-3">Data</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Cliente / Origem</th>
                <th className="py-2 px-3">Equipamento</th>
                <th className="py-2 px-3">Defeito / Serviço</th>
                <th className="py-2 px-3 text-right">Custo Peça</th>
                <th className="py-2 px-3 text-right">Valor Cobrado</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceOrders.map((os) => (
                <tr key={os.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">
                    {os.code}
                  </td>
                  <td className="py-2 px-3 text-slate-500">
                    {formatDateBR(os.created_at)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        os.order_type === 'internal_stock'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {os.order_type === 'internal_stock'
                        ? 'Reforma Troca'
                        : 'Cliente'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {os.customer_name}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900">
                    {os.device_model}
                  </td>
                  <td className="py-2 px-3 text-slate-600">
                    {os.reported_defect}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-600 font-medium">
                    -{formatCurrencyBRL(os.parts_cost)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700">
                    {os.order_type === 'customer'
                      ? formatCurrencyBRL(os.service_price)
                      : 'Abatido Planilha'}
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={os.status}
                      onChange={(e) =>
                        updateServiceOrderStatus(
                          os.id,
                          e.target.value as ServiceOrder['status']
                        )
                      }
                      className="px-2 py-1 rounded border border-slate-300 text-[11px] font-semibold bg-white"
                    >
                      <option value="orcamento">Orçamento</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="aguardando_peca">Aguardando Peça</option>
                      <option value="em_bancada">Em Bancada</option>
                      <option value="pronto">Pronto</option>
                      <option value="entregue">Entregue</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Nova Ordem de Serviço (OS)
            </h3>
            <form onSubmit={handleCreateOs} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('customer')}
                  className={`py-2 rounded-lg font-bold border cursor-pointer ${
                    orderType === 'customer'
                      ? 'bg-cyan-600 text-white border-cyan-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Cliente Externo
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('internal_stock')}
                  className={`py-2 rounded-lg font-bold border cursor-pointer ${
                    orderType === 'internal_stock'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Reforma de Troca
                </button>
              </div>

              {orderType === 'customer' ? (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do Cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300"
                  />
                  <input
                    type="text"
                    placeholder="WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              ) : (
                <select
                  value={inventoryItemId}
                  onChange={(e) => {
                    setInventoryItemId(e.target.value);
                    const found = inventory.find(
                      (i) => i.id === e.target.value
                    );
                    if (found) {
                      setDeviceModel(`${found.brand} ${found.model}`);
                      setInvestmentId(found.investment_id);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">Selecionar aparelho do estoque...</option>
                  {inventory
                    .filter((i) => i.status === 'in_stock')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.brand} {item.model}
                      </option>
                    ))}
                </select>
              )}

              <input
                type="text"
                required
                placeholder="Aparelho (Ex: iPhone 15 Pro)"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
              />
              <input
                type="text"
                required
                placeholder="Defeito / Serviço"
                value={reportedDefect}
                onChange={(e) => setReportedDefect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custo Peça (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={partsCost}
                    onChange={(e) => setPartsCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                </div>
                {orderType === 'customer' && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Preço Serviço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-emerald-700"
                    />
                  </div>
                )}
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
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold cursor-pointer"
                >
                  Salvar OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
