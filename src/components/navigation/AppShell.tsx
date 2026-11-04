'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  ShoppingCart,
  MessageSquareWarning,
  Package,
  Wrench,
  Users,
  Settings,
  Smartphone,
  Menu,
  X,
  ShieldCheck,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  Calculator,
} from 'lucide-react';
import { StoreProvider, useStore } from '@/lib/context/StoreContext';
import { calculateInstallmentLateFees } from '@/lib/calculators/crediario';
import { USER_ROLE_LABELS, UserRole } from '@/types/domain';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: 'alert';
  requiredRoles?: UserRole[];
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Resumo Geral',
    icon: LayoutDashboard,
    requiredRoles: ['admin', 'venda_investimento', 'venda_loja', 'cobranca'],
  },
  {
    href: '/investimentos',
    label: 'Planilhas / Investimentos',
    icon: Briefcase,
    requiredRoles: ['admin', 'venda_investimento', 'cobranca'],
  },
  {
    href: '/vendas',
    label: 'PDV (Vendas à Vista)',
    icon: ShoppingCart,
    requiredRoles: ['admin', 'venda_loja', 'venda_investimento'],
  },
  {
    href: '/crediario',
    label: 'Crediário & Troca',
    icon: Calculator,
    requiredRoles: ['admin', 'crediario'],
  },
  {
    href: '/cobrancas',
    label: 'Cobranças & WhatsApp',
    icon: MessageSquareWarning,
    badge: 'alert',
    requiredRoles: ['admin', 'cobranca'],
  },
  {
    href: '/estoque',
    label: 'Estoque Geral',
    icon: Package,
    requiredRoles: ['admin', 'venda_loja', 'venda_investimento', 'manutencao'],
  },
  {
    href: '/manutencao',
    label: 'Manutenção (OS)',
    icon: Wrench,
    requiredRoles: ['admin', 'manutencao', 'venda_loja'],
  },
  {
    href: '/clientes',
    label: 'Clientes',
    icon: Users,
    requiredRoles: ['admin', 'venda_loja', 'venda_investimento', 'cobranca'],
  },
  {
    href: '/usuarios',
    label: 'Controle de Usuários',
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

function LoginScreen() {
  const { login, settings, supabaseConnected } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = login(identifier, password);
    if (!res.ok) {
      setError(res.error || 'Falha ao autenticar.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">
                {settings.store_name}
              </h1>
              <p className="text-[11px] text-slate-400">
                Controle de Acesso & Perfis
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              supabaseConnected
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-amber-950/80 text-amber-300 border-amber-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                supabaseConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {supabaseConnected ? 'Supabase' : 'Local'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Usuário ou E-mail
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Ex: admin"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                required
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-9 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-[11px] font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Entrar no Sistema</span>
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Primeiro acesso Admin:</span>
          <code className="px-2 py-0.5 rounded bg-slate-950 text-emerald-300 border border-slate-800">
            admin / admin123
          </code>
        </div>
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const {
    isHydrated,
    isAuthenticated,
    supabaseConnected,
    settings,
    installments,
    currentUser,
    logout,
    hasRole,
    canAccessInvestment,
  } = useStore();

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        Sincronizando com o banco de dados...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

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

  // Verifica se o usuário autenticado tem permissão para a rota atual
  const matchedNavItem = navItems.find((item) =>
    item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href)
  );
  const isRouteAllowed =
    !matchedNavItem?.requiredRoles ||
    matchedNavItem.requiredRoles.some((r) => hasRole(r));

  const firstAllowedHref = visibleNavItems[0]?.href || '/';

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

      {/* Resumo de Perfis do Usuário Logado no Rodapé */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Perfis Ativos ({currentUser.roles.length})
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            @{currentUser.username}
          </span>
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
        {/* Topbar Compacta com Usuário Logado e Logout */}
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
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                supabaseConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={
                supabaseConnected
                  ? 'Conectado e sincronizado com o banco Supabase'
                  : 'Variáveis de ambiente do Supabase ausentes neste ambiente (usando cache local)'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {supabaseConnected ? 'Supabase Online' : 'Cache Local'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold text-slate-900">
                {currentUser.name}
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                ({currentUser.roles.map((r) => USER_ROLE_LABELS[r]).join(' + ')})
              </span>
            </div>

            {hasRole('admin') && (
              <Link
                href="/usuarios"
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-[11px] font-semibold text-slate-700"
              >
                Usuários & Senhas
              </Link>
            )}

            <button
              onClick={logout}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 cursor-pointer"
              title="Sair do sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-5 max-w-[1400px] w-full mx-auto">
          {isRouteAllowed ? (
            children
          ) : (
            <div className="bg-white border border-rose-200 rounded-xl p-6 text-center max-w-md mx-auto my-10 space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-sm font-bold text-slate-900">
                Acesso Restrito ao Seu Perfil
              </h2>
              <p className="text-xs text-slate-600">
                O usuário <strong>{currentUser.name}</strong> não possui permissão para acessar esta área.
              </p>
              <div className="pt-2">
                <Link
                  href={firstAllowedHref}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  Ir para Área Permitida
                </Link>
              </div>
            </div>
          )}
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
