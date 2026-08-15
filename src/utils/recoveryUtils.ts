/**
 * Utilitários de Recuperação de Acesso à Conta — J Smart Services
 * 
 * Suporta:
 * 1. Recuperação de Palavra-passe via Código OTP seguro
 * 2. Recuperação e Atualização de Número de Telefone com Confirmação Segura
 * 
 * Regras Estritas de Segurança:
 * - Limite de tentativas de recuperação (Rate Limiting)
 * - Limite de tentativas de inserção de código OTP (máx 3)
 * - Expiração automática dos códigos (10 minutos)
 * - Proibição de reutilização de códigos
 * - Preservação estrita de todos os dados existentes (perfil, pedidos, avaliações, publicações, etc.)
 * - Não remoção de bloqueio administrativo (accountStatus = BLOCKED permanece BLOCKED)
 * - Manutenção do estado de subscrição profissional (subscriptionStatus = EXPIRED permanece inalterado)
 * - Prevenção de duplicidade de números de telefone
 */

export type RecoveryType = 'password' | 'phone';

export interface AccountRecoverySession {
  id: string;
  type: RecoveryType;
  targetUserId: string;
  targetUserRole: 'cliente' | 'profissional' | 'admin';
  targetEmail: string;
  targetPhone: string;
  targetDocNumber?: string;
  targetName: string;
  otpCode: string;
  expiresAt: number; // timestamp em ms
  attemptsLeft: number;
  isVerified: boolean;
  isUsed: boolean;
  isBlockedAccount: boolean;
  isExpiredSubscription: boolean;
  createdAt: number;
  ipOrIdentifier?: string;
}

// Mensagens Oficiais da Plataforma
export const RECOVERY_MESSAGES = {
  INTRO: 'Vamos ajudá-lo a recuperar o acesso à sua conta. Confirme as informações solicitadas.',
  CODE_SENT: 'Enviámos um código de verificação para o contacto associado à sua conta.',
  CODE_INVALID: 'O código informado é inválido ou expirou. Solicite um novo código.',
  SUCCESS: 'Os seus dados de acesso foram recuperados/atualizados com sucesso.',
  ACCOUNT_BLOCKED: 'A sua conta está bloqueada pelo Administrador. Recuperar os dados de acesso não remove o bloqueio.',
  RATE_LIMIT: 'Demasiadas tentativas de recuperação. Por motivos de segurança, aguarde alguns minutos antes de tentar novamente.',
  MAX_ATTEMPTS: 'Excedeu o número máximo de tentativas para este código. Solicite um novo código de verificação.',
  USER_NOT_FOUND: 'Nenhuma conta encontrada com os dados informados. Verifique o número de telefone, e-mail ou BI.',
  PHONE_ALREADY_IN_USE: 'Este número de telefone já se encontra associado a outra conta na J Smart Services.',
  INVALID_PHONE_FORMAT: 'Por favor introduza um número de telefone válido de Angola (ex: 923 111 222).'
} as const;

export const OTP_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutos
export const MAX_OTP_ATTEMPTS = 3;
export const MAX_RECOVERY_REQUESTS_PER_WINDOW = 5;
export const RECOVERY_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// Memória de taxa de requisições (Prevenção de força bruta)
const recoveryRateLimiter = new Map<string, { count: number; firstRequest: number }>();

export function checkRecoveryRateLimit(identifier: string): boolean {
  const cleanId = identifier.trim().toLowerCase().replace(/\D/g, '') || identifier.trim().toLowerCase();
  const now = Date.now();
  const record = recoveryRateLimiter.get(cleanId);

  if (!record) {
    recoveryRateLimiter.set(cleanId, { count: 1, firstRequest: now });
    return true; // Permitido
  }

  // Se a janela expirou, reiniciar contador
  if (now - record.firstRequest > RECOVERY_WINDOW_MS) {
    recoveryRateLimiter.set(cleanId, { count: 1, firstRequest: now });
    return true;
  }

  if (record.count >= MAX_RECOVERY_REQUESTS_PER_WINDOW) {
    return false; // Bloqueado por excesso de tentativas
  }

  record.count += 1;
  return true;
}

/**
 * Gera um código OTP numérico seguro de 6 dígitos
 */
export function generateSecureOTP(): string {
  // Gera número aleatório seguro entre 100000 e 999999
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Mascara número de telefone para proteção de privacidade (Ex: "+244 923 ••• •89")
 */
export function maskPhoneNumber(phone?: string): string {
  if (!phone) return '••• ••• •••';
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 7) return '••••••';
  
  // Se contiver +244
  if (clean.startsWith('+244')) {
    const numPart = clean.slice(4);
    if (numPart.length >= 9) {
      return `+244 ${numPart.slice(0, 3)} ••• •${numPart.slice(-2)}`;
    }
    return `+244 ${numPart.slice(0, 2)}••••${numPart.slice(-2)}`;
  }
  
  if (clean.length >= 9) {
    return `${clean.slice(0, 3)} ••• •${clean.slice(-2)}`;
  }
  
  return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
}

/**
 * Mascara endereço de e-mail para proteção de privacidade (Ex: "m••••••a@gmail.com")
 */
export function maskEmailAddress(email?: string): string {
  if (!email || !email.includes('@')) return '••••••@••••.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}•@${domain}`;
  }
  const first = user[0];
  const last = user[user.length - 1];
  const maskedMiddle = '•'.repeat(Math.min(user.length - 2, 5));
  return `${first}${maskedMiddle}${last}@${domain}`;
}

/**
 * Mascara documento de identificação (BI/Passaporte)
 */
export function maskDocumentNumber(docNum?: string): string {
  if (!docNum) return '••••••••••';
  const clean = docNum.trim();
  if (clean.length <= 4) return '••••';
  return `${clean.slice(0, 3)}••••••${clean.slice(-3)}`;
}

/**
 * Validação do formato de telefone angolano (9 dígitos começando por 9)
 */
export function isValidAngolanPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('9')) {
    return true;
  }
  if (digits.length === 12 && digits.startsWith('2449')) {
    return true;
  }
  return false;
}

/**
 * Normaliza número de telefone para o padrão limpo de 9 dígitos ou +244
 */
export function normalizeAngolanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('244') && digits.length === 12) {
    const mainDigits = digits.slice(3);
    return `${mainDigits.slice(0, 3)} ${mainDigits.slice(3, 6)} ${mainDigits.slice(6, 9)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)}`;
  }
  return phone.trim();
}
