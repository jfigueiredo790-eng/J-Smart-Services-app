import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ANGOLA_PROVINCES } from '../types';
import {
  ANGOLA_COUNTRY_CODE,
  ANGOLA_PHONE_NATIONAL_LENGTH,
  INVALID_ANGOLA_PHONE_MESSAGE,
  buildFullAngolaPhone,
  extractAngolaNineDigits,
  sanitizeAngolaPhoneDigitsInput,
  validateStrictAngolaPhone
} from '../utils/phoneAuthUtils';
import { 
  X, 
  KeyRound, 
  Phone, 
  User as UserIcon,
  MapPin,
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  RotateCcw,
  Info,
  MessageSquare
} from 'lucide-react';
import { 
  RecoveryType, 
  RECOVERY_MESSAGES
} from '../utils/recoveryUtils';

interface AccountRecoveryModalProps {
  initialType?: RecoveryType;
  initialPhone?: string;
  onClose: () => void;
  onSuccessReturnToLogin?: (recoveredPhone?: string) => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  initialType = 'password',
  initialPhone = '',
  onClose,
  onSuccessReturnToLogin
}) => {
  const {
    requestPasswordRecoveryOtpAsync,
    verifyRecoveryOtpAsync
  } = useApp();

  const [step, setStep] = useState<'input' | 'otp' | 'identity' | 'sent' | 'success'>('input');

  // Primary phone identifier (9 local digits after fixed +244 prefix)
  const [recoveryPhone, setRecoveryPhone] = useState(() => extractAngolaNineDigits(initialPhone));

  // Server SMS OTP verification state
  const [sessionId, setSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [timerSeconds, setTimerSeconds] = useState<number>(600);

  // Secure Identity Verification state (for phone-only accounts without SMS gateway or linked email)
  const [identityFullName, setIdentityFullName] = useState('');
  const [identityProvince, setIdentityProvince] = useState('Luanda');
  const [identityDocOptional, setIdentityDocOptional] = useState('');
  const [verificationRef, setVerificationRef] = useState('');

  // Status banners
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    setAttemptsRemaining(3);
    setTimerSeconds(600);
  }, [initialType]);

  useEffect(() => {
    if (step === 'otp' && timerSeconds > 0) {
      const interval = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step, timerSeconds]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request phone-based recovery
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const fullPhone = buildFullAngolaPhone(recoveryPhone);
    const validated = validateStrictAngolaPhone(fullPhone);
    if (!validated.isValid) {
      setErrorMsg(validated.error || INVALID_ANGOLA_PHONE_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    const emergencyTimer = setTimeout(() => setIsSubmitting(false), 8000);

    try {
      const res = await requestPasswordRecoveryOtpAsync(validated.e164);
      clearTimeout(emergencyTimer);

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      setMaskedContact(res.maskedContact || validated.e164);
      setSuccessMsg(res.message);

      if (res.deliveryChannel === 'sms' && res.sessionId) {
        setSessionId(res.sessionId);
        setAttemptsRemaining(3);
        setTimerSeconds(600);
        setStep('otp');
      } else if (res.deliveryChannel === 'email_link') {
        setStep('sent');
      } else {
        setStep('identity');
      }
    } catch {
      clearTimeout(emergencyTimer);
      setErrorMsg('Ocorreu um erro na solicitação. Verifique a sua ligação e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 (SMS Channel): Validate server-side OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otpCode.trim().length !== 6) {
      setErrorMsg('O código de verificação deve ter 6 dígitos numéricos.');
      return;
    }

    setIsSubmitting(true);
    const emergencyTimer = setTimeout(() => setIsSubmitting(false), 7000);

    try {
      const res = await verifyRecoveryOtpAsync(sessionId, otpCode.trim());
      clearTimeout(emergencyTimer);

      if (res.success) {
        setStep('success');
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
        setAttemptsRemaining(prev => Math.max(0, prev - 1));
      }
    } catch {
      clearTimeout(emergencyTimer);
      setErrorMsg('Ocorreu um erro ao validar o código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    try {
      const res = await requestPasswordRecoveryOtpAsync(buildFullAngolaPhone(recoveryPhone));
      if (res.success && res.sessionId) {
        setSessionId(res.sessionId);
        setAttemptsRemaining(3);
        setTimerSeconds(600);
        setSuccessMsg('Novo código SMS enviado com sucesso!');
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Erro ao reenviar código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 (Phone-Only Identity Verification Channel)
  const handleSubmitIdentityVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (identityFullName.trim().length < 3) {
      setErrorMsg('Introduza o seu nome completo registado na conta.');
      return;
    }

    const randomBytes = new Uint32Array(1);
    if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      randomBytes[0] = Date.now() % 999999;
    }
    const refCode = `JSS-REC-${String(randomBytes[0] % 1000000).padStart(6, '0')}`;
    setVerificationRef(refCode);
    setStep('success');
    setSuccessMsg('Pedido de verificação segura preparado com referência única.');
  };

  const normalizedFinalPhone = validateStrictAngolaPhone(buildFullAngolaPhone(recoveryPhone));
  const whatsappSupportUrl = (() => {
    const phoneDisplay = normalizedFinalPhone.isValid ? normalizedFinalPhone.e164 : buildFullAngolaPhone(recoveryPhone);
    const msg = [
      'Olá equipa J Smart Services! Solicito recuperação segura da palavra-passe da minha conta.',
      `• Telefone da conta: ${phoneDisplay}`,
      `• Nome registado: ${identityFullName.trim() || 'Não indicado'}`,
      `• Província: ${identityProvince}`,
      identityDocOptional.trim() ? `• BI/Documento: ${identityDocOptional.trim().toUpperCase()}` : '',
      verificationRef ? `• Referência de Verificação: ${verificationRef}` : ''
    ].filter(Boolean).join('\n');
    return `https://wa.me/244956011985?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        id="account-recovery-modal"
        className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-100 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Recuperar Palavra-passe
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Recuperação por Telefone • Angola 🇦🇴
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Intro */}
        {step === 'input' && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl mb-4 flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">{RECOVERY_MESSAGES.INTRO}</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Não precisa de introduzir e-mail. Basta indicar o <strong>número de telefone</strong> associado à sua conta.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl mb-4 flex items-start gap-2 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success Banner */}
        {successMsg && step !== 'success' && step !== 'sent' && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl mb-4 flex items-start gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: PHONE NUMBER INPUT ONLY */}
        {step === 'input' && (
          <form onSubmit={handleRequestRecovery} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Número de Telefone da Conta *</span>
                </span>
                <span className="text-[10px] text-emerald-600 font-extrabold">🇦🇴 {ANGOLA_COUNTRY_CODE} (9 dígitos)</span>
              </label>
              <div className="flex items-stretch rounded-xl border border-slate-200 bg-slate-50/50 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden">
                <span className="inline-flex items-center px-3 bg-emerald-50 border-r border-slate-200 text-xs font-extrabold text-emerald-800 select-none shrink-0">
                  {ANGOLA_COUNTRY_CODE}
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={ANGOLA_PHONE_NATIONAL_LENGTH}
                  value={recoveryPhone}
                  onChange={(e) => {
                    setRecoveryPhone(sanitizeAngolaPhoneDigitsInput(e.target.value));
                    if (errorMsg) setErrorMsg('');
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.ctrlKey || e.metaKey || e.altKey ||
                      ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)
                    ) {
                      return;
                    }
                    if (!/^[0-9]$/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="923456789"
                  className="w-full text-xs p-3 font-bold tracking-wider text-slate-900 bg-transparent focus:outline-none"
                  required
                  autoFocus
                />
                <span className={`inline-flex items-center pr-3 text-[10px] font-extrabold select-none shrink-0 ${
                  recoveryPhone.length === ANGOLA_PHONE_NATIONAL_LENGTH ? 'text-emerald-600' : 'text-slate-400'
                }`}>
                  {recoveryPhone.length}/{ANGOLA_PHONE_NATIONAL_LENGTH}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                Formato oficial: <strong>+244XXXXXXXXX</strong>. O sistema preserva todos os seus dados, publicações e histórico.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>A localizar conta...</span>
                </>
              ) : (
                <>
                  <span>Continuar Recuperação</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2A: SERVER SMS OTP VERIFICATION */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Código SMS Enviado com Segurança</span>
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Introduza o código de 6 dígitos enviado por SMS para{' '}
                <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                  {maskedContact}
                </span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Validade: <strong className="text-slate-700">{formatTimer(timerSeconds)}</strong></span>
                </span>
                <span className="text-slate-600">
                  Tentativas restantes: <strong className="text-emerald-700">{attemptsRemaining}/3</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 text-center">
                  Código de Verificação (6 Dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono font-black p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 text-slate-900"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('input')}
                  className="py-3 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || otpCode.length !== 6 || attemptsRemaining <= 0}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'A validar...' : 'Confirmar Código'}
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="text-[11px] text-slate-500 hover:text-emerald-700 font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Não recebeu? Reenviar novo SMS</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2B: AUTOMATIC SECURE LINK SENT (FOR ACCOUNTS WITH LINKED CONTACT, NO EMAIL TYPED) */}
        {step === 'sent' && (
          <div className="text-center py-3 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Ligação Segura de Redefinição Enviada!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {successMsg}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[11px] text-slate-600 text-left leading-relaxed">
              Depois de escolher a sua nova palavra-passe na ligação recebida, volte aqui e entre normalmente com o seu <strong>número de telefone</strong> ({maskedContact}).
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onSuccessReturnToLogin) {
                  onSuccessReturnToLogin(normalizedFinalPhone.isValid ? normalizedFinalPhone.display : recoveryPhone);
                }
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
            >
              <span>Voltar ao Ecrã de Entrada</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2C: SECURE IDENTITY VERIFICATION (FOR PHONE-ONLY ACCOUNTS WITHOUT EMAIL/SMS GATEWAY) */}
        {step === 'identity' && (
          <form onSubmit={handleSubmitIdentityVerification} className="space-y-3.5">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[11px] text-slate-700 leading-relaxed">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verificação Segura de Identidade ({maskedContact})</span>
              </p>
              <p className="mt-1">
                Para proteger a sua conta contra acessos indevidos, confirme os dados abaixo para validar a sua titularidade sem precisar de e-mail.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nome Completo Registado na Conta *</span>
              </label>
              <input
                type="text"
                value={identityFullName}
                onChange={(e) => setIdentityFullName(e.target.value)}
                placeholder="Ex: Mateus Agostinho"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Província da Conta *</span>
              </label>
              <select
                value={identityProvince}
                onChange={(e) => setIdentityProvince(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                {ANGOLA_PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nº do BI</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">(Opcional)</span>
              </label>
              <input
                type="text"
                value={identityDocOptional}
                onChange={(e) => setIdentityDocOptional(e.target.value)}
                placeholder="Ex: 007894562LA041"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 uppercase"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="py-3 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
              >
                <span>Gerar Verificação Segura</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS / VERIFICATION READY */}
        {step === 'success' && (
          <div className="text-center py-3 space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-extrabold text-slate-900">
                Verificação Segura Pronta!
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {verificationRef
                  ? `Referência gerada: ${verificationRef}. Envie esta confirmação pelo WhatsApp oficial a partir do seu número (${maskedContact}) para concluir a redefinição segura com a equipa J Smart Services.`
                  : successMsg}
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              <a
                href={whatsappSupportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Concluir Verificação no WhatsApp Oficial</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSuccessReturnToLogin) {
                    onSuccessReturnToLogin(normalizedFinalPhone.isValid ? normalizedFinalPhone.display : recoveryPhone);
                  }
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2"
              >
                <span>Voltar ao Ecrã de Entrada</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Back to Login Footer Link */}
        {step !== 'success' && step !== 'sent' && (
          <div className="pt-3 text-center border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-600 hover:text-slate-900 font-bold transition-colors"
            >
              ← Voltar ao Ecrã de Entrada (Login)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
