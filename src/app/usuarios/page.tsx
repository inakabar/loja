'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Check,
  KeyRound,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { AppUser, USER_ROLE_LABELS, UserRole } from '@/types/domain';

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
    addUser,
    updateUser,
    deleteUser,
    toggleUserAccessOnInvestment,
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>(['cobranca']);
  const [selectedInvs, setSelectedInvs] = useState<string[]>([]);

  // Controle de visualização/edição de senha por usuário
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

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
    if (!name.trim() || !username.trim() || !password.trim()) return;

    const cleanLogin = username.trim().toLowerCase().replace(/\s+/g, '.');
    addUser({
      name: name.trim(),
      username: cleanLogin,
      email: email.trim() || `${cleanLogin}@loja.com`,
      password: password.trim(),
      roles: selectedRoles.length > 0 ? selectedRoles : ['cobranca'],
      allowed_investment_ids: selectedInvs,
    });

    setName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setSelectedRoles(['cobranca']);
    setSelectedInvs([]);
    setShowModal(false);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditUsername(u.username || u.email.split('@')[0]);
    setEditEmail(u.email);
    setEditPassword(u.password || 'admin123');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editName.trim() || !editUsername.trim() || !editPassword.trim()) {
      return;
    }
    const cleanLogin = editUsername.trim().toLowerCase().replace(/\s+/g, '.');
    updateUser(editingUser.id, {
      name: editName.trim(),
      username: cleanLogin,
      email: editEmail.trim() || `${cleanLogin}@loja.com`,
      password: editPassword.trim(),
    });
    setEditingUser(null);
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

  const toggleShowPassword = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            Controle de Usuários, Senhas & Permissões de Acesso
          </h1>
          <p className="text-xs text-slate-500">
            Gerencie login, senha, múltiplos perfis (Cobrança, Venda da Loja, Venda dos Investimentos, Manutenção, Admin) e quais planilhas cada usuário pode acessar.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Tabela de Controle de Usuários */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2.5 px-3">Colaborador</th>
                <th className="py-2.5 px-3">Login & Senha</th>
                <th className="py-2.5 px-3">
                  Perfis de Acesso (N perfis por usuário)
                </th>
                <th className="py-2.5 px-3">
                  Planilhas Liberadas (Cobrança / Vendas)
                </th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isAdmin = u.roles.includes('admin');
                const isCurrent = u.id === currentUser.id;
                const pwdVisible = Boolean(visiblePasswords[u.id]);

                return (
                  <tr
                    key={u.id}
                    className={
                      !u.active
                        ? 'bg-rose-50/30 opacity-75'
                        : isCurrent
                        ? 'bg-emerald-50/30'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">
                          {u.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Você
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    {/* Login & Senha */}
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono text-xs font-bold text-slate-800">
                        @{u.username || u.email.split('@')[0]}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <code className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                          {pwdVisible ? u.password || 'admin123' : '••••••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(u.id)}
                          className="text-slate-400 hover:text-slate-700 cursor-pointer"
                          title={pwdVisible ? 'Ocultar senha' : 'Ver senha'}
                        >
                          {pwdVisible ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
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
                              {active && (
                                <Check className="w-3 h-3 text-emerald-400" />
                              )}
                              <span>{USER_ROLE_LABELS[role]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Planilhas a que tem acesso */}
                    <td className="py-3 px-3 align-top">
                      {isAdmin ? (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 inline-block">
                          Acesso Total a Todas as Planilhas (Admin)
                        </span>
                      ) : investments.length === 0 ? (
                        <span className="text-[11px] text-slate-400">
                          Nenhuma planilha criada ainda (
                          <Link
                            href="/investimentos"
                            className="text-emerald-600 underline font-semibold"
                          >
                            Criar Planilha
                          </Link>
                          )
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {investments.map((inv) => {
                            const allowed =
                              (inv.allowed_user_ids || []).includes(u.id) ||
                              (u.allowed_investment_ids || []).includes(inv.id);
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

                    {/* Status Ativo / Bloqueado */}
                    <td className="py-3 px-3 align-top">
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() =>
                          updateUser(u.id, { active: !u.active })
                        }
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        } ${isCurrent ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {u.active ? (
                          <>
                            <Unlock className="w-3 h-3" />
                            <span>Ativo</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Bloqueado</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Ações: Editar Login/Senha ou Excluir */}
                    <td className="py-3 px-3 align-top text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Login / Senha</span>
                        </button>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => deleteUser(u.id)}
                            className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastrar Novo Usuário */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Cadastrar Novo Usuário & Senha
            </h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bruno Silva"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!username) {
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .trim()
                          .split(/\s+/)[0] || ''
                      );
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Usuário (Login) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: bruno"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: bruno123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail (opcional)
                </label>
                <input
                  type="email"
                  placeholder="bruno@loja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Perfis de Acesso (Pode marcar vários)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_ROLES.map((r) => {
                    const active = selectedRoles.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRoleInForm(r)}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold border cursor-pointer flex items-center gap-1 ${
                          active
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {active && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                        <span>{USER_ROLE_LABELS[r]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {investments.length > 0 && !selectedRoles.includes('admin') && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Planilhas de Investimento Permitidas
                  </label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2">
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
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Login / Senha */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Editar Login e Senha — {editingUser.name}
            </h3>
            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Usuário (Login)
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nova Senha
                </label>
                <input
                  type="text"
                  required
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
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
