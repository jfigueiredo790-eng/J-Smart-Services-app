import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { WorkFeedPost, ProfessionalProfile } from '../types';
import { getProPlanStatus, validateProAction } from '../utils/planUtils';
import { rankWorkFeedPosts, formatPostDateFriendly } from '../utils/feedAlgorithm';
import { 
  Heart, 
  MessageSquare, 
  User as UserIcon, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Filter, 
  ShieldCheck, 
  Lock,
  Trash2,
  Search,
  Upload,
  Calendar,
  Layers
} from 'lucide-react';

export const WorkFeedView: React.FC = () => {
  const { 
    currentUser, 
    userRole, 
    workFeedPosts, 
    addWorkFeedPost, 
    likeWorkFeedPost, 
    deleteWorkFeedPost,
    categories, 
    professionals, 
    setSelectedPro, 
    triggerBlockedActionPrompt
  } = useApp();

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  
  // New Post Form State
  const [newDesc, setNewDesc] = useState('');
  const [newCategoryName, setNewCategoryName] = useState(categories[0]?.name || 'Geral');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const currentUserPlan = getProPlanStatus(currentUser);
  const isPro = userRole === 'profissional' || currentUser.role === 'profissional';

  // Algoritmo de Organização do Feed: Recência + Relevância + Interações + Qualidade
  // Preserva integralmente as publicações reais anteriores com a sua data original.
  const rankedPosts = useMemo(() => {
    // 1. Aplicar algoritmo de pontuação de 7 critérios
    const ranked = rankWorkFeedPosts(
      workFeedPosts,
      currentUser,
      professionals,
      selectedCatFilter
    );

    // 2. Filtro de pesquisa opcional por texto
    if (!searchTerm.trim()) return ranked;
    const q = searchTerm.toLowerCase();
    return ranked.filter(post => 
      post.description.toLowerCase().includes(q) ||
      post.professionalName.toLowerCase().includes(q) ||
      post.categoryName.toLowerCase().includes(q)
    );
  }, [workFeedPosts, currentUser, professionals, selectedCatFilter, searchTerm]);

  const handleOpenPublishModal = () => {
    if (!isPro) {
      alert('Apenas profissionais reais registados na J Smart Services podem publicar trabalhos no Feed.');
      return;
    }

    const validation = validateProAction(currentUser);
    if (!validation.allowed) {
      if (validation.reason === 'blocked') {
        alert('Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.');
        return;
      }
      triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.');
      return;
    }

    setIsPublishModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomFilePreview(result);
        setNewMediaUrl(result);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewPost = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDesc.trim()) {
      alert('Por favor descreva o serviço real efetuado.');
      return;
    }

    const finalMedia = newMediaUrl.trim() || customFilePreview;
    if (!finalMedia) {
      alert('Por favor carregue uma fotografia ou vídeo real do serviço concluído.');
      return;
    }

    const matchedPro = professionals.find(p => p.id === currentUser.id) || (currentUser as ProfessionalProfile);

    const res = addWorkFeedPost({
      professionalId: currentUser.id,
      professionalName: currentUser.name,
      professionalAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      professionalVerified: currentUser.verified || false,
      professionalCategories: matchedPro.categories || [],
      mediaUrl: finalMedia,
      mediaType: newMediaType,
      description: newDesc.trim(),
      categoryName: newCategoryName
    });

    if (res.success) {
      setIsPublishModalOpen(false);
      setNewDesc('');
      setNewMediaUrl('');
      setCustomFilePreview(null);
    } else if (res.error) {
      triggerBlockedActionPrompt(res.error);
    }
  };

  const handleContactProFromPost = (post: WorkFeedPost) => {
    if (currentUser.id === post.professionalId) {
      alert('Esta publicação pertence ao seu próprio perfil profissional.');
      return;
    }

    // Encontrar os dados do profissional
    const pro = professionals.find(p => p.id === post.professionalId);
    if (!pro) {
      alert('Perfil do profissional não encontrado.');
      return;
    }

    const proPlan = getProPlanStatus(pro);

    if (!proPlan.isActive) {
      alert('O profissional encontra-se com a subscrição temporariamente inativa. Os seus dados e trabalhos anteriores estão preservados, mas não é possível iniciar novos contactos até à renovação da subscrição.');
      setSelectedPro(pro);
      return;
    }

    // Abrir modal de detalhes do profissional para solicitar serviço ou orçamento
    setSelectedPro(pro);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 pb-24" id="work-feed-container">
      {/* Banner Principal do Feed Existente */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-emerald-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-500/30 mb-2 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Publicações Reais de Profissionais</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>📸 Feed de Trabalhos Concluídos</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Descubra serviços e projetos reais executados pelos profissionais qualificados da J Smart Services em Angola.
            </p>
          </div>

          {/* Botão de Ação: Publicar Trabalho (Restrito a Profissionais Reais com Plano Ativo) */}
          {isPro ? (
            <button
              id="btn-publish-work-post"
              onClick={handleOpenPublishModal}
              className={`px-5 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 shadow-lg shrink-0 ${
                currentUserPlan.isActive
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 active:scale-95'
                  : 'bg-amber-500/90 hover:bg-amber-500 text-slate-950 shadow-amber-500/30'
              }`}
            >
              {currentUserPlan.isActive ? (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Publicar Novo Trabalho</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[3]" />
                  <span>Publicação Bloqueada (Escolher Plano)</span>
                </>
              )}
            </button>
          ) : (
            <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-xs text-emerald-200 flex items-center gap-2 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Garantia de Qualidade J Smart Services</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="space-y-3">
        {/* Barra de Pesquisa */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-feed-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar trabalhos por descrição, profissional ou serviço..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pílulas de Filtro por Categoria */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-emerald-600" /> Categoria:
          </span>
          <button
            onClick={() => setSelectedCatFilter('Todas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedCatFilter === 'Todas'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas as Categorias
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCatFilter(cat.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                selectedCatFilter === cat.name
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Publicações Reais Ordenadas pelo Algoritmo */}
      <div className="space-y-6">
        {rankedPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 text-center space-y-4 shadow-sm" id="empty-feed-card">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto border border-emerald-100">
              <Layers className="w-8 h-8" />
            </div>
            
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                Ainda não existem publicações no Feed
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                O Feed apresenta exclusivamente publicações reais criadas por profissionais registados após a realização de serviços.
              </p>
            </div>

            {isPro && (
              <div className="pt-2">
                <button
                  onClick={handleOpenPublishModal}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publicar o Primeiro Trabalho</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          rankedPosts.map(post => {
            const isLiked = post.likedBy?.includes(currentUser.id) || false;
            const pro = professionals.find(p => p.id === post.professionalId);
            const proPlan = pro ? getProPlanStatus(pro) : null;
            const isInactivePro = proPlan && !proPlan.isActive;

            return (
              <article 
                key={post.id}
                id={`work-feed-post-${post.id}`}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Cabeçalho do Autor Real */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <div 
                    onClick={() => {
                      if (pro) setSelectedPro(pro);
                    }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={post.professionalAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'}
                      alt={post.professionalName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 group-hover:border-emerald-500 transition-colors"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                          {post.professionalName}
                        </h3>
                        {post.professionalVerified && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" title="Profissional Verificado" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {post.categoryName}
                        </span>

                        {isInactivePro ? (
                          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full" title="Subscrição inativa — dados preservados">
                            ⚪ Subscrição inativa
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatPostDateFriendly(post.createdAt)}
                          </span>
                        )}

                        {pro?.province && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {pro.province}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Excluir (Autor ou Administrador) */}
                  {(currentUser.id === post.professionalId || currentUser.role === 'admin') && (
                    <button
                      onClick={() => {
                        if (window.confirm('Tem a certeza de que pretende eliminar esta publicação do Feed?')) {
                          deleteWorkFeedPost(post.id);
                        }
                      }}
                      className="p-2 text-slate-300 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                      title="Eliminar Publicação"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Secção de Mídia: Fotografia ou Vídeo Real */}
                <div className="relative bg-slate-950 max-h-[500px] flex items-center justify-center overflow-hidden">
                  {post.mediaType === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="w-full max-h-[500px] object-contain"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.description}
                      className="w-full max-h-[500px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Descrição e Barra de Ações */}
                <div className="p-4 space-y-3">
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {post.description}
                  </p>

                  {/* Barra de Rodapé: Gostos + Perfil + Contacto */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Botão de Gostos */}
                    <button
                      id={`btn-like-${post.id}`}
                      onClick={() => likeWorkFeedPost(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-600' : ''}`} />
                      <span>{post.likesCount || 0} {post.likesCount === 1 ? 'Gosto' : 'Gostos'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Ver Perfil do Profissional */}
                      <button
                        onClick={() => {
                          if (pro) setSelectedPro(pro);
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>

                      {/* Contactar Profissional */}
                      <button
                        onClick={() => handleContactProFromPost(post)}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1 ${
                          isInactivePro
                            ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 active:scale-95'
                        }`}
                        title={isInactivePro ? "Subscrição inativa — Ver perfil" : "Contactar o Profissional"}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{isInactivePro ? 'Ver Perfil' : 'Contactar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal: Publicar Novo Trabalho Real */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" id="modal-publish-work">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-black text-slate-900">Publicar Trabalho Real no Feed</h3>
            </div>

            <p className="text-xs text-slate-500">
              Partilhe imagens ou vídeos de trabalhos e serviços reais executados pelo seu perfil profissional.
            </p>

            <form onSubmit={handleSubmitNewPost} className="space-y-4">
              {/* Seleção de Categoria */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoria do Serviço</label>
                <select
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Tipo de Mídia */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Ficheiro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewMediaType('image');
                      setCustomFilePreview(null);
                      setNewMediaUrl('');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border ${
                      newMediaType === 'image'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> Fotografia
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewMediaType('video');
                      setCustomFilePreview(null);
                      setNewMediaUrl('');
                    }}
                    className={`py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border ${
                      newMediaType === 'video'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <VideoIcon className="w-4 h-4" /> Vídeo
                  </button>
                </div>
              </div>

              {/* Carregamento de Foto ou Vídeo Real */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">
                  Carregar Foto / Vídeo do Trabalho Real
                </label>
                
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    accept={newMediaType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="feed-file-upload-input"
                  />
                  <label
                    htmlFor="feed-file-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      Clique para selecionar {newMediaType === 'image' ? 'uma fotografia' : 'um vídeo'} do seu dispositivo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, MP4 ou WebM
                    </span>
                  </label>
                </div>

                {/* Pré-visualização da Mídia Carregada */}
                {customFilePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-900 flex items-center justify-center mt-2">
                    {newMediaType === 'video' ? (
                      <video src={customFilePreview} controls className="max-h-48 w-full object-contain" />
                    ) : (
                      <img src={customFilePreview} alt="Pré-visualização" className="max-h-48 w-full object-contain" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFilePreview(null);
                        setNewMediaUrl('');
                      }}
                      className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-rose-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Ou URL direto */}
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Ou insira o link direto da imagem/vídeo:
                  </label>
                  <input
                    type="url"
                    value={newMediaUrl}
                    onChange={(e) => {
                      setNewMediaUrl(e.target.value);
                      setCustomFilePreview(e.target.value);
                    }}
                    placeholder="https://..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição do Trabalho Real */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Descrição do Trabalho Concluído
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Instalação de quadro elétrico residencial no Talatona com disjuntores diferenciais e teste de terra..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                ></textarea>
              </div>

              {/* Submissão */}
              <button
                id="btn-submit-feed-post"
                type="submit"
                disabled={isUploading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isUploading ? 'A carregar ficheiro...' : 'Publicar no Feed de Trabalhos'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
