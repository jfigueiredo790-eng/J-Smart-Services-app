import React from 'react';
import { ServiceCategory } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { ChevronRight, Layers } from 'lucide-react';

interface CategoryCardProps {
  category: ServiceCategory;
  onClick: () => void;
  isSelected?: boolean;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick, isSelected }) => {
  const subCount = category.items?.length || category.subcategories?.length || 0;

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between ${
        isSelected
          ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 scale-[1.02]'
          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl transition-colors ${
          isSelected 
            ? 'bg-emerald-700/60 text-white' 
            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
        }`}>
          <CategoryIcon name={category.iconName} className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600'
          }`}>
            {category.popularCount}+ pros
          </span>
          {subCount > 0 && (
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${
              isSelected ? 'bg-emerald-800/80 text-emerald-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            }`}>
              <Layers className="w-2.5 h-2.5" />
              {subCount} subcategorias
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between">
          <h3 className={`font-extrabold text-sm tracking-tight ${isSelected ? 'text-white' : 'text-slate-900 group-hover:text-emerald-700'}`}>
            {category.name}
          </h3>
          <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-emerald-200' : 'text-slate-400 group-hover:text-emerald-600'}`} />
        </div>
        <p className={`text-[11px] line-clamp-2 mt-0.5 leading-relaxed ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
          {category.description}
        </p>
      </div>
    </div>
  );
};

