import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RequestCard } from './RequestCard';
import { PlanPaymentModal } from './PlanPaymentModal';
import { 
  Briefcase, 
  CheckCircle2, 
  Clock, 
  Banknote, 
  Star, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles,
  MapPin,
  Crown,
  AlertTriangle,
  Zap,
  Wallet,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { getProPlanStatus, PLAN_PRICES } from '../utils/planUtils';

export const ProDashboard: React.FC = () => {
  const { currentUser, userRole, requests, updateUserProfile, changeProPlan, subscribeToPlan, setActiveTab } = useApp();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedPlanKey, setSelectedPlanKey] = useState<'plan_7d' | 'plan_14d' | 'plan_30d' | null>(null);

  const proRequests = requests.filter(r => r.professionalId === currentUser.id || r.status === 'pendente');

  const activeJobs = proRequests.filter(r => r.status === 'em_progresso' || r.status === 'aceito');
  const openLeads = requests.filter(r => r.status === 'pendente');
  const completedJobs = proRequests.filter(r => r.status === 'concluido');

  const totalEarningsKz = completedJobs.reduce((acc, curr) => acc + curr.budgetKz, 0);

  const isAvailable = (currentUser as any).status !== 'ocupado';

  const planStatus = getProPlanStatus(currentUser);

  const toggleAvailability = () => {
    updateUserProfile({
      status: isAvailable ? 'ocupado' : 'disponivel'
    });
  };

  const handleSubscribeClick = (planKey: 'plan_7d' | 'plan_14d' | 'plan_30d') => {
    if (userRole === 'admin') {
      setFeedback({ type: 'success', message: 'Como Administrador, tem acesso total ilimitado sem necessidade de pagamento de planos.' });
      setTimeout(() => setFeedback(null), 6000);
      return;
    }
    setSelectedPlanKey(planKey);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Feedback Notification */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-md transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          <span>{feedback.message}</span>
          {feedback.type === 'error' && (
            <button 
              onClick={() => setActiveTab('wallet')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl flex items-center gap-1 shrink-0"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Ir para Carteira</span>
            </button>
          )}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold text-xs uppercase tracking-wider block">Painel do Profissional</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Registo 100% Gratuito
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1">{currentUser.name}</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser.province} • Prestação de Serviços</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-300 bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 font-medium">
                Experiência: <strong className="text-white font-bold">{(currentUser as any).experienceYears || 0} anos</strong>
              </span>
              {(currentUser as any).experienceVerified ? (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1">
                  ✅ Experiência verificada
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl flex items-center gap-1" title="Esta informação é não verificada até confirmação de comprovativos pelo Administrador">
                  ⚪ Estado: Não verificada
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300">
              Estado: <strong className={isAvailable ? 'text-emerald-400' : 'text-amber-400'}>{isAvailable ? 'Disponível' : 'Ocupado'}</strong>
            </span>
            <button
              onClick={toggleAvailability}
              className={`p-1.5 rounded-2xl transition-all ${isAvailable ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-400'}`}
              title="Alterar Disponibilidade"
            >
              {isAvailable ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </div>

      {/* Trial Counter & Automatic Reminder Alerts Banner */}
      {planStatus.isTrial && planStatus.isActive && (
        <div className={`p-5 rounded-3xl shadow-lg border text-white transition-all ${
          planStatus.alertStage === '24_hours'
            ? 'bg-gradient-to-r from-amber-600 via-rose-700 to-slate-900 border-amber-400/50'
            : planStatus.alertStage === '3_days'
            ? 'bg-gradient-to-r from-amber-600 via-teal-800 to-slate-900 border-amber-400/40'
            : planStatus.alertStage === '7_days'
            ? 'bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 border-teal-400/30'
            : 'bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 border-emerald-400/30'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {planStatus.alertStage === '24_hours' && (
                    <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider animate-bounce">
                      ⚠️ Faltam 24 Horas
                    </span>
                  )}
                  {planStatus.alertStage === '3_days' && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      ⚠️ Faltam 3 Dias
                    </span>
                  )}
                  {planStatus.alertStage === '7_days' && (
                    <span className="bg-teal-300 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      🔔 Faltam 7 Dias
                    </span>
                  )}
                  {planStatus.alertStage === 'normal' && (
                    <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Período Experimental Activo
                    </span>
                  )}
                  <span className="text-emerald-200 text-xs font-bold">14 Dias Grátis</span>
                </div>

                <h3 className="text-lg font-black text-white mt-1">
                  {planStatus.message}
                </h3>
                <p className="text-xs text-emerald-100/90 mt-0.5 leading-relaxed">
                  Pode receber pedidos de clientes, conversar no chat, aceitar trabalhos e concluir serviços sem qualquer custo.
                </p>
              </div>
            </div>

            <a 
              href="#planos-subscricao"
              className="bg-white hover:bg-emerald-50 text-slate-900 font-extrabold text-xs px-4 py-2.5 rounded-2xl transition-all shrink-0 shadow-md flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Escolher Plano</span>
            </a>
          </div>
        </div>
      )}

      {/* Plan Expired Alert Banner (Trial or Paid Plan) */}
      {planStatus.isExpired && (
        <div className="bg-gradient-to-r from-rose-900 via-slate-900 to-slate-950 text-white p-6 rounded-3xl shadow-xl border-2 border-rose-500/50 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-rose-800/40 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
                <AlertTriangle className="w-7 h-7 text-amber-300 animate-pulse" />
              </div>
              <div>
                <span className="bg-rose-950 text-rose-200 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-rose-500/40">
                  🔒 Assinatura Expirada — Renovação Necessária
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  O seu período de acesso profissional expirou. Escolha um novo plano para reativar o seu acesso.
                </h3>
                <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                  As funcionalidades profissionais estão temporariamente suspensas até à confirmação do pagamento de um novo plano.
                </p>
              </div>
            </div>

            <a 
              href="#planos-subscricao"
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-3 rounded-2xl transition-all shrink-0 shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>Escolher Plano de Renovação</span>
            </a>
          </div>

          {/* Reassurance Guarantee Box */}
          <div className="bg-slate-900/90 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3 text-xs text-slate-300">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-extrabold text-emerald-300 uppercase tracking-wider text-[11px]">
                ✓ Os seus dados e histórico estão 100% seguros
              </p>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                A sua conta, perfil profissional, fotos de portfólio, avaliações acumuladas e histórico de serviços prestados <strong>NÃO foram apagados</strong>. Basta escolher um dos planos abaixo (Semanal, Quinzenal ou Mensal) e efetuar o pagamento para desbloquear instantaneamente a sua conta.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Paid Plan Banner */}
      {!planStatus.isTrial && planStatus.isActive && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-indigo-500/30">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Plano Activo
                </span>
                <h3 className="text-base font-black text-white mt-0.5">
                  {planStatus.message}
                </h3>
              </div>
            </div>

            <a href="#planos-subscricao" className="text-xs font-bold text-indigo-300 hover:text-white underline">
              Renovar Plano
            </a>
          </div>
        </div>
      )}

      {/* Pro Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Trabalhos Ativos</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{activeJobs.length}</span>
          <span className="text-[11px] text-emerald-600 font-bold block mt-1">Em execução ou aceite</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Oportunidades</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">{openLeads.length}</span>
          <span className="text-[11px] text-slate-500 block mt-1">Pedidos pendentes</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ganhos Acumulados</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {totalEarningsKz.toLocaleString('pt-AO')} Kz
          </span>
          <span className="text-[11px] text-slate-500 block mt-1">Serviços concluídos</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avaliação Média</span>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            <span className="text-2xl font-black text-slate-900">4.9</span>
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Clientes satisfeitos</span>
        </div>

      </div>

      {/* SECTION: PLANOS DE SUBSCRIÇÃO */}
      <div id="planos-subscricao" className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-slate-900 text-base">Planos de Subscrição</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Registo gratuito + 14 dias de teste. Escolha o seu plano para continuar a trabalhar na plataforma J Smart.
            </p>
          </div>

          <div className="text-right self-start sm:self-auto">
            <span className="text-[11px] text-slate-400 font-bold block">Saldo na Carteira:</span>
            <span className="text-sm font-black text-emerald-700">
              {(currentUser.walletBalanceKz || 0).toLocaleString('pt-AO')} Kz
            </span>
          </div>
        </div>

        {/* 3 Subscription Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 🟢 Plano Semanal (7 Dias) */}
          <div className="bg-slate-50 hover:bg-emerald-50/40 border-2 border-emerald-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  📅 Plano Semanal
                </span>
                <span className="text-xs text-emerald-700 font-bold">7 Dias</span>
              </div>

              <h4 className="text-lg font-black text-slate-900 mt-3">Plano Semanal</h4>
              <p className="text-xs text-slate-500 mt-1">Ideal para utilização de curta duração.</p>

              <div className="mt-4 pt-3 border-t border-emerald-100">
                <span className="text-2xl font-black text-slate-900">1.500 Kz</span>
                <span className="text-xs text-slate-500 font-medium"> / 7 dias</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Receber pedidos de clientes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Conversar no chat e dar orçamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Aceitar e concluir serviços</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribeClick('plan_7d')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-emerald-600/20"
            >
              Ativar Plano Semanal (1.500 Kz)
            </button>
          </div>

          {/* 🔵 Plano Quinzenal (14 Dias) */}
          <div className="bg-slate-50 hover:bg-blue-50/40 border-2 border-blue-200 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                  📅 Plano Quinzenal
                </span>
                <span className="text-xs text-blue-700 font-bold">14 Dias</span>
              </div>

              <h4 className="text-lg font-black text-slate-900 mt-3">Plano Quinzenal</h4>
              <p className="text-xs text-slate-500 mt-1">Opção intermédia com melhor planeamento.</p>

              <div className="mt-4 pt-3 border-t border-blue-100">
                <span className="text-2xl font-black text-slate-900">2.000 Kz</span>
                <span className="text-xs text-slate-500 font-medium"> / 14 dias</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Receber pedidos de clientes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Conversar no chat e dar orçamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Aceitar e concluir serviços</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribeClick('plan_14d')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-blue-600/20"
            >
              Ativar Plano Quinzenal (2.000 Kz)
            </button>
          </div>

          {/* 🟣 Plano Mensal (30 Dias) */}
          <div className="bg-slate-900 text-white border-2 border-purple-500 rounded-3xl p-5 flex flex-col justify-between space-y-4 transition-all relative shadow-xl">
            <div className="absolute -top-3 right-4 bg-purple-500 text-white font-black text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
              ★ Melhor Custo-Benefício
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="bg-purple-900/80 text-purple-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-700">
                  📅 Plano Mensal
                </span>
                <span className="text-xs text-purple-300 font-bold">30 Dias</span>
              </div>

              <h4 className="text-lg font-black text-white mt-3">Plano Mensal</h4>
              <p className="text-xs text-slate-400 mt-1">Melhor custo-benefício para profissionais ativos.</p>

              <div className="mt-4 pt-3 border-t border-slate-800">
                <span className="text-2xl font-black text-amber-400">5.000 Kz</span>
                <span className="text-xs text-slate-400 font-medium"> / 30 dias</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Receber pedidos de clientes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Conversar no chat e dar orçamentos</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Aceitar e concluir serviços</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Maior destaque e prioridade nas pesquisas</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleSubscribeClick('plan_30d')}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-2xl transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Ativar Plano Mensal (5.000 Kz)</span>
            </button>
          </div>

        </div>

      </div>

      {/* Open Customer Leads in Angola */}
      <div>
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          Oportunidades de Clientes em Angola ({openLeads.length})
        </h3>

        {planStatus.isExpired ? (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
            <h4 className="font-black text-rose-900 text-base">
              A sua assinatura ou período gratuito terminou.
            </h4>
            <p className="text-xs text-rose-800 max-w-md mx-auto leading-relaxed">
              Para ver os detalhes dos clientes, enviar propostas e aceitar novos pedidos, escolha e ative um dos planos acima (Semanal, Quinzenal ou Mensal).
            </p>
            <a 
              href="#planos-subscricao"
              className="inline-block bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md"
            >
              Escolher Plano para Reativar Acesso
            </a>
          </div>
        ) : openLeads.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-slate-500 border border-slate-200">
            <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium">Sem novos pedidos pendentes no momento para a sua área.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openLeads.map(req => (
              <RequestCard key={req.id} request={req} />
            ))}
          </div>
        )}
      </div>

      {selectedPlanKey && (
        <PlanPaymentModal
          planKey={selectedPlanKey}
          onClose={() => setSelectedPlanKey(null)}
          onSuccess={() => {
            setSelectedPlanKey(null);
            setFeedback({ type: 'success', message: 'Solicitação de ativação do pacote enviada com sucesso! Aguarde a confirmação do comprovativo no WhatsApp.' });
            setTimeout(() => setFeedback(null), 8000);
          }}
        />
      )}

    </div>
  );
};
