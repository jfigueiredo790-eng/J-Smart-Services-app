export type UserRole = 'cliente' | 'profissional' | 'admin';
export type AccountType = 'cliente' | 'profissional' | 'duplo';

export type AdminSubRole = 'super_admin' | 'atendimento' | 'gestao_profissionais' | 'financeiro';

export type RequestStatus = 'pendente' | 'novamente_disponivel' | 'aceito' | 'em_negociacao' | 'em_progresso' | 'concluido' | 'cancelado';

export type UrgencyLevel = 'Normal' | 'Urgente' | 'Agendado';

export type ProSubscriptionPlan = 'free_trial' | 'plan_7d' | 'plan_14d' | 'plan_30d';

export interface WorkFeedPost {
  id: string;
  professionalId: string;
  professionalName: string;
  professionalAvatar: string;
  professionalVerified: boolean;
  professionalCategories: string[];
  mediaUrl: string;
  mediaType: 'image' | 'video';
  description: string;
  categoryName: string;
  categoryId?: string;
  likesCount: number;
  likedBy: string[];
  reactions?: Record<string, string>; // userId -> emoji (ex: '❤️', '👍', '👏', '🔥', '⭐')
  createdAt: string;
  updatedAt?: string;
  ownerId?: string;
  title?: string;
  location?: string;
  priceKz?: number;
  mediaUrls?: string[];
}

export type UserStatus = 'ativo' | 'disponivel' | 'ocupado' | 'bloqueado' | 'deleted';
export type AccountStatus = 'ACTIVE' | 'BLOCKED';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'PAGAMENTO_PENDENTE';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender?: 'masculino' | 'feminino';
  role: UserRole;
  adminSubRole?: AdminSubRole; // Sub-papeis de administracao
  accountType?: AccountType;
  avatar: string;
  province: string;
  city?: string;
  address?: string;
  documentType?: string;
  documentNumber?: string;
  password?: string;
  categories?: string[];
  verified: boolean;
  blocked?: boolean;
  accountStatus?: AccountStatus;
  subscriptionStatus?: SubscriptionStatus;
  status?: UserStatus;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  blockedAt?: string;
  blockedBy?: string;
  unblockedAt?: string;
  unblockedBy?: string;
  accountTypeChangedAt?: string;
  accountTypeChangedBy?: string;
  walletBalanceKz?: number;
  clientRequestsCount?: number;
  ownerId?: string;
  createdAt: string;
  updatedAt?: string;
  trialStartDate?: string;
  subscriptionPlan?: ProSubscriptionPlan;
  planStartedAt?: string;
  planExpiresAt?: string;
  registrationSource?: string;
  referralCode?: string;
  experienceYears?: number;
  experienceVerified?: boolean;
}

export interface ProfessionalProfile extends User {
  categories: string[]; // Category IDs e.g. 'eletricista', 'ar-condicionado'
  bio: string;
  experienceYears: number;
  experienceVerified?: boolean;
  hourlyRateKz: number;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  documentsVerified: boolean;
  isAutoApproved?: boolean;
  portfolioImages: string[];
  status: 'disponivel' | 'ocupado' | 'bloqueado' | 'deleted' | 'ativo';
  address: string;
  documentType?: string;
  documentNumber?: string;
  plan?: 'gratuito' | 'pro_destaque';
  planActivatedAt?: string;
  trialStartDate?: string;
  subscriptionPlan?: ProSubscriptionPlan;
  planStartedAt?: string;
  planExpiresAt?: string;
  accountStatus?: AccountStatus;
  subscriptionStatus?: SubscriptionStatus;
}

export interface ServiceCategory {
  id: string;
  name: string;
  iconName: string;
  description: string;
  popularCount: number;
  color: string;
  group?: string;
  items?: string[];
  subcategories?: string[];
  imageUrl?: string;
  isActive?: boolean;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientPhone: string;
  professionalId?: string;
  professionalName?: string;
  professionalAvatar?: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  province: string;
  address: string;
  urgency: UrgencyLevel;
  scheduledDate: string;
  budgetKz: number;
  commissionAmountKz?: number;
  netProAmountKz?: number;
  status: RequestStatus;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
  isReopened?: boolean;
  previousProId?: string;
  previousProName?: string;
  acceptedAt?: string;
  reopenedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'cliente' | 'profissional' | 'admin';
  cancellationReason?: string;
  matchedProIds?: string[];
  autoMatchedCount?: number;
}

export interface ChatMessage {
  id: string;
  requestId: string;
  conversationId?: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  senderAvatar: string;
  receiverId?: string;
  text: string;
  timestamp: string;
  status?: 'enviando' | 'enviada' | 'entregue' | 'lida' | 'falhou';
  read?: boolean;
  readBy?: string[];
  isQuickQuote?: boolean;
  quotePriceKz?: number;
  imageUrl?: string;
  locationPin?: { label: string; lat?: number; lng?: number };
  participants?: string[];
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatConversation {
  id: string; // requestId ou conversationId único
  requestId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  clientPhone?: string;
  professionalId: string;
  professionalName: string;
  professionalAvatar: string;
  professionalPhone?: string;
  serviceTitle: string;
  categoryName?: string;
  province?: string;
  status: RequestStatus;
  budgetKz?: number;
  lastMessageText?: string;
  lastMessageTimestamp?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageStatus?: 'enviando' | 'enviada' | 'entregue' | 'lida' | 'falhou';
  unreadCount: number;
  participants: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CodeOfConductSection {
  id: string;
  title: string;
  targetRoleScope: 'todos' | 'cliente' | 'profissional';
  iconName: string;
  summary: string;
  items: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  targetRoleScope?: 'cliente' | 'profissional' | 'duplo' | 'admin' | 'todos';
  title: string;
  message: string;
  type: 'pedido_novo' | 'pedido_aceito' | 'pagamento_confirmado' | 'mensagem_recebida' | 'a_caminho' | 'concluido' | 'avaliacao_pendente' | 'trial_aviso' | 'plano_expira' | 'comunicado_jsmart' | 'publicacao_reacao';
  read: boolean;
  createdAt: string;
  requestId?: string;
  postId?: string;
  reaction?: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  adminName: string;
  adminRole: string;
  action: string;
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
  ownerId?: string;
}

export interface Review {
  id: string;
  requestId: string;
  professionalId: string;
  clientId: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  tags: string[];
  date: string;
  categoryName: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TransactionType = 'deposit' | 'payment' | 'commission' | 'withdrawal' | 'earning';

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  userPhone?: string;
  userRole: UserRole;
  type: TransactionType;
  amountKz: number;
  description: string;
  requestId?: string;
  planId?: ProSubscriptionPlan;
  proofUrl?: string;
  proofFileName?: string;
  proofFileType?: string;
  proofFileSize?: number;
  proofNote?: string;
  rejectionReason?: string;
  status: 'concluido' | 'pendente' | 'rejeitado';
  createdAt: string;
  updatedAt?: string;
  paymentMethod?: string;
  iban?: string;
  ownerId?: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  details: string;
  requestId?: string;
  status: 'pendente' | 'resolvido' | 'bloqueado';
  createdAt: string;
  updatedAt?: string;
  ownerId?: string;
}

export interface PlatformSettings {
  commissionRatePercent: number; // e.g. 10
  minWithdrawalKz: number; // e.g. 5000
  autoApprovePros: boolean; // default true
  companyName?: string;
  adminHolderName?: string;
  adminEmail?: string;
  adminPhoneWhatsapp?: string;
  adminPhoneExpress?: string;
  adminBankName?: string;
  adminIban?: string;
  adminProvince?: string;
  adminCity?: string;
  adminPin?: string; // Default 'admin123'
}

export const ANGOLA_PROVINCES = [
  'Luanda',
  'Icolo e Bengo',
  'Benguela',
  'Huambo',
  'Huíla (Lubango)',
  'Cabinda',
  'Cuanza Sul (Sumbe)',
  'Cuanza Norte (Ndalatando)',
  'Uíge',
  'Malanje',
  'Namibe',
  'Bengo',
  'Zaire (Mbanza Kongo)',
  'Lunda Norte',
  'Lunda Sul',
  'Moxico',
  'Bié',
  'Cuando Cubango',
  'Cunene'
];

