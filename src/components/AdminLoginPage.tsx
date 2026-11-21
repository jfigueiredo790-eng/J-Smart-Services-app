import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { stripSensitiveFields } from '../utils/securityUtils';
import { User } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  ArrowLeft,
  CheckCircle2,
  Building2,
  ShieldAlert
} from 'lucide-react';

interface AdminLoginPageProps {
  onCancel?: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onCancel }) => {
  const { 
    loginUser, 
    setActiveTab, 
    setIsLoggedIn
  } = useApp();

  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const emailTrimmed = adminIdentifier.trim().toLowerCase();
    const passTrimmed = adminPassword.trim();

    if (!emailTrimmed || !emailTrimmed.includes('@')) {
      setError('Por segurança, introduza um e-mail de administrador válido.');
      return;
    }
    if (!passTrimmed || passTrimmed.length < 6) {
      setError('A palavra-passe de administrador deve conter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(auth, emailTrimmed, passTrimmed);
      const fbUser = cred.user;

      const [userSnap, adminSnap] = await Promise.all([
        getDoc(doc(db, 'users', fbUser.uid)),
        getDoc(doc(db, 'admins', fbUser.uid)).catch(() => null)
      ]);

      const userData = userSnap.exists() ? (stripSensitiveFields({ id: userSnap.id, ...userSnap.data() }) as User) : null;
      const isBootstrapAdmin = fbUser.emailVerified === true && fbUser.email?.toLowerCase() === 'jfigueiredo790@gmail.com';
      const hasAdminRecord = (adminSnap && adminSnap.exists()) || userData?.role === 'admin' || isBootstrapAdmin;

      if (!hasAdminRecord) {
        await signOut(auth);
        setError('Acesso Recusado: Esta conta não possui privilégios de administrador verificados.');
        return;
      }

      if (userData?.isDeleted || userData?.blocked || userData?.status === 'bloqueado') {
        await signOut(auth);
        setError('Acesso Recusado: Conta administrativa suspensa ou desativada.');
        return;
      }

      const adminUserObj: User = userData
        ? { ...userData, role: 'admin' }
        : {
            id: fbUser.uid,
            name: fbUser.displayName || 'Administrador J Smart',
            email: fbUser.email || emailTrimmed,
            phone: '',
            role: 'admin',
            adminSubRole: 'super_admin',
            province: 'Icolo e Bengo',
            avatar: fbUser.photoURL || '',
            verified: true,
            createdAt: new Date().toISOString()
          };

      setSuccessMsg('Acesso concedido. A abrir o Painel Administrativo...');
      setTimeout(() => {
        loginUser(adminUserObj, 'admin');
        setIsLoggedIn(true);
        setActiveTab('admin');
      }, 400);
    } catch (err: any) {
      console.error('Erro no login administrativo:', err?.code || err);
      setError('Acesso Recusado: E-mail ou palavra-passe incorretos.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Área Restrita da Direcção & Administração J Smart Services
            </p>
          </div>
        </div>

        {/* Security Warning Box */}
        <div className="bg-slate-950/80 border border-amber-500/30 rounded-2xl p-3.5 mb-6 text-xs text-amber-300 font-medium flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-amber-200">Área Protegida de Gestão</p>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Este portal é exclusivo para administradores da plataforma. Clientes e profissionais devem utilizar o login da página principal.
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

        {/* Form */}
        <form onSubmit={handleAdminLogin} className="space-y-4">
          
          {/* E-mail / Phone Identifier */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span>E-mail ou Telefone do Administrador *</span>
            </label>
            <input
              type="text"
              value={adminIdentifier}
              onChange={(e) => { setAdminIdentifier(e.target.value); setError(''); }}
              placeholder="Ex: jfigueiredo790@gmail.com ou 956011985"
              className="w-full text-xs font-bold p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Password / Admin PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Palavra-passe de Administrador *</span>
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); setError(''); }}
              placeholder="••••••••"
              className="w-full text-xs font-bold p-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all"
              required
            />
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
