import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { AccountRecoveryModal } from './AccountRecoveryModal';
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
  ShieldCheck, 
  Lock, 
  Phone, 
  ArrowRight, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldAlert,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

interface AdminLoginPageProps {
  onCancel?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onCancel }) => {
  const { 
    loginUserWithCredentialsAsync,
    setActiveTab, 
    setIsLoggedIn
  } = useApp();

  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const fullPhone = buildFullAngolaPhone(adminPhone);
    const validatedPhone = validateStrictAngolaPhone(fullPhone);
    const passTrimmed = adminPassword.trim();

    if (!validatedPhone.isValid) {
      setError(validatedPhone.error || INVALID_ANGOLA_PHONE_MESSAGE);
      return;
    }
    if (!passTrimmed || passTrimmed.length < 6) {
      setError('A palavra-passe de administrador deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await loginUserWithCredentialsAsync(validatedPhone.e164, passTrimmed, 'admin');

      if (!res.success) {
        setError(res.message || 'Acesso Recusado: Número de telefone ou palavra-passe incorretos.');
        return;
      }

      if (res.role !== 'admin') {
        await signOut(auth).catch(() => {});
        setIsLoggedIn(false);
        setError('Acesso Recusado: Esta conta não possui privilégios de administrador verificados.');
        return;
      }

      setSuccessMsg('Acesso administrativo confirmado. A abrir o Painel Administrativo...');
      setTimeout(() => {
        setIsLoggedIn(true);
        setActiveTab('admin');
      }, 350);
    } catch (err: any) {
      console.error('Erro no login administrativo:', err?.code || err);
      setError('Acesso Recusado: Verifique o número de telefone e a palavra-passe.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showRecoveryModal) {
    return (
      <AccountRecoveryModal
        initialType="password"
        initialPhone={adminPhone ? buildFullAngolaPhone(adminPhone) : ''}
        onClose={() => setShowRecoveryModal(false)}
        onSuccessReturnToLogin={(recoveredPhone) => {
          setShowRecoveryModal(false);
          if (recoveredPhone) {
            setAdminPhone(extractAngolaNineDigits(recoveredPhone));
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in relative overflow-hidden">
      
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 backdrop-blur-xl">
        
        {/* Top Header & Logo */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center p-3.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 rounded-2xl shadow-lg shadow-emerald-950/50 mb-1">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>

          <div className="flex justify-center">
            <BrandLogo size="md" showTagline={false} />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>Acesso Administrativo</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Área Restrita da Direcção &amp; Administração J Smart Services
            </p>
          </div>
        </div>

        {/* Security Warning Box */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3.5 mb-6 text-xs text-amber-300 font-medium flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-amber-200">Área Protegida de Gestão</p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Entre com o número de telefone registado da administração e a sua palavra-passe. As permissões administrativas existentes são totalmente preservadas.
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-2xl mb-5 flex items-start gap-2.5 text-xs text-rose-200 font-medium">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 p-3.5 rounded-2xl mb-5 flex items-center gap-2.5 text-xs text-emerald-200 font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form (Apenas 2 campos: Número de telefone + Palavra-passe) */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          
          {/* 1. Número de Telefone (+244XXXXXXXXX) */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Número de telefone *</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-extrabold">🇦🇴 {ANGOLA_COUNTRY_CODE} (9 dígitos)</span>
            </label>
            <div className="flex items-stretch rounded-xl bg-slate-950 border border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 overflow-hidden transition-all">
              <span className="inline-flex items-center px-3.5 bg-emerald-950/70 border-r border-slate-700 text-xs font-extrabold text-emerald-400 select-none shrink-0">
                {ANGOLA_COUNTRY_CODE}
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={ANGOLA_PHONE_NATIONAL_LENGTH}
                value={adminPhone}
                onChange={(e) => {
                  setAdminPhone(sanitizeAngolaPhoneDigitsInput(e.target.value));
                  setError('');
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
                placeholder="956011985"
                className="w-full text-xs font-bold tracking-wider p-3.5 bg-transparent text-white placeholder-slate-500 focus:outline-none"
                required
                autoFocus
              />
              <span className={`inline-flex items-center pr-3 text-[10px] font-extrabold select-none shrink-0 ${
                adminPhone.length === ANGOLA_PHONE_NATIONAL_LENGTH ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {adminPhone.length}/{ANGOLA_PHONE_NATIONAL_LENGTH}
              </span>
            </div>
          </div>

          {/* 2. Palavra-passe (com mostrar/ocultar) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Palavra-passe *</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(true);
                  setError('');
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Esqueci a palavra-passe</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
                placeholder="Introduza a sua palavra-passe"
                className="w-full text-xs font-bold p-3.5 pr-11 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                title={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 text-xs mt-2 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>A Autenticar Administrador...</span>
              </>
            ) : (
              <>
                <span>Entrar no Painel Administrativo</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>

        {/* Back to main portal button */}
        <div className="pt-6 mt-6 border-t border-slate-800 text-center">
          <button
            type="button"
            onClick={() => {
              if (onCancel) {
                onCancel();
              } else {
                setActiveTab('home');
              }
            }}
            className="text-xs text-slate-400 hover:text-white font-semibold transition-colors inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Voltar à Página Principal (Clientes e Profissionais)</span>
          </button>
        </div>

      </div>

      {/* Footer Security Badge */}
      <div className="mt-8 text-center text-[11px] text-slate-500 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-slate-600" />
        <span>J Smart Services Angola 🇦🇴 — Sistema de Gestão Encriptado</span>
      </div>

    </div>
  );
};
