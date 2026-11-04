'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Wrench,
  FileText,
  ShoppingCart,
  Trash2,
  Printer,
  Send,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  buildWhatsAppWebUrl,
  formatCurrencyBRL,
  formatDateBR,
} from '@/lib/calculators/spintax-whatsapp';
import { ServiceOrder, ServiceOrderPartUsage } from '@/types/domain';

const DEFAULT_CHECKLIST_ITEMS = [
  'Liga normalmente',
  'Tela / Touch OK',
  'Câmeras Frontal/Traseira OK',
  'FaceID / TouchID OK',
  'Áudio / Microfone OK',
  'Conector de Carga OK',
  'Carcaça sem amassados graves',
];

export default function ManutencaoPage() {
  const {
    settings,
    customers,
    serviceOrders,
    visibleInvestments,
    inventory,
    addCustomer,
    addServiceOrder,
    updateServiceOrderStatus,
    confirmServiceOrderPartPurchase,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [orderType, setOrderType] = useState<'customer' | 'internal_stock'>(
    'customer'
  );

  // Cliente vindo da lista de clientes (com Autocomplete por Nome, Telefone ou CPF)
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustCpf, setNewCustCpf] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('55119');

  // Detalhamento Profissional do Aparelho e OS
  const [deviceBrand, setDeviceBrand] = useState('Apple');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceColor, setDeviceColor] = useState('Preto');
  const [deviceImei, setDeviceImei] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [checkedItems, setCheckedItems] = useState<string[]>([
    'Liga normalmente',
  ]);
  const [customChecklistNotes, setCustomChecklistNotes] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState(
    'Em análise técnica na bancada'
  );
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [servicePrice, setServicePrice] = useState('380');
  const [investmentId, setInvestmentId] = useState(
    visibleInvestments[0]?.id || 'loja'
  );
  const [inventoryItemId, setInventoryItemId] = useState('');

  // Peças Usadas na OS (Do estoque ou "Precisa ser comprada")
  const [usedParts, setUsedParts] = useState<ServiceOrderPartUsage[]>([]);
  const [partSourceMode, setPartSourceMode] = useState<'stock' | 'buy'>(
    'stock'
  );
  const [selectedStockPartId, setSelectedStockPartId] = useState('');
  const [partToBuyName, setPartToBuyName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partEstimatedCost, setPartEstimatedCost] = useState('0');
  const [manualExtraPartsCost, setManualExtraPartsCost] = useState('0');

  // Modal: Confirmar Compra de Peça Pendente na OS
  const [buyingPartContext, setBuyingPartContext] = useState<{
    os: ServiceOrder;
    part: ServiceOrderPartUsage;
  } | null>(null);
  const [confirmBuyUnitCost, setConfirmBuyUnitCost] = useState('');
  const [confirmBuyQty, setConfirmBuyQty] = useState('1');
  const [confirmBuyResalePrice, setConfirmBuyResalePrice] = useState('');
  const [confirmBuySupplier, setConfirmBuySupplier] = useState('');

  // Modal: Visualizar / Imprimir / Enviar Ordem de Serviço Profissional para o Cliente
  const [viewingOsReceipt, setViewingOsReceipt] =
    useState<ServiceOrder | null>(null);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const filteredCustomerOptions = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone_whatsapp || '').toLowerCase().includes(q) ||
      (c.cpf || '').toLowerCase().includes(q)
    );
  });

  const stockPartsAvailable = inventory.filter(
    (i) => i.category === 'part' && i.status === 'in_stock' && i.quantity > 0
  );

  const handleToggleChecklistItem = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleAddPartToOs = () => {
    const qty = Math.max(1, Number(partQty) || 1);
    if (partSourceMode === 'stock') {
      const stockPart = inventory.find((i) => i.id === selectedStockPartId);
      if (!stockPart) return;
      const newPartUsage: ServiceOrderPartUsage = {
        id: `osp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        inventory_item_id: stockPart.id,
        part_name: `${stockPart.brand} ${stockPart.model}`.trim(),
        quantity: Math.min(stockPart.quantity, qty),
        unit_cost: Number(stockPart.purchase_cost) || 0,
        need_to_buy: false,
        bought: true,
      };
      setUsedParts((prev) => [...prev, newPartUsage]);
      setSelectedStockPartId('');
      setPartQty('1');
    } else {
      if (!partToBuyName.trim()) return;
      const newPartUsage: ServiceOrderPartUsage = {
        id: `osp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        inventory_item_id: null,
        part_name: partToBuyName.trim(),
        quantity: qty,
        unit_cost: Number(partEstimatedCost) || 0,
        need_to_buy: true,
        bought: false,
      };
      setUsedParts((prev) => [...prev, newPartUsage]);
      setPartToBuyName('');
      setPartEstimatedCost('0');
      setPartQty('1');
    }
  };

  const handleRemovePartFromOs = (id: string) => {
    setUsedParts((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPartsCostPreview =
    usedParts.reduce(
      (acc, p) => acc + (Number(p.unit_cost) || 0) * (Number(p.quantity) || 1),
      0
    ) + (Number(manualExtraPartsCost) || 0);

  const handleOpenNewOsModal = () => {
    setOrderType('customer');
    setSelectedCustomerId(customers[0]?.id || '');
    setCustomerSearch('');
    setDeviceBrand('Apple');
    setDeviceModel('');
    setDeviceColor('Preto');
    setDeviceImei('');
    setDevicePassword('');
    setCheckedItems(['Liga normalmente']);
    setCustomChecklistNotes('');
    setReportedDefect('');
    setTechnicalDiagnosis('Em análise técnica na bancada');
    setWarrantyDays('90');
    setServicePrice('380');
    setUsedParts([]);
    setManualExtraPartsCost('0');
    setShowModal(true);
  };

  const handleQuickCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim()) return;
    const created = addCustomer({
      name: newCustName.trim(),
      cpf: newCustCpf.trim() || '000.000.000-00',
      phone_whatsapp: newCustPhone.trim(),
      whatsapp_opt_in: true,
      credit_score: 'bom',
      address: 'Cadastrado na OS',
    });
    setSelectedCustomerId(created.id);
    setNewCustName('');
    setNewCustCpf('');
    setShowNewCustomerModal(false);
  };

  const handleCreateOs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceModel.trim() || !reportedDefect.trim()) return;
    if (orderType === 'customer' && !selectedCustomer) {
      alert('Selecione um cliente da lista (ou cadastre em + Novo Cliente).');
      return;
    }

    const checklistSummary = [
      checkedItems.length > 0 ? `Checklist OK: ${checkedItems.join(', ')}` : '',
      customChecklistNotes.trim() ? `Obs Entrada: ${customChecklistNotes.trim()}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    const finalUsedParts = [...usedParts];
    if (Number(manualExtraPartsCost) > 0 && finalUsedParts.length === 0) {
      finalUsedParts.push({
        id: `osp-${Date.now()}`,
        inventory_item_id: null,
        part_name: 'Insumos / Peças Gerais de Bancada',
        quantity: 1,
        unit_cost: Number(manualExtraPartsCost) || 0,
        need_to_buy: false,
        bought: true,
      });
    }

    const hasPartToBuy = finalUsedParts.some(
      (p) => p.need_to_buy && !p.bought
    );

    addServiceOrder({
      order_type: orderType,
      customer_id: orderType === 'customer' ? selectedCustomer!.id : null,
      customer_name:
        orderType === 'internal_stock'
          ? 'Estoque Interno (Reforma de Troca)'
          : selectedCustomer!.name,
      customer_phone:
        orderType === 'internal_stock'
          ? '-'
          : selectedCustomer!.phone_whatsapp,
      customer_cpf:
        orderType === 'internal_stock' ? undefined : selectedCustomer!.cpf,
      inventory_item_id:
        orderType === 'internal_stock' && inventoryItemId
          ? inventoryItemId
          : null,
      investment_id:
        orderType === 'internal_stock'
          ? investmentId || visibleInvestments[0]?.id || 'loja'
          : 'loja',
      device_brand: deviceBrand.trim() || 'Apple',
      device_model: deviceModel.trim(),
      device_color: deviceColor.trim(),
      device_password: devicePassword.trim(),
      imei: deviceImei.trim(),
      entry_checklist: checklistSummary,
      reported_defect: reportedDefect.trim(),
      technical_diagnosis: technicalDiagnosis.trim() || 'Em análise na bancada',
      used_parts: finalUsedParts,
      parts_cost: totalPartsCostPreview,
      service_price:
        orderType === 'internal_stock' ? 0 : Number(servicePrice) || 0,
      status: hasPartToBuy ? 'aguardando_peca' : 'em_bancada',
      warranty_days: Number(warrantyDays) || 90,
    });

    setShowModal(false);
  };

  const handleOpenConfirmBuyModal = (
    os: ServiceOrder,
    part: ServiceOrderPartUsage
  ) => {
    setBuyingPartContext({ os, part });
    setConfirmBuyUnitCost(
      part.unit_cost > 0 ? String(part.unit_cost) : '150'
    );
    setConfirmBuyQty(String(part.quantity || 1));
    setConfirmBuyResalePrice('');
    setConfirmBuySupplier('');
  };

  const handleConfirmPartPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyingPartContext) return;
    confirmServiceOrderPartPurchase({
      serviceOrderId: buyingPartContext.os.id,
      partUsageId: buyingPartContext.part.id,
      unitCost: Number(confirmBuyUnitCost) || 0,
      quantityBought: Math.max(
        buyingPartContext.part.quantity,
        Number(confirmBuyQty) || buyingPartContext.part.quantity
      ),
      suggestedResalePrice: Number(confirmBuyResalePrice) || undefined,
      supplierNotes: confirmBuySupplier.trim() || undefined,
    });
    setBuyingPartContext(null);
  };

  const buildOsWhatsAppMessage = (os: ServiceOrder) => {
    const partsList =
      os.used_parts && os.used_parts.length > 0
        ? os.used_parts.map((p) => `${p.quantity}x ${p.part_name}`).join(', ')
        : 'Serviço técnico especializado';
    return [
      `*ORDEM DE SERVIÇO ${os.code} — ${settings.store_name}*`,
      `Cliente: ${os.customer_name}`,
      `Aparelho: ${os.device_brand || ''} ${os.device_model} ${os.device_color || ''} ${os.imei ? `(IMEI: ${os.imei})` : ''}`.trim(),
      `Defeito Relatado: ${os.reported_defect}`,
      `Laudo / Diagnóstico: ${os.technical_diagnosis}`,
      `Peças / Serviço: ${partsList}`,
      `Valor Total do Serviço: *${formatCurrencyBRL(os.service_price)}*`,
      `Garantia: ${os.warranty_days} dias`,
      `Status Atual: *${os.status.toUpperCase()}*`,
    ].join('\n');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Ordens de Serviço Profissionais (OS) • Bancada, Peças & Comprovante p/ Cliente
          </h1>
          <p className="text-xs text-slate-500">
            Vincule clientes da base, registre checklist de entrada, peças do estoque ou peças que precisam ser compradas e gere a OS para o cliente.
          </p>
        </div>
        <button
          onClick={handleOpenNewOsModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Ordem de Serviço (OS)</span>
        </button>
      </div>

      {/* Tabela de Ordens de Serviço */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2.5 px-3">OS / Data</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-3">Aparelho & Detalhes</th>
                <th className="py-2.5 px-3">Defeito, Laudo & Peças</th>
                <th className="py-2.5 px-3 text-right">Custo Peças</th>
                <th className="py-2.5 px-3 text-right">Valor Serviço</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">
                  Ações / Enviar OS ao Cliente
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Nenhuma Ordem de Serviço registrada. Clique em{' '}
                    <strong>Nova Ordem de Serviço (OS)</strong> para abrir.
                  </td>
                </tr>
              ) : (
                serviceOrders.map((os) => {
                  const pendingParts = (os.used_parts || []).filter(
                    (p) => p.need_to_buy && !p.bought
                  );

                  return (
                    <tr key={os.id} className="hover:bg-slate-50 align-top">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {os.code}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {formatDateBR(os.created_at)}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
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

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-800">
                          {os.customer_name}
                        </div>
                        {os.customer_phone && os.customer_phone !== '-' && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            {os.customer_phone}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">
                          {[os.device_brand, os.device_model, os.device_color]
                            .filter(Boolean)
                            .join(' ')}
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          {os.imei && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              IMEI: {os.imei}
                            </span>
                          )}
                          {os.device_password && (
                            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                              Senha: {os.device_password}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 max-w-xs">
                        <div className="font-semibold text-slate-800">
                          {os.reported_defect}
                        </div>
                        {os.technical_diagnosis && (
                          <div className="text-[11px] text-slate-500">
                            Laudo: {os.technical_diagnosis}
                          </div>
                        )}
                        {os.used_parts && os.used_parts.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {os.used_parts.map((part) => (
                              <div
                                key={part.id}
                                className="flex items-center justify-between gap-2 text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">
                                    {part.quantity}x {part.part_name}
                                  </span>{' '}
                                  {part.need_to_buy && !part.bought ? (
                                    <span className="text-amber-700 font-bold">
                                      (A Comprar)
                                    </span>
                                  ) : (
                                    <span className="text-emerald-700 font-semibold">
                                      ({formatCurrencyBRL(part.unit_cost)}/un.)
                                    </span>
                                  )}
                                </div>
                                {part.need_to_buy && !part.bought && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenConfirmBuyModal(os, part)
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer shrink-0"
                                  >
                                    <ShoppingCart className="w-2.5 h-2.5" />
                                    <span>Confirmar Compra da Peça</span>
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right text-rose-600 font-semibold">
                        -{formatCurrencyBRL(os.parts_cost)}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {os.order_type === 'customer'
                          ? formatCurrencyBRL(os.service_price)
                          : 'Interno (Troca)'}
                      </td>

                      <td className="py-2.5 px-3">
                        <select
                          value={os.status}
                          onChange={(e) =>
                            updateServiceOrderStatus(
                              os.id,
                              e.target.value as ServiceOrder['status']
                            )
                          }
                          className={`px-2 py-1 rounded border text-[11px] font-bold ${
                            os.status === 'aguardando_peca'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : os.status === 'pronto' ||
                                os.status === 'entregue'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-white border-slate-300 text-slate-800'
                          }`}
                        >
                          <option value="orcamento">Orçamento</option>
                          <option value="aprovado">Aprovado</option>
                          <option value="aguardando_peca">
                            Aguardando Peça
                          </option>
                          <option value="em_bancada">Em Bancada</option>
                          <option value="pronto">Pronto</option>
                          <option value="entregue">Entregue</option>
                        </select>
                        {pendingParts.length > 0 && (
                          <div className="text-[10px] text-amber-700 font-bold mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{pendingParts.length} peça(s) p/ comprar</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setViewingOsReceipt(os)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold cursor-pointer"
                        >
                          <FileText className="w-3 h-3 text-cyan-400" />
                          <span>Ordem de Serviço / Cliente</span>
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

      {/* Modal: Confirmar Compra da Peça (Adiciona no Estoque de Peças + Informa Custo na OS) */}
      {buyingPartContext && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <div className="flex items-start gap-2.5 border-b border-slate-200 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Confirmar Compra da Peça — {buyingPartContext.os.code}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Peça: <strong>{buyingPartContext.part.part_name}</strong> (Uso na OS:{' '}
                  {buyingPartContext.part.quantity} un.)
                </p>
              </div>
            </div>

            <form
              onSubmit={handleConfirmPartPurchaseSubmit}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Custo Pago na Peça (R$ Unit.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    autoFocus
                    placeholder="Ex: 140.00"
                    value={confirmBuyUnitCost}
                    onChange={(e) => setConfirmBuyUnitCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-amber-400 bg-amber-50/40 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Qtd Total Comprada *
                  </label>
                  <input
                    type="number"
                    min={buyingPartContext.part.quantity}
                    required
                    value={confirmBuyQty}
                    onChange={(e) => setConfirmBuyQty(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-400">
                    Se comprou mais que {buyingPartContext.part.quantity}, o saldo fica no Estoque de Peças.
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fornecedor / Observação da Compra (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Distribuidora Centro — Garantia 90d"
                  value={confirmBuySupplier}
                  onChange={(e) => setConfirmBuySupplier(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>O que acontecerá ao confirmar:</span>
                </div>
                <p>
                  1. A peça será registrada no <strong>Estoque de Peças</strong> com custo de{' '}
                  <strong>
                    {formatCurrencyBRL(Number(confirmBuyUnitCost) || 0)}
                  </strong>
                  .
                </p>
                <p>
                  2. O custo de peças da <strong>{buyingPartContext.os.code}</strong> será atualizado automaticamente e o status irá para{' '}
                  <strong>Em Bancada</strong>.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBuyingPartContext(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  Confirmar Compra & Vincular na OS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ordem de Serviço Profissional (Para Imprimir ou Mandar no WhatsApp do Cliente) */}
      {viewingOsReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 shadow-2xl text-xs max-h-[92vh] overflow-y-auto">
            {/* Cabeçalho da OS */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
              <div>
                <h2 className="text-base font-black text-slate-900 uppercase">
                  {settings.store_name}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Assistência Técnica Especializada & Ordem de Serviço Oficial
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-cyan-700">
                  {viewingOsReceipt.code}
                </div>
                <div className="text-[11px] text-slate-500">
                  Entrada: {formatDateBR(viewingOsReceipt.created_at)}
                </div>
              </div>
            </div>

            {/* Dados do Cliente e Aparelho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Dados do Cliente
                </div>
                <div className="font-bold text-slate-900 text-xs">
                  {viewingOsReceipt.customer_name}
                </div>
                <div className="text-slate-600">
                  WhatsApp: {viewingOsReceipt.customer_phone}
                </div>
                {viewingOsReceipt.customer_cpf && (
                  <div className="text-slate-600">
                    CPF: {viewingOsReceipt.customer_cpf}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Identificação do Aparelho
                </div>
                <div className="font-bold text-slate-900 text-xs">
                  {[
                    viewingOsReceipt.device_brand,
                    viewingOsReceipt.device_model,
                    viewingOsReceipt.device_color,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </div>
                <div className="text-slate-600 font-mono">
                  IMEI / Série: {viewingOsReceipt.imei || 'Não informado'}
                </div>
                {viewingOsReceipt.device_password && (
                  <div className="text-slate-600">
                    Senha de Teste: {viewingOsReceipt.device_password}
                  </div>
                )}
              </div>
            </div>

            {/* Checklist, Defeito e Laudo Técnico */}
            <div className="space-y-2.5 border border-slate-200 rounded-xl p-3.5">
              {viewingOsReceipt.entry_checklist && (
                <div>
                  <span className="font-bold text-slate-700">
                    Checklist de Entrada:{' '}
                  </span>
                  <span className="text-slate-600">
                    {viewingOsReceipt.entry_checklist}
                  </span>
                </div>
              )}
              <div>
                <span className="font-bold text-slate-700">
                  Defeito Relatado / Serviço Solicitado:{' '}
                </span>
                <span className="text-slate-900 font-semibold">
                  {viewingOsReceipt.reported_defect}
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-700">
                  Diagnóstico / Laudo Técnico:{' '}
                </span>
                <span className="text-slate-700">
                  {viewingOsReceipt.technical_diagnosis}
                </span>
              </div>
            </div>

            {/* Peças Utilizadas e Resumo Financeiro para o Cliente */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800">
                Peças Utilizadas & Serviços Executados
              </div>
              <div className="p-3 space-y-2">
                {viewingOsReceipt.used_parts &&
                viewingOsReceipt.used_parts.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {viewingOsReceipt.used_parts.map((p) => (
                      <li key={p.id}>
                        <strong>
                          {p.quantity}x {p.part_name}
                        </strong>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600">
                    Mão de obra técnica especializada e insumos de bancada.
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-sm">
                  <span className="font-bold text-slate-700">
                    Garantia do Serviço: {viewingOsReceipt.warranty_days} dias
                  </span>
                  <span className="font-black text-emerald-700 text-base">
                    Total: {formatCurrencyBRL(viewingOsReceipt.service_price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Assinaturas */}
            <div className="grid grid-cols-2 gap-6 pt-6 text-center text-[11px] text-slate-500">
              <div className="border-t border-slate-400 pt-1">
                Assinatura Técnica — {settings.store_name}
              </div>
              <div className="border-t border-slate-400 pt-1">
                Assinatura do Cliente — {viewingOsReceipt.customer_name}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setViewingOsReceipt(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold cursor-pointer"
              >
                Fechar
              </button>
              {viewingOsReceipt.customer_phone &&
                viewingOsReceipt.customer_phone !== '-' && (
                  <a
                    href={buildWhatsAppWebUrl(
                      viewingOsReceipt.customer_phone,
                      buildOsWhatsAppMessage(viewingOsReceipt)
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar OS via WhatsApp p/ Cliente</span>
                  </a>
                )}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Ordem de Serviço Profissional */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 space-y-4 shadow-xl text-xs max-h-[92vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900">
              Nova Ordem de Serviço (OS) Profissional
            </h3>

            <form onSubmit={handleCreateOs} className="space-y-3.5">
              {/* Tipo de OS */}
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
                  👤 Cliente da Loja (Com Comprovante OS)
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
                  🔄 Reforma Interna (Aparelho do Estoque)
                </button>
              </div>

              {/* 1. Seleção do Cliente da Lista de Clientes (Com Autocomplete Nome, Telefone ou CPF) */}
              {orderType === 'customer' ? (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">
                      1. Selecionar Cliente da Base (Buscar por Nome, Telefone ou CPF) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
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
                        placeholder="Filtrar cliente por nome, telefone ou CPF..."
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          const matches = customers.filter((c) => {
                            const q = e.target.value.toLowerCase().trim();
                            return (
                              c.name.toLowerCase().includes(q) ||
                              (c.phone_whatsapp || '')
                                .toLowerCase()
                                .includes(q) ||
                              (c.cpf || '').toLowerCase().includes(q)
                            );
                          });
                          if (matches.length > 0) {
                            setSelectedCustomerId(matches[0].id);
                          }
                        }}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 bg-white"
                      />
                    </div>

                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
                    >
                      <option value="">Selecione o cliente...</option>
                      {filteredCustomerOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} • Tel: {c.phone_whatsapp}{' '}
                          {c.cpf ? `• CPF: ${c.cpf}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCustomer && (
                    <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        Cliente vinculado: <strong>{selectedCustomer.name}</strong>
                      </span>
                      <span>
                        WhatsApp: <strong>{selectedCustomer.phone_whatsapp}</strong> • CPF:{' '}
                        <strong>{selectedCustomer.cpf}</strong>
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
                  <label className="block font-bold text-indigo-950">
                    1. Selecionar Aparelho do Estoque para Reforma
                  </label>
                  <select
                    value={inventoryItemId}
                    onChange={(e) => {
                      setInventoryItemId(e.target.value);
                      const found = inventory.find(
                        (i) => i.id === e.target.value
                      );
                      if (found) {
                        setDeviceBrand(found.brand);
                        setDeviceModel(
                          `${found.model} ${found.storage || ''}`.trim()
                        );
                        setDeviceColor(found.color || '');
                        setDeviceImei(found.imei || '');
                        setInvestmentId(found.investment_id);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-indigo-300 bg-white font-semibold"
                  >
                    <option value="">Selecionar aparelho do estoque...</option>
                    {inventory
                      .filter(
                        (i) =>
                          i.category === 'device' &&
                          (i.status === 'in_stock' || i.status === 'in_repair')
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.brand} {item.model} ({item.color}) — IMEI:{' '}
                          {item.imei || 'S/N'}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* 2. Identificação Detalhada do Aparelho */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800">
                  2. Dados do Aparelho & Checklist de Entrada
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Marca
                    </label>
                    <input
                      type="text"
                      placeholder="Apple"
                      value={deviceBrand}
                      onChange={(e) => setDeviceBrand(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      Modelo do Aparelho *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: iPhone 15 Pro Max 256GB"
                      value={deviceModel}
                      onChange={(e) => setDeviceModel(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Cor
                    </label>
                    <input
                      type="text"
                      placeholder="Titânio"
                      value={deviceColor}
                      onChange={(e) => setDeviceColor(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Senha de Teste
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 123456"
                      value={devicePassword}
                      onChange={(e) => setDevicePassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      IMEI / Número de Série
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 3589012239104"
                      value={deviceImei}
                      onChange={(e) => setDeviceImei(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">
                      Observações Estéticas na Entrada
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Tampa traseira trincada, sem gaveta chip"
                      value={customChecklistNotes}
                      onChange={(e) => setCustomChecklistNotes(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DEFAULT_CHECKLIST_ITEMS.map((item) => {
                    const active = checkedItems.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleToggleChecklistItem(item)}
                        className={`px-2 py-1 rounded-md text-[10px] font-semibold border cursor-pointer ${
                          active
                            ? 'bg-cyan-50 border-cyan-400 text-cyan-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        {active ? '✓ ' : '+ '}
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Defeito Relatado e Diagnóstico */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Defeito Relatado / Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Troca de Tela Frontal + Bateria"
                    value={reportedDefect}
                    onChange={(e) => setReportedDefect(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Diagnóstico / Laudo Técnico
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Display danificado por queda, placa íntegra"
                    value={technicalDiagnosis}
                    onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              {/* 4. Peças Usadas na OS ou "Peça Precisa Ser Comprada" */}
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" />
                    <span>
                      3. Peças Utilizadas na OS (Do Estoque ou Solicitar Compra)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPartSourceMode('stock')}
                      className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        partSourceMode === 'stock'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-300'
                      }`}
                    >
                      Usar Peça do Estoque ({stockPartsAvailable.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartSourceMode('buy')}
                      className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        partSourceMode === 'buy'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white text-amber-800 border border-amber-300'
                      }`}
                    >
                      🛒 Peça Precisa Ser Comprada
                    </button>
                  </div>
                </div>

                {partSourceMode === 'stock' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-2">
                      <select
                        value={selectedStockPartId}
                        onChange={(e) => setSelectedStockPartId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold"
                      >
                        <option value="">
                          Selecionar peça em estoque...
                        </option>
                        {stockPartsAvailable.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.brand} {p.model} (Saldo: {p.quantity} • Custo:{' '}
                            {formatCurrencyBRL(p.purchase_cost)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPartToOs}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
                    >
                      + Vincular Peça
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        placeholder="Nome da peça a comprar (Ex: Tela iPhone 15 Pro)"
                        value={partToBuyName}
                        onChange={(e) => setPartToBuyName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-400 bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={partQty}
                        onChange={(e) => setPartQty(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Custo Previsto (Opcional)"
                        value={partEstimatedCost}
                        onChange={(e) => setPartEstimatedCost(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-amber-300 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPartToOs}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold cursor-pointer"
                    >
                      + Marcar p/ Comprar
                    </button>
                  </div>
                )}

                {usedParts.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {usedParts.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px]"
                      >
                        <div>
                          <span className="font-bold text-slate-900">
                            {p.quantity}x {p.part_name}
                          </span>{' '}
                          {p.need_to_buy ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                              Precisa Comprar (Custo est.:{' '}
                              {formatCurrencyBRL(p.unit_cost)})
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              Do Estoque ({formatCurrencyBRL(p.unit_cost)}/un.)
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePartFromOs(p.id)}
                          className="text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Valores e Garantia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Custo Extra de Bancada (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualExtraPartsCost}
                    onChange={(e) => setManualExtraPartsCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
                  />
                  <span className="text-[10px] text-slate-500">
                    Custo Total Peças:{' '}
                    <strong>{formatCurrencyBRL(totalPartsCostPreview)}</strong>
                  </span>
                </div>

                {orderType === 'customer' && (
                  <div>
                    <label className="block font-bold text-emerald-800 mb-1">
                      Valor Cobrado do Cliente (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-emerald-400 font-bold text-emerald-700"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Garantia (Dias)
                  </label>
                  <input
                    type="number"
                    value={warrantyDays}
                    onChange={(e) => setWarrantyDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold"
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
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold cursor-pointer"
                >
                  Salvar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rápido: Cadastrar Novo Cliente sem sair da OS */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-3 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Novo Cliente Rápido
            </h3>
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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
