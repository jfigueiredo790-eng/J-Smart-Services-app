import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkFeedPost, ProfessionalProfile } from '../types';
import { getProPlanStatus } from '../utils/planUtils';
import { 
  Heart, 
  MessageSquare, 
  User as UserIcon, 
  Plus, 
  CheckCircle2, 
  Sparkles, 
  AlertTriangle, 
  X, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Share2, 
  Filter, 
  ShieldCheck, 
  Lock,
  Trash2
} from 'lucide-react';

const PRESET_WORK_MEDIA = [
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
    title: 'Trabalho Elétrico Residencial'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&auto=format&fit=crop&q=80',
    title: 'Manutenção de Ar Condicionado'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
    title: 'Pintura & Restauração de Fachada'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80',
    title: 'Instalação de Canalização & Bombas'
  },
  {
    type: 'image',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    title: 'Técnico de Informática & Redes'
  },
  {
    type: 'video',
    url: 'https://assets.mixkit.co/videos/preview/mixkit-electrician-working-on-a-fuse-box-41584-large.mp4',
    title: 'Vídeo: Manutenção de Quadro Elétrico'
  }
];

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
    setActiveTab, 
    setActiveChatRequestId, 
    requests,
    triggerBlockedActionPrompt
  } = useApp();

  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('Todas');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  
  // New Post Form State
  const [newDesc, setNewDesc] = useState('');
  const [newCategoryName, setNewCategoryName] = useState(categories[0]?.name || 'Geral');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);

  const currentUserPlan = getProPlanStatus(currentUser);
  const isPro = userRole === 'profissional' || currentUser.role === 'profissional';

  // Filter posts by category
  const filteredPosts = workFeedPosts.filter(post => {
    if (selectedCatFilter === 'Todas') return true;
    return post.categoryName === selectedCatFilter;
  });

  const handleOpenPublishModal = () => {
    if (!isPro) {
      alert('Apenas profissionais cadastrados podem publicar trabalhos no Feed.');
      return;
    }

    if (!currentUserPlan.isActive) {
      triggerBlockedActionPrompt('⚠️ A sua subscrição terminou. Para publicar novos trabalhos no Feed da J Smart Services, escolha uma subscrição.');
      return;
    }

    setIsPublishModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setCustomFilePreview(result);
        setNewMediaUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitNewPost = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDesc.trim()) {
      alert('Por favor escreva uma breve descrição do trabalho efetuado.');
      return;
    }

    const mediaToUse = newMediaUrl || customFilePreview || PRESET_WORK_MEDIA[0].url;

    const matchedPro = professionals.find(p => p.id === currentUser.id) || (currentUser as ProfessionalProfile);

    const res = addWorkFeedPost({
      professionalId: currentUser.id,
      professionalName: currentUser.name,
      professionalAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      professionalVerified: currentUser.verified || false,
      professionalCategories: matchedPro.categories || [],
      mediaUrl: mediaToUse,
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
      alert('Este trabalho pertence ao seu próprio perfil.');
      return;
    }

    // Find professional details
    const pro = professionals.find(p => p.id === post.professionalId);
    if (!pro) {
      alert('Profissional não encontrado.');
      return;
    }

    const proPlan = getProPlanStatus(pro);

    if (!proPlan.isActive) {
      alert('O profissional encontra-se com a subscrição inativa no momento. Não é possível iniciar contacto até que a subscrição seja renovada.');
      return;
    }

    // Open detail modal to request service or start chat
    setSelectedPro(pro);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 space-y-6 pb-24">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden border border-emerald-900/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-500/30 mb-2 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Galeria de Trabalhos Reais</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>📸 Feed de Trabalhos</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Explore fotos e vídeos dos serviços concluídos pelos profissionais qualificados em Angola.
            </p>
          </div>

          {/* Action Button depending on user role and plan */}
          {isPro ? (
            <button
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

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-emerald-600" /> Filtrar:
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
        {categories.slice(0, 10).map(cat => (
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

      {/* Posts List */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">Nenhum trabalho publicado nesta categoria ainda.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Os profissionais ativaram os seus planos e em breve publicarão fotos dos seus serviços mais recentes!
            </p>
          </div>
        ) : (
          filteredPosts.map(post => {
            const isLiked = post.likedBy.includes(currentUser.id);
            const pro = professionals.find(p => p.id === post.professionalId);
            const proPlan = pro ? getProPlanStatus(pro) : null;
            const isInactivePro = proPlan && !proPlan.isActive;

            return (
              <article 
                key={post.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Header: Pro Avatar, Name, Verified, Subscription Status Badge */}
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <div 
                    onClick={() => {
                      if (pro) setSelectedPro(pro);
                    }}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <img
                      src={post.professionalAvatar}
                      alt={post.professionalName}
                      className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 group-hover:border-emerald-500 transition-colors"
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
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {post.categoryName}
                        </span>
                        {isInactivePro ? (
                          <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full" title="Subscrição inativa">
                            ⚪ Subscrição inativa
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString('pt-AO')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete button if owner or admin */}
                  {(currentUser.id === post.professionalId || currentUser.role === 'admin') && (
                    <button
                      onClick={() => {
                        if (window.confirm('Tem a certeza que deseja eliminar esta publicação do Feed?')) {
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

                {/* Media Section: Photo or Video */}
                <div className="relative bg-slate-950 max-h-[480px] flex items-center justify-center overflow-hidden">
                  {post.mediaType === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="w-full max-h-[480px] object-contain"
                      poster="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt={post.description}
                      className="w-full max-h-[480px] object-cover"
                    />
                  )}
                </div>

                {/* Description & Metadata */}
                <div className="p-4 space-y-3">
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                    {post.description}
                  </p>

                  {/* Footer Actions Bar: Like + Profile + Contact */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Like Button */}
                    <button
                      onClick={() => likeWorkFeedPost(post.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${
                        isLiked
                          ? 'bg-rose-50 text-rose-600 border border-rose-200 scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-600' : ''}`} />
                      <span>{post.likesCount} {post.likesCount === 1 ? 'Gosto' : 'Gostos'}</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Ver Perfil */}
                      <button
                        onClick={() => {
                          if (pro) setSelectedPro(pro);
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1"
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>Ver Perfil</span>
                      </button>

                      {/* Contactar / Chat */}
                      <button
                        onClick={() => handleContactProFromPost(post)}
                        className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1 ${
                          isInactivePro
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 active:scale-95'
                        }`}
                        title={isInactivePro ? "O profissional está com subscrição inativa" : "Contactar o Profissional"}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Contactar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Modal: Publicar Novo Trabalho */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsPublishModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-700">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-lg font-black text-slate-900">Publicar Trabalho no Feed</h3>
            </div>

            <form onSubmit={handleSubmitNewPost} className="space-y-4">
              {/* Category selector */}
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

              {/* Media Type selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de Ficheiro</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMediaType('image')}
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
                    onClick={() => setNewMediaType('video')}
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

              {/* File upload or Preset selection */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Carregar Foto/Vídeo ou Selecionar Modelo</label>
                
                {/* Upload from file input */}
                <input
                  type="file"
                  accept={newMediaType === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileUpload}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white"
                />

                {/* Preset Models selection */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 block">Ou escolha uma imagem demonstrativa de exemplo:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_WORK_MEDIA.filter(m => m.type === newMediaType).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setNewMediaUrl(preset.url);
                          setCustomFilePreview(null);
                        }}
                        className={`relative rounded-xl overflow-hidden border-2 h-16 bg-slate-900 group transition-all ${
                          newMediaUrl === preset.url ? 'border-emerald-500 ring-2 ring-emerald-500/40' : 'border-slate-200'
                        }`}
                      >
                        <img src={preset.url} alt={preset.title} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-slate-950/40 flex items-end p-1 text-[9px] font-bold text-white leading-tight">
                          {preset.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Descrição do Trabalho Concluído</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Instalação elétrica residencial concluída no Kilamba com substituição de disjuntores e teste de segurança..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                ></textarea>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Publicar no Feed de Trabalhos</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
