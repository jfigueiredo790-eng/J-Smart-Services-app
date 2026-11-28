import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { AccountRecoveryRequest, AccountRecoveryStatus } from '../types';
import {
  RECOVERY_STATUS_LABELS,
  resolveRecoveryRequestAccount
} from '../utils/accountRecoveryService';
import {
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Phone,
  Mail,
  UserCheck,
  UserX,
  Send,
  ShieldAlert
} from 'lucide-react';

const STATUS_BADGE_STYLES: Record<AccountRecoveryStatus, string> = {
  pendente: 'bg-amber-100 text-amber-800 border-amber-300',
  em_analise: 'bg-blue-100 text-blue-800 border-blue-300',
  aprovado: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  rejeitado: 'bg-rose-100 text-rose-800 border-rose-300',
  concluido: 'bg-slate-900 text-white border-slate-800'
};

export const AdminRecoveryPanel: React.FC = () => {
  const {
    currentUser,
    allUsers,
    professionals,
    accountRecoveryRequests,
    phoneLoginIndexSnapshot,
    refreshAccountRecoveryRequestsAsync,
    setAccountRecoveryStatusAdminAsync,
    approveAccountRecoveryRequestAdminAsync
  } = useApp();

  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | AccountRecoveryStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isAdminSession = currentUser.role === 'admin';

  const loadRequests = async () => {
    if (!isAdminSession) return;
    setIsLoading(true);
    const res = await refreshAccountRecoveryRequestsAsync();
    setIsLoading(false);
    if (!res.success && res.message) {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  useEffect(() => {
    if (isAdminSession) {
      loadRequests();
    }
  }, [isAdminSession]);

  const enrichedRequests = useMemo(() => {
    return accountRecoveryRequests.map(req => ({
      req,
      match: resolveRecoveryRequestAccount(
        req,
        allUsers,
        professionals,
        phoneLoginIndexSnapshot
      )
    }));
  }, [accountRecoveryRequests, allUsers, professionals, phoneLoginIndexSnapshot]);

  const counts = useMemo(() => {
    const c: Record<AccountRecoveryStatus, number> = {
      pendente: 0,
      em_analise: 0,
      aprovado: 0,
      rejeitado: 0,
      concluido: 0
    };
    for (const r of accountRecoveryRequests) {
      if (c[r.status] !== undefined) c[r.status] += 1;
    }
    return c;
  }, [accountRecoveryRequests]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return enrichedRequests.filter(({ req, match }) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (req.submittedPhone || '').toLowerCase().includes(q) ||
        (req.submittedEmail || '').toLowerCase().includes(q) ||
        (match.holderName || '').toLowerCase().includes(q) ||
        (match.uid || '').toLowerCase().includes(q) ||
        req.id.toLowerCase().includes(q)
      );
    });
  }, [enrichedRequests, statusFilter, searchTerm]);

  if (!isAdminSession) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-2">
        <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
        <h3 className="text-base font-extrabold text-rose-900">Acesso Exclusivo do Administrador</h3>
        <p className="text-xs text-rose-700">
          Esta secção só pode ser consultada e operada por administradores autorizados da J Smart Services.
        </p>
      </div>
    );
  }

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(prev => (prev?.message === message ? null : prev));
    }, 6500);
  };

  const handleMarkUnderReview = async (req: AccountRecoveryRequest, match: ReturnType<typeof resolveRecoveryRequestAccount>) => {
    setBusyId(req.id);
    const res = await setAccountRecoveryStatusAdminAsync(req.id, 'em_analise', {
      matchedAccount: match
    });
    setBusyId(null);
    showToast(res.success ? 'info' : 'error', res.message);
  };

  const handleApprove = async (req: AccountRecoveryRequest, match: ReturnType<typeof resolveRecoveryRequestAccount>) => {
    setBusyId(req.id);
    const res = await approveAccountRecoveryRequestAdminAsync(req, match);
    setBusyId(null);
    if (res.success) {
      showToast('success', res.message);
    } else if (res.requiresExternalSmsConfig) {
      showToast('info', res.message);
    } else {
      showToast('error', res.message);
    }
  };

  const handleConfirmReject = async (req: AccountRecoveryRequest, match: ReturnType<typeof resolveRecoveryRequestAccount>) => {
    setBusyId(req.id);
    const res = await setAccountRecoveryStatusAdminAsync(req.id, 'rejeitado', {
      rejectionReason: rejectionReason.trim() || 'Pedido rejeitado após verificação administrativa.',
      matchedAccount: match
    });
    setBusyId(null);
    setRejectingId(null);
    setRejectionReason('');
    showToast(res.success ? 'info' : 'error', res.message);
  };

  const handleMarkCompleted = async (req: AccountRecoveryRequest, match: ReturnType<typeof resolveRecoveryRequestAccount>) => {
    setBusyId(req.id);
    const res = await setAccountRecoveryStatusAdminAsync(req.id, 'concluido', {
      matchedAccount: match
    });
    setBusyId(null);
    showToast(res.success ? 'success' : 'error', res.message);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full">
                  Secção Exclusiva Admin
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Anti-Enumeração Ativa
                </span>
              </div>
              <h2 className="text-xl font-black mt-1 tracking-tight">
                RECUPERAÇÃO DE CONTAS
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Verificação interna e aprovação segura de pedidos de recuperação submetidos por clientes e profissionais (contas antigas e novas). O administrador nunca cria, visualiza ou envia palavras-passe manualmente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-extrabold flex items-center justify-center gap-2 border border-white/15 transition-all shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'A atualizar...' : 'Atualizar Pedidos'}
          </button>
        </div>

        {/* Security Rule Reminder */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-start gap-2.5 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <span>
            <strong>Regra de Segurança:</strong> ao aprovar uma conta com e-mail registado, o sistema dispara automaticamente a ligação oficial temporária (uso único) do Firebase Authentication. Contas apenas com telefone (sem e-mail) sem gateway SMS externo configurado permanecem pendentes até confirmação segura de identidade.
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-2xl p-4 border text-xs font-bold flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : feedback.type === 'error' ? (
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Status KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(
          [
            { key: 'pendente', label: 'Pendentes', tone: 'bg-amber-50 border-amber-200 text-amber-900' },
            { key: 'em_analise', label: 'Em análise', tone: 'bg-blue-50 border-blue-200 text-blue-900' },
            { key: 'aprovado', label: 'Aprovados', tone: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
            { key: 'rejeitado', label: 'Rejeitados', tone: 'bg-rose-50 border-rose-200 text-rose-900' },
            { key: 'concluido', label: 'Concluídas', tone: 'bg-slate-100 border-slate-300 text-slate-900' }
          ] as const
        ).map(card => (
          <button
            key={card.key}
            type="button"
            onClick={() => setStatusFilter(prev => (prev === card.key ? 'all' : card.key))}
            className={`p-3.5 rounded-2xl border text-left transition-all ${card.tone} ${
              statusFilter === card.key ? 'ring-2 ring-slate-900 shadow-md' : 'hover:shadow-sm'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80">{card.label}</div>
            <div className="text-2xl font-black mt-0.5">{counts[card.key]}</div>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por telefone (+244), e-mail, titular ou ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 outline-none focus:border-slate-900"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'pendente', 'em_analise', 'aprovado', 'rejeitado', 'concluido'] as const).map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-2 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'all' ? `Todos (${accountRecoveryRequests.length})` : RECOVERY_STATUS_LABELS[st]}
            </button>
          ))}
        </div>
      </div>

      {/* Request List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-2">
          <KeyRound className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-700">
            Nenhum pedido de recuperação encontrado
          </h3>
          <p className="text-xs text-slate-500">
            Os novos pedidos submetidos pelos utilizadores em «Esqueci a palavra-passe» aparecerão automaticamente aqui para verificação.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map(({ req, match }) => {
            const isBusy = busyId === req.id;
            const originLabel =
              match.accountOrigin === 'legacy_migrated'
                ? 'Conta Antiga (Migrada)'
                : match.accountOrigin === 'legacy_unmigrated'
                ? 'Conta Antiga (Sem UID Auth)'
                : match.accountOrigin === 'new_account'
                ? 'Conta Nova'
                : match.accountOrigin === 'protected_admin'
                ? 'Conta Admin Protegida'
                : 'Sem correspondência';

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top Row: ID, Date, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                          STATUS_BADGE_STYLES[req.status]
                        }`}
                      >
                        {RECOVERY_STATUS_LABELS[req.status]}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">{req.id}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.createdAt).toLocaleString('pt-PT')}</span>
                    </div>
                  </div>

                  {/* Grid: Submitted Info vs Internal Verification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Coluna 1: Dados Submetidos */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                      <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Dados Submetidos pelo Utilizador
                      </h4>
                      {req.submittedPhone && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Phone className="w-3.5 h-3.5 text-amber-600" />
                          <span>{req.submittedPhone}</span>
                        </div>
                      )}
                      {req.submittedEmail && (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                          <Mail className="w-3.5 h-3.5 text-blue-600" />
                          <span>{req.submittedEmail}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 pt-1">
                        Identificador submetido:{' '}
                        <strong>
                          {req.identifierType === 'both'
                            ? 'Telefone + E-mail'
                            : req.identifierType === 'phone'
                            ? 'Telefone (+244)'
                            : 'E-mail Gmail'}
                        </strong>
                      </div>
                    </div>

                    {/* Coluna 2: Verificação Interna no Firebase/Firestore */}
                    <div
                      className={`rounded-2xl p-4 border space-y-2 ${
                        match.matched
                          ? match.accountOrigin === 'protected_admin'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-rose-50/70 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                          Verificação Interna da Conta
                        </h4>
                        {match.matched ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                            <UserCheck className="w-3 h-3" />
                            Conta Encontrada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                            <UserX className="w-3 h-3" />
                            Não Encontrada
                          </span>
                        )}
                      </div>

                      {match.matched ? (
                        <div className="space-y-1 text-xs text-slate-800">
                          <div>
                            <strong>Titular:</strong> {match.holderName}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <span>
                              <strong>Perfil:</strong>{' '}
                              {match.role === 'profissional'
                                ? 'Profissional'
                                : match.role === 'admin'
                                ? 'Administrador'
                                : 'Cliente'}
                            </span>
                            <span>
                              <strong>Origem:</strong> {originLabel}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-600 break-all">
                            <strong>UID:</strong> {match.uid || 'N/A'}
                            {match.legacyUid ? ` • Legado: ${match.legacyUid}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-700">
                            <strong>Telefone da conta:</strong> {match.phone || 'Não registado'}
                          </div>
                          <div className="text-[11px] text-slate-700">
                            <strong>E-mail verificável:</strong>{' '}
                            {match.hasVerifiableEmail && match.authEmail ? (
                              <span className="text-emerald-800 font-bold">{match.authEmail}</span>
                            ) : (
                              <span className="text-amber-800 font-bold">
                                Sem e-mail registado (apenas telefone)
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-rose-800 font-semibold">
                          Nenhuma conta ativa ou antiga encontrada com os dados fornecidos.
                        </p>
                      )}

                      {match.warningNote && (
                        <div className="mt-2 pt-2 border-t border-black/10 text-[11px] font-semibold text-amber-900 flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span>{match.warningNote}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audit & History Trail */}
                  {(req.reviewedAt || req.rejectionReason || req.adminNotes || req.deliveryMethod) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 space-y-1">
                      {req.reviewedByName && req.reviewedAt && (
                        <div>
                          <strong>Última revisão:</strong> {req.reviewedByName} em{' '}
                          {new Date(req.reviewedAt).toLocaleString('pt-PT')}
                        </div>
                      )}
                      {req.deliveryMethod && req.deliveryMethod !== 'none' && (
                        <div>
                          <strong>Canal de envio:</strong>{' '}
                          {req.deliveryMethod === 'firebase_email_link'
                            ? 'Ligação oficial temporária Firebase (e-mail)'
                            : req.deliveryMethod === 'sms_code'
                            ? 'Código temporário uso único via SMS'
                            : 'Pendente de confirmação manual segura'}
                        </div>
                      )}
                      {req.rejectionReason && (
                        <div className="text-rose-700 font-semibold">
                          <strong>Motivo da rejeição:</strong> {req.rejectionReason}
                        </div>
                      )}
                      {req.adminNotes && (
                        <div>
                          <strong>Nota administrativa:</strong> {req.adminNotes}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reject Inline Reason Box */}
                  {rejectingId === req.id && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                      <label className="block text-xs font-extrabold text-rose-900">
                        Motivo da rejeição (registo de auditoria):
                      </label>
                      <input
                        type="text"
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        placeholder="Ex: Conta não encontrada / dados divergentes / tentativa suspeita"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 bg-white text-xs font-semibold text-slate-900 outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleConfirmReject(req, match)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all"
                        >
                          Confirmar Rejeição
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectingId(null);
                            setRejectionReason('');
                          }}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {req.status === 'pendente' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleMarkUnderReview(req, match)}
                        className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-extrabold flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Marcar Em Análise
                      </button>
                    )}

                    {(req.status === 'pendente' || req.status === 'em_analise') &&
                      match.matched &&
                      match.accountOrigin !== 'protected_admin' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(req, match)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {isBusy
                            ? 'A processar...'
                            : match.hasVerifiableEmail
                            ? 'Aprovar e Enviar Link Oficial'
                            : 'Aprovar (Verificar Canal SMS)'}
                        </button>
                      )}

                    {req.status !== 'rejeitado' && req.status !== 'concluido' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setRejectingId(req.id)}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold flex items-center gap-1.5 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Rejeitar
                      </button>
                    )}

                    {req.status === 'aprovado' && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleMarkCompleted(req, match)}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Marcar Recuperação Concluída
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
