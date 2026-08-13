import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { compressImageFile } from '../utils/imageUtils';
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
  RefreshCw
} from 'lucide-react';

export const ChatView: React.FC = () => {
  const { 
    requests, 
    messages, 
    currentUser, 
    professionals,
    sendChatMessage, 
    retryChatMessage,
    activeChatRequestId, 
    setActiveChatRequestId,
    updateRequestStatus,
    setIsReviewModalOpen,
    setReviewingRequestId,
    canChatInRequest
  } = useApp();

  const [inputMsg, setInputMsg] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState<number>(30000);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatImageInputRef = useRef<HTMLInputElement>(null);

  // Filter requests that belong strictly to currentUser (either as client, assigned/matched professional, or admin)
  const myRequests = requests.filter(r => 
    r.clientId === currentUser.id || 
    r.professionalId === currentUser.id || 
    (r.matchedProIds && r.matchedProIds.includes(currentUser.id)) ||
    currentUser.role === 'admin'
  );
  const activeReq = requests.find(r => r.id === activeChatRequestId) || myRequests[0];

  const chatAuth = canChatInRequest(activeReq, currentUser.id, currentUser.role);

  const activeMessages = activeReq ? messages.filter(m => m.requestId === activeReq.id) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeReq || !chatAuth.allowed) return;
    sendChatMessage(activeReq.id, inputMsg.trim());
    setInputMsg('');
  };

  const handleSendImageFromGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeReq || !chatAuth.allowed) return;
    try {
      const compressed = await compressImageFile(file, 800, 0.82);
      sendChatMessage(
        activeReq.id,
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
    if (!activeReq || quoteAmount <= 0 || !chatAuth.allowed) return;
    sendChatMessage(
      activeReq.id, 
      `Proposta formal de orçamento para ${activeReq.title}`, 
      true, 
      Number(quoteAmount)
    );
    setShowQuoteInput(false);
  };

  const quickReplies = [
    'Qual é o endereço exacto em Luanda/Angola?',
    'Posso passar hoje no local às 14:00.',
    'Aceito o valor proposto.',
    'Tem fotos do problema para avaliar melhor?'
  ];

  if (!activeReq) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="font-bold text-sm">Nenhuma conversa activa com autorização de acesso.</p>
        <p className="text-xs mt-1">Faça um pedido de serviço como cliente ou aceite um pedido como profissional para aceder ao chat.</p>
      </div>
    );
  }

  // Determine phone contact of target party
  const targetProObj = activeReq.professionalId ? professionals.find(p => p.id === activeReq.professionalId) : null;
  const targetPhone = currentUser.role === 'cliente' ? (targetProObj?.phone || activeReq.clientPhone) : activeReq.clientPhone;
  const isAcceptedAndAllowed = activeReq.status === 'aceito' || activeReq.status === 'em_progresso' || activeReq.status === 'concluido';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[650px] bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* Header of Active Chat */}
      <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          {myRequests.length > 1 && (
            <button 
              onClick={() => setActiveChatRequestId(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <img 
            src={currentUser.role === 'cliente' ? (activeReq.professionalAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80') : (activeReq.clientAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80')} 
            alt="Avatar" 
            className="w-10 h-10 rounded-full object-cover border border-emerald-500"
          />

          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{currentUser.role === 'cliente' ? (activeReq.professionalName || 'Profissional J Smart') : activeReq.clientName}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
              {activeReq.title} • <span className="text-emerald-400">{activeReq.province}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'profissional' && chatAuth.allowed && (
            <button
              onClick={() => setShowQuoteInput(!showQuoteInput)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Enviar Orçamento</span>
            </button>
          )}

          {isAcceptedAndAllowed ? (
            <a
              href={`tel:${targetPhone}`}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-emerald-400 border border-slate-700 flex items-center gap-1.5"
              title="Ligar para o contacto autorizado"
            >
              <Phone className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:inline">{targetPhone}</span>
            </a>
          ) : (
            <div 
              className="p-2 bg-slate-800/80 rounded-xl text-slate-400 border border-slate-700/60 flex items-center gap-1.5 cursor-not-allowed"
              title="Telefone protegido até à aceitação do pedido"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">Telefone Protegido</span>
            </div>
          )}
        </div>
      </div>

      {/* Optional Pro Quote Tool Modal/Panel */}
      {showQuoteInput && (
        <div className="bg-emerald-950 border-b border-emerald-800 p-3 text-white animate-in slide-in-from-top duration-200">
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
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs px-4 py-1.5 rounded-xl transition-colors"
            >
              Confirmar Proposta
            </button>
          </div>
        </div>
      )}

      {/* Service Completion & Rating Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-2.5 text-white flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
            activeReq.status === 'concluido' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {activeReq.status === 'concluido' ? '✅ Concluído' : activeReq.status === 'em_progresso' ? '⚡ Em Progresso' : '⏳ Em Conversa'}
          </span>
          <span className="text-slate-300 font-medium truncate text-[11px]">
            {activeReq.title} ({activeReq.budgetKz.toLocaleString('pt-AO')} Kz)
          </span>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          {activeReq.status !== 'concluido' && (
            <button
              onClick={() => updateRequestStatus(activeReq.id, 'concluido')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold px-3 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Concluir Trabalho</span>
            </button>
          )}

          {activeReq.status === 'concluido' && currentUser.role === 'cliente' && !activeReq.hasReview && (
            <button
              onClick={() => {
                setReviewingRequestId(activeReq.id);
                setIsReviewModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[11px] transition-all flex items-center gap-1 shadow-sm animate-bounce"
            >
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              <span>Avaliar Profissional</span>
            </button>
          )}

          {activeReq.status === 'concluido' && currentUser.role === 'cliente' && activeReq.hasReview && (
            <span className="text-emerald-400 text-[11px] font-bold flex items-center gap-1">
              ★ Avaliação Enviada
            </span>
          )}
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-100/50">
        {activeMessages.length === 0 ? (
          <div className="text-center text-slate-400 py-8 text-xs italic">
            Nenhuma mensagem ainda neste pedido. Envie uma mensagem para iniciar o contacto.
          </div>
        ) : (
          activeMessages.map(msg => {
            const isMe = msg.senderId === currentUser.id;

            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-end gap-1.5 max-w-[85%] sm:max-w-[75%]">
                  {!isMe && (
                    <img src={msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} alt={msg.senderName} className="w-6 h-6 rounded-full object-cover mb-1" />
                  )}

                  <div className={`p-3.5 rounded-2xl shadow-sm text-xs ${
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none'
                  }`}>
                    <span className={`text-[10px] font-bold block mb-1 ${isMe ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {msg.senderName}
                    </span>

                    {/* Check if message has attached image or location */}
                    {Boolean(msg.imageUrl) && (
                      <div 
                        onClick={() => setPreviewImage(msg.imageUrl!)}
                        className="my-1.5 rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer group relative"
                      >
                        <img src={msg.imageUrl!} alt="Anexo de fotografia" className="w-full max-h-48 object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-slate-900/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                            <Maximize2 className="w-3 h-3 text-emerald-400" /> Ampliar Foto
                          </span>
                        </div>
                      </div>
                    )}

                    {msg.locationPin && (
                      <div className="my-1.5 p-2 bg-emerald-950 text-white rounded-xl border border-emerald-500/40 flex items-center gap-2 text-xs">
                        <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-bold text-[11px] text-emerald-300">Localização Compartilhada</p>
                          <p className="text-[10px] text-slate-300">{msg.locationPin.label}</p>
                        </div>
                      </div>
                    )}

                    {/* Check if it's a special Quick Quote card */}
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
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                    )}

                    <div className={`flex items-center justify-end gap-1.5 text-[9px] mt-1.5 ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
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
                              <span>Falhou (Tentar novamente)</span>
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

      {/* Lock Notice: Chat only available when authorized */}
      {!chatAuth.allowed ? (
        <div className="p-4 bg-slate-900 text-white border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-amber-300 text-xs">Chat de Mensagens Bloqueado</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                {chatAuth.reason}
              </p>
            </div>
          </div>

          {currentUser.role === 'profissional' && activeReq.status === 'pendente' && activeReq.professionalId === currentUser.id && (
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
          {/* Quick Replies bar */}
          <div className="bg-white border-t border-slate-200 p-2 overflow-x-auto whitespace-nowrap flex gap-1.5 text-xs">
            {quickReplies.map((reply, i) => (
              <button
                key={i}
                onClick={() => sendChatMessage(activeReq.id, reply)}
                className="bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 text-[11px] px-3 py-1 rounded-full border border-slate-200 flex-shrink-0 transition-colors"
              >
                + {reply}
              </button>
            ))}
          </div>

          {/* Hidden Gallery Input for Chat Photos */}
          <input 
            type="file" 
            ref={chatImageInputRef} 
            accept="image/*" 
            onChange={handleSendImageFromGallery} 
            className="hidden" 
          />

          {/* Input Form with Photo and GPS location attachment buttons */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={() => chatImageInputRef.current?.click()}
              title="Anexar Fotografia da Galeria"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200 flex items-center gap-1"
            >
              <ImageIcon className="w-4 h-4 text-emerald-600" />
            </button>

            <button
              type="button"
              onClick={() => {
                sendChatMessage(
                  activeReq.id, 
                  `📍 Localização GPS compartilhada: ${activeReq.address}, ${activeReq.province}`, 
                  false, 
                  undefined, 
                  undefined, 
                  { label: `${activeReq.address}, ${activeReq.province} • Angola` }
                );
              }}
              title="Partilhar Localização"
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200"
            >
              <MapPin className="w-4 h-4 text-emerald-600" />
            </button>

            <input 
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              className="flex-1 text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />

            <button
              type="submit"
              disabled={!inputMsg.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}

      {/* Lightbox Modal for Chat Photo Zoom */}
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
