import React, { useState, useEffect, useRef } from 'react';
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
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
  }, [src]);

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const handleImageError = () => {
    // Auto-retry up to 2 times for transient network dropouts
    if (retryCount < 2 && src && !src.startsWith('data:')) {
      const nextAttempt = retryCount + 1;
      setRetryCount(nextAttempt);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        setImageError(false);
      }, 1500 * nextAttempt);
    } else {
      setImageError(true);
    }
  };

  const isInvalidOrFake = isStockOrFictitiousAvatar(src);
  const shouldShowImage = Boolean(src && !isInvalidOrFake && !imageError);
  const initials = getUserInitials(name);

  // Compute final image source with cache buster on retry if needed
  const getComputedSrc = () => {
    if (!src) return '';
    if (retryCount > 0 && !src.startsWith('data:')) {
      const sep = src.includes('?') ? '&' : '?';
      return `${src}${sep}_retry=${retryCount}`;
    }
    return src;
  };

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
          src={getComputedSrc()}
          alt={alt || name}
          onError={handleImageError}
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
