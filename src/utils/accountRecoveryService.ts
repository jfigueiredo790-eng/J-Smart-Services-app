import {
  Auth,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  signOut
} from 'firebase/auth';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import {
  AccountRecoveryMatchedAccount,
  AccountRecoveryOrigin,
  AccountRecoveryRequest,
  AccountRecoveryStatus,
  ProfessionalProfile,
  User
} from '../types';
import {
  OFFICIAL_ADMIN_EMAIL,
  areSamePhoneNumber,
  getPublicUserEmail,
  isOfficialAdminPhone,
  isSyntheticPhoneAuthEmail,
  isValidLoginEmail,
  normalizePhoneNumber,
  validateStrictAngolaPhone
} from './phoneAuthUtils';
import {
  checkRecoveryRateLimit,
  maskEmailAddress,
  maskPhoneNumber
} from './recoveryUtils';
import {
  isProtectedAdminAccount,
  looksLikeFirebaseAuthUid
} from './legacyMigrationService';
import { OFFICIAL_APP_URL } from '../config/domain';

/**
 * Mensagem genérica obrigatória após submissão de pedido de recuperação.
 * Nunca revela se o número ou e-mail existe na base de dados (anti-enumeração).
 */
export const MANDATORY_RECOVERY_GENERIC_MESSAGE =
  'O seu pedido de recuperação foi recebido. Aguarde a verificação da sua conta pelo administrador da J Smart Services. Receberá uma resposta após a análise do pedido.';

export const RECOVERY_STATUS_LABELS: Record<AccountRecoveryStatus, string> = {
  pendente: 'Pendente',
  em_analise: 'Em análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Recuperação concluída'
};

export interface RecoverySubmissionInput {
  phone?: string;
  email?: string;
}

export interface ValidatedRecoverySubmission {
  isValid: boolean;
  error?: string;
  submittedPhone?: string;
  submittedEmail?: string;
  identifierType?: 'phone' | 'email' | 'both';
}

/**
 * Valida os campos alternativos do formulário "Esqueci a palavra-passe":
 * - Telefone angolano (+244 + 9 dígitos) OU
 * - Endereço de e-mail (ex: Gmail) utilizado no registo.
 * O utilizador pode preencher apenas um dos campos (ou ambos).
 */
export function validateRecoverySubmissionInput(
  input: RecoverySubmissionInput
): ValidatedRecoverySubmission {
  const rawPhone = (input.phone || '').trim();
  const rawEmail = (input.email || '').trim().toLowerCase();

  if (!rawPhone && !rawEmail) {
    return {
      isValid: false,
      error: 'Preencha o número de telefone (+244 e 9 dígitos) ou o endereço de e-mail Gmail utilizado no registo.'
    };
  }

  let validPhone: string | undefined;
  let validEmail: string | undefined;

  if (rawPhone) {
    const strictPhone = validateStrictAngolaPhone(rawPhone);
    if (!strictPhone.isValid) {
      return {
        isValid: false,
        error: 'Introduza um número de telefone angolano válido no formato +244 seguido de 9 dígitos.'
      };
    }
    validPhone = strictPhone.e164;
  }

  if (rawEmail) {
    if (!isValidLoginEmail(rawEmail) || rawEmail.length > 200) {
      return {
        isValid: false,
        error: 'Introduza um endereço de e-mail válido (ex: exemplo@gmail.com).'
      };
    }
    validEmail = rawEmail;
  }

  const identifierType: 'phone' | 'email' | 'both' =
    validPhone && validEmail ? 'both' : validPhone ? 'phone' : 'email';

  return {
    isValid: true,
    submittedPhone: validPhone,
    submittedEmail: validEmail,
    identifierType
  };
}

/**
 * Gera um identificador criptograficamente seguro compatível com as regras Firestore:
 * ^rec_[a-zA-Z0-9_-]{8,64}$
 */
export function generateRecoveryRequestId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    cryptoObj.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return `rec_${hex}`;
  }
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export interface PhoneIndexSnapshotEntry {
  id: string;
  uid: string;
  authMode?: 'phone_synthetic' | 'legacy_email';
  authEmail?: string;
  hasRealEmail?: boolean;
}

/**
 * Verificação interna (EXCLUSIVA DO ADMINISTRADOR):
 * Cruza o telefone e/ou e-mail submetidos com contas existentes (antigas migradas,
 * antigas legadas e contas novas) sem nunca expor o resultado ao utilizador comum.
 */
export function resolveRecoveryRequestAccount(
  request: Pick<AccountRecoveryRequest, 'submittedPhone' | 'submittedEmail'>,
  allUsers: User[],
  allProfessionals: ProfessionalProfile[] = [],
  phoneIndexDocs: PhoneIndexSnapshotEntry[] = []
): AccountRecoveryMatchedAccount {
  const submittedPhone = request.submittedPhone?.trim() || '';
  const submittedEmail = request.submittedEmail?.trim().toLowerCase() || '';

  // Combinar utilizadores e profissionais sem perder registos antigos/migrados
  const combinedMap = new Map<string, User>();
  for (const u of allUsers) {
    if (u?.id) combinedMap.set(u.id, u);
  }
  for (const p of allProfessionals) {
    if (p?.id && !combinedMap.has(p.id)) {
      combinedMap.set(p.id, p);
    }
  }
  const combined = Array.from(combinedMap.values());

  // Ordenar para priorizar contas ativas migradas (com UID Firebase real) antes de arquivos legados
  const prioritized = [...combined].sort((a, b) => {
    const aArchive = a.legacyArchiveOnly ? 1 : 0;
    const bArchive = b.legacyArchiveOnly ? 1 : 0;
    if (aArchive !== bArchive) return aArchive - bArchive;
    const aRealUid = looksLikeFirebaseAuthUid(a.id) ? 0 : 1;
    const bRealUid = looksLikeFirebaseAuthUid(b.id) ? 0 : 1;
    return aRealUid - bRealUid;
  });

  let matchedByPhone: User | undefined;
  let matchedByEmail: User | undefined;

  if (submittedPhone) {
    matchedByPhone = prioritized.find(u => {
      const candidatePhone = u.phoneE164 || u.phone || '';
      return candidatePhone ? areSamePhoneNumber(candidatePhone, submittedPhone) : false;
    });
  }

  if (submittedEmail) {
    matchedByEmail = prioritized.find(u => {
      const pubEmail = getPublicUserEmail(u.email).toLowerCase();
      return pubEmail && pubEmail === submittedEmail;
    });

    // Também verificar no phone_login_index caso o e-mail esteja no authEmail
    if (!matchedByEmail && phoneIndexDocs.length > 0) {
      const idxMatch = phoneIndexDocs.find(
        idx =>
          idx.authEmail &&
          !isSyntheticPhoneAuthEmail(idx.authEmail) &&
          idx.authEmail.trim().toLowerCase() === submittedEmail
      );
      if (idxMatch?.uid) {
        matchedByEmail = combinedMap.get(idxMatch.uid);
      }
    }
  }

  // Se o registo encontrado for um arquivo legado com migratedToUid, seguir para o perfil ativo migrado
  const resolveActiveRecord = (candidate?: User): User | undefined => {
    if (!candidate) return undefined;
    if (candidate.migratedToUid && combinedMap.has(candidate.migratedToUid)) {
      return combinedMap.get(candidate.migratedToUid);
    }
    return candidate;
  };

  const activePhoneMatch = resolveActiveRecord(matchedByPhone);
  const activeEmailMatch = resolveActiveRecord(matchedByEmail);

  // Detetar conflito caso o utilizador tenha submetido telefone e e-mail de contas diferentes
  if (
    activePhoneMatch &&
    activeEmailMatch &&
    activePhoneMatch.id !== activeEmailMatch.id
  ) {
    return {
      matched: false,
      matchSource: 'none',
      accountOrigin: 'none',
      hasVerifiableEmail: false,
      hasPhone: false,
      warningNote:
        'Atenção: o telefone e o e-mail informados pertencem a contas diferentes. Verificar manualmente antes de qualquer aprovação.'
    };
  }

  const matchedUser = activePhoneMatch || activeEmailMatch;

  // Caso especial: telefone ou e-mail oficial do Super Administrador
  const targetsOfficialAdmin =
    (submittedPhone && isOfficialAdminPhone(submittedPhone)) ||
    submittedEmail === OFFICIAL_ADMIN_EMAIL;

  if (!matchedUser) {
    if (targetsOfficialAdmin) {
      return {
        matched: true,
        matchSource: submittedPhone && submittedEmail ? 'both' : submittedPhone ? 'phone' : 'email',
        accountOrigin: 'protected_admin',
        holderName: 'Administrador Oficial J Smart Services',
        role: 'admin',
        phone: submittedPhone || '+244956011985',
        realEmail: OFFICIAL_ADMIN_EMAIL,
        authEmail: OFFICIAL_ADMIN_EMAIL,
        hasVerifiableEmail: true,
        hasPhone: true,
        warningNote:
          'Conta administrativa protegida. A recuperação de administradores deve ser feita apenas pelo titular através da consola oficial.'
      };
    }

    return {
      matched: false,
      matchSource: 'none',
      accountOrigin: 'none',
      hasVerifiableEmail: false,
      hasPhone: false,
      warningNote: 'Nenhuma conta correspondente encontrada no Firestore com os dados informados.'
    };
  }

  const matchSource: 'phone' | 'email' | 'both' =
    activePhoneMatch && activeEmailMatch
      ? 'both'
      : activePhoneMatch
      ? 'phone'
      : 'email';

  const normalizedPhone = normalizePhoneNumber(matchedUser.phoneE164 || matchedUser.phone || '');
  const realEmail = getPublicUserEmail(matchedUser.email).toLowerCase();

  // Procurar entrada no phone_login_index para obter o authEmail exato do Firebase Auth
  const idxEntry = phoneIndexDocs.find(idx => idx.uid === matchedUser.id);
  const authEmailFromIdx =
    idxEntry?.authEmail && !isSyntheticPhoneAuthEmail(idxEntry.authEmail)
      ? idxEntry.authEmail.trim().toLowerCase()
      : '';

  const effectiveAuthEmail = authEmailFromIdx || (isValidLoginEmail(realEmail) ? realEmail : '');
  const hasVerifiableEmail = Boolean(effectiveAuthEmail && isValidLoginEmail(effectiveAuthEmail));
  const hasPhone = normalizedPhone.isValid;

  const isAdminProtected =
    isProtectedAdminAccount(matchedUser.id, matchedUser.role, realEmail) ||
    Boolean(matchedUser.legacyUid && isProtectedAdminAccount(matchedUser.legacyUid, matchedUser.role, realEmail)) ||
    targetsOfficialAdmin;

  let accountOrigin: AccountRecoveryOrigin;
  let warningNote: string | undefined;

  if (isAdminProtected) {
    accountOrigin = 'protected_admin';
    warningNote =
      'Conta administrativa protegida. Não deve ser alterada pelo fluxo comum de clientes/profissionais.';
  } else if (!looksLikeFirebaseAuthUid(matchedUser.id)) {
    accountOrigin = 'legacy_unmigrated';
    warningNote =
      'Conta antiga ainda sem UID Firebase Authentication migrado. Requer intervenção administrativa de religação antes do envio do link de palavra-passe.';
  } else if (matchedUser.legacyUid || matchedUser.migratedFromLegacyUid) {
    accountOrigin = 'legacy_migrated';
  } else {
    accountOrigin = 'new_account';
  }

  if (!warningNote && matchedUser.isDeleted) {
    warningNote = 'Conta marcada como eliminada no sistema.';
  } else if (!warningNote && matchedUser.blocked) {
    warningNote = 'Conta bloqueada pelo administrador. A recuperação de palavra-passe não remove o bloqueio.';
  } else if (!warningNote && !hasVerifiableEmail) {
    warningNote =
      'Conta sem e-mail registado. Sem gateway SMS configurada, manter o pedido pendente até confirmação segura de identidade.';
  }

  return {
    matched: true,
    matchSource,
    accountOrigin,
    uid: matchedUser.id,
    legacyUid: matchedUser.legacyUid || matchedUser.migratedFromLegacyUid,
    holderName: matchedUser.name || 'Utilizador sem nome',
    role: matchedUser.role || 'cliente',
    accountType: matchedUser.accountType,
    phone: hasPhone ? normalizedPhone.e164 : matchedUser.phone,
    realEmail: realEmail || undefined,
    authEmail: effectiveAuthEmail || undefined,
    hasVerifiableEmail,
    hasPhone,
    isBlocked: Boolean(matchedUser.blocked),
    isDeleted: Boolean(matchedUser.isDeleted),
    warningNote
  };
}

/**
 * Submissão pública e anti-enumeração de pedido de recuperação de conta.
 * 1) Valida formato (telefone angolano +244XXXXXXXXX OU e-mail válido).
 * 2) Aplica rate-limiting no cliente e no backend (/api/v1/auth/recovery-requests).
 * 3) Persiste pedido em Firestore `account_recovery_requests/{requestId}` (write-only para público).
 * 4) Devolve SEMPRE a mensagem genérica obrigatória, sem revelar se a conta existe.
 */
export async function submitAccountRecoveryRequestPublicSafe(
  db: Firestore | null,
  input: RecoverySubmissionInput,
  options?: {
    fetchImpl?: typeof fetch;
    skipRateLimit?: boolean;
  }
): Promise<{
  success: boolean;
  requestId?: string;
  message: string;
  rateLimited?: boolean;
}> {
  const validated = validateRecoverySubmissionInput(input);
  if (!validated.isValid) {
    return {
      success: false,
      message: validated.error || 'Dados inválidos.'
    };
  }

  const rateKey = validated.submittedPhone || validated.submittedEmail || 'unknown';
  if (!options?.skipRateLimit && !checkRecoveryRateLimit(`rec_req:${rateKey}`)) {
    return {
      success: false,
      rateLimited: true,
      message: 'Demasiadas tentativas de recuperação. Por motivos de segurança, aguarde 15 minutos antes de tentar novamente.'
    };
  }

  let requestId = generateRecoveryRequestId();
  const fetcher = options?.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);

  // 1) Submeter primeiro ao backend para rate-limiting autoritativo e validação server-side
  if (fetcher) {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
      const timer = controller ? setTimeout(() => controller.abort(), 4000) : undefined;
      const resp = await fetcher('/api/v1/auth/recovery-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: validated.submittedPhone || undefined,
          email: validated.submittedEmail || undefined
        }),
        signal: controller?.signal
      });
      if (timer) clearTimeout(timer);

      if (resp.status === 429) {
        const data = await resp.json().catch(() => ({}));
        return {
          success: false,
          rateLimited: true,
          message:
            data?.message ||
            'Demasiadas tentativas de recuperação. Por motivos de segurança, aguarde 15 minutos antes de tentar novamente.'
        };
      }

      if (resp.status === 400) {
        const data = await resp.json().catch(() => ({}));
        return {
          success: false,
          message: data?.message || 'Verifique os dados introduzidos e tente novamente.'
        };
      }

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        if (typeof data?.requestId === 'string' && /^rec_[a-zA-Z0-9_-]{8,64}$/.test(data.requestId)) {
          requestId = data.requestId;
        }
      }
    } catch {
      // Continuar de forma segura para gravação direta em Firestore (write-only)
    }
  }

  // 2) Persistir o pedido em `account_recovery_requests/{requestId}` (write-only para público, leitura apenas para Admin)
  if (db) {
    const nowIso = new Date().toISOString();
    const docPayload: Record<string, unknown> = {
      id: requestId,
      identifierType: validated.identifierType,
      status: 'pendente',
      createdAt: nowIso,
      updatedAt: nowIso
    };
    if (validated.submittedPhone) {
      docPayload.submittedPhone = validated.submittedPhone;
    }
    if (validated.submittedEmail) {
      docPayload.submittedEmail = validated.submittedEmail;
    }

    try {
      await setDoc(doc(db, 'account_recovery_requests', requestId), docPayload);
    } catch (err) {
      console.warn('Falha ao gravar pedido de recuperação no Firestore:', err);
      return {
        success: false,
        message: 'Não foi possível registar o seu pedido neste momento. Verifique a sua ligação à internet e tente novamente.'
      };
    }
  }

  return {
    success: true,
    requestId,
    message: MANDATORY_RECOVERY_GENERIC_MESSAGE
  };
}

/**
 * Leitura exclusiva do Administrador de todos os pedidos de recuperação.
 */
export async function listAccountRecoveryRequestsAdminSafe(
  db: Firestore
): Promise<AccountRecoveryRequest[]> {
  const snap = await getDocs(collection(db, 'account_recovery_requests'));
  const items = snap.docs.map(d => {
    const raw = d.data() as Partial<AccountRecoveryRequest>;
    return {
      id: raw.id || d.id,
      submittedPhone: raw.submittedPhone,
      submittedEmail: raw.submittedEmail,
      identifierType: raw.identifierType || (raw.submittedPhone && raw.submittedEmail ? 'both' : raw.submittedPhone ? 'phone' : 'email'),
      status: (raw.status || 'pendente') as AccountRecoveryStatus,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      reviewedBy: raw.reviewedBy,
      reviewedByName: raw.reviewedByName,
      reviewedAt: raw.reviewedAt,
      approvedAt: raw.approvedAt,
      completedAt: raw.completedAt,
      rejectionReason: raw.rejectionReason,
      adminNotes: raw.adminNotes,
      deliveryMethod: raw.deliveryMethod,
      matchedUid: raw.matchedUid,
      matchedLegacyUid: raw.matchedLegacyUid,
      matchedHolderName: raw.matchedHolderName,
      matchedRole: raw.matchedRole,
      matchedAccountOrigin: raw.matchedAccountOrigin,
      matchedEmailMasked: raw.matchedEmailMasked,
      matchedPhoneMasked: raw.matchedPhoneMasked,
      resetLinkSentAt: raw.resetLinkSentAt
    } satisfies AccountRecoveryRequest;
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Carrega entradas do phone_login_index (exclusivo do Administrador) para enriquecer a verificação interna.
 */
export async function listPhoneLoginIndexAdminSafe(
  db: Firestore
): Promise<PhoneIndexSnapshotEntry[]> {
  try {
    const snap = await getDocs(collection(db, 'phone_login_index'));
    return snap.docs.map(d => {
      const data = d.data() as any;
      return {
        id: d.id,
        uid: String(data?.uid || ''),
        authMode: data?.authMode,
        authEmail: typeof data?.authEmail === 'string' ? data.authEmail : undefined,
        hasRealEmail: Boolean(data?.hasRealEmail)
      };
    });
  } catch {
    return [];
  }
}

export interface AdminRecoveryActionActor {
  uid: string;
  name: string;
  role: string;
  email?: string | null;
  emailVerified?: boolean;
  getIdToken?: () => Promise<string>;
}

/**
 * Verifica estritamente se o ator tem privilégios administrativos reais.
 */
export function isAuthorizedAdminActor(actor: AdminRecoveryActionActor | null | undefined): boolean {
  if (!actor || !actor.uid) return false;
  if (actor.role === 'admin') return true;
  if (
    actor.emailVerified &&
    (actor.email || '').trim().toLowerCase() === OFFICIAL_ADMIN_EMAIL
  ) {
    return true;
  }
  return false;
}

/**
 * Atualiza o estado administrativo de um pedido (`em_analise`, `rejeitado`, `concluido`, `pendente`)
 * com registo obrigatório no documento.
 */
export async function updateAccountRecoveryStatusAdminSafe(
  db: Firestore | null,
  actor: AdminRecoveryActionActor | null,
  requestId: string,
  nextStatus: Exclude<AccountRecoveryStatus, 'aprovado'>,
  options?: {
    rejectionReason?: string;
    adminNotes?: string;
    matchedAccount?: AccountRecoveryMatchedAccount;
  }
): Promise<{ success: boolean; message: string; updatedFields?: Partial<AccountRecoveryRequest> }> {
  if (!isAuthorizedAdminActor(actor)) {
    return {
      success: false,
      message: 'Acesso negado: apenas administradores autorizados podem gerir pedidos de recuperação.'
    };
  }

  const nowIso = new Date().toISOString();
  const patch: Partial<AccountRecoveryRequest> = {
    status: nextStatus,
    updatedAt: nowIso,
    reviewedBy: actor!.uid,
    reviewedByName: actor!.name || 'Administrador',
    reviewedAt: nowIso
  };

  if (nextStatus === 'concluido') {
    patch.completedAt = nowIso;
  }
  if (nextStatus === 'rejeitado' && options?.rejectionReason?.trim()) {
    patch.rejectionReason = options.rejectionReason.trim().slice(0, 500);
  }
  if (options?.adminNotes !== undefined) {
    patch.adminNotes = options.adminNotes.trim().slice(0, 800);
  }
  if (options?.matchedAccount?.matched) {
    patch.matchedUid = options.matchedAccount.uid;
    patch.matchedLegacyUid = options.matchedAccount.legacyUid;
    patch.matchedHolderName = options.matchedAccount.holderName;
    patch.matchedRole = options.matchedAccount.role;
    patch.matchedAccountOrigin = options.matchedAccount.accountOrigin;
    if (options.matchedAccount.realEmail) {
      patch.matchedEmailMasked = maskEmailAddress(options.matchedAccount.realEmail);
    }
    if (options.matchedAccount.phone) {
      patch.matchedPhoneMasked = maskPhoneNumber(options.matchedAccount.phone);
    }
  }

  if (db) {
    try {
      await updateDoc(doc(db, 'account_recovery_requests', requestId), patch as Record<string, any>);
    } catch (err) {
      console.error('Erro ao atualizar estado do pedido de recuperação:', err);
      return {
        success: false,
        message: 'Não foi possível atualizar o estado do pedido no Firestore. Verifique as suas permissões administrativas.'
      };
    }
  }

  return {
    success: true,
    updatedFields: patch,
    message: `Estado do pedido atualizado para «${RECOVERY_STATUS_LABELS[nextStatus]}».`
  };
}

export interface ApproveRecoveryOptions {
  adminNotes?: string;
  sendResetEmailImpl?: (email: string, continueUrl: string) => Promise<void>;
  fetchImpl?: typeof fetch;
}

/**
 * Aprovação administrativa de um pedido de recuperação:
 * - O administrador NUNCA cria, vê ou envia manualmente a palavra-passe do utilizador.
 * - Se a conta tiver e-mail real associado no Firebase Auth -> envia ligação oficial temporária
 *   e de uso único via Firebase Authentication (`sendPasswordResetEmail`).
 * - Se a conta for apenas telefone (sem e-mail) -> tenta envio real de código temporário via
 *   gateway SMS no backend (apenas se SMS_PROVIDER_URL e SMS_API_KEY estiverem configurados).
 * - Se não houver contacto verificável automático -> mantém o pedido pendente/em análise,
 *   nunca simulando um envio inexistente.
 */
export async function approveAccountRecoveryAdminSafe(
  db: Firestore | null,
  authInstance: Auth | null,
  actor: AdminRecoveryActionActor | null,
  request: AccountRecoveryRequest,
  matchedAccount: AccountRecoveryMatchedAccount,
  options?: ApproveRecoveryOptions
): Promise<{
  success: boolean;
  status: AccountRecoveryStatus;
  deliveryMethod: 'firebase_email_link' | 'sms_code' | 'manual_pending' | 'none';
  requiresExternalSmsConfig?: boolean;
  message: string;
  updatedFields?: Partial<AccountRecoveryRequest>;
}> {
  if (!isAuthorizedAdminActor(actor)) {
    return {
      success: false,
      status: request.status,
      deliveryMethod: 'none',
      message: 'Acesso negado: apenas administradores autorizados podem aprovar pedidos de recuperação.'
    };
  }

  if (!matchedAccount.matched) {
    return {
      success: false,
      status: request.status,
      deliveryMethod: 'none',
      message:
        'Não é possível aprovar automaticamente: nenhuma conta correspondente foi localizada com os dados informados.'
    };
  }

  if (matchedAccount.accountOrigin === 'protected_admin') {
    return {
      success: false,
      status: request.status,
      deliveryMethod: 'none',
      message:
        'Conta administrativa protegida: a recuperação de contas administrativas não é executada por este fluxo.'
    };
  }

  if (matchedAccount.accountOrigin === 'legacy_unmigrated') {
    return {
      success: false,
      status: 'em_analise',
      deliveryMethod: 'manual_pending',
      message:
        'Esta conta antiga ainda não possui UID no Firebase Authentication. Execute primeiro a religação segura da conta antes de enviar o link de palavra-passe.'
    };
  }

  const nowIso = new Date().toISOString();
  const basePatch: Partial<AccountRecoveryRequest> = {
    updatedAt: nowIso,
    reviewedBy: actor!.uid,
    reviewedByName: actor!.name || 'Administrador',
    reviewedAt: nowIso,
    matchedUid: matchedAccount.uid,
    matchedLegacyUid: matchedAccount.legacyUid,
    matchedHolderName: matchedAccount.holderName,
    matchedRole: matchedAccount.role,
    matchedAccountOrigin: matchedAccount.accountOrigin,
    matchedEmailMasked: matchedAccount.realEmail ? maskEmailAddress(matchedAccount.realEmail) : undefined,
    matchedPhoneMasked: matchedAccount.phone ? maskPhoneNumber(matchedAccount.phone) : undefined,
    adminNotes: options?.adminNotes?.trim().slice(0, 800) || request.adminNotes
  };

  // Canal 1: Conta com e-mail real verificável no Firebase Auth -> Link oficial Firebase (expira e é uso único)
  if (matchedAccount.hasVerifiableEmail && matchedAccount.authEmail) {
    const continueUrl = `${OFFICIAL_APP_URL}/?recoveryReset=1&reqId=${encodeURIComponent(request.id)}`;

    try {
      if (options?.sendResetEmailImpl) {
        await options.sendResetEmailImpl(matchedAccount.authEmail, continueUrl);
      } else if (authInstance) {
        try {
          await sendPasswordResetEmail(authInstance, matchedAccount.authEmail, {
            url: continueUrl,
            handleCodeInApp: false
          });
        } catch (err: any) {
          if (
            err?.code === 'auth/unauthorized-continue-uri' ||
            err?.code === 'auth/invalid-continue-uri'
          ) {
            await sendPasswordResetEmail(authInstance, matchedAccount.authEmail);
          } else {
            throw err;
          }
        }
      } else {
        throw new Error('Firebase Auth não inicializado.');
      }
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/too-many-requests') {
        return {
          success: false,
          status: request.status,
          deliveryMethod: 'none',
          message: 'Limite temporário do Firebase atingido para este e-mail. Aguarde alguns minutos e tente novamente.'
        };
      }
      return {
        success: false,
        status: request.status,
        deliveryMethod: 'none',
        message: `Falha ao enviar ligação oficial de redefinição via Firebase (${code || 'erro de rede'}).`
      };
    }

    const approvedPatch: Partial<AccountRecoveryRequest> = {
      ...basePatch,
      status: 'aprovado',
      approvedAt: nowIso,
      resetLinkSentAt: nowIso,
      deliveryMethod: 'firebase_email_link'
    };

    // Limpar campos undefined antes de gravar no Firestore
    const cleanPatch = Object.fromEntries(
      Object.entries(approvedPatch).filter(([, v]) => v !== undefined)
    );

    if (db) {
      await updateDoc(doc(db, 'account_recovery_requests', request.id), cleanPatch);
    }

    return {
      success: true,
      status: 'aprovado',
      deliveryMethod: 'firebase_email_link',
      updatedFields: approvedPatch,
      message: `Pedido aprovado! Ligação oficial temporária de redefinição enviada via Firebase para ${maskEmailAddress(
        matchedAccount.authEmail
      )}.`
    };
  }

  // Canal 2: Conta apenas telefone (sem e-mail) -> Tentar envio real de código via SMS Gateway no backend
  if (matchedAccount.hasPhone && matchedAccount.phone) {
    const fetcher = options?.fetchImpl || (typeof fetch === 'function' ? fetch : undefined);
    const idToken = actor?.getIdToken ? await actor.getIdToken().catch(() => '') : '';

    if (fetcher && idToken) {
      try {
        const resp = await fetcher(
          `/api/v1/auth/recovery-requests/${encodeURIComponent(request.id)}/issue-code`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({
              phone: matchedAccount.phone,
              targetUid: matchedAccount.uid
            })
          }
        );

        const data = await resp.json().catch(() => ({}));
        if (resp.ok && data?.dispatched === true) {
          const smsApprovedPatch: Partial<AccountRecoveryRequest> = {
            ...basePatch,
            status: 'aprovado',
            approvedAt: nowIso,
            resetLinkSentAt: nowIso,
            deliveryMethod: 'sms_code'
          };
          const cleanPatch = Object.fromEntries(
            Object.entries(smsApprovedPatch).filter(([, v]) => v !== undefined)
          );
          if (db) {
            await updateDoc(doc(db, 'account_recovery_requests', request.id), cleanPatch);
          }
          return {
            success: true,
            status: 'aprovado',
            deliveryMethod: 'sms_code',
            updatedFields: smsApprovedPatch,
            message: `Pedido aprovado! Código temporário de uso único enviado por SMS para ${maskPhoneNumber(
              matchedAccount.phone
            )}.`
          };
        }
      } catch {
        // Fallback honesto abaixo: manter pendente
      }
    }
  }

  // Sem e-mail registado e sem gateway SMS configurada -> Regra 4: manter pendente/em análise
  const pendingNote =
    options?.adminNotes?.trim() ||
    'Sem contacto verificável automático (conta sem e-mail registado e gateway SMS externo não configurado). Mantido pendente até confirmação segura de identidade.';

  const pendingPatch: Partial<AccountRecoveryRequest> = {
    ...basePatch,
    status: 'em_analise',
    deliveryMethod: 'manual_pending',
    adminNotes: pendingNote.slice(0, 800)
  };
  const cleanPending = Object.fromEntries(
    Object.entries(pendingPatch).filter(([, v]) => v !== undefined)
  );

  if (db) {
    try {
      await updateDoc(doc(db, 'account_recovery_requests', request.id), cleanPending);
    } catch {
      // Ignore secondary failure
    }
  }

  return {
    success: false,
    status: 'em_analise',
    deliveryMethod: 'manual_pending',
    requiresExternalSmsConfig: true,
    updatedFields: pendingPatch,
    message:
      'Esta conta não possui e-mail registado e o serviço externo de SMS ainda não está configurado. O pedido foi mantido em análise (sem envio simulado) até confirmação segura de identidade.'
  };
}

/**
 * Valida a força mínima da nova palavra-passe no ecrã dedicado de redefinição.
 */
export function validateNewPasswordChoice(
  newPassword: string,
  confirmPassword: string
): { isValid: boolean; error?: string } {
  if (!newPassword || newPassword.length < 6) {
    return {
      isValid: false,
      error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.'
    };
  }
  if (newPassword.length > 128) {
    return {
      isValid: false,
      error: 'A palavra-passe excede o comprimento máximo permitido.'
    };
  }
  if (newPassword !== confirmPassword) {
    return {
      isValid: false,
      error: 'A confirmação da palavra-passe não coincide.'
    };
  }
  return { isValid: true };
}

/**
 * Verifica um código oficial de redefinição (`oobCode`) do Firebase Authentication.
 * Rejeita automaticamente códigos expirados ou já utilizados.
 */
export async function verifyResetLinkCodeSafe(
  authInstance: Auth | null,
  oobCode: string,
  verifyImpl?: (code: string) => Promise<string>
): Promise<{
  valid: boolean;
  maskedEmail?: string;
  errorCode?: 'expired' | 'used_or_invalid' | 'network';
  message: string;
}> {
  const cleanCode = (oobCode || '').trim();
  if (!cleanCode) {
    return {
      valid: false,
      errorCode: 'used_or_invalid',
      message: 'Ligação de redefinição em falta ou inválida.'
    };
  }

  try {
    const email = verifyImpl
      ? await verifyImpl(cleanCode)
      : authInstance
      ? await verifyPasswordResetCode(authInstance, cleanCode)
      : '';

    return {
      valid: true,
      maskedEmail: email ? maskEmailAddress(email) : undefined,
      message: 'Ligação verificada. Defina abaixo a sua nova palavra-passe.'
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/expired-action-code') {
      return {
        valid: false,
        errorCode: 'expired',
        message: 'Esta ligação de recuperação expirou. Solicite uma nova recuperação em «Esqueci a palavra-passe».'
      };
    }
    if (code === 'auth/invalid-action-code') {
      return {
        valid: false,
        errorCode: 'used_or_invalid',
        message: 'Esta ligação de recuperação já foi utilizada ou é inválida. Solicite um novo pedido se necessário.'
      };
    }
    return {
      valid: false,
      errorCode: 'network',
      message: 'Não foi possível validar a ligação de recuperação neste momento. Verifique a sua ligação à internet.'
    };
  }
}

/**
 * Conclui a redefinição de palavra-passe diretamente na conta existente no Firebase Authentication:
 * - Valida nova palavra-passe + confirmação.
 * - Atualiza diretamente a palavra-passe via `confirmPasswordReset` (preservando UID, telefone, e-mail e histórico).
 * - Invalida qualquer sessão ativa neste dispositivo via `signOut`.
 */
export async function confirmPasswordResetSafe(
  authInstance: Auth | null,
  oobCode: string,
  newPassword: string,
  confirmPassword: string,
  adapters?: {
    confirmImpl?: (code: string, pass: string) => Promise<void>;
    signOutImpl?: () => Promise<void>;
  }
): Promise<{
  success: boolean;
  errorCode?: 'validation' | 'expired' | 'used_or_invalid' | 'weak_password' | 'network';
  message: string;
}> {
  const passCheck = validateNewPasswordChoice(newPassword, confirmPassword);
  if (!passCheck.isValid) {
    return {
      success: false,
      errorCode: 'validation',
      message: passCheck.error || 'Palavra-passe inválida.'
    };
  }

  const cleanCode = (oobCode || '').trim();
  if (!cleanCode) {
    return {
      success: false,
      errorCode: 'used_or_invalid',
      message: 'Código de redefinição em falta ou inválido.'
    };
  }

  try {
    if (adapters?.confirmImpl) {
      await adapters.confirmImpl(cleanCode, newPassword);
    } else if (authInstance) {
      await confirmPasswordReset(authInstance, cleanCode, newPassword);
    } else {
      throw new Error('Firebase Auth não inicializado.');
    }

    // Invalidar qualquer sessão local anterior neste dispositivo
    try {
      if (adapters?.signOutImpl) {
        await adapters.signOutImpl();
      } else if (authInstance) {
        await signOut(authInstance);
      }
    } catch {
      // Não falhar a redefinição se não houver sessão ativa
    }

    return {
      success: true,
      message:
        'Palavra-passe atualizada com sucesso! Agora pode iniciar sessão com o seu número de telefone (+244) e a nova palavra-passe.'
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/expired-action-code') {
      return {
        success: false,
        errorCode: 'expired',
        message: 'Esta ligação de recuperação expirou. Solicite um novo pedido de recuperação.'
      };
    }
    if (code === 'auth/invalid-action-code') {
      return {
        success: false,
        errorCode: 'used_or_invalid',
        message: 'Esta ligação já foi utilizada ou é inválida. Solicite um novo pedido se necessário.'
      };
    }
    if (code === 'auth/weak-password') {
      return {
        success: false,
        errorCode: 'weak_password',
        message: 'A palavra-passe escolhida é demasiado fraca. Utilize pelo menos 6 caracteres.'
      };
    }
    return {
      success: false,
      errorCode: 'network',
      message: 'Não foi possível concluir a redefinição da palavra-passe. Tente novamente.'
    };
  }
}

/**
 * Motor puro de tokens temporários de recuperação (usado e espelhado no backend e nos testes automatizados)
 * para garantir expiração, uso único e bloqueio após 3 tentativas falhadas.
 */
export interface SingleUseRecoveryTokenState {
  id: string;
  code: string;
  expiresAt: number;
  usedAt: number | null;
  attemptsLeft: number;
}

export function verifySingleUseRecoveryTokenState(
  token: SingleUseRecoveryTokenState | undefined,
  submittedCode: string,
  nowMs: number = Date.now()
): {
  valid: boolean;
  reason?: 'not_found' | 'expired' | 'already_used' | 'max_attempts' | 'mismatch';
  message: string;
} {
  if (!token) {
    return {
      valid: false,
      reason: 'not_found',
      message: 'Código de recuperação inválido ou inexistente.'
    };
  }

  if (token.usedAt !== null) {
    return {
      valid: false,
      reason: 'already_used',
      message: 'Este código de recuperação já foi utilizado. Solicite uma nova aprovação.'
    };
  }

  if (nowMs > token.expiresAt) {
    return {
      valid: false,
      reason: 'expired',
      message: 'Este código de recuperação expirou. Solicite uma nova recuperação.'
    };
  }

  if (token.attemptsLeft <= 0) {
    return {
      valid: false,
      reason: 'max_attempts',
      message: 'Número máximo de tentativas excedido para este código.'
    };
  }

  const cleanSubmitted = submittedCode.replace(/\D/g, '');
  if (cleanSubmitted !== token.code) {
    token.attemptsLeft -= 1;
    return {
      valid: false,
      reason: 'mismatch',
      message: `Código incorreto. Restam ${token.attemptsLeft} tentativa(s).`
    };
  }

  token.usedAt = nowMs;
  return {
    valid: true,
    message: 'Código de recuperação validado com sucesso.'
  };
}
