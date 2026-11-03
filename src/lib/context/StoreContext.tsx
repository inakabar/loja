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

const STORAGE_KEY = 'istore_erp_state_v2';

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
  settings: StoreSettings;
  users: AppUser[];
  currentUser: AppUser;
  setCurrentUserId: (userId: string) => void;
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
    email: string;
    roles: UserRole[];
    allowed_investment_ids: string[];
  }) => void;
  updateUser: (
    userId: string,
    partial: Partial<
      Pick<
        AppUser,
        'name' | 'email' | 'roles' | 'allowed_investment_ids' | 'active'
      >
    >
  ) => void;
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
    input: Omit<
      InventoryItem,
      'id' | 'created_at' | 'generation' | 'repair_cost'
    >
  ) => void;
  createSaleWithTradeIn: (input: CreateCrediarioSaleInput) => Sale;
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

function buildInitialSeed() {
  const today = getTodayStr();

  const settings: StoreSettings = {
    id: 'settings-1',
    store_name: 'PrimeCell Eletrônicos & Crediário',
    default_monthly_rate_percent: 6.0,
    late_fee_percent: 2.0,
    daily_interest_percent: 0.33,
    pix_key: 'pix@primecelleletronicos.com.br',
    store_whatsapp: '5511998887766',
    min_delay_seconds: 8,
    max_delay_seconds: 120,
  };

  const users: AppUser[] = [
    {
      id: 'user-admin',
      name: 'Diretor (Admin Geral)',
      email: 'admin@primecell.com.br',
      roles: [
        'admin',
        'venda_investimento',
        'venda_loja',
        'cobranca',
        'manutencao',
      ],
      allowed_investment_ids: ['inv-30k', 'inv-15k'],
      active: true,
      created_at: addDays(today, -60),
    },
    {
      id: 'user-cobranca-1',
      name: 'Bruno (Cobrança Planilha #01)',
      email: 'bruno.cobranca@primecell.com.br',
      roles: ['cobranca'],
      allowed_investment_ids: ['inv-30k'],
      active: true,
      created_at: addDays(today, -45),
    },
    {
      id: 'user-cobranca-2',
      name: 'Camila (Cobrança & Venda Planilha #02)',
      email: 'camila@primecell.com.br',
      roles: ['cobranca', 'venda_investimento'],
      allowed_investment_ids: ['inv-15k'],
      active: true,
      created_at: addDays(today, -20),
    },
    {
      id: 'user-loja-manut',
      name: 'Diego (Balcão Loja & Técnico OS)',
      email: 'diego@primecell.com.br',
      roles: ['venda_loja', 'manutencao'],
      allowed_investment_ids: [],
      active: true,
      created_at: addDays(today, -30),
    },
  ];

  const investments: Investment[] = [
    {
      id: 'inv-30k',
      name: 'Planilha #01 — Lote 18 iPhones (R$ 30.000)',
      description:
        'Aporte de R$ 30.000 com giro de 18 aparelhos no crediário e encadeamento de trocas.',
      initial_capital: 30000,
      start_date: addDays(today, -45),
      status: 'active',
      allowed_user_ids: ['user-admin', 'user-cobranca-1'],
      notes: 'Cobradores autorizados: Admin e Bruno.',
      created_at: addDays(today, -45),
    },
    {
      id: 'inv-15k',
      name: 'Planilha #02 — Expansão Pro Max (R$ 15.000)',
      description:
        'Segundo aporte isolado de R$ 15.000 focado em linha Pro Max.',
      initial_capital: 15000,
      start_date: addDays(today, -20),
      status: 'active',
      allowed_user_ids: ['user-admin', 'user-cobranca-2'],
      notes: 'Cobradores autorizados: Admin e Camila.',
      created_at: addDays(today, -20),
    },
  ];

  const withdrawals: InvestmentWithdrawal[] = [
    {
      id: 'wd-1',
      investment_id: 'inv-30k',
      target_investment_id: null,
      target_investment_name: null,
      asset_type: 'cash',
      reason_type: 'custos_loja',
      amount: 350,
      inventory_item_id: null,
      inventory_item_name: null,
      performed_by_user_id: 'user-admin',
      performed_by_user_name: 'Diretor (Admin Geral)',
      notes:
        'Pagamento de energia e internet da loja abatido do caixa da Planilha #01.',
      created_at: addDays(today, -10),
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust-1',
      name: 'Carlos Eduardo Mendes',
      cpf: '348.912.408-12',
      phone_whatsapp: '5511987654321',
      address: 'Rua das Palmeiras, 410 - Centro',
      whatsapp_opt_in: true,
      credit_score: 'excelente',
      notes: 'Deu iPhone 16 na troca pelo iPhone 17.',
      created_at: addDays(today, -40),
    },
    {
      id: 'cust-2',
      name: 'Mariana Costa Oliveira',
      cpf: '419.220.881-05',
      phone_whatsapp: '5511976543210',
      address: 'Av. Brasil, 1290 - Ap 42',
      whatsapp_opt_in: true,
      credit_score: 'atencao',
      notes: 'Costuma pagar com 4 a 6 dias de atraso (paga multa certinho).',
      created_at: addDays(today, -36),
    },
    {
      id: 'cust-3',
      name: 'Rafael Souza Santos',
      cpf: '289.104.552-90',
      phone_whatsapp: '5511965432109',
      address: 'Rua São Bento, 88 - Jardim América',
      whatsapp_opt_in: true,
      credit_score: 'atencao',
      notes: 'Comprou o iPhone 16 que entrou na troca do Carlos!',
      created_at: addDays(today, -22),
    },
    {
      id: 'cust-4',
      name: 'Fernanda Lima Rocha',
      cpf: '512.887.301-44',
      phone_whatsapp: '5511954321098',
      address: 'Rua XV de Novembro, 205',
      whatsapp_opt_in: true,
      credit_score: 'bom',
      notes: 'Parcela vence hoje (Planilha #02).',
      created_at: addDays(today, -30),
    },
    {
      id: 'cust-5',
      name: 'Lucas Pereira Alves',
      cpf: '198.442.710-33',
      phone_whatsapp: '5511943210987',
      address: 'Alameda Santos, 912',
      whatsapp_opt_in: false,
      credit_score: 'atencao',
      notes: 'Parcela em atraso há 12 dias (Planilha #01).',
      created_at: addDays(today, -42),
    },
  ];

  const inventory: InventoryItem[] = [
    {
      id: 'item-ip17-01',
      investment_id: 'inv-30k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 17 128GB',
      storage: '128GB',
      color: 'Ultramarine',
      imei: '359881104421001',
      battery_health: 100,
      condition: 'novo',
      purchase_cost: 3400,
      repair_cost: 0,
      suggested_price: 5800,
      quantity: 1,
      status: 'sold',
      created_at: addDays(today, -45),
    },
    {
      id: 'item-ip17-02',
      investment_id: 'inv-30k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 17 256GB',
      storage: '256GB',
      color: 'Preto Espacial',
      imei: '359881104421002',
      battery_health: 100,
      condition: 'novo',
      purchase_cost: 3800,
      repair_cost: 0,
      suggested_price: 6400,
      quantity: 1,
      status: 'sold',
      created_at: addDays(today, -45),
    },
    {
      id: 'item-trade-ip16-01',
      investment_id: 'inv-30k',
      origin_sale_id: 'sale-101',
      generation: 2,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 16 128GB (Troca #101)',
      storage: '128GB',
      color: 'Azul',
      imei: '354492001887312',
      battery_health: 89,
      condition: 'troca',
      purchase_cost: 2400,
      repair_cost: 220,
      suggested_price: 3900,
      quantity: 1,
      status: 'sold',
      notes:
        'Entrou na troca do iPhone 17 (Venda #101) e já gerou nova venda (#103)!',
      created_at: addDays(today, -38),
    },
    {
      id: 'item-trade-ip15-02',
      investment_id: 'inv-30k',
      origin_sale_id: 'sale-102',
      generation: 2,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 15 Pro 128GB (Troca #102)',
      storage: '128GB',
      color: 'Titânio Natural',
      imei: '357712990112490',
      battery_health: 91,
      condition: 'troca',
      purchase_cost: 2800,
      repair_cost: 0,
      suggested_price: 4350,
      quantity: 1,
      status: 'in_stock',
      notes: 'Entrou como parte de pagamento na Venda #102.',
      created_at: addDays(today, -34),
    },
    {
      id: 'item-trade-ip14-03',
      investment_id: 'inv-30k',
      origin_sale_id: 'sale-103',
      generation: 3,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 14 128GB (Troca da Troca #103)',
      storage: '128GB',
      color: 'Estelar',
      imei: '351109882341998',
      battery_health: 86,
      condition: 'troca',
      purchase_cost: 1600,
      repair_cost: 180,
      suggested_price: 2790,
      quantity: 1,
      status: 'in_stock',
      notes: '3ª geração da árvore dos R$ 30 mil.',
      created_at: addDays(today, -20),
    },
    {
      id: 'item-ip17-03',
      investment_id: 'inv-30k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 17 128GB',
      storage: '128GB',
      color: 'Rosa',
      imei: '359881104421003',
      battery_health: 100,
      condition: 'novo',
      purchase_cost: 3400,
      repair_cost: 0,
      suggested_price: 5800,
      quantity: 1,
      status: 'in_stock',
      created_at: addDays(today, -45),
    },
    {
      id: 'item-ip17-04',
      investment_id: 'inv-30k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 17 Pro 256GB',
      storage: '256GB',
      color: 'Titânio Deserto',
      imei: '359881104421004',
      battery_health: 100,
      condition: 'novo',
      purchase_cost: 4600,
      repair_cost: 0,
      suggested_price: 7500,
      quantity: 1,
      status: 'in_stock',
      created_at: addDays(today, -45),
    },
    {
      id: 'item-ip16pm-01',
      investment_id: 'inv-15k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 16 Pro Max 256GB',
      storage: '256GB',
      color: 'Titânio Preto',
      imei: '356671009281771',
      battery_health: 97,
      condition: 'seminovo',
      purchase_cost: 4900,
      repair_cost: 0,
      suggested_price: 6900,
      quantity: 1,
      status: 'sold',
      created_at: addDays(today, -20),
    },
    {
      id: 'item-ip15pm-02',
      investment_id: 'inv-15k',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Apple',
      model: 'iPhone 15 Pro Max 256GB',
      storage: '256GB',
      color: 'Titânio Azul',
      imei: '356671009281772',
      battery_health: 93,
      condition: 'seminovo',
      purchase_cost: 4100,
      repair_cost: 0,
      suggested_price: 5900,
      quantity: 1,
      status: 'in_stock',
      created_at: addDays(today, -20),
    },
    {
      id: 'item-loja-01',
      investment_id: 'loja',
      origin_sale_id: null,
      generation: 1,
      category: 'device',
      brand: 'Xiaomi',
      model: 'Redmi Note 14 Pro 256GB (Estoque Loja)',
      storage: '256GB',
      color: 'Preto',
      imei: '864411009281990',
      battery_health: 100,
      condition: 'novo',
      purchase_cost: 1350,
      repair_cost: 0,
      suggested_price: 2290,
      quantity: 3,
      status: 'in_stock',
      created_at: addDays(today, -15),
    },
  ];

  const sales: Sale[] = [
    {
      id: 'sale-101',
      code: 'VEN-101',
      customer_id: 'cust-1',
      customer_name: 'Carlos Eduardo Mendes',
      investment_id: 'inv-30k',
      sold_item_id: 'item-ip17-01',
      sold_item_name: 'iPhone 17 128GB Ultramarine',
      sale_price: 5800,
      discount: 0,
      cash_down_payment: 1400,
      trade_in_item_id: 'item-trade-ip16-01',
      trade_in_model: 'iPhone 16 128GB Azul',
      trade_in_value: 2400,
      financed_principal: 2000,
      monthly_rate_percent: 6.0,
      installments_count: 6,
      suggested_installment_value: 453.33,
      final_installment_value: 450.0,
      is_manual_override: true,
      total_financed_with_interest: 2700,
      total_sale_final: 6500,
      payment_type: 'crediario',
      notes:
        'Cliente deu R$ 1.400 no PIX + iPhone 16 128GB avaliado em R$ 2.400.',
      created_at: addDays(today, -38),
    },
    {
      id: 'sale-102',
      code: 'VEN-102',
      customer_id: 'cust-2',
      customer_name: 'Mariana Costa Oliveira',
      investment_id: 'inv-30k',
      sold_item_id: 'item-ip17-02',
      sold_item_name: 'iPhone 17 256GB Preto Espacial',
      sale_price: 6400,
      discount: 0,
      cash_down_payment: 1200,
      trade_in_item_id: 'item-trade-ip15-02',
      trade_in_model: 'iPhone 15 Pro 128GB Titânio',
      trade_in_value: 2800,
      financed_principal: 2400,
      monthly_rate_percent: 6.0,
      installments_count: 8,
      suggested_installment_value: 444.0,
      final_installment_value: 444.0,
      is_manual_override: false,
      total_financed_with_interest: 3552,
      total_sale_final: 7552,
      payment_type: 'crediario',
      notes:
        'Entrada de R$ 1.200 + iPhone 15 Pro na troca (R$ 2.800) + 8x de R$ 444.',
      created_at: addDays(today, -34),
    },
    {
      id: 'sale-103',
      code: 'VEN-103',
      customer_id: 'cust-3',
      customer_name: 'Rafael Souza Santos',
      investment_id: 'inv-30k',
      sold_item_id: 'item-trade-ip16-01',
      sold_item_name: 'iPhone 16 128GB (Troca #101)',
      sale_price: 3900,
      discount: 0,
      cash_down_payment: 900,
      trade_in_item_id: 'item-trade-ip14-03',
      trade_in_model: 'iPhone 14 128GB Estelar',
      trade_in_value: 1600,
      financed_principal: 1400,
      monthly_rate_percent: 6.0,
      installments_count: 5,
      suggested_installment_value: 364.0,
      final_installment_value: 365.0,
      is_manual_override: true,
      total_financed_with_interest: 1825,
      total_sale_final: 4325,
      payment_type: 'crediario',
      notes: 'Revenda do iPhone 16 que entrou na Venda #101!',
      created_at: addDays(today, -20),
    },
    {
      id: 'sale-201',
      code: 'VEN-201',
      customer_id: 'cust-4',
      customer_name: 'Fernanda Lima Rocha',
      investment_id: 'inv-15k',
      sold_item_id: 'item-ip16pm-01',
      sold_item_name: 'iPhone 16 Pro Max 256GB',
      sale_price: 6900,
      discount: 100,
      cash_down_payment: 3800,
      trade_in_item_id: null,
      trade_in_model: null,
      trade_in_value: 0,
      financed_principal: 3000,
      monthly_rate_percent: 6.0,
      installments_count: 6,
      suggested_installment_value: 680.0,
      final_installment_value: 680.0,
      is_manual_override: false,
      total_financed_with_interest: 4080,
      total_sale_final: 7880,
      payment_type: 'crediario',
      notes: 'Venda da carteira da Planilha #02.',
      created_at: addDays(today, -30),
    },
  ];

  const installments: Installment[] = [
    {
      id: 'inst-101-1',
      sale_id: 'sale-101',
      sale_code: 'VEN-101',
      investment_id: 'inv-30k',
      customer_id: 'cust-1',
      customer_name: 'Carlos Eduardo Mendes',
      customer_phone: '5511987654321',
      sold_item_name: 'iPhone 17 128GB Ultramarine',
      installment_number: 1,
      total_installments: 6,
      due_date: addDays(today, -8),
      original_amount: 450,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 450,
      paid_at: addDays(today, -8),
      status: 'paid',
      collection_count: 1,
    },
    {
      id: 'inst-101-2',
      sale_id: 'sale-101',
      sale_code: 'VEN-101',
      investment_id: 'inv-30k',
      customer_id: 'cust-1',
      customer_name: 'Carlos Eduardo Mendes',
      customer_phone: '5511987654321',
      sold_item_name: 'iPhone 17 128GB Ultramarine',
      installment_number: 2,
      total_installments: 6,
      due_date: addDays(today, 22),
      original_amount: 450,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'pending',
      collection_count: 0,
    },
    {
      id: 'inst-102-1',
      sale_id: 'sale-102',
      sale_code: 'VEN-102',
      investment_id: 'inv-30k',
      customer_id: 'cust-2',
      customer_name: 'Mariana Costa Oliveira',
      customer_phone: '5511976543210',
      sold_item_name: 'iPhone 17 256GB Preto Espacial',
      installment_number: 1,
      total_installments: 8,
      due_date: addDays(today, -35),
      original_amount: 444,
      late_fee_applied: 8.88,
      interest_applied: 7.32,
      discount_applied: 0,
      paid_amount: 460.2,
      paid_at: addDays(today, -30),
      status: 'paid',
      collection_count: 2,
    },
    {
      id: 'inst-102-2',
      sale_id: 'sale-102',
      sale_code: 'VEN-102',
      investment_id: 'inv-30k',
      customer_id: 'cust-2',
      customer_name: 'Mariana Costa Oliveira',
      customer_phone: '5511976543210',
      sold_item_name: 'iPhone 17 256GB Preto Espacial',
      installment_number: 2,
      total_installments: 8,
      due_date: addDays(today, -5),
      original_amount: 444,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'overdue',
      collection_count: 1,
    },
    {
      id: 'inst-102-3',
      sale_id: 'sale-102',
      sale_code: 'VEN-102',
      investment_id: 'inv-30k',
      customer_id: 'cust-2',
      customer_name: 'Mariana Costa Oliveira',
      customer_phone: '5511976543210',
      sold_item_name: 'iPhone 17 256GB Preto Espacial',
      installment_number: 3,
      total_installments: 8,
      due_date: addDays(today, 25),
      original_amount: 444,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'pending',
      collection_count: 0,
    },
    {
      id: 'inst-103-1',
      sale_id: 'sale-103',
      sale_code: 'VEN-103',
      investment_id: 'inv-30k',
      customer_id: 'cust-3',
      customer_name: 'Rafael Souza Santos',
      customer_phone: '5511965432109',
      sold_item_name: 'iPhone 16 128GB (Troca #101)',
      installment_number: 1,
      total_installments: 5,
      due_date: addDays(today, -9),
      original_amount: 365,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'overdue',
      collection_count: 1,
    },
    {
      id: 'inst-103-2',
      sale_id: 'sale-103',
      sale_code: 'VEN-103',
      investment_id: 'inv-30k',
      customer_id: 'cust-3',
      customer_name: 'Rafael Souza Santos',
      customer_phone: '5511965432109',
      sold_item_name: 'iPhone 16 128GB (Troca #101)',
      installment_number: 2,
      total_installments: 5,
      due_date: addDays(today, 21),
      original_amount: 365,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'pending',
      collection_count: 0,
    },
    {
      id: 'inst-201-1',
      sale_id: 'sale-201',
      sale_code: 'VEN-201',
      investment_id: 'inv-15k',
      customer_id: 'cust-4',
      customer_name: 'Fernanda Lima Rocha',
      customer_phone: '5511954321098',
      sold_item_name: 'iPhone 16 Pro Max 256GB',
      installment_number: 1,
      total_installments: 6,
      due_date: today,
      original_amount: 680,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'pending',
      collection_count: 0,
    },
    {
      id: 'inst-201-2',
      sale_id: 'sale-201',
      sale_code: 'VEN-201',
      investment_id: 'inv-15k',
      customer_id: 'cust-4',
      customer_name: 'Fernanda Lima Rocha',
      customer_phone: '5511954321098',
      sold_item_name: 'iPhone 16 Pro Max 256GB',
      installment_number: 2,
      total_installments: 6,
      due_date: addDays(today, 30),
      original_amount: 680,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'pending',
      collection_count: 0,
    },
    {
      id: 'inst-104-1',
      sale_id: 'sale-101',
      sale_code: 'VEN-104',
      investment_id: 'inv-30k',
      customer_id: 'cust-5',
      customer_name: 'Lucas Pereira Alves',
      customer_phone: '5511943210987',
      sold_item_name: 'iPhone 17 128GB Preto',
      installment_number: 2,
      total_installments: 6,
      due_date: addDays(today, -12),
      original_amount: 490,
      late_fee_applied: 0,
      interest_applied: 0,
      discount_applied: 0,
      paid_amount: 0,
      status: 'overdue',
      collection_count: 2,
    },
  ];

  const serviceOrders: ServiceOrder[] = [
    {
      id: 'os-101',
      code: 'OS-001',
      order_type: 'internal_stock',
      customer_id: null,
      customer_name: 'Estoque Interno (Troca #101)',
      customer_phone: '-',
      inventory_item_id: 'item-trade-ip16-01',
      investment_id: 'inv-30k',
      device_model: 'iPhone 16 128GB Azul (Recebido na Troca)',
      imei: '354492001887312',
      reported_defect: 'Troca preventiva de bateria + higienização',
      technical_diagnosis: 'Célula original instalada.',
      parts_cost: 220,
      service_price: 0,
      status: 'entregue',
      warranty_days: 90,
      created_at: addDays(today, -37),
      completed_at: addDays(today, -35),
    },
    {
      id: 'os-102',
      code: 'OS-002',
      order_type: 'internal_stock',
      customer_id: null,
      customer_name: 'Estoque Interno (Troca #103)',
      customer_phone: '-',
      inventory_item_id: 'item-trade-ip14-03',
      investment_id: 'inv-30k',
      device_model: 'iPhone 14 128GB Estelar',
      imei: '351109882341998',
      reported_defect: 'Polimento de tela e troca de auricular',
      technical_diagnosis: 'Auricular substituído.',
      parts_cost: 180,
      service_price: 0,
      status: 'pronto',
      warranty_days: 90,
      created_at: addDays(today, -19),
      completed_at: addDays(today, -18),
    },
    {
      id: 'os-103',
      code: 'OS-003',
      order_type: 'customer',
      customer_id: 'cust-1',
      customer_name: 'Carlos Eduardo Mendes',
      customer_phone: '5511987654321',
      inventory_item_id: null,
      investment_id: 'inv-30k',
      device_model: 'iPad Air 5ª Geração 64GB',
      imei: '3590012388120',
      reported_defect: 'Conector USB-C oxidado',
      technical_diagnosis: 'Substituição do flex de carga USB-C.',
      parts_cost: 140,
      service_price: 420,
      status: 'pronto',
      warranty_days: 90,
      created_at: addDays(today, -3),
      completed_at: today,
    },
    {
      id: 'os-104',
      code: 'OS-004',
      order_type: 'customer',
      customer_id: 'cust-4',
      customer_name: 'Fernanda Lima Rocha',
      customer_phone: '5511954321098',
      inventory_item_id: null,
      investment_id: 'inv-15k',
      device_model: 'iPhone 13 Pro 128GB',
      imei: '3522819001129',
      reported_defect: 'Reparo display 120Hz',
      technical_diagnosis: 'Em reparo de micro-solda na bancada.',
      parts_cost: 90,
      service_price: 650,
      status: 'em_bancada',
      warranty_days: 90,
      created_at: today,
      completed_at: null,
    },
  ];

  const collectionLogs: CollectionLog[] = [
    {
      id: 'log-1',
      installment_id: 'inst-102-2',
      customer_id: 'cust-2',
      customer_name: 'Mariana Costa Oliveira',
      phone_whatsapp: '5511976543210',
      message_sent:
        'Oi Mariana! Tudo certo por aí? Vi aqui no sistema que a parcela 2/8 do seu iPhone 17 256GB venceu...',
      delay_seconds: 24,
      dispatch_mode: 'connector',
      status: 'sent',
      sent_at: addDays(today, -2),
    },
  ];

  return {
    settings,
    users,
    investments,
    withdrawals,
    customers,
    inventory,
    sales,
    installments,
    serviceOrders,
    collectionLogs,
  };
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const seed = buildInitialSeed();
  const [isHydrated, setIsHydrated] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const [settings, setSettings] = useState<StoreSettings>(seed.settings);
  const [users, setUsers] = useState<AppUser[]>(seed.users);
  const [currentUserId, setCurrentUserId] = useState<string>(seed.users[0].id);
  const [investments, setInvestments] = useState<Investment[]>(seed.investments);
  const [withdrawals, setWithdrawals] = useState<InvestmentWithdrawal[]>(
    seed.withdrawals
  );
  const [customers, setCustomers] = useState<Customer[]>(seed.customers);
  const [inventory, setInventory] = useState<InventoryItem[]>(seed.inventory);
  const [sales, setSales] = useState<Sale[]>(seed.sales);
  const [installments, setInstallments] = useState<Installment[]>(
    seed.installments
  );
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(
    seed.serviceOrders
  );
  const [collectionLogs, setCollectionLogs] = useState<CollectionLog[]>(
    seed.collectionLogs
  );

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/store');
        if (res.ok) {
          const data = await res.json();
          if (data.connected) {
            setSupabaseConnected(true);
            if (data.investments && data.investments.length > 0) {
              if (data.settings) setSettings(data.settings);
              if (data.users?.length) setUsers(data.users);
              setInvestments(data.investments);
              if (data.withdrawals) setWithdrawals(data.withdrawals);
              if (data.customers?.length) setCustomers(data.customers);
              if (data.inventory?.length) setInventory(data.inventory);
              if (data.sales) setSales(data.sales);
              if (data.installments) setInstallments(data.installments);
              if (data.serviceOrders) setServiceOrders(data.serviceOrders);
              if (data.collectionLogs) setCollectionLogs(data.collectionLogs);
              setIsHydrated(true);
              return;
            } else {
              // Banco novo ainda vazio: popula automaticamente com os dados iniciais!
              await fetch('/api/store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'sync_all',
                  payload: seed,
                }),
              });
              setIsHydrated(true);
              return;
            }
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
          if (parsed.users && parsed.users.length > 0) setUsers(parsed.users);
          if (parsed.currentUserId) setCurrentUserId(parsed.currentUserId);
          if (parsed.investments) setInvestments(parsed.investments);
          if (parsed.withdrawals) setWithdrawals(parsed.withdrawals);
          if (parsed.customers) setCustomers(parsed.customers);
          if (parsed.inventory) setInventory(parsed.inventory);
          if (parsed.sales) setSales(parsed.sales);
          if (parsed.installments) setInstallments(parsed.installments);
          if (parsed.serviceOrders) setServiceOrders(parsed.serviceOrders);
          if (parsed.collectionLogs) setCollectionLogs(parsed.collectionLogs);
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
    users.find((u) => u.id === currentUserId) || users[0];

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
    const newUser: AppUser = {
      id: newUserId,
      name: input.name,
      email: input.email,
      roles: input.roles.length > 0 ? input.roles : ['venda_loja'],
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
    const newItem: InventoryItem = {
      ...input,
      id: `item-${Date.now()}`,
      generation: 1,
      repair_cost: 0,
      created_at: new Date().toISOString(),
    };
    setInventory((prev) => [newItem, ...prev]);
    persistTableToApi('inventory_items', newItem);
  };

  const createSaleWithTradeIn: StoreContextType['createSaleWithTradeIn'] = (
    input
  ) => {
    const customer = customers.find((c) => c.id === input.customerId);
    const soldItem = inventory.find((i) => i.id === input.soldItemId);

    if (!customer || !soldItem) {
      throw new Error('Cliente ou produto não encontrado.');
    }

    const saleId = `sale-${Date.now()}`;
    const saleCode = `VEN-${105 + sales.length}`;
    const investmentId = soldItem.investment_id;
    const parentGeneration = soldItem.generation || 1;

    let tradeInItemId: string | null = null;
    let tradeInDisplayModel: string | null = null;

    const updatedSoldItem: InventoryItem = {
      ...soldItem,
      quantity: Math.max(0, soldItem.quantity - 1),
      status: soldItem.quantity - 1 <= 0 ? 'sold' : soldItem.status,
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
        notes: `Entrou na venda ${saleCode} (${customer.name}).`,
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
    const totalEntry =
      (input.cashDownPayment || 0) +
      (input.hasTradeIn ? input.tradeInValue || 0 : 0);
    const financedPrincipal = Math.max(0, netSalePrice - totalEntry);
    const totalFinancedWithInterest = Number(
      (input.finalInstallmentValue * input.installmentsCount).toFixed(2)
    );
    const totalSaleFinal = Number(
      (totalEntry + totalFinancedWithInterest).toFixed(2)
    );

    const newSale: Sale = {
      id: saleId,
      code: saleCode,
      customer_id: customer.id,
      customer_name: customer.name,
      investment_id: investmentId,
      sold_item_id: soldItem.id,
      sold_item_name: `${soldItem.brand} ${soldItem.model}`,
      sale_price: input.salePrice,
      discount: input.discount || 0,
      cash_down_payment: input.cashDownPayment || 0,
      trade_in_item_id: tradeInItemId,
      trade_in_model: tradeInDisplayModel,
      trade_in_value: input.hasTradeIn ? input.tradeInValue : 0,
      financed_principal: financedPrincipal,
      monthly_rate_percent: input.monthlyRatePercent,
      installments_count: input.installmentsCount,
      suggested_installment_value: input.suggestedInstallmentValue,
      final_installment_value: input.finalInstallmentValue,
      is_manual_override:
        Math.abs(
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

    if (input.paymentType === 'crediario' && financedPrincipal > 0) {
      const generatedInstallments: Installment[] = [];
      for (let i = 1; i <= input.installmentsCount; i++) {
        const dueDate = addDays(input.firstDueDate || getTodayStr(), (i - 1) * 30);
        generatedInstallments.push({
          id: `inst-${saleId}-${i}`,
          sale_id: saleId,
          sale_code: saleCode,
          investment_id: investmentId,
          customer_id: customer.id,
          customer_name: customer.name,
          customer_phone: customer.phone_whatsapp,
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
    const newOs: ServiceOrder = {
      ...input,
      id: `os-${Date.now()}`,
      code: `OS-00${serviceOrders.length + 1}`,
      created_at: new Date().toISOString(),
    };
    setServiceOrders((prev) => [newOs, ...prev]);
    persistTableToApi('service_orders', newOs);

    if (input.order_type === 'internal_stock' && input.inventory_item_id) {
      setInventory((prev) =>
        prev.map((item) => {
          if (item.id !== input.inventory_item_id) return item;
          const updated: InventoryItem = {
            ...item,
            repair_cost: (item.repair_cost || 0) + (input.parts_cost || 0),
            status:
              input.status === 'pronto' || input.status === 'entregue'
                ? 'in_stock'
                : 'in_repair',
          };
          persistTableToApi('inventory_items', updated);
          return updated;
        })
      );
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
    const fresh = buildInitialSeed();
    setSettings(fresh.settings);
    setUsers(fresh.users);
    setCurrentUserId(fresh.users[0].id);
    setInvestments(fresh.investments);
    setWithdrawals(fresh.withdrawals);
    setCustomers(fresh.customers);
    setInventory(fresh.inventory);
    setSales(fresh.sales);
    setInstallments(fresh.installments);
    setServiceOrders(fresh.serviceOrders);
    setCollectionLogs(fresh.collectionLogs);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <StoreContext.Provider
      value={{
        isHydrated,
        supabaseConnected,
        settings,
        users,
        currentUser,
        setCurrentUserId,
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
        toggleUserAccessOnInvestment,
        addInvestment,
        createWithdrawal,
        addCustomer,
        toggleCustomerOptIn,
        addInventoryItem,
        createSaleWithTradeIn,
        payInstallment,
        markInstallmentLoss,
        addServiceOrder,
        updateServiceOrderStatus,
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
