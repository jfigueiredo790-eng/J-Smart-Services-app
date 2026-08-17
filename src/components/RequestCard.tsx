import React from 'react';
import { ServiceRequest, RequestStatus } from '../types';
import { useApp } from '../context/AppContext';
import { UserAvatar } from './UserAvatar';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Banknote, 
  MessageSquare, 
  Star, 
  CheckCircle, 
  XCircle, 
  Play,
  CheckCheck
} from 'lucide-react';

interface RequestCardProps {
  request: ServiceRequest;
}

export const RequestCard: React.FC<RequestCardProps> = ({ request }) => {
  const { 
    currentUser, 
    professionals,
    allUsers,
    updateRequestStatus, 
    setActiveChatRequestId, 
    setActiveTab,
    setIsReviewModalOpen,
    setReviewingRequestId
  } = useApp();

  const isClient = currentUser.role === 'cliente';
  const isPro = currentUser.role === 'profissional';

  const matchedPro = professionals.find(p => p.id === request.professionalId);
  const matchedClient = allUsers.find(u => u.id === request.clientId);
  const targetAvatar = isPro 
    ? (matchedClient?.avatar || (matchedClient as any)?.photoURL || request.clientAvatar)
    : (matchedPro?.avatar || (matchedPro as any)?.photoURL || request.professionalAvatar);

  // Status color styles
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pendente':
        return <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">⏳ Pendente</span>;
      case 'aceito':
        return <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">👍 Aceito</span>;
      case 'em_progresso':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-300 animate-pulse">⚡ Em Progresso</span>;
      case 'concluido':
        return <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-300">✅ Concluído</span>;
      case 'cancelado':
        return <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full border border-rose-200">❌ Cancelado</span>;
    }
  };

  const handleOpenChat = () => {
    if (request.clientId !== currentUser.id && request.professionalId !== currentUser.id && currentUser.role !== 'admin') {
      alert('Acesso negado: Não é participante deste pedido de serviço.');
      return;
    }
    setActiveChatRequestId(request.id);
    setActiveTab('chat');
  };

  const handleOpenReview = () => {
    setReviewingRequestId(request.id);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all">
      
      {/* Top Bar: Title & Status */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
            {request.categoryName}
          </span>
          <h3 className="font-extrabold text-slate-900 text-base mt-1 line-clamp-1">
            {request.title}
          </h3>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{request.address}, {request.province}</span>
          </p>
        </div>

        <div>
          {getStatusBadge(request.status)}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 my-3 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl">
        {request.description}
      </p>

      {/* Client / Pro Info */}
      <div className="flex items-center justify-between text-xs my-3 pt-1">
        <div className="flex items-center gap-2">
          <UserAvatar 
            src={targetAvatar} 
            name={isPro ? request.clientName : (request.professionalName || 'Profissional')} 
            sizeClassName="w-8 h-8"
            roundedClassName="rounded-full"
            role={isPro ? 'cliente' : 'profissional'}
            className="border border-slate-200"
          />
          <div>
            <span className="text-[10px] text-slate-400 block font-semibold">{isPro ? 'Cliente' : 'Profissional'}</span>
            <span className="font-bold text-slate-900">{isPro ? request.clientName : (request.professionalName || 'Aguardando atribuição')}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 block font-semibold">Orçamento</span>
          <span className="font-extrabold text-emerald-700 text-sm">{request.budgetKz.toLocaleString('pt-AO')} Kz</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{request.scheduledDate}</span>
          <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">({request.urgency})</span>
        </div>

        <div className="flex items-center gap-2">
          
          {/* Chat Button */}
          <button
            onClick={handleOpenChat}
            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl transition-colors border border-slate-200"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>Chat</span>
          </button>

          {/* Pro Actions */}
          {isPro && request.status === 'pendente' && (
            <button
              onClick={() => updateRequestStatus(request.id, 'aceito')}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Aceitar</span>
            </button>
          )}

          {isPro && request.status === 'aceito' && (
            <button
              onClick={() => updateRequestStatus(request.id, 'em_progresso')}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar</span>
            </button>
          )}

          {(isPro || isClient) && request.status === 'em_progresso' && (
            <button
              onClick={() => updateRequestStatus(request.id, 'concluido')}
              className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Concluir</span>
            </button>
          )}

          {/* Client Review Button */}
          {isClient && request.status === 'concluido' && !request.hasReview && (
            <button
              onClick={handleOpenReview}
              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm shadow-amber-500/20"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>Avaliar</span>
            </button>
          )}

          {isClient && request.status === 'concluido' && request.hasReview && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
              ★ Avaliado
            </span>
          )}

        </div>
      </div>

    </div>
  );
};
