import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only' | 'light' | 'dark';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  variant = 'full',
  showTagline = false,
  className = '',
  onClick
}) => {
  // Size mapping for icon badge
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-20 h-20'
  };

  // Typography size mapping
  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm sm:text-base',
    lg: 'text-xl sm:text-2xl',
    xl: 'text-3xl sm:text-4xl'
  };

  const badgePadding = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
    xl: 'p-3'
  };

  return (
    <div 
      onClick={onClick} 
      className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Symbol Badge: Prominent 'J' combined with interconnection nodes (Client & Pro) */}
      <div className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 shrink-0 ${iconSizes[size]} ${badgePadding[size]}`}>
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Subtle Connection Ring */}
          <circle cx="20" cy="20" r="16" stroke="#022c22" strokeOpacity="0.2" strokeWidth="2" strokeDasharray="3 3" />
          
          {/* Node 1: Cliente (Top Left) */}
          <circle cx="10" cy="12" r="3.5" fill="#022c22" />
          
          {/* Node 2: Profissional (Bottom Right) */}
          <circle cx="30" cy="28" r="3.5" fill="#022c22" />
          
          {/* Connection Arc (Liga Cliente ao Profissional) */}
          <path d="M12 14 C 18 20, 22 22, 28 26" stroke="#022c22" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* The High-Prominence Letter 'J' (White for maximum clarity) */}
          <path d="M22 9 H27 V23 C27 28.5 22.5 31.5 17 31.5 C12.5 31.5 10.5 28.8 10.5 26" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Technology & Trust Sparkle */}
          <polygon points="29,10 30.5,13 33.5,14.5 30.5,16 29,19 27.5,16 24.5,14.5 27.5,13" fill="#ffffff" />
        </svg>
      </div>

      {/* Typography: J Smart Services */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight ${titleSizes[size]} ${variant === 'light' ? 'text-slate-900' : 'text-white'}`}>
            J SMART <span className="text-emerald-400 font-extrabold">SERVICES</span>
          </div>
          {showTagline && (
            <span className={`text-[10px] uppercase font-extrabold tracking-widest mt-1 ${variant === 'light' ? 'text-emerald-700' : 'text-emerald-400/90'}`}>
              Conexão • Confiança • Angola 🇦🇴
            </span>
          )}
        </div>
      )}
    </div>
  );
};
