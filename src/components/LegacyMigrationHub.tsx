import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Copy,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Lock,
  ExternalLink,
  Search,
  Layers,
  Play,
  StopCircle,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  LegacyAccountsReadOnlyReport,
  RelinkLegacyAccountResult,
  BatchMigrationResult,
  GlobalMigrationProgress,
  GlobalSequentialMigrationResult,
  PRIORITY_TEST_LEGACY_ACCOUNT,
  DEFAULT_MIGRATION_BATCH_SIZE
} from '../utils/legacyMigrationService';

interface LegacyMigrationHubProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string, durationMs?: number) => void;
}

export const LegacyMigrationHub: React.FC<LegacyMigrationHubProps> = ({ onNotify }) => {
  const {
    generateLegacyAccountsReportAsync,
    relinkLegacyAccountAsync,
    executeLegacyBatchMigrationAsync,
    executeGlobalSequentialLegacyMigrationAsync,
    sendLegacyAccountPasswordResetAsync
  } = useApp();

  // Phase 1 — Global Read-Only Diagnostic State
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<LegacyAccountsReadOnlyReport | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [listFilter, setListFilter] = useState<'eligible' | 'manual' | 'all'>('eligible');

  // Phase 2A-Global — Automatic Sequential Execution of ALL Eligible Batches (No Per-Batch Re-Authorization)
  const [isRunningGlobalMigration, setIsRunningGlobalMigration] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<GlobalMigrationProgress | null>(null);
  const [globalResult, setGlobalResult] = useState<GlobalSequentialMigrationResult | null>(null);
  const [copiedGlobalFinalReport, setCopiedGlobalFinalReport] = useState(false);
  const abortGlobalRef = useRef(false);

  // Phase 2A-Single — Single-Batch Manual Controls (Optional)
  const [batchSize, setBatchSize] = useState<number>(DEFAULT_MIGRATION_BATCH_SIZE);
  const [batchNumber, setBatchNumber] = useState<number>(1);
  const [autoSendResetInBatch, setAutoSendResetInBatch] = useState<boolean>(true);
  const [isRunningBatchDryRun, setIsRunningBatchDryRun] = useState(false);
  const [batchDryRunResult, setBatchDryRunResult] = useState<BatchMigrationResult | null>(null);
  const [batchDryRunSignature, setBatchDryRunSignature] = useState('');
  const [confirmBatchAuthorized, setConfirmBatchAuthorized] = useState(false);
  const [isExecutingBatch, setIsExecutingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);
  const [batchExecutionResult, setBatchExecutionResult] = useState<BatchMigrationResult | null>(null);
  const abortBatchRef = useRef(false);

  // Phase 2B — Single-Account Safe Relink State (for already_in_firebase_auth or manual cases)
  const [legacyUidInput, setLegacyUidInput] = useState<string>(PRIORITY_TEST_LEGACY_ACCOUNT.legacyUid);
  const [newAuthUidInput, setNewAuthUidInput] = useState('');
  const [targetEmailInput, setTargetEmailInput] = useState<string>(PRIORITY_TEST_LEGACY_ACCOUNT.email);
  const [expectedPhoneInput, setExpectedPhoneInput] = useState<string>(PRIORITY_TEST_LEGACY_ACCOUNT.phone);
  const [isRunningDryRun, setIsRunningDryRun] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<RelinkLegacyAccountResult | null>(null);
  const [dryRunSignature, setDryRunSignature] = useState('');
  const [confirmAuthorized, setConfirmAuthorized] = useState(false);
  const [isExecutingRelink, setIsExecutingRelink] = useState(false);
  const [executionResult, setExecutionResult] = useState<RelinkLegacyAccountResult | null>(null);

  // Phase 3 — Official Firebase Password Setup / Reset Link
  const [resetEmailInput, setResetEmailInput] = useState<string>(PRIORITY_TEST_LEGACY_ACCOUNT.email);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const currentBatchSignature = `${batchNumber}|${batchSize}`;
  const isBatchDryRunValid =
    Boolean(batchDryRunResult?.success) &&
    batchDryRunResult?.dryRun === true &&
    (batchDryRunResult?.processedCount || 0) > 0 &&
    batchDryRunSignature === currentBatchSignature;

  const currentSignature = `${legacyUidInput.trim()}|${newAuthUidInput.trim()}|${targetEmailInput.trim().toLowerCase()}|${expectedPhoneInput.trim()}`;
  const isDryRunValidForCurrentInputs =
    Boolean(dryRunResult?.success) &&
    dryRunResult?.dryRun === true &&
    dryRunResult.conflictsFound.length === 0 &&
    dryRunSignature === currentSignature;

  const isAnyMigrationBusy = isRunningGlobalMigration || isExecutingBatch || isExecutingRelink;

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setCopiedReport(false);
    try {
      const res = await generateLegacyAccountsReportAsync();
      if (res.success) {
        setReport(res);
        onNotify('success', res.message, 6000);
      } else {
        onNotify('error', res.message, 5000);
      }
    } catch {
      onNotify('error', 'Não foi possível gerar o diagnóstico global em modo apenas leitura.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleCopyPlainTextReport = async () => {
    if (!report?.plainTextReport) return;
    try {
      await navigator.clipboard.writeText(report.plainTextReport);
      setCopiedReport(true);
      onNotify('success', 'Relatório global copiado para a área de transferência.');
      setTimeout(() => setCopiedReport(false), 3000);
    } catch {
      onNotify('error', 'Não foi possível copiar automaticamente. Selecione o texto manualmente.');
    }
  };

  const handleStartGlobalSequentialMigration = async () => {
    if (isAnyMigrationBusy) return;
    abortGlobalRef.current = false;
    setIsRunningGlobalMigration(true);
    setGlobalResult(null);
    setCopiedGlobalFinalReport(false);
    try {
      const res = await executeGlobalSequentialLegacyMigrationAsync({
        batchSize: DEFAULT_MIGRATION_BATCH_SIZE,
        sendPasswordResetEmails: autoSendResetInBatch,
        shouldAbort: () => abortGlobalRef.current,
        onProgress: (p) => setGlobalProgress(p)
      });
      setGlobalResult(res);
      if (res.finalReport?.success) {
        setReport(res.finalReport);
      }
      onNotify(res.completedAll ? 'success' : 'info', res.message, 9000);
    } catch {
      onNotify('error', 'Erro inesperado durante a execução sequencial. Nenhum documento antigo foi eliminado.');
    } finally {
      setIsRunningGlobalMigration(false);
      setGlobalProgress(null);
    }
  };

  const handleAbortGlobalMigration = () => {
    abortGlobalRef.current = true;
    onNotify('info', 'Interrupção segura solicitada. A execução vai parar logo após concluir a conta em curso.', 5000);
  };

  const handleCopyGlobalFinalReport = async () => {
    if (!globalResult?.plainTextFinalReport) return;
    try {
      await navigator.clipboard.writeText(globalResult.plainTextFinalReport);
      setCopiedGlobalFinalReport(true);
      onNotify('success', 'Relatório final completo copiado para a área de transferência.');
      setTimeout(() => setCopiedGlobalFinalReport(false), 3000);
    } catch {
      onNotify('error', 'Não foi possível copiar automaticamente.');
    }
  };

  const handleRunBatchDryRun = async () => {
    setIsRunningBatchDryRun(true);
    setConfirmBatchAuthorized(false);
    setBatchExecutionResult(null);
    try {
      const res = await executeLegacyBatchMigrationAsync({
        batchNumber,
        batchSize,
        dryRun: true,
        sendPasswordResetEmails: autoSendResetInBatch
      });
      setBatchDryRunResult(res);
      if (res.success && res.processedCount > 0) {
        setBatchDryRunSignature(currentBatchSignature);
        onNotify('info', res.message, 6000);
      } else {
        setBatchDryRunSignature('');
        onNotify(res.success ? 'info' : 'error', res.message, 6000);
      }
    } catch {
      onNotify('error', 'Erro ao simular o lote (Dry-Run). Nenhum dado foi alterado.');
    } finally {
      setIsRunningBatchDryRun(false);
    }
  };

  const handleExecuteControlledBatch = async () => {
    if (!isBatchDryRunValid || !confirmBatchAuthorized) return;
    abortBatchRef.current = false;
    setIsExecutingBatch(true);
    setBatchProgress({ current: 0, total: batchDryRunResult?.processedCount || batchSize, name: 'A iniciar...' });
    try {
      const res = await executeLegacyBatchMigrationAsync({
        batchNumber,
        batchSize,
        dryRun: false,
        sendPasswordResetEmails: autoSendResetInBatch,
        shouldAbort: () => abortBatchRef.current,
        onProgress: (current, total, name) => setBatchProgress({ current, total, name })
      });
      setBatchExecutionResult(res);
      setConfirmBatchAuthorized(false);
      setBatchDryRunResult(null);
      setBatchDryRunSignature('');
      if (res.migratedCount > 0) {
        setBatchNumber(prev => prev + 1);
      }
      onNotify(res.success ? 'success' : 'info', res.message, 8000);
      const refreshed = await generateLegacyAccountsReportAsync();
      if (refreshed.success) {
        setReport(refreshed);
      }
    } catch {
      onNotify('error', 'Erro durante a execução do lote. Os documentos antigos permanecem intactos.');
    } finally {
      setIsExecutingBatch(false);
      setBatchProgress(null);
    }
  };

  const handleAbortBatch = () => {
    abortBatchRef.current = true;
    onNotify('info', 'Interrupção segura solicitada. O lote irá parar assim que concluir a conta atual.', 5000);
  };

  const loadAccountIntoSingleRelink = (acc: { uid: string; email: string; phoneE164?: string; phoneRaw?: string }) => {
    setLegacyUidInput(acc.uid);
    setTargetEmailInput(acc.email || '');
    setExpectedPhoneInput(acc.phoneE164 || acc.phoneRaw || '');
    setResetEmailInput(acc.email || '');
    setDryRunResult(null);
    setDryRunSignature('');
    setConfirmAuthorized(false);
    onNotify('info', `Conta ${acc.uid} carregada na Religação Individual (Dry-Run). Nenhuma alteração foi executada.`);
  };

  const handleRunDryRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunningDryRun(true);
    setConfirmAuthorized(false);
    setExecutionResult(null);
    try {
      const res = await relinkLegacyAccountAsync({
        legacyUid: legacyUidInput.trim(),
        newAuthUid: newAuthUidInput.trim(),
        targetEmail: targetEmailInput.trim(),
        expectedPhone: expectedPhoneInput.trim(),
        dryRun: true
      });
      setDryRunResult(res);
      if (res.success) {
        setDryRunSignature(currentSignature);
        onNotify('info', res.message, 6000);
      } else {
        setDryRunSignature('');
        onNotify('error', res.message, 6000);
      }
    } catch {
      onNotify('error', 'Erro durante a simulação (Dry-Run). Nenhum dado foi alterado.');
    } finally {
      setIsRunningDryRun(false);
    }
  };

  const handleExecuteSingleRelink = async () => {
    if (!isDryRunValidForCurrentInputs || !confirmAuthorized) return;
    setIsExecutingRelink(true);
    try {
      const res = await relinkLegacyAccountAsync({
        legacyUid: legacyUidInput.trim(),
        newAuthUid: newAuthUidInput.trim(),
        targetEmail: targetEmailInput.trim(),
        expectedPhone: expectedPhoneInput.trim(),
        dryRun: false
      });
      setExecutionResult(res);
      setConfirmAuthorized(false);
      onNotify(res.success ? 'success' : 'error', res.message, 7000);
      if (res.success && res.resolvedEmail) {
        setResetEmailInput(res.resolvedEmail);
      }
    } catch {
      onNotify('error', 'Erro ao executar a religação segura.');
    } finally {
      setIsExecutingRelink(false);
    }
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmailInput.trim()) return;
    setIsSendingReset(true);
    try {
      const res = await sendLegacyAccountPasswordResetAsync(resetEmailInput.trim());
      onNotify(res.success ? 'success' : 'error', res.message, 7000);
    } catch {
      onNotify('error', 'Erro ao enviar o link oficial de definição de palavra-passe.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleResendSingleEmailDirect = async (email: string) => {
    setIsSendingReset(true);
    try {
      const res = await sendLegacyAccountPasswordResetAsync(email);
      onNotify(res.success ? 'success' : 'error', res.message, 7000);
    } catch {
      onNotify('error', `Erro ao reenviar link oficial para ${email}.`);
    } finally {
      setIsSendingReset(false);
    }
  };

  const visibleLegacyAccounts =
    !report
      ? []
      : listFilter === 'eligible'
      ? report.eligibleBatchList
      : listFilter === 'manual'
      ? report.manualInterventionList
      : report.legacyPendingList;

  const globalRequestsPreserved = globalResult
    ? (globalResult.relinkedTotalsByCollection.service_requests || 0) +
      (globalResult.relinkedTotalsByCollection.pedidos || 0)
    : 0;
  const globalConversationsAndMessagesPreserved = globalResult
    ? (globalResult.relinkedTotalsByCollection.conversations || 0) +
      (globalResult.relinkedTotalsByCollection.chat_messages || 0) +
      (globalResult.relinkedTotalsByCollection.mensagens || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* ==================== EXECUÇÃO GLOBAL AUTOMÁTICA (TODOS OS LOTES DE 5 SEQUENCIALMENTE) ==================== */}
      <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-3xl p-6 border-2 border-emerald-400 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-extrabold text-slate-900">
                Recuperação Global Automática — Todos os Lotes de 5 Sequencialmente
              </h3>
              <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                Autorizado • Starter Tier • 0 Eliminações
              </span>
            </div>
            <p className="text-xs text-slate-700 max-w-3xl leading-relaxed">
              Executa automaticamente <strong>todos os lotes de 5 contas</strong> (último lote com o remanescente) sem exigir novas autorizações entre lotes: faz <strong>Dry-Run automático antes de cada lote</strong>, valida a integridade no Firebase Auth e Firestore após cada conta, atualiza as 23 coleções e o <code>phone_login_index</code>, envia o link oficial de palavra-passe e <strong>interrompe automaticamente</strong> se surgir qualquer conflito, erro de permissões ou falha de integridade.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {!isRunningGlobalMigration ? (
              <button
                type="button"
                disabled={isAnyMigrationBusy}
                onClick={handleStartGlobalSequentialMigration}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                <span>Executar Recuperação Global Automática (Lotes de 5)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAbortGlobalMigration}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-5 py-3 rounded-xl transition-all flex items-center gap-2 shadow-md"
              >
                <StopCircle className="w-4 h-4" />
                <span>Interromper com Segurança</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Protection Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 font-semibold text-slate-800">
            <strong className="text-emerald-800">Protegidas:</strong> <code>user-admin-1</code> e <code>UK0UyCK...ADM2</code> bloqueadas
          </div>
          <div className="bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 font-semibold text-slate-800">
            <strong className="text-emerald-800">Intervenção manual:</strong> Excluída automaticamente dos lotes
          </div>
          <div className="bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 font-semibold text-slate-800">
            <strong className="text-emerald-800">Sessão Admin:</strong> Worker isolado em memória (sem logout)
          </div>
          <div className="bg-white/90 border border-emerald-200 rounded-xl px-3 py-2 font-semibold text-slate-800">
            <strong className="text-emerald-800">Preservação:</strong> 0 documentos eliminados • 23 coleções
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-700">
          <input
            type="checkbox"
            checked={autoSendResetInBatch}
            disabled={isAnyMigrationBusy}
            onChange={(e) => setAutoSendResetInBatch(e.target.checked)}
            className="rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Enviar link oficial de definição de palavra-passe (Firebase Authentication) automaticamente após cada conta validada</span>
        </label>

        {/* Live Sequential Execution Progress */}
        {isRunningGlobalMigration && globalProgress && (
          <div className="bg-white border-2 border-blue-300 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-slate-900">
              <span>
                {globalProgress.phase === 'initial_audit' && 'A ler Diagnóstico Global inicial...'}
                {globalProgress.phase === 'batch_dry_run' && `Lote #${globalProgress.currentBatch} de ${globalProgress.totalEstimatedBatches} — Dry-Run automático...`}
                {globalProgress.phase === 'migrating_account' && `Lote #${globalProgress.currentBatch} de ${globalProgress.totalEstimatedBatches} — Conta ${globalProgress.accountInBatch}/${globalProgress.batchTotalAccounts}: ${globalProgress.currentAccountName}`}
                {globalProgress.phase === 'cooling_down' && globalProgress.currentAccountName}
                {globalProgress.phase === 'final_audit' && 'A gerar Diagnóstico Global atualizado pós-execução...'}
              </span>
              <span className="text-blue-700">
                {globalProgress.cumulativeMigrated} / {globalProgress.initialEligibleTotal || '?'} recuperada(s)
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${
                    globalProgress.initialEligibleTotal > 0
                      ? Math.min(100, Math.round((globalProgress.cumulativeMigrated / globalProgress.initialEligibleTotal) * 100))
                      : 10
                  }%`
                }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-500">Integridade OK:</span>{' '}
                <strong className="text-emerald-900">{globalProgress.cumulativeIntegrityOk}</strong>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-500">Links Enviados:</span>{' '}
                <strong className="text-blue-900">{globalProgress.cumulativeResetsSent}</strong>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-500">Links Falhados:</span>{' '}
                <strong className="text-amber-900">{globalProgress.cumulativeResetsFailed}</strong>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                <span className="text-slate-500">Erros/Conflitos:</span>{' '}
                <strong className="text-red-900">{globalProgress.cumulativeErrors}</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-600">
              Mantenha este separador aberto até concluir os 8 lotes (~1 a 2 minutos). A sua sessão administrativa continua ativa.
            </p>
          </div>
        )}

        {/* Complete Final Global Report */}
        {globalResult && (
          <div className={`rounded-2xl p-5 border-2 space-y-4 ${
            globalResult.completedAll
              ? 'bg-white border-emerald-400'
              : 'bg-white border-amber-400'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-slate-900">
                  Relatório Final da Recuperação Global ({globalResult.batchesExecuted} lote(s) executado(s))
                </h4>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{globalResult.message}</p>
                {globalResult.stopReason && (
                  <p className="text-xs font-bold text-red-700 mt-1">
                    Motivo da paragem automática: {globalResult.stopReason}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyGlobalFinalReport}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shrink-0"
              >
                {copiedGlobalFinalReport ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedGlobalFinalReport ? 'Relatório Copiado!' : 'Copiar Relatório Final Completo'}</span>
              </button>
            </div>

            {/* Final 6-KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-700">Recuperadas OK</p>
                <p className="text-xl font-black text-emerald-950">{globalResult.recoveredAccounts.length}</p>
                <p className="text-[10px] text-emerald-700">de {globalResult.initialEligibleCount} elegíveis</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-amber-800">Elegíveis Pendentes</p>
                <p className="text-xl font-black text-amber-950">{globalResult.pendingEligibleAccounts.length}</p>
                <p className="text-[10px] text-amber-800">Manual intactas: {globalResult.manualInterventionAccounts.length}</p>
              </div>
              <div className={`border rounded-xl p-3 ${globalResult.errorOrConflictAccounts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-[10px] font-bold uppercase text-slate-700">Erros / Conflitos</p>
                <p className="text-xl font-black text-slate-950">{globalResult.errorOrConflictAccounts.length}</p>
                <p className="text-[10px] text-slate-600">Eliminados: {globalResult.deletedDocumentsCount}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-blue-700">Links Enviados</p>
                <p className="text-xl font-black text-blue-950">{globalResult.passwordResetsSentList.length}</p>
                <p className="text-[10px] text-blue-700">Falhados: {globalResult.passwordResetsFailedList.length}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-slate-600">Pedidos / Chat</p>
                <p className="text-xl font-black text-slate-950">
                  {globalRequestsPreserved} / {globalConversationsAndMessagesPreserved}
                </p>
                <p className="text-[10px] text-slate-600">Total refs: {globalResult.totalReferencesRelinked}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-700">Auth OK Agora</p>
                <p className="text-xl font-black text-emerald-950">{globalResult.finalReport.summary.firebaseAuthUidAccounts}</p>
                <p className="text-[10px] text-emerald-700">Arquivos: {globalResult.finalReport.summary.migratedArchiveAccounts}</p>
              </div>
            </div>

            {/* Failed Password Reset Quick Resend */}
            {globalResult.passwordResetsFailedList.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 space-y-2 text-xs">
                <p className="font-extrabold text-amber-950">
                  Links de recuperação falhados ({globalResult.passwordResetsFailedList.length}) — contas já migradas e íntegras:
                </p>
                <div className="space-y-1.5">
                  {globalResult.passwordResetsFailedList.map(item => (
                    <div key={item.legacyUid} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                      <span>
                        <strong>{item.name}</strong> ({item.phoneE164}) — <code>{item.email}</code>
                      </span>
                      <button
                        type="button"
                        disabled={isSendingReset}
                        onClick={() => handleResendSingleEmailDirect(item.email)}
                        className="bg-slate-900 hover:bg-emerald-700 text-white text-[11px] font-black px-2.5 py-1 rounded-lg disabled:opacity-50"
                      >
                        Reenviar Link Oficial
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Errors / Conflicts Breakdown */}
            {globalResult.errorOrConflictAccounts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 text-xs">
                <p className="font-extrabold text-red-950">
                  Erros / Conflitos que interromperam a execução ({globalResult.errorOrConflictAccounts.length}):
                </p>
                {globalResult.errorOrConflictAccounts.map(errItem => (
                  <div key={errItem.legacyUid} className="bg-white border border-red-200 rounded-lg p-2.5 space-y-1">
                    <p className="font-bold text-red-900">
                      [{errItem.status}] {errItem.name} ({errItem.legacyUid}) — {errItem.phoneE164} / {errItem.email}
                    </p>
                    <p className="text-[11px] text-slate-700">{errItem.detail}</p>
                    {errItem.status === 'already_in_firebase_auth' && (
                      <button
                        type="button"
                        onClick={() => loadAccountIntoSingleRelink({ uid: errItem.legacyUid, email: errItem.email, phoneE164: errItem.phoneE164 })}
                        className="text-[11px] font-black text-blue-700 underline"
                      >
                        Carregar na Religação Individual (Fase 2B)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Recovered Accounts Table */}
            {globalResult.recoveredAccounts.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-80">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Utilizador / Telefone</th>
                      <th className="px-3 py-2">UID Legado → Novo UID</th>
                      <th className="px-3 py-2">Refs</th>
                      <th className="px-3 py-2">Integridade / Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {globalResult.recoveredAccounts.map((acc, idx) => (
                      <tr key={acc.legacyUid}>
                        <td className="px-3 py-1.5 font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-1.5">
                          <p className="font-bold text-slate-900">{acc.name} ({acc.role})</p>
                          <p className="text-slate-600">{acc.phoneE164} • {acc.email}</p>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-[10px] text-slate-700">
                          {acc.legacyUid} → <span className="text-emerald-800 font-bold">{acc.newAuthUid}</span>
                        </td>
                        <td className="px-3 py-1.5 font-bold text-slate-800">{acc.relinkedReferencesCount}</td>
                        <td className="px-3 py-1.5">
                          <span className="bg-emerald-100 text-emerald-900 font-black text-[10px] px-1.5 py-0.5 rounded mr-1">
                            OK
                          </span>
                          <span className={`font-black text-[10px] px-1.5 py-0.5 rounded ${
                            acc.passwordResetSent ? 'bg-blue-100 text-blue-900' : 'bg-amber-100 text-amber-900'
                          }`}>
                            {acc.passwordResetSent ? 'Link Enviado' : 'Link Falhou'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== FASE 1: DIAGNÓSTICO GLOBAL (APENAS LEITURA) ==================== */}
      <div className="bg-white rounded-3xl p-6 border-2 border-emerald-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-extrabold text-slate-900">
                Fase 1 — Diagnóstico Global de Contas Antigas (Starter Tier)
              </h3>
              <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                Exclusivamente Leitura • 0 Alterações
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
              Classifica em modo estritamente de leitura <strong>todas as 23 coleções do Firestore</strong>: contas funcionais no Firebase Auth, contas antigas com UID legado (Clientes vs Profissionais), contas recuperáveis automaticamente em lotes no Starter Tier, contas que exigem intervenção manual, duplicações e conflitos — <strong>sem criar, alterar nem eliminar nenhum documento</strong>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              disabled={isGeneratingReport || isAnyMigrationBusy}
              onClick={handleGenerateReport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              <span>{isGeneratingReport ? 'A analisar todas as coleções...' : 'Gerar Diagnóstico Global (Apenas Leitura)'}</span>
            </button>
            {report && (
              <button
                type="button"
                onClick={handleCopyPlainTextReport}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                {copiedReport ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedReport ? 'Copiado!' : 'Copiar Relatório Global'}</span>
              </button>
            )}
          </div>
        </div>

        {report && (
          <div className="space-y-5 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                <p className="text-[10px] font-bold uppercase text-slate-500">Contas Únicas</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{report.summary.totalUniqueAccounts}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {report.summary.clientsCount} cli • {report.summary.professionalsCount} pro • {report.summary.adminsCount} adm
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                <p className="text-[10px] font-bold uppercase text-emerald-700">UID Firebase OK</p>
                <p className="text-xl font-black text-emerald-900 mt-0.5">{report.summary.firebaseAuthUidAccounts}</p>
                <p className="text-[10px] text-emerald-700 mt-0.5">Não alteradas</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                <p className="text-[10px] font-bold uppercase text-amber-800">Legadas Afetadas</p>
                <p className="text-xl font-black text-amber-950 mt-0.5">{report.summary.legacyPendingAccounts}</p>
                <p className="text-[10px] text-amber-800 mt-0.5">
                  {report.summary.legacyClientsPending} cli • {report.summary.legacyProfessionalsPending} pro
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                <p className="text-[10px] font-bold uppercase text-blue-700">Recuperáveis Lote</p>
                <p className="text-xl font-black text-blue-950 mt-0.5">{report.summary.eligibleStarterTierBatchCount}</p>
                <p className="text-[10px] text-blue-700 mt-0.5">
                  ~{report.summary.estimatedBatches} lote(s) de {report.summary.recommendedBatchSize}
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="text-[10px] font-bold uppercase text-orange-800">Revisão Manual</p>
                <p className="text-xl font-black text-orange-950 mt-0.5">{report.summary.manualInterventionRequiredCount}</p>
                <p className="text-[10px] text-orange-800 mt-0.5">Sem e-mail / conflito / admin</p>
              </div>
              <div className={`border rounded-2xl p-3 ${report.summary.totalConflicts > 0 || report.summary.duplicateAccountsCount > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-[10px] font-bold uppercase ${report.summary.totalConflicts > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  Duplicações / Alertas
                </p>
                <p className={`text-xl font-black mt-0.5 ${report.summary.totalConflicts > 0 ? 'text-red-900' : 'text-emerald-900'}`}>
                  {report.summary.duplicateAccountsCount} / {report.summary.totalConflicts}
                </p>
                <p className="text-[10px] text-slate-600 mt-0.5">
                  Arquivadas: {report.summary.migratedArchiveAccounts}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                  Classificação das Contas Legadas Afetadas ({report.legacyPendingList.length})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setListFilter('eligible')}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      listFilter === 'eligible'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Recuperáveis em Lote ({report.eligibleBatchList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setListFilter('manual')}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      listFilter === 'manual'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Intervenção Manual ({report.manualInterventionList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setListFilter('all')}
                    className={`text-[11px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                      listFilter === 'all'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Todas ({report.legacyPendingList.length})
                  </button>
                </div>
              </div>

              {visibleLegacyAccounts.length === 0 ? (
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  Nenhuma conta pendente nesta categoria.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Conta / UID Legado</th>
                        <th className="px-3 py-2">Telefone / E-mail</th>
                        <th className="px-3 py-2">Elegibilidade</th>
                        <th className="px-3 py-2">Índice</th>
                        <th className="px-3 py-2">Referências Históricas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {visibleLegacyAccounts.map(item => (
                        <tr key={item.uid} className={item.isPriorityTestAccount ? 'bg-amber-50/60' : ''}>
                          <td className="px-3 py-2">
                            <p className="font-extrabold text-slate-900">
                              {item.name} <span className="text-slate-500 font-semibold">({item.role})</span>
                            </p>
                            <code className="text-[10px] text-slate-600">{item.uid}</code>
                          </td>
                          <td className="px-3 py-2">
                            <p className="font-bold text-slate-800">{item.phoneE164 || item.phoneRaw || 'Sem telefone'}</p>
                            <p className="text-slate-500 break-all">{item.email || 'Sem e-mail'}</p>
                          </td>
                          <td className="px-3 py-2">
                            {item.eligibilityStatus === 'eligible_starter_tier_batch' ? (
                              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                Elegível Lote
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                  Manual
                                </span>
                                {item.manualInterventionReasons.length > 0 && (
                                  <p className="text-[10px] text-orange-800 max-w-xs leading-snug">
                                    {item.manualInterventionReasons.join(' • ')}
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                item.phoneIndexStatus === 'indexed_match'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {item.phoneIndexStatus}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {item.totalReferences > 0
                              ? item.referenceCounts.map(r => `${r.collection}: ${r.count}`).join(' • ')
                              : '0 externas'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase">
                Conflitos e Alertas Detetados ({report.conflicts.length})
              </h4>
              {report.conflicts.length === 0 ? (
                <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  Nenhum conflito de telefone, e-mail ou índice detetado.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {report.conflicts.map((c, idx) => (
                    <div
                      key={`${c.type}-${c.key}-${idx}`}
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        c.severity === 'high'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-black uppercase text-[10px] mr-1.5">[{c.type}]</span>
                        <span>{c.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600">
              <p className="font-extrabold text-slate-800 mb-1">
                Inventário de coleções verificadas ({report.scannedCollections.length}):
              </p>
              <p className="leading-relaxed">
                {report.scannedCollections
                  .map(c => `${c} (${report.collectionTotals[c] ?? 0})`)
                  .join(' • ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==================== FASE 2A (OPCIONAL): CONTROLO MANUAL LOTE A LOTE ==================== */}
      <details className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-700" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Controlo Avançado — Executar 1 Lote Isolado (Opcional)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">Expandir</span>
        </summary>

        <div className="space-y-4 mt-4 pt-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tamanho do Lote</label>
              <select
                value={batchSize}
                disabled={isAnyMigrationBusy}
                onChange={(e) => {
                  setBatchSize(Number(e.target.value));
                  setConfirmBatchAuthorized(false);
                  setBatchDryRunResult(null);
                  setBatchDryRunSignature('');
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value={5}>5 contas por lote (Recomendado)</option>
                <option value={10}>10 contas por lote</option>
                <option value={15}>15 contas por lote</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Número do Lote Isolado</label>
              <div className="text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-black text-slate-900">
                Lote #{batchNumber}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={isRunningBatchDryRun || isAnyMigrationBusy}
              onClick={handleRunBatchDryRun}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Search className="w-4 h-4 text-blue-400" />
              <span>
                {isRunningBatchDryRun
                  ? 'A verificar conflitos do lote...'
                  : `1. Simular Lote #${batchNumber} (Dry-Run — 0 Alterações)`}
              </span>
            </button>

            {isExecutingBatch && (
              <button
                type="button"
                onClick={handleAbortBatch}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              >
                <StopCircle className="w-4 h-4" />
                <span>Interromper Lote com Segurança</span>
              </button>
            )}
          </div>

          {isExecutingBatch && batchProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs font-bold text-blue-950">
              A processar conta {batchProgress.current} de {batchProgress.total}: {batchProgress.name}
            </div>
          )}

          {batchDryRunResult && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 space-y-3 text-xs">
              <p className="font-extrabold text-blue-950">{batchDryRunResult.message}</p>
              {isBatchDryRunValid && (
                <div className="pt-2 border-t border-blue-200 space-y-2.5">
                  <label className="flex items-start gap-2 cursor-pointer text-[11px] font-bold text-slate-900">
                    <input
                      type="checkbox"
                      checked={confirmBatchAuthorized}
                      onChange={(e) => setConfirmBatchAuthorized(e.target.checked)}
                      className="mt-0.5 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      Autorizo executar apenas o Lote #{batchNumber} ({batchDryRunResult.processedCount} conta(s)) sem eliminar nenhum documento.
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!confirmBatchAuthorized || isExecutingBatch}
                    onClick={handleExecuteControlledBatch}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-black px-4 py-2 rounded-xl disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <Play className="w-4 h-4" />
                    <span>2. Executar Lote #{batchNumber}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {batchExecutionResult && (
            <div className="rounded-2xl p-3 border bg-emerald-50 border-emerald-300 text-xs font-bold text-emerald-950">
              {batchExecutionResult.message}
            </div>
          )}
        </div>
      </details>

      {/* ==================== FASE 2B: RELIGAÇÃO INDIVIDUAL (MANUAL / JÁ NO FIREBASE AUTH) ==================== */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-900" />
            <h3 className="text-base font-extrabold text-slate-900">
              Fase 2B (Manual / Revisão) — Religação Segura Individual (1 Conta por Vez)
            </h3>
            <span className="bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
              0 Documentos Eliminados • Bloqueada até Simulação
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1.5 max-w-3xl leading-relaxed">
            Para contas cujo e-mail já existe em{' '}
            <a
              href="https://console.firebase.google.com/project/tuned-xray-hxctm/authentication/users"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 font-bold underline inline-flex items-center gap-0.5"
            >
              Firebase Console → Authentication → Users
              <ExternalLink className="w-3 h-3" />
            </a>{' '}
            ou casos de revisão manual (como contas sem e-mail após contacto assistido).
          </p>
        </div>

        <form onSubmit={handleRunDryRun} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">UID Legado Original no Firestore *</label>
              <input
                type="text"
                value={legacyUidInput}
                onChange={(e) => {
                  setLegacyUidInput(e.target.value);
                  setConfirmAuthorized(false);
                }}
                placeholder="ex: user-1786485151147"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Novo UID do Firebase Authentication *</label>
              <input
                type="text"
                value={newAuthUidInput}
                onChange={(e) => {
                  setNewAuthUidInput(e.target.value);
                  setConfirmAuthorized(false);
                }}
                placeholder="Cole aqui o UID existente em Authentication → Users"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail Original da Conta</label>
              <input
                type="email"
                value={targetEmailInput}
                onChange={(e) => {
                  setTargetEmailInput(e.target.value);
                  setConfirmAuthorized(false);
                }}
                placeholder="ex: mariakumeso1966@gmail.com"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Telefone Angolano (+244)</label>
              <input
                type="tel"
                value={expectedPhoneInput}
                onChange={(e) => {
                  setExpectedPhoneInput(e.target.value);
                  setConfirmAuthorized(false);
                }}
                placeholder="ex: +244944926697"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isRunningDryRun || isAnyMigrationBusy}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>{isRunningDryRun ? 'A simular...' : '1. Simular Religação Individual (Dry-Run — 0 Alterações)'}</span>
            </button>
          </div>
        </form>

        {dryRunResult && (
          <div className={`rounded-2xl p-4 border text-xs space-y-2.5 ${
            dryRunResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : 'bg-red-50 border-red-200 text-red-950'
          }`}>
            <p className="font-extrabold">{dryRunResult.message}</p>
            {dryRunResult.conflictsFound.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-[11px]">
                {dryRunResult.conflictsFound.map((cf, i) => (
                  <li key={i}>{cf}</li>
                ))}
              </ul>
            )}
            {dryRunResult.plannedOrAppliedSteps.length > 0 && (
              <div className="bg-white/90 border border-emerald-200 rounded-xl p-3 space-y-1 text-[11px]">
                <p className="font-extrabold text-slate-900">Plano exato verificado (documentos a eliminar: 0):</p>
                {dryRunResult.plannedOrAppliedSteps.map((s, idx) => (
                  <p key={`${s.collection}-${s.action}-${idx}`} className="text-slate-700">
                    • <code className="font-bold">{s.collection}</code> — {s.action} ({s.count} doc(s))
                  </p>
                ))}
              </div>
            )}

            {isDryRunValidForCurrentInputs && (
              <div className="pt-3 border-t border-emerald-200 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer text-[11px] font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={confirmAuthorized}
                    onChange={(e) => setConfirmAuthorized(e.target.checked)}
                    className="mt-0.5 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>
                    Confirmo que autorizo executar a religação segura desta conta (<code className="bg-white px-1 rounded">{legacyUidInput.trim()}</code> → <code className="bg-white px-1 rounded">{newAuthUidInput.trim()}</code>), preservando todos os documentos antigos sem eliminar nenhum registo.
                  </span>
                </label>
                <button
                  type="button"
                  disabled={!confirmAuthorized || isExecutingRelink}
                  onClick={handleExecuteSingleRelink}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isExecutingRelink ? 'A executar religação segura...' : '2. Executar Religação Segura (1 Conta • Sem Eliminar Antigos)'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {executionResult && (
          <div className={`rounded-2xl p-4 border text-xs font-bold ${
            executionResult.success
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-red-50 border-red-300 text-red-950'
          }`}>
            {executionResult.message}
          </div>
        )}

        {/* ==================== FASE 3: RECUPERAÇÃO / DEFINIÇÃO SEGURA DE PALAVRA-PASSE ==================== */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-extrabold text-slate-900">
                Fase 3 — Reenvio de Link Oficial de Palavra-passe (Firebase Oficial)
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Envia o link oficial do Firebase Authentication para o próprio utilizador definir a sua palavra-passe. O utilizador também pode pedir este link a qualquer momento em <strong>&ldquo;Esqueci a palavra-passe&rdquo;</strong> usando apenas o seu <strong>número de telefone (+244)</strong>.
            </p>
          </div>
          <form onSubmit={handleSendPasswordReset} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={resetEmailInput}
              onChange={(e) => setResetEmailInput(e.target.value)}
              placeholder="E-mail original da conta migrada (ex: mariakumeso1966@gmail.com)"
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isSendingReset}
              className="bg-slate-900 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-60 whitespace-nowrap flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>{isSendingReset ? 'A enviar link oficial...' : 'Enviar Link Oficial de Palavra-passe'}</span>
            </button>
          </form>
          <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[11px] text-slate-600">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Proteção ativa:</strong> Contas que já funcionam com UID Firebase Auth e contas administrativas oficiais nunca são alteradas pela migração automática.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
