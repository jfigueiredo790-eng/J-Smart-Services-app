import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  PhoneCall, 
  MessageSquare, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Info,
  Clock,
  Briefcase,
  UserCheck
} from 'lucide-react';

interface HelpSupportModalProps {
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'terms'>('faq');
  const [ticketSent, setTicketSent] = useState(false);
  const [messageText, setMessageText] = useState('');

  const faqs = [
    {
      q: 'Como funciona a Conta Única (Cliente + Profissional)?',
      a: 'A J Smart Services permite usar a mesma conta para procurar profissionais como Cliente e oferecer serviços como Profissional. Pode alternar de modo a qualquer momento no topo da aplicação com apenas 1 clique.'
    },
    {
      q: 'Como funciona o Período Gratuito de 14 dias para profissionais?',
      a: 'Todos os profissionais cadastrados em Angola recebem automaticamente 14 dias de teste 100% gratuito sem qualquer cobrança antecipada para experimentar a recepção de clientes.'
    },
    {
      q: 'Como funciona o sistema de negociação e pagamento dos serviços?',
      a: 'O cliente não paga o serviço através da J Smart Services. O preço surge como "💰 Preço: A combinar" e é negociado diretamente entre cliente e profissional através do chat. Após o acordo e realização do trabalho, o cliente paga diretamente ao profissional (em dinheiro, transferência ou Express), sem qualquer comissão retida pela plataforma.'
    },
    {
      q: 'Quando é que o chat de mensagens fica ativo?',
      a: 'O chat só fica desbloqueado depois que o profissional aceitar o pedido do cliente, garantindo segurança e privacidade a ambas as partes.'
    },
    {
      q: 'Quais são as regras de cancelamento de um pedido?',
      a: 'Tanto o cliente quanto o profissional podem cancelar sem custos enquanto o pedido estiver pendente ou antes do profissional estar a caminho.'
    }
  ];

  const handleSendTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    setTicketSent(true);
    setTimeout(() => {
      setTicketSent(false);
      setMessageText('');
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">Centro de Ajuda & Suporte</h2>
              <p className="text-xs text-slate-400">J Smart Services Angola • Atendimento 24/7</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-900 px-4 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'faq'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Perguntas Frequentes</span>
          </button>

          <button
            onClick={() => setActiveTab('contact')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'contact'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>Contactar Suporte</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'terms'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Termos e Regras</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {activeTab === 'faq' && (
            <div className="space-y-3">
              {faqs.map((f, idx) => (
                <div key={idx} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                    <span className="text-emerald-400 font-mono font-black">0{idx + 1}.</span>
                    {f.q}
                  </h4>
                  <p className="text-slate-400 leading-relaxed text-[11px] pl-6">{f.a}</p>
                </div>
              ))}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
                <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                  <span className="text-emerald-400 font-mono font-black">06.</span>
                  Com quem posso conversar na aplicação? (Regras de Comunicação)
                </h4>
                <p className="text-slate-400 leading-relaxed text-[11px] pl-6">
                  Por motivos de segurança e privacidade, os clientes conversam apenas com o profissional escolhido para um pedido. Clientes não conversam entre si, e profissionais não conversam entre outros profissionais.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a 
                  href="https://wa.me/244923000000" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-2xl flex items-center gap-3 transition-colors"
                >
                  <div className="p-3 bg-emerald-500 text-slate-950 rounded-xl font-black">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Atendimento via WhatsApp</h4>
                    <p className="text-[11px] text-emerald-300 font-bold mt-0.5">+244 923 000 000</p>
                    <p className="text-[10px] text-slate-400">Resposta em minutos</p>
                  </div>
                </a>

                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3">
                  <div className="p-3 bg-slate-800 text-emerald-400 rounded-xl font-black">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-xs">Linha Telefónica Directa</h4>
                    <p className="text-[11px] text-slate-300 font-bold mt-0.5">+244 222 000 900</p>
                    <p className="text-[10px] text-slate-400">Segunda a Sábado, 08h-20h</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Enviar Mensagem Directa à Equipa de Suporte
                </h4>

                {ticketSent && (
                  <div className="p-3 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mensagem enviada com sucesso! A equipa de apoio responderá brevemente.</span>
                  </div>
                )}

                <form onSubmit={handleSendTicket} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Qual a sua dúvida ou ocorrência?</label>
                    <textarea 
                      rows={3}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Descreva aqui o assunto..."
                      className="w-full text-xs p-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageText.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                  >
                    Enviar Mensagem de Suporte
                  </button>
                </form>
              </div>

            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-3 text-slate-300 leading-relaxed text-xs">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-emerald-400 text-xs">1. Direitos e Deveres do Cliente</h4>
                <p className="text-[11px] text-slate-400">
                  O cliente compromete-se a fornecer informações verdadeiras do local de atendimento em Angola e efetuar o pagamento combinado diretamente ao profissional sem comissão da plataforma.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-emerald-400 text-xs">2. Direitos e Deveres do Profissional</h4>
                <p className="text-[11px] text-slate-400">
                  O profissional tem 14 dias gratuitos no registo inicial. Deve manter a sua subscrição (semanal, quinzenal ou mensal) ativa para ser visível nas pesquisas. Em caso de expiração do plano, o perfil fica suspenso das pesquisas e listas até à renovação, mantendo intacto o histórico e avaliações.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <h4 className="font-extrabold text-emerald-400 text-xs">3. Regras Oficiais de Comunicação</h4>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li><strong className="text-white">Cliente ↔️ Profissional:</strong> ✅ Permitido exclusivamente no contexto de um pedido de serviço ativado.</li>
                  <li><strong className="text-white">Cliente ↔️ Cliente:</strong> ❌ Estritamente proibido. Clientes não podem contactar ou pesquisar outros clientes.</li>
                  <li><strong className="text-white">Profissional ↔️ Profissional:</strong> ❌ Estritamente proibido. Profissionais não podem contactar outros profissionais.</li>
                  <li><strong className="text-white">Administrador:</strong> Acesso de auditoria apenas quando necessário para resolver litígios e denúncias.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-rose-400 text-xs">4. Política Anti-Fraude e Segurança</h4>
                <p className="text-[11px] text-slate-400">
                  Práticas de spam, assédio ou comportamento fraudulento resultam na suspensão imediata da conta pela administração da J Smart Services.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>J Smart Services Angola 🇦🇴</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
