import React, { useState } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ShieldCheck, Lock, X, ArrowRight, AlertCircle } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const currentFbUser = auth.currentUser;
    if (!currentFbUser || !currentFbUser.email) {
      setError('Sessão de administrador não encontrada. Inicie sessão novamente.');
      return;
    }
    if (!pinInput.trim()) {
      setError('Introduza a sua palavra-passe de administrador.');
      return;
    }

    setIsVerifying(true);
    try {
      const cred = EmailAuthProvider.credential(currentFbUser.email, pinInput);
      await reauthenticateWithCredential(currentFbUser, cred);
      setPinInput('');
      onSuccess();
      onClose();
    } catch {
      setError('Palavra-passe incorreta ou sessão expirada. Acesso exclusivo do Administrador.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-600 text-white p-2 rounded-xl shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Acesso de Administrador</h3>
              <p className="text-[11px] text-slate-500">Área restrita de gestão J Smart</p>
            </div>
          </div>
          <button 
            onClick={() => { setError(''); setPinInput(''); onClose(); }} 
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Confirme a Palavra-passe da Conta Admin</span>
            </label>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setError(''); }}
              placeholder="Introduza a sua palavra-passe"
              className="w-full text-xs font-bold p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 text-slate-900"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => { setError(''); setPinInput(''); onClose(); }}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 rounded-xl text-xs transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
            >
              <span>{isVerifying ? 'A verificar...' : 'Confirmar'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
