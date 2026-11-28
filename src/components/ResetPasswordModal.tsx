import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  X,
  RefreshCw
} from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  oobCode: string | null;
  isPostHostedReturn?: boolean;
  onClose: () => void;
  onGoToPhoneLogin: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  oobCode,
  isPostHostedReturn = false,
  onClose,
  onGoToPhoneLogin
}) => {
  const { verifyResetLinkCodeAsync, confirmPasswordResetAsync } = useApp();

  const [verifying, setVerifying] = useState<boolean>(Boolean(oobCode));
  const [linkValid, setLinkValid] = useState<boolean>(false);
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>(undefined);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState<boolean>(isPostHostedReturn);

  useEffect(() => {
    if (!isOpen) return;
    if (isPostHostedReturn && !oobCode) {
      setVerifying(false);
      setIsDone(true);
      return;
    }
    if (!oobCode) {
      setVerifying(false);
      setLinkValid(false);
      setLinkError('Ligação de redefinição inválida ou incompleta.');
      return;
    }

    let cancelled = false;
    setVerifying(true);
    setLinkError(null);
    setIsDone(false);

    verifyResetLinkCodeAsync(oobCode).then(res => {
      if (cancelled) return;
      setVerifying(false);
      if (res.valid) {
        setLinkValid(true);
        setMaskedEmail(res.maskedEmail);
      } else {
        setLinkValid(false);
        setLinkError(res.message);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, oobCode, isPostHostedReturn]);

  if (!isOpen) return null;

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!oobCode) {
      setSubmitError('Código de recuperação em falta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await confirmPasswordResetAsync(oobCode, newPassword, confirmPassword);
      if (!res.success) {
        setSubmitError(res.message);
        if (res.errorCode === 'expired' || res.errorCode === 'used_or_invalid') {
          setLinkValid(false);
          setLinkError(res.message);
        }
        return;
      }
      setNewPassword('');
      setConfirmPassword('');
      setIsDone(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar redefinição de palavra-passe"
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                J Smart Services Angola
              </span>
              <h2 className="text-lg font-extrabold leading-tight">
                Definir Nova Palavra-passe
              </h2>
            </div>
          </div>
        </div>

        <div className="p-6">
          {verifying ? (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                A validar a sua ligação segura de recuperação...
              </p>
            </div>
          ) : isDone ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Palavra-passe Atualizada com Sucesso
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  A sua conta original, número de telefone, histórico de pedidos e conversas foram preservados integralmente. Já pode entrar com o seu <strong>número de telefone (+244)</strong> e a sua nova palavra-passe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToPhoneLogin();
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Entrar com Telefone e Nova Palavra-passe
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !linkValid ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Ligação Expirada ou Já Utilizada
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {linkError || 'Esta ligação de recuperação expirou ou já foi utilizada. Solicite uma nova recuperação através de «Esqueci a palavra-passe».'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onGoToPhoneLogin();
                }}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all"
              >
                Voltar ao Início de Sessão
              </button>
            </div>
          ) : (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              {maskedEmail && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conta verificada: <strong>{maskedEmail}</strong></span>
                </div>
              )}

              {submitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3 flex items-start gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{submitError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Nova palavra-passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(v => !v)}
                    aria-label={showNewPass ? 'Ocultar nova palavra-passe' : 'Mostrar nova palavra-passe'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Confirmar nova palavra-passe *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(v => !v)}
                    aria-label={showConfirmPass ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-sm transition-all shadow-lg"
              >
                {isSubmitting ? 'A guardar nova palavra-passe...' : 'Guardar Nova Palavra-passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
