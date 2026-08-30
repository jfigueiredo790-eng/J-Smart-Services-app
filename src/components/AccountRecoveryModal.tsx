import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  KeyRound, 
  Phone, 
  Mail, 
  FileText, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  RecoveryType, 
  RECOVERY_MESSAGES, 
  maskPhoneNumber, 
  maskEmailAddress, 
  maskDocumentNumber, 
  isValidAngolanPhone 
} from '../utils/recoveryUtils';

interface AccountRecoveryModalProps {
  initialType?: RecoveryType;
  onClose: () => void;
  onSuccessReturnToLogin?: (recoveredIdentifier?: string) => void;
}

export const AccountRecoveryModal: React.FC<AccountRecoveryModalProps> = ({
  initialType = 'password',
  onClose,
  onSuccessReturnToLogin
}) => {
  const {
    requestPasswordRecoveryOtpAsync,
    verifyRecoveryOtpAsync,
    resetAccountPasswordAsync,
    requestPhoneRecoveryVerificationAsync,
    updateRecoveredPhoneNumberAsync
  } = useApp();

  const [activeTab, setActiveTab] = useState<RecoveryType>(initialType);
  
  // Step in the flow: 'input' -> 'otp' -> 'action' -> 'success'
  const [step, setStep] = useState<'input' | 'otp' | 'action' | 'success'>('input');
  
  // Input fields for Password Recovery
  const [passwordIdentifier, setPasswordIdentifier] = useState('');
  
  // Input fields for Phone Recovery
  const [phoneRecoveryEmail, setPhoneRecoveryEmail] = useState('');
  const [phoneRecoveryDoc, setPhoneRecoveryDoc] = useState('');
  const [phoneRecoveryPassword, setPhoneRecoveryPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // OTP Verification state
  const [sessionId, setSessionId] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [maskedContact, setMaskedContact] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(3);
  const [timerSeconds, setTimerSeconds] = useState<number>(600); // 10 minutes

  // Action fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPhone, setNewPhone] = useState('');

  // Status banners
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccountBlocked, setIsAccountBlocked] = useState(false);

  // Sync initialType when it changes
  useEffect(() => {
    setActiveTab(initialType);
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    setDevCode(undefined);
    setAttemptsRemaining(3);
    setTimerSeconds(600);
  }, [initialType]);

  // Timer countdown
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

  const handleTabSwitch = (newType: RecoveryType) => {
    setActiveTab(newType);
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    setDevCode(undefined);
    setAttemptsRemaining(3);
    setTimerSeconds(600);
  };

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    const emergencyTimer = setTimeout(() => setIsSubmitting(false), 7000);

    try {
      if (activeTab === 'password') {
        if (!passwordIdentifier.trim()) {
          clearTimeout(emergencyTimer);
          setErrorMsg('Por favor introduza o número de telefone, e-mail ou BI associado à conta.');
          setIsSubmitting(false);
          return;
        }

        const res = await requestPasswordRecoveryOtpAsync(passwordIdentifier.trim());
        clearTimeout(emergencyTimer);

        if (res.success && res.sessionId) {
          setSessionId(res.sessionId);
          setMaskedContact(res.maskedContact || 'seu contacto registado');
          setDevCode(res.devCode);
          setIsAccountBlocked(!!res.isBlocked);
          setAttemptsRemaining(3);
          setTimerSeconds(600);
          setStep('otp');
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.message);
        }
      } else {
        // Phone Recovery
        if (!phoneRecoveryEmail.trim() || !phoneRecoveryDoc.trim()) {
          clearTimeout(emergencyTimer);
          setErrorMsg('Por favor preencha o seu E-mail e o Número de Bilhete de Identidade (BI).');
          setIsSubmitting(false);
          return;
        }

        const res = await requestPhoneRecoveryVerificationAsync(
          phoneRecoveryEmail.trim(),
          phoneRecoveryDoc.trim(),
          phoneRecoveryPassword ? phoneRecoveryPassword.trim() : undefined
        );
        clearTimeout(emergencyTimer);

        if (res.success && res.sessionId) {
          setSessionId(res.sessionId);
          setMaskedContact(res.maskedCurrentPhone || 'contacto associado');
          setMaskedEmail(res.maskedEmail || maskEmailAddress(phoneRecoveryEmail));
          setDevCode(res.devCode);
          setIsAccountBlocked(!!res.isBlocked);
          setAttemptsRemaining(3);
          setTimerSeconds(600);
          setStep('otp');
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      clearTimeout(emergencyTimer);
      setErrorMsg('Ocorreu um erro na solicitação. Por favor verifique a sua ligação e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Validate OTP
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
        setStep('action');
        setSuccessMsg(res.message);
      } else {
        setErrorMsg(res.message);
        setAttemptsRemaining(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      clearTimeout(emergencyTimer);
      setErrorMsg('Ocorreu um erro ao validar o código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);
    const emergencyTimer = setTimeout(() => setIsSubmitting(false), 7000);

    try {
      if (activeTab === 'password') {
        const res = await requestPasswordRecoveryOtpAsync(passwordIdentifier.trim());
        clearTimeout(emergencyTimer);
        if (res.success && res.sessionId) {
          setSessionId(res.sessionId);
          setDevCode(res.devCode);
          setAttemptsRemaining(3);
          setTimerSeconds(600);
          setSuccessMsg('Novo código enviado com sucesso!');
        } else {
          setErrorMsg(res.message);
        }
      } else {
        const res = await requestPhoneRecoveryVerificationAsync(
          phoneRecoveryEmail.trim(),
          phoneRecoveryDoc.trim(),
          phoneRecoveryPassword ? phoneRecoveryPassword.trim() : undefined
        );
        clearTimeout(emergencyTimer);
        if (res.success && res.sessionId) {
          setSessionId(res.sessionId);
          setDevCode(res.devCode);
          setAttemptsRemaining(3);
          setTimerSeconds(600);
          setSuccessMsg('Novo código enviado com sucesso!');
        } else {
          setErrorMsg(res.message);
        }
      }
    } catch (err: any) {
      clearTimeout(emergencyTimer);
      setErrorMsg('Erro ao reenviar código. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Complete Action (Set new password or update phone)
  const handleCompleteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (activeTab === 'password') {
      if (newPassword.length < 4) {
        setErrorMsg('A nova palavra-passe deve ter pelo menos 4 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('As palavras-passe introduzidas não coincidem.');
        return;
      }

      setIsSubmitting(true);
      const emergencyTimer = setTimeout(() => setIsSubmitting(false), 7000);

      try {
        const res = await resetAccountPasswordAsync(sessionId, otpCode.trim(), newPassword);
        clearTimeout(emergencyTimer);

        if (res.success) {
          setIsAccountBlocked(!!res.isBlocked);
          setStep('success');
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        clearTimeout(emergencyTimer);
        setErrorMsg('Erro ao redefinir a palavra-passe. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Update phone
      if (!isValidAngolanPhone(newPhone)) {
        setErrorMsg('Por favor introduza um número angolano válido de 9 dígitos (ex: 923 111 222).');
        return;
      }

      setIsSubmitting(true);
      const emergencyTimer = setTimeout(() => setIsSubmitting(false), 7000);

      try {
        const res = await updateRecoveredPhoneNumberAsync(sessionId, otpCode.trim(), newPhone.trim());
        clearTimeout(emergencyTimer);

        if (res.success) {
          setIsAccountBlocked(!!res.isBlocked);
          setStep('success');
          setSuccessMsg(res.message);
        } else {
          setErrorMsg(res.message);
        }
      } catch (err: any) {
        clearTimeout(emergencyTimer);
        setErrorMsg('Erro ao atualizar o número de telefone. Tente novamente.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

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
              {activeTab === 'password' ? <KeyRound className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Recuperação de Acesso
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                J Smart Services • Angola 🇦🇴
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector (Only in input step) */}
        {step === 'input' && (
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
            <button
              type="button"
              onClick={() => handleTabSwitch('password')}
              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Esqueci a palavra-passe</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('phone')}
              className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'phone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Esqueci o telefone</span>
            </button>
          </div>
        )}

        {/* Informative Intro / Guidance */}
        {step === 'input' && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl mb-4 flex items-start gap-2.5 text-xs text-emerald-900">
            <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <p className="font-bold">{RECOVERY_MESSAGES.INTRO}</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                {activeTab === 'password'
                  ? 'Localizaremos a sua conta e enviaremos um código de verificação (OTP) para o seu contacto.'
                  : 'Confirme o e-mail e BI registados para validar a sua identidade e associar um novo número.'}
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
        {successMsg && step !== 'success' && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl mb-4 flex items-start gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: INPUT IDENTIFIERS */}
        {/* ========================================================================= */}
        {step === 'input' && (
          <>
            {activeTab === 'password' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Número de Telefone, E-mail ou BI *</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-extrabold">🇦🇴 +244</span>
                  </label>
                  <input
                    type="text"
                    value={passwordIdentifier}
                    onChange={(e) => setPasswordIdentifier(e.target.value)}
                    placeholder="923 111 222, exemplo@gmail.com ou 007...LA041"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    Introduza o identificador que utilizou ao criar a conta na plataforma.
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
                      <span>A verificar conta...</span>
                    </>
                  ) : (
                    <>
                      <span>Continuar e Enviar Código</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRequestOtp} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" />
                    <span>E-mail Registado na Conta *</span>
                  </label>
                  <input
                    type="email"
                    value={phoneRecoveryEmail}
                    onChange={(e) => setPhoneRecoveryEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nº do Bilhete de Identidade (BI) ou Documento *</span>
                  </label>
                  <input
                    type="text"
                    value={phoneRecoveryDoc}
                    onChange={(e) => setPhoneRecoveryDoc(e.target.value)}
                    placeholder="ex: 007894562LA041"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50 uppercase"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Palavra-passe Atual (Opcional)</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Segurança Adicional</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={phoneRecoveryPassword}
                      onChange={(e) => setPhoneRecoveryPassword(e.target.value)}
                      placeholder="Introduza se lembrar a palavra-passe"
                      className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A validar identidade...</span>
                    </>
                  ) : (
                    <>
                      <span>Validar Identidade e Enviar Código</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: OTP VERIFICATION */}
        {/* ========================================================================= */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Código Enviado com Sucesso</span>
              </p>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Enviámos um código de verificação de 6 dígitos para o contacto associado à conta:{' '}
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

            {/* Simulated SMS/Email Notification Badge for Seamless Testing */}
            {devCode && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-2xl text-xs space-y-1.5 animate-pulse">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Código de Recuperação (Simulador SMS/E-mail):</span>
                  </span>
                  <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-md font-black tracking-widest text-sm">
                    {devCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOtpCode(devCode)}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold underline"
                >
                  ⚡ Clicar para preencher código automaticamente ({devCode})
                </button>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 text-center">
                  Introduza o Código de 6 Dígitos
                </label>
                <input
                  type="text"
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
                  <span>Não recebeu? Reenviar novo código</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: ACTION (NEW PASSWORD OR NEW PHONE) */}
        {/* ========================================================================= */}
        {step === 'action' && (
          <>
            {activeTab === 'password' ? (
              <form onSubmit={handleCompleteAction} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Código validado com sucesso! ✅</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Defina a sua nova palavra-passe. Apenas este dado será atualizado; todos os seus pedidos, histórico e avaliações permanecem intactos.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nova Palavra-passe * (mín. 4 caracteres)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Introduza a nova palavra-passe"
                      className="w-full text-xs p-3 pr-10 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Confirmar Nova Palavra-passe *</span>
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova palavra-passe"
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>A guardar nova palavra-passe...</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar Nova Palavra-passe</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCompleteAction} className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs text-slate-700">
                  <p className="font-bold text-slate-900">Identidade confirmada com sucesso! ✅</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Introduza o novo número de telefone angolano (+244) para aceder à sua conta existente.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Novo Número de Telefone *</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-extrabold">🇦🇴 +244</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">+244</span>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="923 111 222"
                      className="w-full text-xs p-3 pl-14 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    O sistema verificará que este número não pertence a outra conta.
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
                      <span>A atualizar número...</span>
                    </>
                  ) : (
                    <>
                      <span>Atualizar Número de Telefone</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: SUCCESS / COMPLETED */}
        {/* ========================================================================= */}
        {step === 'success' && (
          <div className="text-center py-4 space-y-4">
            {isAccountBlocked ? (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Dados Atualizados com Sucesso
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs text-amber-950 text-left space-y-1">
                    <p className="font-bold">{RECOVERY_MESSAGES.ACCOUNT_BLOCKED}</p>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      As suas novas credenciais foram guardadas na base de dados, mas o bloqueio administrativo permanece ativo. Apenas a equipa de administração pode alterar o estado para Ativo.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Recuperação Concluída!
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {RECOVERY_MESSAGES.SUCCESS}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onSuccessReturnToLogin) {
                    onSuccessReturnToLogin(newPhone || passwordIdentifier);
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-md text-xs flex items-center justify-center gap-2"
              >
                <span>Ir para o Ecrã de Entrada (Login)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Back to Login Footer Link */}
        {step !== 'success' && (
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
