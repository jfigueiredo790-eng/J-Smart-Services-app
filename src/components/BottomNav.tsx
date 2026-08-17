import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { NotificationModal } from './NotificationModal';
import { 
  Home, 
  Grid, 
  Search, 
  ClipboardList, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  Briefcase,
  Wallet,
  Bell,
  Camera
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    userRole, 
    requests, 
    unreadNotificationsCount,
    unreadChatMessagesCount 
  } = useApp();

  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);

  const pendingRequestsCount = requests.filter(r => r.status === 'pendente' || r.status === 'em_progresso').length;

  return (
    <>
      <nav className="bg-slate-900 border-t border-slate-800 text-slate-400 fixed bottom-0 left-0 right-0 z-40 max-w-7xl mx-auto shadow-2xl">
        <div className="flex justify-between items-center h-16 px-1 max-w-2xl mx-auto overflow-x-auto scrollbar-none">
          
          {/* 1. Home */}
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'home' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'home' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <Home className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'home' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Início</span>
          </button>

          {/* 1.5. Feed de Trabalhos */}
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'feed' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
            title="📸 Feed de Trabalhos"
          >
            {activeTab === 'feed' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <Camera className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'feed' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Feed</span>
          </button>

          {/* 2. Categorias */}
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'categories' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'categories' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <Grid className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'categories' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Categorias</span>
          </button>

          {/* 3. Procurar */}
          <button
            onClick={() => setActiveTab('search')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'search' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'search' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <Search className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'search' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Procurar</span>
          </button>

          {/* 4. Pedidos */}
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold relative transition-all ${
              activeTab === 'requests' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'requests' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <ClipboardList className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'requests' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Pedidos</span>
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1.5 right-2 bg-emerald-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          {/* 5. Notificações (NOVO - Conforme solicitado) */}
          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold relative transition-all text-slate-400 hover:text-slate-200"
            title="Abrir Central de Notificações"
          >
            <Bell className="w-5 h-5 mb-0.5 text-emerald-400 stroke-[2]" />
            <span className="text-emerald-400 font-extrabold">Notificações</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-2 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce border border-slate-900 shadow-md">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* 6. Carteira */}
          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'wallet' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'wallet' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <Wallet className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'wallet' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Carteira</span>
          </button>

          {/* 7. Chat */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'chat' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'chat' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <MessageSquare className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'chat' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Chat</span>
            {unreadChatMessagesCount > 0 && (
              <span className="absolute top-1 right-2 bg-emerald-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900 shadow-md">
                {unreadChatMessagesCount > 9 ? '9+' : unreadChatMessagesCount}
              </span>
            )}
          </button>

          {/* 8. Pro Dashboard option if Professional */}
          {userRole === 'profissional' && (
            <button
              onClick={() => setActiveTab('pro_dashboard')}
              className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
                activeTab === 'pro_dashboard' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
              }`}
            >
              {activeTab === 'pro_dashboard' && (
                <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
              )}
              <Briefcase className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'pro_dashboard' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
              <span>Painel</span>
            </button>
          )}

          {/* 9. Admin Dashboard option if Admin */}
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
                activeTab === 'admin' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
              }`}
            >
              {activeTab === 'admin' && (
                <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
              )}
              <ShieldCheck className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'admin' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
              <span>Admin</span>
            </button>
          )}

          {/* 10. Profile */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center justify-center flex-1 min-w-[52px] h-full text-[10px] sm:text-[11px] font-bold transition-all relative ${
              activeTab === 'profile' ? 'text-emerald-400 font-extrabold' : 'hover:text-slate-200'
            }`}
          >
            {activeTab === 'profile' && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-400 rounded-b-full shadow-lg shadow-emerald-400/50 animate-fade-in" />
            )}
            <User className={`w-5 h-5 mb-0.5 transition-transform ${activeTab === 'profile' ? 'text-emerald-400 stroke-[2.5] scale-110' : ''}`} />
            <span>Perfil</span>
          </button>

        </div>
      </nav>

      {/* Janela Modal de Notificações ao clicar no ícone */}
      <NotificationModal 
        isOpen={isNotifModalOpen} 
        onClose={() => setIsNotifModalOpen(false)} 
      />
    </>
  );
};
