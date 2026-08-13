import React from 'react';
import { ProfessionalProfile } from '../types';
import { useApp } from '../context/AppContext';
import { getProPlanStatus } from '../utils/planUtils';
import { 
  Star, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  Briefcase, 
  MessageSquare, 
  Send,
  AlertTriangle
} from 'lucide-react';

interface ProfessionalCardProps {
  pro: ProfessionalProfile;
  onOpenDetail: () => void;
  onRequestService: () => void;
}

export const ProfessionalCard: React.FC<ProfessionalCardProps> = ({ pro, onOpenDetail, onRequestService }) => {
  const { categories, setActiveTab, setActiveChatRequestId, requests, currentUser } = useApp();

  const proPlan = getProPlanStatus(pro);

  // Find category names
  const proCatNames = pro.categories
    .map(cId => categories.find(cat => cat.id === cId)?.name)
    .filter(Boolean);

  // Quick chat handler
  const handleDirectChat = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (currentUser.role === 'profissional') {
      alert('Está a navegar no Modo Profissional. Para conversar com um prestador, alterne o seu perfil para o Modo Cliente.');
      return;
    }

    if (currentUser.id === pro.id) {
      alert('Não é possível iniciar conversa com o seu próprio perfil profissional.');
      return;
    }

    if (proPlan.isExpired) {
      alert('Este profissional encontra-se temporariamente em renovação de plano e não pode receber mensagens ou novos pedidos no momento.');
      return;
    }

    // Look for existing request strictly between this client and this pro
    const existingReq = requests.find(r => r.professionalId === pro.id && r.clientId === currentUser.id);
    if (existingReq) {
      setActiveChatRequestId(existingReq.id);
      setActiveTab('chat');
    } else {
      // Open detail to request service first
      onRequestService();
    }
  };

  const handleRequestClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (currentUser.role === 'profissional') {
      alert('Está no Modo Profissional. Mude para o Modo Cliente no seu perfil para solicitar um serviço.');
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

    onRequestService();
  };

  return (
    <div 
      onClick={onOpenDetail}
      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top Header: Avatar, Name, Rating & Verified */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <img 
              src={pro.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80'} 
              alt={pro.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-100 shadow-sm"
            />
            {pro.verified && (
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5" title="Profissional Verificado">
                <CheckCircle2 className="w-4 h-4 text-white fill-emerald-600" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="font-bold text-slate-900 text-base truncate flex items-center gap-1.5">
                {pro.name}
              </h3>
              <div className="flex items-center gap-1">
                {proPlan.isExpired ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1" title="Subscrição inativa">
                    ⚪ Subscrição inativa
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Disponível
                  </span>
                )}
                <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span className="text-xs font-bold text-amber-900">{pro.rating}</span>
                  <span className="text-[10px] text-amber-700">({pro.reviewCount})</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="truncate">{pro.city || pro.province}</span>
            </p>

            {/* Category Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {proCatNames.map((catName, idx) => (
                <span 
                  key={idx}
                  className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100"
                >
                  {catName}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio excerpt */}
        <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
          {pro.bio}
        </p>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <span><strong className="text-slate-900 font-bold">{pro.completedJobs}</strong> serviços concluídos</span>
          </div>
          <div className="flex flex-col justify-center gap-0.5 text-slate-600">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Exp: <strong className="text-slate-900 font-bold">{pro.experienceYears || 0} anos</strong></span>
            </div>
            {pro.experienceVerified ? (
              <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300 self-start">
                ✅ Experiência verificada
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 self-start">
                ⚪ Não verificada
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Price (A combinar) and Primary Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div>
          <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider block">Preço do Serviço</span>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg inline-block mt-0.5">
            💰 Preço: A combinar
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDirectChat}
            title="Chat com Profissional"
            className="p-2 text-slate-700 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition-colors border border-slate-200"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={handleRequestClick}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm shadow-emerald-600/20"
          >
            <span>Pedir Serviço</span>
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
