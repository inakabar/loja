import { Installment, StoreSettings } from '@/types/domain';
import { calculateInstallmentLateFees } from './crediario';

function pickRandom<T>(arr: T[], seedOffset = 0): T {
  const index = Math.floor(Math.random() * arr.length + seedOffset) % arr.length;
  return arr[index];
}

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('T')[0].split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

/**
 * Sorteia um intervalo aleatório em segundos entre o mínimo (ex: 8s) e o máximo (ex: 120s).
 * Usa distribuição variada para simular perfeitamente o ritmo humano no WhatsApp.
 */
export function generateRandomCadenceDelay(
  minSeconds = 8,
  maxSeconds = 120
): number {
  const safeMin = Math.max(5, Math.min(minSeconds, maxSeconds));
  const safeMax = Math.max(safeMin + 1, maxSeconds);
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

/**
 * Gera uma mensagem única (Spintax) variando saudação, corpo, emojis e fechamento
 * para evitar detecção de mensagens idênticas em massa pelo algoritmo do WhatsApp.
 */
export function generateDynamicCollectionMessage(
  installment: Installment,
  settings: StoreSettings
): {
  message: string;
  variationLabel: string;
  updatedAmount: number;
  daysLate: number;
} {
  const firstName = installment.customer_name.split(' ')[0];
  const breakdown = calculateInstallmentLateFees(installment, settings);

  const greetings = [
    `Olá ${firstName}, tudo bem com você?`,
    `Oi ${firstName}! Tudo certo por aí?`,
    `Bom dia ${firstName}, como vai?`,
    `Fala ${firstName}, tranquilo?`,
    `Ei ${firstName}, espero que esteja tudo ótimo!`,
    `Olá ${firstName}! Passando rapidinho por aqui.`,
  ];

  const closings = [
    `Para facilitar, nossa chave PIX é: *${settings.pix_key}*\nAssim que fizer, me manda o comprovante por aqui para eu já dar baixa no seu carnê! 🙏`,
    `Você pode quitar direto pela chave PIX: *${settings.pix_key}*\nMe avisa assim que transferir para eu atualizar seu cadastro. Valeu!`,
    `Segue o PIX da loja para pagamento: *${settings.pix_key}*\nQualquer dúvida estou à disposição por aqui! 👍`,
    `Nossa chave PIX continua a mesma: *${settings.pix_key}*\nQuando realizar o envio, só me encaminhar o comprovante aqui na conversa!`,
  ];

  const greeting = pickRandom(greetings);
  const closing = pickRandom(closings);
  const quotaLabel = `${installment.installment_number}/${installment.total_installments}`;

  let body = '';
  let variationLabel = '';

  if (breakdown.isOverdue) {
    const overdueBodies = [
      `Vi aqui no sistema da *${settings.store_name}* que a parcela *${quotaLabel}* do seu *${installment.sold_item_name}* (vencida em ${formatDateBR(installment.due_date)}, há ${breakdown.daysLate} dias) ainda consta em aberto. Com os encargos de atraso, o valor atualizado ficou em *${formatCurrencyBRL(breakdown.updatedTotalAmount)}* (valor original ${formatCurrencyBRL(installment.original_amount)}).`,
      `Tudo joia? Estamos fechando o caixa da *${settings.store_name}* e notamos que a parcela *${quotaLabel}* referente ao *${installment.sold_item_name}* venceu no dia ${formatDateBR(installment.due_date)} (${breakdown.daysLate} dias atrás). O valor atualizado hoje está em *${formatCurrencyBRL(breakdown.updatedTotalAmount)}*.`,
      `Passando para te ajudar a regularizar a parcela *${quotaLabel}* do seu *${installment.sold_item_name}* que venceu em ${formatDateBR(installment.due_date)}. Hoje ela está com ${breakdown.daysLate} dias de atraso, totalizando *${formatCurrencyBRL(breakdown.updatedTotalAmount)}*. Conseguimos fechar ela hoje?`,
    ];
    body = pickRandom(overdueBodies);
    variationLabel = `Atraso (${breakdown.daysLate}d) • Variação #${Math.floor(Math.random() * 90 + 10)}`;
  } else if (breakdown.isDueToday) {
    const dueTodayBodies = [
      `Passando só para lembrar que *hoje (${formatDateBR(installment.due_date)})* é o dia do vencimento da parcela *${quotaLabel}* do seu *${installment.sold_item_name}*, no valor de *${formatCurrencyBRL(installment.original_amount)}* para pagamento em dia sem juros.`,
      `Lembrete amigável da *${settings.store_name}*: hoje vence a sua parcela *${quotaLabel}* referente ao *${installment.sold_item_name}* (${formatCurrencyBRL(installment.original_amount)}).`,
      `Só te avisando para não correr juros: a parcela *${quotaLabel}* do *${installment.sold_item_name}* vence hoje, no valor certinho de *${formatCurrencyBRL(installment.original_amount)}*.`,
    ];
    body = pickRandom(dueTodayBodies);
    variationLabel = `Vence Hoje • Variação #${Math.floor(Math.random() * 90 + 10)}`;
  } else {
    const reminderBodies = [
      `Passando para lembrar com antecedência que a parcela *${quotaLabel}* do seu *${installment.sold_item_name}* vence em *${formatDateBR(installment.due_date)}* (daqui a ${breakdown.daysUntilDue} dias), no valor de *${formatCurrencyBRL(installment.original_amount)}*.`,
      `Lembrete rápido da *${settings.store_name}*: sua próxima parcela (*${quotaLabel}*) do *${installment.sold_item_name}* está programada para *${formatDateBR(installment.due_date)}* no valor de *${formatCurrencyBRL(installment.original_amount)}*.`,
    ];
    body = pickRandom(reminderBodies);
    variationLabel = `Preventivo (D-${breakdown.daysUntilDue}) • Variação #${Math.floor(Math.random() * 90 + 10)}`;
  }

  return {
    message: `${greeting}\n\n${body}\n\n${closing}`,
    variationLabel,
    updatedAmount: breakdown.updatedTotalAmount,
    daysLate: breakdown.daysLate,
  };
}
