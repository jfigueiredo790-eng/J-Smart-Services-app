import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  UserCheck, 
  Briefcase, 
  AlertTriangle, 
  Flag, 
  Gavel, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  FileText,
  CheckCircle2,
  Lock,
  MessageSquare
} from 'lucide-react';
import { CodeOfConductSection } from '../types';

interface RulesAndCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesAndCodeModal: React.FC<RulesAndCodeModalProps> = ({ isOpen, onClose }) => {
  const { codeOfConductRules, userRole, currentUser, setActiveTab } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSectionId, setOpenSectionId] = useState<string | null>('regras_gerais');
  const [activeFilterRole, setActiveFilterRole] = useState<'auto' | 'cliente' | 'profissional' | 'todos'>('auto');

  if (!isOpen) return null;

  // Determine effective user role for filtering
  const effectiveRole = activeFilterRole === 'auto' ? (userRole || currentUser.role || 'cliente') : activeFilterRole;

  // Filter sections according to user role
  const visibleSections = codeOfConductRules.filter(section => {
    if (effectiveRole === 'admin' || activeFilterRole === 'todos') {
      return true; // Admin or "todos" filter sees all
    }
    if (effectiveRole === 'cliente') {
      return section.targetRoleScope === 'todos' || section.targetRoleScope === 'cliente';
    }
    if (effectiveRole === 'profissional') {
      return section.targetRoleScope === 'todos' || section.targetRoleScope === 'profissional';
    }
    return true;
  });

  // Helper to map icon names to Lucide icons
  const renderSectionIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />;
      case 'UserCheck':
        return <UserCheck className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />;
      case 'Flag':
        return <Flag className="w-5 h-5 text-indigo-600 shrink-0" />;
      case 'Gavel':
        return <Gavel className="w-5 h-5 text-purple-600 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-600 shrink-0" />;
    }
  };

  const toggleSection = (id: string) => {
    setOpenSectionId(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
              📜
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Regras e Código de Conduta
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                J Smart Services Angola • Transparência e Segurança
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Scope Notice & Controls */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Visualização personalizada para:</span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
              {effectiveRole === 'cliente' ? '👤 Cliente' : effectiveRole === 'profissional' ? '🛠️ Profissional' : '👑 Administrador'}
            </span>
          </div>

          {/* Admin / Switcher filter */}
          {(currentUser.role === 'admin' || userRole === 'admin') && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Filtrar:</span>
              <button
                onClick={() => setActiveFilterRole('cliente')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  effectiveRole === 'cliente' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Cliente
              </button>
              <button
                onClick={() => setActiveFilterRole('profissional')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  effectiveRole === 'profissional' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Profissional
              </button>
              <button
                onClick={() => setActiveFilterRole('todos')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
                  activeFilterRole === 'todos' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Todos (Todas)
              </button>
            </div>
          )}
        </div>

        {/* Search bar inside Modal */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar regras, deveres, cancelamentos, pagamentos ou denúncias..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800"
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50/50">
          {visibleSections.map(section => {
            const isOpen = openSectionId === section.id;
            
            // Filter items by search query if present
            const filteredItems = searchQuery.trim() === ''
              ? section.items
              : section.items.filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()) || section.title.toLowerCase().includes(searchQuery.toLowerCase()));

            if (searchQuery.trim() !== '' && filteredItems.length === 0) {
              return null;
            }

            return (
              <div 
                key={section.id} 
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'border-emerald-300 shadow-md ring-1 ring-emerald-400/30' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                      {renderSectionIcon(section.iconName)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        {section.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 font-normal line-clamp-1">
                        {section.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                      {section.items.length} regras
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 space-y-3 animate-fade-in">
                    <p className="text-xs text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200 font-medium">
                      💡 {section.summary}
                    </p>

                    <div className="space-y-2.5">
                      {filteredItems.map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors"
                        >
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                            {idx + 1}
                          </span>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium">
                            {item}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Action button if section is Denúncias */}
                    {section.id === 'denuncias' && (
                      <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100">
                        <div className="text-xs text-indigo-950 font-medium">
                          <strong>Precisa de reportar uma infração urgente?</strong>
                          <p className="text-[11px] text-indigo-700 mt-0.5">A nossa equipa de apoio analisa todas as denúncias em 24h.</p>
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            setActiveTab('requests');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                        >
                          <Flag className="w-4 h-4" />
                          <span>Ir aos Pedidos para Denunciar</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700">Ao utilizar a J Smart Services, concorda com todas as diretrizes acimas dispostas.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-6 py-2.5 rounded-xl transition-all text-xs"
          >
            Compreendido e Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
