import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CategoryMultiSelect } from './CategoryMultiSelect';
import { UserRole, AccountType, ANGOLA_PROVINCES, User, ProfessionalProfile } from '../types';
import { DEFAULT_ADMIN_USER } from '../mockData';
import { compressImageFile } from '../utils/imageUtils';
import { 
  X, 
  User as UserIcon, 
  Briefcase, 
  Lock, 
  ArrowRight,
  CheckCircle2,
  ArrowRightLeft,
  Crown,
  Phone,
  Mail,
  ShieldCheck,
  MapPin,
  FileText,
  AlertCircle,
  Camera,
  Image,
  Upload
} from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  initialRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, initialRole = 'cliente' }) => {
  const { switchRole, registerUserAsync, loginUserWithCredentialsAsync, categories, setIsLoggedIn, isLoggedIn, allUsers, professionals, loginUser, setActiveTab } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [accountType, setAccountType] = useState<AccountType>('cliente');
  const [role, setRole] = useState<UserRole>(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-switch mode to register if opened via share/register link
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      if (
        params.get('register') === 'true' || 
        params.get('mode') === 'register' || 
        params.get('ref') || 
        params.get('invite') || 
        params.get('reg') === 'true' ||
        hash.includes('register')
      ) {
        setMode('register');
      }
      if (params.get('type') === 'duplo') {
        setAccountType('duplo');
        setRole('profissional');
      } else if (params.get('role') === 'profissional' || params.get('type') === 'profissional') {
        setAccountType('profissional');
        setRole('profissional');
      }
    }
  }, []);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'masculino' | 'feminino'>('masculino');
  const [password, setPassword] = useState('');
  const [province, setProvince] = useState('Luanda');
  const [address, setAddress] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([categories[0]?.id || 'eletricista']);
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [authError, setAuthError] = useState('');

  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImageFile(file, 600, 0.82);
        setAvatarUrl(compressed);
      } catch (err) {
        console.error('Error compressing image:', err);
        setAuthError('Erro ao carregar a imagem da galeria. Tente outra foto.');
      }
    }
  };

  const isProRequired = accountType === 'profissional' || accountType === 'duplo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (mode === 'login') {
      const cleanPhone = phone.trim().replace(/\D/g, '');

      if (!phone.trim()) {
        setAuthError('Por favor introduza o seu número de telefone ou e-mail.');
        return;
      }
      if (!password) {
        setAuthError('Por favor introduza a sua palavra-passe.');
        return;
      }

      // Check admin shortcut or phone/email - redirect to dedicated admin login page
      if (phone.includes('admin') || cleanPhone === '956011985' || phone.toLowerCase().includes('jfigueiredo790@gmail.com')) {
        setAuthError('Para aceder ao Painel Administrativo, utilize a página dedicada de Acesso Administrativo.');
        return;
      }

      setIsSubmitting(true);
      const res = await loginUserWithCredentialsAsync(phone, password, role);
      setIsSubmitting(false);

      if (res.success) {
        onClose();
      } else {
        setAuthError(res.message);
      }
    } else {
      // Registration form validations
      if (!name.trim()) {
        setAuthError('Por favor preencha o seu Nome Completo.');
        return;
      }
      if (!province) {
        setAuthError('Por favor escolha a Província onde vive.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setAuthError('Por favor introduza um Gmail / E-mail válido.');
        return;
      }
      if (!phone.trim()) {
        setAuthError('Por favor introduza um Número de Telefone válido.');
        return;
      }
      if (!documentNumber.trim()) {
        setAuthError('Por favor introduza o Nº do Bilhete de Identidade (BI).');
        return;
      }
      if (!password.trim() || password.length < 6) {
        setAuthError('A palavra-passe deve conter pelo menos 6 caracteres.');
        return;
      }
      if (isProRequired && selectedCategories.length === 0) {
        setAuthError('Por favor seleccione pelo menos uma Área de Actuação (Trabalho/Profissão).');
        return;
      }
      if (!address.trim()) {
        setAuthError('Por favor introduza o Endereço onde vive.');
        return;
      }

      const formattedPhone = phone.trim().startsWith('+244') ? phone.trim() : `+244 ${phone.trim()}`;
      const targetRole: UserRole = accountType === 'profissional' ? 'profissional' : 'cliente';

      const activeCatNames = selectedCategories
        .map(cId => categories.find(c => c.id === cId)?.name)
        .filter(Boolean)
        .join(', ');

      const proData = isProRequired ? {
        categories: selectedCategories.length > 0 ? selectedCategories : [categories[0]?.id || 'eletricista'],
        bio: 'Profissional qualificado em ' + (activeCatNames || 'prestação de serviços'),
        experienceYears: Math.max(0, Number(experienceYears) || 0),
        experienceVerified: false,
        hourlyRateKz: 15000,
        address: address.trim(),
        documentType: 'Bilhete de Identidade',
        documentNumber: documentNumber.trim(),
        rating: 5.0,
        reviewCount: 0,
        completedJobs: 0,
        portfolioImages: [],
        status: 'disponivel' as const,
        plan: 'gratuito' as const,
        planActivatedAt: new Date().toISOString(),
        trialStartDate: new Date().toISOString(),
        subscriptionPlan: 'free_trial' as const
      } : {};

      const newUser: Partial<User & ProfessionalProfile> = {
        name: name.trim(),
        email: email.trim(),
        phone: formattedPhone,
        gender,
        password: password.trim(),
        role: targetRole,
        accountType,
        province,
        address: address.trim(),
        documentNumber: documentNumber.trim(),
        categories: selectedCategories,
        avatar: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        verified: true,
        createdAt: new Date().toISOString(),
        ...proData
      };

      setIsSubmitting(true);
      const res = await registerUserAsync(newUser, password.trim());
      setIsSubmitting(false);

      if (res.success) {
        onClose();
      } else {
        setAuthError(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 text-white p-2 rounded-xl font-extrabold text-sm shadow-sm">
              J
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base">J Smart Services</h2>
              <p className="text-xs text-slate-500">Acesse a sua conta em Angola 🇦🇴</p>
            </div>
          </div>
          {isLoggedIn ? (
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          ) : (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full border border-emerald-200">
              Acesso
            </span>
          )}
        </div>

        {/* Mode Selector (Login vs Registo) */}
        <div className="flex bg-slate-100 p-1 rounded-2xl my-4">
          <button
            onClick={() => { setMode('login'); setAuthError(''); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Entrar (Login)
          </button>
          <button
            onClick={() => { setMode('register'); setAuthError(''); }}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all ${
              mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Registar Novo
          </button>
        </div>

        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-2xl mb-4 flex items-start gap-2 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          
          {/* ==================== LOGIN MODE ==================== */}
          {mode === 'login' && (
            <>
              {/* Telefone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Número de Telefone Válido *</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-extrabold">🇦🇴 +244</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">+244</span>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="923 111 222" 
                    className="w-full text-xs p-3 pl-14 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              {/* Palavra-passe */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Palavra-passe *</span>
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduza a sua palavra-passe" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50/50"
                  required
                />
              </div>

              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200 text-[11px] text-emerald-950 font-medium flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Utilize o mesmo número de telefone e palavra-passe que usou na abertura da conta.</span>
              </div>
            </>
          )}

          {/* ==================== REGISTER MODE ==================== */}
          {mode === 'register' && (
            <>
              {/* 1. Escolher o Tipo de Conta */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center justify-between">
                  <span>1. Escolha o Tipo de Conta</span>
                  <span className="text-[10px] text-emerald-600 font-extrabold lowercase">(Angola 🇦🇴)</span>
                </label>

                <div className="space-y-2">
                  {/* Option 1: Conta Cliente */}
                  <button
                    type="button"
                    onClick={() => { setAccountType('cliente'); setRole('cliente'); }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      accountType === 'cliente' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${accountType === 'cliente' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900">👤 Conta Cliente</p>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">Pedir Serviços</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Para procurar, solicitar orçamentos e contratar serviços.</p>
                    </div>
                  </button>

                  {/* Option 2: Conta Profissional */}
                  <button
                    type="button"
                    onClick={() => { setAccountType('profissional'); setRole('profissional'); }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      accountType === 'profissional' 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-sm ring-1 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${accountType === 'profissional' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900">🛠️ Conta Profissional</p>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Prestar Trabalhos</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Para artesãos, técnicos e prestadores de serviços.</p>
                    </div>
                  </button>

                  {/* Option 3: Conta Dupla */}
                  <button
                    type="button"
                    onClick={() => { setAccountType('duplo'); setRole('cliente'); }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                      accountType === 'duplo' 
                        ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold shadow-md ring-2 ring-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${accountType === 'duplo' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          🔄 Conta Dupla (2 em 1)
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        </p>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">Cliente + Pro</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Pedir serviços E prestar trabalhos com a mesma conta.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Hidden file input for Gallery photo picker */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                onChange={handleImageUpload} 
                className="hidden" 
              />

              {/* Foto de Perfil (Galeria) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Foto de Perfil (Abrir Galeria)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">(Opcional)</span>
                </label>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <img 
                    src={avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                    alt="Preview de Perfil" 
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300 shadow-sm shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Image className="w-3.5 h-3.5" />
                      <span>Escolher Foto da Galeria</span>
                    </button>
                    <p className="text-[10px] text-slate-500 mt-1">Toque para abrir a galeria do seu dispositivo.</p>
                  </div>
                </div>
              </div>

              {/* 2. Nome Completo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nome Completo *</span>
                </label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Mateus Agostinho" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Género */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Género *</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('masculino')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      gender === 'masculino'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>👨 Masculino</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('feminino')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      gender === 'feminino'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>👩 Feminino</span>
                  </button>
                </div>
              </div>

              {/* 3. Província onde vive */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Província onde vive *</span>
                </label>
                <select 
                  value={province} 
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white text-slate-900"
                >
                  {ANGOLA_PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 4. Gmail / E-mail */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Gmail / E-mail *</span>
                </label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@gmail.com" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* 5. Número de Telefone */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Número de Telefone *</span>
                  </span>
                  <span className="text-[10px] text-emerald-600 font-extrabold">🇦🇴 +244</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">+244</span>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="923 111 222" 
                    className="w-full text-xs p-3 pl-14 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* 6. Nº do Bilhete de Identidade (BI) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Nº do Bilhete de Identidade (BI) *</span>
                </label>
                <input 
                  type="text" 
                  value={documentNumber} 
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: 004821943LA041" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* Palavra-passe de Registo */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Palavra-passe de Acesso *</span>
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Crie a sua palavra-passe" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {/* 7. Área de Actuação (Trabalho / Profissão) - Apenas para Profissional ou Conta Dupla */}
              {isProRequired && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Área de Actuação (Trabalho / Profissão) *</span>
                      </span>
                    </label>
                    <CategoryMultiSelect
                      categories={categories}
                      selectedCategories={selectedCategories}
                      onChange={setSelectedCategories}
                      maxAllowed={7}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Anos de Experiência na Área *</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        ⚪ Inicialmente Não Verificada
                      </span>
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
                        placeholder="Ex: 5" 
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        required={isProRequired}
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">anos</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Informe quantos anos de experiência possui na sua área de atuação. A verificação (✅) é confirmada pelo Administrador após validação de comprovativos.
                    </p>
                  </div>
                </div>
              )}

              {/* 8. Endereço onde vive */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Endereço onde vive *</span>
                </label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex: Bairro Talatona, Rua 12, Ponto de referência" 
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              {isProRequired && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-[11px] text-emerald-900 font-bold space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-black">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Aprovação Automática & 14 Dias de Teste Grátis</span>
                  </div>
                  <p className="text-slate-600 text-[10px] font-medium leading-relaxed">
                    O seu perfil de profissional ficará ativo imediatamente em Angola assim que concluir o registo.
                  </p>
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-xs mt-3 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>A gravar no Firestore...</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Entrar na Plataforma' : 'Criar Conta & Acessar'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Link discreto para Acesso Administrativo */}
          <div className="pt-3 text-center border-t border-slate-100 mt-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('admin');
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-600 font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>É Administrador? Aceder ao Portal Administrativo</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
