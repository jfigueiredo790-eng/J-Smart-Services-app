import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PlanPaymentModal } from './PlanPaymentModal';
import { AlertTriangle, Lock, Sparkles, X, CheckCircle2, Crown, ShieldCheck } from 'lucide-react';

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
  const [selectedPlan, setSelectedPlan] = useState<'plan_7d' | 'plan_14d' | 'plan_30d' | null>(null);

  if (!isOpen) return null;

  const handleOpenProDashboard = () => {
    onClose();
    setActiveTab('pro_dashboard');
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
        <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl border border-amber-300 relative space-y-5 my-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon & Title */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-100 border border-amber-300 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8 text-amber-600 animate-pulse" />
            </div>

            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-amber-300 inline-block">
              Período de Acesso Terminado
            </span>

            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
              {customTitle || 'O seu período gratuito terminou.'}
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl">
              {customMessage || 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.'}
            </p>
          </div>

          {/* Quick Plan Picker */}
          <div className="space-y-2.5">
            <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Escolha o seu plano de subscrição:</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 7 Days */}
              <button
                onClick={() => setSelectedPlan('plan_7d')}
                className="p-3 bg-slate-50 hover:bg-emerald-50 border-2 border-emerald-200 hover:border-emerald-500 rounded-2xl text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">7 Dias</span>
                  <p className="text-xs font-bold text-slate-900 mt-1">Semanal</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-black text-slate-900">1.500 Kz</p>
                </div>
              </button>

              {/* 14 Days */}
              <button
                onClick={() => setSelectedPlan('plan_14d')}
                className="p-3 bg-slate-50 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-500 rounded-2xl text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md uppercase">14 Dias</span>
                  <p className="text-xs font-bold text-slate-900 mt-1">Quinzenal</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-black text-slate-900">3.000 Kz</p>
                </div>
              </button>

              {/* 30 Days */}
              <button
                onClick={() => setSelectedPlan('plan_30d')}
                className="p-3 bg-slate-900 hover:bg-purple-950 text-white border-2 border-purple-500 rounded-2xl text-left transition-all group flex flex-col justify-between shadow-md"
              >
                <div>
                  <span className="text-[10px] font-black text-purple-300 bg-purple-900/80 px-2 py-0.5 rounded-md uppercase border border-purple-700">★ 30 Dias</span>
                  <p className="text-xs font-bold text-white mt-1">Mensal</p>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-black text-amber-400">5.000 Kz</p>
                </div>
              </button>
            </div>
          </div>

          {/* Safety Guarantee */}
          <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-2xl flex items-start gap-2.5 text-[11px] text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Os seus dados estão 100% seguros:</strong> O seu perfil, trabalhos e avaliações continuam guardados. O pagamento ativa o acesso imediatamente.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleOpenProDashboard}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ver Detalhes dos Planos e Pagamentos</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {selectedPlan && (
        <PlanPaymentModal
          planKey={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={() => {
            setSelectedPlan(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
