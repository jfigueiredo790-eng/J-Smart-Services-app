import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { 
  UserRole, 
  ANGOLA_PROVINCES 
} from '../types';
import { 
  ShieldCheck, 
  MapPin, 
  ChevronDown, 
  Smartphone, 
  Maximize2, 
  RefreshCw,
  Briefcase,
  User,
  Bell,
  Wallet,
  Lock,
  Wifi,
  WifiOff,
  TestTube
} from 'lucide-react';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    userRole, 
    switchRole, 
    selectedProvince, 
    setSelectedProvince,
    isMobileFrame,
    setIsMobileFrame,
    resetDemoData,
    requests,
    activeTab,
    setActiveTab,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    isLoggedIn,
    logoutUser,
    isOnline,
    setIsOnline,
    setIsTestSuiteOpen
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isProvinceDropdownOpen, setIsProvinceDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // Count active requests for notifications
  const activeCount = requests.filter(r => r.status === 'pendente' || r.status === 'em_progresso').length;
  const walletBalance = currentUser.walletBalanceKz || (userRole === 'cliente' ? 50000 : 85000);

  const isAdmin = currentUser.role === 'admin' || userRole === 'admin';

  return (
    <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md border-b border-slate-800">
      {/* Top Header Main Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        
        {/* Left: Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-3 shrink-0">
          <BrandLogo 
            size="md" 
            showTagline 
            onClick={() => setActiveTab('home')} 
          />

          {/* Center Province Selector (Visible on all screens) */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setIsProvinceDropdownOpen(!isProvinceDropdownOpen)}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1.5 rounded-full border border-slate-700 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-[130px]">
                {selectedProvince === 'Todas' ? 'Toda Angola' : selectedProvince}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {isProvinceDropdownOpen && (
              <div className="absolute top-full mt-2 left-0 w-52 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 max-h-60 overflow-y-auto">
                <button
                  onClick={() => { setSelectedProvince('Todas'); setIsProvinceDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${selectedProvince === 'Todas' ? 'text-emerald-400 font-bold bg-slate-750' : 'text-slate-300'}`}
                >
                  🇦🇴 Todas as Províncias
                </button>
                {ANGOLA_PROVINCES.map(prov => (
                  <button
                    key={prov}
                    onClick={() => { setSelectedProvince(prov); setIsProvinceDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 transition-colors ${selectedProvince === prov ? 'text-emerald-400 font-bold bg-slate-750' : 'text-slate-300'}`}
                  >
                    📍 {prov}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Controls: Network Connection, Test Suite (Admin Only), User Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">

          {/* Admin Portal Shortcut Button (Only visible for Administrators) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('admin')}
              title="👑 Portal do Administrador"
              className="p-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline text-[10px] font-extrabold uppercase tracking-wide">Admin</span>
            </button>
          )}

          {/* Network Connection Toggle Button (Wi-Fi) */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            title={isOnline ? "Estado da Conexão: Online" : "Estado da Conexão: Offline"}
            className={`p-2 rounded-lg border transition-colors ${
              isOnline 
                ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700' 
                : 'bg-amber-950/80 hover:bg-amber-900 text-amber-400 border-amber-600/60 animate-pulse'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-4 h-4 text-emerald-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-400" />
            )}
          </button>

          {/* Test Suite Button & Admin Tools (Exclusivo para Administrador) */}
          {isAdmin && (
            <>
              <button
                onClick={() => setIsTestSuiteOpen(true)}
                title="Suíte de Testes Automáticos (Administrador)"
                className="p-2 text-emerald-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1"
              >
                <TestTube className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Device Frame Toggle */}
              <button
                onClick={() => setIsMobileFrame(!isMobileFrame)}
                title={isMobileFrame ? "Expandir para tela cheia" : "Modo Moldura de Telemóvel"}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              >
                {isMobileFrame ? (
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                )}
              </button>

              {/* Reset Demo State Button */}
              <button
                onClick={resetDemoData}
                title="Reiniciar Dados de Demonstração"
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-slate-400 hover:rotate-180 transition-transform duration-300" />
              </button>
            </>
          )}

          {/* User Profile Button */}
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white px-2.5 py-1.5 rounded-2xl transition-all text-xs font-semibold"
            title="Ver Perfil e Definições da Conta"
          >
            <img 
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
              alt={currentUser.name} 
              className="w-6 h-6 rounded-full object-cover border border-emerald-500/50"
            />
            <span className="font-bold text-xs max-w-[100px] truncate">{currentUser.name}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
          </button>

        </div>

      </div>
    </header>
  );
};


