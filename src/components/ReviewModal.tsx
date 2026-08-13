import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Star, 
  Check, 
  Sparkles, 
  Send 
} from 'lucide-react';

interface ReviewModalProps {
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ onClose }) => {
  const { reviewingRequestId, requests, submitReview, currentUser } = useApp();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Pontual', 'Profissional']);

  const targetReq = requests.find(r => r.id === reviewingRequestId);

  if (!targetReq || !targetReq.professionalId || targetReq.status !== 'concluido') {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-center space-y-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto font-black text-xl">
            ⚠️
          </div>
          <h2 className="text-base font-extrabold text-slate-900">Avaliação Não Permitida</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Apenas clientes que contrataram e concluíram o serviço com o profissional podem publicar uma avaliação. O serviço deve estar marcado como <strong>Concluído</strong>.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl text-xs"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  const availableTags = [
    'Pontual',
    'Profissional',
    'Preço Justo',
    'Trabalho Limpo',
    'Comunicação Excelente',
    'Muito Rápido',
    'Recomendado'
  ];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    submitReview({
      requestId: targetReq.id,
      professionalId: targetReq.professionalId!,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      rating,
      comment: comment.trim(),
      tags: selectedTags,
      categoryName: targetReq.categoryName
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Avaliar Serviço
            </h2>
            <p className="text-xs text-slate-500">
              Profissional: <strong className="text-slate-800">{targetReq.professionalName}</strong>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Interactive Star Rating */}
          <div className="text-center bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60">
            <span className="text-xs font-bold uppercase text-amber-900 block mb-2">Classificação Geral</span>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(rating)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`w-8 h-8 ${
                      star <= (hoverRating || rating)
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-extrabold text-amber-800 mt-2 block">
              {rating === 5 ? '🌟 Excelente serviço!' : rating === 4 ? '👍 Muito Bom' : rating === 3 ? 'Satisfatório' : 'Abaixo das expectativas'}
            </span>
          </div>

          {/* Service Quality Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Pontos Fortes do Profissional
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comment text area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Comentário sobre a experiência
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva a pontualidade, qualidade do trabalho e atendimento em Angola..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
              required
            ></textarea>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 text-xs"
          >
            <span>Publicar Avaliação</span>
            <Send className="w-4 h-4" />
          </button>

        </form>

      </div>
    </div>
  );
};
