import React from 'react';
import { ProfessionalProfile } from '../types';
import { useApp } from '../context/AppContext';
import { getProPlanStatus } from '../utils/planUtils';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  Star, 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Phone, 
  Mail, 
  Briefcase, 
  FileText, 
  MessageSquare,
  Calendar,
  Send,
  AlertTriangle
} from 'lucide-react';

interface ProfessionalDetailModalProps {
  pro: ProfessionalProfile;
  onClose: () => void;
  onRequestService: () => void;
}

export const ProfessionalDetailModal: React.FC<ProfessionalDetailModalProps> = ({ pro, onClose, onRequestService }) => {
  const { reviews, categories, setActiveTab, setActiveChatRequestId, requests, currentUser, switchRole, setIsReviewModalOpen, setReviewingRequestId } = useApp();

  const proPlan = getProPlanStatus(pro);

  // Reviews for this professional
  const proReviews = reviews.filter(r => r.professionalId === pro.id);

  // Check if current user (client) has a completed, unreviewed request with this pro
  const completedReq = currentUser.role === 'cliente' 
    ? requests.find(r => r.clientId === currentUser.id && r.professionalId === pro.id && r.status === 'concluido' && !r.hasReview)
    : null;

  const proCatNames = pro.categories
    .map(cId => categories.find(cat => cat.id === cId)?.name)
    .filter(Boolean);

  const handleStartChat = () => {
    if (currentUser.role === 'profissional') {
      if (currentUser.accountType === 'duplo') {
        const wantsToSwitch = window.confirm(
          'Está no Modo Profissional. Para conversar com outro prestador de serviços, deve mudar para o Modo Cliente.\n\nDeseja alternar agora para o Modo Cliente?'
        );
        if (wantsToSwitch) {
          switchRole('cliente');
        }
        return;
      }
      alert('Atenção: Está a navegar no Modo Profissional. Para conversar com um prestador, alterne o seu perfil para o Modo Cliente no menu.');
      return;
    }

    if (currentUser.id === pro.id) {
      alert('Não é possível conversar com o seu próprio perfil profissional.');
      return;
    }

    if (proPlan.isExpired) {
      alert('Este profissional encontra-se temporariamente em renovação de plano e não pode receber mensagens ou novos pedidos no momento.');
      return;
    }

    const existingReq = requests.find(r => r.professionalId === pro.id && r.clientId === currentUser.id);
    if (existingReq) {
      setActiveChatRequestId(existingReq.id);
      setActiveTab('chat');
      onClose();
    } else {
      onRequestService();
    }
  };

  const handleRequestServiceClick = () => {
    if (currentUser.role === 'profissional') {
      if (currentUser.accountType === 'duplo') {
        const wantsToSwitch = window.confirm(
          'Está a navegar no Modo Profissional. Para solicitar um serviço, deve estar no Modo Cliente.\n\nDeseja alternar agora para o Modo Cliente para enviar este pedido?'
        );
        if (wantsToSwitch) {
          switchRole('cliente');
          onClose();
          onRequestService();
        }
        return;
      }
      alert('Atenção: Apenas utilizadores no Modo Cliente podem solicitar serviços. Os profissionais utilizam a plataforma para receber pedidos.');
      return;
    }

    if (currentUser.id === pro.id) {
      alert('Não é possível solicitar um serviço ao seu próprio perfil.');
      return;
    }

    if (proPlan.isExpired) {
      alert('Este profissional encontra-se temporariamente em renovação de plano e não está a receber novos pedidos no momento.');
      return;
    }

    onClose();
    onRequestService();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200">
        
        {/* Banner / Header image background */}
        <div className="h-32 bg-gradient-to-r from-emerald-800 to-slate-900 relative p-4 flex justify-between items-start">
          <div className="bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-semibold flex items-center gap-1.5 border border-emerald-400/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Profissional Ativo em Angola
          </div>

          <button 
            onClick={onClose}
            className="p-2 bg-slate-900/60 hover:bg-slate-900 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info Overlay */}
        <div className="px-6 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-14 mb-4 gap-4">
            <UserAvatar
              src={pro.avatar || (pro as any).photoURL}
              name={pro.name}
              sizeClassName="w-24 h-24"
              roundedClassName="rounded-3xl"
              role="profissional"
              isVerified={pro.verified}
              showVerifiedBadge={true}
              className="border-4 border-white shadow-md bg-white shrink-0"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleStartChat}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors border border-slate-200"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Conversar</span>
              </button>

              <button
                onClick={handleRequestServiceClick}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/30"
              >
                <Send className="w-4 h-4" />
                <span>Pedir Serviço</span>
              </button>
            </div>
          </div>

          {/* Name & Title */}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">{pro.name}</h2>
              {pro.verified && (
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verificado
                </span>
              )}
              {proPlan.isExpired ? (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1" title="Subscrição inativa">
                  ⚪ Subscrição inativa
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Subscrição Ativa
                </span>
              )}
            </div>

            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>{pro.address || pro.province}</span>
            </p>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {proCatNames.map((name, i) => (
                <span key={i} className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Key Metrics grid */}
          <div className="grid grid-cols-3 gap-3 my-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Avaliação</span>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span className="font-extrabold text-slate-900 text-base">{pro.rating}</span>
                <span className="text-[11px] text-slate-500">({pro.reviewCount})</span>
              </div>
            </div>

            <div className="border-x border-slate-200 px-2">
              <span className="text-xs text-slate-400 block font-medium">Concluídos</span>
              <span className="font-extrabold text-slate-900 text-base mt-0.5 block">{pro.completedJobs} trabalhos</span>
            </div>

            <div>
              <span className="text-xs text-slate-400 block font-medium">Preço do Serviço</span>
              <span className="font-extrabold text-emerald-800 text-xs mt-0.5 block bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">💰 Preço: A combinar</span>
            </div>
          </div>

          {/* Banner de Pagamento Direto ao Profissional */}
          <div className="mb-5 bg-gradient-to-r from-emerald-50 to-slate-50 p-4 rounded-2xl border border-emerald-200/80 space-y-1.5">
            <h4 className="text-xs font-black uppercase text-emerald-900 tracking-wider flex items-center gap-1.5">
              <span>💰 Negociação & Pagamento Direto</span>
            </h4>
            <p className="text-xs text-slate-700 leading-relaxed">
              O valor do serviço é <strong>A combinar</strong> e negociado diretamente com o profissional através do chat. Após o trabalho concluído, o cliente paga <strong>diretamente ao profissional</strong> (em dinheiro físico, transferência ou Express). A J Smart Services não recebe valores nem cobra comissões sobre os serviços.
            </p>
          </div>

          {/* Experiência Profissional */}
          <div className="mb-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Experiência Profissional</span>
              </h3>
              {pro.experienceVerified ? (
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  ✅ Experiência verificada
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  ⚪ Estado: Não verificada
                </span>
              )}
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 font-medium">Anos de experiência declarados:</span>
              <span className="font-extrabold text-slate-900 text-sm">{pro.experienceYears || 0} anos</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <strong className="text-slate-700">Nota:</strong> {pro.experienceVerified 
                ? 'A experiência deste profissional foi validada com comprovativos e confirmada pelo Administrador.' 
                : 'Esta informação foi declarada pelo próprio profissional e aguarda validação de comprovativos junto do Administrador.'}
            </div>
          </div>

          {/* Bio */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Sobre o Profissional</h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              {pro.bio}
            </p>
          </div>

          {/* Verification Badge & Documents */}
          <div className="mb-5 bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-white rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Registo Profissional Verificado</h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Perfil e qualificações profissionais ativas e verificadas na J Smart Services Angola.
              </p>
            </div>
          </div>

          {/* Portfolio Images (if any) */}
          {pro.portfolioImages && pro.portfolioImages.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Trabalhos Anteriores</h3>
              <div className="grid grid-cols-2 gap-2">
                {pro.portfolioImages.map((img, i) => (
                  <img 
                    key={i} 
                    src={img} 
                    alt={`Trabalho ${i + 1}`} 
                    onError={(e) => {
                      // Hide or show subtle placeholder if image cannot be loaded
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-32 object-cover rounded-xl border border-slate-200"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Reviews list */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Avaliações de Clientes em Angola
              </h3>
              <span className="text-emerald-600 text-[11px] font-semibold">{proReviews.length} comentários</span>
            </div>

            {/* If client completed work with this pro */}
            {completedReq && (
              <div className="mb-4 bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-xs">Trabalho Concluído Recente!</h4>
                    <p className="text-[11px] text-slate-600">Já pode avaliar o serviço prestado por {pro.name}.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setReviewingRequestId(completedReq.id);
                    setIsReviewModalOpen(true);
                    onClose();
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
                >
                  Avaliar Serviço
                </button>
              </div>
            )}

            {/* Mandatory policy notice */}
            <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Apenas clientes que conversaram e concluíram um trabalho com <strong>{pro.name}</strong> podem publicar avaliações.</span>
            </div>

            {proReviews.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">Sem avaliações ainda.</p>
            ) : (
              <div className="space-y-3">
                {proReviews.map(rev => (
                  <div key={rev.id} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar 
                          src={rev.clientAvatar} 
                          name={rev.clientName} 
                          sizeClassName="w-7 h-7"
                          roundedClassName="rounded-full"
                          role="cliente"
                        />
                        <span className="font-bold text-slate-900">{rev.clientName}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span className="font-bold text-slate-800">{rev.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-slate-600 mt-2 italic">"{rev.comment}"</p>
                    {rev.tags && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rev.tags.map((t, idx) => (
                          <span key={idx} className="bg-white border border-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">
                            ✓ {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
