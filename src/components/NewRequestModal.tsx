import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ANGOLA_PROVINCES, UrgencyLevel, ProfessionalProfile } from '../types';
import { CategoryIcon } from './CategoryIcon';
import { UserAvatar } from './UserAvatar';
import { 
  X, 
  MapPin, 
  Calendar, 
  Clock, 
  Banknote, 
  Send, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface NewRequestModalProps {
  onClose: () => void;
  preSelectedPro?: ProfessionalProfile | null;
  preSelectedCategoryId?: string | null;
}

export const NewRequestModal: React.FC<NewRequestModalProps> = ({ onClose, preSelectedPro, preSelectedCategoryId }) => {
  const { categories, createServiceRequest, currentUser } = useApp();

  const [categoryId, setCategoryId] = useState<string>(
    preSelectedCategoryId || (preSelectedPro ? preSelectedPro.categories[0] : 'eletricista')
  );

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [province, setProvince] = useState<string>(currentUser.province || 'Luanda');
  const [address, setAddress] = useState<string>('');
  const [urgency, setUrgency] = useState<UrgencyLevel>('Normal');
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [budgetKz, setBudgetKz] = useState<number>(25000);

  const [errorMsg, setErrorMsg] = useState<string>('');

  const selectedCategoryObj = categories.find(c => c.id === categoryId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMsg('Por favor introduza o título do pedido.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor descreva o trabalho que precisa.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Por favor especifique a morada/bairro em Angola.');
      return;
    }

    createServiceRequest({
      categoryId,
      categoryName: selectedCategoryObj?.name || 'Serviço',
      title: title.trim(),
      description: description.trim(),
      province,
      address: address.trim(),
      urgency,
      scheduledDate,
      budgetKz: Number(budgetKz),
      professionalId: preSelectedPro?.id,
      professionalName: preSelectedPro?.name,
      professionalAvatar: preSelectedPro?.avatar || (preSelectedPro as any)?.photoURL || ''
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Solicitar Pedido de Serviço
            </h2>
            <p className="text-xs text-slate-500">
              {preSelectedPro ? `Pedido directo para ${preSelectedPro.name}` : 'Enviaremos o seu pedido para profissionais qualificados'}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preselected Pro banner if applicable */}
          {preSelectedPro && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-3">
              <UserAvatar 
                src={preSelectedPro.avatar || (preSelectedPro as any)?.photoURL} 
                name={preSelectedPro.name} 
                sizeClassName="w-10 h-10" 
                roundedClassName="rounded-xl" 
                role="profissional" 
              />
              <div>
                <p className="text-xs text-slate-500 font-medium">Profissional Seleccionado:</p>
                <p className="font-bold text-slate-900 text-sm">{preSelectedPro.name}</p>
              </div>
            </div>
          )}

          {/* Category Select */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Categoria do Serviço
              </label>

              <button
                type="button"
                onClick={() => {
                  setCategoryId('pedido-personalizado');
                  setTitle('Pedido Personalizado / Especial');
                  setErrorMsg('');
                }}
                className="text-[11px] font-black text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-xl transition-all flex items-center gap-1 border border-emerald-300"
              >
                <span>✍️ Não encontrou? Pedido Livre</span>
              </button>
            </div>

            {/* Category Dropdown with optgroups & Visual Grid */}
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs font-bold p-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none mb-2"
            >
              {Array.from(new Set(categories.map(c => c.group || 'Outros'))).map(groupName => (
                <optgroup key={groupName} label={`--- ${groupName} ---`}>
                  {categories.filter(c => (c.group || 'Outros') === groupName).map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            {/* Quick Pills Grid for active group or search */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 max-w-full text-xs">
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    categoryId === cat.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <CategoryIcon name={cat.iconName} className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Special Notice for Custom Request */}
            {categoryId === 'pedido-personalizado' && (
              <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs space-y-1 animate-fade-in shadow-xs">
                <p className="font-extrabold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Espaço de Pedido Personalizado</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Escreva livremente no campo abaixo o que precisa (mesmo que seja algo raro ou muito específico). Os profissionais em Angola verão o seu pedido e responderão com orçamentos!
                </p>
              </div>
            )}

            {/* Subcategories quick chips selector */}
            {categoryId !== 'pedido-personalizado' && selectedCategoryObj?.items && selectedCategoryObj.items.length > 0 && (
              <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                <p className="text-[11px] font-black uppercase text-emerald-800 tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Subcategorias de {selectedCategoryObj.name} (Clique para preencher o título):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategoryObj.items.map((subItem, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setTitle(subItem);
                        if (!description) {
                          setDescription(`Preciso de serviço de ${subItem} em ${province}. Por favor envie orçamento.`);
                        }
                        setErrorMsg('');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-extrabold rounded-xl border transition-all ${
                        title === subItem
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-slate-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/50'
                      }`}
                    >
                      + {subItem}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Custom Description Hint Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-2 text-xs text-slate-600">
            <span className="text-base shrink-0">✍️</span>
            <p className="text-[11px] leading-relaxed">
              <strong className="text-slate-900 font-extrabold">Dica:</strong> Pode detalhar livremente o seu problema ou tarefa. Se precisa de algo que não está escrito nas categorias, explique com as suas palavras abaixo!
            </p>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                2. Título do Pedido (Escreva o que precisa)
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => { setTitle(e.target.value); setErrorMsg(''); }}
                placeholder="Ex: Montagem de antena parabólica, reparação de fogão a gás, entrega de hambúrguer..."
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                3. Descrição Detalhada (Escreva livremente aqui)
              </label>
              <textarea 
                rows={3} 
                value={description} 
                onChange={(e) => { setDescription(e.target.value); setErrorMsg(''); }}
                placeholder="Escreva com as suas palavras tudo o que precisa: o que precisa de reparação ou montagem, modelos, quantidade, horário de preferência..."
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              ></textarea>
            </div>
          </div>

          {/* Location: Province & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Província
              </label>
              <select 
                value={province} 
                onChange={(e) => setProvince(e.target.value)}
                className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {ANGOLA_PROVINCES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Bairro / Endereço Completo
              </label>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => { setAddress(e.target.value); setErrorMsg(''); }}
                placeholder="Ex: Talatona, Condomínio Dolce Vita"
                className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Urgency & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" /> Urgência
              </label>
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['Normal', 'Urgente', 'Agendado'] as UrgencyLevel[]).map(u => (
                  <button
                    type="button"
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all ${
                      urgency === u ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Data Preferencial
              </label>
              <input 
                type="date" 
                value={scheduledDate} 
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-sm p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Budget Proposal in Kwanza */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Preço Indicativo / Proposta (Kz)
              </label>
              <span className="text-sm font-extrabold text-emerald-700">
                {Number(budgetKz).toLocaleString('pt-AO')} Kz
              </span>
            </div>
            <input 
              type="range" 
              min={5000} 
              max={250000} 
              step={5000}
              value={budgetKz} 
              onChange={(e) => setBudgetKz(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>5.000 Kz</span>
              <span>50.000 Kz</span>
              <span>150.000 Kz</span>
              <span>250.000+ Kz</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
              💡 <strong>Preço a Combinar:</strong> O preço do serviço é sempre negociado diretamente entre cliente e profissional no chat. O pagamento do serviço é feito diretamente ao profissional, sem intermediários ou comissões da J Smart Services.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-2xl transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm"
            >
              <span>Publicar Pedido de Serviço</span>
              <Send className="w-4 h-4" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
