import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Lock, Sparkles, X } from 'lucide-react';

interface SubscriptionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  customTitle?: string;
  customMessage?: string;
}

export const SubscriptionExpiredModal: React.FC<SubscriptionExpiredModalProps> = ({
  isOpen,
  onClose,
  customTitle,
  customMessage
}) => {
  const { setActiveTab } = useApp();

  if (!isOpen) return null;

  const handleChooseSubscription = () => {
    onClose();
    setActiveTab('pro_dashboard');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-amber-200 relative text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8 text-amber-600" />
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center justify-center gap-1.5">
            <span>{customTitle || '⚠️ A sua subscrição terminou.'}</span>
          </h3>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {customMessage || 'Para continuar a utilizar as funcionalidades profissionais da J Smart Services, escolha uma subscrição.'}
          </p>
        </div>

        <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl text-left text-[11px] text-amber-900 space-y-1">
          <p className="font-extrabold flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-amber-700" /> Funcionalidades bloqueadas no momento:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-700">
            <li>🚫 Publicar novos trabalhos no Feed;</li>
            <li>🚫 Enviar ou responder a mensagens no Chat;</li>
            <li>🚫 Receber e aceitar novos pedidos de clientes;</li>
            <li>🚫 Ativar o estado de disponibilidade.</li>
          </ul>
        </div>

        <div className="pt-2 space-y-2">
          <button
            onClick={handleChooseSubscription}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>Escolher subscrição</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
};
