import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  sanitizeAngolaPhoneDigitsInput,
  buildFullAngolaPhone
} from '../utils/phoneAuthUtils';
import {
  MANDATORY_RECOVERY_GENERIC_MESSAGE,
  validateRecoverySubmissionInput
} from '../utils/accountRecoveryService';
import {
  X,
  KeyRound,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Lock
} from 'lucide-react';

interface AccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'password' | 'phone';
  onReturnToLogin: (prefillPhone?: string) => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  isOpen,
  onClose,
  onReturnToLogin
}) => {
  const { submitAccountRecoveryRequestAsync } = useApp();

  const [phoneDigits, setPhoneDigits] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const fullPhone = phoneDigits.length > 0 ? buildFullAngolaPhone(phoneDigits) : '';

  const resetAndClose = () => {
    setPhoneDigits('');
    setEmailInput('');
    setErrorMsg(null);
    setSubmittedMessage(null);
    setIsSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = emailInput.trim().toLowerCase();
    const candidatePhone = phoneDigits.length > 0 ? buildFullAngolaPhone(phoneDigits) : '';

    const check = validateRecoverySubmissionInput({
      phone: candidatePhone,
      email: trimmedEmail
    });

    if (!check.isValid) {
      setErrorMsg(check.error || 'Preencha corretamente o telefone (+244 e 9 dígitos) ou o e-mail Gmail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitAccountRecoveryRequestAsync({
        phone: check.submittedPhone,
        email: check.submittedEmail
      });

      if (!result.success) {
        setErrorMsg(result.message);
        return;
      }

      // Mensagem genérica obrigatória: nunca revela se a conta existe ou não
      setSubmittedMessage(result.message || MANDATORY_RECOVERY_GENERIC_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white relative">
          <button
            type="button"
            onClick={resetAndClose}
            aria-label="Fechar janela de recuperação"
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                J Smart Services Angola
              </span>
              <h2 className="text-lg font-extrabold leading-tight">
                Recuperação de Palavra-passe
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Preencha apenas um dos campos abaixo (o seu número de telefone angolano ou o e-mail Gmail utilizado no registo) para solicitar a recuperação segura da sua conta.
          </p>
        </div>

        <div className="p-6">
          {submittedMessage ? (
            <div className="space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Pedido de Recuperação Registado
                </h3>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left">
                  <p className="text-sm font-medium text-slate-800 leading-relaxed">
                    {submittedMessage}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-left flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Após aprovação do administrador, receberá uma ligação segura temporária para definir a sua nova palavra-passe. Depois, volte a iniciar sessão exclusivamente com o seu <strong>número de telefone (+244)</strong> e a nova palavra-passe.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const prefill = fullPhone;
                  resetAndClose();
                  onReturnToLogin(prefill || undefined);
                }}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Início de Sessão
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Campo Alternativo 1: Número de Telefone (+244 + 9 dígitos) */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Número de telefone utilizado no registo
                </label>
                <div className="flex items-stretch rounded-2xl border border-slate-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 overflow-hidden bg-slate-50 transition-all">
                  <span className="inline-flex items-center gap-1.5 px-3.5 bg-slate-100 border-r border-slate-200 text-slate-800 font-extrabold text-sm select-none">
                    <Phone className="w-3.5 h-3.5 text-amber-600" />
                    +244
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    value={phoneDigits}
                    onChange={e => {
                      setPhoneDigits(sanitizeAngolaPhoneDigitsInput(e.target.value));
                      setErrorMsg(null);
                    }}
                    placeholder="9XXXXXXXX"
                    className="w-full px-3.5 py-3 text-sm font-bold text-slate-900 bg-transparent outline-none placeholder:text-slate-400"
                    aria-label="Número de telefone utilizado no registo"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Formato de Angola: +244 seguido de 9 dígitos (ex: +244923456789).
                </p>
              </div>

              {/* Separador OU */}
              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="px-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  ou em alternativa
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              {/* Campo Alternativo 2: Endereço de e-mail Gmail utilizado no registo */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                  Endereço de e-mail Gmail utilizado no registo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={e => {
                      setEmailInput(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="exemplo@gmail.com"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400"
                    aria-label="Endereço de e-mail Gmail utilizado no registo"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Aceite apenas para solicitar recuperação de conta existente. Pode preencher apenas um dos campos acima.
                </p>
              </div>

              {/* Aviso de Regra Fundamental */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  <strong>Segurança e privacidade:</strong> o seu pedido será analisado internamente pelo administrador da J Smart Services. O início de sessão na plataforma continua exclusivamente com <strong>telefone (+244) e palavra-passe</strong>.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                {isSubmitting ? 'A enviar pedido de recuperação...' : 'Solicitar Recuperação de Conta'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetAndClose();
                  onReturnToLogin();
                }}
                className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao Início de Sessão
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
