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
} from '@/types/domain';

const USER_PREFIX = '__usr__:';
const PWD_PREFIX = '__pwd__:';

export function serializeUserForDb(user: AppUser) {
  const cleanInvs = (user.allowed_investment_ids || []).filter(
    (item) => !item.startsWith(USER_PREFIX) && !item.startsWith(PWD_PREFIX)
  );
  const username =
    user.username?.trim() ||
    user.email?.split('@')[0]?.toLowerCase() ||
    'usuario';
  const password = user.password || 'admin123';

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    allowed_investment_ids: [
      ...cleanInvs,
      `${USER_PREFIX}${username}`,
      `${PWD_PREFIX}${password}`,
    ],
    active: user.active,
    created_at: user.created_at,
  };
}

export function deserializeUserFromDb(row: Record<string, unknown>): AppUser {
  const rawList = Array.isArray(row.allowed_investment_ids)
    ? (row.allowed_investment_ids as string[])
    : [];

  let username = '';
  let password = '';
  const cleanInvs: string[] = [];

  for (const item of rawList) {
    if (typeof item === 'string' && item.startsWith(USER_PREFIX)) {
      username = item.slice(USER_PREFIX.length);
    } else if (typeof item === 'string' && item.startsWith(PWD_PREFIX)) {
      password = item.slice(PWD_PREFIX.length);
    } else if (typeof item === 'string') {
      cleanInvs.push(item);
    }
  }

  const email = String(row.email || 'admin@loja.com');
  if (!username) {
    username = email.split('@')[0].toLowerCase();
  }
  if (!password) {
    password = 'admin123';
  }

  return {
    id: String(row.id),
    name: String(row.name || 'Usuário'),
    username,
    email,
    password,
    roles: Array.isArray(row.roles) ? (row.roles as AppUser['roles']) : ['cobranca'],
    allowed_investment_ids: cleanInvs,
    active: row.active !== false,
    created_at: String(row.created_at || new Date().toISOString().split('T')[0]),
  };
}

export function buildInitialSeed() {
  const today = new Date().toISOString().split('T')[0];

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
      name: 'Administrador Geral',
      username: 'admin',
      email: 'admin@loja.com',
      password: 'admin123',
      roles: [
        'admin',
        'venda_investimento',
        'venda_loja',
        'cobranca',
        'manutencao',
      ],
      allowed_investment_ids: [],
      active: true,
      created_at: today,
    },
  ];

  const investments: Investment[] = [];
  const withdrawals: InvestmentWithdrawal[] = [];
  const customers: Customer[] = [];
  const inventory: InventoryItem[] = [];
  const sales: Sale[] = [];
  const installments: Installment[] = [];
  const serviceOrders: ServiceOrder[] = [];
  const collectionLogs: CollectionLog[] = [];

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
