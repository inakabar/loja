'use client';

import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  ShieldAlert,
  Pencil,
  Search,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import {
  formatCPF,
  formatCurrencyBRL,
  isValidCPF,
} from '@/lib/calculators/spintax-whatsapp';
import { Customer } from '@/types/domain';

export default function ClientesPage() {
  const {
    customers,
    installments,
    hasRole,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    toggleCustomerOptIn,
  } = useStore();

  const isAdmin = hasRole('admin');

  const [searchQuery, setSearchQuery] = useState('');

  // Modal Novo Cliente
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('55119');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // Modal Editar Cliente
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCreditScore, setEditCreditScore] =
    useState<Customer['credit_score']>('bom');
  const [editNotes, setEditNotes] = useState('');
  const [editOptIn, setEditOptIn] = useState(true);
  const [editError, setEditError] = useState('');

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cpf || '').toLowerCase().includes(q) ||
      (c.phone_whatsapp || '').toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  const handleOpenNewModal = () => {
    setName('');
    setCpf('');
    setPhone('55119');
    setAddress('');
    setNotes('');
    setFormError('');
    setShowModal(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) return;

    const cleanCpf = cpf.trim();
    if (cleanCpf && !isValidCPF(cleanCpf)) {
      setFormError(
        'CPF inválido! Digite um CPF válido ou deixe em branco (obrigatório apenas para Crediário).'
      );
      return;
    }

    addCustomer({
      name: name.trim(),
      cpf: cleanCpf ? formatCPF(cleanCpf) : '',
      phone_whatsapp: phone.replace(/\D/g, ''),
      address: address.trim(),
      notes: notes.trim() || undefined,
      whatsapp_opt_in: true,
      credit_score: 'bom',
    });
    setShowModal(false);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditCpf(
      c.cpf && c.cpf !== '000.000.000-00' ? formatCPF(c.cpf) : ''
    );
    setEditPhone(c.phone_whatsapp || '');
    setEditAddress(c.address || '');
    setEditCreditScore(c.credit_score || 'bom');
    setEditNotes(c.notes || '');
    setEditOptIn(c.whatsapp_opt_in !== false);
    setEditError('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName.trim()) return;
    setEditError('');

    const cleanCpf = editCpf.trim();
    if (cleanCpf && !isValidCPF(cleanCpf)) {
      setEditError(
        'CPF inválido! Confira os 11 dígitos ou deixe em branco (obrigatório apenas se o cliente for usar o Crediário).'
      );
      return;
    }

    updateCustomer(editingCustomer.id, {
      name: editName.trim(),
      cpf: cleanCpf ? formatCPF(cleanCpf) : '',
      phone_whatsapp: editPhone.replace(/\D/g, ''),
      address: editAddress.trim(),
      credit_score: editCreditScore,
      notes: editNotes.trim() || undefined,
      whatsapp_opt_in: editOptIn,
    });
    setEditingCustomer(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Cadastro e Edição de Clientes • CPF Validado & Opt-In WhatsApp
          </h1>
          <p className="text-xs text-slate-500">
            Edite dados cadastrais a qualquer momento. O CPF é formatado e validado automaticamente (opcional para vendas à vista/OS e obrigatório para o Crediário).
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      {/* Barra de Busca de Clientes */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar cliente por Nome, CPF, Telefone ou Endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white"
          />
        </div>
        <span className="text-[11px] text-slate-500 font-semibold">
          {filteredCustomers.length} cliente(s)
        </span>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2.5 px-3">Nome / Observações</th>
                <th className="py-2.5 px-3">CPF & Aptidão Crediário</th>
                <th className="py-2.5 px-3">WhatsApp</th>
                <th className="py-2.5 px-3">Endereço</th>
                <th className="py-2.5 px-3 text-right">Parcelas Abertas</th>
                <th className="py-2.5 px-3 text-right">Saldo Devedor</th>
                <th className="py-2.5 px-3">Opt-In WhatsApp</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Nenhum cliente encontrado. Clique em{' '}
                    <strong>Novo Cliente</strong> para cadastrar.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const custInstallments = installments.filter(
                    (i) =>
                      i.customer_id === c.id &&
                      i.status !== 'paid' &&
                      i.status !== 'loss'
                  );
                  const openBalance = custInstallments.reduce(
                    (acc, i) => acc + i.original_amount,
                    0
                  );
                  const cpfValid = isValidCPF(c.cpf);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.notes && (
                          <div className="text-[10px] text-slate-500">
                            {c.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {cpfValid ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800">
                              {formatCPF(c.cpf)}
                            </div>
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-0.5">
                              ✓ CPF Válido (Liberado Crediário)
                            </span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-slate-400 italic text-[11px]">
                              Não informado
                            </div>
                            <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-0.5">
                              Só À Vista / OS (Sem CPF p/ Crediário)
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {c.phone_whatsapp}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600">
                        {c.address || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-right font-semibold">
                        {custInstallments.length}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrencyBRL(openBalance)}
                      </td>

                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => toggleCustomerOptIn(c.id)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer ${
                            c.whatsapp_opt_in
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.whatsapp_opt_in ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Confirmado</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3" />
                              <span>Pendente</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3 text-emerald-600" />
                            <span>Editar</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Deseja realmente excluir o cliente "${c.name}" do sistema?`
                                  )
                                ) {
                                  deleteCustomer(c.id);
                                }
                              }}
                              title="Excluir Cliente (Admin)"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-800 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Excluir</span>
                            </button>
                          )}
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

      {/* Modal: Cadastrar Novo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3.5 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Novo Cliente
            </h3>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    CPF (Opcional • Obrigatório p/ Crediário)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => {
                      setCpf(formatCPF(e.target.value));
                      setFormError('');
                    }}
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      cpf.trim()
                        ? isValidCPF(cpf)
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900 font-bold'
                          : 'border-rose-400 bg-rose-50/30 text-rose-900'
                        : 'border-slate-300'
                    }`}
                  />
                  {cpf.trim() && (
                    <span
                      className={`text-[10px] font-bold block mt-0.5 ${
                        isValidCPF(cpf) ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isValidCPF(cpf)
                        ? '✓ CPF válido'
                        : '✗ CPF inválido (verifique os dígitos)'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="5511999999999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Endereço (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Referência, trabalho, observações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Informações do Cliente */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3.5 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Editar Cliente — {editingCustomer.name}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    CPF (Obrigatório p/ Crediário)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={editCpf}
                    onChange={(e) => {
                      setEditCpf(formatCPF(e.target.value));
                      setEditError('');
                    }}
                    className={`w-full px-3 py-2 rounded-lg border font-mono ${
                      editCpf.trim()
                        ? isValidCPF(editCpf)
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-900 font-bold'
                          : 'border-rose-400 bg-rose-50/30 text-rose-900'
                        : 'border-slate-300'
                    }`}
                  />
                  {editCpf.trim() && (
                    <span
                      className={`text-[10px] font-bold block mt-0.5 ${
                        isValidCPF(editCpf)
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      {isValidCPF(editCpf)
                        ? '✓ CPF válido'
                        : '✗ CPF inválido (verifique os dígitos)'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Classificação de Crédito
                  </label>
                  <select
                    value={editCreditScore}
                    onChange={(e) =>
                      setEditCreditScore(
                        e.target.value as Customer['credit_score']
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  >
                    <option value="excelente">Excelente</option>
                    <option value="bom">Bom</option>
                    <option value="atencao">Atenção</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={editOptIn}
                      onChange={(e) => setEditOptIn(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>Autoriza WhatsApp (Opt-In)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Referência, local de trabalho..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
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
