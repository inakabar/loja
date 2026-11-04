export type UserRole =
  | 'admin'
  | 'cobranca'
  | 'crediario'
  | 'venda_loja'
  | 'venda_investimento'
  | 'manutencao';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  cobranca: 'Cobrança',
  crediario: 'Crediário',
  venda_loja: 'Venda da Loja',
  venda_investimento: 'Venda dos Investimentos',
  manutencao: 'Manutenção',
};

export interface AppUser {
  id: string;
  name: string;
  username: string; // Login de acesso (ex: 'admin', 'bruno')
  email: string;
  password?: string; // Senha de acesso controlada pelo Admin
  roles: UserRole[]; // N perfis por usuário
  allowed_investment_ids: string[]; // Quais planilhas/investimentos este usuário pode acessar/cobrar
  active: boolean;
  created_at: string;
}

export type WithdrawalReasonType =
  | 'mover_planilha'
  | 'uso_proprio'
  | 'custos_loja';

export const WITHDRAWAL_REASON_LABELS: Record<WithdrawalReasonType, string> = {
  mover_planilha: 'Mover para outra planilha',
  uso_proprio: 'Retirada para uso próprio',
  custos_loja: 'Retirada para custos da loja',
};

export interface InvestmentWithdrawal {
  id: string;
  investment_id: string; // Planilha de origem
  target_investment_id?: string | null; // Preenchido quando reason_type === 'mover_planilha'
  target_investment_name?: string | null;
  asset_type: 'cash' | 'device';
  reason_type: WithdrawalReasonType;
  amount: number; // Valor em R$ retirado (ou valor de custo/avaliação do aparelho retirado)
  inventory_item_id?: string | null;
  inventory_item_name?: string | null;
  performed_by_user_id: string;
  performed_by_user_name: string;
  notes?: string;
  created_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  default_monthly_rate_percent: number;
  late_fee_percent: number;
  daily_interest_percent: number;
  pix_key: string;
  store_whatsapp: string;
  min_delay_seconds: number;
  max_delay_seconds: number;
}

export interface Investment {
  id: string;
  name: string;
  description: string;
  initial_capital: number;
  start_date: string;
  status: 'active' | 'closed';
  allowed_user_ids: string[]; // Usuários com acesso a esta planilha
  notes?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  cpf: string;
  phone_whatsapp: string;
  address?: string;
  whatsapp_opt_in: boolean;
  credit_score: 'excelente' | 'bom' | 'atencao' | 'bloqueado';
  notes?: string;
  created_at: string;
}

export type ProductSubcategory =
  | 'celular'
  | 'tablet_relogio'
  | 'capinha'
  | 'pelicula'
  | 'carregador_cabo'
  | 'fone_audio'
  | 'peca_tela'
  | 'peca_bateria'
  | 'peca_conector'
  | 'peca_outros'
  | 'outros';

export const PRODUCT_SUBCATEGORY_LABELS: Record<ProductSubcategory, string> = {
  celular: '📱 Celular / Smartphone',
  tablet_relogio: '⌚ Tablet / Smartwatch',
  capinha: '🛡️ Capinha / Case',
  pelicula: '✨ Película Protetora',
  carregador_cabo: '🔌 Carregador / Cabo / Fonte',
  fone_audio: '🎧 Fone / Caixa de Som',
  peca_tela: '🔧 Peça: Tela / Display',
  peca_bateria: '🔋 Peça: Bateria',
  peca_conector: '⚡ Peça: Conector / Flex',
  peca_outros: '🔩 Peça: Outros Componentes',
  outros: '📦 Outros Produtos',
};

export interface PurchaseHistoryEntry {
  id: string;
  date: string;
  quantity: number;
  unit_cost: number;
  extra_cost: number;
  supplier_or_notes?: string;
}

export interface InventoryItem {
  id: string;
  investment_id: string; // ID da planilha ou 'loja' para estoque próprio da loja
  origin_sale_id?: string | null;
  generation: number; // 1 = Lote inicial, 2 = 1ª Troca, 3 = 2ª Troca...
  category: 'device' | 'accessory' | 'part';
  subcategory?: ProductSubcategory;
  brand: string;
  model: string;
  storage?: string;
  color?: string;
  imei?: string;
  battery_health?: number;
  condition: 'novo' | 'seminovo' | 'troca';
  purchase_cost: number;
  repair_cost: number;
  suggested_price: number;
  quantity: number;
  status: 'in_stock' | 'in_repair' | 'sold' | 'withdrawn';
  notes?: string;
  purchase_history?: PurchaseHistoryEntry[];
  created_at: string;
}

export interface Sale {
  id: string;
  code: string;
  customer_id: string | null;
  customer_name: string;
  investment_id: string; // ID da planilha ou 'loja'
  sold_item_id: string;
  sold_item_name: string;
  sale_price: number;
  discount: number;
  cash_down_payment: number;
  trade_in_item_id?: string | null;
  trade_in_model?: string | null;
  trade_in_value: number;
  financed_principal: number;
  monthly_rate_percent: number;
  installments_count: number;
  suggested_installment_value: number;
  final_installment_value: number;
  is_manual_override: boolean;
  total_financed_with_interest: number;
  total_sale_final: number;
  payment_type: 'avista' | 'crediario' | 'cartao';
  notes?: string;
  created_at: string;
}

export interface Installment {
  id: string;
  sale_id: string;
  sale_code: string;
  investment_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  sold_item_name: string;
  installment_number: number;
  total_installments: number;
  due_date: string;
  original_amount: number;
  late_fee_applied: number;
  interest_applied: number;
  discount_applied: number;
  paid_amount: number;
  paid_at?: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'renegotiated' | 'loss';
  last_collection_at?: string | null;
  collection_count: number;
}

export interface ServiceOrderPartUsage {
  id: string;
  inventory_item_id?: string | null;
  part_name: string;
  quantity: number;
  unit_cost: number;
  need_to_buy: boolean;
  bought: boolean;
}

export interface ServiceOrder {
  id: string;
  code: string;
  order_type: 'customer' | 'internal_stock';
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_cpf?: string;
  inventory_item_id?: string | null;
  investment_id?: string | null;
  device_brand?: string;
  device_model: string;
  device_color?: string;
  device_password?: string;
  imei?: string;
  entry_checklist?: string;
  reported_defect: string;
  technical_diagnosis?: string;
  used_parts?: ServiceOrderPartUsage[];
  parts_cost: number;
  service_price: number;
  status: 'orcamento' | 'aprovado' | 'aguardando_peca' | 'em_bancada' | 'pronto' | 'entregue';
  warranty_days: number;
  created_at: string;
  completed_at?: string | null;
}

export interface CollectionLog {
  id: string;
  installment_id: string;
  customer_id: string;
  customer_name: string;
  phone_whatsapp: string;
  message_sent: string;
  delay_seconds: number;
  dispatch_mode: 'connector' | 'web_fallback';
  status: 'sent' | 'failed';
  sent_at: string;
}

export interface InvestmentMetrics {
  investment: Investment;
  initialCapital: number;
  transfersInTotal: number; // Recebido de outra planilha
  additionalStockCost: number;
  internalRepairCosts: number;
  serviceOrdersRevenue: number;
  cashDownPaymentsReceived: number;
  installmentsPaidTotal: number;
  lateFeesAndInterestEarned: number;
  grossCashGenerated: number; // Bruto gerado antes das retiradas
  cashWithdrawalsTotal: number; // Dinheiro retirado da planilha
  deviceWithdrawalsTotal: number; // Valor dos aparelhos retirados da planilha
  totalWithdrawalsDeducted: number; // Soma de retiradas abatidas desta planilha
  totalCashRealized: number; // Caixa líquido restante na planilha após retiradas em dinheiro
  netCashFlow: number;
  paybackProgressPercent: number;
  pendingReceivablesOnTime: number;
  overdueReceivablesWithFees: number;
  lossesTotal: number;
  stockValueAtCost: number;
  stockValueAtSuggestedPrice: number;
  initialDevicesCount: number;
  tradeInDevicesReceivedCount: number;
  tradeInDevicesSoldCount: number;
  tradeInDevicesInStockCount: number;
  projectedTotalPatrimony: number; // Patrimônio líquido atual da planilha (já descontando retiradas)
  projectedNetProfit: number; // Lucro gerado líquido após retiradas
  projectedRoiPercent: number;
}
