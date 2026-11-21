import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
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
import {
  PLAN_PRICES,
  NEW_TRIAL_DAYS,
  getProPlanStatus,
  validateProAction,
  getPlanDisplayInfo,
  isValidPaidPlanKey
} from '../utils/planUtils';
import { isNotificationForUser } from '../utils/notificationUtils';
import { runFullSystemTestSuite } from '../utils/systemTestSuite';
import { 
  RECOVERY_MESSAGES, 
  checkRecoveryRateLimit,
  maskPhoneNumber
} from '../utils/recoveryUtils';
import {
  INVALID_ANGOLA_PHONE_MESSAGE,
  validateStrictAngolaPhone,
  normalizePhoneNumber,
  phoneToSyntheticAuthEmail,
  isSyntheticPhoneAuthEmail,
  getPublicUserEmail,
  computePhoneIndexId,
  areSamePhoneNumber,
  isOfficialAdminPhone,
  OFFICIAL_ADMIN_EMAIL,
  OFFICIAL_ADMIN_PRIMARY_PHONE_DISPLAY
} from '../utils/phoneAuthUtils';
import { CATEGORIES, DEFAULT_ADMIN_USER, MOCK_USERS, MOCK_PROFESSIONALS, MOCK_WORK_FEED_POSTS } from '../mockData';
import { safeStorageGet, safeStorageSet, safeStorageRemove, sanitizeFeedPostsForStorage } from '../utils/storageUtils';
import { sanitizeMediaUrl, stripSensitiveFields, sanitizePlatformSettings, computeSha256Hex } from '../utils/securityUtils';
import { logFirestoreWarning, OperationType } from '../utils/firestoreErrors';
import { OFFICIAL_APP_URL } from '../config/domain';
import { db, auth } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  deleteDoc,
  enableNetwork,
  onSnapshot, 
  query, 
  where, 
  runTransaction,
  serverTimestamp
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
  if (
    id === 'user-admin-1' || 
    user.email === 'jfigueiredo790@gmail.com' || 
    (user.phone && user.phone.replace(/\D/g, '').endsWith('956011985')) ||
    (user.phone && user.phone.replace(/\D/g, '').endsWith('924835279'))
  ) {
    return false;
  }

  // Fictitious mock list check
  if (FICTITIOUS_MOCK_IDS.has(id)) return true;
  if (id.startsWith('mock-') || id.startsWith('dummy-') || id.startsWith('test-user-')) return true;

  // Deleted or soft deleted accounts
  if (user.isDeleted === true || user.status === 'deleted') return true;

  // Only filter true empty guest placeholder
  const name = (user.name || '').trim().toLowerCase();
  if (name === 'guest client' || id === 'guest-client') {
    return true;
  }

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
  addWorkFeedPost: (post: Omit<WorkFeedPost, 'id' | 'createdAt' | 'likesCount' | 'likedBy'>) => { success: boolean; post?: WorkFeedPost; error?: string };
  refreshWorkFeed: () => Promise<{ success: boolean; message: string }>;
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
  updateRequestStatus: (requestId: string, status: RequestStatus, reason?: string) => void;
  sendChatMessage: (requestId: string, text: string, isQuote?: boolean, quotePriceKz?: number, imageUrl?: string, locationPin?: { label: string; lat?: number; lng?: number }) => void;
  retryChatMessage: (messageId: string) => void;
  submitReview: (reviewData: Omit<Review, 'id' | 'date'>) => void;
  verifyProfessional: (proId: string) => Promise<{ success: boolean; message: string }>;
  verifyProExperience: (proId: string, isVerified: boolean) => Promise<{ success: boolean; message: string }>;
  updateUserProfile: (updated: Partial<User & ProfessionalProfile>) => void;
  registerUserAsync: (userData: Partial<User & ProfessionalProfile>, password?: string) => Promise<{ success: boolean; message: string }>;
  loginUserWithCredentialsAsync: (
    phoneInput: string,
    passInput: string,
    selectedRole: UserRole,
    options?: { legacyEmail?: string }
  ) => Promise<{
    success: boolean;
    message: string;
    role?: UserRole;
    suggestLegacyMigration?: boolean;
    needsAdminEmailVerification?: boolean;
  }>;
  
  // Account Access Recovery Methods (Phone-first)
  requestPasswordRecoveryOtpAsync: (phoneInput: string) => Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedContact?: string;
    deliveryChannel?: 'sms' | 'email_link' | 'identity_verification';
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
    isBlocked?: boolean;
  }>;
  updateRecoveredPhoneNumberAsync: (sessionId: string, verifiedOtp: string, newPhone: string) => Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }>;
  migrateLegacyAccountsPhoneIndexAsync: () => Promise<{
    success: boolean;
    migratedCount: number;
    skippedCount: number;
    message: string;
  }>;
  sendAdminVerificationEmailAsync: () => Promise<{
    success: boolean;
    message: string;
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

  // Request Exclusivity, State Machine & Control Validators (Regra de Exclusividade J Smart Services)
  canPerformRequestAction: (action: 'aceitar' | 'em_negociacao' | 'em_progresso' | 'concluir' | 'novamente_disponivel' | 'cancelar', req: ServiceRequest | undefined, user?: User, activeRole?: UserRole) => { allowed: boolean; reason: string };
  acceptServiceRequest: (requestId: string) => Promise<{ success: boolean; message: string }>;
  releaseServiceRequestWithoutAgreement: (requestId: string, reason?: string) => Promise<{ success: boolean; message: string }>;

  // Communication & Permissions Validator
  canChatInRequest: (req: ServiceRequest | undefined, userId?: string, activeRole?: UserRole) => { allowed: boolean; reason: string };

  // Auth state
  isLoggedIn: boolean;
  setIsLoggedIn: (loggedIn: boolean) => void;
  loginUser: (user: User, role: UserRole) => void;
  logoutUser: () => void;
  
  // Network & Cloud Synchronization State
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  isSyncing: boolean;
  lastSyncTimestamp: string | null;
  forceSyncWithFirestore: () => Promise<{ success: boolean; message: string }>;

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
  adminCity: 'Centralidade do Sequele'
};

const toPublicProData = (pro: Partial<User & ProfessionalProfile>): Record<string, any> => {
  const isBlocked = pro.blocked === true || pro.status === 'bloqueado';
  const publicDoc: Record<string, any> = {
    id: pro.id || '',
    name: (pro.name || 'Profissional').trim(),
    avatar: pro.avatar || pro.photoURL || '',
    photoURL: pro.photoURL || pro.avatar || '',
    province: pro.province || 'Luanda',
    city: pro.city || pro.province || 'Luanda',
    categories: Array.isArray(pro.categories) ? pro.categories : [],
    bio: (pro.bio || 'Profissional prestador de serviços.').trim(),
    experienceYears: Math.max(0, Number(pro.experienceYears) || 0),
    experienceVerified: pro.experienceVerified ?? false,
    hourlyRateKz: Math.max(0, Number(pro.hourlyRateKz) || 15000),
    rating: Number(pro.rating) || 5.0,
    reviewCount: Number(pro.reviewCount) || 0,
    completedJobs: Number(pro.completedJobs) || 0,
    verified: isBlocked ? false : (pro.verified ?? true),
    documentsVerified: isBlocked ? false : ((pro as any).documentsVerified ?? true),
    isAutoApproved: isBlocked ? false : ((pro as any).isAutoApproved ?? true),
    status: isBlocked ? 'bloqueado' : (pro.status || 'disponivel'),
    portfolioImages: Array.isArray(pro.portfolioImages) ? pro.portfolioImages : [],
    plan: (pro as any).plan || 'gratuito',
    subscriptionPlan: pro.subscriptionPlan || 'free_trial',
    blocked: isBlocked,
    accountStatus: pro.accountStatus || (isBlocked ? 'BLOCKED' : 'ACTIVE'),
    role: 'profissional',
    accountType: pro.accountType || 'profissional',
    createdAt: pro.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (pro.planStartedAt) publicDoc.planStartedAt = pro.planStartedAt;
  if (pro.planExpiresAt) publicDoc.planExpiresAt = pro.planExpiresAt;
  if (pro.trialStartDate) publicDoc.trialStartDate = pro.trialStartDate;
  if (pro.trialEndsAt) publicDoc.trialEndsAt = pro.trialEndsAt;
  if (typeof pro.trialDurationDays === 'number') publicDoc.trialDurationDays = pro.trialDurationDays;
  if (pro.subscriptionStatus) publicDoc.subscriptionStatus = pro.subscriptionStatus;
  if (pro.isDeleted !== undefined) publicDoc.isDeleted = pro.isDeleted;
  return publicDoc;
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
  const [firebaseAuthUid, setFirebaseAuthUid] = useState<string | null>(() => auth.currentUser?.uid || null);

  // Load state from local storage safely without plaintext secrets
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_pros`);
    if (saved) {
      try {
        const parsed: ProfessionalProfile[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !isFictitiousOrInvalidUser(p)).map(p => stripSensitiveFields(p));
        }
      } catch {}
    }
    return MOCK_PROFESSIONALS.filter(p => !isFictitiousOrInvalidUser(p)).map(p => stripSensitiveFields(p));
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_users`);
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(u => !isFictitiousOrInvalidUser(u)).map(u => stripSensitiveFields(u));
        }
      } catch {}
    }
    return MOCK_USERS.filter(u => !isFictitiousOrInvalidUser(u)).map(u => stripSensitiveFields(u));
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedUser = safeStorageGet(`${LOCAL_STORAGE_KEY}_user`);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && isFictitiousOrInvalidUser(parsed)) {
          return false;
        }
        if (parsed && parsed.role === 'admin' && !auth.currentUser) {
          return false;
        }
      } catch {}
    }
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_is_logged_in`);
    return saved ? JSON.parse(saved) : false;
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUser = safeStorageGet(`${LOCAL_STORAGE_KEY}_user`);
    const savedLoggedIn = safeStorageGet(`${LOCAL_STORAGE_KEY}_is_logged_in`);
    const loggedIn = savedLoggedIn ? JSON.parse(savedLoggedIn) : false;
    if (loggedIn && savedUser) {
      try {
        const parsed = stripSensitiveFields(JSON.parse(savedUser));
        if (parsed && !isFictitiousOrInvalidUser(parsed)) {
          if (parsed.role === 'admin' && !auth.currentUser) {
            return CLEAN_GUEST_USER;
          }
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
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error' | 'offline'>('synced');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(() => new Date().toISOString());
  const pendingWriteIdsRef = useRef<Set<string>>(new Set());
  const deletedIdsRef = useRef<Set<string>>(new Set());
  const forceSyncRef = useRef<(() => Promise<{ success: boolean; message: string }>) | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      enableNetwork(db).catch(() => {});
      if (forceSyncRef.current) {
        forceSyncRef.current();
      } else {
        setSyncStatus('synced');
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_cats`);
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
    safeStorageSet(`${LOCAL_STORAGE_KEY}_cats`, JSON.stringify(categories));
  }, [categories]);

  const [requests, setRequests] = useState<ServiceRequest[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_reqs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_msgs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_revs`);
    return saved ? JSON.parse(saved) : [];
  });

  const DEFAULT_INITIAL_TXS: WalletTransaction[] = [];

  const [allWalletTransactions, setAllWalletTransactions] = useState<WalletTransaction[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_txs`);
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
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_reports`);
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_audit_logs`);
    return saved ? JSON.parse(saved) : [];
  });

  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_settings`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const merged = sanitizePlatformSettings({ ...DEFAULT_SETTINGS, ...parsed });
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
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_code_of_conduct`);
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
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_notifications`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'notif-1',
        userId: 'pro_all',
        targetRoleScope: 'profissional',
        title: '📢 Comunicado Oficial J Smart Services',
        message: 'Novos profissionais contam com 30 dias (1 mês) totalmente grátis para receber clientes e divulgar serviços na J Smart Services.',
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
    safeStorageSet(`${LOCAL_STORAGE_KEY}_notifications`, JSON.stringify(notifications));
  }, [notifications]);

  // Work Feed State & Sub Expired Prompt
  const [workFeedPosts, setWorkFeedPosts] = useState<WorkFeedPost[]>(() => {
    const saved = safeStorageGet(`${LOCAL_STORAGE_KEY}_feed_posts`);
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
    const sanitized = sanitizeFeedPostsForStorage(workFeedPosts);
    safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
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
      return { success: false, error: msg };
    }

    const validation = validateProAction(currentUser);
    if (!validation.allowed) {
      if (validation.reason === 'blocked') {
        return { success: false, error: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador.' };
      }
      triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.');
      return { success: false, error: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.' };
    }

    const safeMediaUrl = sanitizeMediaUrl(post.mediaUrl);
    if (post.mediaUrl && !safeMediaUrl) {
      return { success: false, error: 'URL de média inválido ou não permitido por razões de segurança.' };
    }

    const sanitizedMediaUrls = Array.isArray(post.mediaUrls)
      ? post.mediaUrls.map(u => sanitizeMediaUrl(u)).filter((u): u is string => Boolean(u))
      : undefined;

    const newPost: WorkFeedPost = {
      ...post,
      mediaUrl: safeMediaUrl || '',
      ...(sanitizedMediaUrls ? { mediaUrls: sanitizedMediaUrls } : {}),
      ownerId: currentUser.id,
      id: `feed-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      likesCount: 0,
      likedBy: [],
      reactions: {},
      createdAt: new Date().toISOString()
    };

    pendingWriteIdsRef.current.add(newPost.id);
    deletedIdsRef.current.delete(newPost.id);

    setWorkFeedPosts(prev => {
      const updated = [newPost, ...prev];
      const sanitized = sanitizeFeedPostsForStorage(updated);
      safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
      return updated;
    });

    try {
      setDoc(doc(db, 'work_feed_posts', newPost.id), newPost)
        .then(() => {
          pendingWriteIdsRef.current.delete(newPost.id);
        })
        .catch((err) => {
          logFirestoreWarning(err, OperationType.CREATE, `work_feed_posts/${newPost.id}`);
        });
    } catch (e) {}

    return { success: true, post: newPost };
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

    setWorkFeedPosts(prev => {
      const updated = prev.map(p => p.id === postId ? updatedPost : p);
      const sanitized = sanitizeFeedPostsForStorage(updated);
      safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
      return updated;
    });

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
    deletedIdsRef.current.add(postId);
    pendingWriteIdsRef.current.delete(postId);
    setWorkFeedPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      const sanitized = sanitizeFeedPostsForStorage(updated);
      safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
      return updated;
    });
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
    const isAuthor = currentUser.id === existingPost.professionalId || (existingPost.ownerId && currentUser.id === existingPost.ownerId) || (currentUser.email && existingPost.ownerId === currentUser.email);
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

    const sanitizedUpdateData = { ...updatedData };
    if (sanitizedUpdateData.mediaUrl !== undefined) {
      const safeMedia = sanitizeMediaUrl(sanitizedUpdateData.mediaUrl);
      if (sanitizedUpdateData.mediaUrl && !safeMedia) {
        return { success: false, message: 'URL de média inválido ou bloqueado por segurança.' };
      }
      sanitizedUpdateData.mediaUrl = safeMedia || '';
    }
    if (Array.isArray(sanitizedUpdateData.mediaUrls)) {
      sanitizedUpdateData.mediaUrls = sanitizedUpdateData.mediaUrls
        .map(u => sanitizeMediaUrl(u))
        .filter((u): u is string => Boolean(u));
    }

    const modificationTimestamp = new Date().toISOString();

    const updatedPost: WorkFeedPost = {
      ...existingPost,
      ...sanitizedUpdateData,
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

    setWorkFeedPosts(prev => {
      const updated = prev.map(p => p.id === postId ? updatedPost : p);
      const sanitized = sanitizeFeedPostsForStorage(updated);
      safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
      return updated;
    });

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
      pendingWriteIdsRef.current.add(newN.id);
      setDoc(doc(db, 'app_notifications', newN.id), newN)
        .then(() => pendingWriteIdsRef.current.delete(newN.id))
        .catch(() => {});
    } catch (e) {}
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (id && !['notif-1', 'notif-cli-1', 'notif-admin-1'].includes(id)) {
      try {
        setDoc(doc(db, 'app_notifications', id), { read: true }, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  };

  const unreadNotificationsCount = notifications.filter(n => {
    if (n.read) return false;
    return isNotificationForUser(n, currentUser);
  }).length;
  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(stripSensitiveFields(currentUser)));
  }, [currentUser]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_cats`, JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_pros`, JSON.stringify(professionals.map(p => stripSensitiveFields(p))));
  }, [professionals]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_reqs`, JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_msgs`, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_revs`, JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_txs`, JSON.stringify(allWalletTransactions));
  }, [allWalletTransactions]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_reports`, JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_audit_logs`, JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(sanitizePlatformSettings(platformSettings)));
  }, [platformSettings]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_is_logged_in`, JSON.stringify(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    safeStorageSet(`${LOCAL_STORAGE_KEY}_users`, JSON.stringify(allUsers.map(u => stripSensitiveFields(u))));
  }, [allUsers]);

  const loginUser = (user: User, role?: UserRole) => {
    const cleanUserInput = stripSensitiveFields(user);
    // Check if account is deleted or blocked
    if (cleanUserInput.isDeleted === true || cleanUserInput.status === 'deleted') {
      console.warn('Tentativa de login em conta desativada/eliminada.');
      return;
    }
    if (cleanUserInput.blocked === true || cleanUserInput.status === 'bloqueado') {
      console.warn('Tentativa de login em conta suspensa.');
      return;
    }

    const finalRole: UserRole = (cleanUserInput.role === 'admin') 
      ? 'admin' 
      : (role || (cleanUserInput.accountType === 'profissional' || cleanUserInput.role === 'profissional' ? 'profissional' : 'cliente'));

    let targetUser: User = { ...cleanUserInput, role: finalRole };
    const existingUser = allUsers.find(u => u.id === cleanUserInput.id || (u.email && cleanUserInput.email && u.email.toLowerCase() === cleanUserInput.email.toLowerCase()));
    const existingPro = professionals.find(p => p.id === cleanUserInput.id || (p.email && cleanUserInput.email && p.email.toLowerCase() === cleanUserInput.email.toLowerCase()));

    if (finalRole === 'profissional') {
      if (existingPro) {
        targetUser = stripSensitiveFields({ ...existingPro, role: 'profissional' });
      } else if (existingUser) {
        targetUser = stripSensitiveFields({ ...existingUser, role: 'profissional' });
      }
    } else if (finalRole === 'admin') {
      targetUser = stripSensitiveFields({ ...(existingUser || cleanUserInput), role: 'admin' });
    } else {
      if (existingUser) {
        targetUser = stripSensitiveFields({ ...existingUser, role: 'cliente' });
      } else if (existingPro) {
        targetUser = stripSensitiveFields({ ...existingPro, role: 'cliente' });
      }
    }

    setCurrentUser(targetUser);
    setIsLoggedIn(true);

    setAllUsers(prev => {
      const exists = prev.some(u => u.id === targetUser.id || (u.email && targetUser.email && u.email === targetUser.email));
      if (exists) {
        return prev.map(u => (u.id === targetUser.id || (u.email && targetUser.email && u.email === targetUser.email)) ? stripSensitiveFields({ ...u, ...targetUser }) : u);
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
    signOut(auth).catch(() => {});
    setFirebaseAuthUid(null);
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

  // Firebase Auth listener (zero unverified elevation + automatic non-destructive phone index sync)
  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setFirebaseAuthUid(null);
        setCurrentUser(prev => {
          if (prev.role === 'admin') {
            setIsLoggedIn(false);
            return CLEAN_GUEST_USER;
          }
          return prev;
        });
        return;
      }

      setFirebaseAuthUid(fbUser.uid);

      try {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        const fbEmailLower = (fbUser.email || '').trim().toLowerCase();
        const isSuperAdminEmail = Boolean(fbUser.emailVerified && fbEmailLower === OFFICIAL_ADMIN_EMAIL);
        let isAdminDoc = false;
        if (!isSuperAdminEmail) {
          const [adminDoc, adminPtDoc] = await Promise.allSettled([
            getDoc(doc(db, 'admins', fbUser.uid)),
            getDoc(doc(db, 'administradores', fbUser.uid))
          ]);
          isAdminDoc =
            (adminDoc.status === 'fulfilled' && adminDoc.value.exists()) ||
            (adminPtDoc.status === 'fulfilled' && adminPtDoc.value.exists());
        }

        const syncPhoneIndexSilently = async (rawPhone?: string | null) => {
          const norm = normalizePhoneNumber(rawPhone);
          if (!norm.isValid || !fbUser.email) return;
          const idxId = await computePhoneIndexId(norm.e164);
          if (!idxId) return;
          const isSynth = isSyntheticPhoneAuthEmail(fbUser.email);
          setDoc(
            doc(db, 'phone_login_index', idxId),
            {
              uid: fbUser.uid,
              authMode: isSynth ? 'phone_synthetic' : 'legacy_email',
              authEmail: fbUser.email.toLowerCase(),
              hasRealEmail: !isSynth,
              updatedAt: new Date().toISOString()
            },
            { merge: true }
          ).catch(() => {});
        };

        if (userDoc.exists()) {
          const rawData = stripSensitiveFields({ id: userDoc.id, ...userDoc.data() } as User);
          const uData: User = {
            ...rawData,
            email: getPublicUserEmail(rawData.email || fbUser.email)
          };
          const isOfficialAdminMatch =
            fbEmailLower === OFFICIAL_ADMIN_EMAIL &&
            (isOfficialAdminPhone(uData.phone) || uData.role === 'admin' || isAdminDoc || isSuperAdminEmail);
          const verifiedAdmin = isSuperAdminEmail || isAdminDoc || uData.role === 'admin' || isOfficialAdminMatch;

          if (uData.isDeleted === true || uData.status === 'deleted') {
            await signOut(auth).catch(() => {});
            setIsLoggedIn(false);
            setCurrentUser(CLEAN_GUEST_USER);
            return;
          }
          if (!isFictitiousOrInvalidUser(uData)) {
            setCurrentUser(prev => {
              const merged = stripSensitiveFields({
                ...prev,
                ...uData,
                role: verifiedAdmin ? 'admin' : uData.role,
                adminSubRole: verifiedAdmin ? (uData.adminSubRole || 'super_admin') : uData.adminSubRole,
                avatar: uData.avatar || prev.avatar || '',
                photoURL: uData.photoURL || uData.avatar || prev.photoURL || prev.avatar || ''
              });
              safeStorageSet(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(merged));
              return merged;
            });
            setIsLoggedIn(true);

            // Silently sync phone_login_index for seamless future phone-only logins
            const phoneForIndex = uData.phone || (verifiedAdmin && fbEmailLower === OFFICIAL_ADMIN_EMAIL ? OFFICIAL_ADMIN_PRIMARY_PHONE_DISPLAY : '');
            if (phoneForIndex) {
              syncPhoneIndexSilently(phoneForIndex);
            }
          }
        } else if (isSuperAdminEmail || isAdminDoc || fbEmailLower === OFFICIAL_ADMIN_EMAIL) {
          const adminUser = stripSensitiveFields({
            ...DEFAULT_ADMIN_USER,
            id: fbUser.uid,
            email: getPublicUserEmail(fbUser.email) || DEFAULT_ADMIN_USER.email,
            phone: OFFICIAL_ADMIN_PRIMARY_PHONE_DISPLAY,
            phoneE164: '+244956011985',
            role: 'admin' as UserRole,
            adminSubRole: 'super_admin' as AdminSubRole
          });
          setCurrentUser(prev => {
            const merged = stripSensitiveFields({ ...prev, ...adminUser });
            safeStorageSet(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(merged));
            return merged;
          });
          setIsLoggedIn(true);
          syncPhoneIndexSilently(OFFICIAL_ADMIN_PRIMARY_PHONE_DISPLAY);
        }
      } catch (authErr) {
        logFirestoreWarning(authErr, OperationType.GET, `users/${fbUser.uid}`);
      }
    });

    return () => {
      authUnsub();
    };
  }, []);

  // Automatic private notification when a professional's 30-day trial or subscription approaches/reaches expiration
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || currentUser.id === 'guest-client') return;
    if (currentUser.role === 'admin' || currentUser.blocked || currentUser.isDeleted) return;
    const isProCapable =
      currentUser.role === 'profissional' ||
      currentUser.accountType === 'profissional' ||
      currentUser.accountType === 'duplo';
    if (!isProCapable) return;

    const planStatus = getProPlanStatus(currentUser);
    if (planStatus.isPromotionalPhase || planStatus.isBlocked) return;

    const uid = currentUser.id;
    const expiryKey = (planStatus.expiresAtIso || 'none').slice(0, 10);

    if (planStatus.isExpired) {
      const notifId = `notif-sub-expired-${uid}-${expiryKey}`;
      const localFlagKey = `jsmart_notified_exp_${uid}_${expiryKey}`;
      const alreadyExists =
        safeStorageGet(localFlagKey) === '1' ||
        notifications.some(n => n.id === notifId);
      if (!alreadyExists) {
        safeStorageSet(localFlagKey, '1');
        const expiredNotif: AppNotification = {
          id: notifId,
          userId: uid,
          targetRoleScope: 'profissional',
          title: planStatus.isTrial
            ? '⏰ O seu período gratuito de 30 dias terminou'
            : '⏰ A sua subscrição profissional expirou',
          message:
            'Os seus dados, publicações e histórico estão preservados. Escolha o plano Semanal (2 semanas — 1.500 Kz), Mensal (1 mês — 3.000 Kz) ou Trimestral (3 meses — 8.000 Kz) e envie o comprovativo para continuar a trabalhar.',
          type: 'plano_expira',
          read: false,
          createdAt: new Date().toISOString()
        };
        pendingWriteIdsRef.current.add(notifId);
        setNotifications(prev => [expiredNotif, ...prev.filter(n => n.id !== notifId)]);
        if (auth.currentUser) {
          setDoc(doc(db, 'app_notifications', notifId), expiredNotif)
            .then(() => pendingWriteIdsRef.current.delete(notifId))
            .catch(() => {});
        }
      }
    } else if (
      planStatus.isTrial &&
      (planStatus.alertStage === '7_days' || planStatus.alertStage === '3_days' || planStatus.alertStage === '24_hours')
    ) {
      const stageNotifId = `notif-trial-${planStatus.alertStage}-${uid}-${expiryKey}`;
      const localStageKey = `jsmart_notified_stage_${planStatus.alertStage}_${uid}_${expiryKey}`;
      const alreadyExists =
        safeStorageGet(localStageKey) === '1' ||
        notifications.some(n => n.id === stageNotifId);
      if (!alreadyExists) {
        safeStorageSet(localStageKey, '1');
        const reminderNotif: AppNotification = {
          id: stageNotifId,
          userId: uid,
          targetRoleScope: 'profissional',
          title: '🔔 Lembrete do Período Experimental (30 Dias Grátis)',
          message: `${planStatus.message} Após o término, poderá renovar com o plano Semanal (1.500 Kz), Mensal (3.000 Kz) ou Trimestral (8.000 Kz).`,
          type: 'trial_aviso',
          read: false,
          createdAt: new Date().toISOString()
        };
        pendingWriteIdsRef.current.add(stageNotifId);
        setNotifications(prev => [reminderNotif, ...prev.filter(n => n.id !== stageNotifId)]);
        if (auth.currentUser) {
          setDoc(doc(db, 'app_notifications', stageNotifId), reminderNotif)
            .then(() => pendingWriteIdsRef.current.delete(stageNotifId))
            .catch(() => {});
        }
      }
    }
  }, [
    isLoggedIn,
    currentUser?.id,
    currentUser?.role,
    currentUser?.accountType,
    currentUser?.trialStartDate,
    currentUser?.trialEndsAt,
    currentUser?.trialDurationDays,
    currentUser?.planExpiresAt,
    currentUser?.subscriptionPlan,
    currentUser?.blocked,
    currentUser?.isDeleted
  ]);

  // Scoped Firestore listeners (only attached once authenticated)
  useEffect(() => {
    if (!firebaseAuthUid) return;

    const unsubscribes: (() => void)[] = [];
    const activeUid = firebaseAuthUid;
    const isAdminUser = currentUser?.role === 'admin';
    const isProCapable = isAdminUser || currentUser?.role === 'profissional' || currentUser?.accountType === 'duplo' || currentUser?.accountType === 'profissional';

    try {
      // 1. Service Requests (Admin: all; Users: own + open opportunities if pro/duplo)
      if (isAdminUser) {
        unsubscribes.push(onSnapshot(collection(db, 'service_requests'), (snapshot) => {
          const fsReqs: ServiceRequest[] = [];
          snapshot.forEach(docSnap => fsReqs.push({ id: docSnap.id, ...docSnap.data() } as ServiceRequest));
          fsReqs.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
          setRequests(prev => {
            const fsIds = new Set(fsReqs.map(r => r.id));
            const localPending = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
            return [...localPending, ...fsReqs];
          });
        }, (err) => logFirestoreWarning(err, OperationType.LIST, 'service_requests')));
      } else {
        const mergeScopedRequests = (incomingList: ServiceRequest[]) => {
          setRequests(prev => {
            const map = new Map<string, ServiceRequest>();
            prev.forEach(r => {
              if (r.clientId === activeUid || r.professionalId === activeUid || pendingWriteIdsRef.current.has(r.id)) {
                map.set(r.id, r);
              }
            });
            incomingList.forEach(r => map.set(r.id, r));
            const merged = Array.from(map.values());
            merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
            return merged;
          });
        };

        unsubscribes.push(onSnapshot(
          query(collection(db, 'service_requests'), where('clientId', '==', activeUid)),
          (snapshot) => {
            const list: ServiceRequest[] = [];
            snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as ServiceRequest));
            mergeScopedRequests(list);
          },
          (err) => logFirestoreWarning(err, OperationType.LIST, 'service_requests')
        ));

        if (isProCapable) {
          unsubscribes.push(onSnapshot(
            query(collection(db, 'service_requests'), where('professionalId', '==', activeUid)),
            (snapshot) => {
              const list: ServiceRequest[] = [];
              snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as ServiceRequest));
              mergeScopedRequests(list);
            },
            (err) => logFirestoreWarning(err, OperationType.LIST, 'service_requests')
          ));

          unsubscribes.push(onSnapshot(
            query(collection(db, 'service_requests'), where('status', 'in', ['pendente', 'novamente_disponivel'])),
            (snapshot) => {
              const list: ServiceRequest[] = [];
              snapshot.forEach(d => list.push({ id: d.id, ...d.data() } as ServiceRequest));
              mergeScopedRequests(list);
            },
            (err) => logFirestoreWarning(err, OperationType.LIST, 'service_requests')
          ));
        }
      }

      // 2. Users (Admin: full collection; Non-admin: own document only)
      if (isAdminUser) {
        unsubscribes.push(onSnapshot(collection(db, 'users'), (snapshot) => {
          if (!snapshot.empty) {
            const fsUsers: User[] = [];
            snapshot.forEach(docSnap => {
              const raw = stripSensitiveFields(docSnap.data());
              const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
              const isBlocked = raw.blocked === true || raw.status === 'bloqueado';
              const uData = stripSensitiveFields({
                id: docSnap.id,
                ...raw,
                avatar: photo,
                photoURL: photo,
                verified: isBlocked ? false : (raw.verified ?? true),
                documentsVerified: isBlocked ? false : (raw.documentsVerified ?? true),
                isAutoApproved: isBlocked ? false : (raw.isAutoApproved ?? true),
                accountType: raw.accountType || (raw.role === 'profissional' ? 'duplo' : 'cliente')
              } as unknown as User);
              if (!isFictitiousOrInvalidUser(uData)) fsUsers.push(uData);
            });
            setAllUsers(prev => {
              const fsIds = new Set(fsUsers.map(u => u.id));
              const existingNonFs = prev.filter(u => !fsIds.has(u.id) && !isFictitiousOrInvalidUser(u) && (!snapshot.metadata.fromCache ? pendingWriteIdsRef.current.has(u.id) : true));
              return [...fsUsers, ...existingNonFs];
            });
          }
        }, (err) => logFirestoreWarning(err, OperationType.LIST, 'users')));
      } else {
        unsubscribes.push(onSnapshot(doc(db, 'users', activeUid), (docSnap) => {
          if (docSnap.exists()) {
            const raw = stripSensitiveFields(docSnap.data());
            const photo = raw.avatar || raw.photoURL || '';
            const isBlocked = raw.blocked === true || raw.status === 'bloqueado';
            const uData = stripSensitiveFields({
              id: docSnap.id,
              ...raw,
              avatar: photo,
              photoURL: photo,
              verified: isBlocked ? false : (raw.verified ?? true)
            } as unknown as User);
            if (!isFictitiousOrInvalidUser(uData)) {
              setAllUsers(prev => {
                const others = prev.filter(u => u.id !== uData.id);
                return [uData, ...others];
              });
              setCurrentUser(prevUser => {
                if (!prevUser || prevUser.id === 'guest-client') return prevUser;
                const preservedRole: UserRole = prevUser.accountType === 'duplo' ? prevUser.role : uData.role;
                const merged = stripSensitiveFields({ ...prevUser, ...uData, role: preservedRole });
                safeStorageSet(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(merged));
                return merged;
              });
            }
          }
        }, (err) => logFirestoreWarning(err, OperationType.GET, `users/${activeUid}`)));
      }

      // 3. Professionals Catalog (Public PII-free directory + full collection only for Admin)
      unsubscribes.push(onSnapshot(collection(db, isAdminUser ? 'professionals' : 'professionals_public'), (snapshot) => {
        if (!snapshot.empty || !snapshot.metadata.fromCache) {
          const fsPros: ProfessionalProfile[] = [];
          snapshot.forEach(docSnap => {
            const raw = stripSensitiveFields(docSnap.data());
            const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
            const isBlocked = raw.blocked === true || raw.status === 'bloqueado';
            const pData = stripSensitiveFields({
              id: docSnap.id,
              ...raw,
              avatar: photo,
              photoURL: photo,
              verified: isBlocked ? false : (raw.verified ?? true),
              documentsVerified: isBlocked ? false : (raw.documentsVerified ?? true),
              isAutoApproved: isBlocked ? false : (raw.isAutoApproved ?? true),
              status: isBlocked ? 'bloqueado' : (raw.status || 'disponivel'),
              accountType: raw.accountType || 'duplo',
              categories: Array.isArray(raw.categories) ? raw.categories : []
            } as unknown as ProfessionalProfile);
            if (!isFictitiousOrInvalidUser(pData) && !pData.isDeleted && pData.status !== 'deleted') {
              fsPros.push(pData);
            }
          });
          setProfessionals(prev => {
            const fsIds = new Set(fsPros.map(p => p.id));
            const existingNonFs = prev.filter(p => !fsIds.has(p.id) && !isFictitiousOrInvalidUser(p) && !p.isDeleted && p.status !== 'deleted' && (!snapshot.metadata.fromCache ? pendingWriteIdsRef.current.has(p.id) : true));
            return [...fsPros, ...existingNonFs];
          });
        }
      }, (err) => logFirestoreWarning(err, OperationType.LIST, isAdminUser ? 'professionals' : 'professionals_public')));

      if (!isAdminUser && isProCapable) {
        unsubscribes.push(onSnapshot(doc(db, 'professionals', activeUid), (docSnap) => {
          if (docSnap.exists()) {
            const raw = stripSensitiveFields(docSnap.data());
            const ownPro = stripSensitiveFields({ id: docSnap.id, ...raw } as ProfessionalProfile);
            setProfessionals(prev => {
              const others = prev.filter(p => p.id !== ownPro.id);
              return [ownPro, ...others];
            });
          }
        }, (err) => logFirestoreWarning(err, OperationType.GET, `professionals/${activeUid}`)));
      }

      // 4. Chat Messages (Strictly scoped by participant UID unless Admin)
      const msgsSource = isAdminUser
        ? collection(db, 'chat_messages')
        : query(collection(db, 'chat_messages'), where('participants', 'array-contains', activeUid));
      unsubscribes.push(onSnapshot(msgsSource, (snapshot) => {
        const fsMsgs: ChatMessage[] = [];
        snapshot.forEach(docSnap => fsMsgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage));
        setMessages(prev => {
          const fsIds = new Set(fsMsgs.map(m => m.id));
          const localUnsaved = prev.filter(m => !fsIds.has(m.id) && (m.status === 'enviando' || pendingWriteIdsRef.current.has(m.id)));
          const merged = [...fsMsgs, ...localUnsaved];
          merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          return merged;
        });
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'chat_messages')));

      // 5. Reviews
      unsubscribes.push(onSnapshot(collection(db, 'reviews'), (snapshot) => {
        if (!snapshot.empty || !snapshot.metadata.fromCache) {
          const fsRevs: Review[] = [];
          snapshot.forEach(docSnap => fsRevs.push({ id: docSnap.id, ...docSnap.data() } as Review));
          setReviews(prev => {
            const fsIds = new Set(fsRevs.map(r => r.id));
            const localOnly = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
            const merged = [...fsRevs, ...localOnly];
            safeStorageSet(`${LOCAL_STORAGE_KEY}_revs`, JSON.stringify(merged));
            return merged;
          });
        }
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'reviews')));

      // 5c. App Notifications (scoped to own UID or broadcast channels)
      const notifsSource = isAdminUser
        ? collection(db, 'app_notifications')
        : query(collection(db, 'app_notifications'), where('userId', 'in', [activeUid, 'all', currentUser?.role === 'profissional' ? 'pro_all' : 'client_all']));
      unsubscribes.push(onSnapshot(notifsSource, (snapshot) => {
        if (!snapshot.empty) {
          const fsNotifs: AppNotification[] = [];
          snapshot.forEach(docSnap => fsNotifs.push({ id: docSnap.id, ...docSnap.data() } as AppNotification));
          setNotifications(prev => {
            const fsIds = new Set(fsNotifs.map(n => n.id));
            const localOnly = prev.filter(n => !fsIds.has(n.id) && (['notif-1', 'notif-cli-1', 'notif-admin-1'].includes(n.id) || pendingWriteIdsRef.current.has(n.id)));
            const merged = [...fsNotifs, ...localOnly];
            merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            safeStorageSet(`${LOCAL_STORAGE_KEY}_notifications`, JSON.stringify(merged));
            return merged;
          });
        }
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'app_notifications')));

      // 5d. Reports (Admin: all; User: own submitted reports)
      const reportsSource = isAdminUser
        ? collection(db, 'reports')
        : query(collection(db, 'reports'), where('reporterId', '==', activeUid));
      unsubscribes.push(onSnapshot(reportsSource, (snapshot) => {
        if (!snapshot.empty || !snapshot.metadata.fromCache) {
          const fsReports: UserReport[] = [];
          snapshot.forEach(docSnap => fsReports.push({ id: docSnap.id, ...docSnap.data() } as UserReport));
          setReports(prev => {
            const fsIds = new Set(fsReports.map(r => r.id));
            const localOnly = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
            const merged = [...fsReports, ...localOnly];
            safeStorageSet(`${LOCAL_STORAGE_KEY}_reports`, JSON.stringify(merged));
            return merged;
          });
        }
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'reports')));

      // 6. Admin Audit Logs (Strictly Admin only)
      if (isAdminUser) {
        unsubscribes.push(onSnapshot(collection(db, 'admin_audit_logs'), (snapshot) => {
          if (!snapshot.empty) {
            const fsLogs: AdminAuditLog[] = [];
            snapshot.forEach(docSnap => fsLogs.push({ id: docSnap.id, ...docSnap.data() } as AdminAuditLog));
            fsLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAuditLogs(fsLogs);
          }
        }, (err) => logFirestoreWarning(err, OperationType.LIST, 'admin_audit_logs')));
      }

      // 7. Platform Settings (sanitized)
      unsubscribes.push(onSnapshot(doc(db, 'platform_settings', 'global_config'), (docSnap) => {
        if (docSnap.exists()) {
          const fsSettings = sanitizePlatformSettings(docSnap.data() as PlatformSettings);
          setPlatformSettings(prev => sanitizePlatformSettings({ ...prev, ...fsSettings }));
        }
      }, (err) => logFirestoreWarning(err, OperationType.GET, 'platform_settings/global_config')));

      // 7b. Code of Conduct
      unsubscribes.push(onSnapshot(doc(db, 'platform_settings', 'code_of_conduct'), (docSnap) => {
        if (docSnap.exists()) {
          const conductData = docSnap.data();
          if (Array.isArray(conductData?.rules) && conductData.rules.length > 0) {
            setCodeOfConductRules(conductData.rules);
          }
        }
      }, (err) => logFirestoreWarning(err, OperationType.GET, 'platform_settings/code_of_conduct')));

      // 8. Work Feed Posts
      unsubscribes.push(onSnapshot(collection(db, 'work_feed_posts'), (snapshot) => {
        if (!snapshot.empty || !snapshot.metadata.fromCache) {
          const fsFeed: WorkFeedPost[] = [];
          snapshot.forEach(docSnap => {
            const pData = { id: docSnap.id, ...docSnap.data() } as WorkFeedPost;
            if (!FICTITIOUS_MOCK_IDS.has(pData.id) && !FICTITIOUS_MOCK_IDS.has(pData.professionalId) && !deletedIdsRef.current.has(pData.id)) {
              fsFeed.push(pData);
            }
          });
          setWorkFeedPosts(prev => {
            const fsIds = new Set(fsFeed.map(f => f.id));
            const existingNonFs = prev.filter(f => !fsIds.has(f.id) && !FICTITIOUS_MOCK_IDS.has(f.id) && !deletedIdsRef.current.has(f.id) && pendingWriteIdsRef.current.has(f.id));
            const merged = [...existingNonFs, ...fsFeed];
            merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            return merged;
          });
        }
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'work_feed_posts')));

      // 9. Categories and Subcategories
      unsubscribes.push(onSnapshot(collection(db, 'categories'), (snapshot) => {
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
              items,
              subcategories: items,
              imageUrl: data.imageUrl || '',
              isActive: data.isActive !== false,
              ownerId: data.ownerId || '',
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString()
            });
          });
          setCategories(() => {
            const fsMap = new Map(fsCats.map(c => [c.id, c]));
            const merged = [...fsCats];
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
      }, (err) => logFirestoreWarning(err, OperationType.LIST, 'categories')));
    } catch (err) {
      logFirestoreWarning(err, OperationType.LIST, 'firestore_init');
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [firebaseAuthUid, currentUser?.id, currentUser?.role, currentUser?.accountType]);

  // Force Full Sync with Firestore (Strictly Scoped by Verified Firebase Auth UID & Role)
  const forceSyncWithFirestore = async (): Promise<{ success: boolean; message: string }> => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      return { success: false, message: 'Sem ligação à Internet. Os dados locais continuam disponíveis.' };
    }

    const fbUid = auth.currentUser?.uid || firebaseAuthUid;
    if (!fbUid) {
      setSyncStatus('idle');
      return { success: false, message: 'Inicie sessão para sincronizar dados na nuvem.' };
    }

    const isAdminUser = currentUser?.role === 'admin';
    const isProCapable = isAdminUser || currentUser?.role === 'profissional' || currentUser?.accountType === 'duplo' || currentUser?.accountType === 'profissional';

    setSyncStatus('syncing');

    try {
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 7000)
      );

      const syncTask = async () => {
        const syncCategoriesTask = async () => {
          try {
            const catSnap = await getDocs(collection(db, 'categories'));
            if (!catSnap.empty) {
              const fsCats: ServiceCategory[] = [];
              catSnap.forEach(d => {
                const data = d.data();
                const items = data.items || data.subcategories || [];
                fsCats.push({
                  id: d.id,
                  name: data.name || d.id,
                  iconName: data.iconName || 'Briefcase',
                  description: data.description || '',
                  popularCount: data.popularCount ?? 100,
                  color: data.color || 'emerald',
                  group: data.group || 'Casa & Manutenção',
                  items,
                  subcategories: items,
                  imageUrl: data.imageUrl || '',
                  isActive: data.isActive !== false,
                  ownerId: data.ownerId || '',
                  createdAt: data.createdAt || new Date().toISOString(),
                  updatedAt: data.updatedAt || new Date().toISOString()
                });
              });
              setCategories(() => {
                const fsMap = new Map(fsCats.map(c => [c.id, c]));
                const merged = [...fsCats];
                CATEGORIES.forEach(defaultCat => {
                  if (!fsMap.has(defaultCat.id)) {
                    merged.push({ ...defaultCat, isActive: defaultCat.isActive !== false, subcategories: defaultCat.items || [] });
                  }
                });
                return merged;
              });
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'categories');
          }
        };

        const syncUsersTask = async () => {
          try {
            if (isAdminUser) {
              const usersSnap = await getDocs(collection(db, 'users'));
              if (!usersSnap.empty) {
                const fsUsers: User[] = [];
                usersSnap.forEach(d => {
                  const raw = stripSensitiveFields(d.data());
                  const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
                  const isBlocked = raw.blocked === true || raw.status === 'bloqueado';
                  const uData = stripSensitiveFields({
                    id: d.id,
                    ...raw,
                    avatar: photo,
                    photoURL: photo,
                    verified: isBlocked ? false : (raw.verified ?? true),
                    documentsVerified: isBlocked ? false : (raw.documentsVerified ?? true),
                    isAutoApproved: isBlocked ? false : (raw.isAutoApproved ?? true),
                    accountType: raw.accountType || (raw.role === 'profissional' ? 'duplo' : 'cliente')
                  } as unknown as User);
                  if (!isFictitiousOrInvalidUser(uData)) fsUsers.push(uData);
                });
                setAllUsers(prev => {
                  const fsIds = new Set(fsUsers.map(u => u.id));
                  const existingNonFs = prev.filter(u => !fsIds.has(u.id) && !isFictitiousOrInvalidUser(u) && pendingWriteIdsRef.current.has(u.id));
                  return [...fsUsers, ...existingNonFs];
                });
              }
            } else {
              const ownUserSnap = await getDoc(doc(db, 'users', fbUid));
              if (ownUserSnap.exists()) {
                const raw = stripSensitiveFields(ownUserSnap.data());
                const uData = stripSensitiveFields({ id: ownUserSnap.id, ...raw } as User);
                if (!isFictitiousOrInvalidUser(uData)) {
                  setAllUsers(prev => [uData, ...prev.filter(u => u.id !== uData.id)]);
                }
              }
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'users');
          }
        };

        const syncProfessionalsTask = async () => {
          try {
            const prosSnap = await getDocs(collection(db, isAdminUser ? 'professionals' : 'professionals_public'));
            if (!prosSnap.empty) {
              const fsPros: ProfessionalProfile[] = [];
              prosSnap.forEach(d => {
                const raw = stripSensitiveFields(d.data());
                const photo = raw.avatar || raw.photoURL || raw.profilePhoto || raw.profileImage || '';
                const isBlocked = raw.blocked === true || raw.status === 'bloqueado';
                const pData = stripSensitiveFields({
                  id: d.id,
                  ...raw,
                  avatar: photo,
                  photoURL: photo,
                  verified: isBlocked ? false : (raw.verified ?? true),
                  documentsVerified: isBlocked ? false : (raw.documentsVerified ?? true),
                  isAutoApproved: isBlocked ? false : (raw.isAutoApproved ?? true),
                  status: isBlocked ? 'bloqueado' : (raw.status || 'disponivel'),
                  accountType: raw.accountType || 'duplo',
                  categories: Array.isArray(raw.categories) ? raw.categories : []
                } as unknown as ProfessionalProfile);
                if (!isFictitiousOrInvalidUser(pData) && !pData.isDeleted && pData.status !== 'deleted') {
                  fsPros.push(pData);
                }
              });
              setProfessionals(prev => {
                const fsIds = new Set(fsPros.map(p => p.id));
                const existingNonFs = prev.filter(p => !fsIds.has(p.id) && !isFictitiousOrInvalidUser(p) && !p.isDeleted && p.status !== 'deleted' && pendingWriteIdsRef.current.has(p.id));
                return [...fsPros, ...existingNonFs];
              });
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, isAdminUser ? 'professionals' : 'professionals_public');
          }
        };

        const syncFeedTask = async () => {
          try {
            const feedSnap = await getDocs(collection(db, 'work_feed_posts'));
            const fsFeed: WorkFeedPost[] = [];
            feedSnap.forEach(d => {
              const pData = { id: d.id, ...d.data() } as WorkFeedPost;
              if (!FICTITIOUS_MOCK_IDS.has(pData.id) && !FICTITIOUS_MOCK_IDS.has(pData.professionalId) && !deletedIdsRef.current.has(pData.id)) {
                fsFeed.push(pData);
              }
            });
            setWorkFeedPosts(prev => {
              const fsIds = new Set(fsFeed.map(f => f.id));
              const existingNonFs = prev.filter(f => !fsIds.has(f.id) && !FICTITIOUS_MOCK_IDS.has(f.id) && !deletedIdsRef.current.has(f.id) && pendingWriteIdsRef.current.has(f.id));
              const merged = [...existingNonFs, ...fsFeed];
              merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
              const sanitized = sanitizeFeedPostsForStorage(merged);
              safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'work_feed_posts');
          }
        };

        const syncRequestsTask = async () => {
          try {
            const fsMap = new Map<string, ServiceRequest>();
            if (isAdminUser) {
              const reqSnap = await getDocs(collection(db, 'service_requests'));
              reqSnap.forEach(d => fsMap.set(d.id, { id: d.id, ...d.data() } as ServiceRequest));
            } else {
              const queries = [getDocs(query(collection(db, 'service_requests'), where('clientId', '==', fbUid)))];
              if (isProCapable) {
                queries.push(getDocs(query(collection(db, 'service_requests'), where('professionalId', '==', fbUid))));
                queries.push(getDocs(query(collection(db, 'service_requests'), where('status', 'in', ['pendente', 'novamente_disponivel']))));
              }
              const snaps = await Promise.all(queries);
              snaps.forEach(snap => snap.forEach(d => fsMap.set(d.id, { id: d.id, ...d.data() } as ServiceRequest)));
            }
            const fsReqs = Array.from(fsMap.values());
            fsReqs.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
            setRequests(prev => {
              const fsIds = new Set(fsReqs.map(r => r.id));
              const localPending = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
              const merged = [...localPending, ...fsReqs];
              safeStorageSet(`${LOCAL_STORAGE_KEY}_reqs`, JSON.stringify(merged));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'service_requests');
          }
        };

        const syncChatMessagesTask = async () => {
          try {
            const q = isAdminUser
              ? collection(db, 'chat_messages')
              : query(collection(db, 'chat_messages'), where('participants', 'array-contains', fbUid));
            const msgsSnap = await getDocs(q);
            const fsMsgs: ChatMessage[] = [];
            msgsSnap.forEach(d => fsMsgs.push({ id: d.id, ...d.data() } as ChatMessage));
            setMessages(prev => {
              const fsIds = new Set(fsMsgs.map(m => m.id));
              const localUnsaved = prev.filter(m => !fsIds.has(m.id) && (m.status === 'enviando' || pendingWriteIdsRef.current.has(m.id)));
              const merged = [...fsMsgs, ...localUnsaved];
              merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
              safeStorageSet(`${LOCAL_STORAGE_KEY}_msgs`, JSON.stringify(merged));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'chat_messages');
          }
        };

        const syncReviewsTask = async () => {
          try {
            const revsSnap = await getDocs(collection(db, 'reviews'));
            const fsRevs: Review[] = [];
            revsSnap.forEach(d => fsRevs.push({ id: d.id, ...d.data() } as Review));
            setReviews(prev => {
              const fsIds = new Set(fsRevs.map(r => r.id));
              const localOnly = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
              const merged = [...fsRevs, ...localOnly];
              safeStorageSet(`${LOCAL_STORAGE_KEY}_revs`, JSON.stringify(merged));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'reviews');
          }
        };

        const syncWalletTransactionsTask = async () => {
          try {
            const txsRefOrQuery = isAdminUser
              ? collection(db, 'wallet_transactions')
              : query(collection(db, 'wallet_transactions'), where('userId', '==', fbUid));
            const txsSnap = await getDocs(txsRefOrQuery);
            const fsTxs: WalletTransaction[] = [];
            txsSnap.forEach(d => {
              const data = d.data() as WalletTransaction;
              if (!FICTITIOUS_MOCK_IDS.has(data.userId)) fsTxs.push({ id: d.id, ...data });
            });
            setAllWalletTransactions(prev => {
              const fsIds = new Set(fsTxs.map(t => t.id));
              const localPending = prev.filter(t => !fsIds.has(t.id) && pendingWriteIdsRef.current.has(t.id));
              const merged = [...fsTxs, ...localPending];
              merged.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
              safeStorageSet(`${LOCAL_STORAGE_KEY}_txs`, JSON.stringify(merged));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'wallet_transactions');
          }
        };

        const syncNotificationsTask = async () => {
          try {
            const q = isAdminUser
              ? collection(db, 'app_notifications')
              : query(collection(db, 'app_notifications'), where('userId', 'in', [fbUid, 'all', currentUser?.role === 'profissional' ? 'pro_all' : 'client_all']));
            const notifsSnap = await getDocs(q);
            if (!notifsSnap.empty) {
              const fsNotifs: AppNotification[] = [];
              notifsSnap.forEach(d => fsNotifs.push({ id: d.id, ...d.data() } as AppNotification));
              setNotifications(prev => {
                const fsIds = new Set(fsNotifs.map(n => n.id));
                const localOnly = prev.filter(n => !fsIds.has(n.id) && (['notif-1', 'notif-cli-1', 'notif-admin-1'].includes(n.id) || pendingWriteIdsRef.current.has(n.id)));
                const merged = [...fsNotifs, ...localOnly];
                merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                safeStorageSet(`${LOCAL_STORAGE_KEY}_notifications`, JSON.stringify(merged));
                return merged;
              });
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'app_notifications');
          }
        };

        const syncReportsTask = async () => {
          try {
            const q = isAdminUser
              ? collection(db, 'reports')
              : query(collection(db, 'reports'), where('reporterId', '==', fbUid));
            const reportsSnap = await getDocs(q);
            const fsReports: UserReport[] = [];
            reportsSnap.forEach(d => fsReports.push({ id: d.id, ...d.data() } as UserReport));
            setReports(prev => {
              const fsIds = new Set(fsReports.map(r => r.id));
              const localOnly = prev.filter(r => !fsIds.has(r.id) && pendingWriteIdsRef.current.has(r.id));
              const merged = [...fsReports, ...localOnly];
              safeStorageSet(`${LOCAL_STORAGE_KEY}_reports`, JSON.stringify(merged));
              return merged;
            });
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'reports');
          }
        };

        const syncAuditLogsTask = async () => {
          if (!isAdminUser) return;
          try {
            const logsSnap = await getDocs(collection(db, 'admin_audit_logs'));
            if (!logsSnap.empty) {
              const fsLogs: AdminAuditLog[] = [];
              logsSnap.forEach(d => fsLogs.push({ id: d.id, ...d.data() } as AdminAuditLog));
              fsLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              setAuditLogs(fsLogs);
              safeStorageSet(`${LOCAL_STORAGE_KEY}_audit_logs`, JSON.stringify(fsLogs));
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.LIST, 'admin_audit_logs');
          }
        };

        const syncPlatformSettingsTask = async () => {
          try {
            const settingsSnap = await getDoc(doc(db, 'platform_settings', 'global_config'));
            if (settingsSnap.exists()) {
              const fsSettings = sanitizePlatformSettings(settingsSnap.data() as PlatformSettings);
              setPlatformSettings(prev => {
                const merged = sanitizePlatformSettings({ ...prev, ...fsSettings });
                safeStorageSet(`${LOCAL_STORAGE_KEY}_settings`, JSON.stringify(merged));
                return merged;
              });
            }
            const conductSnap = await getDoc(doc(db, 'platform_settings', 'code_of_conduct'));
            if (conductSnap.exists()) {
              const conductData = conductSnap.data();
              if (Array.isArray(conductData?.rules) && conductData.rules.length > 0) {
                setCodeOfConductRules(conductData.rules);
                safeStorageSet(`${LOCAL_STORAGE_KEY}_code_of_conduct`, JSON.stringify(conductData.rules));
              }
            }
          } catch (e) {
            logFirestoreWarning(e, OperationType.GET, 'platform_settings');
          }
        };

        await Promise.allSettled([
          syncCategoriesTask(),
          syncUsersTask(),
          syncProfessionalsTask(),
          syncFeedTask(),
          syncRequestsTask(),
          syncChatMessagesTask(),
          syncReviewsTask(),
          syncWalletTransactionsTask(),
          syncNotificationsTask(),
          syncReportsTask(),
          syncAuditLogsTask(),
          syncPlatformSettingsTask()
        ]);

        return { timeout: false };
      };

      const result = await Promise.race([syncTask(), timeoutPromise]);

      setLastSyncTimestamp(new Date().toISOString());
      setSyncStatus('synced');

      if ((result as any)?.timeout) {
        return { success: true, message: 'Dados sincronizados parcialmente (tempo limite preventivo).' };
      }

      return { success: true, message: 'Plataforma e base de dados sincronizadas com sucesso!' };
    } catch (err: any) {
      logFirestoreWarning(err, OperationType.LIST, 'forceSync');
      setSyncStatus('error');
      return { success: false, message: 'Não foi possível concluir a sincronização. A utilizar cache local segura.' };
    }
  };

  // Fast & dedicated Work Feed refresh: queries ONLY work_feed_posts with safety timeout
  const refreshWorkFeed = async (): Promise<{ success: boolean; message: string }> => {
    if (!navigator.onLine) {
      return { success: false, message: 'Sem ligação à Internet. Publicações em cache local mantidas.' };
    }
    if (!auth.currentUser && !firebaseAuthUid) {
      return { success: true, message: 'Feed local carregado. Inicie sessão para atualizar em tempo real.' };
    }

    try {
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 3500)
      );

      const fetchTask = async () => {
        const feedSnap = await getDocs(collection(db, 'work_feed_posts'));
        const fsFeed: WorkFeedPost[] = [];
        feedSnap.forEach(d => {
          const pData = { id: d.id, ...d.data() } as WorkFeedPost;
          if (!FICTITIOUS_MOCK_IDS.has(pData.id) && !FICTITIOUS_MOCK_IDS.has(pData.professionalId) && !deletedIdsRef.current.has(pData.id)) {
            fsFeed.push(pData);
          }
        });
        setWorkFeedPosts(prev => {
          const fsIds = new Set(fsFeed.map(f => f.id));
          const existingNonFs = prev.filter(f => !fsIds.has(f.id) && !FICTITIOUS_MOCK_IDS.has(f.id) && !deletedIdsRef.current.has(f.id) && pendingWriteIdsRef.current.has(f.id));
          const merged = [...existingNonFs, ...fsFeed];
          merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          const sanitized = sanitizeFeedPostsForStorage(merged);
          safeStorageSet(`${LOCAL_STORAGE_KEY}_feed_posts`, JSON.stringify(sanitized));
          return merged;
        });
        return { timeout: false, count: fsFeed.length };
      };

      const result = await Promise.race([fetchTask(), timeoutPromise]);
      if ((result as any)?.timeout) {
        return { success: true, message: 'Feed atualizado (resposta rápida da cache local).' };
      }
      return { success: true, message: 'Feed de trabalhos atualizado em tempo real!' };
    } catch (err: any) {
      logFirestoreWarning(err, OperationType.LIST, 'work_feed_posts');
      return { success: false, message: 'Não foi possível ligar ao servidor. Publicações locais mantidas.' };
    }
  };

  forceSyncRef.current = forceSyncWithFirestore;

  // Reconnect and sync automatically when tab gains focus or visibility returns (with 60s cooldown)
  useEffect(() => {
    let lastFocusSync = 0;
    const handleVisibilityOrFocus = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible' && navigator.onLine && (now - lastFocusSync > 60000)) {
        lastFocusSync = now;
        forceSyncRef.current?.();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Real-time Firestore sync for Wallet Transactions (Strictly scoped: Admin sees all, Authenticated users see only their own)
  useEffect(() => {
    if (!firebaseAuthUid || !currentUser || !currentUser.id || currentUser.id === 'guest-client') return;

    const txsQuery = currentUser.role === 'admin'
      ? collection(db, 'wallet_transactions')
      : query(collection(db, 'wallet_transactions'), where('userId', '==', firebaseAuthUid));

    const unsubscribe = onSnapshot(txsQuery, (snapshot) => {
      const fsTxs: WalletTransaction[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as WalletTransaction;
        if (!FICTITIOUS_MOCK_IDS.has(data.userId)) {
          fsTxs.push({ id: docSnap.id, ...data });
        }
      });

      setAllWalletTransactions(prev => {
        let merged: WalletTransaction[];
        if (currentUser.role === 'admin') {
          const fsIds = new Set(fsTxs.map(t => t.id));
          const existingNonFs = prev.filter(t => !fsIds.has(t.id) && pendingWriteIdsRef.current.has(t.id));
          merged = [...fsTxs, ...existingNonFs];
        } else {
          const fsIds = new Set(fsTxs.map(t => t.id));
          const ownPending = prev.filter(t => t.userId === firebaseAuthUid && !fsIds.has(t.id) && pendingWriteIdsRef.current.has(t.id));
          merged = [...fsTxs, ...ownPending];
        }
        merged.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime());
        safeStorageSet(`${LOCAL_STORAGE_KEY}_txs`, JSON.stringify(merged));
        return merged;
      });
    }, (err) => {
      logFirestoreWarning(err, OperationType.LIST, 'wallet_transactions');
    });

    return () => {
      unsubscribe();
    };
  }, [firebaseAuthUid, currentUser?.id, currentUser?.role]);

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

  // Switch role helper (Strictly constrained by verified accountType / admin privilege)
  const switchRole = (role: UserRole) => {
    if (role === 'cliente') {
      if (currentUser.role === 'admin') {
        console.warn('Sessão administrativa não alterna para cliente.');
        return;
      }
      setCurrentUser(prev => stripSensitiveFields({
        ...prev,
        role: 'cliente'
      }));
      setActiveTab('home');
    } else if (role === 'profissional') {
      const canSwitchPro = currentUser.accountType === 'duplo' || currentUser.accountType === 'profissional' || currentUser.role === 'admin';
      if (!canSwitchPro) {
        console.warn('Operação bloqueada: Apenas contas Duplas ou Profissionais podem alternar para o Modo Profissional.');
        return;
      }
      const proUser = professionals.find(p => p.id === currentUser.id || (p.email && p.email === currentUser.email));
      if (proUser) {
        setCurrentUser(stripSensitiveFields({
          ...proUser,
          role: 'profissional',
          accountType: currentUser.accountType === 'duplo' ? 'duplo' : (proUser.accountType || 'profissional')
        }));
      } else {
        const newPro: ProfessionalProfile = stripSensitiveFields({
          ...currentUser,
          role: 'profissional',
          accountType: currentUser.accountType || 'duplo',
          categories: (currentUser as any).categories && Array.isArray((currentUser as any).categories) ? (currentUser as any).categories : [],
          bio: 'Profissional qualificado em prestação de serviços.',
          experienceYears: (currentUser as any).experienceYears || 0,
          hourlyRateKz: 15000,
          rating: 5.0,
          reviewCount: 0,
          completedJobs: 0,
          status: 'disponivel',
          verified: true,
          documentsVerified: true,
          address: currentUser.address || `${currentUser.province || 'Luanda'}, Angola`,
          documentType: 'Bilhete de Identidade',
          documentNumber: currentUser.documentNumber || '',
          portfolioImages: []
        });
        setCurrentUser(newPro);
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === newPro.id || p.email === newPro.email);
          if (exists) return prev.map(p => (p.id === newPro.id || p.email === newPro.email) ? { ...p, ...newPro } : p);
          return [newPro, ...prev];
        });
        if (!isFictitiousOrInvalidUser(newPro) && auth.currentUser) {
          pendingWriteIdsRef.current.add(newPro.id);
          setDoc(doc(db, 'professionals', newPro.id), stripSensitiveFields(newPro), { merge: true }).catch(() => {});
          setDoc(doc(db, 'professionals_public', newPro.id), toPublicProData(newPro), { merge: true })
            .then(() => pendingWriteIdsRef.current.delete(newPro.id))
            .catch(() => {});
        }
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

  // Request Exclusivity, State Machine & Control Validators (Regra de Exclusividade J Smart Services)
  const canPerformRequestAction = (
    action: 'aceitar' | 'em_negociacao' | 'em_progresso' | 'concluir' | 'novamente_disponivel' | 'cancelar',
    req: ServiceRequest | undefined,
    user = currentUser,
    activeRole = currentUser.role
  ): { allowed: boolean; reason: string } => {
    if (!req) {
      return { allowed: false, reason: 'Pedido de serviço não encontrado.' };
    }

    // 0. Administrador tem controle e acesso total para auditoria, mediação e suporte
    if (activeRole === 'admin' || user.role === 'admin') {
      return { allowed: true, reason: 'Ação administrativa autorizada.' };
    }

    const isClientOwner = req.clientId === user.id;
    const isAssignedPro = !!req.professionalId && req.professionalId === user.id;
    const isOtherPro = !!req.professionalId && req.professionalId !== user.id;

    // 1. REGRA: ACEITAR PEDIDO
    if (action === 'aceitar') {
      if (activeRole !== 'profissional' && user.role !== 'profissional') {
        return { allowed: false, reason: 'Apenas profissionais podem aceitar pedidos de serviços.' };
      }
      if (isClientOwner) {
        return { allowed: false, reason: 'Não é possível aceitar o seu próprio pedido de serviço.' };
      }
      if (req.status !== 'pendente' && req.status !== 'novamente_disponivel') {
        if (req.status === 'cancelado') {
          return { allowed: false, reason: 'Este pedido foi cancelado e não pode ser aceite.' };
        }
        if (req.status === 'concluido') {
          return { allowed: false, reason: 'Este pedido já foi concluído.' };
        }
        return { allowed: false, reason: 'Este pedido já foi aceite por outro profissional.' };
      }
      if (isOtherPro) {
        return { allowed: false, reason: 'Este pedido já foi aceite por outro profissional.' };
      }
      return { allowed: true, reason: 'Pedido disponível para aceitação.' };
    }

    // 2. REGRA: EM NEGOCIAÇÃO
    if (action === 'em_negociacao') {
      if (req.status === 'pendente' || req.status === 'novamente_disponivel') {
        return { allowed: false, reason: 'O pedido precisa primeiro ser aceite por um profissional antes de iniciar a negociação.' };
      }
      if (req.status === 'concluido' || req.status === 'cancelado') {
        return { allowed: false, reason: `Não é possível negociar um pedido com estado "${req.status}".` };
      }
      if (!isAssignedPro && !isClientOwner) {
        return { allowed: false, reason: 'Apenas o cliente e o profissional atribuído podem negociar os detalhes do pedido.' };
      }
      return { allowed: true, reason: 'Negociação autorizada.' };
    }

    // 3. REGRA: INICIAR TRABALHO (EM PROGRESSO)
    if (action === 'em_progresso') {
      if (req.status === 'pendente' || req.status === 'novamente_disponivel') {
        return { allowed: false, reason: 'O pedido precisa primeiro ser aceite por um profissional antes de iniciar o trabalho.' };
      }
      if (req.status === 'concluido' || req.status === 'cancelado') {
        return { allowed: false, reason: `Não é possível iniciar o trabalho de um pedido com estado "${req.status}".` };
      }
      if (!isAssignedPro) {
        return { allowed: false, reason: 'Apenas o profissional que aceitou o pedido pode iniciar o trabalho.' };
      }
      return { allowed: true, reason: 'Início de trabalho autorizado.' };
    }

    // 4. REGRA: CONCLUIR PEDIDO
    if (action === 'concluir') {
      if (req.status === 'pendente' || req.status === 'novamente_disponivel') {
        return { allowed: false, reason: 'Um pedido pendente ou sem profissional atribuído não pode ser concluído. É necessário primeiro aceitar o pedido.' };
      }
      if (req.status === 'cancelado') {
        return { allowed: false, reason: 'Não é possível concluir um pedido que foi cancelado.' };
      }
      if (req.status === 'concluido') {
        return { allowed: false, reason: 'Este pedido já se encontra concluído.' };
      }
      if (!isAssignedPro && !isClientOwner) {
        return { allowed: false, reason: 'Ninguém pode marcar como concluído um pedido que não lhe pertence. Apenas o profissional atribuído ou o cliente criador podem fazê-lo.' };
      }
      return { allowed: true, reason: 'Conclusão autorizada.' };
    }

    // 5. REGRA: ENCERRAR ATENDIMENTO SEM ACORDO / LIBERAR PEDIDO (NOVAMENTE DISPONÍVEL)
    if (action === 'novamente_disponivel') {
      if (req.status === 'pendente' || req.status === 'novamente_disponivel') {
        return { allowed: false, reason: 'O pedido já se encontra disponível para os profissionais.' };
      }
      if (req.status === 'concluido' || req.status === 'cancelado') {
        return { allowed: false, reason: 'Não é possível reabrir um pedido que já foi concluído ou cancelado.' };
      }
      if (!isAssignedPro && !isClientOwner) {
        return { allowed: false, reason: 'Apenas o cliente e o profissional em atendimento podem encerrar o atendimento sem acordo.' };
      }
      return { allowed: true, reason: 'Reabertura do pedido autorizada.' };
    }

    // 6. REGRA: CANCELAR PEDIDO
    if (action === 'cancelar') {
      if (req.status === 'concluido') {
        return { allowed: false, reason: 'Não é possível cancelar um pedido que já foi concluído.' };
      }
      if (req.status === 'cancelado') {
        return { allowed: false, reason: 'Este pedido já se encontra cancelado.' };
      }
      if (!isClientOwner && !isAssignedPro) {
        return { allowed: false, reason: 'Apenas o cliente proprietário do pedido pode cancelar o pedido.' };
      }
      return { allowed: true, reason: 'Cancelamento autorizado.' };
    }

    return { allowed: false, reason: 'Ação não permitida para o estado atual do pedido.' };
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

    // 0. Administrador tem acesso irrestrito para auditoria, mediação e suporte
    if (activeRole === 'admin' || currentUser.role === 'admin') {
      return { allowed: true, reason: 'Acesso Administrativo Autorizado.' };
    }

    // 1. Participant check: User must be either client or professional of this request
    const isClientOfReq = req.clientId === userId;
    const isProOfReq = req.professionalId === userId;

    if (!isClientOfReq && !isProOfReq) {
      return { allowed: false, reason: 'Acesso negado: O chat é privado exclusivamente entre o cliente e o profissional que aceitou o pedido.' };
    }

    // 2. Prevent self-chat
    if (isClientOfReq && isProOfReq) {
      return { allowed: false, reason: 'Não é possível trocar mensagens num pedido enviado a si próprio.' };
    }

    // 3. Active Mode / Role validation & Professional Subscription Expiration check:
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
    if (req.status === 'pendente' || req.status === 'novamente_disponivel') {
      return { allowed: false, reason: 'O chat de mensagens está bloqueado até um profissional aceitar o pedido de serviço.' };
    }

    if (req.status === 'cancelado') {
      return { allowed: false, reason: 'Este pedido foi cancelado. A comunicação foi permanentemente encerrada.' };
    }

    return { allowed: true, reason: 'Comunicação autorizada.' };
  };

  // Aceitar Pedido com Controle de Exclusividade e Proteção Atômica de Concorrência
  const acceptServiceRequest = async (requestId: string): Promise<{ success: boolean; message: string }> => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) {
      return { success: false, message: 'Pedido de serviço não encontrado.' };
    }

    // 1. Validação de permissões de aceitação
    const actionCheck = canPerformRequestAction('aceitar', targetReq, currentUser, currentUser.role);
    if (!actionCheck.allowed && currentUser.role !== 'admin') {
      console.warn('[ACEITAR PEDIDO BLOQUEADO]:', actionCheck.reason);
      return { success: false, message: actionCheck.reason };
    }

    // 2. Validação de plano profissional ativo
    if (currentUser.role === 'profissional') {
      const validation = validateProAction(currentUser);
      if (!validation.allowed) {
        if (validation.reason === 'blocked') {
          return { success: false, message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte.' };
        }
        triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano.');
        return { success: false, message: 'Plano profissional expirado.' };
      }
    }

    const updatedProId = currentUser.role === 'profissional' ? currentUser.id : (targetReq.professionalId || currentUser.id);
    const updatedProName = currentUser.role === 'profissional' ? currentUser.name : (targetReq.professionalName || currentUser.name);
    const updatedProAvatar = currentUser.role === 'profissional' ? currentUser.avatar : (targetReq.professionalAvatar || currentUser.avatar);

    // 3. Verificação de conflito de horário
    const proAcceptedReqs = requests.filter(r => 
      r.id !== requestId && 
      r.professionalId === updatedProId && 
      (r.status === 'aceito' || r.status === 'em_negociacao' || r.status === 'em_progresso')
    );

    const conflictCheck = checkScheduleConflict(targetReq, proAcceptedReqs);
    if (conflictCheck.hasConflict) {
      return { success: false, message: conflictCheck.message };
    }

    // 4. Proteção contra Race Conditions no Servidor (Firestore Transaction)
    const updatedDocData: Partial<ServiceRequest> = {
      status: 'aceito',
      isReopened: false,
      acceptedAt: new Date().toISOString(),
      professionalId: updatedProId,
      professionalName: updatedProName,
      professionalAvatar: updatedProAvatar || '',
      commissionAmountKz: 0,
      netProAmountKz: targetReq.budgetKz,
      updatedAt: new Date().toISOString()
    };

    try {
      const reqDocRef = doc(db, 'service_requests', requestId);
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(reqDocRef);
        if (snap.exists()) {
          const fresh = snap.data() as ServiceRequest;
          if (fresh.status !== 'pendente' && fresh.status !== 'novamente_disponivel' && currentUser.role !== 'admin') {
            throw new Error('ALREADY_ACCEPTED');
          }
          if (fresh.professionalId && fresh.professionalId !== updatedProId && currentUser.role !== 'admin') {
            throw new Error('ALREADY_ACCEPTED');
          }
          transaction.update(reqDocRef, updatedDocData);
        } else {
          transaction.set(reqDocRef, updatedDocData, { merge: true });
        }
      });
    } catch (err: any) {
      const errMsg = err?.message || err?.toString() || '';
      if (errMsg.includes('ALREADY_ACCEPTED')) {
        return { success: false, message: 'Este pedido já foi aceite por outro profissional.' };
      }
      logFirestoreWarning(err, OperationType.WRITE, `service_requests/${requestId}`);
    }

    // 5. Atualizar estado local
    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          ...updatedDocData
        };
      }
      return req;
    }));

    // 6. Notificar cliente
    addNotification({
      userId: targetReq.clientId,
      targetRoleScope: 'cliente',
      title: '✅ Pedido Aceite',
      message: `O profissional ${updatedProName || ''} aceitou o seu pedido "${targetReq.title}". O chat privado e dados de atendimento estão agora abertos!`,
      type: 'pedido_aceito',
      requestId: targetReq.id
    });

    // 7. Mensagem inicial de acolhimento no chat privado entre cliente e o profissional que aceitou
    const initialChatMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      requestId: targetReq.id,
      senderId: updatedProId,
      senderRole: 'profissional',
      senderName: updatedProName || 'Profissional',
      senderAvatar: updatedProAvatar || '',
      text: `Olá ${targetReq.clientName}! Aceitei o seu pedido "${targetReq.title}". O nosso chat privado está ativo para combinarmos todos os detalhes do serviço.`,
      timestamp: new Date().toISOString(),
      status: 'entregue'
    };
    setMessages(prev => [...prev, initialChatMsg]);

    try {
      setDoc(doc(db, 'service_requests', requestId), updatedDocData, { merge: true }).catch(() => {});
      setDoc(doc(db, 'chat_messages', initialChatMsg.id), initialChatMsg).catch(() => {});
    } catch (e) {}

    return { success: true, message: 'Pedido aceite com sucesso!' };
  };

  // Encerrar Atendimento Sem Acordo -> Pedido Retorna Automaticamente a "Novamente Disponível"
  const releaseServiceRequestWithoutAgreement = async (requestId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) {
      return { success: false, message: 'Pedido não encontrado.' };
    }

    const check = canPerformRequestAction('novamente_disponivel', targetReq, currentUser, currentUser.role);
    if (!check.allowed && currentUser.role !== 'admin') {
      console.warn('[LIBERTAR PEDIDO BLOQUEADO]:', check.reason);
      return { success: false, message: check.reason };
    }

    const updatedDocData: Partial<ServiceRequest> = {
      status: 'novamente_disponivel',
      isReopened: true,
      reopenedAt: new Date().toISOString(),
      previousProId: targetReq.professionalId || '',
      previousProName: targetReq.professionalName || '',
      cancellationReason: reason || 'Atendimento encerrado sem acordo entre cliente e profissional.',
      professionalId: null as any,
      professionalName: null as any,
      professionalAvatar: null as any,
      updatedAt: new Date().toISOString()
    };

    setRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          ...updatedDocData,
          professionalId: undefined,
          professionalName: undefined,
          professionalAvatar: undefined
        };
      }
      return req;
    }));

    // Notificar cliente ou profissional de acordo com quem encerrou
    if (currentUser.id === targetReq.clientId && targetReq.professionalId) {
      addNotification({
        userId: targetReq.professionalId,
        targetRoleScope: 'profissional',
        title: '🟡 Atendimento Encerrado pelo Cliente',
        message: `O cliente encerrou o atendimento do pedido "${targetReq.title}" sem acordo.${reason ? ` Motivo: ${reason}` : ''}`,
        type: 'comunicado_jsmart',
        requestId: targetReq.id
      });
    } else {
      addNotification({
        userId: targetReq.clientId,
        targetRoleScope: 'cliente',
        title: '🟡 Pedido Novamente Disponível',
        message: `O atendimento anterior para o pedido "${targetReq.title}" foi encerrado sem acordo. O seu pedido voltou a ficar automaticamente disponível para outros profissionais qualificados aceitarem.`,
        type: 'pedido_novo',
        requestId: targetReq.id
      });
    }

    // Notificar profissionais qualificados elegíveis
    (targetReq.matchedProIds || []).forEach(pId => {
      if (pId !== targetReq.professionalId && pId !== currentUser.id) {
        addNotification({
          userId: pId,
          targetRoleScope: 'profissional',
          title: '🟡 Pedido Novamente Disponível',
          message: `O pedido "${targetReq.title}" em ${targetReq.province} voltou a ficar disponível para aceitação!`,
          type: 'pedido_novo',
          requestId: targetReq.id
        });
      }
    });

    try {
      setDoc(doc(db, 'service_requests', requestId), updatedDocData, { merge: true }).catch(() => {});
    } catch (e) {}

    return { success: true, message: 'Pedido libertado com sucesso e novamente disponível para profissionais.' };
  };

  // Actions
  const createServiceRequest = (newReqData: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'clientName' | 'clientAvatar' | 'clientPhone'>) => {
    if (!auth.currentUser || !currentUser.id || currentUser.id === 'guest-client') {
      console.warn('[PEDIDO REJEITADO]: Inicie sessão para solicitar um serviço.');
      return;
    }

    // Mode validation: Must be in Client mode to issue service requests
    if (currentUser.role === 'profissional') {
      console.warn('[PEDIDO REJEITADO]: Modo Profissional ativo. Alterne para Modo Cliente para solicitar um serviço.');
      return;
    }

    // Run auto-matching for notification purposes
    const matchedProIds = runAutoMatching(newReqData.categoryId, newReqData.province);
    
    // If client pre-selected a specific pro, retain it; otherwise leave empty so all eligible pros can accept
    const explicitProId = newReqData.professionalId && newReqData.professionalId !== currentUser.id ? newReqData.professionalId : undefined;
    const explicitPro = explicitProId ? professionals.find(p => p.id === explicitProId) : undefined;

    const newReq: ServiceRequest = {
      ...newReqData,
      id: `req-${Date.now()}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientAvatar: sanitizeMediaUrl(currentUser.avatar) || '',
      ...(explicitProId ? {
        professionalId: explicitProId,
        professionalName: explicitPro?.name || 'Profissional',
        professionalAvatar: sanitizeMediaUrl(explicitPro?.avatar) || ''
      } : {}),
      matchedProIds,
      autoMatchedCount: matchedProIds.length,
      status: 'pendente',
      isReopened: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasReview: false
    };

    pendingWriteIdsRef.current.add(newReq.id);
    setRequests(prev => [newReq, ...prev]);
    setIsNewRequestOpen(false);
    setActiveTab('requests');

    // Save to Firestore asynchronously (no clientPhone PII)
    try {
      setDoc(doc(db, 'service_requests', newReq.id), stripSensitiveFields(newReq))
        .then(() => pendingWriteIdsRef.current.delete(newReq.id))
        .catch(() => {});
    } catch (e) {
      // ignore
    }

    // Notify matching professionals
    const targetProsToNotify = explicitProId ? [explicitProId] : matchedProIds;
    targetProsToNotify.forEach(pId => {
      if (pId !== currentUser.id) {
        addNotification({
          userId: pId,
          targetRoleScope: 'profissional',
          title: `🔔 Novo Pedido em ${newReq.province}`,
          message: `Nova oportunidade disponível: "${newReq.title}" (${newReq.categoryName}). Clique para ver e aceitar.`,
          type: 'pedido_novo',
          requestId: newReq.id
        });
      }
    });
  };

  const updateRequestStatus = (requestId: string, status: RequestStatus, reason?: string) => {
    const targetReq = requests.find(r => r.id === requestId);
    if (!targetReq) return;

    // Roteamento para Aceitar Pedido
    if (status === 'aceito') {
      acceptServiceRequest(requestId);
      return;
    }

    // Roteamento para Reabertura / Encerrar Sem Acordo (Novamente Disponível)
    if (status === 'novamente_disponivel') {
      releaseServiceRequestWithoutAgreement(requestId, reason);
      return;
    }

    // Validação estrita de autorização para as outras transições
    let actionType: 'em_negociacao' | 'em_progresso' | 'concluir' | 'cancelar' | null = null;
    if (status === 'em_negociacao') actionType = 'em_negociacao';
    else if (status === 'em_progresso') actionType = 'em_progresso';
    else if (status === 'concluido') actionType = 'concluir';
    else if (status === 'cancelado') actionType = 'cancelar';

    if (actionType) {
      const authCheck = canPerformRequestAction(actionType, targetReq, currentUser, currentUser.role);
      if (!authCheck.allowed && currentUser.role !== 'admin') {
        console.warn('[ATUALIZAÇÃO DE PEDIDO BLOQUEADA]:', authCheck.reason);
        return;
      }
    }

    // Block status update if current user is acting as professional and their subscription plan is expired or account blocked
    if (currentUser.role === 'profissional' && (status === 'em_progresso' || status === 'concluido')) {
      const validation = validateProAction(currentUser);
      if (!validation.allowed) {
        if (validation.reason === 'blocked') {
          console.warn('[CONTA BLOQUEADA]: Acesso bloqueado pelo Administrador.');
          return;
        }
        triggerBlockedActionPrompt('O seu período gratuito terminou. Para continuar a prestar serviços e utilizar todas as funcionalidades profissionais, escolha um plano.');
        return;
      }
    }

    if (status === 'em_negociacao') {
      const otherUserId = currentUser.id === targetReq.clientId ? targetReq.professionalId : targetReq.clientId;
      if (otherUserId) {
        addNotification({
          userId: otherUserId,
          title: '🟠 Pedido em Negociação',
          message: `O pedido "${targetReq.title}" está em fase de negociação de detalhes no chat privado.`,
          type: 'comunicado_jsmart',
          requestId: targetReq.id
        });
      }
    } else if (status === 'em_progresso') {
      addNotification({
        userId: targetReq.clientId,
        targetRoleScope: 'cliente',
        title: '🛵 Profissional a Caminho / Em Execução',
        message: `O profissional ${targetReq.professionalName || ''} iniciou o trabalho para o pedido "${targetReq.title}".`,
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

      if (targetReq.professionalId) {
        const targetPro = professionals.find(p => p.id === targetReq.professionalId);
        const newCompletedCount = (targetPro?.completedJobs || 0) + 1;
        setProfessionals(prev => prev.map(p => {
          if (p.id === targetReq.professionalId) {
            return {
              ...p,
              completedJobs: newCompletedCount
            };
          }
          return p;
        }));
        try {
          setDoc(doc(db, 'professionals', targetReq.professionalId), { completedJobs: newCompletedCount }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'professionals_public', targetReq.professionalId), { completedJobs: newCompletedCount, name: targetPro?.name || targetReq.professionalName || 'Profissional' }, { merge: true }).catch(() => {});
          setDoc(doc(db, 'users', targetReq.professionalId), { completedJobs: newCompletedCount }, { merge: true }).catch(() => {});
        } catch (e) {}
      }
    } else if (status === 'cancelado') {
      const notifyUserId = currentUser.id === targetReq.clientId ? targetReq.professionalId : targetReq.clientId;
      if (notifyUserId) {
        addNotification({
          userId: notifyUserId,
          title: '❌ Pedido Cancelado',
          message: `O pedido "${targetReq.title}" foi cancelado.${reason ? ` Motivo: ${reason}` : ''}`,
          type: 'comunicado_jsmart',
          requestId: targetReq.id
        });
      }
    }

    const nowIso = new Date().toISOString();
    const updatedDocData: Partial<ServiceRequest> = {
      status,
      updatedAt: nowIso,
      ...(status === 'concluido' ? { completedAt: nowIso } : {}),
      ...(status === 'cancelado' ? {
        cancelledAt: nowIso,
        cancelledBy: currentUser.role as any,
        ...(reason ? { cancellationReason: reason } : {})
      } : {})
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
        logFirestoreWarning(err, OperationType.UPDATE, `service_requests/${requestId}`);
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
      const clientPhone = clientProfile?.phone || '';

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
      clientAvatar: sanitizeMediaUrl(currentUser.avatar) || '',
      professionalId: proId,
      professionalName: pro?.name || 'Profissional',
      professionalAvatar: sanitizeMediaUrl(pro?.avatar) || '',
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

    if (auth.currentUser) {
      try {
        setDoc(doc(db, 'service_requests', newReqId), stripSensitiveFields(newReq)).catch(() => {});
      } catch (e) {}
    }

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
      return;
    }

    const safeImageUrl = imageUrl ? sanitizeMediaUrl(imageUrl) : undefined;
    if (imageUrl && !safeImageUrl) {
      console.warn('[CHAT REJEITADO]: URL de imagem inválido ou bloqueado por segurança.');
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
      senderAvatar: sanitizeMediaUrl(currentUser.avatar) || '',
      receiverId: recipientId,
      participants: [currentUser.id, recipientId].filter(Boolean),
      text,
      timestamp: nowIso,
      status: 'enviando', // Initial state
      read: false,
      readBy: [currentUser.id],
      isQuickQuote: isQuote,
      ...(quotePriceKz !== undefined ? { quotePriceKz } : {}),
      ...(safeImageUrl ? { imageUrl: safeImageUrl } : {}),
      ...(locationPin ? { locationPin } : {}),
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
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReviews(prev => [newRev, ...prev]);

    setRequests(prev => prev.map(r => r.id === reviewData.requestId ? { ...r, hasReview: true } : r));

    setProfessionals(prev => prev.map(p => {
      if (p.id === reviewData.professionalId) {
        const proReviews = [...reviews.filter(r => r.professionalId === p.id), newRev];
        const avg = proReviews.reduce((acc, curr) => acc + curr.rating, 0) / proReviews.length;
        const updated = {
          ...p,
          rating: Number(avg.toFixed(1)),
          reviewCount: proReviews.length
        };
        // Persist updated rating to Firestore
        setDoc(doc(db, 'professionals', p.id), { rating: updated.rating, reviewCount: updated.reviewCount }, { merge: true }).catch(() => {});
        setDoc(doc(db, 'professionals_public', p.id), { rating: updated.rating, reviewCount: updated.reviewCount, name: p.name }, { merge: true }).catch(() => {});
        return updated;
      }
      return p;
    }));

    // Persist review to Firestore
    setDoc(doc(db, 'reviews', newRev.id), newRev).catch(err => {
      logFirestoreWarning(err, OperationType.WRITE, `reviews/${newRev.id}`);
    });

    // Mark request hasReview in Firestore
    setDoc(doc(db, 'service_requests', reviewData.requestId), { hasReview: true, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});

    setIsReviewModalOpen(false);
    setReviewingRequestId(null);
  };

  const verifyProfessional = async (proId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const payload = { verified: true, documentsVerified: true, isAutoApproved: true };
    const existingPro = professionals.find(p => p.id === proId);

    try {
      await setDoc(doc(db, 'professionals', proId), payload, { merge: true });
      await setDoc(doc(db, 'professionals_public', proId), { ...payload, name: existingPro?.name || 'Profissional' }, { merge: true }).catch(() => {});
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
    const existingPro = professionals.find(p => p.id === proId);

    try {
      await setDoc(doc(db, 'professionals', proId), { experienceVerified: isVerified }, { merge: true });
      await setDoc(doc(db, 'professionals_public', proId), { experienceVerified: isVerified, name: existingPro?.name || 'Profissional' }, { merge: true }).catch(() => {});
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
      // Strictly disallow self-assigning admin role on registration
      const requestedRole: UserRole =
        (userData.accountType === 'profissional' || userData.role === 'profissional')
          ? 'profissional'
          : 'cliente';

      const normalizedPhone = validateStrictAngolaPhone(userData.phone || userData.phoneE164);
      if (!normalizedPhone.isValid) {
        return {
          success: false,
          message: normalizedPhone.error || INVALID_ANGOLA_PHONE_MESSAGE
        };
      }

      // Server-side format verification (/api/v1/auth/validate-phone); gracefully degrades if offline/unreachable
      try {
        const valController = new AbortController();
        const valTimer = setTimeout(() => valController.abort(), 1500);
        const valResp = await fetch('/api/v1/auth/validate-phone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalizedPhone.e164 }),
          signal: valController.signal
        });
        clearTimeout(valTimer);
        if (valResp.status === 400) {
          const valErr = await valResp.json().catch(() => ({}));
          return {
            success: false,
            message: valErr?.message || INVALID_ANGOLA_PHONE_MESSAGE
          };
        }
      } catch {
        // Offline or static preview fallback: frontend + Firestore rules still enforce +244XXXXXXXXX
      }

      // Protect the official Super Admin phone from duplicate registration / hijacking
      if (isOfficialAdminPhone(normalizedPhone.e164)) {
        return {
          success: false,
          message: 'Este número de telefone pertence à conta oficial da plataforma. Utilize o ecrã "Entrar" ou "Esqueci a palavra-passe".'
        };
      }

      const rawOptionalEmail = (userData.email || '').trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (rawOptionalEmail && !emailRegex.test(rawOptionalEmail)) {
        return {
          success: false,
          message: 'O endereço de e-mail opcional introduzido é inválido. Corrija-o ou deixe o campo em branco.'
        };
      }
      const cleanOptionalEmail = rawOptionalEmail.toLowerCase();

      const cleanPassword = (password || '').trim();
      if (!cleanPassword || cleanPassword.length < 6) {
        return {
          success: false,
          message: 'A palavra-passe deve conter pelo menos 6 caracteres.'
        };
      }

      const syntheticAuthEmail = phoneToSyntheticAuthEmail(normalizedPhone.e164);
      const phoneIndexId = await computePhoneIndexId(normalizedPhone.e164);
      if (!syntheticAuthEmail || !phoneIndexId) {
        return {
          success: false,
          message: 'Não foi possível normalizar o número de telefone. Verifique o número e tente novamente.'
        };
      }

      // Prevent duplicate phone numbers across different accounts (Dual accounts share the same UID/phone)
      try {
        const existingPhoneIdxSnap = await getDoc(doc(db, 'phone_login_index', phoneIndexId));
        if (existingPhoneIdxSnap.exists()) {
          return {
            success: false,
            message: 'Este número de telefone já está registado noutra conta. Utilize "Entrar" com o seu telefone ou "Esqueci a palavra-passe".'
          };
        }
      } catch {
        // Continue to atomic Firebase Auth uniqueness enforcement below
      }

      const duplicateInLocalState = [...allUsers, ...professionals].some(
        u => !u.isDeleted && areSamePhoneNumber(u.phone, normalizedPhone.e164)
      );
      if (duplicateInLocalState) {
        return {
          success: false,
          message: 'Este número de telefone já está associado a uma conta existente. Por favor inicie sessão em "Entrar".'
        };
      }

      // 1. Fail-closed Firebase Authentication registration using deterministic synthetic phone identifier
      // Passwords are NEVER stored in Firestore or localStorage — Firebase Auth hashes them server-side (scrypt).
      let firebaseUid = '';
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, syntheticAuthEmail, cleanPassword);
        firebaseUid = userCredential.user.uid;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          return {
            success: false,
            message: 'Este número de telefone já está registado na J Smart Services. Por favor inicie sessão ou recupere a sua palavra-passe.'
          };
        } else if (authErr?.code === 'auth/weak-password') {
          return { success: false, message: 'Palavra-passe demasiado fraca. Utilize pelo menos 6 caracteres.' };
        } else {
          return {
            success: false,
            message: 'Não foi possível concluir o registo seguro. Verifique a ligação e tente novamente.'
          };
        }
      }

      if (!firebaseUid) {
        return { success: false, message: 'Falha ao obter identificador de autenticação seguro.' };
      }

      const requestedAccountType: AccountType =
        userData.accountType === 'duplo'
          ? 'duplo'
          : requestedRole === 'profissional'
            ? 'profissional'
            : 'cliente';

      const isProRegistration = requestedRole === 'profissional' || requestedAccountType === 'duplo';

      let autoApproveObj = {};
      if (requestedRole === 'profissional') {
        const merged = { ...userData, phone: normalizedPhone.e164 } as ProfessionalProfile;
        const { isApproved } = checkProAutoApproval(merged);
        if (isApproved) {
          autoApproveObj = { verified: true, documentsVerified: true, isAutoApproved: true };
        }
      }

      const safeAvatar = sanitizeMediaUrl(userData.avatar) || '';
      const safePortfolio = Array.isArray(userData.portfolioImages)
        ? userData.portfolioImages.map(u => sanitizeMediaUrl(u)).filter((u): u is string => Boolean(u))
        : [];

      // Obtain authoritative server UTC timestamp when available
      let authoritativeNowMs = Date.now();
      try {
        const timeController = new AbortController();
        const timeTimer = setTimeout(() => timeController.abort(), 1500);
        const timeResp = await fetch('/api/v1/time', { signal: timeController.signal });
        clearTimeout(timeTimer);
        if (timeResp.ok) {
          const timeJson = await timeResp.json();
          if (typeof timeJson?.nowMs === 'number' && Number.isFinite(timeJson.nowMs)) {
            authoritativeNowMs = timeJson.nowMs;
          }
        }
      } catch {
        // Offline or local fallback uses Date.now()
      }

      const nowIso = new Date(authoritativeNowMs).toISOString();

      // Anti-duplicate initial free-trial protection (one initial 30-day free trial per phone/email/document)
      const normalizedPhoneDigits = normalizedPhone.digits;
      const normalizedDocNum = (userData.documentNumber || '').trim().toUpperCase();

      let alreadyUsedTrial = false;
      const claimIdsToRecord: string[] = [];

      if (isProRegistration) {
        const existingLocalMatch = [...allUsers, ...professionals].some(u => {
          const samePhone = areSamePhoneNumber(u.phone, normalizedPhone.e164);
          const sameEmail = Boolean(cleanOptionalEmail && u.email && u.email.toLowerCase() === cleanOptionalEmail);
          const sameDoc = Boolean(normalizedDocNum && u.documentNumber && u.documentNumber.trim().toUpperCase() === normalizedDocNum);
          return (samePhone || sameEmail || sameDoc) && u.id !== firebaseUid;
        });
        if (existingLocalMatch) {
          alreadyUsedTrial = true;
        }

        const hashInputs: Array<{ prefix: string; value: string }> = [];
        if (normalizedPhoneDigits.length >= 9) {
          hashInputs.push({ prefix: 'phone', value: normalizedPhoneDigits.slice(-9) });
        }
        if (cleanOptionalEmail) {
          hashInputs.push({ prefix: 'email', value: cleanOptionalEmail });
        }
        if (normalizedDocNum) {
          hashInputs.push({ prefix: 'doc', value: normalizedDocNum });
        }

        for (const item of hashInputs) {
          const digest = await computeSha256Hex(`${item.prefix}:${item.value}`);
          if (!digest) continue;
          const claimId = `${item.prefix}_${digest}`;
          try {
            const claimSnap = await getDoc(doc(db, 'trial_claims', claimId));
            if (claimSnap.exists()) {
              const claimOwner = (claimSnap.data() as any)?.claimedBy;
              if (claimOwner && claimOwner !== firebaseUid) {
                alreadyUsedTrial = true;
              }
            } else {
              claimIdsToRecord.push(claimId);
            }
          } catch {
            claimIdsToRecord.push(claimId);
          }
        }
      }

      const assignedTrialDays = isProRegistration ? (alreadyUsedTrial ? 0 : NEW_TRIAL_DAYS) : NEW_TRIAL_DAYS;
      const assignedTrialEndsAt = isProRegistration
        ? new Date(authoritativeNowMs + assignedTrialDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const newUserObj: User = stripSensitiveFields({
        id: firebaseUid,
        name: (userData.name || 'Novo Utilizador').trim(),
        email: cleanOptionalEmail,
        phone: normalizedPhone.e164,
        phoneE164: normalizedPhone.e164,
        phoneHash: phoneIndexId,
        authIdentifierType: 'phone',
        gender: userData.gender || 'masculino',
        role: requestedRole,
        accountType: requestedAccountType,
        province: userData.province || 'Luanda',
        city: userData.city || userData.province || 'Luanda',
        address: userData.address || '',
        documentNumber: userData.documentNumber || '',
        categories: Array.isArray(userData.categories) ? userData.categories : [],
        avatar: safeAvatar,
        photoURL: safeAvatar,
        verified: true,
        walletBalanceKz: 0,
        blocked: false,
        isDeleted: false,
        subscriptionPlan: 'free_trial',
        ...(isProRegistration ? {
          trialStartDate: nowIso,
          trialEndsAt: assignedTrialEndsAt,
          trialDurationDays: assignedTrialDays,
          subscriptionStatus: assignedTrialDays > 0 ? 'ACTIVE' : 'EXPIRED'
        } : {}),
        createdAt: nowIso,
        updatedAt: nowIso,
        registrationSource: userData.registrationSource || 'Registo J Smart Services',
        ...autoApproveObj
      });

      const userFirestorePayload = {
        ...newUserObj,
        ...(isProRegistration ? { trialStartServerTimestamp: serverTimestamp() } : {})
      };

      // 2. Persist sanitized profile + privacy-preserving hashed phone login index (never storing password)
      await setDoc(doc(db, 'users', firebaseUid), userFirestorePayload, { merge: true });
      await setDoc(
        doc(db, 'phone_login_index', phoneIndexId),
        {
          uid: firebaseUid,
          authMode: 'phone_synthetic',
          authEmail: syntheticAuthEmail,
          hasRealEmail: Boolean(cleanOptionalEmail),
          updatedAt: nowIso
        },
        { merge: true }
      ).catch(err => {
        logFirestoreWarning(err, OperationType.CREATE, `phone_login_index/${phoneIndexId}`);
      });

      // 3. If Professional/Duplo, persist private profile + PII-free public catalog + trial claims
      if (isProRegistration) {
        const proProfileToSave: ProfessionalProfile = stripSensitiveFields({
          id: firebaseUid,
          name: newUserObj.name,
          email: newUserObj.email,
          phone: newUserObj.phone,
          phoneE164: normalizedPhone.e164,
          phoneHash: phoneIndexId,
          authIdentifierType: 'phone',
          gender: newUserObj.gender,
          province: newUserObj.province,
          city: newUserObj.city || 'Luanda',
          role: 'profissional',
          accountType: requestedAccountType,
          avatar: safeAvatar,
          photoURL: safeAvatar,
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
          address: userData.address || `${newUserObj.province}, Angola`,
          documentType: userData.documentType || 'Bilhete de Identidade',
          documentNumber: userData.documentNumber || '',
          portfolioImages: safePortfolio,
          registrationSource: userData.registrationSource || 'Registo J Smart Services',
          walletBalanceKz: 0,
          blocked: false,
          isDeleted: false,
          subscriptionPlan: 'free_trial',
          trialStartDate: nowIso,
          trialEndsAt: assignedTrialEndsAt,
          trialDurationDays: assignedTrialDays,
          subscriptionStatus: assignedTrialDays > 0 ? 'ACTIVE' : 'EXPIRED',
          createdAt: nowIso,
          updatedAt: nowIso
        });
        await setDoc(doc(db, 'professionals', firebaseUid), {
          ...proProfileToSave,
          trialStartServerTimestamp: serverTimestamp()
        }, { merge: true });
        await setDoc(doc(db, 'professionals_public', firebaseUid), toPublicProData(proProfileToSave), { merge: true });

        if (!alreadyUsedTrial && claimIdsToRecord.length > 0) {
          await Promise.allSettled(
            claimIdsToRecord.map(claimId =>
              setDoc(doc(db, 'trial_claims', claimId), {
                claimedBy: firebaseUid,
                trialDurationDays: NEW_TRIAL_DAYS,
                trialEndsAt: assignedTrialEndsAt,
                createdAt: serverTimestamp()
              })
            )
          );
        }

        setProfessionals(prev => {
          const exists = prev.some(p => p.id === firebaseUid || areSamePhoneNumber(p.phone, proProfileToSave.phone));
          if (exists) {
            return prev.map(p => (p.id === firebaseUid || areSamePhoneNumber(p.phone, proProfileToSave.phone)) ? { ...p, ...proProfileToSave } : p);
          }
          return [proProfileToSave, ...prev];
        });
      }

      setFirebaseAuthUid(firebaseUid);

      // 4. Update React state
      setAllUsers(prev => {
        const exists = prev.some(u => u.id === firebaseUid || areSamePhoneNumber(u.phone, newUserObj.phone));
        if (exists) {
          return prev.map(u => (u.id === firebaseUid || areSamePhoneNumber(u.phone, newUserObj.phone)) ? { ...u, ...newUserObj } : u);
        }
        return [newUserObj, ...prev];
      });

      setCurrentUser(newUserObj);
      setIsLoggedIn(true);

      if (requestedRole === 'profissional') {
        setActiveTab('pro_dashboard');
      } else {
        setActiveTab('home');
      }

      return { success: true, message: 'Conta criada com sucesso! Já pode entrar sempre com o seu número de telefone.' };
    } catch (err: any) {
      logFirestoreWarning(err, OperationType.CREATE, 'users');
      return {
        success: false,
        message: 'Erro ao gravar o cadastro na base de dados. Por favor verifique a sua ligação e tente novamente.'
      };
    }
  };

  const loginUserWithCredentialsAsync = async (
    phoneInput: string,
    passInput: string,
    selectedRole: UserRole,
    options?: { legacyEmail?: string }
  ): Promise<{
    success: boolean;
    message: string;
    role?: UserRole;
    suggestLegacyMigration?: boolean;
    needsAdminEmailVerification?: boolean;
  }> => {
    try {
      const normalizedPhone = validateStrictAngolaPhone(phoneInput);
      const passTrimmed = (passInput || '').trim();

      if (!normalizedPhone.isValid) {
        return {
          success: false,
          message: normalizedPhone.error || INVALID_ANGOLA_PHONE_MESSAGE
        };
      }

      if (!passTrimmed || passTrimmed.length < 6) {
        return {
          success: false,
          message: 'Palavra-passe inválida. Introduza a palavra-passe (mínimo 6 caracteres) da sua conta.'
        };
      }

      const phoneIndexId = await computePhoneIndexId(normalizedPhone.e164);
      const syntheticEmail = phoneToSyntheticAuthEmail(normalizedPhone.e164);

      // Build ordered list of Firebase Auth login identifiers for this phone (zero enumeration of other users)
      const candidateAuthEmails: string[] = [];
      const addCandidate = (emailCandidate?: string | null) => {
        const clean = (emailCandidate || '').trim().toLowerCase();
        if (clean && clean.includes('@') && !candidateAuthEmails.includes(clean)) {
          candidateAuthEmails.push(clean);
        }
      };

      // 1) One-time legacy migration email (only if user explicitly supplied it to bind an old email account to this phone)
      if (options?.legacyEmail) {
        addCandidate(options.legacyEmail);
      }

      // 2) Privacy-preserving hashed phone_login_index lookup (no raw phone stored, no collection listing)
      let hasIndexedMapping = false;
      if (phoneIndexId) {
        try {
          const idxSnap = await getDoc(doc(db, 'phone_login_index', phoneIndexId));
          if (idxSnap.exists()) {
            const idxData = idxSnap.data() as { authEmail?: string };
            if (idxData?.authEmail) {
              hasIndexedMapping = true;
              addCandidate(idxData.authEmail);
            }
          }
        } catch {
          // Safe fallback to deterministic identifiers below
        }
      }

      // 3) Standard phone-native deterministic Firebase Auth identifier
      addCandidate(syntheticEmail);

      // 4) Official Super Administrator seamless phone-to-existing-account resolution (no duplicate admin created)
      const isOfficialAdminLoginPhone = isOfficialAdminPhone(normalizedPhone.e164);
      if (isOfficialAdminLoginPhone) {
        addCandidate(OFFICIAL_ADMIN_EMAIL);
      }

      // 5) Real Firebase Auth verification (fail closed, server-verified scrypt hash)
      let fbUser: any = null;
      let lastAuthErrorCode = '';
      for (const candidateEmail of candidateAuthEmails) {
        try {
          const credential = await signInWithEmailAndPassword(auth, candidateEmail, passTrimmed);
          fbUser = credential.user;
          break;
        } catch (authErr: any) {
          const code = authErr?.code || '';
          lastAuthErrorCode = code;
          if (code === 'auth/too-many-requests') {
            return {
              success: false,
              message: 'Demasiadas tentativas falhadas. Por segurança, aguarde alguns minutos ou utilize "Esqueci a palavra-passe".'
            };
          }
          if (code === 'auth/user-disabled') {
            return {
              success: false,
              message: 'Esta conta foi desativada. Contacte o suporte da J Smart Services (+244 956 011 985).'
            };
          }
        }
      }

      if (!fbUser) {
        const shouldSuggestMigration = !hasIndexedMapping && !options?.legacyEmail && !isOfficialAdminLoginPhone;
        return {
          success: false,
          suggestLegacyMigration: shouldSuggestMigration,
          message: shouldSuggestMigration
            ? 'Número de telefone ou palavra-passe incorretos. Se criou a sua conta anteriormente com e-mail, associe o seu número abaixo numa única vez.'
            : (lastAuthErrorCode === 'auth/network-request-failed'
                ? 'Sem ligação à internet. Verifique a sua rede e tente novamente.'
                : 'Número de telefone ou palavra-passe incorretos. Verifique os seus dados ou recupere a palavra-passe.')
        };
      }

      // 6. Load strictly authorized user/pro/admin documents for this verified UID
      const [userSnap, proSnap, adminSnap, adminPtSnap] = await Promise.allSettled([
        getDoc(doc(db, 'users', fbUser.uid)),
        getDoc(doc(db, 'professionals', fbUser.uid)),
        getDoc(doc(db, 'admins', fbUser.uid)),
        getDoc(doc(db, 'administradores', fbUser.uid))
      ]);

      const userDocData = userSnap.status === 'fulfilled' && userSnap.value.exists()
        ? stripSensitiveFields({ id: userSnap.value.id, ...userSnap.value.data() } as User)
        : null;
      const proDocData = proSnap.status === 'fulfilled' && proSnap.value.exists()
        ? stripSensitiveFields({ id: proSnap.value.id, ...proSnap.value.data() } as ProfessionalProfile)
        : null;

      const fbEmailLower = (fbUser.email || '').trim().toLowerCase();
      const isVerifiedSuperAdmin = Boolean(fbUser.emailVerified && fbEmailLower === OFFICIAL_ADMIN_EMAIL);
      const isOfficialAdminAccount = Boolean(fbEmailLower === OFFICIAL_ADMIN_EMAIL && isOfficialAdminLoginPhone);
      const hasAdminRecord =
        isVerifiedSuperAdmin ||
        (adminSnap.status === 'fulfilled' && adminSnap.value.exists()) ||
        (adminPtSnap.status === 'fulfilled' && adminPtSnap.value.exists()) ||
        userDocData?.role === 'admin' ||
        isOfficialAdminAccount;

      const publicEmail = getPublicUserEmail(userDocData?.email || proDocData?.email || fbUser.email);
      const persistedPhone = userDocData?.phone || proDocData?.phone || normalizedPhone.e164;
      const normalizedStoredPhone = normalizePhoneNumber(persistedPhone);
      const finalE164Phone = normalizedStoredPhone.isValid ? normalizedStoredPhone.e164 : normalizedPhone.e164;
      const finalDisplayPhone = finalE164Phone;

      const baseProfile: User = stripSensitiveFields({
        ...(proDocData || {}),
        ...(userDocData || {}),
        id: fbUser.uid,
        email: publicEmail,
        name: userDocData?.name || proDocData?.name || fbUser.displayName || (hasAdminRecord ? DEFAULT_ADMIN_USER.name : 'Utilizador J Smart'),
        phone: finalDisplayPhone,
        phoneE164: finalE164Phone,
        phoneHash: phoneIndexId || userDocData?.phoneHash,
        authIdentifierType: isSyntheticPhoneAuthEmail(fbUser.email) ? 'phone' : 'legacy_migrated',
        province: userDocData?.province || proDocData?.province || (hasAdminRecord ? 'Icolo e Bengo' : 'Luanda'),
        avatar: userDocData?.avatar || proDocData?.avatar || '',
        verified: userDocData?.verified ?? true,
        createdAt: userDocData?.createdAt || proDocData?.createdAt || new Date().toISOString()
      } as User);

      if (baseProfile.isDeleted === true || (baseProfile as any).status === 'deleted') {
        await signOut(auth).catch(() => {});
        return {
          success: false,
          message: 'Esta conta foi desativada ou eliminada pela administração e não pode iniciar sessão.'
        };
      }

      if (baseProfile.blocked === true || (baseProfile as any).status === 'bloqueado' || (baseProfile as any).accountStatus === 'BLOCKED') {
        await signOut(auth).catch(() => {});
        return {
          success: false,
          message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
        };
      }

      // Strictly preserve Admin role — NEVER downgrade an Administrator to client/professional
      let finalRole: UserRole = 'cliente';
      if (hasAdminRecord) {
        finalRole = 'admin';
      } else if (baseProfile.accountType === 'duplo') {
        finalRole = selectedRole === 'profissional' ? 'profissional' : 'cliente';
      } else if (baseProfile.role === 'profissional' || baseProfile.accountType === 'profissional' || Boolean(proDocData)) {
        finalRole = 'profissional';
      }

      const finalUser: User = stripSensitiveFields({
        ...baseProfile,
        role: finalRole,
        adminSubRole: finalRole === 'admin' ? (baseProfile.adminSubRole || 'super_admin') : baseProfile.adminSubRole
      });

      // 7. Non-destructive background sync of normalized phone + phone_login_index for future phone-only logins
      const nowIso = new Date().toISOString();
      if (phoneIndexId && fbUser.email) {
        const isSynth = isSyntheticPhoneAuthEmail(fbUser.email);
        setDoc(
          doc(db, 'phone_login_index', phoneIndexId),
          {
            uid: fbUser.uid,
            authMode: isSynth ? 'phone_synthetic' : 'legacy_email',
            authEmail: fbUser.email.toLowerCase(),
            hasRealEmail: !isSynth || Boolean(publicEmail),
            updatedAt: nowIso
          },
          { merge: true }
        ).catch(() => {});
      }

      // Ensure normalized phone fields are preserved on existing user doc without altering role/wallet/subscription
      if (userDocData && (!userDocData.phoneE164 || !userDocData.phoneHash || !userDocData.phone)) {
        setDoc(
          doc(db, 'users', fbUser.uid),
          {
            phone: finalDisplayPhone,
            phoneE164: finalE164Phone,
            ...(phoneIndexId ? { phoneHash: phoneIndexId } : {}),
            updatedAt: nowIso
          },
          { merge: true }
        ).catch(() => {});
      }

      // Ensure verified Super Admin also has admins/{uid} & users/{uid} synchronized without duplicates
      if (finalRole === 'admin' && isVerifiedSuperAdmin) {
        if (!userDocData) {
          setDoc(
            doc(db, 'users', fbUser.uid),
            stripSensitiveFields({
              ...finalUser,
              role: 'admin',
              adminSubRole: 'super_admin',
              updatedAt: nowIso
            }),
            { merge: true }
          ).catch(() => {});
        }
        if (!(adminSnap.status === 'fulfilled' && adminSnap.value.exists())) {
          setDoc(
            doc(db, 'admins', fbUser.uid),
            {
              uid: fbUser.uid,
              email: OFFICIAL_ADMIN_EMAIL,
              phone: finalDisplayPhone,
              role: 'admin',
              adminSubRole: 'super_admin',
              updatedAt: nowIso
            },
            { merge: true }
          ).catch(() => {});
        }
      }

      if (proDocData) {
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === fbUser.uid);
          return exists
            ? prev.map(p => p.id === fbUser.uid ? { ...p, ...proDocData } : p)
            : [proDocData, ...prev];
        });
      }

      setFirebaseAuthUid(fbUser.uid);
      loginUser(finalUser, finalRole);

      const needsAdminEmailVerification = Boolean(
        finalRole === 'admin' &&
        fbEmailLower === OFFICIAL_ADMIN_EMAIL &&
        !fbUser.emailVerified &&
        !(adminSnap.status === 'fulfilled' && adminSnap.value.exists())
      );

      return {
        success: true,
        role: finalRole,
        needsAdminEmailVerification,
        message: 'Sessão iniciada com sucesso!'
      };
    } catch (err: any) {
      logFirestoreWarning(err, OperationType.GET, 'users');
      return { success: false, message: 'Erro ao iniciar sessão. Verifique a sua ligação e tente novamente.' };
    }
  };

  // ==================== ACCOUNT ACCESS RECOVERY METHODS (PHONE-FIRST & SECURE) ====================
  const requestPasswordRecoveryOtpAsync = async (
    phoneInput: string
  ): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedContact?: string;
    deliveryChannel?: 'sms' | 'email_link' | 'identity_verification';
    isBlocked?: boolean;
  }> => {
    try {
      const normalized = validateStrictAngolaPhone(phoneInput);
      if (!normalized.isValid) {
        return {
          success: false,
          message: normalized.error || INVALID_ANGOLA_PHONE_MESSAGE
        };
      }

      if (!checkRecoveryRateLimit(normalized.e164)) {
        return { success: false, message: RECOVERY_MESSAGES.RATE_LIMIT };
      }

      const maskedPhone = maskPhoneNumber(normalized.display);

      // 1. Try server-side SMS OTP gateway if configured (OTP is generated & hashed strictly on the server)
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch('/api/v1/auth/recovery/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: normalized.e164 }),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (resp.status === 429) {
          const rateData = await resp.json().catch(() => ({}));
          return {
            success: false,
            message: rateData?.message || RECOVERY_MESSAGES.RATE_LIMIT
          };
        }
        if (resp.ok) {
          const data = await resp.json().catch(() => null);
          if ((data?.success || data?.ok) && data?.deliveryChannel === 'sms' && data?.sessionId) {
            return {
              success: true,
              deliveryChannel: 'sms',
              sessionId: data.sessionId,
              maskedContact: data.maskedPhone || data.maskedContact || maskedPhone,
              message: data.message || `Enviámos um código de verificação por SMS para ${maskedPhone}.`
            };
          }
        }
      } catch {
        // Fallback smoothly to hashed index resolution / secure identity verification
      }

      // 2. Check hashed phone_login_index (and official Admin phone) to trigger automatic reset if a real email is linked
      let linkedRealEmail: string | null = null;
      if (isOfficialAdminPhone(normalized.e164)) {
        linkedRealEmail = OFFICIAL_ADMIN_EMAIL;
      } else {
        const phoneIndexId = await computePhoneIndexId(normalized.e164);
        if (phoneIndexId) {
          try {
            const idxSnap = await getDoc(doc(db, 'phone_login_index', phoneIndexId));
            if (idxSnap.exists()) {
              const idxData = idxSnap.data() as { authEmail?: string; authMode?: string; hasRealEmail?: boolean };
              if (idxData?.authEmail && !isSyntheticPhoneAuthEmail(idxData.authEmail)) {
                linkedRealEmail = idxData.authEmail;
              }
            }
          } catch {
            // Continue safely to phone identity verification
          }
        }
      }

      if (linkedRealEmail) {
        try {
          await sendPasswordResetEmail(auth, linkedRealEmail, {
            url: `${OFFICIAL_APP_URL}/?login=true`,
            handleCodeInApp: false
          });
        } catch (err: any) {
          if (err?.code === 'auth/unauthorized-continue-uri' || err?.code === 'auth/invalid-continue-uri') {
            try {
              await sendPasswordResetEmail(auth, linkedRealEmail);
            } catch (fallbackErr) {
              logFirestoreWarning(fallbackErr, OperationType.WRITE, 'auth/sendPasswordResetEmail');
            }
          } else {
            logFirestoreWarning(err, OperationType.WRITE, 'auth/sendPasswordResetEmail');
          }
        }

        return {
          success: true,
          deliveryChannel: 'email_link',
          maskedContact: maskedPhone,
          message: `Conta associada ao telefone ${maskedPhone} localizada! Enviámos automaticamente uma ligação segura de redefinição de palavra-passe para o contacto associado à sua conta (verifique também a pasta Spam).`
        };
      }

      // 3. Phone-only account without SMS gateway or linked email -> Secure Identity Verification (no OTP exposed in browser)
      return {
        success: true,
        deliveryChannel: 'identity_verification',
        maskedContact: maskedPhone,
        message: `Número ${maskedPhone} reconhecido. Como esta conta utiliza apenas telefone, confirme os dados de identidade abaixo para concluir a recuperação com segurança.`
      };
    } catch {
      return {
        success: false,
        message: 'Não foi possível processar o pedido de recuperação neste momento. Tente novamente em instantes.'
      };
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
      const cleanSession = (sessionId || '').trim();
      const cleanCode = (enteredCode || '').replace(/\D/g, '');
      if (!cleanSession || cleanCode.length !== 6) {
        return {
          success: false,
          message: 'Introduza o código numérico de 6 dígitos enviado por SMS.'
        };
      }

      const resp = await fetch('/api/v1/auth/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: cleanSession, code: cleanCode })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && (data?.success || data?.ok)) {
        return {
          success: true,
          message: data.message || 'Código SMS validado com sucesso no servidor!'
        };
      }
      return {
        success: false,
        message: data?.message || 'Código inválido ou expirado. Verifique o SMS recebido e tente novamente.'
      };
    } catch {
      return {
        success: false,
        message: 'Não foi possível validar o código junto do servidor. Verifique a ligação e tente novamente.'
      };
    }
  };

  const resetAccountPasswordAsync = async (): Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }> => {
    return {
      success: false,
      message: 'Por segurança, a alteração da palavra-passe só pode ser concluída através da ligação oficial ou com validação do suporte técnico (+244 956 011 985).'
    };
  };

  const requestPhoneRecoveryVerificationAsync = async (): Promise<{
    success: boolean;
    message: string;
    sessionId?: string;
    maskedCurrentPhone?: string;
    maskedEmail?: string;
    isBlocked?: boolean;
  }> => {
    return {
      success: false,
      message: 'Para alterar um número de telefone perdido sem perder o histórico da conta, confirme a sua identidade através do suporte oficial (+244 956 011 985).'
    };
  };

  const updateRecoveredPhoneNumberAsync = async (): Promise<{
    success: boolean;
    message: string;
    isBlocked?: boolean;
  }> => {
    return {
      success: false,
      message: 'Atualização de número de telefone requer verificação segura da identidade junto da administração (+244 956 011 985).'
    };
  };

  // Non-destructive Admin helper: normalizes existing accounts' phones and indexes them for phone-only login
  const migrateLegacyAccountsPhoneIndexAsync = async (): Promise<{
    success: boolean;
    migratedCount: number;
    skippedCount: number;
    message: string;
  }> => {
    if (currentUser.role !== 'admin' || !auth.currentUser) {
      return {
        success: false,
        migratedCount: 0,
        skippedCount: 0,
        message: 'Apenas administradores autenticados podem executar a sincronização de telefones.'
      };
    }

    try {
      const mergedById = new Map<string, User>();
      for (const u of [...allUsers, ...professionals]) {
        if (!u?.id || u.isDeleted || isFictitiousOrInvalidUser(u)) continue;
        if (!mergedById.has(u.id)) {
          mergedById.set(u.id, u);
        }
      }

      let migratedCount = 0;
      let skippedCount = 0;
      const nowIso = new Date().toISOString();

      for (const [uid, account] of mergedById.entries()) {
        const norm = normalizePhoneNumber(account.phone);
        if (!norm.isValid) {
          skippedCount += 1;
          continue;
        }

        const idxId = await computePhoneIndexId(norm.e164);
        if (!idxId) {
          skippedCount += 1;
          continue;
        }

        const publicEmail = getPublicUserEmail(account.email);
        const authEmailToIndex = publicEmail
          ? publicEmail.toLowerCase()
          : (phoneToSyntheticAuthEmail(norm.e164) || '');
        const authMode = publicEmail ? 'legacy_email' : 'phone_synthetic';

        try {
          // Non-destructive merge: NEVER deletes or overwrites role/name/posts/wallet/subscriptions
          await setDoc(
            doc(db, 'phone_login_index', idxId),
            {
              uid,
              authMode,
              authEmail: authEmailToIndex,
              hasRealEmail: Boolean(publicEmail),
              updatedAt: nowIso
            },
            { merge: true }
          );

          if (account.phone !== norm.e164 || account.phoneE164 !== norm.e164 || account.phoneHash !== idxId) {
            await setDoc(
              doc(db, 'users', uid),
              {
                phone: norm.e164,
                phoneE164: norm.e164,
                phoneHash: idxId,
                updatedAt: nowIso
              },
              { merge: true }
            );
          }
          migratedCount += 1;
        } catch {
          skippedCount += 1;
        }
      }

      return {
        success: true,
        migratedCount,
        skippedCount,
        message: `Sincronização concluída sem perda de dados: ${migratedCount} conta(s) preparada(s) para entrada por telefone (${skippedCount} ignorada(s)).`
      };
    } catch {
      return {
        success: false,
        migratedCount: 0,
        skippedCount: 0,
        message: 'Não foi possível concluir a sincronização de telefones. Verifique a ligação e as permissões administrativas.'
      };
    }
  };

  const sendAdminVerificationEmailAsync = async (): Promise<{ success: boolean; message: string }> => {
    if (!auth.currentUser) {
      return { success: false, message: 'Inicie sessão primeiro para enviar o e-mail de verificação.' };
    }
    if (auth.currentUser.emailVerified) {
      return { success: true, message: 'O e-mail administrativo já se encontra verificado.' };
    }
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${OFFICIAL_APP_URL}/?login=true`,
        handleCodeInApp: false
      });
      return {
        success: true,
        message: 'E-mail de verificação enviado! Confirme na sua caixa de entrada e volte a iniciar sessão para ativar todos os privilégios.'
      };
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-continue-uri' || err?.code === 'auth/invalid-continue-uri') {
        try {
          await sendEmailVerification(auth.currentUser);
          return {
            success: true,
            message: 'E-mail de verificação enviado! Confirme na sua caixa de entrada.'
          };
        } catch {
          // Fall through
        }
      }
      return {
        success: false,
        message: 'Não foi possível enviar o e-mail de verificação agora. Aguarde alguns instantes e tente novamente.'
      };
    }
  };

  const updateUserProfile = (updated: Partial<User & ProfessionalProfile>) => {
    const isAdminActor = currentUser.role === 'admin';
    const sanitizedUpdates = stripSensitiveFields(updated);

    // Strip privileged fields for non-admins to match Firestore security rules
    if (!isAdminActor) {
      delete (sanitizedUpdates as any).accountType;
      delete (sanitizedUpdates as any).walletBalanceKz;
      delete (sanitizedUpdates as any).blocked;
      delete (sanitizedUpdates as any).accountStatus;
      delete (sanitizedUpdates as any).isDeleted;
      delete (sanitizedUpdates as any).subscriptionPlan;
      delete (sanitizedUpdates as any).planStartedAt;
      delete (sanitizedUpdates as any).planExpiresAt;
      delete (sanitizedUpdates as any).trialStartDate;
      delete (sanitizedUpdates as any).trialEndsAt;
      delete (sanitizedUpdates as any).trialDurationDays;
      delete (sanitizedUpdates as any).trialStartServerTimestamp;
      delete (sanitizedUpdates as any).subscriptionStatus;
      delete (sanitizedUpdates as any).experienceVerified;
      delete (sanitizedUpdates as any).adminSubRole;
      if (sanitizedUpdates.role && sanitizedUpdates.role !== currentUser.role) {
        if (!(currentUser.accountType === 'duplo' && (sanitizedUpdates.role === 'cliente' || sanitizedUpdates.role === 'profissional'))) {
          delete sanitizedUpdates.role;
        }
      }
    }

    if (sanitizedUpdates.avatar !== undefined) {
      sanitizedUpdates.avatar = sanitizeMediaUrl(sanitizedUpdates.avatar) || '';
    }
    if ((sanitizedUpdates as any).photoURL !== undefined) {
      (sanitizedUpdates as any).photoURL = sanitizeMediaUrl((sanitizedUpdates as any).photoURL) || '';
    }
    if (Array.isArray((sanitizedUpdates as any).portfolioImages)) {
      (sanitizedUpdates as any).portfolioImages = (sanitizedUpdates as any).portfolioImages
        .map((u: string) => sanitizeMediaUrl(u))
        .filter((u: string | null): u is string => Boolean(u));
    }

    const targetRole = sanitizedUpdates.role || currentUser.role;
    const newUserId = currentUser.id && currentUser.id !== 'guest-client' ? currentUser.id : (auth.currentUser?.uid || '');
    if (!newUserId) {
      console.warn('Atualização de perfil ignorada: sessão não autenticada.');
      return;
    }

    if (sanitizedUpdates.phone !== undefined) {
      const strictProfilePhone = validateStrictAngolaPhone(sanitizedUpdates.phone);
      const fallbackProfilePhone = strictProfilePhone.isValid ? strictProfilePhone : normalizePhoneNumber(sanitizedUpdates.phone);
      if (fallbackProfilePhone.isValid) {
        const isChangingPhone = !areSamePhoneNumber(currentUser.phone, fallbackProfilePhone.e164);
        const isDuplicateOtherAccount = isChangingPhone && [...allUsers, ...professionals].some(
          u => !u.isDeleted && u.id !== newUserId && areSamePhoneNumber(u.phone, fallbackProfilePhone.e164)
        );
        const isHijackingAdminPhone = isChangingPhone && !isAdminActor && isOfficialAdminPhone(fallbackProfilePhone.e164);

        if (isDuplicateOtherAccount || isHijackingAdminPhone) {
          delete sanitizedUpdates.phone;
          delete sanitizedUpdates.phoneE164;
        } else {
          sanitizedUpdates.phone = fallbackProfilePhone.e164;
          sanitizedUpdates.phoneE164 = fallbackProfilePhone.e164;
        }
      } else {
        // Reject invalid phone updates without corrupting existing profile phone
        delete sanitizedUpdates.phone;
        delete sanitizedUpdates.phoneE164;
      }
    }

    const nowIso = new Date().toISOString();
    const updatedUser = stripSensitiveFields({
      ...currentUser,
      ...sanitizedUpdates,
      id: newUserId,
      updatedAt: nowIso
    });

    setCurrentUser(updatedUser);

    if (sanitizedUpdates.phoneE164 && auth.currentUser?.email) {
      const fbEmail = auth.currentUser.email;
      const isSynth = isSyntheticPhoneAuthEmail(fbEmail);
      computePhoneIndexId(sanitizedUpdates.phoneE164).then(idxId => {
        if (!idxId) return;
        setDoc(
          doc(db, 'phone_login_index', idxId),
          {
            uid: newUserId,
            authMode: isSynth ? 'phone_synthetic' : 'legacy_email',
            authEmail: fbEmail.toLowerCase(),
            hasRealEmail: !isSynth || Boolean(getPublicUserEmail(updatedUser.email)),
            updatedAt: nowIso
          },
          { merge: true }
        ).catch(() => {});
      }).catch(() => {});
    }

    const isProOrDual = targetRole === 'profissional' ||
      updatedUser.accountType === 'duplo' ||
      updatedUser.accountType === 'profissional' ||
      professionals.some(p => p.id === newUserId || (p.email && updatedUser.email && p.email === updatedUser.email));

    let syncedProProfile: ProfessionalProfile | null = null;
    if (isProOrDual) {
      const existingPro = professionals.find(p => p.id === newUserId || (p.email && updatedUser.email && p.email === updatedUser.email));
      const safeAvatar = updatedUser.avatar || existingPro?.avatar || '';
      syncedProProfile = stripSensitiveFields({
        id: newUserId,
        name: updatedUser.name || existingPro?.name || 'Profissional',
        email: updatedUser.email || existingPro?.email || '',
        phone: updatedUser.phone || existingPro?.phone || '',
        province: updatedUser.province || existingPro?.province || 'Luanda',
        city: updatedUser.city || existingPro?.city || 'Luanda',
        role: 'profissional',
        accountType: existingPro?.accountType || updatedUser.accountType || 'profissional',
        avatar: safeAvatar,
        photoURL: safeAvatar,
        categories: Array.isArray((updatedUser as any).categories) && (updatedUser as any).categories.length > 0
          ? (updatedUser as any).categories
          : (existingPro?.categories || []),
        bio: (updatedUser as any).bio || existingPro?.bio || 'Profissional prestador de serviços.',
        experienceYears: typeof (updatedUser as any).experienceYears === 'number'
          ? Math.max(0, (updatedUser as any).experienceYears)
          : (Number((updatedUser as any).experienceYears) >= 0 ? Number((updatedUser as any).experienceYears) : (existingPro?.experienceYears || 0)),
        experienceVerified: existingPro?.experienceVerified ?? (updatedUser as any).experienceVerified ?? false,
        hourlyRateKz: (updatedUser as any).hourlyRateKz || existingPro?.hourlyRateKz || 15000,
        rating: existingPro?.rating || 5.0,
        reviewCount: existingPro?.reviewCount || 0,
        completedJobs: existingPro?.completedJobs || 0,
        status: (updatedUser as any).status || existingPro?.status || 'disponivel',
        verified: existingPro?.blocked === true ? false : (existingPro?.verified ?? true),
        documentsVerified: existingPro?.blocked === true ? false : ((existingPro as any)?.documentsVerified ?? true),
        isAutoApproved: existingPro?.blocked === true ? false : ((existingPro as any)?.isAutoApproved ?? true),
        address: (updatedUser as any).address || existingPro?.address || '',
        documentType: (updatedUser as any).documentType || existingPro?.documentType || 'Bilhete de Identidade',
        documentNumber: (updatedUser as any).documentNumber || existingPro?.documentNumber || '',
        portfolioImages: (updatedUser as any).portfolioImages || existingPro?.portfolioImages || [],
        subscriptionPlan: existingPro?.subscriptionPlan || updatedUser.subscriptionPlan || 'free_trial',
        planStartedAt: existingPro?.planStartedAt || updatedUser.planStartedAt,
        planExpiresAt: existingPro?.planExpiresAt || updatedUser.planExpiresAt,
        trialStartDate: existingPro?.trialStartDate || updatedUser.trialStartDate,
        trialEndsAt: existingPro?.trialEndsAt || updatedUser.trialEndsAt,
        trialDurationDays: existingPro?.trialDurationDays ?? updatedUser.trialDurationDays,
        subscriptionStatus: existingPro?.subscriptionStatus || updatedUser.subscriptionStatus,
        blocked: existingPro?.blocked ?? updatedUser.blocked ?? false,
        createdAt: existingPro?.createdAt || updatedUser.createdAt || nowIso,
        updatedAt: nowIso
      });

      if (!isFictitiousOrInvalidUser(syncedProProfile)) {
        setProfessionals(prev => {
          const exists = prev.some(p => p.id === newUserId || (p.email && syncedProProfile!.email && p.email === syncedProProfile!.email));
          if (exists) {
            return prev.map(p => (p.id === newUserId || (p.email && syncedProProfile!.email && p.email === syncedProProfile!.email)) ? { ...p, ...syncedProProfile } : p);
          }
          return [syncedProProfile!, ...prev];
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

      if (sanitizedUpdates.avatar !== undefined || sanitizedUpdates.name !== undefined) {
        const newAvatar = sanitizedUpdates.avatar !== undefined ? sanitizedUpdates.avatar : updatedUser.avatar;
        const newName = sanitizedUpdates.name !== undefined ? sanitizedUpdates.name : updatedUser.name;

        setWorkFeedPosts(prev => prev.map(post => {
          if (post.professionalId === newUserId || post.ownerId === newUserId) {
            const syncedPost = {
              ...post,
              professionalAvatar: newAvatar || '',
              professionalName: newName || post.professionalName
            };
            if (auth.currentUser) {
              try {
                setDoc(doc(db, 'work_feed_posts', post.id), {
                  professionalAvatar: newAvatar || '',
                  professionalName: newName || post.professionalName
                }, { merge: true }).catch(() => {});
              } catch {}
            }
            return syncedPost;
          }
          return post;
        }));
      }

      safeStorageSet(`${LOCAL_STORAGE_KEY}_user`, JSON.stringify(stripSensitiveFields(updatedUser)));

      if (auth.currentUser) {
        try {
          const userUpdatePayload = isAdminActor
            ? { ...updatedUser, photoURL: updatedUser.avatar || '' }
            : {
                ...sanitizedUpdates,
                photoURL: (sanitizedUpdates.avatar ?? updatedUser.avatar) || '',
                updatedAt: nowIso
              };

          setDoc(doc(db, 'users', newUserId), stripSensitiveFields(userUpdatePayload), { merge: true }).catch(err => {
            logFirestoreWarning(err, OperationType.UPDATE, `users/${newUserId}`);
          });

          if (isProOrDual && syncedProProfile) {
            const proUpdatePayload = isAdminActor
              ? syncedProProfile
              : {
                  ...sanitizedUpdates,
                  name: syncedProProfile.name,
                  avatar: syncedProProfile.avatar,
                  photoURL: syncedProProfile.photoURL,
                  categories: syncedProProfile.categories,
                  bio: syncedProProfile.bio,
                  experienceYears: syncedProProfile.experienceYears,
                  hourlyRateKz: syncedProProfile.hourlyRateKz,
                  address: syncedProProfile.address,
                  portfolioImages: syncedProProfile.portfolioImages,
                  status: syncedProProfile.status,
                  updatedAt: nowIso
                };
            setDoc(doc(db, 'professionals', newUserId), stripSensitiveFields(proUpdatePayload), { merge: true }).catch(err => {
              logFirestoreWarning(err, OperationType.UPDATE, `professionals/${newUserId}`);
            });
            setDoc(doc(db, 'professionals_public', newUserId), toPublicProData(syncedProProfile), { merge: true }).catch(() => {});
          }
        } catch (err) {
          logFirestoreWarning(err, OperationType.UPDATE, `users/${newUserId}`);
        }
      }
    }
  };

  const changeProPlan = (plan: 'gratuito' | 'pro_destaque') => {
    const activatedAt = new Date().toISOString();
    const payload = { plan, planActivatedAt: activatedAt, updatedAt: activatedAt };
    setCurrentUser(prev => ({ ...prev, ...payload }));
    setProfessionals(prev => prev.map(p => {
      if (p.id === currentUser.id || p.email === currentUser.email) {
        return { ...p, ...payload };
      }
      return p;
    }));
    setAllUsers(prev => prev.map(u => {
      if (u.id === currentUser.id || u.email === currentUser.email) {
        return { ...u, ...payload };
      }
      return u;
    }));
    if (auth.currentUser && currentUser.id && currentUser.id !== 'guest-client') {
      try {
        setDoc(doc(db, 'users', currentUser.id), payload, { merge: true }).catch(() => {});
        setDoc(doc(db, 'professionals', currentUser.id), payload, { merge: true }).catch(() => {});
        setDoc(doc(db, 'professionals_public', currentUser.id), { ...payload, name: currentUser.name || 'Profissional' }, { merge: true }).catch(() => {});
      } catch (e) {}
    }
  };

  const subscribeToPlan = (planType: ProSubscriptionPlan, bypassBalance = true): { success: boolean; message: string } => {
    if (currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Para ativar ou renovar o seu pacote, submeta o comprovativo de pagamento para validação e aprovação pelo Administrador.'
      };
    }

    if (!isValidPaidPlanKey(planType)) {
      return { success: false, message: 'Selecione um plano válido (Semanal, Mensal ou Trimestral).' };
    }

    const planInfo = PLAN_PRICES[planType];

    const currentBalance = currentUser.walletBalanceKz || 0;
    if (!bypassBalance && currentBalance < planInfo.priceKz) {
      return {
        success: false,
        message: `Saldo insuficiente na sua carteira. O plano de ${planInfo.label} custa ${planInfo.priceKz.toLocaleString('pt-AO')} Kz, mas dispõe de ${currentBalance.toLocaleString('pt-AO')} Kz.`
      };
    }

    const now = new Date();
    let baseDate = now;
    if (currentUser.planExpiresAt && currentUser.subscriptionPlan !== 'free_trial') {
      const existingExp = new Date(currentUser.planExpiresAt);
      if (existingExp > now) {
        baseDate = existingExp;
      }
    }

    const startedAtIso = now.toISOString();
    const newExpiresAt = new Date(baseDate.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
    const updatedBalance = bypassBalance ? currentBalance : currentBalance - planInfo.priceKz;
    const planUpdatePayload = {
      walletBalanceKz: updatedBalance,
      subscriptionPlan: planType,
      planStartedAt: startedAtIso,
      planExpiresAt: newExpiresAt,
      subscriptionStatus: 'ACTIVE' as const,
      updatedAt: startedAtIso
    };

    setCurrentUser(prev => ({
      ...prev,
      ...planUpdatePayload
    }));

    setProfessionals(prev => prev.map(p => {
      if (p.id === currentUser.id || p.email === currentUser.email) {
        return { ...p, ...planUpdatePayload };
      }
      return p;
    }));

    setAllUsers(prev => prev.map(u => {
      if (u.id === currentUser.id || u.email === currentUser.email) {
        return { ...u, ...planUpdatePayload };
      }
      return u;
    }));

    const newTx: WalletTransaction = {
      id: `tx-plan-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      type: 'payment',
      planId: planType,
      amountKz: planInfo.priceKz,
      planDurationDays: planInfo.days,
      subscriptionStartedAt: startedAtIso,
      subscriptionExpiresAt: newExpiresAt,
      status: 'concluido',
      createdAt: startedAtIso,
      description: `Ativação de ${planInfo.description} - Plataforma J Smart`
    };

    pendingWriteIdsRef.current.add(newTx.id);
    setAllWalletTransactions(prev => [newTx, ...prev]);

    if (currentUser.id && currentUser.id !== 'guest-client' && auth.currentUser) {
      try {
        setDoc(doc(db, 'users', currentUser.id), planUpdatePayload, { merge: true }).catch(() => {});
        setDoc(doc(db, 'professionals', currentUser.id), planUpdatePayload, { merge: true }).catch(() => {});
        setDoc(doc(db, 'professionals_public', currentUser.id), {
          subscriptionPlan: planType,
          planStartedAt: startedAtIso,
          planExpiresAt: newExpiresAt,
          subscriptionStatus: 'ACTIVE',
          name: currentUser.name || 'Profissional'
        }, { merge: true }).catch(() => {});
        setDoc(doc(db, 'wallet_transactions', newTx.id), newTx)
          .then(() => pendingWriteIdsRef.current.delete(newTx.id))
          .catch(() => {});
      } catch (e) {}
    }

    addNotification({
      userId: currentUser.id,
      targetRoleScope: 'profissional',
      title: '💳 Pagamento de Plano Confirmado',
      message: `O seu ${planInfo.fullLabel} (${planInfo.durationLabel}) foi ativado com sucesso até ${new Date(newExpiresAt).toLocaleDateString('pt-AO')}.`,
      type: 'pagamento_confirmado'
    });

    logAdminAction('Ativação de Plano Profissional', currentUser.id, `${planInfo.description}`);

    return {
      success: true,
      message: `${planInfo.fullLabel} (${planInfo.durationLabel}) ativado e liberado com sucesso!`
    };
  };

  const adminUnlockProPlan = async (proId: string, planType: ProSubscriptionPlan): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem liberar planos.' };
    }

    if (!isValidPaidPlanKey(planType)) {
      return { success: false, message: 'Plano inválido. Utilize apenas Semanal (14d), Mensal (30d) ou Trimestral (90d).' };
    }

    const planInfo = PLAN_PRICES[planType];
    const existingPro = professionals.find(p => p.id === proId) || allUsers.find(u => u.id === proId);
    const now = new Date();
    let baseDate = now;
    if (existingPro?.planExpiresAt && existingPro.subscriptionPlan !== 'free_trial') {
      const existingExp = new Date(existingPro.planExpiresAt);
      if (!Number.isNaN(existingExp.getTime()) && existingExp > now) {
        baseDate = existingExp;
      }
    }

    const startedAtIso = now.toISOString();
    const newExpiresAt = new Date(baseDate.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
    const planPayload = {
      subscriptionPlan: planType,
      planStartedAt: startedAtIso,
      planExpiresAt: newExpiresAt,
      subscriptionStatus: 'ACTIVE' as const,
      updatedAt: startedAtIso
    };

    try {
      await setDoc(doc(db, 'professionals', proId), planPayload, { merge: true });
      await setDoc(doc(db, 'professionals_public', proId), { ...planPayload, name: existingPro?.name || 'Profissional' }, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'users', proId), planPayload, { merge: true });

      setProfessionals(prev => prev.map(p => (p.id === proId ? { ...p, ...planPayload } : p)));
      setAllUsers(prev => prev.map(u => (u.id === proId ? { ...u, ...planPayload } : u)));

      if (currentUser.id === proId) {
        setCurrentUser(prev => ({ ...prev, ...planPayload }));
      }

      addNotification({
        userId: proId,
        targetRoleScope: 'profissional',
        title: '🎉 Subscrição Ativada pela Administração',
        message: `O seu ${planInfo.fullLabel} (${planInfo.durationLabel} — ${planInfo.priceStr}) foi ativado! Válido de ${new Date(startedAtIso).toLocaleDateString('pt-AO')} até ${new Date(newExpiresAt).toLocaleDateString('pt-AO')}.`,
        type: 'pagamento_confirmado'
      });

      await logAdminAction(
        'Liberação de Pacote pelo Admin',
        proId,
        `${planInfo.description} ativado até ${new Date(newExpiresAt).toLocaleDateString('pt-AO')}`
      );

      return { success: true, message: `${planInfo.fullLabel} (${planInfo.durationLabel}) liberado com sucesso na base de dados!` };
    } catch (err: any) {
      console.error('Erro ao liberar plano no Firestore:', err);
      return { success: false, message: `Falha ao persistir liberação de plano: ${err.message || err}` };
    }
  };

  // Wallet & Payment Actions (Strictly Pending until Verified by Admin)
  const addWalletDeposit = (amountKz: number, method: string) => {
    const uid = firebaseAuthUid || auth.currentUser?.uid || currentUser.id;
    if (!uid || uid === 'guest-client' || !Number.isFinite(amountKz) || amountKz <= 0) return;

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId: uid,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userRole: currentUser.role,
      type: 'deposit',
      amountKz,
      description: `Pedido de Carregamento de Carteira via ${method}`,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      paymentMethod: method
    };

    pendingWriteIdsRef.current.add(newTx.id);
    setAllWalletTransactions(prev => [newTx, ...prev]);

    if (auth.currentUser) {
      try {
        setDoc(doc(db, 'wallet_transactions', newTx.id), newTx)
          .then(() => pendingWriteIdsRef.current.delete(newTx.id))
          .catch(() => {});
      } catch (e) {}
    }

    addNotification({
      userId: 'admin',
      targetRoleScope: 'admin',
      title: '💳 Novo Pedido de Carregamento Pendente',
      message: `${currentUser.name} submeteu um pedido de carregamento de ${amountKz.toLocaleString('pt-AO')} Kz via ${method}. Aguarda validação administrativa.`,
      type: 'pagamento_confirmado'
    });
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
    const safeProofUrl = sanitizeMediaUrl(params.proofUrl, { allowPdfData: true });
    if (!safeProofUrl) {
      return {
        success: false,
        message: 'É obrigatório selecionar um ficheiro de comprovativo válido (imagem ou PDF) antes de submeter.'
      };
    }

    const uid = firebaseAuthUid || auth.currentUser?.uid || currentUser.id;
    if (!uid || uid === 'guest-client') {
      return {
        success: false,
        message: 'Inicie sessão antes de enviar comprovativos de pagamento.'
      };
    }

    let authoritativeAmountKz = Number(params.amountKz);
    let planDurationDays: number | undefined;

    if (params.planId) {
      if (!isValidPaidPlanKey(params.planId)) {
        return {
          success: false,
          message: 'O plano selecionado já não se encontra disponível. Escolha Semanal (1.500 Kz), Mensal (3.000 Kz) ou Trimestral (8.000 Kz).'
        };
      }
      const canonicalPlan = PLAN_PRICES[params.planId];
      authoritativeAmountKz = canonicalPlan.priceKz;
      planDurationDays = canonicalPlan.days;
    }

    if (!Number.isFinite(authoritativeAmountKz) || authoritativeAmountKz <= 0) {
      return {
        success: false,
        message: 'O valor do pagamento deve ser superior a 0 Kz.'
      };
    }

    const txId = `tx-proof-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newTx: WalletTransaction = {
      id: txId,
      userId: uid,
      userName: currentUser.name,
      userPhone: currentUser.phone,
      userRole: currentUser.role,
      type: params.type,
      amountKz: authoritativeAmountKz,
      description: params.description,
      paymentMethod: params.paymentMethod,
      proofUrl: safeProofUrl,
      ...(params.proofFileName ? { proofFileName: params.proofFileName } : {}),
      ...(params.proofFileType ? { proofFileType: params.proofFileType } : {}),
      ...(params.proofFileSize !== undefined ? { proofFileSize: params.proofFileSize } : {}),
      ...(params.proofNote ? { proofNote: params.proofNote } : {}),
      ...(params.planId ? { planId: params.planId } : {}),
      ...(planDurationDays ? { planDurationDays } : {}),
      status: 'pendente',
      createdAt: nowIso
    };

    pendingWriteIdsRef.current.add(txId);
    setAllWalletTransactions(prev => [newTx, ...prev]);

    if (auth.currentUser) {
      try {
        setDoc(doc(db, 'wallet_transactions', txId), newTx)
          .then(() => pendingWriteIdsRef.current.delete(txId))
          .catch((err) => {
            logFirestoreWarning(err, OperationType.CREATE, `wallet_transactions/${txId}`);
          });
      } catch (e) {}
    }

    addNotification({
      userId: uid,
      targetRoleScope: currentUser.role === 'profissional' ? 'profissional' : 'cliente',
      title: '⏳ Comprovativo Submetido (Aguardando Aprovação)',
      message: `O seu comprovativo de ${authoritativeAmountKz.toLocaleString('pt-AO')} Kz (${params.description}) foi enviado em segurança ao Administrador. A subscrição ficará ativa assim que o pagamento for validado.`,
      type: 'pagamento_confirmado'
    });

    addNotification({
      userId: 'admin',
      targetRoleScope: 'admin',
      title: '💳 Novo Comprovativo Pendente (Aprovação Necessária)',
      message: `${currentUser.name} enviou comprovativo de ${authoritativeAmountKz.toLocaleString('pt-AO')} Kz (${params.description}). Aceda ao Painel de Administrador para validar e aprovar.`,
      type: 'pagamento_confirmado'
    });

    if (currentUser.role === 'admin') {
      logAdminAction('Envio de Comprovativo de Pagamento', uid, `Valor: ${authoritativeAmountKz.toLocaleString('pt-AO')} Kz - ${params.description}`);
    }

    return {
      success: true,
      message: 'Comprovativo enviado com segurança! A subscrição permanecerá pendente até aprovação do Administrador.'
    };
  };

  const approvePaymentTransaction = async (txId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada.' };
    }

    const tx = allWalletTransactions.find(t => t.id === txId);
    if (!tx) return { success: false, message: 'Transação não encontrada.' };
    if (tx.status === 'concluido') {
      return { success: false, message: 'Este pagamento já foi aprovado anteriormente.' };
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let startedAtIso: string | undefined;
    let expiresAtIso: string | undefined;
    let resolvedDays: number | undefined;

    if (tx.planId) {
      const planInfo = getPlanDisplayInfo(tx.planId);
      resolvedDays = planInfo.days;
      const existingPro = professionals.find(p => p.id === tx.userId) || allUsers.find(u => u.id === tx.userId);
      let baseDate = now;
      if (existingPro?.planExpiresAt && existingPro.subscriptionPlan !== 'free_trial') {
        const existingExp = new Date(existingPro.planExpiresAt);
        if (!Number.isNaN(existingExp.getTime()) && existingExp > now) {
          baseDate = existingExp;
        }
      }
      startedAtIso = nowIso;
      expiresAtIso = new Date(baseDate.getTime() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
    }

    const updateTxPayload: Partial<WalletTransaction> = {
      status: 'concluido',
      reviewedBy: currentUser.id,
      reviewedAt: nowIso,
      updatedAt: nowIso,
      ...(resolvedDays ? { planDurationDays: resolvedDays } : {}),
      ...(startedAtIso ? { subscriptionStartedAt: startedAtIso } : {}),
      ...(expiresAtIso ? { subscriptionExpiresAt: expiresAtIso } : {})
    };

    try {
      await setDoc(doc(db, 'wallet_transactions', txId), updateTxPayload, { merge: true });

      setAllWalletTransactions(prev => prev.map(t => (t.id === txId ? { ...t, ...updateTxPayload } : t)));

      if (tx.planId) {
        if (isValidPaidPlanKey(tx.planId)) {
          await adminUnlockProPlan(tx.userId, tx.planId);
        } else if (expiresAtIso && startedAtIso) {
          const legacyPayload = {
            subscriptionPlan: tx.planId,
            planStartedAt: startedAtIso,
            planExpiresAt: expiresAtIso,
            subscriptionStatus: 'ACTIVE' as const,
            updatedAt: nowIso
          };
          await setDoc(doc(db, 'professionals', tx.userId), legacyPayload, { merge: true });
          await setDoc(doc(db, 'professionals_public', tx.userId), legacyPayload, { merge: true }).catch(() => {});
          await setDoc(doc(db, 'users', tx.userId), legacyPayload, { merge: true });
        }
      } else if (tx.type === 'deposit') {
        const userTarget = allUsers.find(u => u.id === tx.userId);
        const newBalance = (userTarget?.walletBalanceKz || 0) + tx.amountKz;
        await setDoc(doc(db, 'users', tx.userId), { walletBalanceKz: newBalance }, { merge: true });
        await setDoc(doc(db, 'professionals', tx.userId), { walletBalanceKz: newBalance }, { merge: true });

        setCurrentUser(prev => (prev.id === tx.userId ? { ...prev, walletBalanceKz: newBalance } : prev));
        setAllUsers(prev => prev.map(u => (u.id === tx.userId ? { ...u, walletBalanceKz: newBalance } : u)));
        setProfessionals(prev => prev.map(p => (p.id === tx.userId ? { ...p, walletBalanceKz: newBalance } : p)));
      }

      const planLabel = tx.planId ? getPlanDisplayInfo(tx.planId).label : 'Carregamento';
      addNotification({
        userId: tx.userId,
        targetRoleScope: tx.planId ? 'profissional' : 'todos',
        title: '🎉 Pagamento Aprovado com Sucesso!',
        message: tx.planId && expiresAtIso
          ? `O Administrador aprovou o seu pagamento de ${tx.amountKz.toLocaleString('pt-AO')} Kz (${planLabel}). A sua subscrição está ativa até ${new Date(expiresAtIso).toLocaleDateString('pt-AO')}.`
          : `O Administrador confirmou o seu comprovativo e aprovou o pagamento de ${tx.amountKz.toLocaleString('pt-AO')} Kz. O saldo já está disponível na sua carteira.`,
        type: 'pagamento_confirmado'
      });

      await logAdminAction(
        'Aprovação de Pagamento',
        tx.userId,
        `Pagamento ID ${txId} (${tx.amountKz.toLocaleString('pt-AO')} Kz${tx.planId ? ` • ${planLabel}` : ''}) APROVADO`
      );

      return { success: true, message: 'Pagamento aprovado e subscrição ativada com sucesso na base de dados!' };
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

    const nowIso = new Date().toISOString();
    const rejectPayload: Partial<WalletTransaction> = {
      status: 'rejeitado',
      rejectionReason: reason,
      reviewedBy: currentUser.id,
      reviewedAt: nowIso,
      updatedAt: nowIso
    };

    try {
      await setDoc(doc(db, 'wallet_transactions', txId), rejectPayload, { merge: true });

      setAllWalletTransactions(prev => prev.map(t => (t.id === txId ? { ...t, ...rejectPayload } : t)));

      addNotification({
        userId: tx.userId,
        targetRoleScope: tx.planId ? 'profissional' : 'todos',
        title: '❌ Comprovativo Rejeitado pelo Administrador',
        message: `O seu comprovativo de pagamento de ${tx.amountKz.toLocaleString('pt-AO')} Kz foi rejeitado pelo Administrador. Motivo: ${reason || 'Comprovativo não identificado no extrato bancário.'} A subscrição não foi ativada.`,
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
    const uid = firebaseAuthUid || auth.currentUser?.uid || currentUser.id;
    const availableBalance = currentUser.walletBalanceKz || 0;
    if (!uid || uid === 'guest-client' || !Number.isFinite(amountKz) || amountKz <= 0 || amountKz > availableBalance) {
      return;
    }

    const newTx: WalletTransaction = {
      id: `tx-${Date.now()}`,
      userId: uid,
      userName: currentUser.name,
      userRole: currentUser.role,
      type: 'withdrawal',
      amountKz,
      description: `Pedido de Levantamento para IBAN: ${iban}`,
      status: 'pendente',
      createdAt: new Date().toISOString(),
      iban
    };

    pendingWriteIdsRef.current.add(newTx.id);
    setAllWalletTransactions(prev => [newTx, ...prev]);

    if (auth.currentUser) {
      try {
        setDoc(doc(db, 'wallet_transactions', newTx.id), newTx)
          .then(() => pendingWriteIdsRef.current.delete(newTx.id))
          .catch(() => {});
      } catch (e) {}
    }

    addNotification({
      userId: 'admin',
      targetRoleScope: 'admin',
      title: '🏦 Novo Pedido de Levantamento',
      message: `${currentUser.name} solicitou o levantamento de ${amountKz.toLocaleString('pt-AO')} Kz para IBAN ${iban}.`,
      type: 'pagamento_confirmado'
    });
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
      ...(requestId ? { requestId } : {}),
      status: 'pendente',
      createdAt: new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
    try {
      setDoc(doc(db, 'reports', newReport.id), newReport).catch(err => {
        logFirestoreWarning(err, OperationType.WRITE, `reports/${newReport.id}`);
      });
    } catch (e) {}
  };

  const blockUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
    if (currentUser.role !== 'admin') {
      return { success: false, message: 'Permissão negada. Apenas administradores podem suspender contas.' };
    }

    const target = allUsers.find(u => u.id === userId) || professionals.find(p => p.id === userId);
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
      await setDoc(doc(db, 'professionals_public', userId), {
        ...blockPayload,
        verified: false,
        documentsVerified: false,
        isAutoApproved: false,
        name: target?.name || 'Profissional'
      }, { merge: true }).catch(() => {});

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

    const target = allUsers.find(u => u.id === userId) || professionals.find(p => p.id === userId);
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
      await setDoc(doc(db, 'professionals_public', userId), {
        blocked: false,
        accountStatus: 'ACTIVE',
        status: 'disponivel',
        verified: true,
        documentsVerified: true,
        isAutoApproved: true,
        name: target?.name || 'Profissional'
      }, { merge: true }).catch(() => {});

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

    const target = allUsers.find(u => u.id === userId) || professionals.find(p => p.id === userId);
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
      await setDoc(doc(db, 'users', userId), deletedPayload, { merge: true });
      await setDoc(doc(db, 'professionals', userId), deletedPayload, { merge: true });
      await setDoc(doc(db, 'professionals_public', userId), {
        isDeleted: true,
        status: 'deleted',
        name: target?.name || 'Profissional'
      }, { merge: true }).catch(() => {});

      await logAdminAction(
        'Exclusão de Conta (Soft Delete)', 
        userId, 
        `Conta de ${target?.name || userId} (${target?.role || 'utilizador'}) excluída definitivamente na base de dados`
      );

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
    const target = allUsers.find(u => u.id === userId) || professionals.find(p => p.id === userId);
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
      if (newAccountType === 'profissional' || newAccountType === 'duplo') {
        await setDoc(doc(db, 'professionals_public', userId), {
          accountType: newAccountType,
          role: 'profissional',
          name: target?.name || 'Profissional'
        }, { merge: true }).catch(() => {});
      }

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
      const targetPro = professionals.find(p => p.id === userId) || allUsers.find(u => u.id === userId);
      await setDoc(doc(db, 'users', userId), { categories: sanitized }, { merge: true });
      await setDoc(doc(db, 'professionals', userId), { categories: sanitized }, { merge: true });
      await setDoc(doc(db, 'professionals_public', userId), { categories: sanitized, name: targetPro?.name || 'Profissional' }, { merge: true }).catch(() => {});

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
      'seguranca', 'vigilante', 'tatuad', 'barbeir', 'serralh', 'marceneir', 'moveis', 'estofad',
      'elevador', 'atendimento', 'recepcao'
    ];

    let fixedCount = 0;

    for (const pro of professionals) {
      if (isFictitiousOrInvalidUser(pro)) continue;
      const cats = Array.isArray(pro.categories) ? pro.categories : [];
      if (cats.length === 0) continue;

      const hasEletricista = cats.includes('eletricista') || cats.includes('electricista');
      if (!hasEletricista) continue;

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
              await setDoc(doc(db, 'professionals_public', pro.id), { categories: correctedCats, name: pro.name || 'Profissional' }, { merge: true }).catch(() => {});
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

    const safeSettings = sanitizePlatformSettings({ ...platformSettings, ...newSettings });
    const safePatch = sanitizePlatformSettings(newSettings as PlatformSettings);
    setPlatformSettings(safeSettings);

    try {
      await setDoc(doc(db, 'platform_settings', 'global_config'), safePatch, { merge: true });
      await logAdminAction('Atualização de Configurações da Plataforma', undefined, JSON.stringify(safePatch));
      return { success: true, message: 'Configurações atualizadas e sincronizadas no Firestore com sucesso!' };
    } catch (err: any) {
      console.error('Erro ao guardar configurações no Firestore:', err);
      return { success: false, message: `Falha ao persistir definições no Firestore: ${err.message || err}` };
    }
  };

  const updateCodeOfConductRules = (newRules: CodeOfConductSection[]) => {
    setCodeOfConductRules(newRules);
    safeStorageSet(`${LOCAL_STORAGE_KEY}_code_of_conduct`, JSON.stringify(newRules));
    try {
      setDoc(doc(db, 'platform_settings', 'code_of_conduct'), { rules: newRules, updatedAt: new Date().toISOString() }, { merge: true }).catch(err => {
        console.warn('Erro ao guardar código de conduta no Firestore:', err);
      });
    } catch (e) {}
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
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_user`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_cats`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_pros`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_users`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_reqs`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_msgs`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_revs`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_txs`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_reports`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_settings`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_feed_posts`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_notifications`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_audit_logs`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_code_of_conduct`);
    safeStorageRemove(`${LOCAL_STORAGE_KEY}_is_logged_in`);

    signOut(auth).catch(() => {});
    setFirebaseAuthUid(null);
    setAllUsers(MOCK_USERS.filter(u => !isFictitiousOrInvalidUser(u)).map(u => stripSensitiveFields(u)));
    setProfessionals(MOCK_PROFESSIONALS.filter(p => !isFictitiousOrInvalidUser(p)).map(p => stripSensitiveFields(p)));
    setWorkFeedPosts([]);
    setCurrentUser(CLEAN_GUEST_USER);
    setIsLoggedIn(false);
    setCategories(CATEGORIES);
    setRequests([]);
    setMessages([]);
    setReviews([]);
    setAllWalletTransactions([]);
    setReports([]);
    setPlatformSettings(sanitizePlatformSettings(DEFAULT_SETTINGS));
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
      migrateLegacyAccountsPhoneIndexAsync,
      sendAdminVerificationEmailAsync,
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
      canPerformRequestAction,
      acceptServiceRequest,
      releaseServiceRequestWithoutAgreement,
      canChatInRequest,
      isMobileFrame,
      setIsMobileFrame,
      isTestSuiteOpen,
      setIsTestSuiteOpen,
      isOnline,
      setIsOnline,
      syncStatus,
      isSyncing: syncStatus === 'syncing',
      lastSyncTimestamp,
      forceSyncWithFirestore,
      refreshWorkFeed,
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
