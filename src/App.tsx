import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CategoryCard } from './components/CategoryCard';
import { ProfessionalCard } from './components/ProfessionalCard';
import { ProfessionalDetailModal } from './components/ProfessionalDetailModal';
import { NewRequestModal } from './components/NewRequestModal';
import { RequestCard } from './components/RequestCard';
import { ChatView } from './components/ChatView';
import { ReviewModal } from './components/ReviewModal';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import { ProDashboard } from './components/ProDashboard';
import { WalletView } from './components/WalletView';
import { SplashScreen } from './components/SplashScreen';
import { AuthModal } from './components/AuthModal';
import { SystemTestSuiteModal } from './components/SystemTestSuiteModal';
import { SubcategoryModal } from './components/SubcategoryModal';
import { RulesAndCodeModal } from './components/RulesAndCodeModal';
import { WorkFeedView } from './components/WorkFeedView';
import { SubscriptionExpiredModal } from './components/SubscriptionExpiredModal';
import { ANGOLA_PROVINCES, ProfessionalProfile, ServiceCategory } from './types';
import { getProPlanStatus } from './utils/planUtils';
import { 
  Search, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Star, 
  SlidersHorizontal, 
  Plus, 
  CheckCircle2, 
  Users, 
  Building2, 
  Wrench,
  Grid,
  Share2,
  Send,
  Gift,
  Wifi,
  WifiOff
} from 'lucide-react';

function MainContent() {
  const { 
    currentUser, 
    userRole, 
    activeTab, 
    setActiveTab, 
    categories, 
    professionals, 
    requests, 
    selectedCategory, 
    setSelectedCategory, 
    selectedProvince, 
    setSelectedProvince, 
    searchQuery, 
    setSearchQuery, 
    selectedPro, 
    setSelectedPro, 
    isNewRequestOpen, 
    setIsNewRequestOpen, 
    isReviewModalOpen, 
    setIsReviewModalOpen, 
    isMobileFrame,
    isLoggedIn,
    isOnline,
    setIsOnline,
    isTestSuiteOpen,
    setIsTestSuiteOpen,
    isRulesModalOpen,
    setIsRulesModalOpen,
    isSubExpiredModalOpen,
    setIsSubExpiredModalOpen,
    subExpiredCustomMessage
  } = useApp();

  const [showSplash, setShowSplash] = useState(false); // Can be toggled or set on first entry
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [preSelectedProForReq, setPreSelectedProForReq] = useState<ProfessionalProfile | null>(null);
  const [subModalCategory, setSubModalCategory] = useState<ServiceCategory | null>(null);

  // Auto-detect shared referral/invite registration link
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkParams = () => {
        const params = new URLSearchParams(window.location.search);
        const hash = window.location.hash || '';
        if (
          params.get('admin') === 'true' || 
          params.get('page') === 'admin' || 
          hash.includes('admin')
        ) {
          setActiveTab('admin');
        } else if (
          params.get('register') === 'true' || 
          params.get('mode') === 'register' || 
          params.get('ref') || 
          params.get('invite') || 
          params.get('reg') === 'true' || 
          hash.includes('register')
        ) {
          setShowAuthModal(true);
        }
      };
      checkParams();
      window.addEventListener('popstate', checkParams);
      return () => window.removeEventListener('popstate', checkParams);
    }
  }, []);

  // Filter professionals (Capítulo 7 - Sistema de Correspondência + Modo de Disponibilidade)
  const filteredPros = professionals
    .filter(pro => {
      // 1. Must NOT be blocked
      if (pro.blocked) return false;

      // 2. Modo de Disponibilidade (🟢 Disponível vs 🔴 Indisponível)
      // If pro is marked as 'ocupado' (Indisponível), hide from client search results
      if (pro.status === 'ocupado') return false;

      // 3. Plano Ativo ou Período Gratuito
      const planStatus = getProPlanStatus(pro);
      if (!planStatus.isActive) return false;

      // 4. Category match
      if (selectedCategory && !pro.categories.includes(selectedCategory)) {
        return false;
      }

      // 5. Province/Location match
      if (selectedProvince !== 'Todas' && pro.province !== selectedProvince) {
        return false;
      }

      // 6. Search query match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = pro.name.toLowerCase().includes(q);
        const matchBio = pro.bio.toLowerCase().includes(q);
        const matchCity = (pro.city || '').toLowerCase().includes(q);
        if (!matchName && !matchBio && !matchCity) return false;
      }

      return true;
    })
    // Sort by highest rating first (Bem avaliados)
    .sort((a, b) => b.rating - a.rating);

  // Filter requests for 'requests' tab
  const [requestFilter, setRequestFilter] = useState<'todos' | 'pendentes' | 'progresso' | 'concluidos'>('todos');

  const filteredRequests = requests.filter(req => {
    // If role is client, show client's requests. If pro, show pro's or unassigned pending requests.
    if (userRole === 'cliente') {
      if (req.clientId !== currentUser.id) return false;
    } else if (userRole === 'profissional') {
      if (req.professionalId !== currentUser.id && req.status !== 'pendente') return false;
    }

    if (requestFilter === 'pendentes') return req.status === 'pendente';
    if (requestFilter === 'progresso') return req.status === 'em_progresso' || req.status === 'aceito';
    if (requestFilter === 'concluidos') return req.status === 'concluido';
    return true;
  });

  if (showSplash) {
    return <SplashScreen onStart={(role) => { setShowSplash(false); if (role) useApp().switchRole(role); }} />;
  }

  const handleOpenNewRequest = (pro?: ProfessionalProfile) => {
    setPreSelectedProForReq(pro || null);
    setIsNewRequestOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-start py-0 sm:py-6 text-slate-900 font-sans select-none">
      
      {/* Container - Handles optional Mobile Frame container or full desktop layout */}
      <div className={`w-full bg-slate-50 transition-all duration-300 relative min-h-screen flex flex-col ${
        isMobileFrame 
          ? 'sm:max-w-[440px] sm:min-h-[860px] sm:max-h-[920px] sm:rounded-[40px] sm:border-[8px] sm:border-slate-800 sm:shadow-2xl overflow-hidden' 
          : 'max-w-7xl rounded-none sm:rounded-3xl shadow-xl overflow-hidden'
      }`}>
        
        {/* Persistent App Header */}
        <Header />

        {/* Offline Notification Banner */}
        {!isOnline && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-3 text-amber-200 flex items-center justify-between text-xs sticky top-[57px] z-30 backdrop-blur-md animate-fade-in shadow-lg">
            <div className="flex items-start gap-2.5 min-w-0">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-extrabold text-amber-300">Sem ligação à Internet.</p>
                <p className="text-[11px] text-amber-200/90 leading-tight">
                  Verifique os seus dados móveis ou a ligação Wi-Fi. (Consultas de perfil e histórico permanecem guardadas localmente).
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(true)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[10px] rounded-lg border border-amber-500/40 shrink-0 transition-colors"
            >
              Ligar
            </button>
          </div>
        )}

        {/* Dynamic Screen Views */}
        <main className="flex-1 p-4 pb-20 overflow-y-auto">
          
          {/* VIEW: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6">
              
              {/* Hero Banner with Search */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden border border-slate-800">
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                      🇦🇴 J Smart Services Angola
                    </span>
                    <button 
                      onClick={() => setIsRulesModalOpen(true)}
                      className="text-[11px] text-emerald-300 hover:text-white font-bold flex items-center gap-1 bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-full border border-slate-700 transition-colors"
                      title="Ver Regras e Código de Conduta"
                    >
                      <span>📜 Regras e Conduta</span>
                    </button>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-black mt-3 text-white leading-tight">
                    O que precisa de reparar em <span className="text-emerald-400">sua casa?</span>
                  </h1>

                  <p className="text-xs text-slate-300 mt-1 font-medium">
                    Conecte-se com eletricistas, canalizadores, técnicos de AC e pintores verificados.
                  </p>

                  {/* Search Bar Input */}
                  <div className="mt-4 relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar por serviço, nome ou cidade..."
                      className="w-full text-xs pl-10 pr-4 py-3 bg-white text-slate-900 font-semibold rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Quick Action Request Buttons */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenNewRequest()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-3 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Pedir Serviço Agora</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('feed')}
                      className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-extrabold text-xs py-3 px-4 rounded-2xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>📸 Feed de Trabalhos</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Login / Auth Required Banner if not logged in */}
              {!isLoggedIn && (
                <div className="bg-gradient-to-r from-slate-900 to-emerald-950 text-white rounded-3xl p-4 sm:p-5 shadow-lg border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl shadow-md font-black text-sm">
                      🔒
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-white">Início de Sessão — J Smart Services</h3>
                      <p className="text-xs text-emerald-300">Entre na sua conta para pedir serviços ou aceitar trabalhos</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Entrar / Iniciar Sessão</span>
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowAuthModal(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-all"
                    >
                      Registar
                    </button>
                  </div>
                </div>
              )}

              {/* Acquisition & Launch Strategy Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-md">
                      <Gift className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        Campanha de Lançamento em Angola
                      </h3>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        0% de taxa nos primeiros serviços + Selo de Verificação Grátis!
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Para fazer a plataforma crescer em Angola, convide profissionais da sua área e clientes de confiança por WhatsApp:
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      '🇦🇴 Olá! Registei-me na aplicação J Smart Services Angola. Se precisas de um canalizador, eletricista, técnico de AC ou pintor verificado com pagamento seguro por Multicaixa Express, experimenta grátis aqui: https://jsmartservices.ao'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Send className="w-4 h-4" />
                    <span>Convidar Clientes no WhatsApp</span>
                  </a>

                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      '👷‍♂️ Olá! Junta-te aos profissionais verificados no J Smart Services Angola! Recebe pedidos de trabalho de clientes diretos em Angola com 0% de comissão inicial. Regista-te já: https://jsmartservices.ao'
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Share2 className="w-4 h-4 text-emerald-400" />
                    <span>Convidar Profissionais</span>
                  </a>
                </div>
              </div>

              {/* Service Categories Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Grid className="w-4 h-4 text-emerald-600" />
                    Categorias de Serviços ({categories.length})
                  </h2>
                  <button 
                    onClick={() => setActiveTab('categories')} 
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    Ver Todas ({categories.length})
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {categories.slice(0, 8).map(cat => (
                    <CategoryCard 
                      key={cat.id} 
                      category={cat} 
                      isSelected={selectedCategory === cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSubModalCategory(cat);
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Featured Verified Professionals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Profissionais em Destaque
                  </h2>
                  <span className="text-xs text-slate-500 font-bold">
                    {filteredPros.length} disponíveis
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredPros.map(pro => (
                    <ProfessionalCard 
                      key={pro.id} 
                      pro={pro}
                      onOpenDetail={() => setSelectedPro(pro)}
                      onRequestService={() => handleOpenNewRequest(pro)}
                    />
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* VIEW: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Grid className="w-5 h-5 text-emerald-400" />
                    Todas as Categorias de Serviços
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Serviços organizados por setores para encontrar especialistas em Angola.
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1.5 rounded-full border border-emerald-500/30">
                  {categories.length} Especialidades
                </span>
              </div>

              {/* Grouped Category Sections */}
              {Array.from(new Set(categories.map(c => c.group || 'Outros'))).map(groupName => {
                const groupCats = categories.filter(c => (c.group || 'Outros') === groupName);
                if (groupCats.length === 0) return null;

                return (
                  <div key={groupName} className="space-y-3">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                        {groupName} ({groupCats.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {groupCats.map(cat => (
                        <CategoryCard
                          key={cat.id}
                          category={cat}
                          isSelected={selectedCategory === cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSubModalCategory(cat);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW: SEARCH & FILTER */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              
              {/* Filter controls */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por nome, serviço ou palavra-chave..."
                    className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Category Pill Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${
                      !selectedCategory ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Todas Categorias
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        if (selectedCategory === cat.id) {
                          setSelectedCategory(null);
                        } else {
                          setSelectedCategory(cat.id);
                          setSubModalCategory(cat);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                        selectedCategory === cat.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.items && cat.items.length > 0 && (
                        <span className="text-[10px] bg-black/20 px-1.5 py-0.2 rounded-full font-extrabold">
                          {cat.items.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Active category subcategories quick bar if category selected */}
                {selectedCategory && (
                  (() => {
                    const selCatObj = categories.find(c => c.id === selectedCategory);
                    if (!selCatObj?.items || selCatObj.items.length === 0) return null;
                    return (
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Subcategorias de {selCatObj.name}:
                          </p>
                          <button
                            onClick={() => setSubModalCategory(selCatObj)}
                            className="text-[11px] text-emerald-700 font-bold hover:underline"
                          >
                            Ver Lista Completa
                          </button>
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                          {selCatObj.items.map((item, idx) => {
                            const isSubActive = searchQuery.toLowerCase().includes(item.toLowerCase());
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  if (isSubActive) {
                                    setSearchQuery('');
                                  } else {
                                    setSearchQuery(item);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition-all whitespace-nowrap ${
                                  isSubActive
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Results list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Resultados ({filteredPros.length})</span>
                  <span>Província: {selectedProvince}</span>
                </div>

                {filteredPros.length === 0 ? (
                  <div className="bg-white p-8 text-center rounded-3xl border border-slate-200 text-slate-500 text-xs">
                    Nenhum profissional encontrado com os filtros selecionados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredPros.map(pro => (
                      <ProfessionalCard
                        key={pro.id}
                        pro={pro}
                        onOpenDetail={() => setSelectedPro(pro)}
                        onRequestService={() => handleOpenNewRequest(pro)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW: WORK FEED (📸 FEED DE TRABALHOS) */}
          {activeTab === 'feed' && (
            <WorkFeedView />
          )}

          {/* VIEW: REQUESTS (PEDIDOS) */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Gestão de Pedidos</h2>
                  <p className="text-xs text-slate-500">Acompanhe o estado dos seus serviços</p>
                </div>

                {userRole === 'cliente' && (
                  <button
                    onClick={() => handleOpenNewRequest()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Pedido</span>
                  </button>
                )}
              </div>

              {/* Request Status Filter Bar */}
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setRequestFilter('todos')}
                  className={`flex-1 py-2 rounded-xl transition-all ${requestFilter === 'todos' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Todos ({requests.length})
                </button>
                <button
                  onClick={() => setRequestFilter('pendentes')}
                  className={`flex-1 py-2 rounded-xl transition-all ${requestFilter === 'pendentes' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setRequestFilter('progresso')}
                  className={`flex-1 py-2 rounded-xl transition-all ${requestFilter === 'progresso' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Em Progresso
                </button>
                <button
                  onClick={() => setRequestFilter('concluidos')}
                  className={`flex-1 py-2 rounded-xl transition-all ${requestFilter === 'concluidos' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Concluídos
                </button>
              </div>

              {/* Requests List */}
              {filteredRequests.length === 0 ? (
                <div className="bg-white p-8 text-center rounded-3xl border border-slate-200 text-slate-500 text-xs">
                  Sem pedidos nesta categoria.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredRequests.map(req => (
                    <RequestCard key={req.id} request={req} />
                  ))}
                </div>
              )}

            </div>
          )}

          {/* VIEW: CHAT */}
          {activeTab === 'chat' && (
            <ChatView />
          )}

          {/* VIEW: PROFILE */}
          {activeTab === 'profile' && (
            <ProfileView />
          )}

          {/* VIEW: ADMIN DASHBOARD (PROTECTED ROUTE GUARD) */}
          {activeTab === 'admin' && (
            isLoggedIn && (currentUser.role === 'admin' || userRole === 'admin') ? (
              <AdminDashboard />
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl max-w-lg mx-auto my-8 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold shadow-inner border border-slate-200">
                  🛡️
                </div>
                <h2 className="text-xl font-black text-slate-900">Acesso Restrito ao Administrador</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Esta área é restrita e exclusiva para a equipa de administração da J Smart Services.
                  Para aceder, utilize a sua conta no ecrã de início de sessão da plataforma.
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={() => {
                      setActiveTab('home');
                      setShowAuthModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md"
                  >
                    Iniciar Sessão
                  </button>
                  <button
                    onClick={() => setActiveTab(isLoggedIn && userRole === 'profissional' ? 'pro_dashboard' : 'home')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all"
                  >
                    Voltar ao Início
                  </button>
                </div>
              </div>
            )
          )}

          {/* VIEW: PRO DASHBOARD */}
          {activeTab === 'pro_dashboard' && (
            <ProDashboard />
          )}

          {/* VIEW: WALLET */}
          {activeTab === 'wallet' && (
            <WalletView />
          )}

        </main>

        {/* Persistent Bottom Mobile Navigation */}
        <BottomNav />

        {/* Modals & Overlays */}
        {selectedPro && (
          <ProfessionalDetailModal 
            pro={selectedPro}
            onClose={() => setSelectedPro(null)}
            onRequestService={() => {
              const pro = selectedPro;
              setSelectedPro(null);
              handleOpenNewRequest(pro);
            }}
          />
        )}

        {isNewRequestOpen && (
          <NewRequestModal 
            onClose={() => setIsNewRequestOpen(false)}
            preSelectedPro={preSelectedProForReq}
            preSelectedCategoryId={selectedCategory}
          />
        )}

        {isReviewModalOpen && (
          <ReviewModal 
            onClose={() => setIsReviewModalOpen(false)}
          />
        )}

        {(!isLoggedIn || showAuthModal) && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
          />
        )}

        <SystemTestSuiteModal
          isOpen={isTestSuiteOpen}
          onClose={() => setIsTestSuiteOpen(false)}
        />

        <RulesAndCodeModal
          isOpen={isRulesModalOpen}
          onClose={() => setIsRulesModalOpen(false)}
        />

        <SubscriptionExpiredModal
          isOpen={isSubExpiredModalOpen}
          onClose={() => setIsSubExpiredModalOpen(false)}
          customMessage={subExpiredCustomMessage}
        />

        {subModalCategory && (
          <SubcategoryModal
            category={subModalCategory}
            onClose={() => setSubModalCategory(null)}
            onSelectSubcategory={(subItem) => {
              setSelectedCategory(subModalCategory.id);
              setSearchQuery(subItem);
              setActiveTab('search');
              setSubModalCategory(null);
            }}
            onRequestService={(subItem) => {
              const cat = subModalCategory;
              setSelectedCategory(cat.id);
              setSubModalCategory(null);
              setIsNewRequestOpen(true);
            }}
          />
        )}

      </div>

    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}
