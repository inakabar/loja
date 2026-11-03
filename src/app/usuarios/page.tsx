'use client';

import React, { useState } from 'react';
import { ShieldCheck, Plus, Check } from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { USER_ROLE_LABELS, UserRole } from '@/types/domain';

const ALL_ROLES: UserRole[] = [
  'cobranca',
  'venda_loja',
  'venda_investimento',
  'manutencao',
  'admin',
];

export default function UsuariosPage() {
  const {
    users,
    investments,
    currentUser,
    setCurrentUserId,
    addUser,
    updateUser,
    toggleUserAccessOnInvestment,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['cobranca']);
  const [selectedInvs, setSelectedInvs] = useState<string[]>([
    investments[0]?.id || '',
  ]);

  const toggleRoleInForm = (r: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  };

  const toggleInvInForm = (id: string) => {
    setSelectedInvs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addUser({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@loja.com`,
      roles: selectedRoles.length > 0 ? selectedRoles : ['cobranca'],
      allowed_investment_ids: selectedInvs,
    });
    setName('');
    setEmail('');
    setShowModal(false);
  };

  const handleToggleUserRole = (userId: string, role: UserRole) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const has = target.roles.includes(role);
    const nextRoles = has
      ? target.roles.filter((r) => r !== role)
      : [...target.roles, role];
    if (nextRoles.length === 0) return; // Garante ao menos 1 perfil
    updateUser(userId, { roles: nextRoles });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Usuários, Múltiplos Perfis (N por Usuário) & Acesso às Planilhas
          </h1>
          <p className="text-xs text-slate-500">
            Marque quantas funções cada usuário exerce (Cobrança, Venda da Loja, Venda dos Investimentos, Manutenção, Admin) e quais planilhas ele pode acessar/cobrar.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Matriz Limpa em Tabela: Usuários x Perfis x Planilhas */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2.5 px-3">Usuário</th>
                <th className="py-2.5 px-3">
                  Perfis Atribuídos (Clique para marcar/desmarcar N perfis)
                </th>
                <th className="py-2.5 px-3">
                  Planilhas Liberadas (Cobrança / Vendas de Investimento)
                </th>
                <th className="py-2.5 px-3 text-right">Simular Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.roles.includes('admin');
                const isCurrent = u.id === currentUser.id;

                return (
                  <tr
                    key={u.id}
                    className={
                      isCurrent ? 'bg-emerald-50/40' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 px-3 align-top">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    {/* N Perfis por Usuário */}
                    <td className="py-3 px-3 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_ROLES.map((role) => {
                          const active = u.roles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handleToggleUserRole(u.id, role)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer flex items-center gap-1 ${
                                active
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 text-emerald-400" />}
                              <span>{USER_ROLE_LABELS[role]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Planilhas a que tem acesso */}
                    <td className="py-3 px-3 align-top">
                      {isAdmin ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          Acesso Total a Todas as Planilhas (Admin)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {investments.map((inv) => {
                            const allowed = (
                              inv.allowed_user_ids || []
                            ).includes(u.id);
                            return (
                              <button
                                key={inv.id}
                                type="button"
                                onClick={() =>
                                  toggleUserAccessOnInvestment(inv.id, u.id)
                                }
                                className={`px-2 py-1 rounded text-[11px] font-semibold border cursor-pointer flex items-center gap-1 ${
                                  allowed
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {allowed && <Check className="w-3 h-3" />}
                                <span>{inv.name.split('—')[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 align-top text-right">
                      {isCurrent ? (
                        <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          Logado Agora
                        </span>
                      ) : (
                        <button
                          onClick={() => setCurrentUserId(u.id)}
                          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          Entrar com este Usuário
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Novo Usuário
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome do Colaborador
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Juliana (Cobrança e Vendas)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="juliana@loja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Perfis de Acesso (Selecione 1 ou mais)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoleInForm(r)}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold border cursor-pointer ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {USER_ROLE_LABELS[r]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Planilhas de Investimento Permitidas
                </label>
                <div className="space-y-1.5">
                  {investments.map((inv) => (
                    <label
                      key={inv.id}
                      className="flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedInvs.includes(inv.id)}
                        onChange={() => toggleInvInForm(inv.id)}
                        className="rounded border-slate-300 text-emerald-600"
                      />
                      <span>{inv.name}</span>
                    </label>
                  ))}
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
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
