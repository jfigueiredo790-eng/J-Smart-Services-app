import React from 'react';
import { ServiceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { X, ChevronRight, Search, Plus, Sparkles, CheckCircle, ShieldCheck } from 'lucide-react';

interface SubcategoryModalProps {
  category: ServiceCategory;
  onClose: () => void;
  onSelectSubcategory: (subcategory: string) => void;
  onRequestService: (subcategory: string) => void;
}

export const SubcategoryModal: React.FC<SubcategoryModalProps> = ({
  category,
  onClose,
  onSelectSubcategory,
  onRequestService,
}) => {
  const items = category.items || category.subcategories || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-t-3xl border-b border-slate-800 sticky top-0 z-10">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-400/30">
                <CategoryIcon name={category.iconName} className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  {category.group || 'Especialidade'}
                </span>
                <h2 className="text-xl font-black text-white mt-1">
                  {category.name}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 mt-3 leading-relaxed font-medium">
            {category.description}
          </p>

          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/80 text-emerald-300">
            <span className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {category.popularCount}+ profissionais verificados
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold text-[11px] border border-emerald-500/20">
              {items.length} Subcategorias
            </span>
          </div>
        </div>

        {/* Modal Body: Subcategories List */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Selecione a Subcategoria Desejada:
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Clique para procurar ou solicitar
            </span>
          </div>

          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={index}
                className="group bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-2xl p-3.5 transition-all duration-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div 
                  onClick={() => onSelectSubcategory(item)}
                  className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                >
                  <div className="w-8 h-8 rounded-xl bg-white group-hover:bg-emerald-500 text-slate-700 group-hover:text-white border border-slate-200 group-hover:border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 transition-colors shadow-xs">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm group-hover:text-emerald-900 transition-colors break-words leading-snug">
                      {item}
                    </h4>
                    <p className="text-[11px] text-slate-500 group-hover:text-emerald-700 flex items-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Especialistas disponíveis em Luanda e províncias</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <button
                    onClick={() => onSelectSubcategory(item)}
                    className="flex-1 sm:flex-initial px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-extrabold text-[11px] rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-1"
                    title="Ver profissionais para esta subcategoria"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ver Pros</span>
                  </button>

                  <button
                    onClick={() => onRequestService(item)}
                    className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1"
                    title="Pedir serviço nesta subcategoria"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Pedir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action button to view all professionals for this category without filtering subcategory */}
          <div className="pt-2 space-y-2">
            {/* Custom Request Banner */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div>
                <h4 className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Não encontrou na lista acima?</span>
                </h4>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Escreva livremente o que precisa e receba orçamentos à sua medida!
                </p>
              </div>
              <button
                onClick={() => onRequestService('Pedido Personalizado')}
                className="w-full sm:w-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all shrink-0 flex items-center justify-center gap-1.5"
              >
                <span>✍️ Escrever Pedido Livre</span>
              </button>
            </div>

            <button
              onClick={() => onSelectSubcategory('')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs py-3 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-emerald-400" />
              <span>Ver Todos os Profissionais de {category.name}</span>
              <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
