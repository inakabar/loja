'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AppUser,
  CollectionLog,
  Customer,
  Installment,
  InventoryItem,
  Investment,
  InvestmentWithdrawal,
  Sale,
  ServiceOrder,
  StoreSettings,
  UserRole,
  WithdrawalReasonType,
} from '@/types/domain';
import { buildInitialSeed } from '@/lib/supabase/initial-seed';

const STORAGE_KEY = 'primecell_erp_clean_v1';
const AUTH_SESSION_KEY = 'primecell_auth_session_v1';

function addDays(baseDateStr: string, days: number): string {
  const d = new Date(`${baseDateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

async function persistTableToApi(table: string, data: unknown) {
  try {
    await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, data }),
    });
  } catch (err) {
    console.error(`Erro ao sincronizar tabela ${table}:`, err);
  }
}

export interface CreateCrediarioSaleInput {
  customerId: string;
  soldItemId: string;
  quantitySold?: number;
  salePrice: number;
  discount: number;
  cashDownPayment: number;
  hasTradeIn: boolean;
  tradeInBrand?: string;
  tradeInModel?: string;
  tradeInStorage?: string;
  tradeInColor?: string;
  tradeInImei?: string;
  tradeInBattery?: number;
  tradeInValue: number;
  tradeInSuggestedResalePrice?: number;
  tradeInNeedsRepair?: boolean;
  tradeInRepairDefect?: string;
  tradeInRepairPartsCost?: number;
  paymentType: 'avista' | 'crediario' | 'cartao';
  monthlyRatePercent: number;
  installmentsCount: number;
  suggestedInstallmentValue: number;
  finalInstallmentValue: number;
  firstDueDate: string;
  notes?: string;
}

export interface CreateMultiItemSaleInput {
  customerId?: string;
  items: Array<{
    itemId: string;
    quantity: number;
  }>;
  discount: number;
  discountReason?: string;
  paymentType: 'avista' | 'cartao';
  hasTradeIn?: boolean;
  tradeInBrand?: string;
  tradeInModel?: string;
  tradeInStorage?: string;
  tradeInColor?: string;
  tradeInImei?: string;
  tradeInBattery?: number;
  tradeInValue?: number;
  tradeInSuggestedResalePrice?: number;
  tradeInNeedsRepair?: boolean;
  tradeInRepairDefect?: string;
  tradeInRepairPartsCost?: number;
  notes?: string;
}

export interface CreateWithdrawalInput {
  investmentId: string;
  assetType: 'cash' | 'device';
  reasonType: WithdrawalReasonType;
  amount: number;
  inventoryItemId?: string | null;
  targetInvestmentId?: string | null;
  notes?: string;
}

interface StoreContextType {
  isHydrated: boolean;
  supabaseConnected: boolean;
  isAuthenticated: boolean;
  settings: StoreSettings;
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUserId: (userId: string) => void;
  login: (identifier: string, password: string) => {
    ok: boolean;
    error?: string;
  };
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  canAccessInvestment: (investmentId: string) => boolean;
  investments: Investment[];
  visibleInvestments: Investment[];
  withdrawals: InvestmentWithdrawal[];
  customers: Customer[];
  inventory: InventoryItem[];
  sales: Sale[];
  installments: Installment[];
  serviceOrders: ServiceOrder[];
  collectionLogs: CollectionLog[];
  updateSettings: (partial: Partial<StoreSettings>) => void;
  addUser: (input: {
    name: string;
    username: string;
    email: string;
    password: string;
    roles: UserRole[];
    allowed_investment_ids: string[];
  }) => void;
  updateUser: (
    userId: string,
    partial: Partial<
      Pick<
        AppUser,
        | 'name'
        | 'username'
        | 'email'
        | 'password'
        | 'roles'
        | 'allowed_investment_ids'
        | 'active'
      >
    >
  ) => void;
  deleteUser: (userId: string) => void;
  toggleUserAccessOnInvestment: (investmentId: string, userId: string) => void;
  addInvestment: (input: {
    name: string;
    description: string;
    initial_capital: number;
    start_date: string;
    allowed_user_ids?: string[];
    notes?: string;
  }) => void;
  createWithdrawal: (input: CreateWithdrawalInput) => void;
  addCustomer: (input: Omit<Customer, 'id' | 'created_at'>) => Customer;
  toggleCustomerOptIn: (customerId: string) => void;
  addInventoryItem: (
    input: Omit<InventoryItem, 'id' | 'created_at' | 'generation'> & {
      repair_cost?: number;
    }
  ) => void;
  updateInventoryItem: (
    itemId: string,
    partial: Partial<InventoryItem>
  ) => void;
  addPurchaseToInventoryItem: (
    itemId: string,
    entry: {
      quantity: number;
      unit_cost: number;
      extra_cost?: number;
      supplier_or_notes?: string;
      suggested_price?: number;
    }
  ) => void;
  createSaleWithTradeIn: (input: CreateCrediarioSaleInput) => Sale;
  createMultiItemSale: (input: CreateMultiItemSaleInput) => Sale;
  payInstallment: (input: {
    installmentId: string;
    paidAmount: number;
    lateFeeApplied: number;
    interestApplied: number;
    discountApplied?: number;
  }) => void;
  markInstallmentLoss: (installmentId: string) => void;
  addServiceOrder: (
    input: Omit<ServiceOrder, 'id' | 'code' | 'created_at'>
  ) => void;
  updateServiceOrderStatus: (
    id: string,
    status: ServiceOrder['status']
  ) => void;
  confirmServiceOrderPartPurchase: (input: {
    serviceOrderId: string;
    partUsageId: string;
    unitCost: number;
    quantityBought?: number;
    suggestedResalePrice?: number;
    supplierNotes?: string;
  }) => void;
  recordCollectionSent: (input: {
    installmentId: string;
    customerId: string;
    customerName: string;
    phoneWhatsapp: string;
    messageSent: string;
    delaySeconds: number;
    dispatchMode: 'connector' | 'web_fallback';
  }) => void;
  syncAllToSupabase: () => Promise<{ ok: boolean; message: string }>;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const seed = buildInitialSeed();
  const [isHydrated, setIsHydrated] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(seed.settings);
  const [users, setUsers] = useState<AppUser[]>(seed.users);
  const [currentUserId, setCurrentUserId] = useState<string>(seed.users[0].id);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [withdrawals, setWithdrawals] = useState<InvestmentWithdrawal[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [collectionLogs, setCollectionLogs] = useState<CollectionLog[]>([]);

  useEffect(() => {
    async function loadData() {
      // Limpa chaves antigas de demonstração
      try {
        localStorage.removeItem('istore_erp_state_v2');
      } catch {
        // ignore
      }

      let loadedUsers: AppUser[] = seed.users;

      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setSupabaseConnected(true);
            if (data.settings) setSettings(data.settings);
            if (data.users && data.users.length > 0) {
              loadedUsers = data.users;
              setUsers(data.users);
            }
            setInvestments(data.investments || []);
            setWithdrawals(data.withdrawals || []);
            setCustomers(data.customers || []);
            setInventory(data.inventory || []);
            setSales(data.sales || []);
            setInstallments(data.installments || []);
            setServiceOrders(data.serviceOrders || []);
            setCollectionLogs(data.collectionLogs || []);

            // Restaura sessão autenticada se válida
            try {
              const savedAuthUserId = localStorage.getItem(AUTH_SESSION_KEY);
              if (savedAuthUserId) {
                const found = loadedUsers.find(
                  (u) => u.id === savedAuthUserId && u.active !== false
                );
                if (found) {
                  setCurrentUserId(found.id);
                  setIsAuthenticated(true);
                }
              }
            } catch {
              // ignore
            }

            setIsHydrated(true);
            return;
          }
        }
      } catch (err) {
        console.error('Fallback para cache local:', err);
      }

      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.users && parsed.users.length > 0) {
            loadedUsers = parsed.users;
            setUsers(parsed.users);
          }
          if (parsed.investments) setInvestments(parsed.investments);
          if (parsed.withdrawals) setWithdrawals(parsed.withdrawals);
          if (parsed.customers) setCustomers(parsed.customers);
          if (parsed.inventory) setInventory(parsed.inventory);
          if (parsed.sales) setSales(parsed.sales);
          if (parsed.installments) setInstallments(parsed.installments);
          if (parsed.serviceOrders) setServiceOrders(parsed.serviceOrders);
          if (parsed.collectionLogs) setCollectionLogs(parsed.collectionLogs);
        }

        const savedAuthUserId = localStorage.getItem(AUTH_SESSION_KEY);
        if (savedAuthUserId) {
          const found = loadedUsers.find(
            (u) => u.id === savedAuthUserId && u.active !== false
          );
          if (found) {
            setCurrentUserId(found.id);
            setIsAuthenticated(true);
          }
        }
      } catch (e) {
        console.error('Erro ao hidratar estado local:', e);
      } finally {
        setIsHydrated(true);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings,
          users,
          currentUserId,
          investments,
          withdrawals,
          customers,
          inventory,
          sales,
          installments,
          serviceOrders,
          collectionLogs,
        })
      );
    } catch (e) {
      console.error('Erro ao salvar estado:', e);
    }
  }, [
    isHydrated,
    settings,
    users,
    currentUserId,
    investments,
    withdrawals,
    customers,
    inventory,
    sales,
    installments,
    serviceOrders,
    collectionLogs,
  ]);

  const currentUser =
    users.find((u) => u.id === currentUserId) || users[0] || seed.users[0];

  const login = (
    identifier: string,
    password: string
  ): { ok: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const target = users.find(
      (u) =>
        u.username?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === cleanId ||
        u.name?.toLowerCase() === cleanId
    );

    if (!target) {
      return { ok: false, error: 'Usuário ou e-mail não encontrado.' };
    }
    if (target.active === false) {
      return {
        ok: false,
        error: 'Este usuário está desativado. Contate o Administrador.',
      };
    }
    const expectedPwd = target.password || 'admin123';
    if (password !== expectedPwd) {
      return { ok: false, error: 'Senha incorreta.' };
    }

    setCurrentUserId(target.id);
    setIsAuthenticated(true);
    try {
      localStorage.setItem(AUTH_SESSION_KEY, target.id);
    } catch {
      // ignore
    }
    return { ok: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(AUTH_SESSION_KEY);
    } catch {
      // ignore
    }
  };

  const hasRole = (role: UserRole): boolean => {
    if (!currentUser) return false;
    if (currentUser.roles.includes('admin')) return true;
    return currentUser.roles.includes(role);
  };

  const canAccessInvestment = (investmentId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.roles.includes('admin')) return true;
    if (investmentId === 'loja') return hasRole('venda_loja');
    const inv = investments.find((i) => i.id === investmentId);
    const inUserList = currentUser.allowed_investment_ids?.includes(investmentId);
    const inInvList = inv?.allowed_user_ids?.includes(currentUser.id);
    return Boolean(inUserList || inInvList);
  };

  const visibleInvestments = investments.filter((inv) =>
    canAccessInvestment(inv.id)
  );

  const updateSettings = (partial: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      persistTableToApi('store_settings', next);
      return next;
    });
  };

  const addUser: StoreContextType['addUser'] = (input) => {
    const newUserId = `user-${Date.now()}`;
    const cleanUsername =
      input.username.trim().toLowerCase() ||
      input.email.split('@')[0].toLowerCase();
    const newUser: AppUser = {
      id: newUserId,
      name: input.name.trim(),
      username: cleanUsername,
      email: input.email.trim() || `${cleanUsername}@loja.com`,
      password: input.password || '123456',
      roles: input.roles.length > 0 ? input.roles : ['cobranca'],
      allowed_investment_ids: input.allowed_investment_ids,
      active: true,
      created_at: new Date().toISOString(),
    };
    setUsers((prev) => [...prev, newUser]);
    persistTableToApi('app_users', newUser);

    setInvestments((prev) =>
      prev.map((inv) => {
        if (!input.allowed_investment_ids.includes(inv.id)) return inv;
        const updated = {
          ...inv,
          allowed_user_ids: Array.from(
            new Set([...(inv.allowed_user_ids || []), newUserId])
          ),
        };
        persistTableToApi('investments', updated);
        return updated;
      })
    );
  };

  const updateUser: StoreContextType['updateUser'] = (userId, partial) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const updated = { ...u, ...partial };
        persistTableToApi('app_users', updated);
        return updated;
      })
    );
  };

  const deleteUser: StoreContextType['deleteUser'] = (userId) => {
    if (userId === currentUser.id) return;
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_row',
        table: 'app_users',
        id: userId,
      }),
    }).catch((err) => console.error('Erro ao excluir usuário:', err));
  };

  const toggleUserAccessOnInvestment = (
    investmentId: string,
    userId: string
  ) => {
    const inv = investments.find((i) => i.id === investmentId);
    if (!inv) return;
    const hasAccess = (inv.allowed_user_ids || []).includes(userId);

    setInvestments((prev) =>
      prev.map((i) => {
        if (i.id !== investmentId) return i;
        const current = new Set(i.allowed_user_ids || []);
        if (hasAccess) current.delete(userId);
        else current.add(userId);
        const updated = { ...i, allowed_user_ids: Array.from(current) };
        persistTableToApi('investments', updated);
        return updated;
      })
    );

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const current = new Set(u.allowed_investment_ids || []);
        if (hasAccess) current.delete(investmentId);
        else current.add(investmentId);
        const updated = { ...u, allowed_investment_ids: Array.from(current) };
        persistTableToApi('app_users', updated);
        return updated;
      })
    );
  };

  const addInvestment: StoreContextType['addInvestment'] = (input) => {
    const newInvId = `inv-${Date.now()}`;
    const allowedUsers =
      input.allowed_user_ids && input.allowed_user_ids.length > 0
        ? input.allowed_user_ids
        : [currentUser.id];

    const newInv: Investment = {
      id: newInvId,
      name: input.name,
      description: input.description,
      initial_capital: Number(input.initial_capital),
      start_date: input.start_date || getTodayStr(),
      status: 'active',
      allowed_user_ids: allowedUsers,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };
    setInvestments((prev) => [newInv, ...prev]);
    persistTableToApi('investments', newInv);
  };

  const createWithdrawal: StoreContextType['createWithdrawal'] = (input) => {
    const sourceInv = investments.find((i) => i.id === input.investmentId);
    if (!sourceInv) return;

    const targetInv = input.targetInvestmentId
      ? investments.find((i) => i.id === input.targetInvestmentId)
      : null;

    let itemName: string | null = null;
    let effectiveAmount = Number(input.amount) || 0;

    if (input.assetType === 'device' && input.inventoryItemId) {
      const targetItem = inventory.find((i) => i.id === input.inventoryItemId);
      if (targetItem) {
        itemName = `${targetItem.brand} ${targetItem.model} (${targetItem.imei || 'S/N'})`;
        if (effectiveAmount <= 0) {
          effectiveAmount =
            (targetItem.purchase_cost || 0) + (targetItem.repair_cost || 0);
        }

        if (
          input.reasonType === 'mover_planilha' &&
          input.targetInvestmentId
        ) {
          setInventory((prev) =>
            prev.map((item) => {
              if (item.id !== targetItem.id) return item;
              const updated = {
                ...item,
                investment_id: input.targetInvestmentId!,
                notes: `${item.notes || ''} [Movido da ${sourceInv.name}]`.trim(),
              };
              persistTableToApi('inventory_items', updated);
              return updated;
            })
          );
        } else {
          setInventory((prev) =>
            prev.map((item) => {
              if (item.id !== targetItem.id) return item;
              const updated: InventoryItem = {
                ...item,
                status: 'withdrawn',
                quantity: 0,
              };
              persistTableToApi('inventory_items', updated);
              return updated;
            })
          );
        }
      }
    }

    const newWithdrawal: InvestmentWithdrawal = {
      id: `wd-${Date.now()}`,
      investment_id: input.investmentId,
      target_investment_id:
        input.reasonType === 'mover_planilha'
          ? input.targetInvestmentId || null
          : null,
      target_investment_name:
        input.reasonType === 'mover_planilha' ? targetInv?.name || null : null,
      asset_type: input.assetType,
      reason_type: input.reasonType,
      amount: effectiveAmount,
      inventory_item_id: input.inventoryItemId || null,
      inventory_item_name: itemName,
      performed_by_user_id: currentUser.id,
      performed_by_user_name: currentUser.name,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };

    setWithdrawals((prev) => [newWithdrawal, ...prev]);
    persistTableToApi('investment_withdrawals', newWithdrawal);
  };

  const addCustomer: StoreContextType['addCustomer'] = (input) => {
    const newCust: Customer = {
      ...input,
      id: `cust-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setCustomers((prev) => [newCust, ...prev]);
    persistTableToApi('customers', newCust);
    return newCust;
  };

  const toggleCustomerOptIn = (customerId: string) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const updated = { ...c, whatsapp_opt_in: !c.whatsapp_opt_in };
        persistTableToApi('customers', updated);
        return updated;
      })
    );
  };

  const addInventoryItem: StoreContextType['addInventoryItem'] = (input) => {
    const nowIso = new Date().toISOString();
    const initialQty = Math.max(1, Number(input.quantity) || 1);
    const initialUnitCost = Number(input.purchase_cost) || 0;
    const initialExtraCost = Number(input.repair_cost) || 0;
    const newItem: InventoryItem = {
      ...input,
      id: `item-${Date.now()}`,
      generation: 1,
      repair_cost: initialExtraCost,
      purchase_history:
        input.purchase_history && input.purchase_history.length > 0
          ? input.purchase_history
          : [
              {
                id: `ph-${Date.now()}`,
                date: nowIso,
                quantity: initialQty,
                unit_cost: initialUnitCost,
                extra_cost: initialExtraCost,
                supplier_or_notes: input.notes || 'Cadastro inicial do produto',
              },
            ],
      created_at: nowIso,
    };
    setInventory((prev) => [newItem, ...prev]);
    persistTableToApi('inventory_items', newItem);
  };

  const updateInventoryItem: StoreContextType['updateInventoryItem'] = (
    itemId,
    partial
  ) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const updated: InventoryItem = { ...item, ...partial };
        persistTableToApi('inventory_items', updated);
        return updated;
      })
    );
  };

  const addPurchaseToInventoryItem: StoreContextType['addPurchaseToInventoryItem'] =
    (itemId, entry) => {
      const nowIso = new Date().toISOString();
      const addedQty = Math.max(1, Number(entry.quantity) || 1);
      const unitCost = Number(entry.unit_cost) || 0;
      const extraCost = Number(entry.extra_cost) || 0;

      setInventory((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const prevQty = Math.max(0, Number(item.quantity) || 0);
          const newTotalQty = prevQty + addedQty;
          const prevHistory = item.purchase_history || [];
          const newEntry = {
            id: `ph-${Date.now()}`,
            date: nowIso,
            quantity: addedQty,
            unit_cost: unitCost,
            extra_cost: extraCost,
            supplier_or_notes:
              entry.supplier_or_notes || 'Reposição / Nova compra de estoque',
          };

          const updated: InventoryItem = {
            ...item,
            quantity: newTotalQty,
            purchase_cost: unitCost > 0 ? unitCost : item.purchase_cost,
            repair_cost: (item.repair_cost || 0) + extraCost,
            suggested_price:
              entry.suggested_price && entry.suggested_price > 0
                ? Number(entry.suggested_price)
                : item.suggested_price,
            status: 'in_stock',
            purchase_history: [newEntry, ...prevHistory],
          };
          persistTableToApi('inventory_items', updated);
          return updated;
        })
      );
    };

  const createSaleWithTradeIn: StoreContextType['createSaleWithTradeIn'] = (
    input
  ) => {
    const customer = customers.find((c) => c.id === input.customerId);
    const soldItem = inventory.find((i) => i.id === input.soldItemId);

    if (!soldItem) {
      throw new Error('Produto não encontrado.');
    }
    if (input.paymentType === 'crediario' && !customer) {
      throw new Error('Selecione um cliente cadastrado para vendas no crediário.');
    }

    const customerIdVal = customer ? customer.id : null;
    const customerNameVal = customer
      ? customer.name
      : 'Cliente Balcão (À Vista)';
    const customerPhoneVal = customer ? customer.phone_whatsapp : '-';

    const saleId = `sale-${Date.now()}`;
    const saleCode = `VEN-${101 + sales.length}`;
    const investmentId = soldItem.investment_id;
    const parentGeneration = soldItem.generation || 1;

    let tradeInItemId: string | null = null;
    let tradeInDisplayModel: string | null = null;

    const qtySold = Math.max(
      1,
      Math.min(soldItem.quantity || 1, Number(input.quantitySold) || 1)
    );
    const remainingQty = Math.max(0, (soldItem.quantity || 1) - qtySold);

    const updatedSoldItem: InventoryItem = {
      ...soldItem,
      quantity: remainingQty,
      status: remainingQty <= 0 ? 'sold' : 'in_stock',
    };

    if (input.hasTradeIn && input.tradeInModel && input.tradeInValue > 0) {
      tradeInItemId = `item-trade-${Date.now()}`;
      tradeInDisplayModel = `${input.tradeInBrand || 'Apple'} ${input.tradeInModel} ${input.tradeInStorage || ''}`.trim();
      const repairCost = input.tradeInNeedsRepair
        ? Number(input.tradeInRepairPartsCost || 0)
        : 0;

      const tradeInItem: InventoryItem = {
        id: tradeInItemId,
        investment_id: investmentId,
        origin_sale_id: saleId,
        generation: parentGeneration + 1,
        category: 'device',
        brand: input.tradeInBrand || 'Apple',
        model: `${input.tradeInModel} (Troca ${saleCode})`,
        storage: input.tradeInStorage || '128GB',
        color: input.tradeInColor || 'Preto',
        imei: input.tradeInImei || '',
        battery_health: input.tradeInBattery || 88,
        condition: 'troca',
        purchase_cost: Number(input.tradeInValue),
        repair_cost: repairCost,
        suggested_price:
          Number(input.tradeInSuggestedResalePrice) ||
          Number((input.tradeInValue * 1.45).toFixed(0)),
        quantity: 1,
        status: input.tradeInNeedsRepair ? 'in_repair' : 'in_stock',
        notes: `Entrou na venda ${saleCode} (${customerNameVal}).`,
        created_at: new Date().toISOString(),
      };

      setInventory((prev) => [
        tradeInItem,
        ...prev.map((item) => (item.id === soldItem.id ? updatedSoldItem : item)),
      ]);
      persistTableToApi('inventory_items', [tradeInItem, updatedSoldItem]);

      if (input.tradeInNeedsRepair) {
        const internalOs: ServiceOrder = {
          id: `os-int-${Date.now()}`,
          code: `OS-00${serviceOrders.length + 1}`,
          order_type: 'internal_stock',
          customer_id: null,
          customer_name: `Estoque Interno (Troca ${saleCode})`,
          customer_phone: '-',
          inventory_item_id: tradeInItemId,
          investment_id: investmentId,
          device_model: tradeInDisplayModel,
          imei: input.tradeInImei || '',
          reported_defect:
            input.tradeInRepairDefect || 'Revisão para revenda (Troca)',
          technical_diagnosis: 'Aberto automaticamente na entrada da troca.',
          parts_cost: repairCost,
          service_price: 0,
          status: 'em_bancada',
          warranty_days: 90,
          created_at: new Date().toISOString(),
          completed_at: null,
        };
        setServiceOrders((prev) => [internalOs, ...prev]);
        persistTableToApi('service_orders', internalOs);
      }
    } else {
      setInventory((prev) =>
        prev.map((item) => (item.id === soldItem.id ? updatedSoldItem : item))
      );
      persistTableToApi('inventory_items', updatedSoldItem);
    }

    const netSalePrice = Math.max(0, input.salePrice - (input.discount || 0));
    const tradeInAmount = input.hasTradeIn ? input.tradeInValue || 0 : 0;
    const isAvista = input.paymentType !== 'crediario';

    const effectiveCashPaid = isAvista
      ? Math.max(0, Number((netSalePrice - tradeInAmount).toFixed(2)))
      : Number(input.cashDownPayment || 0);

    const totalEntry = effectiveCashPaid + tradeInAmount;
    const financedPrincipal = isAvista
      ? 0
      : Math.max(0, netSalePrice - totalEntry);
    const totalFinancedWithInterest = isAvista
      ? 0
      : Number(
          (input.finalInstallmentValue * input.installmentsCount).toFixed(2)
        );
    const totalSaleFinal = Number(
      (totalEntry + totalFinancedWithInterest).toFixed(2)
    );

    const newSale: Sale = {
      id: saleId,
      code: saleCode,
      customer_id: customerIdVal,
      customer_name: customerNameVal,
      investment_id: investmentId,
      sold_item_id: soldItem.id,
      sold_item_name:
        qtySold > 1
          ? `${qtySold}x ${soldItem.brand} ${soldItem.model}`
          : `${soldItem.brand} ${soldItem.model}`,
      sale_price: input.salePrice,
      discount: input.discount || 0,
      cash_down_payment: effectiveCashPaid,
      trade_in_item_id: tradeInItemId,
      trade_in_model: tradeInDisplayModel,
      trade_in_value: tradeInAmount,
      financed_principal: financedPrincipal,
      monthly_rate_percent: isAvista ? 0 : input.monthlyRatePercent,
      installments_count: isAvista ? 0 : input.installmentsCount,
      suggested_installment_value: isAvista
        ? 0
        : input.suggestedInstallmentValue,
      final_installment_value: isAvista ? 0 : input.finalInstallmentValue,
      is_manual_override: isAvista
        ? false
        : Math.abs(
            input.finalInstallmentValue - input.suggestedInstallmentValue
          ) >= 0.01,
      total_financed_with_interest: totalFinancedWithInterest,
      total_sale_final: totalSaleFinal,
      payment_type: input.paymentType,
      notes: input.notes,
      created_at: new Date().toISOString(),
    };

    setSales((prev) => [newSale, ...prev]);
    persistTableToApi('sales', newSale);

    if (input.paymentType === 'crediario' && financedPrincipal > 0 && customerIdVal) {
      const generatedInstallments: Installment[] = [];
      for (let i = 1; i <= input.installmentsCount; i++) {
        const dueDate = addDays(
          input.firstDueDate || getTodayStr(),
          (i - 1) * 30
        );
        generatedInstallments.push({
          id: `inst-${saleId}-${i}`,
          sale_id: saleId,
          sale_code: saleCode,
          investment_id: investmentId,
          customer_id: customerIdVal,
          customer_name: customerNameVal,
          customer_phone: customerPhoneVal,
          sold_item_name: `${soldItem.brand} ${soldItem.model}`,
          installment_number: i,
          total_installments: input.installmentsCount,
          due_date: dueDate,
          original_amount: input.finalInstallmentValue,
          late_fee_applied: 0,
          interest_applied: 0,
          discount_applied: 0,
          paid_amount: 0,
          status: 'pending',
          collection_count: 0,
        });
      }
      setInstallments((prev) => [...generatedInstallments, ...prev]);
      persistTableToApi('installments', generatedInstallments);
    }

    return newSale;
  };

  const createMultiItemSale: StoreContextType['createMultiItemSale'] = (
    input
  ) => {
    if (!input.items || input.items.length === 0) {
      throw new Error('Adicione ao menos 1 produto ao carrinho da venda.');
    }
    if (input.discount > 0 && !input.discountReason?.trim()) {
      throw new Error(
        'Informe obrigatoriamente a nota/motivo do desconto concedido.'
      );
    }

    const customer = input.customerId
      ? customers.find((c) => c.id === input.customerId)
      : undefined;
    const customerIdVal = customer ? customer.id : null;
    const customerNameVal = customer
      ? customer.name
      : 'Cliente Balcão (À Vista)';

    // Valida cada item do carrinho
    const resolvedItems = input.items.map((cartRow) => {
      const invItem = inventory.find((i) => i.id === cartRow.itemId);
      if (!invItem) {
        throw new Error('Um dos produtos selecionados não foi encontrado.');
      }
      const qty = Math.max(
        1,
        Math.min(invItem.quantity || 1, Number(cartRow.quantity) || 1)
      );
      return { invItem, qty };
    });

    const primaryItem = resolvedItems[0].invItem;
    const investmentId = primaryItem.investment_id;
    const saleId = `sale-${Date.now()}`;
    const saleCode = `VEN-${101 + sales.length}`;

    // Calcula valor bruto tabelado pelo estoque
    const grossSalePrice = resolvedItems.reduce(
      (acc, { invItem, qty }) => acc + Number(invItem.suggested_price || 0) * qty,
      0
    );

    const updatedInventoryItems: InventoryItem[] = resolvedItems.map(
      ({ invItem, qty }) => {
        const remaining = Math.max(0, (invItem.quantity || 1) - qty);
        return {
          ...invItem,
          quantity: remaining,
          status: remaining <= 0 ? 'sold' : 'in_stock',
        };
      }
    );

    let tradeInItemId: string | null = null;
    let tradeInDisplayModel: string | null = null;
    const tradeInAmount =
      input.hasTradeIn && input.tradeInValue ? Number(input.tradeInValue) : 0;

    if (input.hasTradeIn && input.tradeInModel && tradeInAmount > 0) {
      tradeInItemId = `item-trade-${Date.now()}`;
      tradeInDisplayModel = `${input.tradeInBrand || 'Apple'} ${input.tradeInModel} ${input.tradeInStorage || ''}`.trim();
      const repairCost = input.tradeInNeedsRepair
        ? Number(input.tradeInRepairPartsCost || 0)
        : 0;

      const tradeInItem: InventoryItem = {
        id: tradeInItemId,
        investment_id: investmentId,
        origin_sale_id: saleId,
        generation: (primaryItem.generation || 1) + 1,
        category: 'device',
        subcategory: 'celular',
        brand: input.tradeInBrand || 'Apple',
        model: `${input.tradeInModel} (Troca ${saleCode})`,
        storage: input.tradeInStorage || '128GB',
        color: input.tradeInColor || 'Preto',
        imei: input.tradeInImei || '',
        battery_health: input.tradeInBattery || 88,
        condition: 'troca',
        purchase_cost: tradeInAmount,
        repair_cost: repairCost,
        suggested_price:
          Number(input.tradeInSuggestedResalePrice) ||
          Number((tradeInAmount * 1.45).toFixed(0)),
        quantity: 1,
        status: input.tradeInNeedsRepair ? 'in_repair' : 'in_stock',
        notes: `Entrou na venda ${saleCode} (${customerNameVal}).`,
        created_at: new Date().toISOString(),
      };

      const updatedIds = new Set(updatedInventoryItems.map((u) => u.id));
      setInventory((prev) => [
        tradeInItem,
        ...prev.map((item) =>
          updatedIds.has(item.id)
            ? updatedInventoryItems.find((u) => u.id === item.id)!
            : item
        ),
      ]);
      persistTableToApi('inventory_items', [
        tradeInItem,
        ...updatedInventoryItems,
      ]);

      if (input.tradeInNeedsRepair) {
        const internalOs: ServiceOrder = {
          id: `os-int-${Date.now()}`,
          code: `OS-00${serviceOrders.length + 1}`,
          order_type: 'internal_stock',
          customer_id: null,
          customer_name: `Estoque Interno (Troca ${saleCode})`,
          customer_phone: '-',
          inventory_item_id: tradeInItemId,
          investment_id: investmentId,
          device_brand: input.tradeInBrand || 'Apple',
          device_model: tradeInDisplayModel,
          device_color: input.tradeInColor || '',
          imei: input.tradeInImei || '',
          reported_defect:
            input.tradeInRepairDefect || 'Revisão para revenda (Troca)',
          technical_diagnosis: 'Aberto automaticamente na entrada da troca.',
          parts_cost: repairCost,
          service_price: 0,
          status: 'em_bancada',
          warranty_days: 90,
          created_at: new Date().toISOString(),
          completed_at: null,
        };
        setServiceOrders((prev) => [internalOs, ...prev]);
        persistTableToApi('service_orders', internalOs);
      }
    } else {
      const updatedIds = new Set(updatedInventoryItems.map((u) => u.id));
      setInventory((prev) =>
        prev.map((item) =>
          updatedIds.has(item.id)
            ? updatedInventoryItems.find((u) => u.id === item.id)!
            : item
        )
      );
      persistTableToApi('inventory_items', updatedInventoryItems);
    }

    const discountVal = Number(input.discount) || 0;
    const netSalePrice = Math.max(0, grossSalePrice - discountVal);
    const effectiveCashPaid = Math.max(
      0,
      Number((netSalePrice - tradeInAmount).toFixed(2))
    );
    const totalSaleFinal = Number(
      (effectiveCashPaid + tradeInAmount).toFixed(2)
    );

    const summarySoldName = resolvedItems
      .map(({ invItem, qty }) =>
        qty > 1
          ? `${qty}x ${invItem.brand} ${invItem.model}`
          : `${invItem.brand} ${invItem.model}`
      )
      .join(' + ');

    const combinedNotes = [
      discountVal > 0 && input.discountReason?.trim()
        ? `Motivo Desconto (R$ ${discountVal.toFixed(2)}): ${input.discountReason.trim()}`
        : '',
      input.notes?.trim() || '',
    ]
      .filter(Boolean)
      .join(' | ');

    const newSale: Sale = {
      id: saleId,
      code: saleCode,
      customer_id: customerIdVal,
      customer_name: customerNameVal,
      investment_id: investmentId,
      sold_item_id: primaryItem.id,
      sold_item_name: summarySoldName,
      sale_price: grossSalePrice,
      discount: discountVal,
      cash_down_payment: effectiveCashPaid,
      trade_in_item_id: tradeInItemId,
      trade_in_model: tradeInDisplayModel,
      trade_in_value: tradeInAmount,
      financed_principal: 0,
      monthly_rate_percent: 0,
      installments_count: 0,
      suggested_installment_value: 0,
      final_installment_value: 0,
      is_manual_override: false,
      total_financed_with_interest: 0,
      total_sale_final: totalSaleFinal,
      payment_type: input.paymentType,
      notes: combinedNotes || undefined,
      created_at: new Date().toISOString(),
    };

    setSales((prev) => [newSale, ...prev]);
    persistTableToApi('sales', newSale);
    return newSale;
  };

  const payInstallment: StoreContextType['payInstallment'] = ({
    installmentId,
    paidAmount,
    lateFeeApplied,
    interestApplied,
    discountApplied = 0,
  }) => {
    const nowIso = new Date().toISOString();
    setInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id !== installmentId) return inst;
        const updated: Installment = {
          ...inst,
          paid_amount: Number(paidAmount.toFixed(2)),
          late_fee_applied: Number(lateFeeApplied.toFixed(2)),
          interest_applied: Number(interestApplied.toFixed(2)),
          discount_applied: Number(discountApplied.toFixed(2)),
          paid_at: nowIso,
          status: 'paid',
        };
        persistTableToApi('installments', updated);
        return updated;
      })
    );
  };

  const markInstallmentLoss = (installmentId: string) => {
    setInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id !== installmentId) return inst;
        const updated: Installment = { ...inst, status: 'loss' };
        persistTableToApi('installments', updated);
        return updated;
      })
    );
  };

  const addServiceOrder: StoreContextType['addServiceOrder'] = (input) => {
    const usedParts = input.used_parts || [];
    const hasPendingPartToBuy = usedParts.some(
      (p) => p.need_to_buy && !p.bought
    );
    const computedPartsCost =
      usedParts.length > 0
        ? usedParts.reduce(
            (acc, p) => acc + (Number(p.unit_cost) || 0) * (Number(p.quantity) || 1),
            0
          )
        : Number(input.parts_cost) || 0;

    const effectiveStatus: ServiceOrder['status'] = hasPendingPartToBuy
      ? 'aguardando_peca'
      : input.status;

    const newOs: ServiceOrder = {
      ...input,
      id: `os-${Date.now()}`,
      code: `OS-00${serviceOrders.length + 1}`,
      parts_cost: computedPartsCost,
      status: effectiveStatus,
      created_at: new Date().toISOString(),
    };
    setServiceOrders((prev) => [newOs, ...prev]);
    persistTableToApi('service_orders', newOs);

    // Deduz do estoque peças que já estavam em estoque
    const stockPartsUsed = usedParts.filter(
      (p) => p.inventory_item_id && !p.need_to_buy
    );
    if (stockPartsUsed.length > 0) {
      setInventory((prev) =>
        prev.map((item) => {
          const usedEntry = stockPartsUsed.find(
            (p) => p.inventory_item_id === item.id
          );
          if (!usedEntry) return item;
          const remaining = Math.max(
            0,
            (item.quantity || 1) - (Number(usedEntry.quantity) || 1)
          );
          const updated: InventoryItem = {
            ...item,
            quantity: remaining,
            status: remaining <= 0 ? 'sold' : 'in_stock',
          };
          persistTableToApi('inventory_items', updated);
          return updated;
        })
      );
    }

    if (input.order_type === 'internal_stock' && input.inventory_item_id) {
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id !== input.inventory_item_id) return item;
          const updated: InventoryItem = {
            ...item,
            repair_cost: (item.repair_cost || 0) + computedPartsCost,
            status:
              effectiveStatus === 'pronto' || effectiveStatus === 'entregue'
                ? 'in_stock'
                : 'in_repair',
          };
          persistTableToApi('inventory_items', updated);
          return updated;
        })
      );
    }
  };

  const confirmServiceOrderPartPurchase: StoreContextType['confirmServiceOrderPartPurchase'] =
    ({
      serviceOrderId,
      partUsageId,
      unitCost,
      quantityBought,
      suggestedResalePrice,
      supplierNotes,
    }) => {
      const targetOs = serviceOrders.find((so) => so.id === serviceOrderId);
      if (!targetOs || !targetOs.used_parts) return;

      const targetPart = targetOs.used_parts.find((p) => p.id === partUsageId);
      if (!targetPart) return;

      const nowIso = new Date().toISOString();
      const qtyUsedInOs = Math.max(1, Number(targetPart.quantity) || 1);
      const qtyPurchased = Math.max(
        qtyUsedInOs,
        Number(quantityBought) || qtyUsedInOs
      );
      const remainingInStock = Math.max(0, qtyPurchased - qtyUsedInOs);
      const cleanUnitCost = Math.max(0, Number(unitCost) || 0);

      // 1. Cria a peça no Estoque de Peças com histórico da compra e saldo restante após uso na OS
      const newPartItemId = `item-part-${Date.now()}`;
      const newPartInventoryItem: InventoryItem = {
        id: newPartItemId,
        investment_id: targetOs.investment_id || 'loja',
        origin_sale_id: null,
        generation: 1,
        category: 'part',
        subcategory: 'peca_outros',
        brand: targetOs.device_brand || 'Peça Manutenção',
        model: targetPart.part_name,
        storage: '',
        color: targetOs.device_color || '',
        imei: '',
        battery_health: 100,
        condition: 'novo',
        purchase_cost: cleanUnitCost,
        repair_cost: 0,
        suggested_price:
          Number(suggestedResalePrice) > 0
            ? Number(suggestedResalePrice)
            : Number((cleanUnitCost * 1.8).toFixed(2)),
        quantity: remainingInStock,
        status: remainingInStock > 0 ? 'in_stock' : 'sold',
        notes: `Peça comprada para ${targetOs.code} (${targetOs.device_model}). ${supplierNotes || ''}`.trim(),
        purchase_history: [
          {
            id: `ph-${Date.now()}`,
            date: nowIso,
            quantity: qtyPurchased,
            unit_cost: cleanUnitCost,
            extra_cost: 0,
            supplier_or_notes: `Comprada via ${targetOs.code} (${qtyUsedInOs} un. usada na OS)${supplierNotes ? ` • ${supplierNotes}` : ''}`,
          },
        ],
        created_at: nowIso,
      };

      setInventory((prev) => [newPartInventoryItem, ...prev]);
      persistTableToApi('inventory_items', newPartInventoryItem);

      // 2. Atualiza a OS com o custo real da peça comprada e muda status se todas as peças já foram compradas
      const updatedUsedParts = targetOs.used_parts.map((p) =>
        p.id === partUsageId
          ? {
              ...p,
              inventory_item_id: newPartItemId,
              unit_cost: cleanUnitCost,
              bought: true,
            }
          : p
      );

      const newTotalPartsCost = updatedUsedParts.reduce(
        (acc, p) => acc + (Number(p.unit_cost) || 0) * (Number(p.quantity) || 1),
        0
      );

      const stillWaitingParts = updatedUsedParts.some(
        (p) => p.need_to_buy && !p.bought
      );

      const nextStatus: ServiceOrder['status'] =
        targetOs.status === 'aguardando_peca' && !stillWaitingParts
          ? 'em_bancada'
          : targetOs.status;

      const updatedOs: ServiceOrder = {
        ...targetOs,
        used_parts: updatedUsedParts,
        parts_cost: newTotalPartsCost,
        status: nextStatus,
      };

      setServiceOrders((prev) =>
        prev.map((so) => (so.id === serviceOrderId ? updatedOs : so))
      );
      persistTableToApi('service_orders', updatedOs);

      // 3. Se for reforma interna de aparelho do estoque, atualiza o custo de reparo do aparelho
      if (
        targetOs.order_type === 'internal_stock' &&
        targetOs.inventory_item_id
      ) {
        const diffCost = newTotalPartsCost - (targetOs.parts_cost || 0);
        if (diffCost !== 0) {
          setInventory((prev) =>
            prev.map((item) => {
              if (item.id !== targetOs.inventory_item_id) return item;
              const updatedDevice: InventoryItem = {
                ...item,
                repair_cost: Math.max(0, (item.repair_cost || 0) + diffCost),
              };
              persistTableToApi('inventory_items', updatedDevice);
              return updatedDevice;
            })
          );
        }
      }
    };

  const updateServiceOrderStatus: StoreContextType['updateServiceOrderStatus'] =
    (id, status) => {
      const target = serviceOrders.find((so) => so.id === id);
      const completedAt =
        status === 'pronto' || status === 'entregue'
          ? new Date().toISOString()
          : target?.completed_at;
      setServiceOrders((prev) =>
        prev.map((so) => {
          if (so.id !== id) return so;
          const updated: ServiceOrder = {
            ...so,
            status,
            completed_at: completedAt,
          };
          persistTableToApi('service_orders', updated);
          return updated;
        })
      );

      if (
        target &&
        target.order_type === 'internal_stock' &&
        target.inventory_item_id &&
        (status === 'pronto' || status === 'entregue')
      ) {
        setInventory((prev) =>
          prev.map((item) => {
            if (item.id !== target.inventory_item_id) return item;
            const updated: InventoryItem = { ...item, status: 'in_stock' };
            persistTableToApi('inventory_items', updated);
            return updated;
          })
        );
      }
    };

  const recordCollectionSent: StoreContextType['recordCollectionSent'] = (
    input
  ) => {
    const nowIso = new Date().toISOString();
    const newLog: CollectionLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      installment_id: input.installmentId,
      customer_id: input.customerId,
      customer_name: input.customerName,
      phone_whatsapp: input.phoneWhatsapp,
      message_sent: input.messageSent,
      delay_seconds: input.delaySeconds,
      dispatch_mode: input.dispatchMode,
      status: 'sent',
      sent_at: nowIso,
    };
    setCollectionLogs((prev) => [newLog, ...prev]);
    persistTableToApi('collection_logs', newLog);

    setInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id !== input.installmentId) return inst;
        const updated: Installment = {
          ...inst,
          collection_count: (inst.collection_count || 0) + 1,
          last_collection_at: nowIso,
        };
        persistTableToApi('installments', updated);
        return updated;
      })
    );
  };

  const syncAllToSupabase = async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all',
          payload: {
            settings,
            users,
            investments,
            customers,
            inventory,
            sales,
            installments,
            withdrawals,
            serviceOrders,
            collectionLogs,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSupabaseConnected(true);
        return { ok: true, message: data.message };
      }
      return { ok: false, message: data.error || 'Erro ao sincronizar' };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Erro ao sincronizar',
      };
    }
  };

  const resetDemoData = () => {
    setInvestments([]);
    setWithdrawals([]);
    setCustomers([]);
    setInventory([]);
    setSales([]);
    setInstallments([]);
    setServiceOrders([]);
    setCollectionLogs([]);
    localStorage.removeItem(STORAGE_KEY);
    fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_all_data' }),
    }).catch((err) => console.error('Erro ao limpar dados no Supabase:', err));
  };

  return (
    <StoreContext.Provider
      value={{
        isHydrated,
        supabaseConnected,
        isAuthenticated,
        settings,
        users,
        currentUser,
        setCurrentUserId,
        login,
        logout,
        hasRole,
        canAccessInvestment,
        investments,
        visibleInvestments,
        withdrawals,
        customers,
        inventory,
        sales,
        installments,
        serviceOrders,
        collectionLogs,
        updateSettings,
        addUser,
        updateUser,
        deleteUser,
        toggleUserAccessOnInvestment,
        addInvestment,
        createWithdrawal,
        addCustomer,
        toggleCustomerOptIn,
        addInventoryItem,
        updateInventoryItem,
        addPurchaseToInventoryItem,
        createSaleWithTradeIn,
        createMultiItemSale,
        payInstallment,
        markInstallmentLoss,
        addServiceOrder,
        updateServiceOrderStatus,
        confirmServiceOrderPartPurchase,
        recordCollectionSent,
        syncAllToSupabase,
        resetDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore deve ser usado dentro de StoreProvider');
  }
  return ctx;
}
