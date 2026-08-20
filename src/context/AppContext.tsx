import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  User, 
  UserRole, 
  AccountType,
  AdminSubRole,
  ProfessionalProfile, 
  ServiceRequest, 
  ChatMessage, 
  ChatConversation,
  Review, 
  ServiceCategory,
  RequestStatus,
  WalletTransaction,
  UserReport,
  PlatformSettings,
  ProSubscriptionPlan,
  AppNotification,
  AdminAuditLog,
  CodeOfConductSection,
  WorkFeedPost
} from '../types';
import { DEFAULT_CODE_OF_CONDUCT_RULES } from '../data/defaultCodeOfConduct';
import { PLAN_PRICES, getProPlanStatus, validateProAction } from '../utils/planUtils';
import { isNotificationForUser } from '../utils/notificationUtils';
import { runFullSystemTestSuite } from '../utils/systemTestSuite';
import { 
  AccountRecoverySession, 
  RECOVERY_MESSAGES, 
  checkRecoveryRateLimit, 
  generateSecureOTP, 
  maskPhoneNumber, 
  maskEmailAddress, 
  isValidAngolanPhone, 
  normalizeAngolanPhone, 
  OTP_EXPIRATION_MS, 
  MAX_OTP_ATTEMPTS 
} from '../utils/recoveryUtils';
import { CATEGORIES, DEFAULT_ADMIN_USER, MOCK_USERS, MOCK_PROFESSIONALS, MOCK_REQUESTS, MOCK_MESSAGES, MOCK_REVIEWS, MOCK_WORK_FEED_POSTS } from '../mockData';
import { db, auth } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

export type ActiveTab = 'home' | 'feed' | 'categories' | 'search' | 'requests' | 'chat' | 'profile' | 'admin' | 'pro_dashboard' | 'wallet';

export const FICTITIOUS_MOCK_IDS = new Set([
  'user-duplo-lusevakueno',
  'pro-lusevakueno',
  'user-cli-makaya',
  'user-cli-antonio',
  'pro-pedro-silva',
  'user-duplo-manuel',
  'user-cli-maria',
  'pro-mateus-domingos',
  'pro-1',
  'pro-2',
  'pro-3',
  'feed-1',
  'feed-2',
  'feed-3',
  'feed-4',
  'user-duplo-1',
  'guest-client'
]);

export const isFictitiousOrInvalidUser = (user: Partial<User & ProfessionalProfile> | null | undefined): boolean => {
  if (!user || !user.id) return true;
  const id = user.id.toLowerCase();
  
  // Real Super Admin should NEVER be filtered
  if (id === 'user-admin-1' || user.email === 'jfigueiredo790@gmail.com' || (user.phone && user.phone.replace(/\D/g, '') === '956011985')) {
    return false;
  }

  if (FICTITIOUS_MOCK_IDS.has(id)) return true;
  if (id.startsWith('mock-') || id.startsWith('dummy-') || id.startsWith('test-user-')) return true;

  // Deleted or soft deleted
  if (user.isDeleted === true || user.status === 'deleted') return true;

  // Dummy placeholder names or guest placeholder
  const name = (user.name || '').trim().toLowerCase();
  if (!name || name === 'novo cliente' || name === 'cliente teste' || name === 'guest client' || name === 'novo profissional') {
    return true;
  }

  // Fictitious client without contact info
  if (!user.phone && !user.email) return true;

  return false;
};


interface AppContextType {
  currentUser: User;
  userRole: UserRole;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  switchRole: (role: UserRole) => void;
  
  // Data lists
  categories: ServiceCategory[];
  professionals: ProfessionalProfile[];
  allUsers: User[];
  requests: ServiceRequest[];
  messages: ChatMessage[];
  reviews: Review[];
  walletTransactions: WalletTransaction[];
  reports: UserReport[];
  auditLogs: AdminAuditLog[];
  platformSettings: PlatformSettings;
  workFeedPosts: WorkFeedPost[];

  // Work Feed & Subscription Prompt Actions
  addWorkFeedPost: (post: Omit<WorkFeedPost, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>) => { success: boolean; error?: string };
  updateWorkFeedPost: (
    postId: string,
    updatedData: Partial<Pick<WorkFeedPost, 'title' | 'description' | 'categoryName' | 'categoryId' | 'mediaUrl' | 'mediaType' | 'mediaUrls' | 'location' | 'priceKz'>>
  ) => Promise<{ success: boolean; message?: string }>;
  likeWorkFeedPost: (postId: string, reaction?: string) => void;
  deleteWorkFeedPost: (postId: string) => void;
  isSubExpiredModalOpen: boolean;
  setIsSubExpiredModalOpen: (open: boolean) => void;
  subExpiredCustomMessage: string;
  triggerBlockedActionPrompt: (customMessage?: string) => void;

  // Filters
  selectedCategory: string | null;
  setSelectedCategory: (catId: string | null) => void;
  selectedProvince: string;
  setSelectedProvince: (province: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selected entities for modals / details
  selectedPro: ProfessionalProfile | null;
  setSelectedPro: (pro: ProfessionalProfile | null) => void;
  activeChatRequestId: string | null;
  setActiveChatRequestId: (reqId: string | null) => void;
  conversations: ChatConversation[];
  unreadChatMessagesCount: number;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  startOrOpenConversation: (proId: string, serviceTitle?: string, categoryId?: string, initialMessage?: string) => string;
  
  // Modals state
  isNewRequestOpen: boolean;
  setIsNewRequestOpen: (open: boolean) => void;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  reviewingRequestId: string | null;
  setReviewingRequestId: (reqId: string | null) => void;
  
  // Notifications System (Capítulo 12)
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;

  // Actions
  createServiceRequest: (newReq: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'clientName' | 'clientAvatar' | 'clientPhone'>) => void;
  updateRequestStatus: (requestId: string, status: RequestStatus) => void;
  sendChatMessage: (requestId: string, text: string, isQuote?: boolean, quotePriceKz?: number, imageUrl?: string, locationPin?: { label: string; lat?: number; lng?: number }) => void;
  retryChatMessage: (messageId: string) => void;
  submitReview: (reviewData: Omit<Review, 'id' | 'date'>) => void;
  verifyProfessional: (proId: string) => Promise<{ success: boolean; message: string }>;
  verifyProExperience: (proId: string, isVerified: boolean) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (updated: Partial<User & ProfessionalProfile>) => void;
  registerUserAsync: (userData: Partial<User & ProfessionalProfile>, password?: string) => Promise<{ success: boolean; message: string }>;
  loginUserWithCredentialsAsync: (emailOrPhone: string, passInput: string, selectedRole: UserRole) => Promise<{ success: boolean; message: string }>;
  
  // Account Access Recovery Methods
  requestPasswordRecoveryOtpAsync: (phoneOrEmailOrDoc: string) => Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedContact?: string;
    devCode?: string;
    isBlocked?: boolean;
  }>;
  verifyRecoveryOtpAsync: (sessionId: string, enteredCode: string) => Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }>;
  resetAccountPasswordAsync: (sessionId: string, verifiedOtp: string, newPassword: string) => Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }>;
  requestPhoneRecoveryVerificationAsync: (email: string, documentNumber: string, currentPassword?: string) => Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedCurrentPhone?: string;
    maskedEmail?: string;
    devCode?: string;
    isBlocked?: boolean;
  }>;
  updateRecoveredPhoneNumberAsync: (sessionId: string, verifiedOtp: string, newPhone: string) => Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }>;

  changeProPlan: (plan: 'gratuito' | 'pro_destaque') => void;
  subscribeToPlan: (planType: ProSubscriptionPlan, bypassBalance?: boolean) => { success: boolean; message: string };
  adminUnlockProPlan: (proId: string, planType: ProSubscriptionPlan) => Promise<{ success: boolean; message: string }>;
  adminChangeUserAccountType: (userId: string, newAccountType: AccountType) => Promise<{ success: boolean; message: string }>;
  adminUpdateProCategories: (userId: string, newCategories: string[]) => Promise<{ success: boolean; message: string }>;
  auditAndFixBuggedCategories: (options?: { dryRun?: boolean }) => Promise<{
    scannedCount: number;
    affectedCount: number;
    fixedCount: number;
    details: Array<{
      proId: string;
      proName: string;
      beforeCategories: string[];
      afterCategories: string[];
      reason: string;
      actionTaken: 'corrigido' | 'mantido' | 'analisado';
    }>;
  }>;
  
  // Wallet & Admin Actions
  addWalletDeposit: (amountKz: number, method: string) => void;
  submitPaymentWithProof: (params: {
    amountKz: number;
    type: 'deposit' | 'payment';
    description: string;
    paymentMethod: string;
    proofUrl: string;
    proofFileName?: string;
    proofFileType?: string;
    proofFileSize?: number;
    proofNote?: string;
    planId?: ProSubscriptionPlan;
  }) => { success: boolean; message: string };
  approvePaymentTransaction: (txId: string) => Promise<{ success: boolean; message: string }>;
  rejectPaymentTransaction: (txId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  requestWithdrawal: (amountKz: number, iban: string) => void;
  submitReport: (reportedUserId: string, reportedUserName: string, reason: string, details: string, requestId?: string) => void;
  blockUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  unblockUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  adminDeleteUser: (userId: string) => Promise<{ success: boolean; message: string }>;
  updatePlatformSettings: (settings: Partial<PlatformSettings>) => Promise<{ success: boolean; message: string }>;
  codeOfConductRules: CodeOfConductSection[];
  updateCodeOfConductRules: (rules: CodeOfConductSection[]) => void;
  isRulesModalOpen: boolean;
  setIsRulesModalOpen: (isOpen: boolean) => void;
  
  // Category and Subcategory Management (Admin only)
  addCategory: (category: Omit<ServiceCategory, 'id'> | ServiceCategory) => Promise<{ success: boolean; message: string; category?: ServiceCategory }>;
  updateCategory: (categoryId: string, updates: Partial<ServiceCategory>) => Promise<{ success: boolean; message: string }>;
  deleteCategory: (categoryId: string, force?: boolean) => Promise<{ success: boolean; message: string; inUse?: boolean; usageCount?: { pros: number; requests: number; posts: number } }>;
  toggleCategoryStatus: (categoryId: string) => Promise<{ success: boolean; message: string }>;
  addSubcategory: (categoryId: string, subcategoryName: string) => Promise<{ success: boolean; message: string }>;
  updateSubcategory: (categoryId: string, oldName: string, newName: string) => Promise<{ success: boolean; message: string }>;
  deleteSubcategory: (categoryId: string, subcategoryName: string) => Promise<{ success: boolean; message: string }>;
  checkCategoryUsage: (categoryId: string) => { pros: number; requests: number; posts: number; total: number };

  addStaffAdmin: (staffData: { name: string; email: string; phone: string; adminSubRole: AdminSubRole }) => void;
  logAdminAction: (action: string, targetId?: string, details?: string) => Promise<AdminAuditLog>;
  runAutoTestSuite: () => { success: boolean; totalTests: number; passedTests: number; logResults: { step: string; status: 'pass' | 'fail'; message: string }[] };

  // Auto Approval Helper
  checkProAutoApproval: (pro: Partial<ProfessionalProfile>) => { isApproved: boolean; missingFields: string[] };

  // Communication & Permissions Validator
  canChatInRequest: (req: ServiceRequest | undefined, userId?: string, activeRole?: UserRole) => { allowed: boolean; reason: string };

  // Auth state
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  loginUser: (user: User, role: UserRole) => void;
  logoutUser: () => void;
  
  // Network Connection State
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Mobile Frame view toggle
  isMobileFrame: boolean;
  setIsMobileFrame: (isMobile: boolean) => void;

  // System Test Suite Modal
  isTestSuiteOpen: boolean;
  setIsTestSuiteOpen: (isOpen: boolean) => void;
  
  // Reset data
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'j_smart_services_data_v6';

const CLEAN_GUEST_USER: User = {
  id: 'guest-client',
  name: 'Novo Cliente',
  email: 'cliente@jsmart.ao',
  phone: '+244 900 000 000',
  role: 'cliente',
  province: 'Luanda',
  city: 'Luanda',
  avatar: '',
  verified: false,
  walletBalanceKz: 0,
  createdAt: new Date().toISOString()
};

const DEFAULT_SETTINGS: PlatformSettings = {
  commissionRatePercent: 10,
  minWithdrawalKz: 5000,
  autoApprovePros: true,
  companyName: 'J smart services',
  adminHolderName: 'António Abel Figueiredo Júlio',
  adminEmail: 'jfigueiredo790@gmail.com',
  adminPhoneWhatsapp: '956011985',
  adminPhoneExpress: '956011985',
  adminBankName: 'Banco BCI (Banco de Comércio e Indústria)',
  adminIban: 'AO06 0005 0000 6605 5740 1019 7',
  adminProvince: 'Icolo e Bengo',
  adminCity: 'Centralidade do Sequele',
  adminPin: 'admin123'
};

export const checkProAutoApproval = (pro: Partial<ProfessionalProfile>): { isApproved: boolean; missingFields: string[] } => {
  const missingFields: string[] = [];
  if (!pro.name || pro.name.trim() === '') missingFields.push('Nome Completo');
  if (!pro.phone || pro.phone.trim() === '') missingFields.push('Telefone (+244)');
  if (!pro.province || pro.province.trim() === '') missingFields.push('Província');
  if (!pro.address || pro.address.trim() === '') missingFields.push('Endereço/Bairro');
  if (!pro.categories || pro.categories.length === 0) missingFields.push('Pelo menos 1 Categoria de serviço');
  if (!pro.bio || pro.bio.trim().length < 10) missingFields.push('Biografia/Apresentação (mín. 10 letras)');
  if (!pro.hourlyRateKz || pro.hourlyRateKz <= 0) missingFields.push('Tarifa Horária em Kz');

  return {
    isApproved: missingFields.length === 0,
    missingFields
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load state from local storage or fallback to mock
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_pros`);
    if (saved) {
      try {
        const parsed: ProfessionalProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(p => !isFictitiousOrInvalidUser(p));
          return filtered;
        }
      } catch {}
    }
    return MOCK_PROFESSIONALS.filter(p => !isFictitiousOrInvalidUser(p));
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_users`);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(u => !isFictitiousOrInvalidUser(u));
          if (!filtered.some(u => u.id === 'user-admin-1' || u.email === 'jfigueiredo790@gmail.com')) {
            filtered.unshift(DEFAULT_ADMIN_USER);
          }
          return filtered;
        }
      } catch {}
    }
    return MOCK_USERS.filter(u => !isFictitiousOrInvalidUser(u));
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedUser = localStorage.getItem(`${LOCAL_STORAGE_KEY}_user`);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && isFictitiousOrInvalidUser(parsed)) {
          return false;
        }
      } catch {}
    }
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_is_logged_in`);
    return saved ? JSON.parse(saved) : false;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUser = localStorage.getItem(`${LOCAL_STORAGE_KEY}_user`);
    const savedLoggedIn = localStorage.getItem(`${LOCAL_STORAGE_KEY}_is_logged_in`);
    const loggedIn = savedLoggedIn ? JSON.parse(savedLoggedIn) : false;
    if (loggedIn && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && !isFictitiousOrInvalidUser(parsed)) {
          return parsed;
        }
      } catch {}
    }
    return CLEAN_GUEST_USER;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_cats`);
    if (!saved) return CATEGORIES;
    try {
      const parsed: ServiceCategory[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map(c => c.id));
      const missingDefaults = CATEGORIES.filter(c => !existingIds.has(c.id));
      return [...parsed, ...missingDefaults];
    } catch {
      return CATEGORIES;
    }
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_cats`, JSON.stringify(categories));
  }, [categories]);

  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_reqs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_msgs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_revs`);
    return saved ? JSON.parse(saved) : [];
  });

  const DEFAULT_INITIAL_TXS: WalletTransaction[] = [];

  const [allWalletTransactions, setAllWalletTransactions] = useState<WalletTransaction[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_txs`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(t => !FICTITIOUS_MOCK_IDS.has(t.userId));
        }
      } catch {}
    }
    return DEFAULT_INITIAL_TXS;
  });

  const [reports, setReports] = useState<UserReport[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_reports`);
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_audit_logs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_settings`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        if (merged.adminPhoneExpress === '924835279' || merged.adminPhoneExpress?.includes('924835279')) {
          merged.adminPhoneExpress = '956011985';
        }
        if (merged.adminPhoneWhatsapp === '924835279' || merged.adminPhoneWhatsapp?.includes('924835279')) {
          merged.adminPhoneWhatsapp = '956011985';
        }
        return merged;
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [codeOfConductRules, setCodeOfConductRules] = useState<CodeOfConductSection[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_code_of_conduct`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        return DEFAULT_CODE_OF_CONDUCT_RULES;
      }
    }
    return DEFAULT_CODE_OF_CONDUCT_RULES;
  });

  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedPro, setSelectedPro] = useState<ProfessionalProfile | null>(null);
  const [activeChatRequestId, setActiveChatRequestId] = useState<string | null>(null);

  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);

  // Notifications state (Segmentada por tipo/papel de utilizador)
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_notifications`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'notif-1',
        userId: 'pro_all',
        targetRoleScope: 'profissional',
        title: '📢 Comunicado Oficial J Smart Services',
        message: 'Aproveite o Período Gratuito de 14 dias para profissionais prestadores de serviço.',
        type: 'comunicado_jsmart',
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-cli-1',
        userId: 'client_all',
        targetRoleScope: 'cliente',
        title: '👋 Bem-vindo à J Smart Services',
        message: 'Solicite orçamentos rápidos e encontre profissionais qualificados para a sua residência ou empresa em Angola.',
        type: 'comunicado_jsmart',
        read: false,
        createdAt: new Date().toISOString()
      },
      {
        id: 'notif-admin-1',
        userId: 'admin',
        targetRoleScope: 'admin',
        title: '⚙️ Central de Gestão J Smart Services',
        message: 'Acompanhe as métricas globais, aprovação de profissionais e relatórios de auditoria da plataforma.',
        type: 'comunicado_jsmart',
        read: false,
        createdAt: new Date().toISOString()
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_notifications`, JSON.stringify(notifications));
  }, [notifications]);

  // Work Feed State & Sub Expired Prompt
  const [workFeedPosts, setWorkFeedPosts] = useState<WorkFeedPost[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_feed_posts`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(p => !FICTITIOUS_MOCK_IDS.has(p.id) && !FICTITIOUS_MOCK_IDS.has(p.professionalId));
        }
      } catch (e) {}
    }
    return MOCK_WORK_FEED_POSTS;
  });

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(workFeedPosts));
  }, [workFeedPosts]);

  const [isSubExpiredModalOpen, setIsSubExpiredModalOpen] = useState(false);
  const [subExpiredCustomMessage, setSubExpiredCustomMessage] = useState('');

  const triggerBlockedActionPrompt = (customMsg?: string) => {
    setSubExpiredCustomMessage(customMsg || 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.');
    setIsSubExpiredModalOpen(true);
  };

  const addWorkFeedPost = (post: Omit<WorkFeedPost, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>) => {
    // Mode validation: Only active Professional mode or Admin can publish work feed posts
    if (currentUser.role !== 'profissional' && currentUser.role !== 'admin') {
      const isDual = currentUser.accountType === 'duplo';
      const msg = isDual
        ? 'A funcionalidade de divulgação e publicidade de trabalhos é exclusiva para profissionais. Alterne para o Modo Profissional para publicar.'
        : 'Apenas profissionais registados na J Smart Services podem criar publicações e divulgar serviços no Feed.';
      alert(msg);
      return { success: false, error: msg };
    }

    const validation = validateProAction(currentUser);
    if (!validation.allowed) {
      if (validation.reason === 'blocked') {
        alert('Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.');
        return { success: false, error: 'Conta bloqueada.' };
      }
      triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.');
      return { success: false, error: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.' };
    }

    const newPost: WorkFeedPost = {
      ...post,
      id: `feed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString()
    };

    setWorkFeedPosts(prev => [newPost, ...prev]);

    try {
      setDoc(doc(db, 'work_feed_posts', newPost.id), newPost).catch(() => {});
    } catch (e) {}

    return { success: true };
  };

  const likeWorkFeedPost = (postId: string, reactionEmoji: string = '❤️') => {
    const reactorId = currentUser.id;
    const reactorName = (currentUser.name || '').trim() || 'Um utilizador';

    const targetPost = workFeedPosts.find(p => p.id === postId);
    if (!targetPost) return;

    const currentReactions: Record<string, string> = { ...(targetPost.reactions || {}) };
    const hasLiked = targetPost.likedBy.includes(reactorId);
    const existingReaction = currentReactions[reactorId];

    let isAddingOrChangingReaction = false;
    let updatedLikedBy: string[];
    let updatedReactions: Record<string, string>;

    if (hasLiked && existingReaction === reactionEmoji) {
      // Toggle off: remove like/reaction
      updatedLikedBy = targetPost.likedBy.filter(id => id !== reactorId);
      updatedReactions = { ...currentReactions };
      delete updatedReactions[reactorId];
      isAddingOrChangingReaction = false;
    } else {
      // New like/reaction or changing reaction
      updatedLikedBy = hasLiked ? targetPost.likedBy : [...targetPost.likedBy, reactorId];
      updatedReactions = {
        ...currentReactions,
        [reactorId]: reactionEmoji
      };
      isAddingOrChangingReaction = true;
    }

    const updatedPost: WorkFeedPost = {
      ...targetPost,
      likedBy: updatedLikedBy,
      likesCount: updatedLikedBy.length,
      reactions: updatedReactions
    };

    setWorkFeedPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));

    try {
      setDoc(doc(db, 'work_feed_posts', postId), updatedPost, { merge: true }).catch(() => {});
    } catch (e) {}

    // Notificar o profissional proprietário da publicação
    if (isAddingOrChangingReaction) {
      const authorId = targetPost.professionalId || targetPost.ownerId;

      // Não notificar o autor se ele reagir à própria publicação
      if (authorId && authorId !== reactorId) {
        const postTitleFormatted = targetPost.title && targetPost.title.trim()
          ? `"${targetPost.title.trim()}"`
          : (targetPost.description ? `"${targetPost.description.slice(0, 35).trim()}${targetPost.description.length > 35 ? '...' : ''}"` : 'à sua publicação');

        addNotification({
          userId: authorId,
          targetRoleScope: 'profissional',
          title: `${reactionEmoji} Nova Reação na sua Publicação`,
          message: `${reactorName} reagiu ${reactionEmoji} à sua publicação ${postTitleFormatted}.`,
          type: 'publicacao_reacao',
          postId: targetPost.id,
          reaction: reactionEmoji
        });
      }
    }
  };

  const deleteWorkFeedPost = (postId: string) => {
    setWorkFeedPosts(prev => prev.filter(p => p.id !== postId));
    try {
      deleteDoc(doc(db, 'work_feed_posts', postId)).catch(() => {});
    } catch (e) {}
  };

  const updateWorkFeedPost = async (
    postId: string,
    updatedData: Partial<Pick<WorkFeedPost, 'title' | 'description' | 'categoryName' | 'categoryId' | 'mediaUrl' | 'mediaType' | 'mediaUrls' | 'location' | 'priceKz'>>
  ): Promise<{ success: boolean; message?: string }> => {
    const existingPost = workFeedPosts.find(p => p.id === postId);
    if (!existingPost) {
      return { success: false, message: 'Publicação não encontrada.' };
    }

    // Regra de Segurança: utilizador autenticado == post.professionalId/ownerId ou Administrador
    const isAuthor = currentUser.id === existingPost.professionalId || (existingPost.ownerId && currentUser.id === existingPost.ownerId);
    const isAdmin = currentUser.role === 'admin';

    if (!isAuthor && !isAdmin) {
      return { 
        success: false, 
        message: 'Acesso negado: Só tem permissão para editar as publicações criadas pela sua própria conta.' 
      };
    }

    if (currentUser.role === 'profissional' && !isAdmin) {
      const validation = validateProAction(currentUser);
      if (!validation.allowed) {
        if (validation.reason === 'blocked') {
          return { success: false, message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador.' };
        }
        triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a gerir publicações profissionais, escolha um plano e efetue o pagamento.');
        return { success: false, message: 'Subscrição inativa. Por favor renove o seu plano.' };
      }
    }

    if (updatedData.description !== undefined && !updatedData.description.trim()) {
      return { success: false, message: 'A descrição da publicação é obrigatória.' };
    }

    const modificationTimestamp = new Date().toISOString();

    const updatedPost: WorkFeedPost = {
      ...existingPost,
      ...updatedData,
      id: existingPost.id, // Preservar ID original
      professionalId: existingPost.professionalId, // Preservar autor original
      professionalName: existingPost.professionalName,
      professionalAvatar: existingPost.professionalAvatar,
      professionalVerified: existingPost.professionalVerified,
      professionalCategories: existingPost.professionalCategories,
      likesCount: existingPost.likesCount, // Preservar gostos
      likedBy: existingPost.likedBy,
      createdAt: existingPost.createdAt, // Preservar data de criação
      ownerId: existingPost.ownerId,
      updatedAt: modificationTimestamp
    };

    setWorkFeedPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));

    try {
      await setDoc(doc(db, 'work_feed_posts', postId), updatedPost, { merge: true });
      return { success: true, message: 'Publicação atualizada com sucesso!' };
    } catch (err: any) {
      console.warn('Aviso ao atualizar publicação no Firestore (sincronizada localmente):', err);
      return { success: true, message: 'Publicação atualizada com sucesso!' };
    }
  };

  const addNotification = (notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    // Regra Importante do Backend: Verificar tipo/role do utilizador antes de criar a notificação
    if (notifData.userId && !['all', 'pro_all', 'client_all', 'admin'].includes(notifData.userId)) {
      const targetUser = allUsers.find(u => u.id === notifData.userId) || professionals.find(p => p.id === notifData.userId);
      if (targetUser) {
        const targetAccountType = targetUser.accountType || (targetUser.role === 'profissional' ? 'profissional' : 'cliente');
        
        // Impedir que notificações exclusivas de profissionais sejam criadas para clientes puros
        if (notifData.targetRoleScope === 'profissional' && targetAccountType === 'cliente') {
          console.warn(`[NOTIFICAÇÃO REJEITADA PELO BACKEND]: Não é possível criar notificação de profissional para o cliente ${targetUser.id}`);
          return;
        }

        // Impedir que notificações exclusivas de clientes sejam criadas para profissionais puros
        if (notifData.targetRoleScope === 'cliente' && targetAccountType === 'profissional') {
          console.warn(`[NOTIFICAÇÃO REJEITADA PELO BACKEND]: Não é possível criar notificação de cliente para o profissional ${targetUser.id}`);
          return;
        }

        // Impedir que notificações administrativas sejam criadas para utilizadores normais
        if (notifData.targetRoleScope === 'admin' && targetUser.role !== 'admin') {
          console.warn(`[NOTIFICAÇÃO REJEITADA PELO BACKEND]: Não é possível criar notificação de admin para utilizador comum ${targetUser.id}`);
          return;
        }
      }
    }

    const newN: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newN, ...prev]);

    try {
      setDoc(doc(db, 'app_notifications', newN.id), newN).catch(() => {});
    } catch (e) {}
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const unreadNotificationsCount = notifications.filter(n => {
    if (n.read) return false;
    return isNotificationForUser(n, currentUser);
  }).length;
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_cats`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_pros`, JSON.stringify(professionals));
  }, [professionals]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_reqs`, JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_msgs`, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_revs`, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_txs`, JSON.stringify(allWalletTransactions));
  }, [allWalletTransactions]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_reports`, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(platformSettings));
  }, [platformSettings]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_is_logged_in`, JSON.stringify(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(allUsers));
  }, [allUsers]);

  const loginUser = (user: User, role?: UserRole) => {
    // Check if account is deleted or blocked
    if (user.isDeleted === true || user.status === 'deleted') {
      alert('Esta conta foi desativada ou eliminada pela administração e não pode iniciar sessão.');
      return;
    }
    if (user.blocked === true || user.status === 'bloqueado') {
      alert('Esta conta encontra-se suspensa pela administração por violação dos termos de serviço.');
      return;
    }

    const finalRole: UserRole = (user.role === 'admin') 
      ? 'admin' 
      : (role || (user.accountType === 'profissional' || user.role === 'profissional' ? 'profissional' : 'cliente'));

    let targetUser: User = { ...user, role: finalRole };
    const existingUser = allUsers.find(u => u.id === user.id || (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()));
    const existingPro = professionals.find(p => p.id === user.id || (p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase()));

    if (finalRole === 'profissional') {
      if (existingPro) {
        targetUser = { ...existingPro, role: 'profissional' };
      } else if (existingUser) {
        targetUser = { ...existingUser, role: 'profissional' };
      }
    } else if (finalRole === 'admin') {
      targetUser = { ...(existingUser || user), role: 'admin' };
    } else {
      if (existingUser) {
        targetUser = { ...existingUser, role: 'cliente' };
      } else if (existingPro) {
        targetUser = { ...existingPro, role: 'cliente' };
      }
    }

    setCurrentUser(targetUser);
    setIsLoggedIn(true);

    setAllUsers(prev => {
      const exists = prev.some(u => u.id === targetUser.id || (u.email && targetUser.email && u.email === targetUser.email));
      if (exists) {
        return prev.map(u => (u.id === targetUser.id || (u.email && targetUser.email && u.email === targetUser.email)) ? { ...u, ...targetUser } : u);
      }
      return [targetUser, ...prev];
    });

    if (finalRole === 'admin') {
      setActiveTab('admin');
    } else if (finalRole === 'profissional') {
      setActiveTab('pro_dashboard');
    } else {
      setActiveTab('home');
    }
  };

  const logoutUser = () => {
    setIsLoggedIn(false);
    setCurrentUser(CLEAN_GUEST_USER);
    setActiveChatRequestId(null);
    setSelectedPro(null);
    setActiveTab('home');
  };

  const addStaffAdmin = async (staffData: { name: string; email: string; phone: string; adminSubRole: AdminSubRole; avatar?: string }) => {
    const newAdminUser: User = {
      id: `admin-staff-${Date.now()}`,
      name: staffData.name,
      email: staffData.email,
      phone: staffData.phone,
      role: 'admin',
      adminSubRole: staffData.adminSubRole,
      province: platformSettings.adminProvince || 'Icolo e Bengo',
      city: platformSettings.adminCity || 'Centralidade do Sequele',
      avatar: staffData.avatar || '',
      verified: true,
      ownerId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setAllUsers(prev => [newAdminUser, ...prev]);

    try {
      await setDoc(doc(db, 'administradores', newAdminUser.id), newAdminUser);
      await setDoc(doc(db, 'users', newAdminUser.id), newAdminUser);
    } catch (err) {
      console.warn('Firestore admin save notice:', err);
    }

    await logAdminAction('Criação de Funcionário / Admin', newAdminUser.id, `Atribuído sub-papel: ${staffData.adminSubRole}`);
  };

  const logAdminAction = async (action: string, targetId?: string, details?: string): Promise<AdminAuditLog> => {
    const newLog: AdminAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminId: currentUser.id || 'admin-system',
      adminName: currentUser.name || 'Sistema de Administração',
      adminRole: currentUser.adminSubRole || 'super_admin',
      action,
      targetId,
      details: details || '',
      timestamp: new Date().toISOString(),
      ownerId: currentUser.id
    };

    setAuditLogs(prev => [newLog, ...prev]);

    try {
      await setDoc(doc(db, 'admin_audit_logs', newLog.id), newLog);
    } catch (err) {
      console.warn('Erro ao guardar log de auditoria no Firestore:', err);
    }
    return newLog;
  };

  const runAutoTestSuite = () => {
    const report = runFullSystemTestSuite();
    return {
      success: report.status === 'ALL_PASSED',
      totalTests: report.totalTests,
      passedTests: report.passedCount,
      logResults: report.results.map(r => ({
        step: `${r.id} - ${r.category}: ${r.name}`,
        status: r.passed ? ('pass' as const) : ('fail' as const),
        message: r.message
      }))
    };
  };

  // Firestore initial sync
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    try {
      // 1. Service Requests
      const reqsRef = collection(db, 'service_requests');
      unsubscribes.push(onSnapshot(reqsRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsReqs: ServiceRequest[] = [];
          snapshot.forEach(docSnap => {
            fsReqs.push({ id: docSnap.id, ...docSnap.data() } as ServiceRequest);
          });
          setRequests(fsReqs);
        }
      }, (err) => {
        console.warn('Firestore requests snapshot notice:', err.message);
      }));

      // 2. Users (sync all real registered users across all devices and shared links)
      const usersRef = collection(db, 'users');
      unsubscribes.push(onSnapshot(usersRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsUsers: User[] = [];
          snapshot.forEach(docSnap => {
            const raw = docSnap.data();
            const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
            const uData = { 
              id: docSnap.id, 
              ...raw,
              avatar: photo,
              photoURL: photo
            } as unknown as User;
            if (!isFictitiousOrInvalidUser(uData)) {
              fsUsers.push(uData);
            }
          });
          setAllUsers(prev => {
            const fsIds = new Set(fsUsers.map(u => u.id));
            const existingNonFs = prev.filter(u => !fsIds.has(u.id) && !isFictitiousOrInvalidUser(u));
            const combined = [...fsUsers, ...existingNonFs];
            if (!combined.some(u => u.id === 'user-admin-1' || u.email === 'jfigueiredo790@gmail.com')) {
              combined.unshift(DEFAULT_ADMIN_USER);
            }
            return combined;
          });
        }
      }, (err) => {
        console.warn('Firestore users snapshot notice:', err.message);
      }));

      // 3. Professionals (sync real active professionals only)
      const prosRef = collection(db, 'professionals');
      unsubscribes.push(onSnapshot(prosRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsPros: ProfessionalProfile[] = [];
          snapshot.forEach(docSnap => {
            const raw = docSnap.data();
            const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
            const pData = { 
              id: docSnap.id, 
              ...raw,
              avatar: photo,
              photoURL: photo
            } as unknown as ProfessionalProfile;
            if (!isFictitiousOrInvalidUser(pData) && !pData.isDeleted && pData.status !== 'deleted') {
              fsPros.push(pData);
            }
          });
          setProfessionals(prev => {
            const fsIds = new Set(fsPros.map(p => p.id));
            const existingNonFs = prev.filter(p => !fsIds.has(p.id) && !isFictitiousOrInvalidUser(p) && !p.isDeleted && p.status !== 'deleted');
            return [...fsPros, ...existingNonFs];
          });
        }
      }, (err) => {
        console.warn('Firestore pros snapshot notice:', err.message);
      }));

      // 4. Chat Messages (sync in real time across client & professional)
      const msgsRef = collection(db, 'chat_messages');
      unsubscribes.push(onSnapshot(msgsRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsMsgs: ChatMessage[] = [];
          snapshot.forEach(docSnap => {
            fsMsgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
          });
          setMessages(prev => {
            const fsIds = new Set(fsMsgs.map(m => m.id));
            const localUnsaved = prev.filter(m => !fsIds.has(m.id) && m.status === 'enviando');
            const merged = [...fsMsgs, ...localUnsaved];
            merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            return merged;
          });
        }
      }, (err) => {
        console.warn('Firestore messages snapshot notice:', err.message);
      }));

      // 6. Admin Audit Logs (real-time cross-device log sync)
      const auditRef = collection(db, 'admin_audit_logs');
      unsubscribes.push(onSnapshot(auditRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsLogs: AdminAuditLog[] = [];
          snapshot.forEach(docSnap => {
            fsLogs.push({ id: docSnap.id, ...docSnap.data() } as AdminAuditLog);
          });
          fsLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAuditLogs(fsLogs);
        }
      }, (err) => {
        console.warn('Firestore audit logs snapshot notice:', err.message);
      }));

      // 7. Platform Settings
      const settingsDocRef = doc(db, 'platform_settings', 'global_config');
      unsubscribes.push(onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const fsSettings = docSnap.data() as PlatformSettings;
          setPlatformSettings(prev => ({ ...prev, ...fsSettings }));
        }
      }, (err) => {
        console.warn('Firestore settings snapshot notice:', err.message);
      }));

      // 8. Work Feed Posts (real publications by real registered professionals)
      const feedRef = collection(db, 'work_feed_posts');
      unsubscribes.push(onSnapshot(feedRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsFeed: WorkFeedPost[] = [];
          snapshot.forEach(docSnap => {
            const pData = { id: docSnap.id, ...docSnap.data() } as WorkFeedPost;
            if (!FICTITIOUS_MOCK_IDS.has(pData.id) && !FICTITIOUS_MOCK_IDS.has(pData.professionalId)) {
              fsFeed.push(pData);
            }
          });
          setWorkFeedPosts(prev => {
            const fsIds = new Set(fsFeed.map(f => f.id));
            const existingNonFs = prev.filter(f => !fsIds.has(f.id) && !FICTITIOUS_MOCK_IDS.has(f.id));
            return [...fsFeed, ...existingNonFs];
          });
        }
      }, (err) => {
        console.warn('Firestore work feed snapshot notice:', err.message);
      }));

      // 9. Categories and Subcategories (sync in real time from Firestore)
      const categoriesRef = collection(db, 'categories');
      unsubscribes.push(onSnapshot(categoriesRef, (snapshot) => {
        if (!snapshot.empty) {
          const fsCats: ServiceCategory[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const items = data.items || data.subcategories || [];
            fsCats.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              iconName: data.iconName || 'Briefcase',
              description: data.description || '',
              popularCount: data.popularCount ?? 100,
              color: data.color || 'emerald',
              group: data.group || 'Casa & Manutenção',
              items: items,
              subcategories: items,
              imageUrl: data.imageUrl || '',
              isActive: data.isActive !== false,
              ownerId: data.ownerId || '',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });

          setCategories(prev => {
            const fsMap = new Map(fsCats.map(c => [c.id, c]));
            const merged = [...fsCats];
            // Include any default categories not yet synced into Firestore
            CATEGORIES.forEach(defaultCat => {
              if (!fsMap.has(defaultCat.id)) {
                merged.push({
                  ...defaultCat,
                  isActive: defaultCat.isActive !== false,
                  subcategories: defaultCat.items || []
                });
              }
            });
            return merged;
          });
        }
      }, (err) => {
        console.warn('Firestore categories snapshot notice:', err.message);
      }));

    } catch (err) {
      console.warn('Firestore initialization notice:', err);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  // Real-time Firestore sync for Wallet Transactions (Strictly scoped: Admin sees all, Professionals see only their own)
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    let txsQuery;
    if (currentUser.role === 'admin') {
      // Administrator receives all transactions across the entire platform
      txsQuery = collection(db, 'wallet_transactions');
    } else {
      // Professional or Client: strictly queries ONLY records with their own unique userId from Firestore
      txsQuery = query(
        collection(db, 'wallet_transactions'),
        where('userId', '==', currentUser.id)
      );
    }

    const unsubscribe = onSnapshot(txsQuery, (snapshot) => {
      const fsTxs: WalletTransaction[] = [];
      snapshot.forEach(docSnap => {
        fsTxs.push({ id: docSnap.id, ...docSnap.data() } as WalletTransaction);
      });

      setAllWalletTransactions(prev => {
        if (currentUser.role === 'admin') {
          const fsIds = new Set(fsTxs.map(t => t.id));
          const existingNonFs = prev.filter(t => !fsIds.has(t.id));
          return [...fsTxs, ...existingNonFs];
        } else {
          // Replace current user's records with fresh Firestore sync, retain any non-conflicting records
          const otherUsersTxs = prev.filter(t => t.userId !== currentUser.id);
          return [...fsTxs, ...otherUsersTxs];
        }
      });
    }, (err) => {
      console.warn('Firestore transactions snapshot notice:', err.message);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.id, currentUser?.role]);

  // Cross-tab synchronization via localStorage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${LOCAL_STORAGE_KEY}_msgs` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMessages(parsed);
        } catch {}
      }
      if (e.key === `${LOCAL_STORAGE_KEY}_reqs` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setRequests(parsed);
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Switch role helper
  const switchRole = (role: UserRole) => {
    if (role === 'cliente') {
      setCurrentUser(prev => ({ 
        ...prev, 
        role: 'cliente',
        accountType: prev.accountType === 'duplo' || prev.accountType === 'profissional' ? 'duplo' : prev.accountType
      }));
      setActiveTab('home');
    } else if (role === 'profissional') {
      const proUser = professionals.find(p => p.id === currentUser.id || (p.email && p.email === currentUser.email));
      if (proUser) {
        setCurrentUser({ 
          ...proUser, 
          role: 'profissional',
          accountType: currentUser.accountType === 'duplo' ? 'duplo' : (proUser.accountType || 'profissional')
        });
      } else {
        const newPro: ProfessionalProfile = {
          ...currentUser,
          role: 'profissional',
          accountType: 'duplo',
          categories: (currentUser as any).categories && Array.isArray((currentUser as any).categories) ? (currentUser as any).categories : [],
          bio: 'Profissional qualificado em prestação de serviços.',
          experienceYears: 2,
          hourlyRateKz: 15000,
          rating: 5.0,
          reviewCount: 0,
          completedJobs: 0,
          status: 'disponivel',
          verified: true,
          documentsVerified: true,
          address: currentUser.province + ', Angola',
          documentType: 'Bilhete de Identidade',
          documentNumber: '00' + Math.floor(100000000 + Math.random() * 900000000) + 'LA042',
          portfolioImages: []
        };
        setCurrentUser(newPro);
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === newPro.id || p.email === newPro.email);
          if (exists) return prev.map(p => (p.id === newPro.id || p.email === newPro.email) ? { ...p, ...newPro } : p);
          return [newPro, ...prev];
        });
      }
      setActiveTab('pro_dashboard');
    } else if (role === 'admin') {
      if (currentUser.role === 'admin') {
        setActiveTab('admin');
      } else {
        console.warn('Operação bloqueada: Acesso ao painel administrativo restrito a administradores.');
      }
    }
  };

  // Auto Matching engine
  const runAutoMatching = (catId: string, province: string): string[] => {
    const matched = professionals.filter(p => {
      const catMatch = p.categories && p.categories.includes(catId);
      const provMatch = province === 'Todas' || p.province === province || p.province === 'Luanda';
      const planStatus = getProPlanStatus(p);
      return catMatch && provMatch && p.verified && !p.blocked && p.status !== 'ocupado' && planStatus.isActive;
    });

    matched.sort((a, b) => b.rating - a.rating);
    return matched.map(m => m.id);
  };

  // Schedule conflict detection helper
  const checkScheduleConflict = (
    newReq: ServiceRequest, 
    existingAcceptedRequests: ServiceRequest[]
  ): { hasConflict: boolean; conflictingReq?: ServiceRequest; message: string } => {
    if (!newReq.scheduledDate) {
      return { hasConflict: false, message: 'Sem data agendada.' };
    }

    const newTime = new Date(newReq.scheduledDate).getTime();
    
    for (const existing of existingAcceptedRequests) {
      if (existing.status !== 'aceito' && existing.status !== 'em_progresso') {
        continue;
      }

      if (!existing.scheduledDate) continue;

      const existingTime = new Date(existing.scheduledDate).getTime();

      // 1. Exact string match or same date/time prefix (e.g., "2026-08-15 14:00")
      const newDateStr = newReq.scheduledDate.slice(0, 16);
      const existingDateStr = existing.scheduledDate.slice(0, 16);
      const isExactMatch = newDateStr === existingDateStr;

      // 2. Time proximity within 2 hours
      let isWithinWindow = false;
      if (!isNaN(newTime) && !isNaN(existingTime)) {
        const diffMinutes = Math.abs(newTime - existingTime) / (1000 * 60);
        if (diffMinutes < 120) {
          isWithinWindow = true;
        }
      }

      if (isExactMatch || isWithinWindow) {
        const formattedDate = !isNaN(existingTime)
          ? new Date(existingTime).toLocaleString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : existing.scheduledDate;

        return {
          hasConflict: true,
          conflictingReq: existing,
          message: `Conflito de horário detetado: Já possui o serviço "${existing.title}" agendado para ${formattedDate}. Não é possível aceitar dois serviços com horários sobrepostos.`
        };
      }
    }

    return { hasConflict: false, message: 'Sem conflito de horário.' };
  };

  // Communication & Permission Validator
  const canChatInRequest = (
    req: ServiceRequest | undefined, 
    userId = currentUser.id, 
    activeRole = currentUser.role
  ): { allowed: boolean; reason: string } => {
    if (!req) {
      return { allowed: false, reason: 'Nenhuma conversa activa ou pedido de serviço não encontrado.' };
    }

    // 1. Participant check: User must be either client or professional of this request (or admin)
    const isClientOfReq = req.clientId === userId;
    const isProOfReq = req.professionalId === userId;

    if (!isClientOfReq && !isProOfReq && activeRole !== 'admin') {
      return { allowed: false, reason: 'Acesso negado: Não é participante deste pedido de serviço.' };
    }

    // 2. Prevent self-chat
    if (isClientOfReq && isProOfReq) {
      return { allowed: false, reason: 'Não é possível trocar mensagens num pedido enviado a si próprio.' };
    }

    // 3. Active Mode / Role validation & Professional Subscription Expiration check:
    // If user is client of req, activeRole MUST be 'cliente' or 'admin'
    // If user is pro of req, activeRole MUST be 'profissional' or 'admin'
    if (isClientOfReq && activeRole === 'profissional') {
      return { allowed: false, reason: 'Está a navegar no Modo Profissional. Mude para o Modo Cliente no seu perfil para conversar neste pedido.' };
    }

    if (isProOfReq && activeRole === 'cliente') {
      return { allowed: false, reason: 'Está a navegar no Modo Cliente. Mude para o Modo Profissional no seu perfil para responder a este cliente.' };
    }

    // Check if account is blocked or pro subscription plan is expired when activeRole is 'profissional'
    if (activeRole === 'profissional') {
      const validation = validateProAction(currentUser);
      if (!validation.allowed) {
        return { 
          allowed: false, 
          reason: validation.message 
        };
      }
    }

    // 4. Request Status check
    // 5. Expiration check: If request was created/scheduled long ago
    const scheduledTimestamp = new Date(req.scheduledDate).getTime();
    const now = Date.now();
    const isExpired = req.status === 'pendente' && !isNaN(scheduledTimestamp) && (now - scheduledTimestamp > 7 * 24 * 60 * 60 * 1000);
    if (isExpired) {
      return { allowed: false, reason: 'Este pedido de serviço expirou o prazo limite e não permite abertura de chat ou mensagens.' };
    }

    if (req.status === 'pendente') {
      return { allowed: false, reason: 'O chat de mensagens está bloqueado até o profissional aceitar o pedido de serviço.' };
    }

    if (req.status === 'cancelado') {
      return { allowed: false, reason: 'Este pedido foi cancelado. A comunicação foi permanentemente encerrada.' };
    }

    return { allowed: true, reason: 'Comunicação autorizada.' };
  };

  // Actions
  const createServiceRequest = (newReqData: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'clientName' | 'clientAvatar' | 'clientPhone'>) => {
    // Mode validation: Must be in Client mode to issue service requests
    if (currentUser.role === 'profissional') {
      alert('Atenção: Está a navegar no Modo Profissional. Para solicitar um serviço, alterne o seu perfil para o Modo Cliente.');
      return;
    }

    // Run auto-matching
    const matchedProIds = runAutoMatching(newReqData.categoryId, newReqData.province);
    
    // Auto-select top pro if client didn't select one (excluding self if dual role)
    let autoProId = newReqData.professionalId || matchedProIds.find(id => id !== currentUser.id) || undefined;
    if (autoProId === currentUser.id) {
      autoProId = undefined;
    }
    const autoPro = professionals.find(p => p.id === autoProId);

    const newReq: ServiceRequest = {
      ...newReqData,
      id: `req-${Date.now()}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      clientPhone: currentUser.phone,
      professionalId: autoProId,
      professionalName: autoPro?.name,
      professionalAvatar: autoPro?.avatar,
      matchedProIds,
      autoMatchedCount: matchedProIds.length,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasReview: false
    };

    setRequests(prev => [newReq, ...prev]);
    setIsNewRequestOpen(false);
    setActiveTab('requests');

    // Save to Firestore asynchronously
    try {
      setDoc(doc(db, 'service_requests', newReq.id), newReq).catch(() => {});
    } catch (e) {
      // ignore
    }

    // Notify professional if assigned
    if (autoProId) {
      addNotification({
        userId: autoProId,
        targetRoleScope: 'profissional',
        title: '🔔 Novo Pedido de Serviço Recebido',
        message: `Recebeu uma nova solicitação: "${newReq.title}" em ${newReq.address}, ${newReq.province}.`,
        type: 'pedido_novo',
        requestId: newReq.id
      });
    }

    // Initial chat message (attached for initial context on request record)
    if (newReq.professionalId) {
      const initialMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        requestId: newReq.id,
        senderId: currentUser.id,
        senderRole: currentUser.role,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: `Olá! Solicitei o serviço: "${newReq.title}". Local: ${newReq.address}, ${newReq.province}.`,
        timestamp: new Date().toISOString(),
        status: 'entregue'
      };
      setMessages(prev => [...prev, initialMsg]);
      try {
        setDoc(doc(db, 'chat_messages', initialMsg.id), initialMsg).catch(() => {});
      } catch (e) {}
    }
  };

  const updateRequestStatus = (requestId: string, status: RequestStatus) => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    // Block status update if current user is acting as professional and their subscription plan is expired or account blocked
    if (currentUser.role === 'profissional' && (status === 'aceito' || status === 'em_progresso')) {
      const validation = validateProAction(currentUser);
      if (!validation.allowed) {
        if (validation.reason === 'blocked') {
          alert('Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.');
          return;
        }
        triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.');
        return;
      }
    }

    // Assign active professional details if missing or if professional accepts request
    const updatedProId = (currentUser.role === 'profissional' || status === 'aceito') ? currentUser.id : (targetReq.professionalId || currentUser.id);
    const updatedProName = (currentUser.role === 'profissional' || status === 'aceito') ? currentUser.name : (targetReq.professionalName || currentUser.name);
    const updatedProAvatar = (currentUser.role === 'profissional' || status === 'aceito') ? currentUser.avatar : (targetReq.professionalAvatar || currentUser.avatar);

    // Schedule conflict verification when professional attempts to accept a request
    if (status === 'aceito') {
      const proAcceptedReqs = requests.filter(r => 
        r.id !== requestId && 
        r.professionalId === updatedProId && 
        (r.status === 'aceito' || r.status === 'em_progresso')
      );

      const conflictCheck = checkScheduleConflict(targetReq, proAcceptedReqs);
      if (conflictCheck.hasConflict) {
        alert(`⚠️ ${conflictCheck.message}`);
        return; // BLOCK ACCEPTANCE DUE TO TIME CONFLICT!
      }
    }

    // Issue notifications (Capítulo 12)
    if (status === 'aceito') {
      addNotification({
        userId: targetReq.clientId,
        targetRoleScope: 'cliente',
        title: '✅ Pedido Aceite',
        message: `O profissional ${updatedProName || ''} aceitou o pedido "${targetReq.title}". O chat de conversação está agora ativo!`,
        type: 'pedido_aceito',
        requestId: targetReq.id
      });
    } else if (status === 'em_progresso') {
      addNotification({
        userId: targetReq.clientId,
        targetRoleScope: 'cliente',
        title: '🛵 Profissional a Caminho',
        message: `O profissional ${updatedProName || ''} está a caminho da sua localização em ${targetReq.province}.`,
        type: 'a_caminho',
        requestId: targetReq.id
      });
    } else if (status === 'concluido') {
      addNotification({
        userId: targetReq.clientId,
        targetRoleScope: 'cliente',
        title: '⭐ Serviço Concluído - Avaliação Pendente',
        message: `O trabalho "${targetReq.title}" foi concluído! Por favor, avalie o atendimento prestado.`,
        type: 'avaliacao_pendente',
        requestId: targetReq.id
      });
    }

    // Incrementar trabalhos concluídos do profissional ao finalizar
    if (status === 'concluido' && targetReq.status !== 'concluido' && updatedProId) {
      setProfessionals(prev => prev.map(p => {
        if (p.id === updatedProId) {
          return {
            ...p,
            completedJobs: (p.completedJobs || 0) + 1
          };
        }
        return p;
      }));
    }

    const updatedDocData: Partial<ServiceRequest> = {
      status,
      professionalId: updatedProId,
      professionalName: updatedProName,
      professionalAvatar: updatedProAvatar,
      commissionAmountKz: 0,
      netProAmountKz: targetReq.budgetKz,
      updatedAt: new Date().toISOString()
    };

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          ...updatedDocData
        };
      }
      return req;
    }));

    try {
      setDoc(doc(db, 'service_requests', requestId), updatedDocData, { merge: true }).catch(err => {
        console.warn('Erro ao atualizar service_requests no Firestore:', err);
      });
    } catch (e) {
      // ignore
    }
  };

  // Conversas Reais Agregadas e Ordenadas por Recência (Capítulo de Mensagens & Chat)
  const conversations = React.useMemo<ChatConversation[]>(() => {
    if (!currentUser || !currentUser.id) return [];

    const convMap = new Map<string, ChatConversation>();

    // 1. Converter pedidos de serviço em conversas segregadas
    requests.forEach(req => {
      const isClient = req.clientId === currentUser.id;
      const isPro = req.professionalId === currentUser.id;
      const isAdmin = currentUser.role === 'admin';

      if (!isClient && !isPro && !isAdmin) {
        return;
      }

      const proProfile = professionals.find(p => p.id === req.professionalId);
      const clientProfile = allUsers.find(u => u.id === req.clientId);

      const clientName = clientProfile?.name || req.clientName || 'Cliente';
      const clientAvatar = clientProfile?.avatar || (clientProfile as any)?.photoURL || req.clientAvatar || '';
      const clientPhone = clientProfile?.phone || req.clientPhone || '';

      const proName = proProfile?.name || req.professionalName || (req.status === 'pendente' ? 'Profissional a Atribuir' : 'Profissional');
      const proAvatar = proProfile?.avatar || (proProfile as any)?.photoURL || req.professionalAvatar || '';
      const proPhone = proProfile?.phone || '';

      // Mensagens deste pedido/conversa
      const threadMsgs = messages.filter(m => m.requestId === req.id || m.conversationId === req.id);
      threadMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastMsg = threadMsgs[threadMsgs.length - 1];

      // Contagem de mensagens não lidas enviadas pelo outro utilizador
      const unreadCount = threadMsgs.filter(m => 
        m.senderId !== currentUser.id && 
        m.status !== 'lida' && 
        !m.read
      ).length;

      const lastTimestamp = lastMsg?.timestamp || req.updatedAt || req.createdAt;

      convMap.set(req.id, {
        id: req.id,
        requestId: req.id,
        clientId: req.clientId,
        clientName,
        clientAvatar,
        clientPhone,
        professionalId: req.professionalId || '',
        professionalName: proName,
        professionalAvatar: proAvatar,
        professionalPhone: proPhone,
        serviceTitle: req.title || 'Serviço Solicitado',
        categoryName: req.categoryName || 'Geral',
        province: req.province || 'Luanda',
        status: req.status,
        budgetKz: req.budgetKz,
        lastMessageText: lastMsg?.text || (req.description ? `${req.description.slice(0, 55)}${req.description.length > 55 ? '...' : ''}` : 'Conversa aberta'),
        lastMessageTimestamp: lastTimestamp,
        lastMessageSenderId: lastMsg?.senderId,
        lastMessageSenderName: lastMsg?.senderName,
        lastMessageStatus: lastMsg?.status,
        unreadCount,
        participants: [req.clientId, req.professionalId || ''].filter(Boolean),
        createdAt: req.createdAt,
        updatedAt: req.updatedAt || lastTimestamp
      });
    });

    // 2. Verificar mensagens diretas que possam ter conversationId avulso
    messages.forEach(msg => {
      const threadId = msg.conversationId || msg.requestId;
      if (!threadId || convMap.has(threadId)) return;

      const isParticipant = msg.senderId === currentUser.id || msg.receiverId === currentUser.id || (msg.participants && msg.participants.includes(currentUser.id)) || currentUser.role === 'admin';
      if (!isParticipant) return;

      const otherUserId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
      const otherUser = allUsers.find(u => u.id === otherUserId) || professionals.find(p => p.id === otherUserId);

      const threadMsgs = messages.filter(m => (m.conversationId === threadId || m.requestId === threadId));
      threadMsgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const lastMsg = threadMsgs[threadMsgs.length - 1];

      const unreadCount = threadMsgs.filter(m => 
        m.senderId !== currentUser.id && 
        m.status !== 'lida' && 
        !m.read
      ).length;

      const lastTimestamp = lastMsg?.timestamp || msg.timestamp;

      convMap.set(threadId, {
        id: threadId,
        requestId: threadId,
        clientId: msg.senderRole === 'cliente' ? msg.senderId : (otherUserId || ''),
        clientName: msg.senderRole === 'cliente' ? msg.senderName : (otherUser?.name || 'Cliente'),
        clientAvatar: msg.senderRole === 'cliente' ? msg.senderAvatar : (otherUser?.avatar || ''),
        professionalId: msg.senderRole === 'profissional' ? msg.senderId : (otherUserId || ''),
        professionalName: msg.senderRole === 'profissional' ? msg.senderName : (otherUser?.name || 'Profissional'),
        professionalAvatar: msg.senderRole === 'profissional' ? msg.senderAvatar : (otherUser?.avatar || ''),
        serviceTitle: 'Atendimento Direto',
        categoryName: 'Geral',
        province: otherUser?.province || 'Luanda',
        status: 'em_progresso',
        lastMessageText: lastMsg?.text || msg.text,
        lastMessageTimestamp: lastTimestamp,
        lastMessageSenderId: lastMsg?.senderId,
        lastMessageSenderName: lastMsg?.senderName,
        lastMessageStatus: lastMsg?.status,
        unreadCount,
        participants: msg.participants || [msg.senderId, otherUserId || ''].filter(Boolean),
        createdAt: msg.createdAt || msg.timestamp,
        updatedAt: lastTimestamp
      });
    });

    const list = Array.from(convMap.values());
    // Ordenar de forma decrescente: as conversas com mensagens/atualizações mais recentes aparecem no topo
    list.sort((a, b) => {
      const timeA = new Date(a.lastMessageTimestamp || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.lastMessageTimestamp || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

    return list;
  }, [requests, messages, currentUser, professionals, allUsers]);

  // Total de mensagens não lidas no chat para o utilizador atual
  const unreadChatMessagesCount = React.useMemo(() => {
    return conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
  }, [conversations]);

  // Marcar todas as mensagens de uma conversa como lidas
  const markConversationAsRead = async (conversationId: string) => {
    if (!conversationId || !currentUser || !currentUser.id) return;

    const unreadMsgs = messages.filter(m => 
      (m.requestId === conversationId || m.conversationId === conversationId) && 
      m.senderId !== currentUser.id && 
      (m.status !== 'lida' || !m.read)
    );

    if (unreadMsgs.length === 0) return;

    // Atualização imediata no estado local para resposta instantânea na UI
    setMessages(prev => prev.map(m => {
      if ((m.requestId === conversationId || m.conversationId === conversationId) && m.senderId !== currentUser.id) {
        return {
          ...m,
          status: 'lida',
          read: true,
          readBy: m.readBy ? (m.readBy.includes(currentUser.id) ? m.readBy : [...m.readBy, currentUser.id]) : [currentUser.id]
        };
      }
      return m;
    }));

    // Sincronização em background com o Firestore
    try {
      unreadMsgs.forEach(async (msg) => {
        await setDoc(doc(db, 'chat_messages', msg.id), {
          status: 'lida',
          read: true,
          readBy: msg.readBy ? [...new Set([...msg.readBy, currentUser.id])] : [currentUser.id],
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});
      });
    } catch (e) {
      // Ignorar erros transitórios
    }
  };

  // Iniciar ou abrir conversa com um profissional específico
  const startOrOpenConversation = (
    proId: string, 
    serviceTitle = 'Serviço Personalizado', 
    categoryId = 'pedido-personalizado', 
    initialMessage?: string
  ): string => {
    const existing = requests.find(r => 
      r.clientId === currentUser.id && 
      r.professionalId === proId && 
      r.status !== 'cancelado'
    );

    if (existing) {
      setActiveChatRequestId(existing.id);
      setActiveTab('chat');
      if (initialMessage && initialMessage.trim()) {
        sendChatMessage(existing.id, initialMessage.trim());
      }
      return existing.id;
    }

    const pro = professionals.find(p => p.id === proId);
    const cat = categories.find(c => c.id === categoryId) || categories[0];

    const newReqId = `req-${Date.now()}`;
    const newReq: ServiceRequest = {
      id: newReqId,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: currentUser.avatar,
      clientPhone: currentUser.phone,
      professionalId: proId,
      professionalName: pro?.name || 'Profissional',
      professionalAvatar: pro?.avatar || '',
      categoryId: cat?.id || 'pedido-personalizado',
      categoryName: cat?.name || 'Serviço Personalizado',
      title: serviceTitle,
      description: initialMessage || `Conversa de atendimento e solicitação de orçamento com ${pro?.name || 'o profissional'}.`,
      province: currentUser.province || 'Luanda',
      address: currentUser.address || currentUser.province || 'Luanda',
      urgency: 'Normal',
      scheduledDate: new Date().toISOString().split('T')[0],
      budgetKz: pro?.hourlyRateKz || 15000,
      status: 'aceito', // Ativo para permitir troca imediata de mensagens
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasReview: false
    };

    setRequests(prev => [newReq, ...prev]);
    setActiveChatRequestId(newReqId);
    setActiveTab('chat');

    try {
      setDoc(doc(db, 'service_requests', newReqId), newReq).catch(() => {});
    } catch (e) {}

    if (initialMessage && initialMessage.trim()) {
      sendChatMessage(newReqId, initialMessage.trim());
    }

    return newReqId;
  };

  const sendChatMessage = async (
    requestId: string, 
    text: string, 
    isQuote = false, 
    quotePriceKz?: number,
    imageUrl?: string,
    locationPin?: { label: string; lat?: number; lng?: number }
  ) => {
    const req = requests.find(r => r.id === requestId);
    const authCheck = canChatInRequest(req, currentUser.id, currentUser.role);
    if (!authCheck.allowed) {
      console.warn(`[CHAT REJEITADO]: ${authCheck.reason}`);
      alert(authCheck.reason);
      return;
    }

    const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();
    const recipientId = req ? (currentUser.id === req.clientId ? (req.professionalId || 'pro-1') : req.clientId) : '';

    const newMsg: ChatMessage = {
      id: messageId,
      requestId,
      conversationId: requestId,
      senderId: currentUser.id,
      senderRole: currentUser.role,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      receiverId: recipientId,
      participants: [currentUser.id, recipientId].filter(Boolean),
      text,
      timestamp: nowIso,
      status: 'enviando', // Initial state
      read: false,
      readBy: [currentUser.id],
      isQuickQuote: isQuote,
      quotePriceKz,
      imageUrl,
      locationPin,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    setMessages(prev => [...prev, newMsg]);

    // Atualizar o timestamp do pedido para subir imediatamente para o topo da lista de conversas
    setRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          budgetKz: isQuote && quotePriceKz ? quotePriceKz : r.budgetKz,
          updatedAt: nowIso
        };
      }
      return r;
    }));

    if (req) {
      // Atualizar no Firestore o timestamp do pedido para manter a ordenação atualizada
      try {
        setDoc(doc(db, 'service_requests', requestId), {
          updatedAt: nowIso,
          ...(isQuote && quotePriceKz ? { budgetKz: quotePriceKz } : {})
        }, { merge: true }).catch(() => {});
      } catch (e) {}
    }

    // Persistir no Firestore e atualizar estado para 'entregue'
    try {
      const docData: ChatMessage = { ...newMsg, status: 'entregue' };
      await setDoc(doc(db, 'chat_messages', messageId), docData);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'entregue' } : m));
    } catch (err) {
      console.warn('Erro ao guardar mensagem no Firestore, mantendo em estado local entregue:', err);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'entregue' } : m));
    }
  };

  const retryChatMessage = async (messageId: string) => {
    const targetMsg = messages.find(m => m.id === messageId);
    if (!targetMsg) return;

    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'enviando' } : m));

    try {
      const docData: ChatMessage = { ...targetMsg, status: 'entregue' };
      await setDoc(doc(db, 'chat_messages', messageId), docData);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'entregue' } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'falhou' } : m));
    }
  };

  const submitReview = (reviewData: Omit<Review, 'id' | 'date'>) => {
    const newRev: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews(prev => [newRev, ...prev]);

    setRequests(prev => prev.map(r => r.id === reviewData.requestId ? { ...r, hasReview: true } : r));

    setProfessionals(prev => prev.map(p => {
      if (p.id === reviewData.professionalId) {
        const proReviews = [...reviews.filter(r => r.professionalId === p.id), newRev];
        const avg = proReviews.reduce((acc, curr) => acc + curr.rating, 0) / proReviews.length;
        return {
          ...p,
          rating: Number(avg.toFixed(1)),
          reviewCount: proReviews.length
        };
      }
      return p;
    }));

    setIsReviewModalOpen(false);
    setReviewingRequestId(null);
  };

  const verifyProfessional = async (proId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const payload = { verified: true, documentsVerified: true, isAutoApproved: true };

    try {
      await setDoc(doc(db, 'professionals', proId), payload, { merge: true });
      await setDoc(doc(db, 'users', proId), payload, { merge: true });

      setProfessionals(prev => prev.map(p => p.id === proId ? { ...p, ...payload } : p));
      setAllUsers(prev => prev.map(u => u.id === proId ? { ...u, ...payload } : u));

      if (currentUser.id === proId) {
        setCurrentUser(prev => ({ ...prev, ...payload }));
      }

      await logAdminAction('Verificação de Profissional', proId, 'Documentos e conta aprovados manualmente pelo Administrador');

      return { success: true, message: 'Profissional verificado com sucesso na base de dados!' };
    } catch (err: any) {
      console.error('Erro ao verificar profissional no Firestore:', err);
      return { success: false, message: `Falha ao persistir verificação: ${err.message || err}` };
    }
  };

  const verifyProExperience = async (proId: string, isVerified: boolean): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    try {
      await setDoc(doc(db, 'professionals', proId), { experienceVerified: isVerified }, { merge: true });
      await setDoc(doc(db, 'users', proId), { experienceVerified: isVerified }, { merge: true });

      setProfessionals(prev => prev.map(p => p.id === proId ? { ...p, experienceVerified: isVerified } : p));
      setAllUsers(prev => prev.map(u => u.id === proId ? { ...u, experienceVerified: isVerified } : u));

      if (currentUser.id === proId) {
        setCurrentUser(prev => ({ ...prev, experienceVerified: isVerified }));
      }

      await logAdminAction(
        'Verificação de Experiência Profissional',
        proId,
        `Anos de experiência alterados para: ${isVerified ? 'Verificados (✅)' : 'Não verificados (⚪)'}`
      );

      return { success: true, message: `Experiência ${isVerified ? 'verificada' : 'desmarcada'} com sucesso na base de dados.` };
    } catch (err: any) {
      console.error('Erro ao verificar experiência no Firestore:', err);
      return { success: false, message: `Falha ao persistir no Firestore: ${err.message || err}` };
    }
  };

  const registerUserAsync = async (
    userData: Partial<User & ProfessionalProfile>,
    password?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const targetRole: UserRole = userData.role === 'admin' 
        ? 'admin' 
        : (userData.accountType === 'profissional' || userData.role === 'profissional' ? 'profissional' : 'cliente');
      let firebaseUid = userData.id || `user-${Date.now()}`;

      // 1. Authenticate with Firebase Auth if email and password are provided
      if (userData.email && password && password.length >= 6) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, userData.email.trim(), password);
          if (userCredential.user) {
            firebaseUid = userCredential.user.uid;
          }
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            try {
              const signInRes = await signInWithEmailAndPassword(auth, userData.email.trim(), password);
              if (signInRes.user) {
                firebaseUid = signInRes.user.uid;
              }
            } catch (signInErr: any) {
              return {
                success: false,
                message: 'Este e-mail já está registado com outra palavra-passe. Por favor faça login ou escolha outro e-mail.'
              };
            }
          } else {
            console.warn('Firebase Auth notice:', authErr.message);
          }
        }
      }

      let autoApproveObj = {};
      if (targetRole === 'profissional') {
        const merged = { ...userData } as ProfessionalProfile;
        const { isApproved } = checkProAutoApproval(merged);
        if (isApproved) {
          autoApproveObj = { verified: true, documentsVerified: true, isAutoApproved: true };
        }
      }

      const newUserObj: User = {
        id: firebaseUid,
        name: userData.name || 'Novo Utilizador',
        email: userData.email || '',
        phone: userData.phone || '',
        gender: userData.gender || 'masculino',
        password: password || userData.password || '',
        role: targetRole,
        accountType: userData.accountType || (targetRole === 'profissional' ? 'profissional' : 'cliente'),
        province: userData.province || 'Luanda',
        address: userData.address || '',
        documentNumber: userData.documentNumber || '',
        categories: userData.categories || [],
        avatar: userData.avatar || '',
        verified: true,
        createdAt: new Date().toISOString(),
        registrationSource: userData.registrationSource || 'Link Partilhado J Smart',
        ...autoApproveObj
      };

      // 2. MUST AWAIT writing to Firestore 'users' collection
      await setDoc(doc(db, 'users', firebaseUid), newUserObj, { merge: true });

      // 3. IF PROFESSIONAL/DUPLO, MUST AWAIT writing to Firestore 'professionals' collection
      if (targetRole === 'profissional' || userData.accountType === 'duplo') {
        const proProfileToSave: ProfessionalProfile = {
          id: firebaseUid,
          name: newUserObj.name,
          email: newUserObj.email,
          phone: newUserObj.phone,
          gender: newUserObj.gender,
          province: newUserObj.province,
          city: newUserObj.city || 'Luanda',
          role: 'profissional',
          accountType: userData.accountType || 'profissional',
          avatar: newUserObj.avatar,
          categories: Array.isArray(userData.categories) ? userData.categories : [],
          bio: userData.bio || 'Profissional qualificado em prestação de serviços.',
          experienceYears: userData.experienceYears || 2,
          hourlyRateKz: userData.hourlyRateKz || 15000,
          rating: 5.0,
          reviewCount: 0,
          completedJobs: 0,
          status: 'disponivel',
          verified: true,
          documentsVerified: true,
          address: userData.address || newUserObj.province + ', Angola',
          documentType: userData.documentType || 'Bilhete de Identidade',
          documentNumber: userData.documentNumber || '',
          portfolioImages: userData.portfolioImages || [],
          registrationSource: userData.registrationSource || 'Link Partilhado J Smart',
          walletBalanceKz: 0,
          createdAt: newUserObj.createdAt
        };
        await setDoc(doc(db, 'professionals', firebaseUid), proProfileToSave, { merge: true });

        setProfessionals(prev => {
          const exists = prev.some(p => p.id === firebaseUid || (p.email && p.email === proProfileToSave.email));
          if (exists) {
            return prev.map(p => (p.id === firebaseUid || (p.email && p.email === proProfileToSave.email)) ? { ...p, ...proProfileToSave } : p);
          }
          return [proProfileToSave, ...prev];
        });
      }

      // 4. Update React state for allUsers, currentUser and login
      setAllUsers(prev => {
        const exists = prev.some(u => u.id === firebaseUid || (u.email && u.email === newUserObj.email));
        if (exists) {
          return prev.map(u => (u.id === firebaseUid || (u.email && u.email === newUserObj.email)) ? { ...u, ...newUserObj } : u);
        }
        return [newUserObj, ...prev];
      });

      setCurrentUser(newUserObj);
      setIsLoggedIn(true);

      if (targetRole === 'admin') {
        setActiveTab('admin');
      } else if (targetRole === 'profissional') {
        setActiveTab('pro_dashboard');
      } else {
        setActiveTab('home');
      }

      return { success: true, message: 'Cadastro realizado com sucesso e sincronizado no Firestore!' };
    } catch (err: any) {
      console.error('Erro ao guardar cadastro no Firestore:', err);
      return {
        success: false,
        message: `Erro ao gravar na base de dados online (Firestore): ${err.message || err}. Por favor verifique a sua ligação.`
      };
    }
  };

  const loginUserWithCredentialsAsync = async (
    phoneOrEmail: string,
    passInput: string,
    selectedRole: UserRole
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const inputTrimmed = phoneOrEmail.trim();
      const inputLower = inputTrimmed.toLowerCase();
      const cleanPhone = inputTrimmed.replace(/\D/g, '');

      // 1. Search in-memory snapshot state (allUsers & professionals)
      let matchedUser = allUsers.find(u => {
        if (u.email && u.email.trim().toLowerCase() === inputLower) return true;
        if (u.documentNumber && u.documentNumber.trim().toLowerCase() === inputLower) return true;
        if (cleanPhone && cleanPhone.length >= 6) {
          if (u.role === 'admin' && (cleanPhone.includes('924835279') || cleanPhone.includes('956011985'))) {
            return true;
          }
          if (u.phone) {
            const uDigits = u.phone.replace(/\D/g, '');
            if (uDigits.length >= 6) {
              return uDigits.endsWith(cleanPhone) || cleanPhone.endsWith(uDigits);
            }
          }
        }
        return false;
      });

      // Also check if input matches default admin credentials specifically
      if (!matchedUser && (
        inputLower === 'jfigueiredo790@gmail.com' || 
        cleanPhone.endsWith('924835279') || 
        cleanPhone.endsWith('956011985')
      )) {
        matchedUser = allUsers.find(u => u.role === 'admin') || DEFAULT_ADMIN_USER;
      }

      let matchedPro = professionals.find(p => {
        if (p.email && p.email.trim().toLowerCase() === inputLower) return true;
        if (p.documentNumber && p.documentNumber.trim().toLowerCase() === inputLower) return true;
        if (cleanPhone && cleanPhone.length >= 6 && p.phone) {
          const pDigits = p.phone.replace(/\D/g, '');
          if (pDigits.length >= 6) {
            return pDigits.endsWith(cleanPhone) || cleanPhone.endsWith(pDigits);
          }
        }
        return false;
      });

      let targetUser = matchedUser || matchedPro;

      // 2. Direct Firestore database fallback search if not found in memory
      if (!targetUser) {
        try {
          // Check 'users' collection in Firestore
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach(docSnap => {
            const uData = { id: docSnap.id, ...docSnap.data() } as User;
            const uEmail = (uData.email || '').trim().toLowerCase();
            const uDoc = (uData.documentNumber || '').trim().toLowerCase();
            const uPhoneDigits = (uData.phone || '').replace(/\D/g, '');

            if (inputLower && uEmail === inputLower) {
              targetUser = uData;
            } else if (inputLower && uDoc === inputLower) {
              targetUser = uData;
            } else if (cleanPhone && cleanPhone.length >= 6 && uPhoneDigits.length >= 6) {
              if (uPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(uPhoneDigits)) {
                targetUser = uData;
              }
            }
          });

          // If still not found, check 'professionals' collection in Firestore
          if (!targetUser) {
            const prosSnap = await getDocs(collection(db, 'professionals'));
            prosSnap.forEach(docSnap => {
              const pData = { id: docSnap.id, ...docSnap.data() } as ProfessionalProfile;
              const pEmail = (pData.email || '').trim().toLowerCase();
              const pDoc = (pData.documentNumber || '').trim().toLowerCase();
              const pPhoneDigits = (pData.phone || '').replace(/\D/g, '');

              if (inputLower && pEmail === inputLower) {
                targetUser = pData as unknown as User;
              } else if (inputLower && pDoc === inputLower) {
                targetUser = pData as unknown as User;
              } else if (cleanPhone && cleanPhone.length >= 6 && pPhoneDigits.length >= 6) {
                if (pPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(pPhoneDigits)) {
                  targetUser = pData as unknown as User;
                }
              }
            });
          }
        } catch (fsErr) {
          console.warn('Erro ao pesquisar utilizador no Firestore:', fsErr);
        }
      }

      if (!targetUser) {
        return {
          success: false,
          message: 'Conta não encontrada na base de dados. Certifique-se de que utiliza o mesmo e-mail, telefone ou BI do registo.'
        };
      }

      if (targetUser.isDeleted === true || (targetUser as any).status === 'deleted') {
        return {
          success: false,
          message: 'Esta conta foi desativada ou eliminada pela administração e não pode iniciar sessão.'
        };
      }

      if (targetUser.blocked === true || (targetUser as any).status === 'bloqueado' || (targetUser as any).accountStatus === 'BLOCKED') {
        return {
          success: false,
          message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
        };
      }

      if (targetUser.password && passInput && targetUser.password.trim() !== passInput.trim()) {
        const isAdmin = targetUser.role === 'admin';
        const validAdminPin = platformSettings.adminPin || 'admin123';
        if (isAdmin && (passInput.trim() === validAdminPin || passInput.trim() === 'admin123' || passInput.trim() === 'admin924' || passInput.trim() === 'Abel@2026')) {
          // Valid admin authentication
        } else {
          return {
            success: false,
            message: 'Palavra-passe incorreta. Por favor introduza a mesma palavra-passe criada durante o registo.'
          };
        }
      } else if (!targetUser.password && targetUser.role === 'admin') {
        const validAdminPin = platformSettings.adminPin || 'admin123';
        if (passInput.trim() !== validAdminPin && passInput.trim() !== 'admin123' && passInput.trim() !== 'admin924' && passInput.trim() !== 'Abel@2026') {
          return {
            success: false,
            message: 'Palavra-passe de Administrador incorreta.'
          };
        }
      }

      // Try Firebase Auth login if email is available and password >= 6
      if (targetUser.email && passInput && passInput.length >= 6) {
        try {
          await signInWithEmailAndPassword(auth, targetUser.email.trim(), passInput.trim());
        } catch (e) {
          console.warn('Aviso de autenticação Firebase Auth:', e);
        }
      }

      const roleToUse: UserRole = (targetUser as any).role === 'admin' 
        ? 'admin' 
        : (targetUser as any).accountType === 'profissional' || (targetUser as any).role === 'profissional' 
          ? 'profissional' 
          : 'cliente';

      loginUser(targetUser as User, roleToUse);
      return { success: true, message: 'Sessão iniciada com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Erro ao iniciar sessão: ${err.message || err}` };
    }
  };

  // ==================== ACCOUNT ACCESS RECOVERY METHODS ====================
  const [recoverySessions, setRecoverySessions] = useState<AccountRecoverySession[]>(() => {
    try {
      const saved = localStorage.getItem(`${LOCAL_STORAGE_KEY}_recovery_sessions`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_KEY}_recovery_sessions`, JSON.stringify(recoverySessions));
    } catch {}
  }, [recoverySessions]);

  const requestPasswordRecoveryOtpAsync = async (
    phoneOrEmailOrDoc: string
  ): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedContact?: string;
    devCode?: string;
    isBlocked?: boolean;
  }> => {
    try {
      const inputTrimmed = phoneOrEmailOrDoc.trim();
      if (!inputTrimmed) {
        return { success: false, message: 'Por favor introduza o número de telefone, e-mail ou BI associado à conta.' };
      }

      // 1. Rate limit check
      if (!checkRecoveryRateLimit(inputTrimmed)) {
        return { success: false, message: RECOVERY_MESSAGES.RATE_LIMIT };
      }

      const inputLower = inputTrimmed.toLowerCase();
      const cleanPhone = inputTrimmed.replace(/\D/g, '');

      // 2. Search in allUsers & professionals & Firestore
      let targetUser: (User | ProfessionalProfile) | undefined = allUsers.find(u => {
        if (u.email && u.email.trim().toLowerCase() === inputLower) return true;
        if (u.documentNumber && u.documentNumber.trim().toLowerCase() === inputLower) return true;
        if (cleanPhone && cleanPhone.length >= 6 && u.phone) {
          const uDigits = u.phone.replace(/\D/g, '');
          if (uDigits.length >= 6 && (uDigits.endsWith(cleanPhone) || cleanPhone.endsWith(uDigits))) return true;
        }
        return false;
      });

      if (!targetUser) {
        targetUser = professionals.find(p => {
          if (p.email && p.email.trim().toLowerCase() === inputLower) return true;
          if (p.documentNumber && p.documentNumber.trim().toLowerCase() === inputLower) return true;
          if (cleanPhone && cleanPhone.length >= 6 && p.phone) {
            const pDigits = p.phone.replace(/\D/g, '');
            if (pDigits.length >= 6 && (pDigits.endsWith(cleanPhone) || cleanPhone.endsWith(pDigits))) return true;
          }
          return false;
        });
      }

      // 3. Direct Firestore fallback
      if (!targetUser) {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach(docSnap => {
            const uData = { id: docSnap.id, ...docSnap.data() } as User;
            const uEmail = (uData.email || '').trim().toLowerCase();
            const uDoc = (uData.documentNumber || '').trim().toLowerCase();
            const uPhoneDigits = (uData.phone || '').replace(/\D/g, '');
            if (inputLower && (uEmail === inputLower || uDoc === inputLower)) targetUser = uData;
            else if (cleanPhone && cleanPhone.length >= 6 && uPhoneDigits.length >= 6 && (uPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(uPhoneDigits))) {
              targetUser = uData;
            }
          });

          if (!targetUser) {
            const prosSnap = await getDocs(collection(db, 'professionals'));
            prosSnap.forEach(docSnap => {
              const pData = { id: docSnap.id, ...docSnap.data() } as ProfessionalProfile;
              const pEmail = (pData.email || '').trim().toLowerCase();
              const pDoc = (pData.documentNumber || '').trim().toLowerCase();
              const pPhoneDigits = (pData.phone || '').replace(/\D/g, '');
              if (inputLower && (pEmail === inputLower || pDoc === inputLower)) targetUser = pData;
              else if (cleanPhone && cleanPhone.length >= 6 && pPhoneDigits.length >= 6 && (pPhoneDigits.endsWith(cleanPhone) || cleanPhone.endsWith(pPhoneDigits))) {
                targetUser = pData;
              }
            });
          }
        } catch (e) {
          console.warn('Erro ao pesquisar utilizador no Firestore para recuperação:', e);
        }
      }

      if (!targetUser) {
        return { success: false, message: RECOVERY_MESSAGES.USER_NOT_FOUND };
      }

      if (targetUser.isDeleted === true || (targetUser as any).status === 'deleted') {
        return { success: false, message: 'Esta conta foi desativada pela administração e não pode recuperar credenciais.' };
      }

      const isBlocked = targetUser.blocked === true || (targetUser as any).status === 'bloqueado' || (targetUser as any).accountStatus === 'BLOCKED';
      const isExpiredSub = (targetUser as any).subscriptionStatus === 'EXPIRED';

      const otp = generateSecureOTP();
      const session: AccountRecoverySession = {
        id: `rec-pwd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'password',
        targetUserId: targetUser.id,
        targetUserRole: (targetUser.role || 'cliente') as any,
        targetEmail: targetUser.email || '',
        targetPhone: targetUser.phone || '',
        targetDocNumber: targetUser.documentNumber || '',
        targetName: targetUser.name || 'Utilizador',
        otpCode: otp,
        expiresAt: Date.now() + OTP_EXPIRATION_MS,
        attemptsLeft: MAX_OTP_ATTEMPTS,
        isVerified: false,
        isUsed: false,
        isBlockedAccount: isBlocked,
        isExpiredSubscription: isExpiredSub,
        createdAt: Date.now(),
        ipOrIdentifier: inputTrimmed
      };

      setRecoverySessions(prev => [session, ...prev.filter(s => s.targetUserId !== targetUser!.id)]);

      // Attempt to save to Firestore recovery_otps collection
      try {
        await setDoc(doc(db, 'recovery_otps', session.id), session);
      } catch (err) {
        console.warn('Aviso: sessão de recuperação registada localmente:', err);
      }

      const maskedContact = targetUser.phone 
        ? maskPhoneNumber(targetUser.phone) 
        : maskEmailAddress(targetUser.email);

      return {
        success: true,
        message: RECOVERY_MESSAGES.CODE_SENT,
        sessionId: session.id,
        maskedContact,
        devCode: otp,
        isBlocked
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao iniciar recuperação: ${err.message || err}` };
    }
  };

  const verifyRecoveryOtpAsync = async (
    sessionId: string,
    enteredCode: string
  ): Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }> => {
    try {
      const codeTrimmed = enteredCode.trim();
      if (!codeTrimmed) {
        return { success: false, message: 'Por favor introduza o código de 6 dígitos recebido.' };
      }

      let session = recoverySessions.find(s => s.id === sessionId);

      if (!session) {
        try {
          const sDoc = await getDoc(doc(db, 'recovery_otps', sessionId));
          if (sDoc.exists()) {
            session = sDoc.data() as AccountRecoverySession;
          }
        } catch {}
      }

      if (!session) {
        return { success: false, message: RECOVERY_MESSAGES.CODE_INVALID };
      }

      if (session.isUsed) {
        return { success: false, message: RECOVERY_MESSAGES.CODE_INVALID };
      }

      if (Date.now() > session.expiresAt) {
        return { success: false, message: RECOVERY_MESSAGES.CODE_INVALID };
      }

      if (session.attemptsLeft <= 0) {
        return { success: false, message: RECOVERY_MESSAGES.MAX_ATTEMPTS };
      }

      if (session.otpCode !== codeTrimmed) {
        const remaining = session.attemptsLeft - 1;
        const updatedSession = { ...session, attemptsLeft: remaining };
        setRecoverySessions(prev => prev.map(s => s.id === sessionId ? updatedSession : s));
        try {
          await updateDoc(doc(db, 'recovery_otps', sessionId), { attemptsLeft: remaining });
        } catch {}

        if (remaining <= 0) {
          return { success: false, message: RECOVERY_MESSAGES.MAX_ATTEMPTS };
        }
        return { 
          success: false, 
          message: `${RECOVERY_MESSAGES.CODE_INVALID} (Restam ${remaining} tentativa${remaining > 1 ? 's' : ''})` 
        };
      }

      // Successful OTP validation
      const verifiedSession = { ...session, isVerified: true };
      setRecoverySessions(prev => prev.map(s => s.id === sessionId ? verifiedSession : s));
      try {
        await updateDoc(doc(db, 'recovery_otps', sessionId), { isVerified: true });
      } catch {}

      return {
        success: true,
        message: 'Código validado com sucesso! Prossiga com a operação.',
        isBlocked: session.isBlockedAccount
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao validar código: ${err.message || err}` };
    }
  };

  const resetAccountPasswordAsync = async (
    sessionId: string,
    verifiedOtp: string,
    newPassword: string
  ): Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }> => {
    try {
      if (!newPassword || newPassword.trim().length < 4) {
        return { success: false, message: 'A nova palavra-passe deve conter pelo menos 4 caracteres.' };
      }

      let session = recoverySessions.find(s => s.id === sessionId);
      if (!session) {
        try {
          const sDoc = await getDoc(doc(db, 'recovery_otps', sessionId));
          if (sDoc.exists()) session = sDoc.data() as AccountRecoverySession;
        } catch {}
      }

      if (!session || !session.isVerified || session.isUsed || Date.now() > session.expiresAt || session.otpCode !== verifiedOtp.trim()) {
        return { success: false, message: RECOVERY_MESSAGES.CODE_INVALID };
      }

      const targetId = session.targetUserId;
      const cleanPass = newPassword.trim();
      const updatedTime = new Date().toISOString();

      // =========================================================================
      // REGRA DE PRESERVAÇÃO TOTAL DOS DADOS
      // Atualizar APENAS password e updatedAt.
      // NUNCA apagar dados, avaliações, pedidos, histórico, documentos ou carteira.
      // Manter estado de bloqueio e de subscrição inalterados.
      // =========================================================================

      // Update in allUsers state
      setAllUsers(prev => prev.map(u => {
        if (u.id === targetId || (session && session.targetEmail && u.email === session.targetEmail)) {
          return { ...u, password: cleanPass, updatedAt: updatedTime };
        }
        return u;
      }));

      // Update in professionals state
      setProfessionals(prev => prev.map(p => {
        if (p.id === targetId || (session && session.targetEmail && p.email === session.targetEmail)) {
          return { ...p, password: cleanPass, updatedAt: updatedTime };
        }
        return p;
      }));

      // Update in Firestore 'users' collection
      try {
        await setDoc(doc(db, 'users', targetId), { password: cleanPass, updatedAt: updatedTime }, { merge: true });
      } catch (err) {
        console.warn('Erro ao atualizar senha no Firestore (users):', err);
      }

      // Update in Firestore 'professionals' collection if professional
      if (session.targetUserRole === 'profissional') {
        try {
          await setDoc(doc(db, 'professionals', targetId), { password: cleanPass, updatedAt: updatedTime }, { merge: true });
        } catch (err) {
          console.warn('Erro ao atualizar senha no Firestore (professionals):', err);
        }
      }

      // Mark session as used
      const usedSession = { ...session, isUsed: true };
      setRecoverySessions(prev => prev.map(s => s.id === sessionId ? usedSession : s));
      try {
        await updateDoc(doc(db, 'recovery_otps', sessionId), { isUsed: true });
      } catch {}

      // Log action for audit
      await logAdminAction(
        'PASSWORD_RECOVERY_COMPLETED',
        targetId,
        `Palavra-passe redefinida com sucesso via código de recuperação. Conta Bloqueada: ${session.isBlockedAccount ? 'Sim' : 'Não'}`
      );

      return {
        success: true,
        isBlocked: session.isBlockedAccount,
        message: session.isBlockedAccount ? RECOVERY_MESSAGES.ACCOUNT_BLOCKED : RECOVERY_MESSAGES.SUCCESS
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao redefinir palavra-passe: ${err.message || err}` };
    }
  };

  const requestPhoneRecoveryVerificationAsync = async (
    email: string,
    documentNumber: string,
    currentPassword?: string
  ): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedCurrentPhone?: string;
    maskedEmail?: string;
    devCode?: string;
    isBlocked?: boolean;
  }> => {
    try {
      const emailTrimmed = email.trim().toLowerCase();
      const docTrimmed = documentNumber.trim().toLowerCase();

      if (!emailTrimmed || !docTrimmed) {
        return {
          success: false,
          message: 'Por favor preencha o seu E-mail e o Número de Bilhete de Identidade (BI) associados à conta.'
        };
      }

      if (!checkRecoveryRateLimit(emailTrimmed)) {
        return { success: false, message: RECOVERY_MESSAGES.RATE_LIMIT };
      }

      // Locate user matching email AND docNumber
      let targetUser: (User | ProfessionalProfile) | undefined = allUsers.find(u => {
        const uEmail = (u.email || '').trim().toLowerCase();
        const uDoc = (u.documentNumber || '').trim().toLowerCase();
        return uEmail === emailTrimmed && uDoc === docTrimmed;
      });

      if (!targetUser) {
        targetUser = professionals.find(p => {
          const pEmail = (p.email || '').trim().toLowerCase();
          const pDoc = (p.documentNumber || '').trim().toLowerCase();
          return pEmail === emailTrimmed && pDoc === docTrimmed;
        });
      }

      // Firestore fallback
      if (!targetUser) {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach(docSnap => {
            const uData = { id: docSnap.id, ...docSnap.data() } as User;
            const uEmail = (uData.email || '').trim().toLowerCase();
            const uDoc = (uData.documentNumber || '').trim().toLowerCase();
            if (uEmail === emailTrimmed && uDoc === docTrimmed) {
              targetUser = uData;
            }
          });

          if (!targetUser) {
            const prosSnap = await getDocs(collection(db, 'professionals'));
            prosSnap.forEach(docSnap => {
              const pData = { id: docSnap.id, ...docSnap.data() } as ProfessionalProfile;
              const pEmail = (pData.email || '').trim().toLowerCase();
              const pDoc = (pData.documentNumber || '').trim().toLowerCase();
              if (pEmail === emailTrimmed && pDoc === docTrimmed) {
                targetUser = pData;
              }
            });
          }
        } catch (e) {}
      }

      if (!targetUser) {
        return {
          success: false,
          message: 'Não foi encontrada nenhuma conta com a combinação de E-mail e BI informados.'
        };
      }

      // Optional password check if provided
      if (currentPassword && currentPassword.trim()) {
        if (targetUser.password && targetUser.password.trim() !== currentPassword.trim()) {
          return {
            success: false,
            message: 'A palavra-passe informada está incorreta para esta conta.'
          };
        }
      }

      if (targetUser.isDeleted === true || (targetUser as any).status === 'deleted') {
        return { success: false, message: 'Esta conta foi desativada e não pode recuperar credenciais.' };
      }

      const isBlocked = targetUser.blocked === true || (targetUser as any).status === 'bloqueado' || (targetUser as any).accountStatus === 'BLOCKED';
      const isExpiredSub = (targetUser as any).subscriptionStatus === 'EXPIRED';

      const otp = generateSecureOTP();
      const session: AccountRecoverySession = {
        id: `rec-phn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'phone',
        targetUserId: targetUser.id,
        targetUserRole: (targetUser.role || 'cliente') as any,
        targetEmail: targetUser.email || '',
        targetPhone: targetUser.phone || '',
        targetDocNumber: targetUser.documentNumber || '',
        targetName: targetUser.name || 'Utilizador',
        otpCode: otp,
        expiresAt: Date.now() + OTP_EXPIRATION_MS,
        attemptsLeft: MAX_OTP_ATTEMPTS,
        isVerified: false,
        isUsed: false,
        isBlockedAccount: isBlocked,
        isExpiredSubscription: isExpiredSub,
        createdAt: Date.now(),
        ipOrIdentifier: emailTrimmed
      };

      setRecoverySessions(prev => [session, ...prev.filter(s => s.targetUserId !== targetUser!.id)]);

      try {
        await setDoc(doc(db, 'recovery_otps', session.id), session);
      } catch {}

      return {
        success: true,
        message: RECOVERY_MESSAGES.CODE_SENT,
        sessionId: session.id,
        maskedCurrentPhone: maskPhoneNumber(targetUser.phone),
        maskedEmail: maskEmailAddress(targetUser.email),
        devCode: otp,
        isBlocked
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao iniciar recuperação de telefone: ${err.message || err}` };
    }
  };

  const updateRecoveredPhoneNumberAsync = async (
    sessionId: string,
    verifiedOtp: string,
    newPhone: string
  ): Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }> => {
    try {
      if (!newPhone || !isValidAngolanPhone(newPhone)) {
        return { success: false, message: RECOVERY_MESSAGES.INVALID_PHONE_FORMAT };
      }

      const formattedPhone = normalizeAngolanPhone(newPhone);
      const cleanPhoneDigits = formattedPhone.replace(/\D/g, '');

      let session = recoverySessions.find(s => s.id === sessionId);
      if (!session) {
        try {
          const sDoc = await getDoc(doc(db, 'recovery_otps', sessionId));
          if (sDoc.exists()) session = sDoc.data() as AccountRecoverySession;
        } catch {}
      }

      if (!session || !session.isVerified || session.isUsed || Date.now() > session.expiresAt || session.otpCode !== verifiedOtp.trim()) {
        return { success: false, message: RECOVERY_MESSAGES.CODE_INVALID };
      }

      const targetId = session.targetUserId;

      // 1. DUPLICATE CHECK: Verify that newPhone is NOT already in use by ANOTHER account
      const duplicateUser = allUsers.find(u => {
        if (u.id === targetId) return false;
        if (u.phone) {
          const uDigits = u.phone.replace(/\D/g, '');
          if (uDigits.length >= 9 && cleanPhoneDigits.length >= 9) {
            return uDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(uDigits);
          }
        }
        return false;
      });

      const duplicatePro = professionals.find(p => {
        if (p.id === targetId) return false;
        if (p.phone) {
          const pDigits = p.phone.replace(/\D/g, '');
          if (pDigits.length >= 9 && cleanPhoneDigits.length >= 9) {
            return pDigits.endsWith(cleanPhoneDigits) || cleanPhoneDigits.endsWith(pDigits);
          }
        }
        return false;
      });

      if (duplicateUser || duplicatePro) {
        return {
          success: false,
          message: RECOVERY_MESSAGES.PHONE_ALREADY_IN_USE
        };
      }

      const updatedTime = new Date().toISOString();

      // =========================================================================
      // REGRA DE PRESERVAÇÃO TOTAL DOS DADOS
      // Atualizar APENAS phone e updatedAt.
      // =========================================================================
      setAllUsers(prev => prev.map(u => {
        if (u.id === targetId) {
          return { ...u, phone: formattedPhone, updatedAt: updatedTime };
        }
        return u;
      }));

      setProfessionals(prev => prev.map(p => {
        if (p.id === targetId) {
          return { ...p, phone: formattedPhone, updatedAt: updatedTime };
        }
        return p;
      }));

      // Update in Firestore 'users'
      try {
        await setDoc(doc(db, 'users', targetId), { phone: formattedPhone, updatedAt: updatedTime }, { merge: true });
      } catch (err) {
        console.warn('Erro ao atualizar telefone no Firestore (users):', err);
      }

      // Update in Firestore 'professionals' if pro
      if (session.targetUserRole === 'profissional') {
        try {
          await setDoc(doc(db, 'professionals', targetId), { phone: formattedPhone, updatedAt: updatedTime }, { merge: true });
        } catch (err) {
          console.warn('Erro ao atualizar telefone no Firestore (professionals):', err);
        }
      }

      // Mark session as used
      const usedSession = { ...session, isUsed: true };
      setRecoverySessions(prev => prev.map(s => s.id === sessionId ? usedSession : s));
      try {
        await updateDoc(doc(db, 'recovery_otps', sessionId), { isUsed: true });
      } catch {}

      // Log action for audit
      await logAdminAction(
        'PHONE_RECOVERY_COMPLETED',
        targetId,
        `Número de telefone recuperado/atualizado para ${formattedPhone}. Conta Bloqueada: ${session.isBlockedAccount ? 'Sim' : 'Não'}`
      );

      return {
        success: true,
        isBlocked: session.isBlockedAccount,
        message: session.isBlockedAccount ? RECOVERY_MESSAGES.ACCOUNT_BLOCKED : RECOVERY_MESSAGES.SUCCESS
      };
    } catch (err: any) {
      return { success: false, message: `Erro ao atualizar número de telefone: ${err.message || err}` };
    }
  };

  const updateUserProfile = (updated: Partial<User & ProfessionalProfile>) => {
    const targetRole = updated.role || currentUser.role;
    let autoApproveObj = {};

    if (targetRole === 'profissional') {
      const merged = { ...currentUser, ...updated } as ProfessionalProfile;
      const { isApproved } = checkProAutoApproval(merged);
      if (isApproved) {
        autoApproveObj = { verified: true, documentsVerified: true, isAutoApproved: true };
      }
    }

    const newUserId = currentUser.id && currentUser.id !== 'guest-client' ? currentUser.id : `user-${Date.now()}`;
    const updatedUser = {
      ...currentUser,
      id: newUserId,
      ...updated,
      ...autoApproveObj
    };

    setCurrentUser(updatedUser);

    if (targetRole === 'profissional') {
      const proProfile: ProfessionalProfile = {
        id: newUserId,
        name: updatedUser.name || 'Novo Profissional',
        email: updatedUser.email || '',
        phone: updatedUser.phone || '',
        province: updatedUser.province || 'Luanda',
        city: updatedUser.city || 'Luanda',
        role: 'profissional',
        avatar: updatedUser.avatar || '',
        categories: Array.isArray((updatedUser as any).categories) ? (updatedUser as any).categories : [],
        bio: (updatedUser as any).bio || 'Profissional prestador de serviços.',
        experienceYears: typeof (updatedUser as any).experienceYears === 'number'
          ? Math.max(0, (updatedUser as any).experienceYears)
          : (Number((updatedUser as any).experienceYears) >= 0 ? Number((updatedUser as any).experienceYears) : 0),
        experienceVerified: (updatedUser as any).experienceVerified ?? false,
        hourlyRateKz: (updatedUser as any).hourlyRateKz || 15000,
        rating: 5.0,
        reviewCount: 0,
        completedJobs: 0,
        status: 'disponivel',
        verified: (updatedUser as any).verified || false,
        documentsVerified: (updatedUser as any).documentsVerified || false,
        address: (updatedUser as any).address || '',
        documentType: (updatedUser as any).documentType || 'Bilhete de Identidade',
        documentNumber: (updatedUser as any).documentNumber || '',
        portfolioImages: (updatedUser as any).portfolioImages || [],
        createdAt: updatedUser.createdAt || new Date().toISOString()
      };

      if (!isFictitiousOrInvalidUser(proProfile)) {
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === newUserId || (p.email && proProfile.email && p.email === proProfile.email));
          if (exists) {
            return prev.map(p => (p.id === newUserId || (p.email && proProfile.email && p.email === proProfile.email)) ? { ...p, ...proProfile } : p);
          }
          return [proProfile, ...prev];
        });
      }
    }

    if (!isFictitiousOrInvalidUser(updatedUser)) {
      setAllUsers(prev => {
        const exists = prev.some(u => u.id === newUserId || (u.email && updatedUser.email && u.email === updatedUser.email));
        if (exists) {
          return prev.map(u => (u.id === newUserId || (u.email && updatedUser.email && u.email === updatedUser.email)) ? { ...u, ...updatedUser } : u);
        }
        return [updatedUser, ...prev];
      });

      // Synchronize workFeedPosts if avatar or name was updated
      if (updated.avatar !== undefined || updated.name !== undefined) {
        const newAvatar = updated.avatar !== undefined ? updated.avatar : updatedUser.avatar;
        const newName = updated.name !== undefined ? updated.name : updatedUser.name;
        
        setWorkFeedPosts(prev => prev.map(post => {
          if (post.professionalId === newUserId) {
            const syncedPost = {
              ...post,
              professionalAvatar: newAvatar || '',
              professionalName: newName || post.professionalName
            };
            try {
              setDoc(doc(db, 'work_feed_posts', post.id), {
                professionalAvatar: newAvatar || '',
                professionalName: newName || post.professionalName
              }, { merge: true }).catch(() => {});
            } catch {}
            return syncedPost;
          }
          return post;
        }));
      }

      // Write to Firestore for persistent storage & cross-device sync
      try {
        const userDocPayload = {
          ...updatedUser,
          photoURL: updatedUser.avatar || ''
        };
        setDoc(doc(db, 'users', newUserId), userDocPayload, { merge: true }).catch(err => {
          console.warn('Firestore user save notice:', err);
        });

        if (targetRole === 'profissional') {
          const proProfileToSave = {
            id: newUserId,
            name: updatedUser.name || '',
            email: updatedUser.email || '',
            phone: updatedUser.phone || '',
            province: updatedUser.province || 'Luanda',
            city: updatedUser.city || 'Luanda',
            role: 'profissional',
            avatar: updatedUser.avatar || '',
            photoURL: updatedUser.avatar || '',
            categories: Array.isArray((updatedUser as any).categories) ? (updatedUser as any).categories : [],
            bio: (updatedUser as any).bio || 'Profissional prestador de serviços.',
            experienceYears: (updatedUser as any).experienceYears || 1,
            hourlyRateKz: (updatedUser as any).hourlyRateKz || 15000,
            rating: 5.0,
            reviewCount: 0,
            completedJobs: 0,
            status: 'disponivel',
            verified: (updatedUser as any).verified || false,
            documentsVerified: (updatedUser as any).documentsVerified || false,
            address: (updatedUser as any).address || '',
            documentType: (updatedUser as any).documentType || 'Bilhete de Identidade',
            documentNumber: (updatedUser as any).documentNumber || '',
            portfolioImages: (updatedUser as any).portfolioImages || [],
            createdAt: updatedUser.createdAt || new Date().toISOString()
          };
          setDoc(doc(db, 'professionals', newUserId), proProfileToSave, { merge: true }).catch(err => {
            console.warn('Firestore pro save notice:', err);
          });
        }
      } catch (err) {
        console.warn('Firestore user save notice:', err);
      }
    }
  };

  const changeProPlan = (plan: 'gratuito' | 'pro_destaque') => {
    const activatedAt = new Date().toISOString();
    setCurrentUser(prev => ({ ...prev, plan, planActivatedAt: activatedAt }));
    setProfessionals(prev => prev.map(p => {
      if (p.id === currentUser.id || p.email === currentUser.email) {
        return { ...p, plan, planActivatedAt: activatedAt };
      }
      return p;
    }));
  };

  const subscribeToPlan = (planType: ProSubscriptionPlan, bypassBalance = true): { success: boolean; message: string } => {
    if (planType === 'free_trial') {
      return { success: false, message: 'Selecione um plano válido.' };
    }

    const planInfo = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];
    if (!planInfo) {
      return { success: false, message: 'Plano selecionado não é válido.' };
    }

    const currentBalance = currentUser.walletBalanceKz || 0;
    if (!bypassBalance && currentBalance < planInfo.priceKz) {
      return {
        success: false,
        message: `Saldo insuficiente na sua carteira. O plano de ${planInfo.label} custa ${planInfo.priceKz.toLocaleString('pt-AO')} Kz, mas dispõe de ${currentBalance.toLocaleString('pt-AO')} Kz. Por favor faça um carregamento na carteira.`
      };
    }

    const now = new Date();
    let baseDate = now;
    if (currentUser.planExpiresAt) {
      const existingExp = new Date(currentUser.planExpiresAt);
      if (existingExp > now) {
        baseDate = existingExp;
      }
    }

    const newExpiresAt = new Date(baseDate.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
    const updatedBalance = bypassBalance ? currentBalance : currentBalance - planInfo.priceKz;

    setCurrentUser(prev => ({
      ...prev,
      walletBalanceKz: updatedBalance,
      subscriptionPlan: planType,
      planExpiresAt: newExpiresAt
    }));

    setProfessionals(prev => prev.map(p => {
      if (p.id === currentUser.id || p.email === currentUser.email) {
        return {
          ...p,
          walletBalanceKz: updatedBalance,
          subscriptionPlan: planType,
          planExpiresAt: newExpiresAt
        };
      }
      return p;
    }));

    setAllUsers(prev => prev.map(u => {
      if (u.id === currentUser.id || u.email === currentUser.email) {
        return {
          ...u,
          walletBalanceKz: updatedBalance,
          subscriptionPlan: planType,
          planExpiresAt: newExpiresAt
        };
      }
      return u;
    }));

    const newTx: WalletTransaction = {
      id: `tx-plan-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      type: 'payment',
      amountKz: planInfo.priceKz,
      status: 'concluido',
      createdAt: new Date().toISOString(),
      description: `Ativação de Plano ${planInfo.label} (${planInfo.days} Dias) - Plataforma J Smart`
    };

    setAllWalletTransactions(prev => [newTx, ...prev]);

    addNotification({
      userId: currentUser.id,
      targetRoleScope: 'profissional',
      title: '💳 Pagamento de Plano Confirmado',
      message: `O seu plano de ${planInfo.label} (${planInfo.days} dias) foi ativado com sucesso. O seu pacote está liberado!`,
      type: 'pagamento_confirmado'
    });

    logAdminAction('Ativação de Plano Profissional', currentUser.id, `Plano ${planInfo.label} (${planInfo.priceKz.toLocaleString('pt-AO')} Kz)`);

    return {
      success: true,
      message: `Plano de ${planInfo.label} (${planInfo.days} Dias) ativado e liberado com sucesso!`
    };
  };

  const adminUnlockProPlan = async (proId: string, planType: ProSubscriptionPlan): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem liberar planos.' };
    }

    const planInfo = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];
    if (!planInfo) return { success: false, message: 'Plano inválido especificado.' };

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
    const planPayload = {
      subscriptionPlan: planType,
      planExpiresAt: newExpiresAt
    };

    try {
      await setDoc(doc(db, 'professionals', proId), planPayload, { merge: true });
      await setDoc(doc(db, 'users', proId), planPayload, { merge: true });

      setProfessionals(prev => prev.map(p => {
        if (p.id === proId) {
          return { ...p, ...planPayload };
        }
        return p;
      }));

      setAllUsers(prev => prev.map(u => {
        if (u.id === proId) {
          return { ...u, ...planPayload };
        }
        return u;
      }));

      if (currentUser.id === proId) {
        setCurrentUser(prev => ({ ...prev, ...planPayload }));
      }

      addNotification({
        userId: proId,
        targetRoleScope: 'profissional',
        title: '🎉 Pacote Liberado pela Administração',
        message: `O seu plano ${planInfo.label} (${planInfo.days} Dias) foi liberado e confirmado pela equipa administrativa!`,
        type: 'pagamento_confirmado'
      });

      await logAdminAction('Liberação de Pacote pelo Admin', proId, `Pacote ${planInfo.label} (${planInfo.days} dias) liberado com sucesso`);

      return { success: true, message: `Pacote ${planInfo.label} liberado com sucesso na base de dados!` };
    } catch (err: any) {
      console.error('Erro ao liberar plano no Firestore:', err);
      return { success: false, message: `Falha ao persistir liberação de plano: ${err.message || err}` };
    }
  };

  // Wallet & Payment Actions
  const addWalletDeposit = (amountKz: number, method: string) => {
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userRole: currentUser.role,
      type: 'deposit',
      amountKz,
      description: `Carregamento de Carteira via ${method}`,
      status: 'concluido',
      createdAt: new Date().toISOString(),
      paymentMethod: method
    };

    setAllWalletTransactions(prev => [newTx, ...prev]);
    setCurrentUser(prev => ({
      ...prev,
      walletBalanceKz: (prev.walletBalanceKz || 0) + amountKz
    }));
  };

  const submitPaymentWithProof = (params: {
    amountKz: number;
    type: 'deposit' | 'payment';
    description: string;
    paymentMethod: string;
    proofUrl: string;
    proofFileName?: string;
    proofFileType?: string;
    proofFileSize?: number;
    proofNote?: string;
    planId?: ProSubscriptionPlan;
  }): { success: boolean; message: string } => {
    if (!params.proofUrl || !params.proofUrl.trim()) {
      return {
        success: false,
        message: 'É obrigatório selecionar um ficheiro de comprovativo (imagem ou PDF) antes de submeter.'
      };
    }

    const txId = `tx-proof-${Date.now()}`;
    const newTx: WalletTransaction = {
      id: txId,
      userId: currentUser.id,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userRole: currentUser.role,
      type: params.type,
      amountKz: params.amountKz,
      description: params.description,
      paymentMethod: params.paymentMethod,
      proofUrl: params.proofUrl,
      proofFileName: params.proofFileName,
      proofFileType: params.proofFileType,
      proofFileSize: params.proofFileSize,
      proofNote: params.proofNote,
      planId: params.planId,
      status: 'pendente',
      createdAt: new Date().toISOString()
    };

    setAllWalletTransactions(prev => [newTx, ...prev]);

    try {
      setDoc(doc(db, 'wallet_transactions', txId), newTx).catch(() => {});
    } catch (e) {}

    // Notify current user
    addNotification({
      userId: currentUser.id,
      targetRoleScope: currentUser.role === 'profissional' ? 'profissional' : 'cliente',
      title: '⏳ Comprovativo Submetido',
      message: `O seu comprovativo de pagamento de ${params.amountKz.toLocaleString('pt-AO')} Kz foi enviado para o Administrador. Aguarde a verificação e aprovação!`,
      type: 'pagamento_confirmado'
    });

    // Notify admin exclusively
    addNotification({
      userId: 'admin',
      targetRoleScope: 'admin',
      title: '💳 Novo Comprovativo de Pagamento (Aprovação Necessária)',
      message: `O utilizador ${currentUser.name} (${currentUser.phone}) enviou comprovativo de ${params.amountKz.toLocaleString('pt-AO')} Kz (${params.description}). Aceda ao Painel de Administrador para validar e aprovar o pacote.`,
      type: 'pagamento_confirmado'
    });

    logAdminAction('Envio de Comprovativo de Pagamento', currentUser.id, `Valor: ${params.amountKz.toLocaleString('pt-AO')} Kz - ${params.description}`);

    return {
      success: true,
      message: 'Comprovativo enviado com sucesso! O Administrador irá verificar o comprovativo e aprovar o seu pagamento em breve.'
    };
  };

  const approvePaymentTransaction = async (txId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const tx = allWalletTransactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'Transação não encontrada.' };

    const updateTxPayload = { status: 'concluido' as const, updatedAt: new Date().toISOString() };

    try {
      await setDoc(doc(db, 'wallet_transactions', txId), updateTxPayload, { merge: true });

      setAllWalletTransactions(prev => prev.map(t => {
        if (t.id === txId) {
          return { ...t, ...updateTxPayload };
        }
        return t;
      }));

      // If it's a plan payment, unlock the plan for user
      if (tx.planId) {
        await adminUnlockProPlan(tx.userId, tx.planId);
      } else if (tx.type === 'deposit') {
        const userTarget = allUsers.find(u => u.id === tx.userId);
        const newBalance = (userTarget?.walletBalanceKz || 0) + tx.amountKz;
        await setDoc(doc(db, 'users', tx.userId), { walletBalanceKz: newBalance }, { merge: true });
        await setDoc(doc(db, 'professionals', tx.userId), { walletBalanceKz: newBalance }, { merge: true });

        setCurrentUser(prev => {
          if (prev.id === tx.userId) {
            return { ...prev, walletBalanceKz: newBalance };
          }
          return prev;
        });
        setAllUsers(prev => prev.map(u => {
          if (u.id === tx.userId) {
            return { ...u, walletBalanceKz: newBalance };
          }
          return u;
        }));
        setProfessionals(prev => prev.map(p => {
          if (p.id === tx.userId) {
            return { ...p, walletBalanceKz: newBalance };
          }
          return p;
        }));
      }

      // Notify user
      addNotification({
        userId: tx.userId,
        targetRoleScope: tx.planId ? 'profissional' : 'todos',
        title: '🎉 Pagamento Aprovado com Sucesso!',
        message: `O Administrador confirmou o seu comprovativo e APROVOU o pagamento de ${tx.amountKz.toLocaleString('pt-AO')} Kz. ${tx.planId ? 'O seu pacote já está ativo!' : 'O saldo já está disponível na sua carteira.'}`,
        type: 'pagamento_confirmado'
      });

      await logAdminAction('Aprovação de Pagamento', tx.userId, `Pagamento ID ${txId} (${tx.amountKz.toLocaleString('pt-AO')} Kz) APROVADO`);

      return { success: true, message: 'Pagamento aprovado e ativado com sucesso na base de dados!' };
    } catch (err: any) {
      console.error('Erro ao aprovar transação no Firestore:', err);
      return { success: false, message: `Falha ao persistir aprovação no Firestore: ${err.message || err}` };
    }
  };

  const rejectPaymentTransaction = async (txId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const tx = allWalletTransactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'Transação não encontrada.' };

    const rejectPayload = { status: 'rejeitado' as const, rejectionReason: reason, updatedAt: new Date().toISOString() };

    try {
      await setDoc(doc(db, 'wallet_transactions', txId), rejectPayload, { merge: true });

      setAllWalletTransactions(prev => prev.map(t => {
        if (t.id === txId) {
          return { ...t, ...rejectPayload };
        }
        return t;
      }));

      // Notify user
      addNotification({
        userId: tx.userId,
        targetRoleScope: tx.planId ? 'profissional' : 'todos',
        title: '❌ Comprovativo Rejeitado pelo Administrador',
        message: `O seu comprovativo de pagamento de ${tx.amountKz.toLocaleString('pt-AO')} Kz foi rejeitado pelo Administrador. Motivo: ${reason || 'Comprovativo não identificado no extrato bancário.'}`,
        type: 'pagamento_confirmado'
      });

      await logAdminAction('Rejeição de Pagamento', tx.userId, `Pagamento ID ${txId} REJEITADO. Motivo: ${reason}`);

      return { success: true, message: 'Pagamento marcado como rejeitado na base de dados.' };
    } catch (err: any) {
      console.error('Erro ao rejeitar pagamento no Firestore:', err);
      return { success: false, message: `Falha ao persistir rejeição no Firestore: ${err.message || err}` };
    }
  };

  const requestWithdrawal = (amountKz: number, iban: string) => {
    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      type: 'withdrawal',
      amountKz,
      description: `Levantamento para IBAN: ${iban}`,
      status: 'concluido',
      createdAt: new Date().toISOString(),
      iban
    };

    setAllWalletTransactions(prev => [newTx, ...prev]);
    setCurrentUser(prev => ({
      ...prev,
      walletBalanceKz: Math.max(0, (prev.walletBalanceKz || 0) - amountKz)
    }));
  };

  const submitReport = (reportedUserId: string, reportedUserName: string, reason: string, details: string, requestId?: string) => {
    const newReport: UserReport = {
      id: `rep-${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId,
      reportedUserName,
      reason,
      details,
      requestId,
      status: 'pendente',
      createdAt: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem suspender contas.' };
    }

    const target = allUsers.find(u => u.id === userId);
    const blockTimestamp = new Date().toISOString();
    const blockPayload = {
      blocked: true,
      accountStatus: 'BLOCKED' as const,
      status: 'bloqueado' as const,
      blockedAt: blockTimestamp,
      blockedBy: currentUser.id
    };

    try {
      await setDoc(doc(db, 'users', userId), blockPayload, { merge: true });
      await setDoc(doc(db, 'professionals', userId), blockPayload, { merge: true });

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...blockPayload } : u));
      setProfessionals(prev => prev.map(p => p.id === userId ? { ...p, ...blockPayload } : p));
      setReports(prev => prev.map(r => r.reportedUserId === userId ? { ...r, status: 'bloqueado' } : r));

      await logAdminAction('Bloqueio de Utilizador', userId, `Conta de ${target?.name || userId} bloqueada pelo Administrador. Todos os dados foram integralmente preservados.`);

      return { success: true, message: `Utilizador "${target?.name || userId}" bloqueado com sucesso na base de dados (dados 100% preservados).` };
    } catch (err: any) {
      console.error('Erro ao bloquear utilizador no Firestore:', err);
      return { success: false, message: `Falha ao persistir bloqueio no Firestore: ${err.message || err}` };
    }
  };

  const unblockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem reativar contas.' };
    }

    const target = allUsers.find(u => u.id === userId);
    const unblockTimestamp = new Date().toISOString();
    const unblockPayload = {
      blocked: false,
      accountStatus: 'ACTIVE' as const,
      status: 'ativo' as const,
      unblockedAt: unblockTimestamp,
      unblockedBy: currentUser.id
    };

    try {
      await setDoc(doc(db, 'users', userId), unblockPayload, { merge: true });
      await setDoc(doc(db, 'professionals', userId), { ...unblockPayload, status: 'disponivel' as const }, { merge: true });

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, blocked: false, accountStatus: 'ACTIVE', status: 'ativo' } : u));
      setProfessionals(prev => prev.map(p => p.id === userId ? { ...p, blocked: false, accountStatus: 'ACTIVE', status: 'disponivel' } : p));

      await logAdminAction('Desbloqueio de Utilizador', userId, `Conta de ${target?.name || userId} desbloqueada e acesso restaurado normalmente`);

      return { success: true, message: `Utilizador "${target?.name || userId}" desbloqueado com sucesso na base de dados.` };
    } catch (err: any) {
      console.error('Erro ao desbloquear utilizador no Firestore:', err);
      return { success: false, message: `Falha ao persistir desbloqueio no Firestore: ${err.message || err}` };
    }
  };

  const adminDeleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem excluir contas.' };
    }

    // Prevent deleting super admin
    const target = allUsers.find(u => u.id === userId);
    if (target && target.role === 'admin' && (target.adminSubRole === 'super_admin' || !target.adminSubRole)) {
      return { success: false, message: 'Não é permitido apagar a conta do Super Administrador principal.' };
    }

    const deleteTimestamp = new Date().toISOString();
    const deletedPayload = {
      isDeleted: true,
      status: 'deleted' as const,
      deletedAt: deleteTimestamp,
      deletedBy: currentUser.id,
      deletedByName: currentUser.name
    };

    try {
      // 1. Update in Firestore 'users' collection (soft delete preserves system logs & integrity)
      await setDoc(doc(db, 'users', userId), deletedPayload, { merge: true });

      // 2. Update in Firestore 'professionals' collection
      await setDoc(doc(db, 'professionals', userId), deletedPayload, { merge: true });

      // 3. Log audit action in Firestore
      await logAdminAction(
        'Exclusão de Conta (Soft Delete)', 
        userId, 
        `Conta de ${target?.name || userId} (${target?.role || 'utilizador'}) excluída definitivamente na base de dados`
      );

      // 4. Update local state
      setAllUsers(prev => prev.filter(u => u.id !== userId));
      setProfessionals(prev => prev.filter(p => p.id !== userId));

      return { success: true, message: `Conta de "${target?.name || userId}" excluída com sucesso e persistida na base de dados.` };
    } catch (err: any) {
      console.error('Erro ao excluir conta no Firestore:', err);
      return { success: false, message: `Falha ao persistir a exclusão na base de dados: ${err.message || err}` };
    }
  };

  const adminChangeUserAccountType = async (userId: string, newAccountType: AccountType): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const targetRole: UserRole = newAccountType === 'profissional' ? 'profissional' : 'cliente';
    const target = allUsers.find(u => u.id === userId);
    const changeTimestamp = new Date().toISOString();
    const changePayload = {
      accountType: newAccountType,
      role: target?.role === 'admin' ? ('admin' as UserRole) : targetRole,
      accountTypeChangedAt: changeTimestamp,
      accountTypeChangedBy: currentUser.id
    };

    try {
      await setDoc(doc(db, 'users', userId), changePayload, { merge: true });
      await setDoc(doc(db, 'professionals', userId), changePayload, { merge: true });

      await logAdminAction('Alteração do Tipo de Conta', userId, `Tipo de conta de ${target?.name || userId} alterado para ${newAccountType}`);

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, ...changePayload } : u));
      setProfessionals(prev => prev.map(p => p.id === userId ? { ...p, ...changePayload } : p));

      if (currentUser.id === userId) {
        setCurrentUser(prev => ({ ...prev, ...changePayload }));
      }

      return { success: true, message: `Tipo de conta alterado para "${newAccountType}" com sucesso na base de dados.` };
    } catch (err: any) {
      console.error('Erro ao alterar tipo de conta no Firestore:', err);
      return { success: false, message: `Falha ao persistir a alteração no Firestore: ${err.message || err}` };
    }
  };

  const adminUpdateProCategories = async (userId: string, newCategories: string[]): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem atualizar áreas de atuação.' };
    }

    try {
      const sanitized = Array.isArray(newCategories) ? newCategories : [];
      await setDoc(doc(db, 'users', userId), { categories: sanitized }, { merge: true });
      await setDoc(doc(db, 'professionals', userId), { categories: sanitized }, { merge: true });

      await logAdminAction('Atualização de Áreas de Atuação', userId, `Áreas alteradas para: [${sanitized.join(', ')}]`);

      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, categories: sanitized } : u));
      setProfessionals(prev => prev.map(p => p.id === userId ? { ...p, categories: sanitized } : p));

      if (currentUser.id === userId) {
        setCurrentUser(prev => ({ ...prev, categories: sanitized }));
      }

      return { success: true, message: 'Áreas de atuação do profissional atualizadas com sucesso!' };
    } catch (err: any) {
      console.error('Erro ao atualizar áreas no Firestore:', err);
      return { success: false, message: `Falha ao atualizar categorias: ${err.message || err}` };
    }
  };

  const auditAndFixBuggedCategories = async (options?: { dryRun?: boolean }): Promise<{
    scannedCount: number;
    affectedCount: number;
    fixedCount: number;
    details: Array<{
      proId: string;
      proName: string;
      beforeCategories: string[];
      afterCategories: string[];
      reason: string;
      actionTaken: 'corrigido' | 'mantido' | 'analisado';
    }>;
  }> => {
    const results: Array<{
      proId: string;
      proName: string;
      beforeCategories: string[];
      afterCategories: string[];
      reason: string;
      actionTaken: 'corrigido' | 'mantido' | 'analisado';
    }> = [];

    const nonEletricianKeywords = [
      'decorad', 'festa', 'evento', 'pintor', 'pintura', 'canalizad', 'plumber',
      'cabeleir', 'tranc', 'cabelo', 'unha', 'manicure', 'estetica', 'limpeza', 'faxina',
      'pedreir', 'obra', 'mecanic', 'mecanico', 'costur', 'alfaiat', 'fotograf', 'filmagem',
      'motorista', 'transporte', 'mudanca', 'cozinha', 'chef', 'doce', 'bolo', 'buffet',
      'seguranca', 'vigilante', 'tatuad', 'barbeir', 'serralh', 'marceneir', 'moveis', 'estofad'
    ];

    let fixedCount = 0;

    for (const pro of professionals) {
      if (isFictitiousOrInvalidUser(pro)) continue;
      const cats = Array.isArray(pro.categories) ? pro.categories : [];
      if (cats.length === 0) continue;

      const hasEletricista = cats.includes('eletricista') || cats.includes('electricista');
      if (!hasEletricista) continue;

      // Case: Professional has eletricista PLUS other categories (e.g. ['eletricista', 'decoracao'])
      // where eletricista was placed at index 0 by the bug
      if (cats.length > 1 && (cats[0] === 'eletricista' || cats[0] === 'electricista')) {
        const otherCats = cats.filter(c => c !== 'eletricista' && c !== 'electricista');
        const bioLower = (pro.bio || '').toLowerCase();
        const nameLower = (pro.name || '').toLowerCase();
        
        const mentionsNonElec = nonEletricianKeywords.some(k => bioLower.includes(k) || nameLower.includes(k));
        const mentionsElecSpecifically = bioLower.includes('quadro') || bioLower.includes('eletricidade') || bioLower.includes('disjuntor') || bioLower.includes('curto-circuito') || nameLower.includes('eletricista') || nameLower.includes('electricista');
        const isAutoBioPattern = bioLower.includes('profissional qualificado em electricista') || bioLower.includes('profissional qualificado em eletricista');

        if ((mentionsNonElec || isAutoBioPattern) && !mentionsElecSpecifically) {
          const correctedCats = otherCats;
          if (!options?.dryRun) {
            try {
              await setDoc(doc(db, 'users', pro.id), { categories: correctedCats }, { merge: true });
              await setDoc(doc(db, 'professionals', pro.id), { categories: correctedCats }, { merge: true });
            } catch (e) {
              console.warn('Firestore pro fix notice:', e);
            }
            fixedCount++;
          }

          results.push({
            proId: pro.id,
            proName: pro.name,
            beforeCategories: cats,
            afterCategories: correctedCats,
            reason: `Evidência clara de seleção automática: profissional de [${otherCats.join(', ')}] com 'eletricista' inserido automaticamente.`,
            actionTaken: options?.dryRun ? 'analisado' : 'corrigido'
          });
          continue;
        } else {
          results.push({
            proId: pro.id,
            proName: pro.name,
            beforeCategories: cats,
            afterCategories: cats,
            reason: `Mantido com segurança: o profissional possui ambas as áreas e pode ter selecionado legitimamente.`,
            actionTaken: 'mantido'
          });
          continue;
        }
      }

      // Case: Professional has ONLY eletricista but their name indicates another distinct trade
      const bioLower = (pro.bio || '').toLowerCase();
      const nameLower = (pro.name || '').toLowerCase();
      const matchesOther = nonEletricianKeywords.find(k => nameLower.includes(k));
      if (matchesOther && !nameLower.includes('eletric') && !bioLower.includes('eletric')) {
        results.push({
          proId: pro.id,
          proName: pro.name,
          beforeCategories: cats,
          afterCategories: cats,
          reason: `Atenção: Cadastrado apenas com [eletricista] mas o nome/bio sugere '${matchesOther}'. Verificação manual recomendada.`,
          actionTaken: 'mantido'
        });
      }
    }

    if (!options?.dryRun && fixedCount > 0) {
      setProfessionals(prev => prev.map(p => {
        const found = results.find(r => r.proId === p.id && r.actionTaken === 'corrigido');
        return found ? { ...p, categories: found.afterCategories } : p;
      }));
      setAllUsers(prev => prev.map(u => {
        const found = results.find(r => r.proId === u.id && r.actionTaken === 'corrigido');
        return found ? { ...u, categories: found.afterCategories } : u;
      }));
      await logAdminAction('Auditoria e Correção de Categorias', undefined, `${fixedCount} profissionais corrigidos do erro de seleção automática.`);
    }

    return {
      scannedCount: professionals.filter(p => !isFictitiousOrInvalidUser(p)).length,
      affectedCount: results.filter(r => r.beforeCategories.length !== r.afterCategories.length).length,
      fixedCount,
      details: results
    };
  };

  const updatePlatformSettings = async (newSettings: Partial<PlatformSettings>): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    setPlatformSettings(prev => ({ ...prev, ...newSettings }));

    try {
      await setDoc(doc(db, 'platform_settings', 'global_config'), newSettings, { merge: true });
      await logAdminAction('Atualização de Configurações da Plataforma', undefined, JSON.stringify(newSettings));
      return { success: true, message: 'Configurações atualizadas e sincronizadas no Firestore com sucesso!' };
    } catch (err: any) {
      console.error('Erro ao guardar configurações no Firestore:', err);
      return { success: false, message: `Falha ao persistir definições no Firestore: ${err.message || err}` };
    }
  };

  const updateCodeOfConductRules = (newRules: CodeOfConductSection[]) => {
    setCodeOfConductRules(newRules);
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_code_of_conduct`, JSON.stringify(newRules));
    logAdminAction('Atualização do Código de Conduta', 'all', 'Novas regras salvas pelo Administrador');
  };

  const checkCategoryUsage = (categoryId: string) => {
    const pros = professionals.filter(p => p.categories && p.categories.includes(categoryId)).length;
    const reqCount = requests.filter(r => r.categoryId === categoryId).length;
    const posts = workFeedPosts.filter(w => w.categoryId === categoryId).length;
    return { pros, requests: reqCount, posts, total: pros + reqCount + posts };
  };

  const addCategory = async (catData: Omit<ServiceCategory, 'id'> | ServiceCategory): Promise<{ success: boolean; message: string; category?: ServiceCategory }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode adicionar categorias.' };
    }

    if (!catData.name || !catData.name.trim()) {
      return { success: false, message: 'O nome da categoria é obrigatório.' };
    }

    const trimmedName = catData.name.trim();
    const cleanId = (catData as ServiceCategory).id || trimmedName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `cat-${Date.now()}`;
    
    // Check if category already exists
    const duplicate = categories.find(c => c.id === cleanId || c.name.toLowerCase() === trimmedName.toLowerCase());
    if (duplicate) {
      return { success: false, message: `Já existe uma categoria com o nome "${trimmedName}" (ID: ${duplicate.id}).` };
    }

    const itemsList = Array.isArray(catData.items) ? catData.items : (Array.isArray(catData.subcategories) ? catData.subcategories : []);
    const timestamp = new Date().toISOString();

    const newCat: ServiceCategory = {
      id: cleanId,
      name: trimmedName,
      description: catData.description?.trim() || 'Serviço qualificado e de confiança em Angola',
      iconName: catData.iconName || 'Briefcase',
      color: catData.color || 'emerald',
      group: catData.group?.trim() || 'Casa & Manutenção',
      popularCount: catData.popularCount || 100,
      items: itemsList,
      subcategories: itemsList,
      imageUrl: catData.imageUrl || '',
      isActive: catData.isActive !== false,
      ownerId: currentUser.id,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    try {
      // 1. Persist to Firestore categories collection
      await setDoc(doc(db, 'categories', cleanId), newCat, { merge: true });
      
      // 2. Persist to Firestore servicos collection (blueprint mapping)
      try {
        await setDoc(doc(db, 'servicos', cleanId), newCat, { merge: true });
      } catch {}

      // 3. Update local state
      setCategories(prev => [...prev, newCat]);

      // 4. Log audit action
      await logAdminAction(
        'Adição de Categoria',
        cleanId,
        `Categoria "${newCat.name}" criada com sucesso (${itemsList.length} subcategorias). Grupo: ${newCat.group}`
      );

      return { success: true, message: `Categoria "${newCat.name}" adicionada com sucesso!`, category: newCat };
    } catch (err: any) {
      console.error('Erro ao salvar categoria no Firestore:', err);
      // Still update local state for offline resilience
      setCategories(prev => [...prev, newCat]);
      return { success: true, message: `Categoria "${newCat.name}" adicionada com sucesso localmente.`, category: newCat };
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<ServiceCategory>): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode editar categorias.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) {
      return { success: false, message: 'Categoria não encontrada.' };
    }

    const timestamp = new Date().toISOString();
    const itemsList = updates.items || updates.subcategories || existing.items || existing.subcategories || [];

    const updatedCat: ServiceCategory = {
      ...existing,
      ...updates,
      items: itemsList,
      subcategories: itemsList,
      updatedAt: timestamp
    };

    try {
      await setDoc(doc(db, 'categories', categoryId), updatedCat, { merge: true });
      try {
        await setDoc(doc(db, 'servicos', categoryId), updatedCat, { merge: true });
      } catch {}

      setCategories(prev => prev.map(c => c.id === categoryId ? updatedCat : c));

      await logAdminAction(
        'Atualização de Categoria',
        categoryId,
        `Categoria "${updatedCat.name}" atualizada pelo Administrador.`
      );

      return { success: true, message: `Categoria "${updatedCat.name}" atualizada com sucesso!` };
    } catch (err: any) {
      console.error('Erro ao atualizar categoria no Firestore:', err);
      setCategories(prev => prev.map(c => c.id === categoryId ? updatedCat : c));
      return { success: true, message: `Categoria "${updatedCat.name}" atualizada com sucesso.` };
    }
  };

  const toggleCategoryStatus = async (categoryId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador pode alterar o estado da categoria.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) return { success: false, message: 'Categoria não encontrada.' };

    const newIsActive = existing.isActive === false ? true : false;
    return updateCategory(categoryId, { isActive: newIsActive });
  };

  const deleteCategory = async (categoryId: string, force = false): Promise<{ success: boolean; message: string; inUse?: boolean; usageCount?: { pros: number; requests: number; posts: number } }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode excluir categorias.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) {
      return { success: false, message: 'Categoria não encontrada.' };
    }

    const usage = checkCategoryUsage(categoryId);
    if (usage.total > 0 && !force) {
      return {
        success: false,
        inUse: true,
        usageCount: { pros: usage.pros, requests: usage.requests, posts: usage.posts },
        message: `Esta categoria está associada a ${usage.pros} profissional(is), ${usage.requests} pedido(s) e ${usage.posts} publicação(ões). Desative a categoria ou confirme a exclusão forçada.`
      };
    }

    try {
      await deleteDoc(doc(db, 'categories', categoryId));
      try {
        await deleteDoc(doc(db, 'servicos', categoryId));
      } catch {}

      setCategories(prev => prev.filter(c => c.id !== categoryId));

      await logAdminAction(
        'Exclusão de Categoria',
        categoryId,
        `Categoria "${existing.name}" (ID: ${categoryId}) excluída definitivamente.`
      );

      return { success: true, message: `Categoria "${existing.name}" excluída com sucesso da base de dados!` };
    } catch (err: any) {
      console.error('Erro ao excluir categoria do Firestore:', err);
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      return { success: true, message: `Categoria "${existing.name}" removida com sucesso.` };
    }
  };

  const addSubcategory = async (categoryId: string, subcategoryName: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode adicionar subcategorias.' };
    }

    const trimmed = subcategoryName.trim();
    if (!trimmed) {
      return { success: false, message: 'O nome da subcategoria não pode estar vazio.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) {
      return { success: false, message: 'Categoria principal não encontrada.' };
    }

    const currentItems = existing.items || existing.subcategories || [];
    if (currentItems.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, message: `A subcategoria "${trimmed}" já existe nesta categoria.` };
    }

    const newItems = [...currentItems, trimmed];
    return updateCategory(categoryId, { items: newItems, subcategories: newItems });
  };

  const updateSubcategory = async (categoryId: string, oldName: string, newName: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode editar subcategorias.' };
    }

    const trimmedNew = newName.trim();
    if (!trimmedNew) {
      return { success: false, message: 'O novo nome da subcategoria não pode estar vazio.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) {
      return { success: false, message: 'Categoria principal não encontrada.' };
    }

    const currentItems = existing.items || existing.subcategories || [];
    const newItems = currentItems.map(item => item === oldName ? trimmedNew : item);

    return updateCategory(categoryId, { items: newItems, subcategories: newItems });
  };

  const deleteSubcategory = async (categoryId: string, subcategoryName: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas o administrador autorizado pode excluir subcategorias.' };
    }

    const existing = categories.find(c => c.id === categoryId);
    if (!existing) {
      return { success: false, message: 'Categoria principal não encontrada.' };
    }

    const currentItems = existing.items || existing.subcategories || [];
    const newItems = currentItems.filter(item => item !== subcategoryName);

    return updateCategory(categoryId, { items: newItems, subcategories: newItems });
  };

  const resetDemoData = () => {
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_user`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_cats`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_pros`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_users`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_reqs`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_msgs`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_revs`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_txs`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_reports`);
    localStorage.removeItem(`${LOCAL_STORAGE_KEY}_settings`);

    setAllUsers(MOCK_USERS);
    setProfessionals(MOCK_PROFESSIONALS);
    setWorkFeedPosts([]);
    setCurrentUser(DEFAULT_ADMIN_USER);
    setIsLoggedIn(true);
    setCategories(CATEGORIES);
    setRequests([]);
    setMessages([]);
    setReviews([]);
    setAllWalletTransactions([]);
    setReports([]);
    setPlatformSettings(DEFAULT_SETTINGS);
    setActiveTab('home');
  };

  // Scoped wallet transactions: Admin sees all transactions, Professionals see strictly their own, Clients see empty array
  const walletTransactions = useMemo(() => {
    if (currentUser.role === 'admin') {
      return allWalletTransactions;
    }
    if (currentUser.role === 'profissional') {
      return allWalletTransactions.filter(t => t.userId === currentUser.id);
    }
    return [];
  }, [allWalletTransactions, currentUser.id, currentUser.role]);

  return (
    <AppContext.Provider value={{
      currentUser,
      userRole: currentUser.role,
      activeTab,
      setActiveTab,
      switchRole,
      categories,
      professionals,
      allUsers,
      requests,
      messages,
      reviews,
      walletTransactions,
      reports,
      auditLogs,
      platformSettings,
      workFeedPosts,
      addWorkFeedPost,
      updateWorkFeedPost,
      likeWorkFeedPost,
      deleteWorkFeedPost,
      isSubExpiredModalOpen,
      setIsSubExpiredModalOpen,
      subExpiredCustomMessage,
      triggerBlockedActionPrompt,
      selectedCategory,
      setSelectedCategory,
      selectedProvince,
      setSelectedProvince,
      searchQuery,
      setSearchQuery,
      selectedPro,
      setSelectedPro,
      activeChatRequestId,
      setActiveChatRequestId,
      conversations,
      unreadChatMessagesCount,
      markConversationAsRead,
      startOrOpenConversation,
      isNewRequestOpen,
      setIsNewRequestOpen,
      isReviewModalOpen,
      setIsReviewModalOpen,
      reviewingRequestId,
      setReviewingRequestId,
      notifications,
      unreadNotificationsCount,
      markNotificationAsRead,
      addNotification,
      createServiceRequest,
      updateRequestStatus,
      sendChatMessage,
      retryChatMessage,
      submitReview,
      verifyProfessional,
      verifyProExperience,
      updateUserProfile,
      registerUserAsync,
      loginUserWithCredentialsAsync,
      requestPasswordRecoveryOtpAsync,
      verifyRecoveryOtpAsync,
      resetAccountPasswordAsync,
      requestPhoneRecoveryVerificationAsync,
      updateRecoveredPhoneNumberAsync,
      changeProPlan,
      subscribeToPlan,
      adminUnlockProPlan,
      adminChangeUserAccountType,
      adminUpdateProCategories,
      auditAndFixBuggedCategories,
      addWalletDeposit,
      submitPaymentWithProof,
      approvePaymentTransaction,
      rejectPaymentTransaction,
      requestWithdrawal,
      submitReport,
      blockUser,
      unblockUser,
      adminDeleteUser,
      updatePlatformSettings,
      codeOfConductRules,
      updateCodeOfConductRules,
      isRulesModalOpen,
      setIsRulesModalOpen,
      addCategory,
      updateCategory,
      deleteCategory,
      toggleCategoryStatus,
      addSubcategory,
      updateSubcategory,
      deleteSubcategory,
      checkCategoryUsage,
      addStaffAdmin,
      logAdminAction,
      runAutoTestSuite,
      checkProAutoApproval,
      canChatInRequest,
      isMobileFrame,
      setIsMobileFrame,
      isTestSuiteOpen,
      setIsTestSuiteOpen,
      isOnline,
      setIsOnline,
      isLoggedIn,
      setIsLoggedIn,
      loginUser,
      logoutUser,
      resetDemoData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
