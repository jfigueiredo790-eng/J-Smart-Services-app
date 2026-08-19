import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { WorkFeedPost, ProfessionalProfile } from '../types';
import { getProPlanStatus, validateProAction } from '../utils/planUtils';
import { rankWorkFeedPosts, formatPostDateFriendly } from '../utils/feedAlgorithm';
import { compressImageFile, uploadWorkPostImageToStorage } from '../utils/imageUtils';
import { UserAvatar } from './UserAvatar';
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
  Layers,
  MoreVertical,
  Edit3,
  MapPin,
  Banknote,
  Check,
  Loader2,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react';

const AVAILABLE_REACTIONS = [
  { emoji: '❤️', label: 'Amei' },
  { emoji: '👍', label: 'Gosto' },
  { emoji: '👏', label: 'Parabéns' },
  { emoji: '🔥', label: 'Top' },
  { emoji: '⭐', label: 'Excelente' },
];

export const WorkFeedView: React.FC = () => {
  const { 
    currentUser, 
    userRole, 
    workFeedPosts, 
    addWorkFeedPost, 
    updateWorkFeedPost,
    likeWorkFeedPost, 
    deleteWorkFeedPost,
    categories, 
    professionals, 
    setSelectedPro, 
    triggerBlockedActionPrompt,
    switchRole
  } = useApp();

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  
  // Menu de opções (⋮) por publicação
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Barra flutuante de reações
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState<string | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement | null>(null);

  // New Post Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategoryName, setNewCategoryName] = useState(categories[0]?.name || 'Geral');
  const [newLocation, setNewLocation] = useState('');
  const [newPriceKz, setNewPriceKz] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit Post Form State
  const [editingPost, setEditingPost] = useState<WorkFeedPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPriceKz, setEditPriceKz] = useState('');
  const [editMediaType, setEditMediaType] = useState<'image' | 'video'>('image');
  const [editMediaUrl, setEditMediaUrl] = useState('');
  const [editCustomPreview, setEditCustomPreview] = useState<string | null>(null);
  const [isEditUploading, setIsEditUploading] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const currentUserPlan = getProPlanStatus(currentUser);
  const isPro = currentUser.role === 'profissional' || currentUser.role === 'admin';

  // Fechar menu de 3 pontos e barra de reações ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuPostId(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setActiveReactionPickerPostId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Algoritmo de Organização do Feed: Recência + Relevância + Interações + Qualidade
  // Preserva integralmente as publicações reais anteriores com a sua data original.
  const rankedPosts = useMemo(() => {
    const ranked = rankWorkFeedPosts(
      workFeedPosts,
      currentUser,
      professionals,
      selectedCatFilter
    );

    if (!searchTerm.trim()) return ranked;
    const q = searchTerm.toLowerCase();
    return ranked.filter(post => 
      post.description.toLowerCase().includes(q) ||
      (post.title && post.title.toLowerCase().includes(q)) ||
      (post.location && post.location.toLowerCase().includes(q)) ||
      post.professionalName.toLowerCase().includes(q) ||
      post.categoryName.toLowerCase().includes(q)
    );
  }, [workFeedPosts, currentUser, professionals, selectedCatFilter, searchTerm]);

  const handleOpenPublishModal = () => {
    if (!isPro) {
      if (currentUser.accountType === 'duplo') {
        const wantsToSwitch = window.confirm(
          'A funcionalidade de divulgação e publicidade de trabalhos é exclusiva para o Modo Profissional.\n\nDeseja alternar agora para o Modo Profissional para publicar o seu trabalho?'
        );
        if (wantsToSwitch) {
          switchRole('profissional');
          setIsPublishModalOpen(true);
        }
        return;
      }
      alert('A publicação de trabalhos e divulgação de serviços no Feed é exclusiva para profissionais registados na J Smart Services.');
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file, 1200, 0.85);
          setCustomFilePreview(compressed);
          setNewMediaUrl(compressed);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setCustomFilePreview(result);
            setNewMediaUrl(result);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Erro ao processar ficheiro de trabalho:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmitNewPost = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDesc.trim()) {
      alert('Por favor descreva o serviço real efetuado.');
      return;
    }

    let finalMedia = newMediaUrl.trim() || customFilePreview;
    if (!finalMedia) {
      alert('Por favor carregue uma fotografia ou vídeo real do serviço concluído.');
      return;
    }

    setIsUploading(true);

    try {
      // Se for um Data URL de imagem, fazer upload seguro no Firebase Storage
      if (finalMedia.startsWith('data:image/')) {
        const uploadRes = await uploadWorkPostImageToStorage(finalMedia, currentUser.id);
        if (uploadRes.success && uploadRes.url) {
          finalMedia = uploadRes.url;
        }
      }

      const matchedPro = professionals.find(p => p.id === currentUser.id) || (currentUser as ProfessionalProfile);

      const res = addWorkFeedPost({
        professionalId: currentUser.id,
        professionalName: currentUser.name,
        professionalAvatar: currentUser.avatar || '',
        professionalVerified: currentUser.verified || false,
        professionalCategories: matchedPro.categories || [],
        mediaUrl: finalMedia,
        mediaType: newMediaType,
        title: newTitle.trim() || undefined,
        description: newDesc.trim(),
        categoryName: newCategoryName,
        location: newLocation.trim() || currentUser.province || undefined,
        priceKz: newPriceKz ? Number(newPriceKz) : undefined,
        ownerId: currentUser.id
      });

      if (res.success) {
        setIsPublishModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        setNewLocation('');
        setNewPriceKz('');
        setNewMediaUrl('');
        setCustomFilePreview(null);
      } else if (res.error) {
        triggerBlockedActionPrompt(res.error);
      }
    } catch (err) {
      console.error('Erro ao submeter publicação:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // ==========================================
  // FLUXO DE EDIÇÃO DE PUBLICAÇÃO PRÓPRIA
  // ==========================================
  const handleOpenEditModal = (post: WorkFeedPost) => {
    // Validação de Segurança: Utilizador autenticado deve ser o autor ou administrador
    const isAuthor = currentUser.id === post.professionalId || (post.ownerId && currentUser.id === post.ownerId);
    const isAdmin = currentUser.role === 'admin';

    if (!isAuthor && !isAdmin) {
      alert('Acesso negado: Só tem permissão para editar as publicações criadas pela sua própria conta.');
      return;
    }

    setEditingPost(post);
    setEditTitle(post.title || '');
    setEditDesc(post.description || '');
    setEditCategoryName(post.categoryName || categories[0]?.name || 'Geral');
    setEditLocation(post.location || '');
    setEditPriceKz(post.priceKz ? post.priceKz.toString() : '');
    setEditMediaType(post.mediaType || 'image');
    setEditMediaUrl(post.mediaUrl || '');
    setEditCustomPreview(null);
    setEditFeedback(null);
    setActiveMenuPostId(null);
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsEditUploading(true);
      try {
        if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file, 1200, 0.85);
          setEditCustomPreview(compressed);
          setEditMediaUrl(compressed);
        } else {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setEditCustomPreview(result);
            setEditMediaUrl(result);
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Erro ao processar nova imagem/vídeo para edição:', err);
      } finally {
        setIsEditUploading(false);
      }
    }
  };

  const handleSaveEditPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost) return;

    if (!editDesc.trim()) {
      setEditFeedback({ type: 'error', message: 'A descrição da publicação é obrigatória.' });
      return;
    }

    let finalMedia = editMediaUrl.trim() || editCustomPreview || editingPost.mediaUrl;
    if (!finalMedia) {
      setEditFeedback({ type: 'error', message: 'A publicação deve conter uma fotografia ou vídeo.' });
      return;
    }

    setIsEditUploading(true);
    setEditFeedback(null);

    try {
      // Se o utilizador substituiu ou adicionou nova imagem via Data URL, faz upload para o Storage
      if (finalMedia.startsWith('data:image/')) {
        const uploadRes = await uploadWorkPostImageToStorage(finalMedia, currentUser.id);
        if (uploadRes.success && uploadRes.url) {
          finalMedia = uploadRes.url;
        }
      }

      // Encontrar ID da categoria se aplicável
      const matchedCat = categories.find(c => c.name === editCategoryName);

      const result = await updateWorkFeedPost(editingPost.id, {
        title: editTitle.trim() || undefined,
        description: editDesc.trim(),
        categoryName: editCategoryName,
        categoryId: matchedCat ? matchedCat.id : editingPost.categoryId,
        location: editLocation.trim() || undefined,
        priceKz: editPriceKz ? Number(editPriceKz) : undefined,
        mediaUrl: finalMedia,
        mediaType: editMediaType
      });

      if (result.success) {
        setEditFeedback({ type: 'success', message: 'Publicação atualizada com sucesso!' });
        setTimeout(() => {
          setEditingPost(null);
          setEditFeedback(null);
        }, 1200);
      } else {
        setEditFeedback({ type: 'error', message: result.message || 'Erro ao atualizar publicação.' });
      }
    } catch (err: any) {
      console.error('Erro ao salvar alterações da publicação:', err);
      setEditFeedback({ type: 'error', message: `Erro ao salvar alterações: ${err.message || err}` });
    } finally {
      setIsEditUploading(false);
    }
  };

  const handleContactProFromPost = (post: WorkFeedPost) => {
    if (currentUser.id === post.professionalId) {
      alert('Esta publicação pertence ao seu próprio perfil profissional.');
      return;
    }

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

    setSelectedPro(pro);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 pb-24" id="work-feed-container">
      {/* Banner Principal do Feed */}
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
              Descubra serviços e projetos reais executados pelos profissionais qualificados pela plataforma J Smart Services ✅.
            </p>
          </div>

          {/* Botão de Ação: Publicar Trabalho */}
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
          ) : currentUser.accountType === 'duplo' ? (
            <button
              onClick={() => switchRole('profissional')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-2xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
              title="Mudar para Modo Profissional para criar publicações de serviços"
            >
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>Mudar p/ Modo Pro e Publicar</span>
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
            placeholder="Pesquisar trabalhos por título, descrição, profissional, categoria ou localização..."
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

      {/* Lista de Publicações Reais */}
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
            // Segurança: Verificar se o utilizador logado é o autor ou admin
            const isOwner = currentUser.id === post.professionalId || (post.ownerId && currentUser.id === post.ownerId);
            const isAdmin = currentUser.role === 'admin';
            const canManagePost = isOwner || isAdmin;
            const isMenuOpen = activeMenuPostId === post.id;
            const authorAvatar = pro?.avatar || (pro as any)?.photoURL || (isOwner ? (currentUser.avatar || (currentUser as any)?.photoURL) : post.professionalAvatar);

            return (
              <article 
                key={post.id}
                id={`work-feed-post-${post.id}`}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden relative"
              >
                {/* Cabeçalho do Autor Real */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100 relative">
                  <div 
                    onClick={() => {
                      if (pro) setSelectedPro(pro);
                    }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <UserAvatar
                      src={authorAvatar}
                      name={post.professionalName}
                      sizeClassName="w-11 h-11"
                      roundedClassName="rounded-full"
                      role="profissional"
                      className="border-2 border-slate-100 group-hover:border-emerald-500 transition-colors"
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

                        {(post.location || pro?.province) && (
                          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            {post.location || pro?.province}
                          </span>
                        )}

                        {post.updatedAt && post.updatedAt !== post.createdAt && (
                          <span className="text-[9px] font-medium text-slate-400 italic">
                            (editado)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Menu de Ações (⋮) para o Autor da Publicação ou Administrador */}
                  {canManagePost && (
                    <div className="relative">
                      <button
                        id={`btn-post-menu-${post.id}`}
                        onClick={() => setActiveMenuPostId(isMenuOpen ? null : post.id)}
                        className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                        title="Opções da Publicação"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 animate-fade-in"
                        >
                          {/* Opção Editar Publicação */}
                          <button
                            id={`btn-edit-post-${post.id}`}
                            onClick={() => handleOpenEditModal(post)}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 flex items-center gap-2.5 transition-colors"
                          >
                            <Edit3 className="w-4 h-4 text-emerald-600" />
                            <span>Editar publicação</span>
                          </button>

                          {/* Opção Eliminar Publicação */}
                          <button
                            id={`btn-delete-post-${post.id}`}
                            onClick={() => {
                              setActiveMenuPostId(null);
                              if (window.confirm('Tem a certeza de que pretende eliminar esta publicação do Feed?')) {
                                deleteWorkFeedPost(post.id);
                              }
                            }}
                            className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-rose-600" />
                            <span>Eliminar publicação</span>
                          </button>
                        </div>
                      )}
                    </div>
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
                      alt={post.title || post.description}
                      className="w-full max-h-[500px] object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </div>

                {/* Descrição, Título, Preço e Barra de Ações */}
                <div className="p-4 space-y-3">
                  {post.title && (
                    <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      {post.title}
                    </h4>
                  )}

                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                    {post.description}
                  </p>

                  {/* Informações Extras (Preço ou Orçamento se houver) */}
                  {post.priceKz !== undefined && post.priceKz > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-black">
                      <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Orçamento: {post.priceKz.toLocaleString('pt-AO')} Kz</span>
                    </div>
                  )}

                  {/* Barra de Rodapé Responsiva: Reações + Ver Perfil + Contactar */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    {/* Barra de Reações & Gostos */}
                    <div className="relative shrink-0" ref={activeReactionPickerPostId === post.id ? reactionPickerRef : undefined}>
                      {/* Menu flutuante de reações */}
                      {activeReactionPickerPostId === post.id && (
                        <div className="absolute bottom-full left-0 mb-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-1.5 flex items-center gap-1 animate-scale-up">
                          {AVAILABLE_REACTIONS.map(r => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => {
                                likeWorkFeedPost(post.id, r.emoji);
                                setActiveReactionPickerPostId(null);
                              }}
                              className={`p-1.5 hover:scale-125 transition-transform text-lg rounded-xl flex items-center justify-center hover:bg-slate-100 ${
                                (post.reactions?.[currentUser.id] === r.emoji) ? 'bg-emerald-100/70 ring-2 ring-emerald-500 scale-110' : ''
                              }`}
                              title={`${r.label} (${r.emoji})`}
                            >
                              <span>{r.emoji}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="inline-flex items-center rounded-full bg-slate-100 p-0.5 border border-slate-200/60 shadow-xs shrink-0">
                        {/* Botão Principal de Reação */}
                        <button
                          id={`btn-like-${post.id}`}
                          onClick={() => {
                            const currentReact = post.reactions?.[currentUser.id];
                            if (isLiked && currentReact) {
                              likeWorkFeedPost(post.id, currentReact);
                            } else if (isLiked) {
                              likeWorkFeedPost(post.id, '❤️');
                            } else {
                              likeWorkFeedPost(post.id, '❤️');
                            }
                          }}
                          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                            isLiked
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'text-slate-700 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          {isLiked ? (
                            <span className="text-sm leading-none">{post.reactions?.[currentUser.id] || '❤️'}</span>
                          ) : (
                            <Heart className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="font-bold">{post.likesCount || 0}</span>
                          <span className="hidden min-[400px]:inline text-[11px] font-bold text-slate-500">
                            {post.likesCount === 1 ? 'Reação' : 'Reações'}
                          </span>
                        </button>

                        {/* Botão Seletor de Emojis */}
                        <button
                          type="button"
                          id={`btn-reaction-picker-${post.id}`}
                          onClick={() => setActiveReactionPickerPostId(activeReactionPickerPostId === post.id ? null : post.id)}
                          className="px-2 py-1 text-slate-500 hover:text-slate-900 rounded-full hover:bg-white transition-all text-xs flex items-center justify-center shrink-0"
                          title="Escolher reação (❤️, 👍, 👏, 🔥, ⭐)"
                        >
                          <span className="text-xs">➕</span>
                        </button>
                      </div>
                    </div>

                    {/* Grupo de Ações do Profissional (Ver Perfil & Contactar) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Ver Perfil do Profissional */}
                      <button
                        onClick={() => {
                          if (pro) setSelectedPro(pro);
                        }}
                        className="px-2.5 sm:px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1 shrink-0 whitespace-nowrap active:scale-95"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>Ver Perfil</span>
                      </button>

                      {/* Contactar Profissional - Totalmente visível e adaptativo */}
                      <button
                        id={`btn-contact-pro-${post.id}`}
                        onClick={() => handleContactProFromPost(post)}
                        className={`px-3 sm:px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95 shadow-sm ${
                          isInactivePro
                            ? 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        }`}
                        title={isInactivePro ? "Subscrição inativa — Ver perfil" : "Contactar o Profissional"}
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
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

      {/* ==========================================
          MODAL: EDITAR PUBLICAÇÃO PRÓPRIA (17-23)
          ========================================== */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in" id="modal-edit-work-post">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => {
                setEditingPost(null);
                setEditFeedback(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-700">
              <Edit3 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-black text-slate-900">Editar Publicação</h3>
            </div>

            <p className="text-xs text-slate-500">
              Atualize as informações do seu trabalho. O autor original, data de criação e histórico de gostos são estritamente preservados.
            </p>

            {editFeedback && (
              <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                editFeedback.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {editFeedback.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{editFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditPost} className="space-y-4">
              {/* Título Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título do Trabalho (Opcional)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Ex: Instalação de Ar Condicionado Inverter"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Seleção de Categoria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Categoria do Serviço
                </label>
                <select
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Localização e Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Localização (Província / Bairro)
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Ex: Luanda, Talatona"
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preço / Orçamento Estimado (Kz)
                  </label>
                  <input
                    type="number"
                    value={editPriceKz}
                    onChange={(e) => setEditPriceKz(e.target.value)}
                    placeholder="Ex: 25000"
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Tipo de Mídia */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Ficheiro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditMediaType('image');
                    }}
                    className={`py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      editMediaType === 'image'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> Fotografia
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditMediaType('video');
                    }}
                    className={`py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 border transition-all ${
                      editMediaType === 'video'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <VideoIcon className="w-4 h-4" /> Vídeo
                  </button>
                </div>
              </div>

              {/* Mídia Atual e Substituição */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Fotografia ou Vídeo da Publicação
                </label>

                {/* Pré-visualização da Mídia Atual ou Nova */}
                {(editCustomPreview || editMediaUrl) && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 max-h-48 bg-slate-950 flex items-center justify-center">
                    {editMediaType === 'video' ? (
                      <video src={editCustomPreview || editMediaUrl} controls className="max-h-48 w-full object-contain" />
                    ) : (
                      <img 
                        src={editCustomPreview || editMediaUrl} 
                        alt="Pré-visualização da Mídia" 
                        className="max-h-48 w-full object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditCustomPreview(null);
                        setEditMediaUrl('');
                      }}
                      className="absolute top-2 right-2 bg-slate-900/80 text-white p-1 rounded-full hover:bg-rose-600 transition-colors"
                      title="Remover imagem"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Botão de Upload para Substituir Imagem */}
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-4 text-center bg-slate-50/50 transition-colors">
                  <input
                    type="file"
                    accept={editMediaType === 'image' ? 'image/*' : 'video/*'}
                    onChange={handleEditFileUpload}
                    className="hidden"
                    id="edit-feed-file-upload-input"
                  />
                  <label
                    htmlFor="edit-feed-file-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-700">
                      {editMediaUrl ? 'Clique para substituir por nova foto/vídeo' : 'Selecionar fotografia/vídeo'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, MP4 ou WebM
                    </span>
                  </label>
                </div>

                {/* Ou URL direto */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Ou insira o link direto:
                  </label>
                  <input
                    type="url"
                    value={editMediaUrl}
                    onChange={(e) => {
                      setEditMediaUrl(e.target.value);
                      setEditCustomPreview(e.target.value);
                    }}
                    placeholder="https://..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Descrição do Trabalho */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição do Trabalho Concluído *
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Descreva detalhadamente o serviço efetuado..."
                  rows={4}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                  required
                ></textarea>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPost(null);
                    setEditFeedback(null);
                  }}
                  className="w-1/3 py-3 border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-xs rounded-2xl transition-all"
                >
                  Cancelar
                </button>

                <button
                  id="btn-save-edit-post"
                  type="submit"
                  disabled={isEditUploading}
                  className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-98 disabled:opacity-50"
                >
                  {isEditUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>A guardar alterações...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-emerald-200" />
                      <span>Salvar alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
              {/* Título Opcional */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Título do Trabalho (Opcional)</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Manutenção de Gerador Industrial"
                  className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

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

              {/* Localização e Preço */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Localização</label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ex: Luanda, Viana"
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Orçamento Estimado (Kz)</label>
                  <input
                    type="number"
                    value={newPriceKz}
                    onChange={(e) => setNewPriceKz(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full text-xs font-medium p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
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
                  Descrição do Trabalho Concluído *
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
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>A processar publicação...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Publicar no Feed de Trabalhos</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
