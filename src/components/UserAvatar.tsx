import React, { useState, useEffect } from 'react';
import { User as UserIcon, CheckCircle2, ShieldCheck, Crown } from 'lucide-react';
import { isStockOrFictitiousAvatar, getUserInitials } from '../utils/imageUtils';

interface UserAvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
  sizeClassName?: string;
  alt?: string;
  role?: 'cliente' | 'profissional' | 'admin' | string;
  isVerified?: boolean;
  showVerifiedBadge?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  roundedClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = 'Utilizador',
  className = '',
  sizeClassName = 'w-10 h-10',
  alt,
  role,
  isVerified = false,
  showVerifiedBadge = false,
  onClick,
  roundedClassName = 'rounded-2xl'
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const isInvalidOrFake = isStockOrFictitiousAvatar(src);
  const shouldShowImage = Boolean(src && !isInvalidOrFake && !imageError);
  const initials = getUserInitials(name);

  // Neutral, elegant color gradient for avatar fallback based on user role or name hash
  const getFallbackColor = () => {
    if (role === 'admin') return 'bg-amber-600 text-white border-amber-400';
    if (role === 'profissional') return 'bg-emerald-600 text-white border-emerald-500';
    return 'bg-slate-700 text-white border-slate-600';
  };

  return (
    <div 
      className={`relative inline-block shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {shouldShowImage ? (
        <img
          src={src!}
          alt={alt || name}
          onError={() => setImageError(true)}
          className={`${sizeClassName} ${roundedClassName} object-cover border border-slate-200/80 shadow-sm`}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      ) : (
        <div
          className={`${sizeClassName} ${roundedClassName} ${getFallbackColor()} flex items-center justify-center font-extrabold text-xs shadow-sm border select-none tracking-wider`}
          title={name}
        >
          {initials || <UserIcon className="w-1/2 h-1/2 opacity-80" />}
        </div>
      )}

      {showVerifiedBadge && isVerified && (
        <span 
          className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 rounded-full shadow-sm border border-white"
          title="Verificado pela J Smart Services"
        >
          <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" />
        </span>
      )}
    </div>
  );
};
