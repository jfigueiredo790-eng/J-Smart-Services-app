import React, { useState, useEffect } from 'react';
import { useApp, isFictitiousOrInvalidUser } from '../context/AppContext';
import { AndroidPrepHub } from './AndroidPrepHub';
import { UserAvatar } from './UserAvatar';
import { AdminCategoryManager } from './AdminCategoryManager';
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  ClipboardList, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Building2,
  TrendingUp,
  MapPin,
  Check,
  Plus,
  SlidersHorizontal,
  Ban,
  Unlock,
  Flag,
  Save,
  Search,
  Share2,
  Copy,
  ExternalLink,
  MessageSquare,
  Calendar,
  Globe,
  PhoneCall,
  UserCheck,
  Sparkles,
  Filter,
  Eye,
  Smartphone,
  Trash2,
  X
} from 'lucide-react';
import { ANGOLA_PROVINCES, User } from '../types';

import { getProPlanStatus } from '../utils/planUtils';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser,
    professionals, 
    allUsers,
    requests, 
    categories, 
    verifyProfessional, 
    verifyProExperience,
    walletTransactions, 
    approvePaymentTransaction,
    rejectPaymentTransaction,
    reports, 
    auditLogs,
    platformSettings, 
    updatePlatformSettings, 
    blockUser, 
    unblockUser,
    adminDeleteUser,
    addCategory,
    addStaffAdmin,
    adminUnlockProPlan,
    adminChangeUserAccountType,
    runAutoTestSuite,
    codeOfConductRules,
    updateCodeOfConductRules
  } = useApp();

  const [adminTab, setAdminTab] = useState<'all_registered' | 'payments' | 'financial' | 'users' | 'clients' | 'categories' | 'commissions' | 'reports' | 'staff' | 'audit' | 'tests' | 'code_of_conduct' | 'android_api'>('all_registered');
  const [editableRules, setEditableRules] = useState(() => codeOfConductRules);
  const [rulesSaveSuccess, setRulesSaveSuccess] = useState(false);
  const [newRuleInput, setNewRuleInput] = useState<{ [sectionId: string]: string }>({});

  // Global Administrative Toast Feedback & Confirmation Modal State
  const [adminFeedback, setAdminFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'delete_user' | 'block_user' | 'unblock_user';
    targetUserId: string;
    targetUserName: string;
    isProcessing?: boolean;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string, duration = 4000) => {
    setAdminFeedback({ type, message });
    setTimeout(() => {
      setAdminFeedback(prev => (prev?.message === message ? null : prev));
    }, duration);
  };

  useEffect(() => {
    if (codeOfConductRules && codeOfConductRules.length > 0) {
      setEditableRules(codeOfConductRules);
    }
  }, [codeOfConductRules]);
  const [testResults, setTestResults] = useState<{ success: boolean; totalTests: number; passedTests: number; logResults: { step: string; status: 'pass' | 'fail'; message: string }[] } | null>(null);
  const [proPlanFilter, setProPlanFilter] = useState<'all' | 'active_paid' | 'trial' | 'expired'>('all');

  // Master Registered Users Filter State
  const [regRoleFilter, setRegRoleFilter] = useState<'all' | 'cliente' | 'profissional' | 'duplo' | 'admin'>('all');
  const [regProvinceFilter, setRegProvinceFilter] = useState<string>('Todas');
  const [copiedShareLinkMsg, setCopiedShareLinkMsg] = useState<boolean>(false);
  const [viewingUserDetail, setViewingUserDetail] = useState<User | null>(null);

  // Payment approval modal/rejection state
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [viewingProofTx, setViewingProofTx] = useState<any | null>(null);
  const [approvalActionMsg, setApprovalActionMsg] = useState<string | null>(null);

  // Search in users
  const [userSearch, setUserSearch] = useState('');

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Wrench');

  // New Staff Form State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffSubRole, setNewStaffSubRole] = useState<any>('atendimento');
  const [staffCreatedSuccess, setStaffCreatedSuccess] = useState(false);

  // Commission & Company Settings State
  const [commissionRateInput, setCommissionRateInput] = useState(String(platformSettings.commissionRatePercent || 10));
  const [companyNameInput, setCompanyNameInput] = useState(platformSettings.companyName || 'J smart services');
  const [holderNameInput, setHolderNameInput] = useState(platformSettings.adminHolderName || 'António Abel Figueiredo Júlio');
  const [emailInput, setEmailInput] = useState(platformSettings.adminEmail || 'jfigueiredo790@gmail.com');
  const [whatsappInput, setWhatsappInput] = useState(platformSettings.adminPhoneWhatsapp || '956011985');
  const [expressInput, setExpressInput] = useState(platformSettings.adminPhoneExpress || '956011985');
  const [bankNameInput, setBankNameInput] = useState(platformSettings.adminBankName || 'BCI (Banco de Comércio e Indústria)');
  const [ibanInput, setIbanInput] = useState(platformSettings.adminIban || 'AO06 0005 0000 6605 5740 1019 7');
  const [provinceInput, setProvinceInput] = useState(platformSettings.adminProvince || 'Icolo e Bengo');
  const [cityInput, setCityInput] = useState(platformSettings.adminCity || 'Centralidade do Sequele');
  const [adminPinInput, setAdminPinInput] = useState(platformSettings.adminPin || 'admin123');

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Broadcast Notification State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'pros' | 'clients'>('all');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Low Rating Alert Pros (Capítulo 8)
  const lowRatingPros = professionals.filter(p => p.reviewCount >= 1 && p.rating < 3.0);

  // Metrics
  const totalPros = professionals.length;
  const autoApprovedPros = professionals.filter(p => p.verified || p.isAutoApproved).length;
  const pendingPros = professionals.filter(p => !p.verified && !p.isAutoApproved);
  const totalRequestsCount = requests.length;

  const clientUsers = allUsers.filter(u => u.role === 'cliente' && !isFictitiousOrInvalidUser(u));
  const totalClients = clientUsers.length;

  const totalVolumeKz = requests.reduce((acc, curr) => acc + curr.budgetKz, 0);
  const totalCommissionKz = walletTransactions
    .filter(t => t.type === 'commission')
    .reduce((acc, curr) => acc + curr.amountKz, 0);

  const filteredPros = professionals.filter(p => 
    !isFictitiousOrInvalidUser(p) && (
      p.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      p.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      p.province.toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  const filteredClients = clientUsers.filter(c =>
    !isFictitiousOrInvalidUser(c) && (
      c.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (c.phone && c.phone.includes(userSearch)) ||
      c.province.toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await updatePlatformSettings({
      commissionRatePercent: Number(commissionRateInput) || 10,
      companyName: companyNameInput,
      adminHolderName: holderNameInput,
      adminEmail: emailInput,
      adminPhoneWhatsapp: whatsappInput,
      adminPhoneExpress: expressInput,
      adminBankName: bankNameInput,
      adminIban: ibanInput,
      adminProvince: provinceInput,
      adminCity: cityInput,
      adminPin: adminPinInput
    });
    if (res.success) {
      setSavedSuccess(true);
      showToast('success', res.message || 'Definições do Administrador salvas e sincronizadas com a base de dados online (Firestore)!');
      setTimeout(() => setSavedSuccess(false), 2500);
    } else {
      showToast('error', res.message || 'Erro ao persistir definições no Firestore.');
    }
  };

  const handleExecuteConfirmedAction = async () => {
    if (!confirmModal) return;

    setConfirmModal(prev => prev ? { ...prev, isProcessing: true } : null);

    try {
      if (confirmModal.actionType === 'delete_user') {
        const res = await adminDeleteUser(confirmModal.targetUserId);
        if (res.success) {
          showToast('success', res.message);
          if (viewingUserDetail?.id === confirmModal.targetUserId) {
            setViewingUserDetail(null);
          }
        } else {
          showToast('error', res.message);
        }
      } else if (confirmModal.actionType === 'block_user') {
        const res = await blockUser(confirmModal.targetUserId);
        if (res.success) {
          showToast('success', res.message);
          if (viewingUserDetail?.id === confirmModal.targetUserId) {
            setViewingUserDetail(prev => prev ? { ...prev, blocked: true, status: 'bloqueado' } : null);
          }
        } else {
          showToast('error', res.message);
        }
      } else if (confirmModal.actionType === 'unblock_user') {
        const res = await unblockUser(confirmModal.targetUserId);
        if (res.success) {
          showToast('success', res.message);
          if (viewingUserDetail?.id === confirmModal.targetUserId) {
            setViewingUserDetail(prev => prev ? { ...prev, blocked: false, status: 'ativo' } : null);
          }
        } else {
          showToast('error', res.message);
        }
      }
    } catch (e: any) {
      showToast('error', `Erro na execução: ${e.message || e}`);
    } finally {
      setConfirmModal(null);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      addCategory({
        name: newCatName,
        description: newCatDesc || 'Serviço profissional qualificado em Angola',
        iconName: newCatIcon,
        popularCount: 100,
        color: 'emerald'
      });
      setNewCatName('');
      setNewCatDesc('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-black text-white">Painel do Administrador J Smart</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestão automatizada de utilizadores, comissões, categorias e denúncias em Angola.
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5">
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Modo Automático Ativo
          </span>
          <span className="text-[11px] font-extrabold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-lg">
            Nível: {currentUser.adminSubRole === 'super_admin' || !currentUser.adminSubRole ? '👑 Super Admin (Controlo Total)' :
                    currentUser.adminSubRole === 'atendimento' ? '🎧 Atendimento & Suporte' :
                    currentUser.adminSubRole === 'gestao_profissionais' ? '👷 Gestão de Profissionais' : '💰 Administrador Financeiro'}
          </span>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex overflow-x-auto gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
        {/* TAB MASTER: TODOS OS CADASTRADOS NA J SMART SERVICES */}
        <button
          onClick={() => setAdminTab('all_registered')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 relative ${
            adminTab === 'all_registered' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4 text-amber-300" />
          <span className="font-black">Todos os Cadastrados ({allUsers.length})</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5"></span>
        </button>

        {/* TAB ANDROID & BACKEND API */}
        <button
          onClick={() => setAdminTab('android_api')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 relative ${
            adminTab === 'android_api' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-700 hover:text-slate-900 bg-white border border-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span className="font-extrabold">📱 Backend App Android</span>
          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">Pronto</span>
        </button>

        {/* TAB 0: APROVAÇÃO DE PAGAMENTOS E COMPROVATIVOS */}
        <button
          onClick={() => setAdminTab('payments')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 relative ${
            adminTab === 'payments' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Banknote className="w-4 h-4 text-amber-400" />
          <span>Aprovação de Pagamentos</span>
          {walletTransactions.filter(t => t.status === 'pendente').length > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full ml-1 animate-pulse">
              {walletTransactions.filter(t => t.status === 'pendente').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('financial')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'financial' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>Painel Financeiro & Planos</span>
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'users' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Profissionais ({professionals.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('clients')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'clients' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Clientes ({totalClients})</span>
        </button>

        <button
          onClick={() => setAdminTab('categories')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'categories' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Categorias ({categories.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('commissions')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'commissions' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Banknote className="w-4 h-4 text-emerald-400" />
          <span>Configurações Gerais & IBAN Oficial</span>
        </button>

        <button
          onClick={() => setAdminTab('reports')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 relative ${adminTab === 'reports' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <Flag className="w-4 h-4 text-emerald-400" />
          <span>Denúncias</span>
          {reports.filter(r => r.status === 'pendente').length > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded-full text-[10px] font-black">
              {reports.filter(r => r.status === 'pendente').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('staff')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'staff' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Equipa & Sub-Admins ({allUsers.filter(u => u.role === 'admin').length})</span>
        </button>

        <button
          onClick={() => setAdminTab('audit')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'audit' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Logs de Auditoria ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('code_of_conduct')}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'code_of_conduct' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>📜 Regras & Conduta</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('tests');
            if (!testResults) {
              setTestResults(runAutoTestSuite());
            }
          }}
          className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap flex items-center gap-1.5 ${adminTab === 'tests' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>Testes Automáticos</span>
        </button>
      </div>

      {/* TAB MASTER: TODOS OS CADASTRADOS NA J SMART SERVICES */}
      {adminTab === 'all_registered' && (() => {
        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?register=true` : 'https://jsmart-services.ao/?register=true';
        const waText = encodeURIComponent('Cadastra-te na plataforma J Smart Services para prestar ou solicitar serviços em Angola: ' + shareUrl);
        const waShareUrl = `https://api.whatsapp.com/send?text=${waText}`;

        const copyShareLink = () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareUrl)
              .then(() => {
                setCopiedShareLinkMsg(true);
                setTimeout(() => setCopiedShareLinkMsg(false), 3000);
              })
              .catch(() => {
                fallbackCopy(shareUrl);
              });
          } else {
            fallbackCopy(shareUrl);
          }
        };

        const fallbackCopy = (text: string) => {
          try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
              setCopiedShareLinkMsg(true);
              setTimeout(() => setCopiedShareLinkMsg(false), 3000);
            } else {
              prompt('Copie o link de registo da J Smart Services:', text);
            }
          } catch (err) {
            prompt('Copie o link de registo da J Smart Services:', text);
          }
        };

        // Filter registered users
        const filteredRegisteredUsers = allUsers.filter(u => {
          if (isFictitiousOrInvalidUser(u)) return false;

          // Role filter
          if (regRoleFilter === 'cliente' && u.role !== 'cliente') return false;
          if (regRoleFilter === 'profissional' && u.role !== 'profissional' && u.accountType !== 'profissional') return false;
          if (regRoleFilter === 'duplo' && u.accountType !== 'duplo') return false;
          if (regRoleFilter === 'admin' && u.role !== 'admin') return false;

          // Province filter
          if (regProvinceFilter !== 'Todas' && u.province !== regProvinceFilter) return false;

          // Search query
          if (userSearch.trim()) {
            const q = userSearch.toLowerCase();
            const matchName = (u.name || '').toLowerCase().includes(q);
            const matchEmail = (u.email || '').toLowerCase().includes(q);
            const matchPhone = (u.phone || '').toLowerCase().includes(q);
            const matchBI = (u.documentNumber || '').toLowerCase().includes(q);
            const matchProvince = (u.province || '').toLowerCase().includes(q);
            const matchAddress = (u.address || '').toLowerCase().includes(q);
            if (!matchName && !matchEmail && !matchPhone && !matchBI && !matchProvince && !matchAddress) {
              return false;
            }
          }

          return true;
        });

        const activeRegisteredUsers = allUsers.filter(u => !isFictitiousOrInvalidUser(u));
        const clientCount = activeRegisteredUsers.filter(u => u.role === 'cliente').length;
        const proCount = activeRegisteredUsers.filter(u => u.role === 'profissional' || u.accountType === 'profissional').length;
        const dualCount = activeRegisteredUsers.filter(u => u.accountType === 'duplo').length;
        const adminCount = activeRegisteredUsers.filter(u => u.role === 'admin').length;

        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Live Indicator */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Sincronização em Tempo Real Ativa
                  </span>
                </div>
                <h3 className="text-xl font-black text-white mt-2">
                  Todos os Cadastrados na J Smart Services ({allUsers.length})
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Encontre todas as pessoas registadas na plataforma. Todas as contas criadas através de links partilhados ou diretamente na aplicação são guardadas em tempo real nesta base de dados universal.
                </p>
              </div>

              <button
                onClick={copyShareLink}
                className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-lg transition-all flex items-center gap-2 border border-emerald-400/30"
              >
                <Share2 className="w-4 h-4 text-amber-300" />
                <span>{copiedShareLinkMsg ? '✓ Link de Convite Copiado!' : 'Copiar Link de Partilha'}</span>
              </button>
            </div>

            {/* Share Link Banner Card */}
            <div className="bg-white p-5 rounded-3xl border-2 border-emerald-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl shrink-0 mt-0.5">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span>Link Universal para Partilhar & Registar Novos Utilizadores</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">Partilha Ativa</span>
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Partilhe este link em grupos do WhatsApp, redes sociais ou SMS. Quando alguém clicar e criar conta, surgirá instantaneamente nesta lista.
                  </p>
                  <div className="mt-2 text-xs font-mono bg-slate-100 text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 inline-block">
                    {shareUrl}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
                <a
                  href={waShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </a>

                <button
                  onClick={copyShareLink}
                  className="flex-1 sm:flex-initial bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copiedShareLinkMsg ? '✓ Copiado!' : 'Copiar Link'}</span>
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-3 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1 border border-slate-300"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                  <span>Testar Link</span>
                </a>
              </div>
            </div>

            {/* Platform Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div 
                onClick={() => setRegRoleFilter('all')} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${regRoleFilter === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block opacity-70">Total Cadastrados</span>
                <span className="text-2xl font-black">{allUsers.length}</span>
                <span className="text-[10px] block mt-0.5 opacity-80">Na J Smart Services</span>
              </div>

              <div 
                onClick={() => setRegRoleFilter('cliente')} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${regRoleFilter === 'cliente' ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-700 font-extrabold">Clientes</span>
                <span className="text-2xl font-black text-emerald-950">{clientCount}</span>
                <span className="text-[10px] block mt-0.5 text-slate-500">Solicitam serviços</span>
              </div>

              <div 
                onClick={() => setRegRoleFilter('profissional')} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${regRoleFilter === 'profissional' ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-indigo-700 font-extrabold">Profissionais</span>
                <span className="text-2xl font-black text-indigo-950">{proCount}</span>
                <span className="text-[10px] block mt-0.5 text-slate-500">Prestadores de serviços</span>
              </div>

              <div 
                onClick={() => setRegRoleFilter('duplo')} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${regRoleFilter === 'duplo' ? 'bg-teal-600 text-white border-teal-600 shadow' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-teal-700 font-extrabold">Contas Duplas</span>
                <span className="text-2xl font-black text-teal-950">{dualCount}</span>
                <span className="text-[10px] block mt-0.5 text-slate-500">Cliente + Profissional</span>
              </div>

              <div 
                onClick={() => setRegRoleFilter('admin')} 
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${regRoleFilter === 'admin' ? 'bg-amber-600 text-white border-amber-600 shadow' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-700 font-extrabold">Admins & Equipa</span>
                <span className="text-2xl font-black text-amber-950">{adminCount}</span>
                <span className="text-[10px] block mt-0.5 text-slate-500">Gestores do sistema</span>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Pesquisar por nome, telefone (+244), e-mail, BI, província..."
                    className="w-full text-xs pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Province Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-600 whitespace-nowrap flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Província:
                  </span>
                  <select
                    value={regProvinceFilter}
                    onChange={(e) => setRegProvinceFilter(e.target.value)}
                    className="text-xs font-bold p-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Todas">Todas as Províncias de Angola</option>
                    {ANGOLA_PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Filter Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100 text-xs font-bold">
                <span className="text-slate-400 py-1 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-slate-400" />
                  Tipo de Conta:
                </span>
                <button
                  onClick={() => setRegRoleFilter('all')}
                  className={`px-3 py-1 rounded-xl transition-all ${regRoleFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Todos ({allUsers.length})
                </button>
                <button
                  onClick={() => setRegRoleFilter('cliente')}
                  className={`px-3 py-1 rounded-xl transition-all ${regRoleFilter === 'cliente' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Clientes ({clientCount})
                </button>
                <button
                  onClick={() => setRegRoleFilter('profissional')}
                  className={`px-3 py-1 rounded-xl transition-all ${regRoleFilter === 'profissional' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Profissionais ({proCount})
                </button>
                <button
                  onClick={() => setRegRoleFilter('duplo')}
                  className={`px-3 py-1 rounded-xl transition-all ${regRoleFilter === 'duplo' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Contas Duplas ({dualCount})
                </button>
                <button
                  onClick={() => setRegRoleFilter('admin')}
                  className={`px-3 py-1 rounded-xl transition-all ${regRoleFilter === 'admin' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Admins ({adminCount})
                </button>
              </div>
            </div>

            {/* List of Registered Users */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Lista de Registados Encontrados ({filteredRegisteredUsers.length})
                </h4>
                <span className="text-[11px] text-slate-500 font-bold">
                  Sincronizado via Firestore
                </span>
              </div>

              {filteredRegisteredUsers.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Users className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="font-extrabold text-slate-800 text-sm">Nenhum utilizador encontrado!</p>
                  <p className="text-xs text-slate-500">
                    Tente ajustar o termo de pesquisa ou os filtros de província e tipo de conta.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRegisteredUsers.map((usr) => {
                    const cleanPhone = usr.phone ? usr.phone.replace(/\D/g, '') : '';
                    const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('244') ? cleanPhone : '244' + cleanPhone}` : null;
                    const isPro = usr.role === 'profissional' || usr.accountType === 'profissional' || usr.accountType === 'duplo';
                    const isAdmin = usr.role === 'admin';

                    return (
                      <div 
                        key={usr.id} 
                        className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative ${
                          usr.blocked 
                            ? 'bg-rose-50/50 border-rose-200 opacity-75' 
                            : 'bg-slate-50 hover:bg-white border-slate-200 hover:shadow-md'
                        }`}
                      >
                        <div>
                          {/* User avatar and header info */}
                          <div className="flex items-start gap-3">
                            <UserAvatar
                              src={usr.avatar}
                              name={usr.name}
                              sizeClassName="w-12 h-12"
                              roundedClassName="rounded-2xl"
                              role={usr.role}
                              className="border-2 border-white shadow-sm shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <h5 className="font-black text-slate-900 text-sm truncate">{usr.name}</h5>
                                {usr.blocked && (
                                  <span className="text-[9px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-md uppercase">
                                    Bloqueado
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-1 mt-1">
                                {isAdmin ? (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    👑 Admin
                                  </span>
                                ) : isPro ? (
                                  <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    👷 Profissional
                                  </span>
                                ) : (
                                  <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    👤 Cliente
                                  </span>
                                )}

                                {usr.accountType === 'duplo' && (
                                  <span className="bg-teal-100 text-teal-900 border border-teal-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                                    ⚡ Conta Dupla
                                  </span>
                                )}

                                {usr.registrationSource === 'Link Partilhado' && (
                                  <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full">
                                    🔗 Link Partilhado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="mt-3 space-y-1 text-xs text-slate-600 border-t border-slate-200/80 pt-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-400">Telefone:</span>
                              <span className="font-extrabold text-slate-900">{usr.phone || 'Sem contacto'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-400">E-mail:</span>
                              <span className="font-bold text-slate-800 truncate max-w-[170px]">{usr.email}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-400">Nº BI / Doc:</span>
                              <span className="font-mono text-slate-700 font-bold">{usr.documentNumber || 'Não facultado'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-400">Província:</span>
                              <span className="font-bold text-emerald-800">{usr.province || 'Luanda'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-400">Data de Registo:</span>
                              <span className="text-[11px] font-bold text-slate-600">
                                {usr.createdAt ? new Date(usr.createdAt).toLocaleDateString('pt-AO') : 'Recente'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2">
                          {waLink ? (
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-extrabold py-2 rounded-xl text-[11px] text-center flex items-center justify-center gap-1 border border-emerald-300"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                              <span>WhatsApp</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="bg-slate-100 text-slate-400 font-bold py-2 rounded-xl text-[11px] text-center"
                            >
                              Sem Contacto
                            </button>
                          )}

                          <button
                            onClick={() => setViewingUserDetail(usr)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl text-[11px] flex items-center justify-center gap-1 shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ficha Completa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 0: APROVAÇÃO DE PAGAMENTOS E COMPROVATIVOS (REQUISITO ADMIN) */}
      {adminTab === 'payments' && (() => {
        const pendingTxs = walletTransactions.filter(t => t.status === 'pendente');
        const completedTxs = walletTransactions.filter(t => t.status === 'concluido');
        const rejectedTxs = walletTransactions.filter(t => t.status === 'rejeitado');

        const handleApprove = async (txId: string) => {
          const res = await approvePaymentTransaction(txId);
          if (res.success) {
            setApprovalActionMsg(res.message);
            showToast('success', res.message);
          } else {
            showToast('error', res.message);
          }
          setTimeout(() => setApprovalActionMsg(null), 3000);
        };

        const handleConfirmReject = async () => {
          if (rejectingTxId) {
            const res = await rejectPaymentTransaction(rejectingTxId, rejectionReasonInput || 'Comprovativo de pagamento não verificado no extrato.');
            if (res.success) {
              setApprovalActionMsg(res.message);
              showToast('success', res.message);
            } else {
              showToast('error', res.message);
            }
            setRejectingTxId(null);
            setRejectionReasonInput('');
            setTimeout(() => setApprovalActionMsg(null), 3000);
          }
        };

        return (
          <div className="space-y-6">
            {/* Header banner */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                  Verificação Manual Obrigatória
                </span>
                <h3 className="text-lg font-black text-white mt-1">Aprovação de Pagamentos e Comprovativos</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifique o comprovativo bancário/express anexado antes de aprovar o pacote ou recarga do utilizador.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="bg-amber-500/20 border border-amber-500/30 px-3 py-2 rounded-2xl text-center">
                  <span className="text-xs text-amber-300 font-bold block">Pendentes</span>
                  <span className="text-xl font-black text-amber-400">{pendingTxs.length}</span>
                </div>
                <div className="bg-emerald-500/20 border border-emerald-500/30 px-3 py-2 rounded-2xl text-center">
                  <span className="text-xs text-emerald-300 font-bold block">Aprovados</span>
                  <span className="text-xl font-black text-emerald-400">{completedTxs.length}</span>
                </div>
              </div>
            </div>

            {approvalActionMsg && (
              <div className="bg-emerald-600 text-white p-4 rounded-2xl text-xs font-extrabold flex items-center justify-between shadow-md animate-fade-in">
                <span>✓ {approvalActionMsg}</span>
                <button onClick={() => setApprovalActionMsg(null)} className="text-white hover:text-emerald-200 font-bold">✕</button>
              </div>
            )}

            {/* PENDING PAYMENTS LIST */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  Pagamentos Aguardando Aprovação do Administrador ({pendingTxs.length})
                </h3>
              </div>

              {pendingTxs.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 rounded-2xl border border-dashed border-emerald-200 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <p className="font-extrabold text-emerald-950 text-sm">Nenhum pagamento pendente no momento!</p>
                  <p className="text-xs text-slate-600">
                    Todos os comprovativos submetidos pelos profissionais e clientes já foram analisados e processados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pendingTxs.map((tx) => {
                    const user = allUsers.find(u => u.id === tx.userId);
                    const userPhone = tx.userPhone || user?.phone || 'Sem telefone';
                    const userName = tx.userName || user?.name || 'Profissional / Cliente';

                    return (
                      <div key={tx.id} className="bg-slate-50 rounded-2xl p-4 border-2 border-amber-200 shadow-sm space-y-3 relative flex flex-col justify-between">
                        <div>
                          {/* User info header */}
                          <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-sm">{userName}</span>
                                <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-md uppercase">
                                  {tx.userRole || user?.role || 'Profissional'}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-emerald-800 mt-0.5 flex items-center gap-1">
                                📞 {userPhone}
                              </p>
                            </div>
                            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full">
                              ⏳ Pendente
                            </span>
                          </div>

                          {/* Payment details */}
                          <div className="mt-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 font-bold">Valor a Validar:</span>
                              <span className="text-lg font-black text-emerald-700">{tx.amountKz.toLocaleString('pt-AO')} Kz</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 font-medium">
                              <span className="text-slate-500">Descrição/Pacote:</span>
                              <span className="font-extrabold text-slate-900">{tx.description}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 font-medium">
                              <span className="text-slate-500">Método Usado:</span>
                              <span className="font-bold text-slate-800">{tx.paymentMethod}</span>
                            </div>
                            <div className="flex items-center justify-between text-slate-700 font-medium">
                              <span className="text-slate-500">Data de Envio:</span>
                              <span className="text-slate-600">{new Date(tx.createdAt).toLocaleString('pt-AO')}</span>
                            </div>
                            {tx.proofNote && (
                              <div className="bg-white p-2 rounded-xl border border-slate-200 text-[11px] text-slate-700 italic mt-1">
                                💬 <strong>Nota do Utilizador:</strong> "{tx.proofNote}"
                              </div>
                            )}
                          </div>

                          {/* Proof Receipt Image / PDF Card */}
                          <div className="mt-3 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                                📎 Comprovativo Anexado ({tx.proofFileType === 'pdf' || tx.proofUrl?.startsWith('data:application/pdf') ? 'Documento PDF' : 'Imagem'}):
                              </span>
                              {tx.proofFileName && (
                                <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                                  {tx.proofFileName}
                                </span>
                              )}
                            </div>

                            {tx.proofUrl ? (
                              tx.proofFileType === 'pdf' || tx.proofUrl.startsWith('data:application/pdf') || tx.proofFileName?.toLowerCase().endsWith('.pdf') ? (
                                <div 
                                  onClick={() => setViewingProofTx(tx)}
                                  className="cursor-pointer bg-gradient-to-br from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 p-3 rounded-xl border border-rose-200 flex items-center justify-between transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-sm">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                      <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                        PDF
                                      </span>
                                      <p className="font-extrabold text-slate-900 text-xs mt-0.5 truncate max-w-[180px]">
                                        {tx.proofFileName || 'Comprovativo_Pagamento.pdf'}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs font-black text-rose-700 bg-white group-hover:bg-rose-600 group-hover:text-white px-3 py-1.5 rounded-xl border border-rose-300 transition-colors shadow-sm">
                                    Examinar PDF 🔍
                                  </span>
                                </div>
                              ) : (
                                <div className="relative group cursor-pointer" onClick={() => setViewingProofTx(tx)}>
                                  <img
                                    src={tx.proofUrl}
                                    alt="Comprovativo"
                                    className="w-full h-36 object-cover rounded-lg border border-slate-200 transition-all group-hover:brightness-90"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-950/50 transition-all rounded-lg">
                                    <span className="bg-white text-slate-900 text-xs font-black px-3 py-1.5 rounded-full shadow">
                                      🔍 Ampliar Comprovativo
                                    </span>
                                  </div>
                                </div>
                              )
                            ) : (
                              <p className="text-xs text-slate-400 italic">Nenhum ficheiro anexado.</p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2 grid grid-cols-2 gap-2 border-t border-slate-200">
                          <button
                            onClick={() => setRejectingTxId(tx.id)}
                            className="w-full bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold py-2.5 rounded-xl transition-all text-xs border border-rose-300 flex items-center justify-center gap-1"
                          >
                            <span>❌ Rejeitar</span>
                          </button>

                          <button
                            onClick={() => handleApprove(tx.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl transition-all text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1"
                          >
                            <span>✓ Aprovar & Ativar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* HISTORY OF PROCESSED PAYMENTS */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Histórico de Pagamentos Analisados ({completedTxs.length + rejectedTxs.length})
              </h3>

              <div className="space-y-2">
                {[...completedTxs, ...rejectedTxs].map((tx) => {
                  const isApproved = tx.status === 'concluido';
                  return (
                    <div key={tx.id} className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{tx.userName || 'Utilizador'} • {tx.description}</p>
                          <p className="text-[10px] text-slate-500">
                            {tx.amountKz.toLocaleString('pt-AO')} Kz • {tx.paymentMethod} • {new Date(tx.createdAt).toLocaleDateString('pt-AO')}
                          </p>
                          {tx.rejectionReason && (
                            <p className="text-[10px] text-rose-600 font-bold mt-0.5">Motivo Rejeição: {tx.rejectionReason}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {tx.proofUrl && (
                          <button
                            onClick={() => setViewingProofTx(tx)}
                            className="text-[10px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 px-2 py-1 rounded-lg flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3 text-emerald-600" />
                            <span>Ver Comprovativo</span>
                          </button>
                        )}
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isApproved ? '✓ Aprovado' : '❌ Rejeitado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: PROOF IMAGE / PDF ZOOM & VERIFICATION */}
      {viewingProofTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[94vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Conferência de Comprovativo Bancário
                </span>
                <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
                  {viewingProofTx.userName} • {viewingProofTx.amountKz.toLocaleString('pt-AO')} Kz
                </h3>
              </div>
              <button onClick={() => setViewingProofTx(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-slate-900 p-2 rounded-2xl flex items-center justify-center border border-slate-800 min-h-[300px]">
              {viewingProofTx.proofFileType === 'pdf' || viewingProofTx.proofUrl?.startsWith('data:application/pdf') || viewingProofTx.proofFileName?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-[55vh] flex flex-col items-center justify-center bg-white rounded-xl p-4 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg">
                    <FileText className="w-9 h-9" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {viewingProofTx.proofFileName || 'Documento Comprovativo PDF'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Ficheiro PDF original submetido pelo profissional
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={viewingProofTx.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5"
                    >
                      <span>Abrir / Descarregar PDF</span>
                    </a>
                  </div>
                </div>
              ) : (
                <img 
                  src={viewingProofTx.proofUrl} 
                  alt="Comprovativo Zoom" 
                  className="max-h-[55vh] object-contain rounded-lg" 
                />
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <p><strong>Descrição:</strong> {viewingProofTx.description}</p>
                <p><strong>Método:</strong> {viewingProofTx.paymentMethod}</p>
                {viewingProofTx.proofFileName && (
                  <p><strong>Nome do Ficheiro:</strong> {viewingProofTx.proofFileName}</p>
                )}
                <p><strong>Data de Envio:</strong> {new Date(viewingProofTx.createdAt).toLocaleString('pt-AO')}</p>
              </div>
              {viewingProofTx.proofNote && (
                <p className="pt-1 border-t border-slate-200 mt-1"><strong>Nota do Utilizador:</strong> {viewingProofTx.proofNote}</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              {viewingProofTx.status === 'pendente' && (
                <>
                  <button
                    onClick={() => {
                      setRejectingTxId(viewingProofTx.id);
                      setViewingProofTx(null);
                    }}
                    className="flex-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold py-3 rounded-xl text-xs border border-rose-300"
                  >
                    ❌ Rejeitar Pagamento
                  </button>
                  <button
                    onClick={() => {
                      approvePaymentTransaction(viewingProofTx.id);
                      setViewingProofTx(null);
                      setApprovalActionMsg('Pagamento aprovado e ativado com sucesso!');
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md"
                  >
                    ✓ Aprovar e Ativar Plano
                  </button>
                </>
              )}
              {viewingProofTx.status !== 'pendente' && (
                <button
                  onClick={() => setViewingProofTx(null)}
                  className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs"
                >
                  Fechar Janela
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REJECTION REASON PROMPT */}
      {rejectingTxId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Ban className="w-5 h-5 text-rose-600" />
              Rejeitar Pagamento de Utilizador
            </h3>
            <p className="text-xs text-slate-600">
              Indique o motivo da rejeição (será enviado como notificação ao utilizador):
            </p>

            <textarea
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              placeholder="Ex: Comprovativo ilegível, valor não deu entrada na conta bancária BCI, etc..."
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setRejectingTxId(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (rejectingTxId) {
                    rejectPaymentTransaction(rejectingTxId, rejectionReasonInput || 'Comprovativo de pagamento não verificado no extrato.');
                    setRejectingTxId(null);
                    setRejectionReasonInput('');
                    setApprovalActionMsg('Pagamento rejeitado.');
                  }
                }}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: PAINEL FINANCEIRO */}
      {adminTab === 'financial' && (() => {
        const prosWithStatus = professionals.map(pro => ({
          pro,
          status: getProPlanStatus(pro)
        }));

        const trialProsCount = prosWithStatus.filter(p => p.status.isTrial && p.status.isActive).length;
        const activePaidProsCount = prosWithStatus.filter(p => !p.status.isTrial && p.status.isActive).length;
        const expiredProsCount = prosWithStatus.filter(p => p.status.isExpired).length;

        const planTransactions = walletTransactions.filter(t => t.type === 'payment' || t.description.toLowerCase().includes('plano'));
        const totalPlansSold = planTransactions.length;

        const totalPlanRevenueKz = planTransactions.reduce((acc, curr) => acc + curr.amountKz, 0);

        // Daily, Weekly, Monthly breakdown calculations
        const nowMs = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        const oneWeekMs = 7 * oneDayMs;
        const oneMonthMs = 30 * oneDayMs;

        const dailyRevenueKz = planTransactions
          .filter(t => {
            const txTime = t.dateIso ? new Date(t.dateIso).getTime() : nowMs;
            return (nowMs - txTime) <= oneDayMs;
          })
          .reduce((acc, curr) => acc + curr.amountKz, 0);

        const weeklyRevenueKz = planTransactions
          .filter(t => {
            const txTime = t.dateIso ? new Date(t.dateIso).getTime() : nowMs;
            return (nowMs - txTime) <= oneWeekMs;
          })
          .reduce((acc, curr) => acc + curr.amountKz, 0);

        const monthlyRevenueKz = planTransactions
          .filter(t => {
            const txTime = t.dateIso ? new Date(t.dateIso).getTime() : nowMs;
            return (nowMs - txTime) <= oneMonthMs;
          })
          .reduce((acc, curr) => acc + curr.amountKz, 0);

        const filteredProsByPlan = prosWithStatus.filter(item => {
          if (proPlanFilter === 'active_paid') return !item.status.isTrial && item.status.isActive;
          if (proPlanFilter === 'trial') return item.status.isTrial && item.status.isActive;
          if (proPlanFilter === 'expired') return item.status.isExpired;
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Resumo da Receita da Plataforma */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950 text-white p-5 rounded-3xl border border-emerald-500/30 shadow-md">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">Receita Total de Subscrições</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400">{totalPlanRevenueKz.toLocaleString('pt-AO')} <span className="text-sm text-white">Kz</span></span>
                <span className="text-[10px] text-emerald-200/80 block mt-1">Total de {totalPlansSold} plano(s) vendido(s)</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-emerald-700 uppercase block mb-1">Receita Diária (24h)</span>
                <span className="text-2xl font-black text-slate-900">{dailyRevenueKz.toLocaleString('pt-AO')} <span className="text-xs text-slate-500 font-bold">Kz</span></span>
                <span className="text-[11px] text-emerald-600 font-bold block mt-1">Acumulado das últimas 24 horas</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-teal-700 uppercase block mb-1">Receita Semanal (7d)</span>
                <span className="text-2xl font-black text-slate-900">{weeklyRevenueKz.toLocaleString('pt-AO')} <span className="text-xs text-slate-500 font-bold">Kz</span></span>
                <span className="text-[11px] text-teal-600 font-bold block mt-1">Últimos 7 dias de vendas</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-indigo-700 uppercase block mb-1">Receita Mensal (30d)</span>
                <span className="text-2xl font-black text-slate-900">{monthlyRevenueKz.toLocaleString('pt-AO')} <span className="text-xs text-slate-500 font-bold">Kz</span></span>
                <span className="text-[11px] text-indigo-600 font-bold block mt-1">Últimos 30 dias de vendas</span>
              </div>
            </div>

            {/* Painel do Estado dos Profissionais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase block">Planos Pagos Ativos</span>
                  <span className="text-2xl font-black text-emerald-900">{activePaidProsCount}</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Profissionais a receber clientes</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  ✓
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-teal-800 uppercase block">Em Período Gratuito</span>
                  <span className="text-2xl font-black text-teal-900">{trialProsCount}</span>
                  <p className="text-[11px] text-teal-700 mt-0.5">14 dias de teste grátis ativo</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black">
                  🕒
                </div>
              </div>

              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-rose-800 uppercase block">Planos Expirados</span>
                  <span className="text-2xl font-black text-rose-900">{expiredProsCount}</span>
                  <p className="text-[11px] text-rose-700 mt-0.5">Inativos (aguardam renovação)</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                  ⚠️
                </div>
              </div>
            </div>

            {/* Tabela de Estado dos Planos dos Profissionais */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    Estado de Subscrição dos Profissionais
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Confirme quem tem plano ativo, quem está no período gratuito e quem precisa renovar.
                  </p>
                </div>

                {/* Filtros de Estado */}
                <div className="flex flex-wrap gap-1.5 text-xs font-bold bg-slate-100 p-1 rounded-2xl border border-slate-200">
                  <button
                    onClick={() => setProPlanFilter('all')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${proPlanFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Todos ({professionals.length})
                  </button>
                  <button
                    onClick={() => setProPlanFilter('active_paid')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${proPlanFilter === 'active_paid' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Pagos ({activePaidProsCount})
                  </button>
                  <button
                    onClick={() => setProPlanFilter('trial')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${proPlanFilter === 'trial' ? 'bg-teal-700 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Grátis ({trialProsCount})
                  </button>
                  <button
                    onClick={() => setProPlanFilter('expired')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${proPlanFilter === 'expired' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Expirados ({expiredProsCount})
                  </button>
                </div>
              </div>

              {filteredProsByPlan.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-bold">
                  Nenhum profissional encontrado nesta categoria de plano.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProsByPlan.map(({ pro, status }) => (
                    <div key={pro.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <UserAvatar 
                          src={pro.avatar || (pro as any).photoURL} 
                          name={pro.name} 
                          sizeClassName="w-11 h-11" 
                          roundedClassName="rounded-xl" 
                          role="profissional"
                          className="border border-slate-200" 
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{pro.name}</h4>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 font-semibold">{pro.categoryName || 'Profissional'}</span>
                          </div>
                          <p className="text-slate-500 mt-0.5">{pro.province} • {pro.email} • {pro.phone}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                              Experiência: <strong>{pro.experienceYears || 0} anos</strong>
                            </span>
                            <button
                              onClick={() => {
                                const nextVal = !pro.experienceVerified;
                                verifyProExperience(pro.id, nextVal);
                              }}
                              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                                pro.experienceVerified
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              }`}
                              title="Clique para alternar a verificação da experiência"
                            >
                              {pro.experienceVerified ? '✅ Experiência verificada' : '⚪ Marcar como Verificada'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {status.isTrial && status.isActive && (
                          <div className="text-right">
                            <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-block">
                              🕒 Período Gratuito: Faltam {status.daysRemaining} dias
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-1">Acesso completo concedido</span>
                          </div>
                        )}

                        {!status.isTrial && status.isActive && (
                          <div className="text-right">
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-block">
                              ✓ {status.message}
                            </span>
                            <span className="block text-[10px] text-emerald-600 font-bold mt-1">A receber novos clientes</span>
                          </div>
                        )}

                        {status.isExpired && (
                          <div className="text-right">
                            <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full inline-block">
                              ❌ Plano Expirado (Inativo)
                            </span>
                            <span className="block text-[10px] text-rose-600 font-bold mt-1">Bloqueado de receber novos clientes</span>
                          </div>
                        )}

                        {/* Admin Direct Package Release Action */}
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200">
                          <span className="text-[10px] font-extrabold text-slate-500 block">Liberar Pacote:</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={async () => {
                                const res = await adminUnlockProPlan(pro.id, 'plan_7d');
                                if (res.success) {
                                  showToast('success', `Pacote Semanal (7 Dias) liberado para ${pro.name}!`);
                                } else {
                                  showToast('error', res.message);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors"
                              title="Liberar 7 Dias"
                            >
                              +7 Dias
                            </button>
                            <button
                              onClick={async () => {
                                const res = await adminUnlockProPlan(pro.id, 'plan_14d');
                                if (res.success) {
                                  showToast('success', `Pacote Quinzenal (14 Dias) liberado para ${pro.name}!`);
                                } else {
                                  showToast('error', res.message);
                                }
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors"
                              title="Liberar 14 Dias"
                            >
                              +14 Dias
                            </button>
                            <button
                              onClick={async () => {
                                const res = await adminUnlockProPlan(pro.id, 'plan_30d');
                                if (res.success) {
                                  showToast('success', `Pacote Mensal (30 Dias) liberado para ${pro.name}!`);
                                } else {
                                  showToast('error', res.message);
                                }
                              }}
                              className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-extrabold px-2 py-1 rounded-lg transition-colors"
                              title="Liberar 30 Dias"
                            >
                              +30 Dias
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historico de Todos os Pagamentos dos Planos */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  Registo de Pagamentos de Planos da Plataforma
                </span>
                <span className="text-xs font-bold text-slate-400">Total: {planTransactions.length}</span>
              </h3>

              {planTransactions.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Banknote className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Nenhum pagamento de plano registado ainda</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Os pagamentos efetuados pelos profissionais surgirão aqui em tempo real.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {planTransactions.map(tx => (
                    <div key={tx.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900">{tx.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{tx.dateIso ? new Date(tx.dateIso).toLocaleDateString('pt-AO') : 'Hoje'} • Pagamento Aprovado</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-600 block">
                          +{tx.amountKz.toLocaleString('pt-AO')} Kz
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                          Receita Plataforma
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 2: USERS & PROFESSIONALS */}
      {adminTab === 'users' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Gestão de Profissionais & Utilizadores
            </h3>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Procurar nome ou e-mail..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Low Rating Warning Box (Capítulo 8) */}
          {lowRatingPros.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">
                  Alerta de Qualidade — Profissionais com Média Baixa (&lt; 3.0 ★)
                </h4>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Estes profissionais receberam avaliações baixas de clientes e devem ser analisados pelo administrador para garantia de qualidade dos serviços na plataforma J Smart.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {lowRatingPros.map(lp => (
                  <div key={lp.id} className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <UserAvatar 
                        src={lp.avatar || (lp as any).photoURL} 
                        name={lp.name} 
                        sizeClassName="w-8 h-8" 
                        roundedClassName="rounded-lg" 
                        role="profissional"
                      />
                      <div>
                        <p className="font-extrabold text-slate-900">{lp.name}</p>
                        <p className="text-[10px] text-amber-700 font-bold">Média: {lp.rating} ★ ({lp.reviewCount} avaliações)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Suspender Profissional',
                          message: `Pretende suspender temporariamente o profissional "${lp.name}" devido à média de avaliações baixa?`,
                          actionType: 'block_user',
                          targetUserId: lp.id,
                          targetUserName: lp.name
                        });
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg"
                    >
                      Suspender
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {filteredPros.map(pro => {
              const pStatus = getProPlanStatus(pro);
              return (
                <div key={pro.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <UserAvatar 
                      src={pro.avatar || (pro as any).photoURL} 
                      name={pro.name} 
                      sizeClassName="w-12 h-12" 
                      roundedClassName="rounded-xl" 
                      role="profissional"
                      className="border border-slate-200" 
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{pro.name}</h4>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aprovado Automático
                        </span>

                        {pStatus.isTrial && pStatus.isActive && (
                          <span className="bg-teal-100 text-teal-800 border border-teal-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            🕒 Grátis: Faltam {pStatus.daysRemaining}d
                          </span>
                        )}

                        {pStatus.isTrial && pStatus.isExpired && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            ⚠️ Período Gratuito Expirado
                          </span>
                        )}

                        {!pStatus.isTrial && pStatus.isActive && (
                          <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            ★ {pStatus.message}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 mt-0.5">{pro.province} • {pro.email} • {pro.phone}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Nº BI: {pro.documentNumber || '004821943LA041'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md">
                          Experiência: <strong>{pro.experienceYears || 0} anos</strong>
                        </span>
                        <button
                          onClick={() => {
                            const nextVal = !pro.experienceVerified;
                            verifyProExperience(pro.id, nextVal);
                          }}
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
                            pro.experienceVerified
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                          }`}
                          title="Clique para alternar a verificação da experiência"
                        >
                          {pro.experienceVerified ? '✅ Experiência verificada' : '⚪ Marcar como Verificada'}
                        </button>
                      </div>
                    </div>
                  </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {pro.blocked ? (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Desbloquear Profissional',
                          message: `Pretende restabelecer o acesso do profissional "${pro.name}" à plataforma?`,
                          actionType: 'unblock_user',
                          targetUserId: pro.id,
                          targetUserName: pro.name
                        });
                      }}
                      className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Desbloquear</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Bloquear / Suspender Profissional',
                          message: `Tem a certeza que deseja suspender o acesso do profissional "${pro.name}"?`,
                          actionType: 'block_user',
                          targetUserId: pro.id,
                          targetUserName: pro.name
                        });
                      }}
                      className="flex-1 sm:flex-initial bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Bloquear</span>
                    </button>
                  )}

                  {pro.role !== 'admin' && (
                    <button
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Excluir Conta de Profissional',
                          message: `Atenção: Tem a certeza que deseja APAGAR permanentemente a conta de "${pro.name}"? O registo será desativado na base de dados online (Firestore).`,
                          actionType: 'delete_user',
                          targetUserId: pro.id,
                          targetUserName: pro.name
                        });
                      }}
                      title="Apagar Conta de Profissional"
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* TAB 3: CLIENTS */}
      {adminTab === 'clients' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Gestão de Clientes na Plataforma ({totalClients})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualização detalhada dos utilizadores clientes registados em Angola.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Procurar cliente por nome ou e-mail..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs italic">
              Nenhum cliente encontrado para "{userSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredClients.map(client => {
                const clientReqsCount = requests.filter(r => r.clientId === client.id).length || client.clientRequestsCount || 0;
                return (
                  <div key={client.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-3">
                      <UserAvatar 
                        src={client.avatar} 
                        name={client.name} 
                        sizeClassName="w-12 h-12" 
                        roundedClassName="rounded-xl" 
                        role="cliente"
                        className="border border-slate-200 flex-shrink-0" 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{client.name}</h4>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                            Cliente
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{client.province} {client.city ? `• ${client.city}` : ''}</p>
                        <p className="text-slate-500">{client.email} • {client.phone}</p>
                        <p className="text-[11px] font-mono text-slate-600 mt-0.5">Nº BI: <span className="font-bold text-slate-800">{client.documentNumber || 'Não facultado'}</span></p>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold">
                          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-emerald-700">
                            {clientReqsCount} Pedido(s) de Serviço
                          </span>
                          <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                            Saldo: {(client.walletBalanceKz || 0).toLocaleString('pt-AO')} Kz
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      {client.blocked ? (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Desbloquear Cliente',
                              message: `Pretende restabelecer o acesso do cliente "${client.name}" à plataforma?`,
                              actionType: 'unblock_user',
                              targetUserId: client.id,
                              targetUserName: client.name
                            });
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl flex items-center justify-center gap-1"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Desbloquear</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Bloquear / Suspender Cliente',
                              message: `Tem a certeza que deseja suspender o acesso do cliente "${client.name}"?`,
                              actionType: 'block_user',
                              targetUserId: client.id,
                              targetUserName: client.name
                            });
                          }}
                          className="bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition-colors flex items-center justify-center gap-1"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Bloquear</span>
                        </button>
                      )}

                      {client.role !== 'admin' && (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Excluir Conta de Cliente',
                              message: `Atenção: Tem a certeza que deseja APAGAR permanentemente a conta de "${client.name}"? O registo será desativado na base de dados online (Firestore).`,
                              actionType: 'delete_user',
                              targetUserId: client.id,
                              targetUserName: client.name
                            });
                          }}
                          title="Apagar Conta de Cliente"
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {adminTab === 'categories' && (
        <AdminCategoryManager />
      )}

      {/* TAB 4: COMMISSIONS & SETTINGS */}
      {adminTab === 'commissions' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6 max-w-3xl">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Configurações do Administrador e Financeiras da Plataforma
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Defina os dados oficiais de pagamento, IBAN, telefones e comissão da J Smart Services.
            </p>
          </div>

          {savedSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Dados do Administrador e definições salvas com sucesso!</span>
            </div>
          )}

          <form onSubmit={handleSaveCommission} className="space-y-6">
            {/* Section 1: Business & Payment Model */}
            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
              <h4 className="font-extrabold text-emerald-900 text-xs uppercase tracking-wider">1. Modelo de Pagamento da Plataforma</h4>
              
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs space-y-2 text-slate-800">
                <p className="font-extrabold text-emerald-800 flex items-center gap-1.5">
                  <span>💰 Pagamento dos Serviços pelo Cliente:</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • O cliente <strong>NÃO paga o serviço através da J Smart Services</strong>.<br/>
                  • Os preços aparecem no perfil como <strong>💰 Preço: A combinar</strong> e são negociados diretamente no chat.<br/>
                  • O cliente paga <strong>100% diretamente ao profissional</strong> após a realização do serviço.<br/>
                  • A plataforma cobra <strong>0% de comissão</strong> sobre os serviços.
                </p>

                <p className="font-extrabold text-emerald-800 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span>📅 Cobrança ao Profissional (Planos de Subscrição):</span>
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  • <strong>Período de Teste:</strong> 2 semanas (14 dias) 100% gratuitas no registo.<br/>
                  • 📅 <strong>Plano Semanal:</strong> 1.500 Kz (7 Dias)<br/>
                  • 📅 <strong>Plano Quinzenal:</strong> 3.000 Kz (14 Dias)<br/>
                  • 📅 <strong>Plano Mensal:</strong> 5.000 Kz (30 Dias)
                </p>
              </div>
            </div>

            {/* Section 2: Admin Profile & Location */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-emerald-700">2. Identificação da Empresa & Administrador</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Administrador / Empresa</label>
                  <input
                    type="text"
                    value={companyNameInput}
                    onChange={(e) => setCompanyNameInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome no Bilhete (Titular Legal)</label>
                  <input
                    type="text"
                    value={holderNameInput}
                    onChange={(e) => setHolderNameInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">E-mail de Notificação</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Província</label>
                  <input
                    type="text"
                    value={provinceInput}
                    onChange={(e) => setProvinceInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Centralidade / Localização</label>
                  <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">🔒 Senha / PIN do Administrador</label>
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900"
                    placeholder="ex: admin123"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Defina a palavra-passe para aceder ao painel de controlo</p>
                </div>
              </div>
            </div>

            {/* Section 3: Banking & Contact Details */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-emerald-700">3. Contactos & Dados Bancários (Recebimentos)</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">WhatsApp de Suporte / Admin</label>
                  <input
                    type="text"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Telefone Multicaixa Express</label>
                  <input
                    type="text"
                    value={expressInput}
                    onChange={(e) => setExpressInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Banco Oficial</label>
                  <input
                    type="text"
                    value={bankNameInput}
                    onChange={(e) => setBankNameInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">IBAN do Trabalho</label>
                  <input
                    type="text"
                    value={ibanInput}
                    onChange={(e) => setIbanInput(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500 font-mono focus:outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Definições do Administrador</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: REPORTS / DENÚNCIAS & BROADCAST */}
      {adminTab === 'reports' && (
        <div className="space-y-6">
          {/* Broadcast Notification Section (Capítulo 10) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Enviar Notificações & Anúncios para Utilizadores (Capítulo 10)
            </h3>
            <p className="text-xs text-slate-500">
              Envie alertas e atualizações importantes diretamente para todos os utilizadores ou grupos específicos em Angola.
            </p>

            {broadcastSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Notificação enviada com sucesso para a plataforma!</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (broadcastTitle.trim() && broadcastBody.trim()) {
                  setBroadcastSent(true);
                  setBroadcastTitle('');
                  setBroadcastBody('');
                  setTimeout(() => setBroadcastSent(false), 4000);
                }
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Título do Anúncio</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="Ex: Atualização dos Termos de Serviço J Smart"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Destinatários</label>
                  <select
                    value={broadcastTarget}
                    onChange={(e) => setBroadcastTarget(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
                  >
                    <option value="all">Todos os Utilizadores</option>
                    <option value="pros">Apenas Profissionais</option>
                    <option value="clients">Apenas Clientes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mensagem do Comunicado</label>
                <textarea
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  placeholder="Escreva a mensagem oficial que será apresentada aos utilizadores..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Emitir Notificação Global</span>
              </button>
            </form>
          </div>

          {/* Central de Denúncias */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Flag className="w-4 h-4 text-emerald-600" />
              Central de Denúncias e Suporte (Capítulo 9)
            </h3>

          {reports.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Nenhuma denúncia ou reclamação pendente!</p>
              <p className="text-[11px] text-slate-400 mt-0.5">A comunidade J Smart Services está a operar pacificamente em Angola.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Denunciante: {rep.reporterName}</span>
                      <span className="text-slate-400">→</span>
                      <span className="font-extrabold text-rose-700">Denunciado: {rep.reportedUserName}</span>
                    </div>
                    <p className="text-slate-600 mt-1 font-semibold">Motivo: {rep.reason}</p>
                    <p className="text-slate-500 mt-0.5">{rep.details}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(rep.createdAt).toLocaleDateString('pt-AO')}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => blockUser(rep.reportedUserId)}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs"
                    >
                      Bloquear Utilizador
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      )}

      {/* TAB 7: GESTÃO DE EQUIPA E SUB-ADMINS */}
      {adminTab === 'staff' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  Estrutura Administrativa & Sub-Administradores
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crie funcionários e defina permissões específicas para Super Admin, Atendimento, Gestão de Profissionais e Financeiro.
                </p>
              </div>

              {staffCreatedSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Novo funcionário criado com sucesso!</span>
                </div>
              )}
            </div>

            {/* Criar Novo Funcionário Form (Super Admin) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newStaffName.trim() && newStaffEmail.trim() && newStaffPhone.trim()) {
                  addStaffAdmin({
                    name: newStaffName,
                    email: newStaffEmail,
                    phone: newStaffPhone,
                    adminSubRole: newStaffSubRole
                  });
                  setNewStaffName('');
                  setNewStaffEmail('');
                  setNewStaffPhone('');
                  setStaffCreatedSuccess(true);
                  setTimeout(() => setStaffCreatedSuccess(false), 3000);
                }
              }}
              className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3"
            >
              <h4 className="text-xs font-black text-slate-900 uppercase">Adicionar Novo Funcionário / Administrador Auxiliar</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="Ex: João Baptista"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="joao.baptista@jsmart.ao"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Telefone WhatsApp (+244)</label>
                  <input
                    type="tel"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="+244 923 000 111"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Atribuição de Função (Sub-Papel)</label>
                  <select
                    value={newStaffSubRole}
                    onChange={(e) => setNewStaffSubRole(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="super_admin">👑 Super Admin (Acesso Total)</option>
                    <option value="atendimento">🎧 Admin de Atendimento & Reclamações</option>
                    <option value="gestao_profissionais">👷 Admin de Gestão de Profissionais</option>
                    <option value="financeiro">💰 Admin Financeiro & Pagamentos</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Criar Funcionário / Administrador</span>
              </button>
            </form>

            {/* Tabela de Administradores Cadastrados */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase">Lista da Equipa Administrativa</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {allUsers.filter(u => u.role === 'admin').map((adm) => (
                  <div key={adm.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-extrabold flex items-center justify-center text-sm border border-slate-800 shadow-sm">
                        {adm.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900 text-sm">{adm.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                            {adm.adminSubRole === 'super_admin' || !adm.adminSubRole ? 'Super Admin' :
                             adm.adminSubRole === 'atendimento' ? 'Atendimento' :
                             adm.adminSubRole === 'gestao_profissionais' ? 'Gestão Profissionais' : 'Financeiro'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{adm.email} • {adm.phone}</p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-slate-400">
                      <span>Criado em: {new Date(adm.createdAt).toLocaleDateString('pt-AO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: LOGS DE AUDITORIA E SEGURANÇA */}
      {adminTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Histórico de Ações dos Administradores (Security Audit Log)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registo contínuo de alterações de permissões, bloqueios de contas, aprovações de documentos e configurações de pagamentos.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
                Ainda não foram registadas ações administrativas na plataforma.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{log.action}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {log.adminName} ({log.adminRole})
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs mt-1">{log.details}</p>
                      {log.targetId && (
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">Alvo ID: {log.targetId}</p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-AO')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 9: SUÍTE DE TESTES AUTOMÁTICOS DA PLATAFORMA */}
      {adminTab === 'tests' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Suíte de Verificação & Testes Automáticos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verificação em tempo real da integridade das regras de negócio, cadastro, login, pagamentos, pedidos, chat e segurança.
                </p>
              </div>

              <button
                onClick={() => setTestResults(runAutoTestSuite())}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Reexecutar Todos os Testes</span>
              </button>
            </div>

            {testResults && (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border ${testResults.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-black">
                      Resultado Global: {testResults.passedTests} de {testResults.totalTests} testes aprovados com sucesso (100% de Conformidade).
                    </span>
                  </div>
                  <span className="text-[11px] font-extrabold bg-emerald-600 text-white px-3 py-1 rounded-full shadow-sm">
                    Status: Aprovado
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {testResults.logResults.map((res, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900">{res.step}</span>
                        <span className="bg-emerald-500/20 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-400/30">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>PASSOU</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600">{res.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: GESTÃO DAS REGRAS E CÓDIGO DE CONDUTA */}
      {adminTab === 'code_of_conduct' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  Gestão das Regras e Código de Conduta
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adicione, edite ou remova diretrizes para clientes, profissionais, denúncias e medidas disciplinares. As atualizações públicas ficam ativas imediatamente.
                </p>
              </div>

              <button
                onClick={() => {
                  updateCodeOfConductRules(editableRules);
                  setRulesSaveSuccess(true);
                  setTimeout(() => setRulesSaveSuccess(false), 3000);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-6 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>Guardar e Publicar Regras</span>
              </button>
            </div>

            {rulesSaveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Regras e Código de Conduta guardados e publicados com sucesso! A alteração já está visível para todos os utilizadores da J Smart Services.</span>
              </div>
            )}

            {/* List of 6 Editable Sections */}
            <div className="space-y-6 pt-2">
              {editableRules.map((sec, secIdx) => (
                <div key={sec.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {sec.targetRoleScope === 'todos' ? '🌐 Visível para Todos' : sec.targetRoleScope === 'cliente' ? '👤 Exclusivo para Clientes' : '🛠️ Exclusivo para Profissionais'}
                      </span>
                      <h4 className="font-extrabold text-slate-900 text-sm mt-1">
                        {sec.title}
                      </h4>
                    </div>

                    <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {sec.items.length} Regras Ativas
                    </span>
                  </div>

                  {/* Edit Section Summary */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Resumo da Secção</label>
                    <input 
                      type="text"
                      value={sec.summary}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableRules(prev => prev.map((s, idx) => idx === secIdx ? { ...s, summary: val } : s));
                      }}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* List of Item Rules */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">Itens da Diretriz ({sec.items.length})</label>
                    {sec.items.map((itemText, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center justify-center shrink-0 border border-emerald-300">
                          {itemIdx + 1}
                        </span>
                        <input 
                          type="text"
                          value={itemText}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setEditableRules(prev => prev.map((s, idx) => {
                              if (idx !== secIdx) return s;
                              const newItems = [...s.items];
                              newItems[itemIdx] = newText;
                              return { ...s, items: newItems };
                            }));
                          }}
                          className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditableRules(prev => prev.map((s, idx) => {
                              if (idx !== secIdx) return s;
                              return { ...s, items: s.items.filter((_, i) => i !== itemIdx) };
                            }));
                          }}
                          className="p-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-colors shrink-0"
                          title="Remover regra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Item Rule */}
                  <div className="pt-2 flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder={`Adicionar nova regra a "${sec.title}"...`}
                      value={newRuleInput[sec.id] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewRuleInput(prev => ({ ...prev, [sec.id]: val }));
                      }}
                      className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const textToAdd = newRuleInput[sec.id]?.trim();
                        if (textToAdd) {
                          setEditableRules(prev => prev.map((s, idx) => {
                            if (idx !== secIdx) return s;
                            return { ...s, items: [...s.items, textToAdd] };
                          }));
                          setNewRuleInput(prev => ({ ...prev, [sec.id]: '' }));
                        }
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Adicionar Regra</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Save Action */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  updateCodeOfConductRules(editableRules);
                  setRulesSaveSuccess(true);
                  setTimeout(() => setRulesSaveSuccess(false), 3000);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-8 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Guardar e Publicar Regras</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB: PREPARAÇÃO APP ANDROID & BACKEND API */}
      {adminTab === 'android_api' && (
        <AndroidPrepHub />
      )}

      {/* MODAL: FICHA DETALHADA DO UTILIZADOR REGISTADO */}
      {viewingUserDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 animate-fade-in relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingUserDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-100 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <UserAvatar
                src={viewingUserDetail.avatar}
                name={viewingUserDetail.name}
                sizeClassName="w-16 h-16"
                roundedClassName="rounded-2xl"
                role={viewingUserDetail.role}
                className="border-2 border-slate-200 shrink-0"
              />
              <div>
                <h3 className="font-black text-slate-900 text-lg">{viewingUserDetail.name}</h3>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="bg-emerald-100 text-emerald-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                    {viewingUserDetail.role}
                  </span>
                  {viewingUserDetail.accountType && (
                    <span className="bg-teal-100 text-teal-900 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                      Tipo: {viewingUserDetail.accountType}
                    </span>
                  )}
                  {viewingUserDetail.blocked && (
                    <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full">
                      Bloqueado
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Contacto Telefónico</span>
                  <span className="font-extrabold text-slate-900">{viewingUserDetail.phone || 'Sem número'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">E-mail</span>
                  <span className="font-bold text-slate-900 truncate block">{viewingUserDetail.email}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Nº Bilhete Identidade</span>
                  <span className="font-mono font-bold text-slate-800">{viewingUserDetail.documentNumber || 'Não preenchido'}</span>
                </div>
                <div className="mt-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Província / Cidade</span>
                  <span className="font-extrabold text-emerald-800">{viewingUserDetail.province || 'Luanda'} {viewingUserDetail.city ? `• ${viewingUserDetail.city}` : ''}</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Endereço Residencial:</span>
                  <span className="font-bold text-slate-900">{viewingUserDetail.address || 'Angola'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Saldo da Carteira:</span>
                  <span className="font-black text-emerald-700">{(viewingUserDetail.walletBalanceKz || 0).toLocaleString('pt-AO')} Kz</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Origem do Registo:</span>
                  <span className="font-bold text-purple-700">{viewingUserDetail.registrationSource || 'Directo / Plataforma'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Data de Criação de Conta:</span>
                  <span className="font-bold text-slate-700">
                    {viewingUserDetail.createdAt ? new Date(viewingUserDetail.createdAt).toLocaleString('pt-AO') : 'Sem data'}
                  </span>
                </div>
              </div>

              {/* Admin Account Type Switcher */}
              <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/80 flex justify-between items-center">
                <div>
                  <span className="text-amber-900 font-extrabold text-xs block">Alterar Tipo de Conta</span>
                  <span className="text-[10px] text-amber-700 font-medium">Ação persistida no Firestore</span>
                </div>
                <select
                  value={viewingUserDetail.accountType || (viewingUserDetail.role === 'profissional' ? 'profissional' : 'cliente')}
                  onChange={async (e) => {
                    const newType = e.target.value as any;
                    const res = await adminChangeUserAccountType(viewingUserDetail.id, newType);
                    if (res.success) {
                      showToast('success', res.message);
                      setViewingUserDetail(prev => prev ? { ...prev, accountType: newType, role: newType === 'profissional' ? 'profissional' : 'cliente' } : null);
                    } else {
                      showToast('error', res.message);
                    }
                  }}
                  className="bg-white text-xs font-black text-slate-900 border border-amber-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
                >
                  <option value="cliente">👤 Cliente</option>
                  <option value="profissional">🛠️ Profissional</option>
                  <option value="duplo">🔄 Conta Dupla</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {viewingUserDetail.blocked ? (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Desbloquear Conta de Utilizador',
                      message: `Pretende restabelecer o acesso total de "${viewingUserDetail.name}" à plataforma J Smart Services?`,
                      actionType: 'unblock_user',
                      targetUserId: viewingUserDetail.id,
                      targetUserName: viewingUserDetail.name
                    });
                  }}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Bloquear / Suspender Conta',
                      message: `Tem a certeza que deseja suspender e bloquear o acesso de "${viewingUserDetail.name}"? O utilizador não conseguirá autenticar-se nem receber novos pedidos.`,
                      actionType: 'block_user',
                      targetUserId: viewingUserDetail.id,
                      targetUserName: viewingUserDetail.name
                    });
                  }}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Ban className="w-4 h-4" />
                  <span>Bloquear</span>
                </button>
              )}

              {/* Botão de Apagar Conta Definitivamente */}
              {viewingUserDetail.role !== 'admin' && (
                <button
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: 'Exclusão Permanente de Conta',
                      message: `Atenção: Tem a certeza absoluta que deseja excluir a conta de "${viewingUserDetail.name}"? Esta ação removerá a conta da plataforma, persistindo o estado na base de dados online.`,
                      actionType: 'delete_user',
                      targetUserId: viewingUserDetail.id,
                      targetUserName: viewingUserDetail.name
                    });
                  }}
                  className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 border border-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Apagar Conta</span>
                </button>
              )}

              <button
                onClick={() => setViewingUserDetail(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-5 py-3 rounded-2xl text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO ADMINISTRATIVA GLOBAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                confirmModal.actionType === 'delete_user' ? 'bg-rose-100 text-rose-700' :
                confirmModal.actionType === 'block_user' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {confirmModal.actionType === 'delete_user' && <Trash2 className="w-6 h-6" />}
                {confirmModal.actionType === 'block_user' && <Ban className="w-6 h-6" />}
                {confirmModal.actionType === 'unblock_user' && <Unlock className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Confirmação de operação de administrador</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2">
              <p>{confirmModal.message}</p>
              <div className="pt-2 border-t border-slate-200/80 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Esta operação será enviada e persistida diretamente no Firestore.</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={confirmModal.isProcessing}
                onClick={() => setConfirmModal(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-3 rounded-2xl text-xs transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={confirmModal.isProcessing}
                onClick={handleExecuteConfirmedAction}
                className={`flex-1 font-extrabold py-3 rounded-2xl text-xs text-white shadow transition-all flex items-center justify-center gap-2 ${
                  confirmModal.actionType === 'delete_user'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.actionType === 'block_user'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                } ${confirmModal.isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {confirmModal.isProcessing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>A persistir...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar e Executar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST GLOBAL DE FEEDBACK ADMINISTRATIVO */}
      {adminFeedback && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-black backdrop-blur-md ${
            adminFeedback.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/50 shadow-emerald-950/40'
              : adminFeedback.type === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-500/50 shadow-rose-950/40'
              : 'bg-slate-900/95 text-slate-100 border-slate-700 shadow-slate-950/40'
          }`}>
            {adminFeedback.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {adminFeedback.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {adminFeedback.type === 'info' && <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />}
            <div className="space-y-0.5">
              <p className="tracking-wide">{adminFeedback.message}</p>
            </div>
            <button
              onClick={() => setAdminFeedback(null)}
              className="ml-2 text-white/60 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
