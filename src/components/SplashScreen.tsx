import React from 'react';
import { BrandLogo } from './BrandLogo';
import { 
  Zap, 
  ShieldCheck, 
  MapPin, 
  ArrowRight, 
  Briefcase, 
  User, 
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface SplashScreenProps {
  onStart: (role?: 'cliente' | 'profissional' | 'admin') => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 relative overflow-hidden">
      
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Top Bar */}
      <div className="flex justify-between items-center relative z-10">
        <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Angola 🇦🇴
        </div>
      </div>

      {/* Hero Center Brand */}
      <div className="my-auto text-center max-w-md mx-auto relative z-10 py-8 space-y-4">
        
        {/* Logo Emblem */}
        <div className="flex justify-center mb-2">
          <BrandLogo size="xl" showTagline />
        </div>

        <p className="text-slate-400 text-sm mt-3 leading-relaxed font-medium">
          A plataforma moderna de conexão direta entre clientes e profissionais de serviços qualificados em Angola.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
          <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Eletricistas & Ar-Condicionado
          </span>
          <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Canalizadores & Pintores
          </span>
          <span className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verificação de Identidade
          </span>
        </div>

      </div>

      {/* Bottom Action Section */}
      <div className="max-w-md mx-auto w-full relative z-10 space-y-3">
        
        <p className="text-[11px] text-center text-slate-400 uppercase tracking-wider font-semibold">
          Escolha como deseja entrar na aplicação:
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onStart('cliente')}
            className="bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-600/30 active:scale-95"
          >
            <User className="w-5 h-5 text-emerald-200" />
            <span>Sou Cliente</span>
          </button>

          <button
            onClick={() => onStart('profissional')}
            className="bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40 p-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95"
          >
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <span>Sou Profissional</span>
          </button>
        </div>

        <button
          onClick={() => onStart('cliente')}
          className="w-full text-center text-xs text-slate-400 hover:text-white py-2 font-semibold flex items-center justify-center gap-1"
        >
          <span>Explorar como visitante</span>
          <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
        </button>

      </div>

    </div>
  );
};
