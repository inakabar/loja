'use client';

import React, { useState } from 'react';
import { Plus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { formatCurrencyBRL } from '@/lib/calculators/spintax-whatsapp';

export default function ClientesPage() {
  const { customers, installments, addCustomer, toggleCustomerOptIn } =
    useStore();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('55119');
  const [address, setAddress] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addCustomer({
      name: name.trim(),
      cpf: cpf.trim() || '000.000.000-00',
      phone_whatsapp: phone.replace(/\D/g, ''),
      address: address.trim(),
      whatsapp_opt_in: true,
      credit_score: 'bom',
    });
    setName('');
    setCpf('');
    setAddress('');
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Clientes & Status Opt-In WhatsApp
          </h1>
          <p className="text-xs text-slate-500">
            Tabela de clientes com saldo em aberto no crediário e autorização de cobrança via WhatsApp.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Cliente</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2 px-3">Nome</th>
                <th className="py-2 px-3">CPF</th>
                <th className="py-2 px-3">WhatsApp</th>
                <th className="py-2 px-3">Endereço</th>
                <th className="py-2 px-3 text-right">Parcelas Abertas</th>
                <th className="py-2 px-3 text-right">Saldo Devedor</th>
                <th className="py-2 px-3">Opt-In WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => {
                const custInstallments = installments.filter(
                  (i) => i.customer_id === c.id && i.status !== 'paid'
                );
                const openBalance = custInstallments.reduce(
                  (acc, i) => acc + i.original_amount,
                  0
                );

                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">
                      {c.name}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{c.cpf}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {c.phone_whatsapp}
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {c.address || '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {custInstallments.length}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrencyBRL(openBalance)}
                    </td>
                    <td className="py-2 px-3">
                      <button
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
            <h3 className="text-sm font-bold text-slate-900">Novo Cliente</h3>
            <form onSubmit={handleCreate} className="space-y-2.5">
              <input
                type="text"
                required
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                placeholder="CPF"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                required
                placeholder="WhatsApp (55119...)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
              <input
                type="text"
                placeholder="Endereço"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300"
              />
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
