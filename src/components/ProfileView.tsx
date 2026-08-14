import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { HelpSupportModal } from './HelpSupportModal';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { ANGOLA_PROVINCES, UserRole, AccountType } from '../types';
import { compressImageFile } from '../utils/imageUtils';
import { 
  User as UserIcon, 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Briefcase, 
  FileText, 
  Award, 
  Save, 
  RefreshCw,
  LogOut,
  Sliders,
  HelpCircle,
  PhoneCall,
  Star,
  Bookmark,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Zap,
  ArrowRightLeft,
  Crown,
  Camera,
  Image,
  Upload,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { currentUser, userRole, updateUserProfile, resetDemoData, switchRole, logoutUser, categories, professionals, requests, setActiveTab, setIsRulesModalOpen } = useApp();

  const [name, setName] = useState(currentUser.name);
  const [phone, setPhone] = useState(currentUser.phone);
  const [gender, setGender] = useState<'masculino' | 'feminino'>(currentUser.gender || 'masculino');
  const [email, setEmail] = useState(currentUser.email);
  const [province, setProvince] = useState(currentUser.province || 'Luanda');
  const [documentNumber, setDocumentNumber] = useState(currentUser.documentNumber || '');
  const [showBIDigits, setShowBIDigits] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(currentUser.accountType || 'duplo');
  const [bio, setBio] = useState('bio' in currentUser ? (currentUser as any).bio : 'Cliente ativo na plataforma J Smart Services Angola.');
  const [hourlyRateKz, setHourlyRateKz] = useState('hourlyRateKz' in currentUser ? (currentUser as any).hourlyRateKz : 15000);
  const [experienceYears, setExperienceYears] = useState<number>('experienceYears' in currentUser ? (Number((currentUser as any).experienceYears) >= 0 ? Number((currentUser as any).experienceYears) : 0) : 0);
  
  const initialCategories = 'categories' in currentUser && Array.isArray((currentUser as any).categories) && (currentUser as any).categories.length > 0
    ? (currentUser as any).categories
    : [categories[0]?.id || 'eletricista'];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [avatar, setAvatar] = useState(currentUser.avatar || '');

  useEffect(() => {
    setName(currentUser.name);
    setPhone(currentUser.phone);
    setGender(currentUser.gender || 'masculino');
    setEmail(currentUser.email);
    setProvince(currentUser.province || 'Luanda');
    setDocumentNumber(currentUser.documentNumber || '');
    if (currentUser.avatar) {
      setAvatar(currentUser.avatar);
    }
  }, [currentUser]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 600, 0.82);
        setAvatar(compressed);
        updateUserProfile({ avatar: compressed });
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (err) {
        console.error('Erro ao processar imagem da galeria:', err);
        alert('Não foi possível carregar esta fotografia da galeria. Tente outra imagem.');
      }
    }
  };

  const isProAvailable = (currentUser as any).status !== 'ocupado';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      name,
      phone,
      gender,
      email,
      province,
      documentNumber: documentNumber.trim(),
      ...(currentUser.role === 'admin' ? { accountType } : {}),
      avatar: avatar || currentUser.avatar,
      categories: selectedCategories,
      bio,
      experienceYears: Math.max(0, Number(experienceYears) || 0),
      hourlyRateKz: Number(hourlyRateKz)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleProAvailability = () => {
    updateUserProfile({
      status: isProAvailable ? 'ocupado' : 'disponivel'
    });
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Hidden file input for opening phone gallery */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Top Banner Card with Unified Mode Switcher */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
          <div 
            className="relative group cursor-pointer shrink-0" 
            onClick={() => fileInputRef.current?.click()}
            title="Clique para abrir a galeria e escolher uma foto de perfil"
          >
            <img 
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
              alt={currentUser.name} 
              className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-400 shadow-md group-hover:opacity-80 transition-all"
            />
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="absolute -bottom-1 -right-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1.5 rounded-full shadow-lg border-2 border-slate-900 transition-transform hover:scale-110 flex items-center justify-center"
              title="Abrir Galeria para escolher Foto de Perfil"
            >
              <Camera className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-xl font-extrabold text-white">{currentUser.name}</h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full inline-block">
                {currentUser.role === 'admin'
                  ? '👑 Conta de Administrador (Super Admin)'
                  : currentUser.accountType === 'cliente' 
                    ? '👤 Conta Apenas Cliente' 
                    : currentUser.accountType === 'profissional' 
                      ? '🛠️ Conta Apenas Profissional' 
                      : '🔄 Conta Cliente + Profissional (Dupla)'}
              </span>
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentUser.province} • Angola</span>
            </p>

            {/* Quick Mode Switcher & Account Type Selector */}
            {currentUser.role === 'admin' ? (
              <div className="mt-4 p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    Sessão do Administrador Principal
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Acesso exclusivo ao Painel do Administrador para aprovação de pacotes, movimentação financeira e gestão total de contas.
                  </p>
                </div>
                <button
                  onClick={() => setIsHelpModalOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition-colors shrink-0"
                  title="Ajuda & Suporte"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            ) : (
              <div className="mt-4 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <p className="text-[11px] font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                    Modo Ativo: <span className="text-emerald-400 uppercase font-black">{userRole}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {currentUser.accountType === 'cliente' 
                      ? 'Conta de Cliente registada. Acesso para pesquisar, solicitar orçamentos e contratar serviços em Angola.'
                      : currentUser.accountType === 'duplo' 
                        ? 'Conta Dupla ativa: acesso às duas vertentes (Pedir e Prestar serviços). Alterne o modo a qualquer momento.'
                        : 'Conta de Profissional registada para oferecer e prestar serviços em Angola.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {currentUser.accountType === 'duplo' && (
                    <button
                      onClick={() => switchRole(userRole === 'cliente' ? 'profissional' : 'cliente')}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>{userRole === 'cliente' ? 'Mudar para Profissional' : 'Mudar para Cliente'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl border border-slate-700 transition-colors"
                    title="Ajuda & Suporte"
                  >
                    <HelpCircle className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Role-Specific Capabilities Banner */}
      {userRole === 'cliente' ? (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              Funcionalidades Ativas no Modo Cliente
            </h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Cliente Ativo
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="font-extrabold text-slate-900 block">🔍 Procurar Profissionais</span>
              <span className="text-[10px] text-slate-500">Filtrar por província e categoria.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="font-extrabold text-slate-900 block">📋 Pedir Serviços</span>
              <span className="text-[10px] text-slate-500">Enviar solicitação com orçamento Kz.</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="font-extrabold text-slate-900 block">⭐ Avaliar Trabalhos</span>
              <span className="text-[10px] text-slate-500">Classificação de 1 a 5 estrelas.</span>
            </div>
          </div>
        </div>
      ) : userRole === 'profissional' ? (
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Funcionalidades Ativas no Modo Profissional
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">
                <strong className={isProAvailable ? 'text-emerald-400' : 'text-amber-400'}>
                  {isProAvailable ? '🟢 Disponível' : '🔴 Indisponível'}
                </strong>
              </span>
              <button
                onClick={toggleProAvailability}
                className={`p-1 rounded-xl transition-all ${isProAvailable ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
                title="Alternar Estado de Disponibilidade"
              >
                {isProAvailable ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="font-extrabold text-emerald-300 block">📩 Receber Pedidos</span>
              <span className="text-[10px] text-slate-400">Aceitar ou recusar em direto.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="font-extrabold text-emerald-300 block">📅 Agenda de Trabalhos</span>
              <span className="text-[10px] text-slate-400">Histórico e tarefas ativas.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="font-extrabold text-emerald-300 block">🎁 Teste Grátis 14 Dias</span>
              <span className="text-[10px] text-slate-400">Sem cobrança antecipada.</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <span className="font-extrabold text-emerald-300 block">🖼️ Portefólio</span>
              <span className="text-[10px] text-slate-400">Galeria de trabalhos feitos.</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Verification Status Banner for Professionals */}
      {userRole === 'profissional' && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Estado de Verificação de Documentos</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {currentUser.verified ? 'Documentação BI & Alvará de serviço aprovados em Angola.' : 'Pendente de aprovação pelo Administrador.'}
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${currentUser.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
            {currentUser.verified ? 'Aprovado' : 'Em Análise'}
          </span>
        </div>
      )}

      {/* Common Section: Help Center & Support Contact */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 shrink-0">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white">Centro de Ajuda & Contactar Suporte</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Dúvidas sobre pagamentos em Kwanzas, regras ou suporte técnico? Fale com a equipa J Smart.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsHelpModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Abrir Suporte 24/7</span>
        </button>
      </div>

      {/* Edit Profile Form */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-emerald-600" />
          Editar Dados de Utilizador
        </h3>

        {savedSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold mb-4">
            ✓ Perfil atualizado com sucesso!
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Foto de Perfil (Abrir Galeria) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img 
                src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                alt={currentUser.name} 
                className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
              />
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Foto de Perfil</span>
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Selecione uma imagem da galeria do seu telemóvel ou computador.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0"
            >
              <Image className="w-4 h-4" />
              <span>Abrir Galeria</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Género</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'masculino' | 'feminino')}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="masculino">👨 Masculino</option>
                <option value="feminino">👩 Feminino</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Telefone (+244 Angola)</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Província Principal em Angola</label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              {ANGOLA_PROVINCES.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 🔒 Nº do Bilhete de Identidade (BI) - Área Privada e Confidencial */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Nº do Bilhete de Identidade (BI)</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                    🔒 Confidencial & Pessoal
                  </span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Visível <strong>apenas por si</strong> e pela <strong>Administração</strong> para validação e segurança em Angola. Nunca é exibido a outros utilizadores nem em áreas públicas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBIDigits(!showBIDigits)}
                className="text-xs font-extrabold text-slate-700 hover:text-emerald-700 bg-white border border-slate-200 hover:border-emerald-300 px-3 py-1.5 rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5 self-start sm:self-center"
                title={showBIDigits ? "Ocultar dígitos do BI" : "Revelar dígitos do BI"}
              >
                {showBIDigits ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ocultar</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Visualizar</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input 
                type={showBIDigits ? "text" : "password"} 
                value={documentNumber} 
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: 004821943LA041"
                className="w-full text-xs font-mono font-bold tracking-wider p-3 rounded-xl border border-slate-200 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              />
            </div>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>🛡️ Documento protegido conforme a política de privacidade da J Smart Services.</span>
            </p>
          </div>

          {currentUser.role !== 'admin' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Registo da Conta</label>
              <div className="w-full text-xs p-3.5 rounded-xl border border-slate-200 bg-slate-50 font-extrabold text-slate-800 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-slate-900">
                    {(currentUser.accountType || accountType) === 'cliente'
                      ? '1. Conta Cliente (Pedir e contratar serviços)'
                      : (currentUser.accountType || accountType) === 'profissional'
                        ? '2. Conta Profissional (Oferecer serviços)'
                        : '2. Conta Dupla (Cliente + Profissional 2 em 1)'}
                  </span>
                </div>
                <span className="text-[10px] bg-slate-200/80 text-slate-600 font-bold px-2.5 py-1 rounded-lg shrink-0">
                  Fixado
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>O tipo de conta permanece conforme criou no registo. Apenas o administrador pode alterar.</span>
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                <span>Tipo de Registo da Conta</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Edição de Admin</span>
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as AccountType)}
                className="w-full text-xs p-3 rounded-xl border border-amber-300 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-amber-50/30"
              >
                <option value="cliente">👤 1. Conta Cliente (Pedir e contratar serviços)</option>
                <option value="profissional">🛠️ 2. Conta Profissional (Oferecer serviços)</option>
                <option value="duplo">🔄 3. Conta Dupla (Cliente + Profissional 2 em 1)</option>
              </select>
            </div>
          )}

          {(userRole === 'profissional' || accountType === 'profissional' || accountType === 'duplo') && (
            <>
              <CategoryMultiSelect
                categories={categories}
                selectedCategories={selectedCategories}
                onChange={setSelectedCategories}
                maxAllowed={7}
              />

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Anos de Experiência na Área</span>
                  </span>
                  {'experienceVerified' in currentUser && (currentUser as any).experienceVerified ? (
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                      ✅ Experiência verificada
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      ⚪ Não verificada
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="0"
                    max="60"
                    value={experienceYears} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setExperienceYears(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">anos</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                  Exemplo: 5 anos. Nota: A informação declarada é de sua responsabilidade e inicialmente é classificada como não verificada até confirmação do Administrador.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Biografia e Apresentação</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs space-y-1">
                <span className="font-extrabold text-emerald-900 block">💰 Preço dos Serviços: A Combinar</span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Os preços dos seus serviços aparecem no perfil para todos os clientes como <strong>💰 Preço: A combinar</strong>. O valor é negociado diretamente por si com o cliente através do chat antes da realização do trabalho.
                </p>
              </div>
            </>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Alterações</span>
            </button>
          </div>

        </form>
      </div>

      {/* Platform Rules & Code of Conduct Button Link */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-lg shrink-0">
            📜
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
              Regras e Código de Conduta
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Consulte os direitos, deveres, código de conduta, denúncias e medidas disciplinares da plataforma.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsRulesModalOpen(true)}
          className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
        >
          <span>📜 Ver Regras e Código de Conduta</span>
        </button>
      </div>

      {/* Account & Session Actions */}
      <div className="bg-slate-100 rounded-3xl p-5 border border-slate-200 space-y-4">
        {/* Reset Demo - Apenas visível para perfil Administrador */}
        {userRole === 'admin' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h4 className="font-bold text-slate-900 text-xs">Reset de Dados de Demonstração</h4>
              <p className="text-xs text-slate-500 mt-0.5">Restaurar a lista original de pedidos, mensagens e avaliações.</p>
            </div>
            <button
              onClick={resetDemoData}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Restaurar Demo</span>
            </button>
          </div>
        )}

        {/* Acções da Conta e Sessão */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {(currentUser.role === 'admin' || userRole === 'admin') && (
            <button
              onClick={() => setActiveTab('admin')}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
              title="Acesso ao Painel Administrativo da J Smart Services"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>👑 Aceder ao Painel Administrativo</span>
            </button>
          )}

          {/* Terminar Sessão (Logout) */}
          <button
            onClick={() => {
              if (window.confirm('Tem a certeza que deseja terminar a sessão?')) {
                logoutUser();
              }
            }}
            className="w-full sm:w-auto ml-auto bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Terminar Sessão</span>
          </button>
        </div>
      </div>

      {isHelpModalOpen && (
        <HelpSupportModal onClose={() => setIsHelpModalOpen(false)} />
      )}

    </div>
  );
};
