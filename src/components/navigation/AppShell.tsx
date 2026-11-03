'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  ShoppingBag,
  MessageSquareWarning,
  Smartphone,
  Wrench,
  Users,
  ShieldCheck,
  Settings,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { StoreProvider, useStore } from '@/lib/context/StoreContext';
import { calculateInstallmentLateFees } from '@/lib/calculators/crediario';
import { USER_ROLE_LABELS, UserRole } from '@/types/domain';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRoles?: UserRole[];
  badge?: string | null;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Resumo Geral',
    icon: LayoutDashboard,
  },
  {
    href: '/investimentos',
    label: 'Planilhas / Investimentos',
    icon: FileSpreadsheet,
    requiredRoles: ['admin', 'venda_investimento', 'cobranca'],
  },
  {
    href: '/vendas',
    label: 'PDV (Vendas & Troca)',
    icon: ShoppingBag,
    requiredRoles: ['admin', 'venda_loja', 'venda_investimento'],
  },
  {
    href: '/cobrancas',
    label: 'Cobranças & WhatsApp',
    icon: MessageSquareWarning,
    requiredRoles: ['admin', 'cobranca'],
    badge: 'alert',
  },
  {
    href: '/estoque',
    label: 'Estoque Geral',
    icon: Smartphone,
    requiredRoles: ['admin', 'venda_loja', 'venda_investimento'],
  },
  {
    href: '/manutencao',
    label: 'Manutenção (OS)',
    icon: Wrench,
    requiredRoles: ['admin', 'manutencao'],
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: Users,
  },
  {
    href: '/usuarios',
    label: 'Usuários & Perfis',
    icon: ShieldCheck,
    requiredRoles: ['admin'],
  },
  {
    href: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    requiredRoles: ['admin'],
  },
];

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    settings,
    installments,
    users,
    currentUser,
    setCurrentUserId,
    hasRole,
    canAccessInvestment,
  } = useStore();

  // Conta apenas os atrasos das planilhas que o usuário atual tem permissão para cobrar
  const accessibleOverdueCount = installments.filter((inst) => {
    if (inst.status === 'paid' || inst.status === 'loss') return false;
    if (!canAccessInvestment(inst.investment_id)) return false;
    const b = calculateInstallmentLateFees(inst, settings);
    return b.isOverdue || b.isDueToday || inst.status === 'overdue';
  }).length;

  const visibleNavItems = navItems.filter((item) => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    return item.requiredRoles.some((r) => hasRole(r));
  });

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 border-r border-slate-800">
      <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-xs tracking-tight text-white">
              {settings.store_name.split(' ')[0] || 'PrimeCell'} ERP
            </h1>
            <p className="text-[10px] text-slate-400">
              Planilhas • Crediário • OS
            </p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-slate-400 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge === 'alert' && accessibleOverdueCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500 text-white">
                  {accessibleOverdueCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Resumo de Perfis do Usuário Ativo no Rodapé */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-1.5">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          Perfis Ativos ({currentUser.roles.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {currentUser.roles.map((r) => (
            <span
              key={r}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 font-medium"
            >
              {USER_ROLE_LABELS[r]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarContent()}
      </div>

      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col">
        {renderSidebarContent()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar Compacta com Seletor de Usuário / Perfis */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded border border-slate-200 text-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800">
              {settings.store_name}
            </span>
          </div>

          {/* Seletor de Usuário Logado para Testar Permissões e Planilhas */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Usuário:
              </span>
              <select
                value={currentUser.id}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} [{u.roles.map((r) => USER_ROLE_LABELS[r]).join(' + ')}]
                  </option>
                ))}
              </select>
            </div>

            <Link
              href="/usuarios"
              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
            >
              Perfis
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <ShellInner>{children}</ShellInner>
    </StoreProvider>
  );
}
