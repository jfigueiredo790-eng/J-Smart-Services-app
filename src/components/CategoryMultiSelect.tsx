import React, { useState } from 'react';
import { ServiceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { Check, AlertCircle, Sparkles } from 'lucide-react';

interface CategoryMultiSelectProps {
  categories: ServiceCategory[];
  selectedCategories: string[];
  onChange: (selected: string[]) => void;
  maxAllowed?: number;
}

export const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
  categories,
  selectedCategories,
  onChange,
  maxAllowed = 7,
}) => {
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const toggleCategory = (catId: string) => {
    const isAlreadySelected = selectedCategories.includes(catId);

    if (isAlreadySelected) {
      if (selectedCategories.length <= 1) {
        setWarningMsg('Deve selecionar pelo menos 1 área de atuação.');
        setTimeout(() => setWarningMsg(null), 3000);
        return;
      }
      onChange(selectedCategories.filter(id => id !== catId));
      setWarningMsg(null);
    } else {
      if (selectedCategories.length >= maxAllowed) {
        setWarningMsg(`Pode selecionar no máximo ${maxAllowed} áreas diferentes.`);
        setTimeout(() => setWarningMsg(null), 4000);
        return;
      }
      onChange([...selectedCategories, catId]);
      setWarningMsg(null);
    }
  };

  return (
    <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Áreas de Atuação / Profissões (Até {maxAllowed}) *</span>
          </label>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            Ex: Se é electrecista e pedreiro, selecione ambas as áreas.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border transition-all ${
            selectedCategories.length >= maxAllowed
              ? 'bg-amber-100 text-amber-900 border-amber-300'
              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
          }`}>
            {selectedCategories.length} de {maxAllowed} Selecionadas
          </span>
        </div>
      </div>

      {warningMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold p-2.5 rounded-xl flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{warningMsg}</span>
        </div>
      )}

      {/* Grid of category selector chips */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const isSelected = selectedCategories.includes(cat.id);
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all text-xs font-bold ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50'
              }`}
            >
              <div className={`p-1.5 rounded-lg shrink-0 ${
                isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                <CategoryIcon name={cat.iconName} className="w-3.5 h-3.5" />
              </div>

              <span className="truncate flex-1 text-[11px] leading-tight">
                {cat.name}
              </span>

              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-white text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-400 italic pt-0.5">
        * Selecionar todas as suas especialidades aumenta as hipóteses de receber mais pedidos de clientes.
      </p>
    </div>
  );
};
