import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { isNotificationForUser } from '../utils/notificationUtils';
import { 
  Bell, 
  X, 
  CheckCheck, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Wallet, 
  Star,
  ChevronRight,
  Filter
} from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, onClose }) => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    currentUser,
    setActiveTab,
    setActiveChatRequestId
  } = useApp();

  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas');

  if (!isOpen) return null;

  // Filter notifications relevant strictly to current user role and active context
  const userNotifs = notifications.filter(n => isNotificationForUser(n, currentUser));

  const filteredNotifs = filter === 'nao_lidas' 
    ? userNotifs.filter(n => !n.read) 
    : userNotifs;

  const handleMarkAllRead = () => {
    userNotifs.forEach(n => {
      if (!n.read) markNotificationAsRead(n.id);
    });
  };

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markNotificationAsRead(n.id);
    onClose();

    if (n.type === 'publicacao_reacao' || n.postId) {
      setActiveTab('feed');
    } else if (n.requestId) {
      if (n.type === 'mensagem_recebida' || n.type === 'proposta_recebida') {
        setActiveChatRequestId(n.requestId);
        setActiveTab('chat');
      } else {
        setActiveTab('requests');
      }
    } else if (n.type === 'pagamento_confirmado') {
      setActiveTab('wallet');
    }
  };

  const getNotificationIcon = (type?: string, reaction?: string) => {
    if (type === 'publicacao_reacao') {
      return (
        <span className="text-base leading-none select-none" title={`Reação: ${reaction || '❤️'}`}>
          {reaction || '❤️'}
        </span>
      );
    }
    switch (type) {
      case 'mensagem_recebida':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'proposta_recebida':
      case 'pedido_aceito':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'pagamento_confirmado':
        return <Wallet className="w-4 h-4 text-amber-500" />;
      case 'avaliacao_recebida':
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Bell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <span>Notificações</span>
                {unreadNotificationsCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    {unreadNotificationsCount} novas
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Acompanhe actualizações de pedidos, mensagens e pagamentos</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls & Mark All Read */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilter('todas')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === 'todas' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({userNotifs.length})
            </button>
            <button
              onClick={() => setFilter('nao_lidas')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                filter === 'nao_lidas' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Não Lidas ({unreadNotificationsCount})
            </button>
          </div>

          {unreadNotificationsCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-[11px] font-extrabold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar lidas</span>
            </button>
          )}
        </div>

        {/* Notification Cards List */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredNotifs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 stroke-1" />
              </div>
              <p className="text-sm font-bold text-slate-700">Sem notificações {filter === 'nao_lidas' ? 'não lidas' : 'no momento'}</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Quando receber propostas, mensagens ou actualizações de serviços em Angola, elas aparecerão aqui!
              </p>
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                  !n.read 
                    ? 'bg-emerald-50/70 border-emerald-300 shadow-sm hover:bg-emerald-100/80' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                {!n.read && (
                  <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100"></span>
                )}

                <div className={`p-2.5 rounded-xl shrink-0 ${
                  !n.read ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {getNotificationIcon(n.type, n.reaction)}
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs font-bold truncate ${!n.read ? 'text-slate-900 font-extrabold' : 'text-slate-700'}`}>
                      {n.title}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString('pt-AO')} às {new Date(n.createdAt).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {(n.type === 'publicacao_reacao' || n.postId) && (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <span>Ver no Feed</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}

                    {n.requestId && (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        <span>Ver detalhes</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center shrink-0">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all shadow-sm"
          >
            Fechar Notificações
          </button>
        </div>
      </div>
    </div>
  );
};
