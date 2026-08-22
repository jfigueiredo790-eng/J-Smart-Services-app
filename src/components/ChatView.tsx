import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { compressImageFile } from '../utils/imageUtils';
import { UserAvatar } from './UserAvatar';
import { ChatConversation, RequestStatus } from '../types';
import { 
  Send, 
  Banknote, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  Phone, 
  ShieldCheck,
  Sparkles,
  Star,
  CheckCheck,
  Image as ImageIcon,
  Lock,
  Check,
  X,
  Maximize2,
  Clock,
  AlertTriangle,
  Search,
  MessageSquare,
  Filter,
  User as UserIcon,
  Briefcase,
  Calendar
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { 
    currentUser, 
    userRole,
    requests, 
    messages, 
    professionals,
    conversations,
    unreadChatMessagesCount,
    markConversationAsRead,
    sendChatMessage, 
    retryChatMessage,
    activeChatRequestId, 
    setActiveChatRequestId,
    updateRequestStatus,
    setIsReviewModalOpen,
    setReviewingRequestId,
    canChatInRequest,
    setActiveTab
  } = useApp();

  const [searchFilter, setSearchFilter] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'todas' | 'nao_lidas' | 'ativas' | 'concluidas'>('todas');
  const [inputMsg, setInputMsg] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState<number>(30000);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // Determinar a conversa ativa selecionada
  const activeConversation: ChatConversation | undefined = useMemo(() => {
    if (!activeChatRequestId) return undefined;
    return conversations.find(c => c.id === activeChatRequestId || c.requestId === activeChatRequestId);
  }, [conversations, activeChatRequestId]);

  const activeReq = useMemo(() => {
    if (!activeChatRequestId) return undefined;
    return requests.find(r => r.id === activeChatRequestId);
  }, [requests, activeChatRequestId]);

  // Mensagens filtradas estritamente para a conversa selecionada
  const activeMessages = useMemo(() => {
    if (!activeChatRequestId) return [];
    return messages.filter(m => m.requestId === activeChatRequestId || m.conversationId === activeChatRequestId);
  }, [messages, activeChatRequestId]);

  // Autorização de chat na conversa selecionada
  const chatAuth = useMemo(() => {
    if (!activeReq) {
      if (activeConversation) {
        return { allowed: true, reason: 'Comunicação autorizada.' };
      }
      return { allowed: false, reason: 'Nenhuma conversa selecionada.' };
    }
    return canChatInRequest(activeReq, currentUser.id, currentUser.role);
  }, [activeReq, activeConversation, currentUser, canChatInRequest]);

  // Marcar conversa como lida ao abrir ou ao receber novas mensagens
  useEffect(() => {
    if (activeChatRequestId) {
      markConversationAsRead(activeChatRequestId);
    }
  }, [activeChatRequestId, activeMessages.length]);

  // Scroll automático para a mensagem mais recente
  useEffect(() => {
    if (activeChatRequestId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatRequestId, activeMessages.length]);

  // Filtragem da lista de conversas
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      // Filtro de texto por nome do interlocutor, título do serviço ou última mensagem
      const otherName = currentUser.role === 'cliente' ? conv.professionalName : conv.clientName;
      const term = searchFilter.toLowerCase().trim();
      const matchesSearch = !term || 
        otherName.toLowerCase().includes(term) ||
        conv.serviceTitle.toLowerCase().includes(term) ||
        (conv.lastMessageText && conv.lastMessageText.toLowerCase().includes(term)) ||
        (conv.province && conv.province.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      // Filtro por tab
      if (activeFilterTab === 'nao_lidas') {
        return (conv.unreadCount || 0) > 0;
      }
      if (activeFilterTab === 'ativas') {
        return conv.status === 'pendente' || conv.status === 'aceito' || conv.status === 'em_progresso';
      }
      if (activeFilterTab === 'concluidas') {
        return conv.status === 'concluido';
      }

      return true;
    });
  }, [conversations, currentUser, searchFilter, activeFilterTab]);

  const handleSelectConversation = (convId: string) => {
    setActiveChatRequestId(convId);
    markConversationAsRead(convId);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChatRequestId || !chatAuth.allowed) return;
    sendChatMessage(activeChatRequestId, inputMsg.trim());
    setInputMsg('');
  };

  const handleSendImageFromGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatRequestId || !chatAuth.allowed) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.82);
      sendChatMessage(
        activeChatRequestId,
        '📷 Fotografia enviada da galeria',
        false,
        undefined,
        compressed
      );
    } catch (err) {
      console.error('Erro ao processar foto da galeria para o chat:', err);
      alert('Não foi possível enviar a foto da galeria. Tente novamente.');
    }
    if (chatImageInputRef.current) {
      chatImageInputRef.current.value = '';
    }
  };

  const handleSendQuote = () => {
    if (!activeChatRequestId || quoteAmount <= 0 || !chatAuth.allowed) return;
    sendChatMessage(
      activeChatRequestId, 
      `Proposta formal de orçamento para ${activeConversation?.serviceTitle || 'o serviço'}`, 
      true, 
      Number(quoteAmount)
    );
    setShowQuoteInput(false);
  };

  const formatMessageDate = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (isToday) return `Hoje às ${timeStr}`;
      if (isYesterday) return `Ontem às ${timeStr}`;

      return `${date.toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' })} • ${timeStr}`;
    } catch (e) {
      return '';
    }
  };

  const formatListTimestamp = (timestamp: string) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (isYesterday) {
        return 'Ontem';
      }

      return date.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  // Informações do interlocutor na conversa ativa
  const targetName = currentUser.role === 'cliente' 
    ? (activeConversation?.professionalName || activeReq?.professionalName || 'Profissional J Smart')
    : (activeConversation?.clientName || activeReq?.clientName || 'Cliente');

  const targetAvatar = currentUser.role === 'cliente'
    ? (activeConversation?.professionalAvatar || activeReq?.professionalAvatar || '')
    : (activeConversation?.clientAvatar || activeReq?.clientAvatar || '');

  const targetRole = currentUser.role === 'cliente' ? 'profissional' : 'cliente';

  const targetProObj = activeReq?.professionalId ? professionals.find(p => p.id === activeReq.professionalId) : null;
  const targetPhone = currentUser.role === 'cliente' 
    ? (targetProObj?.phone || activeConversation?.professionalPhone || activeReq?.clientPhone) 
    : (activeConversation?.clientPhone || activeReq?.clientPhone);

  const isAcceptedAndAllowed = activeConversation?.status === 'aceito' || 
    activeConversation?.status === 'em_progresso' || 
    activeConversation?.status === 'concluido' ||
    activeReq?.status === 'aceito' ||
    activeReq?.status === 'em_progresso' ||
    activeReq?.status === 'concluido';

  const isThreadOpenOnMobile = Boolean(activeChatRequestId);

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] sm:h-[680px] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      
      <div className="flex-1 flex overflow-hidden">
        
        {/* ========================================================================= */}
        {/* PAINEL ESQUERDO: LISTA DE CONVERSAS (INBOX / CAIXA DE MENSAGENS)           */}
        {/* ========================================================================= */}
        <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col bg-slate-900 border-r border-slate-800 transition-all ${
          isThreadOpenOnMobile ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Top Header da Caixa de Conversas */}
          <div className="p-3.5 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
                    <span>Conversas</span>
                    {conversations.length > 0 && (
                      <span className="text-[11px] font-semibold text-slate-400">({conversations.length})</span>
                    )}
                  </h2>
                  <p className="text-[10px] text-slate-400">Mensagens diretas cliente ↔ profissional</p>
                </div>
              </div>

              {unreadChatMessagesCount > 0 && (
                <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md animate-pulse">
                  {unreadChatMessagesCount} nova{unreadChatMessagesCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Campo de Pesquisa de Conversas */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Pesquisar por nome ou serviço..."
                className="w-full bg-slate-800/90 text-slate-200 placeholder-slate-500 text-xs pl-8 pr-7 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              {searchFilter && (
                <button 
                  onClick={() => setSearchFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtros rápidos de Conversas */}
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto scrollbar-none pb-0.5">
              <button
                onClick={() => setActiveFilterTab('todas')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  activeFilterTab === 'todas'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                Todas ({conversations.length})
              </button>
              <button
                onClick={() => setActiveFilterTab('nao_lidas')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 flex items-center gap-1 ${
                  activeFilterTab === 'nao_lidas'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                <span>Não lidas</span>
                {unreadChatMessagesCount > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                    activeFilterTab === 'nao_lidas' ? 'bg-slate-950 text-emerald-400' : 'bg-emerald-500 text-slate-950'
                  }`}>
                    {unreadChatMessagesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveFilterTab('ativas')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  activeFilterTab === 'ativas'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                Em Andamento
              </button>
              <button
                onClick={() => setActiveFilterTab('concluidas')}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors shrink-0 ${
                  activeFilterTab === 'concluidas'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750'
                }`}
              >
                Concluídas
              </button>
            </div>
          </div>

          {/* Lista de Itens de Conversa */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/70 bg-slate-900/50">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-300">Nenhuma conversa encontrada</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                  {searchFilter 
                    ? 'Nenhuma conversa corresponde ao termo pesquisado.'
                    : currentUser.role === 'cliente'
                      ? 'Solicite um serviço ou contacte um profissional para iniciar uma conversa.'
                      : 'Aguarde solicitações de clientes ou responda a pedidos atribuídos para conversar.'}
                </p>

                {currentUser.role === 'cliente' && !searchFilter && (
                  <button
                    onClick={() => setActiveTab('home')}
                    className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition-colors shadow-md"
                  >
                    Encontrar Profissionais
                  </button>
                )}
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = activeChatRequestId === conv.id || activeChatRequestId === conv.requestId;
                const otherPartyName = currentUser.role === 'cliente' ? conv.professionalName : conv.clientName;
                const otherPartyAvatar = currentUser.role === 'cliente' ? conv.professionalAvatar : conv.clientAvatar;
                const otherPartyRole = currentUser.role === 'cliente' ? 'profissional' : 'cliente';
                const hasUnread = (conv.unreadCount || 0) > 0;

                const isMeLastSender = conv.lastMessageSenderId === currentUser.id;

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-all relative ${
                      isSelected
                        ? 'bg-slate-800 text-white border-l-4 border-l-emerald-400 shadow-inner'
                        : hasUnread 
                          ? 'bg-slate-850/60 hover:bg-slate-800 text-slate-100'
                          : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    {/* Avatar do Interlocutor com Indicador Online/Status */}
                    <div className="relative shrink-0">
                      <UserAvatar 
                        src={otherPartyAvatar} 
                        name={otherPartyName} 
                        sizeClassName="w-11 h-11"
                        roundedClassName="rounded-xl"
                        role={otherPartyRole}
                        className={hasUnread ? 'ring-2 ring-emerald-500' : 'border border-slate-700'}
                      />
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
                      )}
                    </div>

                    {/* Conteúdo da Conversa */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <h4 className={`text-xs break-words leading-tight ${hasUnread ? 'font-black text-white' : isSelected ? 'font-bold text-white' : 'font-semibold text-slate-200'}`}>
                            {otherPartyName}
                          </h4>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </div>
                        <span className={`text-[10px] shrink-0 ${hasUnread ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                          {formatListTimestamp(conv.lastMessageTimestamp || conv.updatedAt || conv.createdAt || '')}
                        </span>
                      </div>

                      {/* Tag do Serviço & Província */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 break-words leading-tight">
                          {conv.serviceTitle}
                        </span>
                        {conv.province && (
                          <span className="text-[9px] text-slate-400 shrink-0">
                            • {conv.province}
                          </span>
                        )}
                      </div>

                      {/* Última Mensagem & Badge de Não Lidas */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-[11px] truncate flex items-center gap-1 ${
                          hasUnread 
                            ? 'font-bold text-slate-100' 
                            : 'text-slate-400'
                        }`}>
                          {isMeLastSender && (
                            <span className="text-[10px] text-slate-400 font-medium shrink-0">Você:</span>
                          )}
                          <span className="truncate">{conv.lastMessageText || 'Conversa iniciada'}</span>
                        </p>

                        {hasUnread && (
                          <span className="shrink-0 bg-emerald-500 text-slate-950 font-black text-[9px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-md">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

        </div>

        {/* ========================================================================= */}
        {/* PAINEL DIREITO: THREAD DE MENSAGENS DA CONVERSA ATIVA                      */}
        {/* ========================================================================= */}
        <div className={`flex-1 flex flex-col bg-slate-950 transition-all ${
          !isThreadOpenOnMobile ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Se nenhuma conversa estiver selecionada no Desktop */}
          {!activeChatRequestId || !activeConversation ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 mb-4 shadow-xl">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-base text-white">Central de Mensagens e Atendimento</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Selecione uma conversa à esquerda para visualizar o histórico de mensagens, detalhes do serviço e responder em tempo real.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md text-[11px] text-slate-400">
                <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Conversas 100% Seguras
                </span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" /> Envio de Orçamentos
                </span>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> Partilha de Fotos
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Header da Conversa Ativa */}
              <div className="bg-slate-900 text-white p-3 sm:p-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Botão de Voltar para a Lista no Mobile */}
                  <button 
                    onClick={() => setActiveChatRequestId(null)}
                    className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white md:hidden transition-colors"
                    title="Voltar à lista de conversas"
                  >
                    <ArrowLeft className="w-5 h-5 text-emerald-400" />
                  </button>

                  <UserAvatar 
                    src={targetAvatar} 
                    name={targetName} 
                    sizeClassName="w-10 h-10"
                    roundedClassName="rounded-xl"
                    role={targetRole}
                    className="border border-emerald-500 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5 break-words">
                      <span>{targetName}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    </h3>
                    <p className="text-[11px] text-slate-400 break-words leading-tight mt-0.5">
                      {activeConversation.serviceTitle} • <span className="text-emerald-400 font-medium">{activeConversation.province || 'Angola'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Botão Pro para Proposta de Orçamento */}
                  {currentUser.role === 'profissional' && chatAuth.allowed && (
                    <button
                      onClick={() => setShowQuoteInput(!showQuoteInput)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Orçamento Kz</span>
                    </button>
                  )}

                  {/* Botão de Chamada Telefónica Protegida */}
                  {isAcceptedAndAllowed && targetPhone ? (
                    <a
                      href={`tel:${targetPhone}`}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-400 border border-slate-700 flex items-center gap-1.5 transition-colors"
                      title={`Ligar para ${targetName}`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-xs font-bold hidden lg:inline">{targetPhone}</span>
                    </a>
                  ) : (
                    <div 
                      className="p-2 bg-slate-800/60 rounded-xl text-slate-400 border border-slate-700/60 flex items-center gap-1.5 cursor-not-allowed"
                      title="Contacto telefónico protegido até confirmação do pedido"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-semibold text-slate-400 hidden lg:inline">Contacto Protegido</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Proposta de Orçamento Rápida (Modal Dropdown para Profissionais) */}
              {showQuoteInput && (
                <div className="bg-emerald-950 border-b border-emerald-800 p-3 text-white animate-in slide-in-from-top duration-200 shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold">Enviar Proposta de Orçamento em Kwanza</span>
                    </div>
                    <button onClick={() => setShowQuoteInput(false)} className="text-xs text-slate-400 hover:text-white">Fechar</button>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <input 
                      type="number" 
                      value={quoteAmount} 
                      onChange={(e) => setQuoteAmount(Number(e.target.value))}
                      className="flex-1 bg-slate-900 border border-emerald-700 rounded-xl px-3 py-1.5 text-sm text-white font-bold focus:outline-none"
                      placeholder="Valor em Kz"
                    />
                    <button
                      onClick={handleSendQuote}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs px-4 py-1.5 rounded-xl transition-colors shadow-md"
                    >
                      Confirmar Proposta
                    </button>
                  </div>
                </div>
              )}

              {/* Barra de Status e Ações do Pedido/Conversa */}
              <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 text-white flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase shrink-0 ${
                    activeConversation.status === 'concluido' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : activeConversation.status === 'em_progresso'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : activeConversation.status === 'em_negociacao'
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {activeConversation.status === 'concluido' 
                      ? '✅ Concluído' 
                      : activeConversation.status === 'em_progresso' 
                        ? '⚡ Em Progresso' 
                        : activeConversation.status === 'em_negociacao'
                          ? '🟠 Em Negociação'
                          : activeConversation.status === 'aceito'
                            ? '👍 Aceite'
                            : '⏳ Em Conversa'}
                  </span>
                  <span className="text-slate-300 font-medium truncate text-[11px]">
                    {activeConversation.serviceTitle} {activeConversation.budgetKz ? `(${activeConversation.budgetKz.toLocaleString('pt-AO')} Kz)` : ''}
                  </span>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {activeReq && activeReq.status !== 'concluido' && (
                    <button
                      onClick={() => updateRequestStatus(activeReq.id, 'concluido')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Concluir</span>
                    </button>
                  )}

                  {activeReq && activeReq.status === 'concluido' && currentUser.role === 'cliente' && !activeReq.hasReview && (
                    <button
                      onClick={() => {
                        setReviewingRequestId(activeReq.id);
                        setIsReviewModalOpen(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm animate-pulse"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950" />
                      <span>Avaliar</span>
                    </button>
                  )}

                  {activeReq && activeReq.status === 'concluido' && currentUser.role === 'cliente' && activeReq.hasReview && (
                    <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                      ★ Avaliado
                    </span>
                  )}
                </div>
              </div>

              {/* Mensagens da Conversa */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 bg-slate-950">
                {activeMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 text-xs italic flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 mb-2">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-400">Nenhuma mensagem nesta conversa ainda.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Envie uma mensagem abaixo para iniciar o diálogo.</p>
                  </div>
                ) : (
                  activeMessages.map(msg => {
                    const isMe = msg.senderId === currentUser.id;

                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[88%] sm:max-w-[78%]">
                          {!isMe && (
                            <UserAvatar 
                              src={msg.senderAvatar} 
                              name={msg.senderName} 
                              sizeClassName="w-6 h-6" 
                              roundedClassName="rounded-full" 
                              className="mb-1 shrink-0" 
                            />
                          )}

                          <div className={`p-3 rounded-2xl shadow-md text-xs ${
                            isMe 
                              ? 'bg-emerald-600 text-white rounded-br-none' 
                              : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                          }`}>
                            <span className={`text-[10px] font-bold block mb-1 ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                              {msg.senderName}
                            </span>

                            {/* Foto anexada */}
                            {Boolean(msg.imageUrl) && (
                              <div 
                                onClick={() => setPreviewImage(msg.imageUrl!)}
                                className="my-1.5 rounded-xl overflow-hidden border border-slate-700/60 shadow-sm cursor-pointer group relative bg-slate-900"
                              >
                                <img src={msg.imageUrl!} alt="Anexo" className="w-full max-h-52 object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <Maximize2 className="w-3 h-3 text-emerald-400" /> Ampliar Imagem
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Pin de Localização */}
                            {msg.locationPin && (
                              <div className="my-1.5 p-2 bg-emerald-950 text-white rounded-xl border border-emerald-500/40 flex items-center gap-2 text-xs">
                                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <p className="font-bold text-[11px] text-emerald-300">Localização Partilhada</p>
                                  <p className="text-[10px] text-slate-300">{msg.locationPin.label}</p>
                                </div>
                              </div>
                            )}

                            {/* Card de Proposta de Orçamento */}
                            {msg.isQuickQuote ? (
                              <div className="bg-emerald-950 text-white p-3 rounded-xl border border-emerald-500/40 my-1">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                                  <Banknote className="w-4 h-4" />
                                  <span>Proposta de Orçamento</span>
                                </div>
                                <p className="text-[11px] text-slate-300 mt-1">{msg.text}</p>
                                <div className="mt-2 text-base font-black text-emerald-400">
                                  {msg.quotePriceKz?.toLocaleString('pt-AO')} Kz
                                </div>
                              </div>
                            ) : (
                              <p className="leading-relaxed whitespace-pre-line break-words">{msg.text}</p>
                            )}

                            {/* Rodapé da Mensagem (Hora e Status de Entrega) */}
                            <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                              <span>{formatMessageDate(msg.timestamp)}</span>
                              
                              {isMe && (
                                <>
                                  {msg.status === 'enviando' && (
                                    <span className="inline-flex items-center gap-0.5 text-amber-200 animate-pulse">
                                      <Clock className="w-2.5 h-2.5" /> Enviando...
                                    </span>
                                  )}
                                  {msg.status === 'enviada' && (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-200" title="Enviada">
                                      <Check className="w-3 h-3" />
                                    </span>
                                  )}
                                  {(msg.status === 'entregue' || !msg.status) && (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-200" title="Entregue">
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    </span>
                                  )}
                                  {msg.status === 'lida' && (
                                    <span className="inline-flex items-center gap-0.5 font-bold text-cyan-200" title="Lida pelo destinatário">
                                      <CheckCheck className="w-3.5 h-3.5 text-cyan-200" />
                                    </span>
                                  )}
                                  {msg.status === 'falhou' && (
                                    <button
                                      onClick={() => retryChatMessage(msg.id)}
                                      className="inline-flex items-center gap-1 bg-rose-700 hover:bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                                      title="Clique para tentar reenviar"
                                    >
                                      <AlertTriangle className="w-3 h-3 text-amber-300" />
                                      <span>Falhou (Reenviar)</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Bloqueio de Mensagens se não autorizado */}
              {!chatAuth.allowed ? (
                <div className="p-3.5 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <p className="font-bold text-amber-300 text-xs">Comunicação Bloqueada</p>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        {chatAuth.reason}
                      </p>
                    </div>
                  </div>

                  {currentUser.role === 'profissional' && (activeReq?.status === 'pendente' || activeReq?.status === 'novamente_disponivel') && (
                    <button
                      onClick={() => updateRequestStatus(activeReq.id, 'aceito')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
                    >
                      <Check className="w-4 h-4" />
                      <span>Aceitar Pedido Agora</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Input invisível para envio de imagens da galeria */}
                  <input 
                    type="file" 
                    ref={chatImageInputRef} 
                    accept="image/*" 
                    onChange={handleSendImageFromGallery} 
                    className="hidden" 
                    id="chat-gallery-input"
                  />

                  {/* Formulário Responsivo de Envio de Mensagem [Anexar] [Escreva a sua mensagem...] [Enviar] */}
                  <form 
                    onSubmit={handleSend} 
                    className="w-full p-2.5 sm:p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 sm:gap-2 shrink-0 box-border"
                  >
                    {/* Botão Anexar Foto da Galeria */}
                    <button
                      type="button"
                      onClick={() => chatImageInputRef.current?.click()}
                      title="Anexar Imagem da Galeria"
                      aria-label="Anexar Imagem"
                      className="h-10 w-10 sm:h-11 sm:w-11 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 rounded-xl transition-colors border border-slate-700 flex items-center justify-center shrink-0"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    </button>

                    {/* Campo de Texto da Mensagem */}
                    <input 
                      type="text"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Escreva a sua mensagem..."
                      className="flex-1 min-w-0 h-10 sm:h-11 text-xs sm:text-sm px-3 sm:px-3.5 rounded-xl bg-slate-800 text-slate-100 placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium box-border"
                    />

                    {/* Botão Enviar Mensagem - Sempre Visível */}
                    <button
                      type="submit"
                      disabled={!inputMsg.trim()}
                      title="Enviar Mensagem"
                      aria-label="Enviar Mensagem"
                      className="h-10 px-3 sm:h-11 sm:px-4 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-50 disabled:border disabled:border-slate-700 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <span className="hidden xs:inline sm:inline text-xs font-black">Enviar</span>
                      <Send className="w-4 h-4 shrink-0" />
                    </button>
                  </form>
                </>
              )}
            </>
          )}

        </div>

      </div>

      {/* Lightbox Modal para Ampliação de Imagens */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-full border border-slate-700 transition-colors"
              title="Fechar Imagem"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={previewImage} 
              alt="Visualização ampliada" 
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
            />
            <p className="text-slate-400 text-xs mt-3 font-medium">Clique em qualquer lugar para fechar</p>
          </div>
        </div>
      )}

    </div>
  );
};
