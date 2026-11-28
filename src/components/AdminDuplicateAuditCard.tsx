import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LiveDuplicateAuditReport } from '../utils/userDeduplicationUtils';
import {
  ShieldCheck,
  Search,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Users,
  Briefcase,
  KeyRound,
  RefreshCw,
  FileText
} from 'lucide-react';

export const AdminDuplicateAuditCard: React.FC = () => {
  const { currentUser, generateLiveDuplicateAuditReportAsync } = useApp();
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<LiveDuplicateAuditReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (currentUser.role !== 'admin') return null;

  const handleRunAudit = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    const res = await generateLiveDuplicateAuditReportAsync();
    setIsRunning(false);
    if (!res.success || !res.report) {
      setErrorMsg(res.message || 'Não foi possível concluir a auditoria de leitura no Firestore.');
      return;
    }
    setReport(res.report);
  };

  const handleCopyReport = () => {
    if (!report) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(report.formattedTextReport).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {});
    }
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-800 rounded-2xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-slate-900 text-sm">
                Auditoria Real de Contas Únicas &amp; Duplicações
              </h4>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                100% Leitura • Zero Alterações
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Inspeciona diretamente o Firestore em produção para distinguir utilizadores únicos ativos, arquivos históricos da migração (preservados sem eliminação), contas ligadas ao Firebase Auth e perfis profissionais — sem apagar nem modificar qualquer registo.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRunAudit}
          disabled={isRunning}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>A auditar Firestore...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>{report ? 'Atualizar Auditoria Real' : 'Executar Auditoria em Tempo Real'}</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-3 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {report && (
        <div className="space-y-4 pt-2 border-t border-slate-100 animate-fade-in">
          {/* 6 KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-emerald-700 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Únicos Reais
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">
                {report.uniqueActiveUsersCount}
              </div>
              <div className="text-[10px] text-emerald-800 font-semibold">
                1 por pessoa/UID
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-slate-600">
                Docs Brutos (users)
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {report.rawUsersDocsCount}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Inclui arquivos históricos
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-amber-800">
                Arquivos Migração
              </div>
              <div className="text-2xl font-black text-amber-950 mt-0.5">
                {report.archivedLegacyUsersDocsCount}
              </div>
              <div className="text-[10px] text-amber-800 font-semibold">
                Preservados (0 apagados)
              </div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-rose-700">
                Duplicações Ativas
              </div>
              <div className="text-2xl font-black text-rose-950 mt-0.5">
                {report.trueActiveDuplicateDocsCount}
              </div>
              <div className="text-[10px] text-rose-800 font-semibold">
                Par admin: +{report.legacyAdminPairCount}
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-indigo-700 flex items-center gap-1">
                <KeyRound className="w-3 h-3" />
                Firebase Auth UID
              </div>
              <div className="text-2xl font-black text-indigo-950 mt-0.5">
                {report.activeUsersWithFirebaseAuthUidCount}
              </div>
              <div className="text-[10px] text-indigo-800 font-semibold">
                Legados pendentes: {report.activeUsersWithLegacyUidPendingCount}
              </div>
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3">
              <div className="text-[10px] font-black uppercase text-teal-700 flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Perfis Profissionais
              </div>
              <div className="text-2xl font-black text-teal-950 mt-0.5">
                {report.activeUniqueProfessionalsCount}
              </div>
              <div className="text-[10px] text-teal-800 font-semibold">
                Ligados a users: {report.professionalsLinkedToExistingUserCount}
              </div>
            </div>
          </div>

          {/* Root Causes Summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              Diagnóstico de Causa Raiz (Tempo Real)
            </h5>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {report.rootCausesSummary.map((item, idx) => (
                <li key={idx} className="leading-relaxed">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Detected Groups (if any) */}
          {report.activeDuplicateGroups.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 space-y-2.5">
              <h5 className="text-xs font-black text-amber-950">
                Registos Duplicados / Pares Detetados ({report.activeDuplicateGroups.length}) — Apenas Leitura (Nenhuma Alteração Aplicada)
              </h5>
              <div className="space-y-2">
                {report.activeDuplicateGroups.map((grp, i) => (
                  <div
                    key={`${grp.canonicalUid}-${i}`}
                    className="bg-white rounded-xl border border-amber-200 p-3 text-xs space-y-1"
                  >
                    <div className="font-extrabold text-slate-900">
                      Grupo #{i + 1} • {grp.matchKey} ({grp.reason})
                    </div>
                    <div className="text-[11px] font-mono text-slate-600">
                      UID Canónico: <strong>{grp.canonicalUid}</strong> • Duplicado(s):{' '}
                      <strong>{grp.duplicateUids.join(', ')}</strong>
                    </div>
                    <div className="text-[11px] text-amber-900 font-semibold">
                      Proposta segura: {grp.consolidationProposal}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copyable Full Text Report */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-slate-500 font-semibold">
              Auditoria concluída em {new Date(report.generatedAt).toLocaleString('pt-PT')} • 0 documentos modificados ou eliminados.
            </span>
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Relatório Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Copiar Relatório Completo</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
