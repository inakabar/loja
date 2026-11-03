-- =============================================================================
-- SISTEMA DE GESTÃO DE LOJA DE ELETRÔNICOS, PLANILHAS, CREDIÁRIO COM TROCA & OS
-- Projeto Novo e Isolado no Supabase Free Tier (PostgreSQL 15+)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONFIGURAÇÕES DA LOJA (Taxa padrão %, Multa %, Juros/dia %, Chave PIX)
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings-1',
  store_name TEXT NOT NULL DEFAULT 'PrimeCell Eletrônicos & Crediário',
  default_monthly_rate_percent NUMERIC(6,2) NOT NULL DEFAULT 6.00,
  late_fee_percent NUMERIC(6,2) NOT NULL DEFAULT 2.00,
  daily_interest_percent NUMERIC(6,3) NOT NULL DEFAULT 0.330,
  pix_key TEXT NOT NULL DEFAULT 'pix@primecelleletronicos.com.br',
  store_whatsapp TEXT NOT NULL DEFAULT '5511998887766',
  min_delay_seconds INTEGER NOT NULL DEFAULT 8,
  max_delay_seconds INTEGER NOT NULL DEFAULT 120,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USUÁRIOS E MÚLTIPLOS PERFIS (N perfis por usuário + Acesso por Planilha)
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT ARRAY['cobranca']::TEXT[],
  allowed_investment_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PLANILHAS / INVESTIMENTOS DE CAPITAL (Ex: "Planilha #01 — R$ 30.000")
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  initial_capital NUMERIC(12,2) NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  allowed_user_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RETIRADAS DAS PLANILHAS (Dinheiro ou Aparelho: Mover para outra planilha, Uso próprio, Custos da loja)
CREATE TABLE IF NOT EXISTS investment_withdrawals (
  id TEXT PRIMARY KEY,
  investment_id TEXT NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  target_investment_id TEXT,
  target_investment_name TEXT,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('cash', 'device')),
  reason_type TEXT NOT NULL CHECK (reason_type IN ('mover_planilha', 'uso_proprio', 'custos_loja')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  inventory_item_id TEXT,
  inventory_item_name TEXT,
  performed_by_user_id TEXT NOT NULL,
  performed_by_user_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CLIENTES
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cpf TEXT,
  phone_whatsapp TEXT NOT NULL,
  address TEXT,
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  credit_score TEXT NOT NULL DEFAULT 'bom' CHECK (credit_score IN ('excelente', 'bom', 'atencao', 'bloqueado')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ESTOQUE DE PRODUTOS E APARELHOS (Vinculados à Planilha de origem, 'loja' ou herdados via Troca)
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY,
  investment_id TEXT NOT NULL DEFAULT 'loja',
  origin_sale_id TEXT,
  generation INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'device' CHECK (category IN ('device', 'accessory', 'part')),
  brand TEXT NOT NULL DEFAULT 'Apple',
  model TEXT NOT NULL,
  storage TEXT,
  color TEXT,
  imei TEXT,
  battery_health INTEGER,
  condition TEXT NOT NULL DEFAULT 'seminovo' CHECK (condition IN ('novo', 'seminovo', 'troca')),
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  repair_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  suggested_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'in_repair', 'sold', 'withdrawn')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. VENDAS (À Vista e Crediário com Troca de Equipamentos)
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  customer_id TEXT REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  investment_id TEXT NOT NULL,
  sold_item_id TEXT REFERENCES inventory_items(id) ON DELETE SET NULL,
  sold_item_name TEXT NOT NULL,
  sale_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cash_down_payment NUMERIC(12,2) NOT NULL DEFAULT 0,
  trade_in_item_id TEXT,
  trade_in_model TEXT,
  trade_in_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  financed_principal NUMERIC(12,2) NOT NULL DEFAULT 0,
  monthly_rate_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  installments_count INTEGER NOT NULL DEFAULT 1,
  suggested_installment_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  final_installment_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  total_financed_with_interest NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sale_final NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'crediario' CHECK (payment_type IN ('avista', 'crediario', 'cartao')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PARCELAS DO CREDIÁRIO
CREATE TABLE IF NOT EXISTS installments (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  sale_code TEXT NOT NULL,
  investment_id TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  sold_item_name TEXT NOT NULL,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  due_date DATE NOT NULL,
  original_amount NUMERIC(12,2) NOT NULL,
  late_fee_applied NUMERIC(12,2) NOT NULL DEFAULT 0,
  interest_applied NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_applied NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'renegotiated', 'loss')),
  last_collection_at TIMESTAMPTZ,
  collection_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. ORDENS DE SERVIÇO / MANUTENÇÃO (Clientes Externos e Reforma Interna de Trocas)
CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'customer' CHECK (order_type IN ('customer', 'internal_stock')),
  customer_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  inventory_item_id TEXT,
  investment_id TEXT,
  device_model TEXT NOT NULL,
  imei TEXT,
  reported_defect TEXT NOT NULL,
  technical_diagnosis TEXT,
  parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  service_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'em_bancada' CHECK (status IN ('orcamento', 'aprovado', 'aguardando_peca', 'em_bancada', 'pronto', 'entregue')),
  warranty_days INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 10. LOGS DE DISPARO DE COBRANÇA WHATSAPP (Histórico Anti-Ban)
CREATE TABLE IF NOT EXISTS collection_logs (
  id TEXT PRIMARY KEY,
  installment_id TEXT,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  phone_whatsapp TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  delay_seconds INTEGER NOT NULL DEFAULT 0,
  dispatch_mode TEXT NOT NULL DEFAULT 'connector' CHECK (dispatch_mode IN ('connector', 'web_fallback')),
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance em consultas por Planilha e Vencimento
CREATE INDEX IF NOT EXISTS idx_inventory_investment ON inventory_items(investment_id);
CREATE INDEX IF NOT EXISTS idx_sales_investment ON sales(investment_id);
CREATE INDEX IF NOT EXISTS idx_installments_investment ON installments(investment_id);
CREATE INDEX IF NOT EXISTS idx_installments_due_status ON installments(due_date, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_investment ON investment_withdrawals(investment_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_investment ON service_orders(investment_id);
