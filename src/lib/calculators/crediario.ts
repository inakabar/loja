import {
  Installment,
  InventoryItem,
  Investment,
  InvestmentMetrics,
  InvestmentWithdrawal,
  Sale,
  ServiceOrder,
  StoreSettings,
} from '@/types/domain';

export interface CrediarioCalculationInput {
  salePrice: number;
  discount: number;
  cashDownPayment: number;
  tradeInValue: number;
  monthlyRatePercent: number;
  installmentsCount: number;
  manualInstallmentValue?: number | null;
}

export interface CrediarioCalculationResult {
  netSalePrice: number;
  totalEntry: number;
  financedPrincipal: number;
  totalInterestSuggested: number;
  totalFinancedSuggested: number;
  suggestedInstallmentValue: number;
  finalInstallmentValue: number;
  isManualOverride: boolean;
  totalFinancedFinal: number;
  totalInterestFinal: number;
  effectiveMonthlyRatePercent: number;
  totalSaleFinal: number;
}

export function calculateCrediario(
  input: CrediarioCalculationInput
): CrediarioCalculationResult {
  const netSalePrice = Math.max(0, input.salePrice - (input.discount || 0));
  const totalEntry = (input.cashDownPayment || 0) + (input.tradeInValue || 0);
  const financedPrincipal = Math.max(0, netSalePrice - totalEntry);
  const count = Math.max(1, input.installmentsCount || 1);

  if (financedPrincipal <= 0) {
    return {
      netSalePrice,
      totalEntry,
      financedPrincipal: 0,
      totalInterestSuggested: 0,
      totalFinancedSuggested: 0,
      suggestedInstallmentValue: 0,
      finalInstallmentValue: 0,
      isManualOverride: false,
      totalFinancedFinal: 0,
      totalInterestFinal: 0,
      effectiveMonthlyRatePercent: 0,
      totalSaleFinal: totalEntry,
    };
  }

  const totalRateMultiplier = (input.monthlyRatePercent / 100) * count;
  const totalInterestSuggested = Number(
    (financedPrincipal * totalRateMultiplier).toFixed(2)
  );
  const totalFinancedSuggested = Number(
    (financedPrincipal + totalInterestSuggested).toFixed(2)
  );
  const suggestedInstallmentValue = Number(
    (totalFinancedSuggested / count).toFixed(2)
  );

  const hasManual =
    typeof input.manualInstallmentValue === 'number' &&
    input.manualInstallmentValue > 0 &&
    Math.abs(input.manualInstallmentValue - suggestedInstallmentValue) >= 0.01;

  const finalInstallmentValue = hasManual
    ? Number(input.manualInstallmentValue!.toFixed(2))
    : suggestedInstallmentValue;

  const totalFinancedFinal = Number((finalInstallmentValue * count).toFixed(2));
  const totalInterestFinal = Number(
    (totalFinancedFinal - financedPrincipal).toFixed(2)
  );

  const effectiveMonthlyRatePercent =
    financedPrincipal > 0
      ? Number(
          (((totalFinancedFinal / financedPrincipal - 1) / count) * 100).toFixed(
            2
          )
        )
      : 0;

  const totalSaleFinal = Number((totalEntry + totalFinancedFinal).toFixed(2));

  return {
    netSalePrice,
    totalEntry,
    financedPrincipal,
    totalInterestSuggested,
    totalFinancedSuggested,
    suggestedInstallmentValue,
    finalInstallmentValue,
    isManualOverride: hasManual,
    totalFinancedFinal,
    totalInterestFinal,
    effectiveMonthlyRatePercent,
    totalSaleFinal,
  };
}

export interface InstallmentLateBreakdown {
  daysLate: number;
  isOverdue: boolean;
  isDueToday: boolean;
  daysUntilDue: number;
  lateFeeAmount: number;
  interestAmount: number;
  updatedTotalAmount: number;
}

export function calculateInstallmentLateFees(
  installment: Installment,
  settings: StoreSettings,
  referenceDateStr?: string
): InstallmentLateBreakdown {
  const todayStr =
    referenceDateStr || new Date().toISOString().split('T')[0];
  const today = new Date(`${todayStr}T12:00:00`);
  const due = new Date(`${installment.due_date}T12:00:00`);

  const diffMs = today.getTime() - due.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (installment.status === 'paid' || installment.status === 'loss') {
    return {
      daysLate: Math.max(0, diffDays),
      isOverdue: false,
      isDueToday: false,
      daysUntilDue: Math.max(0, -diffDays),
      lateFeeAmount: installment.late_fee_applied || 0,
      interestAmount: installment.interest_applied || 0,
      updatedTotalAmount:
        installment.paid_amount || installment.original_amount,
    };
  }

  if (diffDays <= 0) {
    return {
      daysLate: 0,
      isOverdue: false,
      isDueToday: diffDays === 0,
      daysUntilDue: Math.abs(diffDays),
      lateFeeAmount: 0,
      interestAmount: 0,
      updatedTotalAmount: installment.original_amount,
    };
  }

  const lateFeeAmount = Number(
    ((installment.original_amount * settings.late_fee_percent) / 100).toFixed(2)
  );
  const interestAmount = Number(
    (
      (installment.original_amount *
        (settings.daily_interest_percent * diffDays)) /
      100
    ).toFixed(2)
  );
  const updatedTotalAmount = Number(
    (installment.original_amount + lateFeeAmount + interestAmount).toFixed(2)
  );

  return {
    daysLate: diffDays,
    isOverdue: true,
    isDueToday: false,
    daysUntilDue: 0,
    lateFeeAmount,
    interestAmount,
    updatedTotalAmount,
  };
}

/**
 * Calcula o desempenho completo de uma Planilha / Investimento isolado,
 * abatendo todas as retiradas (Dinheiro ou Aparelho) do valor gerado na planilha.
 */
export function calculateInvestmentMetrics(
  investment: Investment,
  items: InventoryItem[],
  sales: Sale[],
  installments: Installment[],
  serviceOrders: ServiceOrder[],
  settings: StoreSettings,
  withdrawals: InvestmentWithdrawal[] = []
): InvestmentMetrics {
  const invItems = items.filter((i) => i.investment_id === investment.id);
  const invSales = sales.filter((s) => s.investment_id === investment.id);
  const invInstallments = installments.filter(
    (inst) => inst.investment_id === investment.id
  );
  const invServiceOrders = serviceOrders.filter(
    (so) => so.investment_id === investment.id
  );

  // Retiradas feitas DESTA planilha
  const outgoingWithdrawals = withdrawals.filter(
    (w) => w.investment_id === investment.id
  );
  // Transferências em dinheiro recebidas de OUTRA planilha
  const incomingCashTransfers = withdrawals.filter(
    (w) =>
      w.target_investment_id === investment.id &&
      w.reason_type === 'mover_planilha' &&
      w.asset_type === 'cash'
  );

  const initialCapital = investment.initial_capital;
  const transfersInTotal = incomingCashTransfers.reduce(
    (acc, w) => acc + (w.amount || 0),
    0
  );

  const osInternalCosts = invServiceOrders
    .filter((so) => so.order_type === 'internal_stock')
    .reduce((acc, so) => acc + (so.parts_cost || 0), 0);

  const itemsRepairCosts = invItems.reduce(
    (acc, item) => acc + (item.repair_cost || 0),
    0
  );

  const internalRepairCosts = Math.max(osInternalCosts, itemsRepairCosts);

  const serviceOrdersRevenue = invServiceOrders
    .filter(
      (so) =>
        so.order_type === 'customer' &&
        (so.status === 'pronto' || so.status === 'entregue')
    )
    .reduce(
      (acc, so) => acc + ((so.service_price || 0) - (so.parts_cost || 0)),
      0
    );

  const cashDownPaymentsReceived = invSales.reduce(
    (acc, s) => acc + (s.cash_down_payment || 0),
    0
  );

  const paidInstallments = invInstallments.filter((i) => i.status === 'paid');
  const installmentsPaidTotal = paidInstallments.reduce(
    (acc, i) => acc + (i.paid_amount || i.original_amount),
    0
  );

  const lateFeesAndInterestEarned = paidInstallments.reduce(
    (acc, i) => acc + (i.late_fee_applied || 0) + (i.interest_applied || 0),
    0
  );

  const grossCashGenerated = Number(
    (
      cashDownPaymentsReceived +
      installmentsPaidTotal +
      serviceOrdersRevenue +
      transfersInTotal -
      internalRepairCosts
    ).toFixed(2)
  );

  // Soma de retiradas em dinheiro e em aparelhos
  const cashWithdrawalsTotal = Number(
    outgoingWithdrawals
      .filter((w) => w.asset_type === 'cash')
      .reduce((acc, w) => acc + (w.amount || 0), 0)
      .toFixed(2)
  );

  const deviceWithdrawalsTotal = Number(
    outgoingWithdrawals
      .filter((w) => w.asset_type === 'device')
      .reduce((acc, w) => acc + (w.amount || 0), 0)
      .toFixed(2)
  );

  const totalWithdrawalsDeducted = Number(
    (cashWithdrawalsTotal + deviceWithdrawalsTotal).toFixed(2)
  );

  // Caixa líquido atual da planilha (já abatendo as retiradas em dinheiro!)
  const totalCashRealized = Number(
    (grossCashGenerated - cashWithdrawalsTotal).toFixed(2)
  );

  const netCashFlow = Number((totalCashRealized - initialCapital).toFixed(2));
  const paybackProgressPercent =
    initialCapital > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Number(((totalCashRealized / initialCapital) * 100).toFixed(1))
          )
        )
      : 100;

  let pendingReceivablesOnTime = 0;
  let overdueReceivablesWithFees = 0;
  let lossesTotal = 0;

  for (const inst of invInstallments) {
    if (inst.status === 'paid') continue;
    if (inst.status === 'loss') {
      lossesTotal += inst.original_amount;
      continue;
    }
    const breakdown = calculateInstallmentLateFees(inst, settings);
    if (breakdown.isOverdue || inst.status === 'overdue') {
      overdueReceivablesWithFees += breakdown.updatedTotalAmount;
    } else {
      pendingReceivablesOnTime += inst.original_amount;
    }
  }

  // Apenas aparelhos ativos no estoque (exclui 'sold' e 'withdrawn')
  const availableStock = invItems.filter(
    (i) => i.status === 'in_stock' || i.status === 'in_repair'
  );
  const stockValueAtCost = availableStock.reduce(
    (acc, i) =>
      acc + ((i.purchase_cost || 0) + (i.repair_cost || 0)) * (i.quantity || 1),
    0
  );
  const stockValueAtSuggestedPrice = availableStock.reduce(
    (acc, i) => acc + (i.suggested_price || 0) * (i.quantity || 1),
    0
  );

  const initialDevicesCount = invItems.filter((i) => i.generation === 1).length;
  const tradeInItems = invItems.filter(
    (i) => i.generation > 1 || i.condition === 'troca'
  );
  const tradeInDevicesReceivedCount = tradeInItems.length;
  const tradeInDevicesSoldCount = tradeInItems.filter(
    (i) => i.status === 'sold'
  ).length;
  const tradeInDevicesInStockCount = tradeInItems.filter(
    (i) => i.status === 'in_stock' || i.status === 'in_repair'
  ).length;

  // Valor gerado líquido na planilha (já descontando dinheiro retirado e aparelhos retirados)
  const projectedTotalPatrimony = Number(
    (
      totalCashRealized +
      pendingReceivablesOnTime +
      overdueReceivablesWithFees +
      stockValueAtSuggestedPrice
    ).toFixed(2)
  );

  const projectedNetProfit = Number(
    (projectedTotalPatrimony - initialCapital).toFixed(2)
  );

  const projectedRoiPercent =
    initialCapital > 0
      ? Number(((projectedNetProfit / initialCapital) * 100).toFixed(1))
      : 0;

  return {
    investment,
    initialCapital,
    transfersInTotal,
    additionalStockCost: 0,
    internalRepairCosts,
    serviceOrdersRevenue,
    cashDownPaymentsReceived,
    installmentsPaidTotal,
    lateFeesAndInterestEarned,
    grossCashGenerated,
    cashWithdrawalsTotal,
    deviceWithdrawalsTotal,
    totalWithdrawalsDeducted,
    totalCashRealized,
    netCashFlow,
    paybackProgressPercent,
    pendingReceivablesOnTime: Number(pendingReceivablesOnTime.toFixed(2)),
    overdueReceivablesWithFees: Number(overdueReceivablesWithFees.toFixed(2)),
    lossesTotal: Number(lossesTotal.toFixed(2)),
    stockValueAtCost: Number(stockValueAtCost.toFixed(2)),
    stockValueAtSuggestedPrice: Number(stockValueAtSuggestedPrice.toFixed(2)),
    initialDevicesCount,
    tradeInDevicesReceivedCount,
    tradeInDevicesSoldCount,
    tradeInDevicesInStockCount,
    projectedTotalPatrimony,
    projectedNetProfit,
    projectedRoiPercent,
  };
}
