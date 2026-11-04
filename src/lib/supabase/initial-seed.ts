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
const INV_META_MARKER = ' ||META_INV:';
const OS_META_MARKER = ' ||META_OS:';

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

  const rawRoles: AppUser['roles'] = Array.isArray(row.roles)
    ? (row.roles as AppUser['roles'])
    : ['cobranca'];

  return {
    id: String(row.id),
    name: String(row.name || 'Usuário'),
    username,
    email,
    password,
    roles: rawRoles,
    allowed_investment_ids: cleanInvs,
    active: row.active !== false,
    created_at: String(
      row.created_at || new Date().toISOString().split('T')[0]
    ),
  };
}

export function serializeInventoryForDb(item: InventoryItem) {
  const cleanNotes = (item.notes || '').split(INV_META_MARKER)[0];
  const meta = {
    subcategory: item.subcategory,
    purchase_history: item.purchase_history || [],
  };
  const encodedNotes = `${cleanNotes}${INV_META_MARKER}${JSON.stringify(meta)}`;

  return {
    id: item.id,
    investment_id: item.investment_id,
    origin_sale_id: item.origin_sale_id || null,
    generation: item.generation || 1,
    category: item.category,
    brand: item.brand,
    model: item.model,
    storage: item.storage || '',
    color: item.color || '',
    imei: item.imei || '',
    battery_health: item.battery_health ?? null,
    condition: item.condition || 'novo',
    purchase_cost: item.purchase_cost || 0,
    repair_cost: item.repair_cost || 0,
    suggested_price: item.suggested_price || 0,
    quantity: item.quantity ?? 1,
    status: item.status || 'in_stock',
    notes: encodedNotes,
    created_at: item.created_at,
  };
}

export function deserializeInventoryFromDb(
  row: Record<string, unknown>
): InventoryItem {
  const rawNotes = String(row.notes || '');
  const [cleanNotes, metaJson] = rawNotes.split(INV_META_MARKER);
  let subcategory: InventoryItem['subcategory'] = undefined;
  let purchase_history: InventoryItem['purchase_history'] = [];

  if (metaJson) {
    try {
      const parsed = JSON.parse(metaJson);
      subcategory = parsed.subcategory;
      purchase_history = Array.isArray(parsed.purchase_history)
        ? parsed.purchase_history
        : [];
    } catch {
      // ignore
    }
  }

  const category = (row.category as InventoryItem['category']) || 'device';
  if (!subcategory) {
    subcategory =
      category === 'device'
        ? 'celular'
        : category === 'part'
        ? 'peca_outros'
        : 'capinha';
  }

  return {
    id: String(row.id),
    investment_id: String(row.investment_id || 'loja'),
    origin_sale_id: (row.origin_sale_id as string | null) || null,
    generation: Number(row.generation || 1),
    category,
    subcategory,
    brand: String(row.brand || ''),
    model: String(row.model || ''),
    storage: row.storage ? String(row.storage) : undefined,
    color: row.color ? String(row.color) : undefined,
    imei: row.imei ? String(row.imei) : undefined,
    battery_health:
      row.battery_health !== null && row.battery_health !== undefined
        ? Number(row.battery_health)
        : undefined,
    condition: (row.condition as InventoryItem['condition']) || 'novo',
    purchase_cost: Number(row.purchase_cost || 0),
    repair_cost: Number(row.repair_cost || 0),
    suggested_price: Number(row.suggested_price || 0),
    quantity: Number(row.quantity ?? 1),
    status: (row.status as InventoryItem['status']) || 'in_stock',
    notes: cleanNotes || undefined,
    purchase_history,
    created_at: String(row.created_at || new Date().toISOString()),
  };
}

export function serializeServiceOrderForDb(os: ServiceOrder) {
  const cleanDiag = (os.technical_diagnosis || '').split(OS_META_MARKER)[0];
  const meta = {
    customer_cpf: os.customer_cpf,
    device_brand: os.device_brand,
    device_color: os.device_color,
    device_password: os.device_password,
    entry_checklist: os.entry_checklist || [],
    used_parts: os.used_parts || [],
  };
  const encodedDiag = `${cleanDiag}${OS_META_MARKER}${JSON.stringify(meta)}`;

  return {
    id: os.id,
    code: os.code,
    order_type: os.order_type,
    customer_id: os.customer_id || null,
    customer_name: os.customer_name,
    customer_phone: os.customer_phone,
    inventory_item_id: os.inventory_item_id || null,
    investment_id: os.investment_id || null,
    device_model: os.device_model,
    imei: os.imei || '',
    reported_defect: os.reported_defect,
    technical_diagnosis: encodedDiag,
    parts_cost: os.parts_cost || 0,
    service_price: os.service_price || 0,
    status: os.status,
    warranty_days: os.warranty_days || 90,
    created_at: os.created_at,
    completed_at: os.completed_at || null,
  };
}

export function deserializeServiceOrderFromDb(
  row: Record<string, unknown>
): ServiceOrder {
  const rawDiag = String(row.technical_diagnosis || '');
  const [cleanDiag, metaJson] = rawDiag.split(OS_META_MARKER);
  let customer_cpf: string | undefined;
  let device_brand: string | undefined;
  let device_color: string | undefined;
  let device_password: string | undefined;
  let entry_checklist: string | undefined;
  let used_parts: ServiceOrder['used_parts'] = [];

  if (metaJson) {
    try {
      const parsed = JSON.parse(metaJson);
      customer_cpf = parsed.customer_cpf;
      device_brand = parsed.device_brand;
      device_color = parsed.device_color;
      device_password = parsed.device_password;
      entry_checklist = Array.isArray(parsed.entry_checklist)
        ? parsed.entry_checklist.join(', ')
        : parsed.entry_checklist
        ? String(parsed.entry_checklist)
        : undefined;
      used_parts = Array.isArray(parsed.used_parts) ? parsed.used_parts : [];
    } catch {
      // ignore
    }
  }

  return {
    id: String(row.id),
    code: String(row.code),
    order_type: (row.order_type as ServiceOrder['order_type']) || 'customer',
    customer_id: (row.customer_id as string | null) || null,
    customer_name: String(row.customer_name || ''),
    customer_phone: String(row.customer_phone || ''),
    customer_cpf,
    inventory_item_id: (row.inventory_item_id as string | null) || null,
    investment_id: (row.investment_id as string | null) || null,
    device_brand,
    device_model: String(row.device_model || ''),
    device_color,
    device_password,
    imei: row.imei ? String(row.imei) : undefined,
    entry_checklist,
    reported_defect: String(row.reported_defect || ''),
    technical_diagnosis: cleanDiag || undefined,
    used_parts,
    parts_cost: Number(row.parts_cost || 0),
    service_price: Number(row.service_price || 0),
    status: (row.status as ServiceOrder['status']) || 'em_bancada',
    warranty_days: Number(row.warranty_days || 90),
    created_at: String(row.created_at || new Date().toISOString()),
    completed_at: (row.completed_at as string | null) || null,
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
        'crediario',
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
