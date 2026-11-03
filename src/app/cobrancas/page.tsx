'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Square,
  QrCode,
  RefreshCw,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Send,
  DollarSign,
  Eye,
  Terminal,
} from 'lucide-react';
import { useStore } from '@/lib/context/StoreContext';
import { calculateInstallmentLateFees } from '@/lib/calculators/crediario';
import {
  formatCurrencyBRL,
  formatDateBR,
  generateDynamicCollectionMessage,
  generateRandomCadenceDelay,
} from '@/lib/calculators/spintax-whatsapp';
import { Installment } from '@/types/domain';

interface QueueItemPlan {
  installment: Installment;
  message: string;
  variationLabel: string;
  updatedAmount: number;
  daysLate: number;
  plannedDelaySeconds: number;
  dispatchStatus: 'waiting' | 'sending' | 'sent' | 'error';
}

export default function CobrancasPage() {
  const {
    installments,
    visibleInvestments,
    settings,
    collectionLogs,
    currentUser,
    canAccessInvestment,
    payInstallment,
    recordCollectionSent,
  } = useStore();

  const connectorUrl =
    process.env.NEXT_PUBLIC_WHATSAPP_CONNECTOR_URL || 'http://localhost:3001';

  const [filterInvId, setFilterInvId] = useState<string>('all');
  const [connectorOnline, setConnectorOnline] = useState<boolean>(false);
  const [whatsappPaired, setWhatsappPaired] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [fastTestMode, setFastTestMode] = useState<boolean>(false);

  const [queuePlans, setQueuePlans] = useState<QueueItemPlan[]>([]);
  const [isRunningQueue, setIsRunningQueue] = useState<boolean>(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [payingInst, setPayingInst] = useState<Installment | null>(null);
  const [chargeLateFees, setChargeLateFees] = useState<boolean>(true);
  const [previewPlan, setPreviewPlan] = useState<QueueItemPlan | null>(null);

  // Filtra ESTRITAMENTE pelas planilhas que o usuário de cobrança tem acesso!
  const actionableInstallments = useMemo(() => {
    return installments
      .filter((i) => {
        if (i.status === 'paid' || i.status === 'loss') return false;
        if (!canAccessInvestment(i.investment_id)) return false;
        if (filterInvId !== 'all' && i.investment_id !== filterInvId) {
          return false;
        }
        return true;
      })
      .map((inst) => ({
        inst,
        breakdown: calculateInstallmentLateFees(inst, settings),
      }))
      .sort((a, b) => b.breakdown.daysLate - a.breakdown.daysLate)
      .map((x) => x.inst);
  }, [installments, settings, canAccessInvestment, filterInvId]);

  const rebuildQueuePlan = () => {
    const minSec = fastTestMode ? 3 : settings.min_delay_seconds || 8;
    const maxSec = fastTestMode ? 7 : settings.max_delay_seconds || 120;

    const plans: QueueItemPlan[] = actionableInstallments.map((inst, idx) => {
      const generated = generateDynamicCollectionMessage(inst, settings);
      const delay = idx === 0 ? 0 : generateRandomCadenceDelay(minSec, maxSec);
      return {
        installment: inst,
        message: generated.message,
        variationLabel: generated.variationLabel,
        updatedAmount: generated.updatedAmount,
        daysLate: generated.daysLate,
        plannedDelaySeconds: delay,
        dispatchStatus: 'waiting',
      };
    });
    setQueuePlans(plans);
    setCurrentQueueIndex(0);
    setCountdownSeconds(0);
  };

  useEffect(() => {
    rebuildQueuePlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    actionableInstallments.length,
    filterInvId,
    currentUser.id,
    fastTestMode,
    settings.min_delay_seconds,
    settings.max_delay_seconds,
  ]);

  const checkLocalConnector = async () => {
    try {
      const res = await fetch(`${connectorUrl}/status`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        setConnectorOnline(true);
        setWhatsappPaired(Boolean(data.connected));
        if (data.qrDataUrl) setQrCodeDataUrl(data.qrDataUrl);
      } else {
        setConnectorOnline(false);
      }
    } catch {
      setConnectorOnline(false);
      setWhatsappPaired(false);
    }
  };

  useEffect(() => {
    checkLocalConnector();
    const interval = setInterval(checkLocalConnector, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dispatchSingleItem = async (plan: QueueItemPlan): Promise<boolean> => {
    if (connectorOnline && whatsappPaired) {
      try {
        const res = await fetch(`${connectorUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: plan.installment.customer_phone,
            message: plan.message,
          }),
        });
        if (!res.ok) throw new Error('Falha no conector');
      } catch {
        return false;
      }
    }

    recordCollectionSent({
      installmentId: plan.installment.id,
      customerId: plan.installment.customer_id,
      customerName: plan.installment.customer_name,
      phoneWhatsapp: plan.installment.customer_phone,
      messageSent: plan.message,
      delaySeconds: plan.plannedDelaySeconds,
      dispatchMode: 'connector',
    });

    return true;
  };

  useEffect(() => {
    if (!isRunningQueue) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (currentQueueIndex >= queuePlans.length) {
      setIsRunningQueue(false);
      setCountdownSeconds(0);
      return;
    }

    const currentPlan = queuePlans[currentQueueIndex];

    if (countdownSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setCountdownSeconds((prev) => prev - 1);
      }, 1000);
      return;
    }

    const executeStep = async () => {
      setQueuePlans((prev) =>
        prev.map((p, i) =>
          i === currentQueueIndex ? { ...p, dispatchStatus: 'sending' } : p
        )
      );

      await new Promise((r) => setTimeout(r, 500));
      await dispatchSingleItem(currentPlan);

      setQueuePlans((prev) =>
        prev.map((p, i) =>
          i === currentQueueIndex ? { ...p, dispatchStatus: 'sent' } : p
        )
      );

      const nextIndex = currentQueueIndex + 1;
      if (nextIndex < queuePlans.length) {
        const nextDelay = queuePlans[nextIndex].plannedDelaySeconds;
        setCurrentQueueIndex(nextIndex);
        setCountdownSeconds(nextDelay);
      } else {
        setIsRunningQueue(false);
      }
    };

    executeStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunningQueue, currentQueueIndex, countdownSeconds]);

  const handleStartQueue = () => {
    const firstPendingIdx = queuePlans.findIndex(
      (p) => p.dispatchStatus !== 'sent'
    );
    if (firstPendingIdx === -1) {
      rebuildQueuePlan();
      setCurrentQueueIndex(0);
      setCountdownSeconds(0);
    } else {
      setCurrentQueueIndex(firstPendingIdx);
      setCountdownSeconds(0);
    }
    setIsRunningQueue(true);
  };

  const handleStopQueue = () => {
    setIsRunningQueue(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleConfirmPayment = () => {
    if (!payingInst) return;
    const b = calculateInstallmentLateFees(payingInst, settings);
    const paidAmount = chargeLateFees
      ? b.updatedTotalAmount
      : payingInst.original_amount;

    payInstallment({
      installmentId: payingInst.id,
      paidAmount,
      lateFeeApplied: chargeLateFees ? b.lateFeeAmount : 0,
      interestApplied: chargeLateFees ? b.interestAmount : 0,
      discountApplied: 0,
    });
    setPayingInst(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra Compacta de Controle da Fila & Conector WhatsApp */}
      <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm font-bold">
              Fila de Cobrança ({queuePlans.length} parcelas nas planilhas de{' '}
              <span className="text-emerald-400">{currentUser.name}</span>)
            </h1>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              {connectorOnline ? (
                <Wifi className="w-3 h-3 text-emerald-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-amber-400" />
              )}
              <span>
                {connectorOnline ? 'Conector 3001 Online' : 'Simulador Local'}
              </span>
            </span>
          </div>

          {isRunningQueue ? (
            <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 animate-spin" />
              {countdownSeconds > 0 ? (
                <span>
                  Próximo disparo para{' '}
                  <u>
                    {queuePlans[currentQueueIndex]?.installment.customer_name}
                  </u>{' '}
                  em{' '}
                  <strong className="px-1.5 py-0.5 rounded bg-emerald-600 text-white">
                    {countdownSeconds}s
                  </strong>
                </span>
              ) : (
                <span>
                  Enviando para{' '}
                  {queuePlans[currentQueueIndex]?.installment.customer_name}...
                </span>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              Cadência anti-banimento ({settings.min_delay_seconds}s a{' '}
              {settings.max_delay_seconds}s) • Apenas vendas das planilhas liberadas para o seu usuário aparecem aqui.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterInvId}
            onChange={(e) => setFilterInvId(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
          >
            <option value="all">Todas as Minhas Planilhas ({visibleInvestments.length})</option>
            {visibleInvestments.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.name}
              </option>
            ))}
          </select>

          <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 bg-slate-800 px-2.5 py-1.5 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={fastTestMode}
              onChange={(e) => setFastTestMode(e.target.checked)}
              className="rounded border-slate-600 text-emerald-500"
            />
            <span>Teste Rápido (3s–7s)</span>
          </label>

          <button
            type="button"
            disabled={isRunningQueue}
            onClick={rebuildQueuePlan}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sortear Tempos</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>QR Code</span>
          </button>

          {!isRunningQueue ? (
            <button
              type="button"
              onClick={handleStartQueue}
              disabled={queuePlans.length === 0}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Disparar Fila</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStopQueue}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Pausar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabela Limpa de Cobranças */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] text-slate-500">
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Cliente / WhatsApp</th>
                <th className="py-2 px-3">Planilha</th>
                <th className="py-2 px-3">Produto / Parcela</th>
                <th className="py-2 px-3">Vencimento</th>
                <th className="py-2 px-3 text-right">Original</th>
                <th className="py-2 px-3 text-right">Atualizado (+Multa)</th>
                <th className="py-2 px-3">Cadência Sorteada</th>
                <th className="py-2 px-3">Status Fila</th>
                <th className="py-2 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queuePlans.map((plan, idx) => {
                const isCurrent = isRunningQueue && idx === currentQueueIndex;
                const inv = visibleInvestments.find(
                  (i) => i.id === plan.installment.investment_id
                );

                return (
                  <tr
                    key={plan.installment.id}
                    className={
                      isCurrent
                        ? 'bg-emerald-50 font-semibold'
                        : 'hover:bg-slate-50'
                    }
                  >
                    <td className="py-2 px-3 font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-900">
                        {plan.installment.customer_name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {plan.installment.customer_phone}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {inv?.name.split('—')[0] || 'Geral'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {plan.installment.installment_number}/
                      {plan.installment.total_installments} •{' '}
                      {plan.installment.sold_item_name}
                    </td>
                    <td className="py-2 px-3">
                      <div>{formatDateBR(plan.installment.due_date)}</div>
                      <span
                        className={`text-[10px] font-bold ${
                          plan.daysLate > 0
                            ? 'text-rose-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {plan.daysLate > 0
                          ? `${plan.daysLate}d atraso`
                          : 'Em dia / Hoje'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {formatCurrencyBRL(plan.installment.original_amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatCurrencyBRL(plan.updatedAmount)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[11px] font-semibold text-indigo-700">
                        {idx === 0
                          ? 'Imediato (0s)'
                          : `Espera ${plan.plannedDelaySeconds}s`}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {plan.dispatchStatus === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Enviado
                        </span>
                      ) : plan.dispatchStatus === 'sending' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Enviando...
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          Aguardando
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPlan(plan)}
                          title="Ver texto sorteado"
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPayingInst(plan.installment);
                            setChargeLateFees(true);
                          }}
                          className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold cursor-pointer"
                        >
                          Baixar
                        </button>
                        <a
                          href={`https://wa.me/${plan.installment.customer_phone}?text=${encodeURIComponent(
                            plan.message
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {queuePlans.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    Nenhuma parcela pendente nas planilhas vinculadas ao seu perfil.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Prévia da Mensagem Sorteada */}
      {previewPlan && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-5 space-y-3 shadow-xl text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Mensagem Sorteada — {previewPlan.installment.customer_name}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                Delay: {previewPlan.plannedDelaySeconds}s
              </span>
            </div>
            <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
              {previewPlan.message}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewPlan(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conector Local QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Conector Local WhatsApp via QR Code (localhost:3001)
            </h3>
            {connectorOnline && qrCodeDataUrl && !whatsappPaired && (
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code WhatsApp"
                  className="w-48 h-48 rounded-lg border border-slate-300"
                />
              </div>
            )}
            <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>Rodar no PC da loja:</span>
              </div>
              <pre className="p-2 rounded bg-slate-950 text-emerald-300 font-mono text-[11px]">
                {`cd c:\\dev\\antigravity\\loja\\whatsapp-connector\nINICIAR_CONECTOR.bat`}
              </pre>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Baixa de Parcela */}
      {payingInst && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl text-xs">
            <h3 className="text-sm font-bold text-slate-900">
              Baixar Parcela {payingInst.installment_number}/
              {payingInst.total_installments} — {payingInst.customer_name}
            </h3>
            {(() => {
              const b = calculateInstallmentLateFees(payingInst, settings);
              return (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Original:</span>
                    <strong>{formatCurrencyBRL(payingInst.original_amount)}</strong>
                  </div>
                  <div className="flex justify-between text-rose-600">
                    <span>Multa + Juros ({b.daysLate}d):</span>
                    <strong>
                      +{formatCurrencyBRL(b.lateFeeAmount + b.interestAmount)}
                    </strong>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-emerald-700 text-sm">
                    <span>Total a Receber:</span>
                    <span>
                      {formatCurrencyBRL(
                        chargeLateFees
                          ? b.updatedTotalAmount
                          : payingInst.original_amount
                      )}
                    </span>
                  </div>
                </div>
              );
            })()}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={chargeLateFees}
                onChange={(e) => setChargeLateFees(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              <span>Incluir multa e juros no recebimento</span>
            </label>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPayingInst(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmPayment}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
              >
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
