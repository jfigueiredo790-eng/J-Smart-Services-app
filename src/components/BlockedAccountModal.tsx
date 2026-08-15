import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Phone, Mail, LogOut, MessageCircle } from 'lucide-react';

export const BlockedAccountModal: React.FC = () => {
  const { currentUser, logoutUser, platformSettings } = useApp();

  const isBlocked = Boolean(
    currentUser &&
    currentUser.id &&
    currentUser.id !== 'guest-client' &&
    (currentUser.blocked === true || currentUser.status === 'bloqueado' || (currentUser as any).accountStatus === 'BLOCKED')
  );

  if (!isBlocked) return null;

  const adminPhone = platformSettings?.adminPhoneWhatsapp || '956011985';
  const cleanPhone = adminPhone.replace(/\D/g, '');
  const adminEmail = platformSettings?.adminEmail || 'jfigueiredo790@gmail.com';

  const whatsappUrl = `https://wa.me/244${cleanPhone.startsWith('244') ? cleanPhone.slice(3) : cleanPhone}?text=${encodeURIComponent(
    `Olá J Smart Services Suporte, a minha conta (${currentUser.name} - ${currentUser.phone || currentUser.email}) encontra-se bloqueada. Gostaria de obter mais informações.`
  )}`;

  const mailtoUrl = `mailto:${adminEmail}?subject=${encodeURIComponent('Conta Bloqueada - J Smart Services')}&body=${encodeURIComponent(
    `Olá Administrador,\n\nA minha conta (${currentUser.name}, Tel: ${currentUser.phone || 'N/A'}, Email: ${currentUser.email || 'N/A'}) foi bloqueada na plataforma J Smart Services.\n\nPor favor solicito esclarecimentos sobre a reactivação da conta.\n\nObrigado.`
  )}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-400 text-center space-y-6">
        
        <div className="w-20 h-20 bg-rose-100 border-2 border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <ShieldAlert className="w-10 h-10 text-rose-600" />
        </div>

        <div className="space-y-2">
          <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-rose-200 inline-block">
            Acesso Restrito
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            Conta Bloqueada
          </h2>
          <p className="text-sm font-semibold text-slate-700 leading-relaxed bg-rose-50 border border-rose-200 p-4 rounded-2xl">
            Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left space-y-2 text-xs text-slate-600">
          <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
            🛡️ Proteção de Dados e Integridade:
          </p>
          <p className="text-slate-600 leading-relaxed">
            Os seus dados e o seu histórico permanecem integralmente guardados na nossa base de dados. Caso se trate de um mal-entendido ou necessite de regularização, contacte a equipa de suporte oficial.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span>Falar com o Suporte no WhatsApp (+244 956 011 985)</span>
          </a>

          <a
            href={mailtoUrl}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-200 transition-all flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4 text-slate-600" />
            <span>Enviar E-mail ao Administrador ({adminEmail})</span>
          </a>

          <button
            onClick={logoutUser}
            className="w-full py-2.5 text-rose-600 hover:text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>

      </div>
    </div>
  );
};
