import React, { useState } from 'react';
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
  CheckCircle2, 
  XCircle, 
  Play,
  CheckCheck,
  RotateCcw,
  ShieldCheck,
  Lock,
  Phone,
  AlertTriangle,
  UserCheck,
  Sparkles
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
    setReviewingRequestId,
    canChatInRequest
  } = useApp();

  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [isConfirmingRelease, setIsConfirmingRelease] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isAdmin = currentUser.role === 'admin';
  const isClient = currentUser.role === 'cliente';
  const isPro = currentUser.role === 'profissional';

  const isAssignedPro = isPro && request.professionalId === currentUser.id;
  const isClientOwner = isClient && request.clientId === currentUser.id;
  const isOtherPro = isPro && !!request.professionalId && request.professionalId !== currentUser.id;

  const matchedPro = professionals.find(p => p.id === request.professionalId);
  const matchedClient = allUsers.find(u => u.id === request.clientId);

  const targetAvatar = isPro 
    ? (matchedClient?.avatar || (matchedClient as any)?.photoURL || request.clientAvatar)
    : (matchedPro?.avatar || (matchedPro as any)?.photoURL || request.professionalAvatar);

  // Status badge visual renderer
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-amber-200 shadow-xs">
            <Clock className="w-3 h-3 text-amber-700" />
            <span>Pendente</span>
          </span>
        );
      case 'novamente_disponivel':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-1 rounded-full border border-amber-500 shadow-sm animate-pulse">
            <RotateCcw className="w-3 h-3 text-slate-950" />
            <span>Novamente Disponível</span>
          </span>
        );
      case 'aceito':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-blue-200 shadow-xs">
            <UserCheck className="w-3 h-3 text-blue-700" />
            <span>Aceite</span>
          </span>
        );
      case 'em_progresso':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 shadow-xs animate-pulse">
            <Play className="w-3 h-3 text-emerald-700" />
            <span>Em Progresso</span>
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-slate-300 shadow-xs">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            <span>Concluído</span>
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 text-[11px] font-extrabold px-2.5 py-1 rounded-full border border-rose-200 shadow-xs">
            <XCircle className="w-3 h-3 text-rose-700" />
            <span>Cancelado</span>
          </span>
        );
      default:
        return null;
    }
  };

  const handleOpenChat = () => {
    const check = canChatInRequest(request, currentUser.id, currentUser.role);
    if (!check.allowed && !isAdmin) {
      alert(check.reason);
      return;
    }
    setActiveChatRequestId(request.id);
    setActiveTab('chat');
  };

  const handleOpenReview = () => {
    setReviewingRequestId(request.id);
    setIsReviewModalOpen(true);
  };

  const handleAcceptRequest = () => {
    updateRequestStatus(request.id, 'aceito');
  };

  const handleReleaseRequest = () => {
    updateRequestStatus(request.id, 'novamente_disponivel', cancelReason || 'O profissional cancelou o atendimento.');
    setIsConfirmingRelease(false);
    setCancelReason('');
  };

  const handleCancelRequestByClient = () => {
    updateRequestStatus(request.id, 'cancelado', cancelReason || 'Cancelado pelo cliente.');
    setIsConfirmingCancel(false);
    setCancelReason('');
  };

  // Privacy Rule: Private contact details (Phone/WhatsApp) are hidden until accepted
  const isPrivateContactVisible = isAdmin || isAssignedPro || (isClient && isClientOwner && !!request.professionalId);
  const clientPhone = matchedClient?.phone || request.clientPhone || '';
  const proPhone = matchedPro?.phone || '';

  return (
    <div id={`request-card-${request.id}`} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-4">
      
      {/* Top Banner for "Novamente Disponível" */}
      {request.status === 'novamente_disponivel' && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-950">
          <RotateCcw className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-extrabold block text-amber-900">Pedido Novamente Disponível</strong>
            <p className="text-[11px] text-amber-800 leading-snug mt-0.5">
              O atendimento anterior foi cancelado. Este pedido voltou a ficar livre para os profissionais qualificados aceitarem de imediato.
            </p>
            {request.cancellationReason && (
              <span className="text-[10px] text-amber-700/80 italic mt-1 block">
                Motivo: {request.cancellationReason}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header: Category Badge, Title, Date and Status */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
              {request.categoryName || 'Serviço'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Criado em {new Date(request.createdAt).toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h3 className="font-black text-slate-900 text-base leading-snug break-words">
            {request.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
            <span className="flex items-center gap-1 font-semibold text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{request.province}{request.address ? ` • ${request.address}` : ''}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Previsão: {request.scheduledDate || 'A combinar'}</span>
              {request.urgency && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded ml-1">
                  {request.urgency}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {getStatusBadge(request.status)}
        </div>
      </div>

      {/* Description */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-xs text-slate-700 leading-relaxed break-words whitespace-pre-line">
        <p className="font-medium">{request.description}</p>
      </div>

      {/* Client & Assigned Pro Information Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        
        {/* Client Box */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar 
              src={matchedClient?.avatar || (matchedClient as any)?.photoURL || request.clientAvatar} 
              name={request.clientName || 'Cliente'} 
              sizeClassName="w-9 h-9"
              roundedClassName="rounded-xl"
              role="cliente"
              className="border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Cliente Solicitante</span>
              <span className="font-extrabold text-slate-900 text-xs truncate block">{request.clientName || 'Cliente'}</span>
              {isPrivateContactVisible && clientPhone && (
                <a 
                  href={`tel:${clientPhone}`} 
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-3 h-3" />
                  <span>{clientPhone}</span>
                </a>
              )}
              {!isPrivateContactVisible && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>Contacto privado</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Professional Box */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <UserAvatar 
              src={matchedPro?.avatar || (matchedPro as any)?.photoURL || request.professionalAvatar} 
              name={request.professionalName || 'A aguardar'} 
              sizeClassName="w-9 h-9"
              roundedClassName="rounded-xl"
              role="profissional"
              className="border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Profissional Atribuído</span>
              <span className="font-extrabold text-slate-900 text-xs truncate block">
                {request.professionalName || (request.status === 'pendente' || request.status === 'novamente_disponivel' ? 'A aguardar aceitação' : 'Não atribuído')}
              </span>
              {isPrivateContactVisible && proPhone && (
                <a 
                  href={`tel:${proPhone}`} 
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 mt-0.5"
                >
                  <Phone className="w-3 h-3" />
                  <span>{proPhone}</span>
                </a>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Orçamento</span>
            <span className="font-black text-emerald-700 text-sm">{request.budgetKz.toLocaleString('pt-AO')} Kz</span>
          </div>
        </div>
      </div>

      {/* Confirm Cancellation Dialog Box */}
      {isConfirmingCancel && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2 text-xs text-rose-900 font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>Tem certeza de que pretende cancelar este pedido?</span>
          </div>
          <input
            type="text"
            placeholder="Indique o motivo do cancelamento (opcional)..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full bg-white border border-rose-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsConfirmingCancel(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleCancelRequestByClient}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors shadow-sm"
            >
              Confirmar Cancelamento
            </button>
          </div>
        </div>
      )}

      {/* Confirm Release (Desistência pelo profissional) Dialog Box */}
      {isConfirmingRelease && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2 text-xs text-amber-950 font-bold">
            <RotateCcw className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span>Cancelar atendimento e disponibilizar pedido?</span>
              <p className="text-[11px] font-normal text-amber-800 mt-0.5">
                O pedido voltará para o estado <strong>Novamente Disponível</strong> para que outro profissional qualificado possa atender o cliente.
              </p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Motivo da desistência/cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setIsConfirmingRelease(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleReleaseRequest}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-colors shadow-sm"
            >
              Confirmar Desistência
            </button>
          </div>
        </div>
      )}

      {/* Card Action Controls Bar */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Status Explanatory Indicators */}
        <div className="text-xs text-slate-500">
          {request.status === 'pendente' && (
            <span className="text-amber-800 font-semibold flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Aguardando aceitação de profissional</span>
            </span>
          )}
          {request.status === 'novamente_disponivel' && (
            <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Livre para nova aceitação</span>
            </span>
          )}
          {request.status === 'aceito' && isAssignedPro && (
            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Aceite por si — Em atendimento</span>
            </span>
          )}
          {request.status === 'aceito' && isOtherPro && (
            <span className="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              <span>Atribuído a outro profissional</span>
            </span>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Chat Button: Visible when allowed or for admin */}
          {(isAdmin || isAssignedPro || (isClient && isClientOwner && !!request.professionalId)) && request.status !== 'cancelado' && (
            <button
              id={`chat-btn-${request.id}`}
              onClick={handleOpenChat}
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors border border-emerald-200"
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>Chat Privado</span>
            </button>
          )}

          {/* Professional Action: Accept Request (From Pendente or Novamente Disponivel) */}
          {isPro && (request.status === 'pendente' || request.status === 'novamente_disponivel') && (
            <button
              id={`accept-btn-${request.id}`}
              onClick={handleAcceptRequest}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aceitar Pedido</span>
            </button>
          )}

          {/* Professional Action: Start Progress */}
          {isAssignedPro && request.status === 'aceito' && (
            <button
              id={`start-btn-${request.id}`}
              onClick={() => updateRequestStatus(request.id, 'em_progresso')}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Iniciar Trabalho</span>
            </button>
          )}

          {/* Professional Action: Desistir / Cancelar Atendimento (Passa a Novamente Disponível) */}
          {isAssignedPro && (request.status === 'aceito' || request.status === 'em_progresso') && !isConfirmingRelease && (
            <button
              id={`release-btn-${request.id}`}
              onClick={() => setIsConfirmingRelease(true)}
              className="flex items-center gap-1 text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors"
              title="Desistir deste pedido para que outro profissional possa atender"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Desistir</span>
            </button>
          )}

          {/* Complete Job Action: Client or Assigned Pro in Progress */}
          {(isAssignedPro || (isClient && isClientOwner) || isAdmin) && (request.status === 'em_progresso' || request.status === 'aceito') && (
            <button
              id={`complete-btn-${request.id}`}
              onClick={() => updateRequestStatus(request.id, 'concluido')}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Concluir</span>
            </button>
          )}

          {/* Client Action: Cancel Own Request */}
          {isClient && isClientOwner && (request.status === 'pendente' || request.status === 'novamente_disponivel' || request.status === 'aceito') && !isConfirmingCancel && (
            <button
              id={`cancel-btn-${request.id}`}
              onClick={() => setIsConfirmingCancel(true)}
              className="flex items-center gap-1 text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 font-bold text-xs px-3 py-2 rounded-xl transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelar Pedido</span>
            </button>
          )}

          {/* Client Review Button on Completed */}
          {isClient && isClientOwner && request.status === 'concluido' && !request.hasReview && (
            <button
              id={`review-btn-${request.id}`}
              onClick={handleOpenReview}
              className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm shadow-amber-400/20"
            >
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              <span>Avaliar Atendimento</span>
            </button>
          )}

          {/* Client Review Badge if already reviewed */}
          {isClient && isClientOwner && request.status === 'concluido' && request.hasReview && (
            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>Avaliado</span>
            </span>
          )}

          {/* Admin Moderation Controls Dropdown / Direct Change */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Alterar estado do pedido (Administrador)"
                value={request.status}
                onChange={(e) => updateRequestStatus(request.id, e.target.value as RequestStatus)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-2.5 py-1.5 rounded-xl border border-slate-300 focus:outline-none"
              >
                <option value="pendente">⏳ Pendente</option>
                <option value="novamente_disponivel">🟡 Novamente Disponível</option>
                <option value="aceito">👍 Aceito</option>
                <option value="em_progresso">⚡ Em Progresso</option>
                <option value="concluido">✅ Concluído</option>
                <option value="cancelado">❌ Cancelado</option>
              </select>
            </div>
          )}

        </div>
      </div>

    </div>
  );
};
