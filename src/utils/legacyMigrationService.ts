import { initializeApp, deleteApp } from 'firebase/app';
import {
  Auth,
  initializeAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { OFFICIAL_APP_URL } from '../config/domain';
import {
  areSamePhoneNumber,
  computePhoneIndexId,
  getPublicUserEmail,
  isSyntheticPhoneAuthEmail,
  isValidLoginEmail,
  normalizePhoneNumber,
  OFFICIAL_ADMIN_EMAIL,
  phoneToSyntheticAuthEmail
} from './phoneAuthUtils';
import { stripSensitiveFields } from './securityUtils';

export const PRIORITY_TEST_LEGACY_ACCOUNT = {
  phone: '+244944926697',
  email: 'mariakumeso1966@gmail.com',
  legacyUid: 'user-1786485151147'
} as const;

export const PROTECTED_ADMIN_UIDS = [
  'user-admin-1',
  'UK0UyCKLjcNgLUlBAJch8U9BADM2'
] as const;

export function isProtectedAdminAccount(
  uid?: string | null,
  role?: string | null,
  email?: string | null
): boolean {
  const cleanUid = (uid || '').trim();
  const cleanRole = (role || '').trim().toLowerCase();
  const cleanEmail = (email || '').trim().toLowerCase();
  return (
    (PROTECTED_ADMIN_UIDS as readonly string[]).includes(cleanUid) ||
    cleanRole === 'admin' ||
    cleanEmail === OFFICIAL_ADMIN_EMAIL
  );
}

export const DEFAULT_MIGRATION_BATCH_SIZE = 5;

export const ALL_USER_REFERENCE_COLLECTIONS = [
  'users',
  'professionals',
  'professionals_public',
  'admins',
  'administradores',
  'phone_login_index',
  'trial_claims',
  'service_requests',
  'chat_messages',
  'conversations',
  'reviews',
  'wallet_transactions',
  'posts',
  'work_feed_posts',
  'app_notifications',
  'reports',
  'support_tickets',
  'clientes',
  'profissionais',
  'pedidos',
  'pagamentos',
  'avaliacoes',
  'mensagens'
] as const;

export interface ReferenceCollectionSpec {
  collectionName: string;
  scalarFields: string[];
  arrayFields?: string[];
  mapKeyFields?: string[];
}

export const RELATIONAL_COLLECTION_SPECS: readonly ReferenceCollectionSpec[] = [
  {
    collectionName: 'service_requests',
    scalarFields: ['clientId', 'professionalId', 'previousProId', 'cancelledBy', 'ownerId']
  },
  {
    collectionName: 'chat_messages',
    scalarFields: ['senderId', 'receiverId', 'ownerId'],
    arrayFields: ['participants', 'readBy']
  },
  {
    collectionName: 'conversations',
    scalarFields: ['clientId', 'professionalId', 'lastMessageSenderId', 'ownerId'],
    arrayFields: ['participants']
  },
  {
    collectionName: 'reviews',
    scalarFields: ['clientId', 'professionalId', 'ownerId']
  },
  {
    collectionName: 'wallet_transactions',
    scalarFields: ['userId', 'reviewedBy', 'ownerId']
  },
  {
    collectionName: 'posts',
    scalarFields: ['professionalId', 'ownerId'],
    arrayFields: ['likedBy'],
    mapKeyFields: ['reactions']
  },
  {
    collectionName: 'work_feed_posts',
    scalarFields: ['professionalId', 'ownerId'],
    arrayFields: ['likedBy'],
    mapKeyFields: ['reactions']
  },
  {
    collectionName: 'app_notifications',
    scalarFields: ['userId', 'senderId', 'ownerId']
  },
  {
    collectionName: 'reports',
    scalarFields: ['reporterId', 'reportedUserId', 'targetUserId', 'ownerId']
  },
  {
    collectionName: 'support_tickets',
    scalarFields: ['reporterId', 'userId', 'ownerId']
  },
  {
    collectionName: 'trial_claims',
    scalarFields: ['claimedBy', 'uid', 'userId']
  },
  {
    collectionName: 'clientes',
    scalarFields: ['id', 'uid', 'ownerId']
  },
  {
    collectionName: 'profissionais',
    scalarFields: ['id', 'uid', 'ownerId']
  },
  {
    collectionName: 'pedidos',
    scalarFields: ['clientId', 'professionalId', 'userId', 'ownerId']
  },
  {
    collectionName: 'pagamentos',
    scalarFields: ['userId', 'ownerId']
  },
  {
    collectionName: 'avaliacoes',
    scalarFields: ['clientId', 'professionalId', 'userId', 'ownerId']
  },
  {
    collectionName: 'mensagens',
    scalarFields: ['senderId', 'receiverId', 'ownerId'],
    arrayFields: ['participants', 'readBy']
  }
];

export interface LegacyCollectionImpact {
  collection: string;
  count: number;
  sampleDocIds: string[];
  matchedFields: string[];
}

export type LegacyEligibilityStatus =
  | 'already_firebase_auth'
  | 'already_migrated_archive'
  | 'eligible_starter_tier_batch'
  | 'manual_intervention_required';

export interface LegacyAccountAuditEntry {
  uid: string;
  name: string;
  role: string;
  phoneRaw: string;
  phoneE164: string;
  email: string;
  collectionsPresent: string[];
  uidCategory: 'firebase_auth_format' | 'legacy_custom_id';
  eligibilityStatus: LegacyEligibilityStatus;
  manualInterventionReasons: string[];
  isMigratedArchive: boolean;
  migratedToUid?: string;
  legacyUid?: string;
  phoneIndexStatus: 'indexed_match' | 'indexed_mismatch' | 'not_indexed' | 'invalid_phone';
  phoneIndexAuthMode?: string;
  phoneIndexAuthEmail?: string;
  phoneIndexUid?: string;
  blocked: boolean;
  isDeleted: boolean;
  createdAt?: string;
  referenceCounts: LegacyCollectionImpact[];
  totalReferences: number;
  isPriorityTestAccount: boolean;
}

export interface LegacyMigrationConflict {
  type:
    | 'DUPLICATE_PHONE'
    | 'DUPLICATE_EMAIL'
    | 'PHONE_INDEX_MISMATCH'
    | 'MISSING_PHONE'
    | 'MISSING_EMAIL_FOR_LEGACY_UID';
  severity: 'high' | 'medium';
  key: string;
  uids: string[];
  description: string;
}

export interface LegacyAccountsReadOnlyReport {
  success: boolean;
  message: string;
  generatedAt: string;
  readOnlyConfirmed: true;
  scannedCollections: string[];
  collectionTotals: Record<string, number>;
  summary: {
    totalUniqueAccounts: number;
    firebaseAuthUidAccounts: number;
    legacyPendingAccounts: number;
    eligibleStarterTierBatchCount: number;
    manualInterventionRequiredCount: number;
    duplicateAccountsCount: number;
    migratedArchiveAccounts: number;
    totalIndexedPhones: number;
    totalConflicts: number;
    clientsCount: number;
    professionalsCount: number;
    adminsCount: number;
    legacyClientsPending: number;
    legacyProfessionalsPending: number;
    recommendedBatchSize: number;
    estimatedBatches: number;
  };
  priorityAccount: LegacyAccountAuditEntry | null;
  eligibleBatchList: LegacyAccountAuditEntry[];
  manualInterventionList: LegacyAccountAuditEntry[];
  legacyPendingList: LegacyAccountAuditEntry[];
  firebaseAuthList: LegacyAccountAuditEntry[];
  migratedArchivesList: LegacyAccountAuditEntry[];
  conflicts: LegacyMigrationConflict[];
  plainTextReport: string;
}

export interface RelinkLegacyAccountOptions {
  legacyUid: string;
  newAuthUid: string;
  targetEmail?: string;
  expectedPhone?: string;
  dryRun: boolean;
  adminUid: string;
  adminEmail: string;
}

export interface RelinkStepSummary {
  collection: string;
  action:
    | 'copy_profile'
    | 'archive_legacy_non_destructive'
    | 'relink_references'
    | 'update_phone_index'
    | 'audit_log';
  count: number;
  docIds: string[];
}

export interface RelinkLegacyAccountResult {
  success: boolean;
  dryRun: boolean;
  message: string;
  legacyUid: string;
  newAuthUid: string;
  resolvedEmail?: string;
  resolvedPhoneE164?: string;
  plannedOrAppliedSteps: RelinkStepSummary[];
  deletedDocumentsCount: 0;
  conflictsFound: string[];
}

export interface BatchAccountMigrationOutcome {
  legacyUid: string;
  name: string;
  role: string;
  phoneE164: string;
  email: string;
  status:
    | 'dry_run_ready'
    | 'migrated_verified'
    | 'already_in_firebase_auth'
    | 'skipped_conflict'
    | 'failed'
    | 'aborted';
  newAuthUid?: string;
  relinkedReferencesCount: number;
  relinkedByCollection?: Record<string, number>;
  integrityVerified: boolean;
  passwordResetSent: boolean;
  passwordResetError?: string;
  detail: string;
}

export interface BatchMigrationResult {
  success: boolean;
  dryRun: boolean;
  aborted: boolean;
  criticalStopReason?: string;
  batchNumber: number;
  batchSize: number;
  processedCount: number;
  migratedCount: number;
  alreadyInAuthCount: number;
  skippedConflictCount: number;
  failedCount: number;
  integrityPassedCount: number;
  passwordResetsSentCount: number;
  deletedDocumentsCount: 0;
  outcomes: BatchAccountMigrationOutcome[];
  message: string;
}

export interface GlobalMigrationProgress {
  phase: 'initial_audit' | 'batch_dry_run' | 'migrating_account' | 'cooling_down' | 'final_audit';
  currentBatch: number;
  totalEstimatedBatches: number;
  accountInBatch: number;
  batchTotalAccounts: number;
  currentAccountName: string;
  cumulativeMigrated: number;
  cumulativeIntegrityOk: number;
  cumulativeResetsSent: number;
  cumulativeResetsFailed: number;
  cumulativeErrors: number;
  initialEligibleTotal: number;
}

export interface GlobalSequentialMigrationResult {
  success: boolean;
  completedAll: boolean;
  stoppedEarly: boolean;
  stopReason?: string;
  startedAt: string;
  finishedAt: string;
  batchSize: number;
  batchesExecuted: number;
  totalEstimatedBatches: number;
  initialEligibleCount: number;
  recoveredAccounts: BatchAccountMigrationOutcome[];
  pendingEligibleAccounts: LegacyAccountAuditEntry[];
  manualInterventionAccounts: LegacyAccountAuditEntry[];
  errorOrConflictAccounts: BatchAccountMigrationOutcome[];
  passwordResetsSentList: BatchAccountMigrationOutcome[];
  passwordResetsFailedList: BatchAccountMigrationOutcome[];
  totalReferencesRelinked: number;
  relinkedTotalsByCollection: Record<string, number>;
  deletedDocumentsCount: 0;
  batchResults: BatchMigrationResult[];
  finalReport: LegacyAccountsReadOnlyReport;
  plainTextFinalReport: string;
  message: string;
}

export function looksLikeFirebaseAuthUid(uid?: string | null): boolean {
  if (!uid || typeof uid !== 'string') return false;
  const trimmed = uid.trim();
  return /^[A-Za-z0-9]{20,36}$/.test(trimmed) && !trimmed.includes('-') && !trimmed.includes('_');
}

export function extractRawPhoneFromRecord(record: Record<string, any>): string {
  const candidates = [
    record?.phone,
    record?.phoneE164,
    record?.phoneNumber,
    record?.telefone,
    record?.whatsapp
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) return c.trim();
  }
  return '';
}

function generateEphemeralCryptoPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = new Uint8Array(32);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    throw new Error('CRYPTO_UNAVAILABLE');
  }
  let out = 'Js9!';
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function isFictitiousAccountId(uid: string, raw: Record<string, any>): boolean {
  const lower = uid.toLowerCase();
  if (lower === 'user-admin-1') return false;
  if (
    lower.startsWith('mock-') ||
    lower.startsWith('dummy-') ||
    lower.startsWith('test-user-') ||
    lower === 'guest-client'
  ) {
    return true;
  }
  const name = String(raw?.name || '').trim().toLowerCase();
  return name === 'guest client';
}

function findMatchingFieldsForUid(
  docId: string,
  data: Record<string, any>,
  targetUid: string,
  spec: ReferenceCollectionSpec
): string[] {
  const matched: string[] = [];
  if (docId === targetUid && (spec.collectionName === 'clientes' || spec.collectionName === 'profissionais')) {
    matched.push('docId');
  }
  for (const field of spec.scalarFields) {
    if (data[field] === targetUid) {
      matched.push(field);
    }
  }
  if (spec.arrayFields) {
    for (const arrField of spec.arrayFields) {
      if (Array.isArray(data[arrField]) && data[arrField].includes(targetUid)) {
        matched.push(arrField);
      }
    }
  }
  if (spec.mapKeyFields) {
    for (const mapField of spec.mapKeyFields) {
      const mapVal = data[mapField];
      if (
        mapVal &&
        typeof mapVal === 'object' &&
        !Array.isArray(mapVal) &&
        Object.prototype.hasOwnProperty.call(mapVal, targetUid)
      ) {
        matched.push(`${mapField}.${targetUid}`);
      }
    }
  }
  return matched;
}

function buildRelinkedDocumentPatch(
  data: Record<string, any>,
  legacyUid: string,
  newAuthUid: string,
  spec: ReferenceCollectionSpec,
  nowIso: string
): Record<string, any> | null {
  const patch: Record<string, any> = {};
  let changed = false;

  for (const field of spec.scalarFields) {
    if (data[field] === legacyUid) {
      patch[field] = newAuthUid;
      changed = true;
    }
  }

  if (spec.arrayFields) {
    for (const arrField of spec.arrayFields) {
      if (Array.isArray(data[arrField]) && data[arrField].includes(legacyUid)) {
        const replaced = data[arrField].map((item: any) => (item === legacyUid ? newAuthUid : item));
        patch[arrField] = Array.from(new Set(replaced));
        changed = true;
      }
    }
  }

  if (spec.mapKeyFields) {
    for (const mapField of spec.mapKeyFields) {
      const mapVal = data[mapField];
      if (
        mapVal &&
        typeof mapVal === 'object' &&
        !Array.isArray(mapVal) &&
        Object.prototype.hasOwnProperty.call(mapVal, legacyUid)
      ) {
        const nextMap: Record<string, any> = { ...mapVal };
        if (!Object.prototype.hasOwnProperty.call(nextMap, newAuthUid)) {
          nextMap[newAuthUid] = nextMap[legacyUid];
        }
        delete nextMap[legacyUid];
        patch[mapField] = nextMap;
        changed = true;
      }
    }
  }

  if (!changed) return null;
  if (spec.collectionName === 'service_requests' && Object.prototype.hasOwnProperty.call(data, 'clientPhone')) {
    patch.clientPhone = deleteField();
  }
  patch.migratedLegacyRefFrom = legacyUid;
  patch.updatedAt = nowIso;
  return patch;
}

/**
 * STRICTLY READ-ONLY full Firestore global audit across all 23 collections.
 * Performs ZERO writes, ZERO mutations, ZERO deletions.
 */
export async function generateLegacyAccountsReadOnlyReport(
  db: Firestore
): Promise<LegacyAccountsReadOnlyReport> {
  const generatedAt = new Date().toISOString();
  const collectionTotals: Record<string, number> = {};
  const scannedCollections: string[] = [];

  const profileCollections = ['users', 'professionals', 'professionals_public', 'admins', 'administradores'] as const;
  const relationalNames = RELATIONAL_COLLECTION_SPECS.map(s => s.collectionName);
  const allToFetch = [...profileCollections, 'phone_login_index', ...relationalNames];

  const settled = await Promise.allSettled(
    allToFetch.map(colName => getDocs(collection(db, colName)))
  );

  const docsByCollection = new Map<string, Array<{ id: string; data: Record<string, any> }>>();
  allToFetch.forEach((colName, idx) => {
    const res = settled[idx];
    if (res.status === 'fulfilled') {
      scannedCollections.push(colName);
      const list: Array<{ id: string; data: Record<string, any> }> = [];
      res.value.forEach(d => {
        list.push({ id: d.id, data: stripSensitiveFields(d.data() || {}) });
      });
      docsByCollection.set(colName, list);
      collectionTotals[colName] = list.length;
    } else {
      docsByCollection.set(colName, []);
      collectionTotals[colName] = 0;
    }
  });

  const phoneIndexMap = new Map<string, Record<string, any>>();
  for (const item of docsByCollection.get('phone_login_index') || []) {
    phoneIndexMap.set(item.id, item.data);
  }

  const accountsByUid = new Map<
    string,
    {
      uid: string;
      name: string;
      role: string;
      phoneRaw: string;
      email: string;
      collectionsPresent: Set<string>;
      isMigratedArchive: boolean;
      migratedToUid?: string;
      legacyUid?: string;
      blocked: boolean;
      isDeleted: boolean;
      createdAt?: string;
    }
  >();

  for (const colName of profileCollections) {
    for (const item of docsByCollection.get(colName) || []) {
      const uid = item.id;
      const raw = item.data;
      if (isFictitiousAccountId(uid, raw)) continue;

      const existing = accountsByUid.get(uid);
      const rawPhone = extractRawPhoneFromRecord(raw);
      const pubEmail = getPublicUserEmail(raw.email).toLowerCase();
      const isBlocked = raw.blocked === true || raw.status === 'bloqueado' || raw.accountStatus === 'BLOCKED';
      const isDeleted = raw.isDeleted === true || raw.status === 'deleted';
      const isArchive = Boolean(raw.migratedToUid || raw.legacyArchiveOnly);

      if (!existing) {
        accountsByUid.set(uid, {
          uid,
          name: String(raw.name || 'Sem nome'),
          role: String(
            raw.role ||
              (colName === 'admins' || colName === 'administradores'
                ? 'admin'
                : colName === 'professionals' || colName === 'professionals_public'
                ? 'profissional'
                : 'cliente')
          ),
          phoneRaw: rawPhone,
          email: pubEmail,
          collectionsPresent: new Set([colName]),
          isMigratedArchive: isArchive,
          migratedToUid: raw.migratedToUid ? String(raw.migratedToUid) : undefined,
          legacyUid: raw.legacyUid ? String(raw.legacyUid) : undefined,
          blocked: isBlocked,
          isDeleted,
          createdAt: raw.createdAt ? String(raw.createdAt) : undefined
        });
      } else {
        existing.collectionsPresent.add(colName);
        if (!existing.phoneRaw && rawPhone) existing.phoneRaw = rawPhone;
        if (!existing.email && pubEmail) existing.email = pubEmail;
        if (existing.name === 'Sem nome' && raw.name) existing.name = String(raw.name);
        if (raw.role === 'admin' || colName === 'admins' || colName === 'administradores') {
          existing.role = 'admin';
        } else if (existing.role === 'cliente' && (raw.role === 'profissional' || colName === 'professionals')) {
          existing.role = 'profissional';
        }
        if (isArchive) {
          existing.isMigratedArchive = true;
          if (raw.migratedToUid) existing.migratedToUid = String(raw.migratedToUid);
        }
        if (raw.legacyUid && !existing.legacyUid) existing.legacyUid = String(raw.legacyUid);
        if (isBlocked) existing.blocked = true;
        if (isDeleted) existing.isDeleted = true;
        if (!existing.createdAt && raw.createdAt) existing.createdAt = String(raw.createdAt);
      }
    }
  }

  const activePhoneBuckets = new Map<string, string[]>();
  const activeEmailBuckets = new Map<string, string[]>();
  const conflicts: LegacyMigrationConflict[] = [];
  const tempEntries: LegacyAccountAuditEntry[] = [];

  for (const acc of accountsByUid.values()) {
    const norm = normalizePhoneNumber(acc.phoneRaw);
    const phoneE164 = norm.isValid ? norm.e164 : '';
    const uidCategory = looksLikeFirebaseAuthUid(acc.uid) ? 'firebase_auth_format' : 'legacy_custom_id';

    let phoneIndexStatus: LegacyAccountAuditEntry['phoneIndexStatus'] = 'invalid_phone';
    let phoneIndexAuthMode: string | undefined;
    let phoneIndexAuthEmail: string | undefined;
    let phoneIndexUid: string | undefined;

    if (phoneE164) {
      const idxId = await computePhoneIndexId(phoneE164);
      const idxEntry = idxId ? phoneIndexMap.get(idxId) : undefined;
      if (!idxEntry) {
        phoneIndexStatus = 'not_indexed';
      } else {
        phoneIndexAuthMode = idxEntry.authMode ? String(idxEntry.authMode) : undefined;
        phoneIndexAuthEmail = idxEntry.authEmail ? String(idxEntry.authEmail).toLowerCase() : undefined;
        phoneIndexUid = idxEntry.uid ? String(idxEntry.uid) : undefined;
        const emailMatches =
          !acc.email ||
          (phoneIndexAuthEmail && phoneIndexAuthEmail === acc.email.toLowerCase());
        const uidMatches =
          phoneIndexUid === acc.uid || (acc.migratedToUid && phoneIndexUid === acc.migratedToUid);
        phoneIndexStatus = emailMatches && uidMatches ? 'indexed_match' : 'indexed_mismatch';
      }
    }

    const referenceCounts: LegacyCollectionImpact[] = [];
    let totalReferences = 0;

    for (const spec of RELATIONAL_COLLECTION_SPECS) {
      const colDocs = docsByCollection.get(spec.collectionName) || [];
      const sampleDocIds: string[] = [];
      const matchedFieldsSet = new Set<string>();
      let count = 0;

      for (const docItem of colDocs) {
        const fields = findMatchingFieldsForUid(docItem.id, docItem.data, acc.uid, spec);
        if (fields.length > 0) {
          count += 1;
          if (sampleDocIds.length < 5) sampleDocIds.push(docItem.id);
          fields.forEach(f => matchedFieldsSet.add(f));
        }
      }

      if (count > 0) {
        totalReferences += count;
        referenceCounts.push({
          collection: spec.collectionName,
          count,
          sampleDocIds,
          matchedFields: Array.from(matchedFieldsSet)
        });
      }
    }

    const isPriorityTestAccount =
      acc.uid === PRIORITY_TEST_LEGACY_ACCOUNT.legacyUid ||
      (Boolean(phoneE164) && areSamePhoneNumber(phoneE164, PRIORITY_TEST_LEGACY_ACCOUNT.phone)) ||
      acc.email.toLowerCase() === PRIORITY_TEST_LEGACY_ACCOUNT.email;

    if (!acc.isMigratedArchive && !acc.isDeleted) {
      if (phoneE164) {
        const arr = activePhoneBuckets.get(phoneE164) || [];
        arr.push(acc.uid);
        activePhoneBuckets.set(phoneE164, arr);
      } else {
        conflicts.push({
          type: 'MISSING_PHONE',
          severity: 'medium',
          key: acc.uid,
          uids: [acc.uid],
          description: `Conta ${acc.name} (${acc.uid}) não possui número de telefone angolano válido (+244 + 9 dígitos).`
        });
      }

      if (acc.email) {
        const arr = activeEmailBuckets.get(acc.email) || [];
        arr.push(acc.uid);
        activeEmailBuckets.set(acc.email, arr);
      } else if (uidCategory === 'legacy_custom_id') {
        conflicts.push({
          type: 'MISSING_EMAIL_FOR_LEGACY_UID',
          severity: 'medium',
          key: acc.uid,
          uids: [acc.uid],
          description: `Conta legada ${acc.name} (${acc.uid}) não tem e-mail real associado; recuperação automática por link de e-mail requer e-mail ou contacto assistido.`
        });
      }

      if (phoneIndexStatus === 'indexed_mismatch') {
        conflicts.push({
          type: 'PHONE_INDEX_MISMATCH',
          severity: 'high',
          key: phoneE164,
          uids: [acc.uid, ...(phoneIndexUid && phoneIndexUid !== acc.uid ? [phoneIndexUid] : [])],
          description: `O índice phone_login_index de ${phoneE164} aponta para UID="${phoneIndexUid || '?'}" / authEmail="${phoneIndexAuthEmail || '?'}", divergindo do registo ${acc.uid} (email="${acc.email || 'sem e-mail'}").`
        });
      }
    }

    tempEntries.push({
      uid: acc.uid,
      name: acc.name,
      role: acc.role,
      phoneRaw: acc.phoneRaw,
      phoneE164,
      email: acc.email,
      collectionsPresent: Array.from(acc.collectionsPresent),
      uidCategory,
      eligibilityStatus: 'already_firebase_auth',
      manualInterventionReasons: [],
      isMigratedArchive: acc.isMigratedArchive,
      migratedToUid: acc.migratedToUid,
      legacyUid: acc.legacyUid,
      phoneIndexStatus,
      phoneIndexAuthMode,
      phoneIndexAuthEmail,
      phoneIndexUid,
      blocked: acc.blocked,
      isDeleted: acc.isDeleted,
      createdAt: acc.createdAt,
      referenceCounts,
      totalReferences,
      isPriorityTestAccount
    });
  }

  const duplicateUids = new Set<string>();

  for (const [phoneKey, uids] of activePhoneBuckets.entries()) {
    if (uids.length > 1) {
      uids.forEach(u => duplicateUids.add(u));
      conflicts.push({
        type: 'DUPLICATE_PHONE',
        severity: 'high',
        key: phoneKey,
        uids,
        description: `O telefone ${phoneKey} aparece em ${uids.length} contas ativas: ${uids.join(', ')}.`
      });
    }
  }

  for (const [emailKey, uids] of activeEmailBuckets.entries()) {
    if (uids.length > 1) {
      uids.forEach(u => duplicateUids.add(u));
      conflicts.push({
        type: 'DUPLICATE_EMAIL',
        severity: 'high',
        key: emailKey,
        uids,
        description: `O e-mail ${emailKey} aparece em ${uids.length} contas ativas: ${uids.join(', ')}.`
      });
    }
  }

  // Final eligibility classification for EVERY account
  const allEntries: LegacyAccountAuditEntry[] = tempEntries.map(entry => {
    if (entry.isMigratedArchive) {
      return { ...entry, eligibilityStatus: 'already_migrated_archive', manualInterventionReasons: [] };
    }
    if (entry.uidCategory === 'firebase_auth_format') {
      return { ...entry, eligibilityStatus: 'already_firebase_auth', manualInterventionReasons: [] };
    }

    const reasons: string[] = [];
    if (entry.isDeleted) reasons.push('Conta eliminada');
    if (isProtectedAdminAccount(entry.uid, entry.role, entry.email)) {
      reasons.push('Conta administrativa oficial (protegida contra migração automática em lote)');
    }
    if (!entry.phoneE164) reasons.push('Sem número de telefone angolano válido (+244 + 9 dígitos)');
    if (!isValidLoginEmail(entry.email)) reasons.push('Sem e-mail real válido para envio automático de link de palavra-passe');
    if (duplicateUids.has(entry.uid)) reasons.push('Conflito de telefone ou e-mail duplicado com outra conta ativa');

    return {
      ...entry,
      eligibilityStatus: reasons.length === 0 ? 'eligible_starter_tier_batch' : 'manual_intervention_required',
      manualInterventionReasons: reasons
    };
  });

  const migratedArchivesList = allEntries.filter(e => e.isMigratedArchive);
  const legacyPendingList = allEntries
    .filter(e => !e.isMigratedArchive && e.uidCategory === 'legacy_custom_id')
    .sort((a, b) => Number(b.isPriorityTestAccount) - Number(a.isPriorityTestAccount));
  const eligibleBatchList = legacyPendingList.filter(e => e.eligibilityStatus === 'eligible_starter_tier_batch');
  const manualInterventionList = legacyPendingList.filter(e => e.eligibilityStatus === 'manual_intervention_required');
  const firebaseAuthList = allEntries.filter(e => !e.isMigratedArchive && e.uidCategory === 'firebase_auth_format');

  const activeNonArchive = allEntries.filter(e => !e.isMigratedArchive && !e.isDeleted);
  const clientsCount = activeNonArchive.filter(e => e.role === 'cliente').length;
  const professionalsCount = activeNonArchive.filter(e => e.role === 'profissional').length;
  const adminsCount = activeNonArchive.filter(e => e.role === 'admin').length;
  const legacyClientsPending = legacyPendingList.filter(e => e.role === 'cliente').length;
  const legacyProfessionalsPending = legacyPendingList.filter(e => e.role === 'profissional').length;

  const recommendedBatchSize = DEFAULT_MIGRATION_BATCH_SIZE;
  const estimatedBatches = eligibleBatchList.length > 0 ? Math.ceil(eligibleBatchList.length / recommendedBatchSize) : 0;

  const priorityAccount = allEntries.find(e => e.isPriorityTestAccount) || null;

  const lines: string[] = [
    '=== DIAGNÓSTICO GLOBAL DE CONTAS ANTIGAS — J SMART SERVICES (APENAS LEITURA) ===',
    `Gerado em: ${generatedAt}`,
    `Coleções verificadas (${scannedCollections.length}): ${scannedCollections.join(', ')}`,
    '',
    '--- RESUMO EXECUTIVO (STARTER TIER • 0 CUSTOS) ---',
    `1. Total de contas únicas no Firestore: ${allEntries.length} (Clientes: ${clientsCount} | Profissionais: ${professionalsCount} | Admins: ${adminsCount})`,
    `2. Contas já com UID Firebase Auth (não alteradas): ${firebaseAuthList.length}`,
    `3. Total de contas antigas com UID legado afetadas: ${legacyPendingList.length} (Clientes: ${legacyClientsPending} | Profissionais: ${legacyProfessionalsPending})`,
    `4. Contas recuperáveis automaticamente em lotes no Starter Tier: ${eligibleBatchList.length}`,
    `5. Contas legadas que exigem intervenção manual: ${manualInterventionList.length}`,
    `6. Contas envolvidas em duplicação (telefone/e-mail): ${duplicateUids.size}`,
    `7. Contas antigas já arquivadas após religação: ${migratedArchivesList.length}`,
    `8. Entradas em phone_login_index: ${phoneIndexMap.size}`,
    `9. Estimativa de lotes (${recommendedBatchSize} contas/lote): ${estimatedBatches} lote(s)`,
    `10. Conflitos / alertas detetados: ${conflicts.length}`,
    ''
  ];

  if (priorityAccount) {
    lines.push('--- CONTA PRIORITÁRIA (+244944926697 / mariakumeso1966@gmail.com) ---');
    lines.push(`Nome: ${priorityAccount.name} | Função: ${priorityAccount.role} | Estado: ${priorityAccount.eligibilityStatus}`);
    lines.push(`UID: ${priorityAccount.uid} | Tel: ${priorityAccount.phoneE164 || priorityAccount.phoneRaw} | Email: ${priorityAccount.email || 'sem e-mail'}`);
    lines.push(
      `Referências (${priorityAccount.totalReferences} docs): ${
        priorityAccount.referenceCounts.length > 0
          ? priorityAccount.referenceCounts.map(r => `${r.collection}:${r.count}`).join('; ')
          : '0 referências externas'
      }`
    );
    lines.push('');
  }

  lines.push(`--- CONTAS ELEGÍVEIS PARA RECUPERAÇÃO EM LOTE (${eligibleBatchList.length}) ---`);
  for (const item of eligibleBatchList) {
    const refs =
      item.referenceCounts.length > 0
        ? item.referenceCounts.map(r => `${r.collection}:${r.count}`).join(', ')
        : 'nenhuma';
    lines.push(
      `- [${item.uid}] ${item.name} (${item.role}) | Tel: ${item.phoneE164} | Email: ${item.email} | Índice: ${item.phoneIndexStatus} | Refs(${item.totalReferences}): ${refs}`
    );
  }
  lines.push('');

  lines.push(`--- CONTAS QUE EXIGEM INTERVENÇÃO MANUAL (${manualInterventionList.length}) ---`);
  if (manualInterventionList.length === 0) {
    lines.push('Nenhuma.');
  } else {
    for (const item of manualInterventionList) {
      lines.push(
        `- [${item.uid}] ${item.name} (${item.role}) | Tel: ${item.phoneE164 || item.phoneRaw || 'N/D'} | Email: ${item.email || 'sem e-mail'} | Motivos: ${item.manualInterventionReasons.join('; ')}`
      );
    }
  }
  lines.push('');

  lines.push(`--- CONFLITOS / ALERTAS (${conflicts.length}) ---`);
  if (conflicts.length === 0) {
    lines.push('Nenhum conflito detetado.');
  } else {
    for (const c of conflicts) {
      lines.push(`- [${c.severity.toUpperCase()}][${c.type}] ${c.description}`);
    }
  }

  return {
    success: true,
    message: `Diagnóstico global concluído (apenas leitura): ${legacyPendingList.length} conta(s) legada(s) afetada(s) — ${eligibleBatchList.length} recuperável(is) em ${estimatedBatches} lote(s) no Starter Tier e ${manualInterventionList.length} com revisão manual.`,
    generatedAt,
    readOnlyConfirmed: true,
    scannedCollections,
    collectionTotals,
    summary: {
      totalUniqueAccounts: allEntries.length,
      firebaseAuthUidAccounts: firebaseAuthList.length,
      legacyPendingAccounts: legacyPendingList.length,
      eligibleStarterTierBatchCount: eligibleBatchList.length,
      manualInterventionRequiredCount: manualInterventionList.length,
      duplicateAccountsCount: duplicateUids.size,
      migratedArchiveAccounts: migratedArchivesList.length,
      totalIndexedPhones: phoneIndexMap.size,
      totalConflicts: conflicts.length,
      clientsCount,
      professionalsCount,
      adminsCount,
      legacyClientsPending,
      legacyProfessionalsPending,
      recommendedBatchSize,
      estimatedBatches
    },
    priorityAccount,
    eligibleBatchList,
    manualInterventionList,
    legacyPendingList,
    firebaseAuthList,
    migratedArchivesList,
    conflicts,
    plainTextReport: lines.join('\n')
  };
}

/**
 * Controlled single-account safe relink tool (Starter Tier compatible — ZERO Admin SDK, ZERO deleteDoc).
 */
export async function relinkSingleLegacyAccountSafe(
  db: Firestore,
  options: RelinkLegacyAccountOptions
): Promise<RelinkLegacyAccountResult> {
  const legacyUid = (options.legacyUid || '').trim();
  const newAuthUid = (options.newAuthUid || '').trim();
  const dryRun = options.dryRun !== false;
  const conflictsFound: string[] = [];
  const steps: RelinkStepSummary[] = [];

  if (!legacyUid || !newAuthUid) {
    return {
      success: false,
      dryRun,
      message: 'Informe tanto o UID legado original como o novo UID criado no Firebase Authentication.',
      legacyUid,
      newAuthUid,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound: ['MISSING_UIDS']
    };
  }

  if (legacyUid === newAuthUid) {
    return {
      success: false,
      dryRun,
      message: 'O UID legado e o novo UID do Firebase Auth são iguais — não é necessária religação.',
      legacyUid,
      newAuthUid,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound: ['SAME_UID']
    };
  }

  if (isProtectedAdminAccount(legacyUid) || isProtectedAdminAccount(newAuthUid)) {
    return {
      success: false,
      dryRun,
      message: 'Contas administrativas oficiais (incluindo user-admin-1 e UK0UyCKLjcNgLUlBAJch8U9BADM2) estão protegidas contra religação automática.',
      legacyUid,
      newAuthUid,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound: ['PROTECTED_ADMIN_ACCOUNT']
    };
  }

  if (!looksLikeFirebaseAuthUid(newAuthUid)) {
    return {
      success: false,
      dryRun,
      message: 'O "Novo UID do Firebase Auth" não tem o formato válido de UID do Firebase Authentication (20 a 36 caracteres alfanuméricos sem hífen).',
      legacyUid,
      newAuthUid,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound: ['INVALID_NEW_AUTH_UID_FORMAT']
    };
  }

  const [
    legacyUserSnap,
    legacyProSnap,
    legacyPublicProSnap,
    targetUserSnap
  ] = await Promise.all([
    getDoc(doc(db, 'users', legacyUid)),
    getDoc(doc(db, 'professionals', legacyUid)),
    getDoc(doc(db, 'professionals_public', legacyUid)),
    getDoc(doc(db, 'users', newAuthUid))
  ]);

  if (!legacyUserSnap.exists() && !legacyProSnap.exists()) {
    return {
      success: false,
      dryRun,
      message: `Nenhum documento encontrado em users/${legacyUid} nem em professionals/${legacyUid}.`,
      legacyUid,
      newAuthUid,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound: ['LEGACY_ACCOUNT_NOT_FOUND']
    };
  }

  const legacyUserData = legacyUserSnap.exists() ? stripSensitiveFields(legacyUserSnap.data() || {}) : null;
  const legacyProData = legacyProSnap.exists() ? stripSensitiveFields(legacyProSnap.data() || {}) : null;
  const legacyPublicProData = legacyPublicProSnap.exists() ? stripSensitiveFields(legacyPublicProSnap.data() || {}) : null;
  const existingTargetUser = targetUserSnap.exists() ? stripSensitiveFields(targetUserSnap.data() || {}) : null;

  if (legacyUserData?.migratedToUid || legacyProData?.migratedToUid) {
    const alreadyTo = legacyUserData?.migratedToUid || legacyProData?.migratedToUid;
    conflictsFound.push(`A conta legada ${legacyUid} já foi arquivada/religada anteriormente para ${alreadyTo}.`);
  }

  const resolvedPhoneRaw =
    options.expectedPhone?.trim() ||
    extractRawPhoneFromRecord(legacyUserData || {}) ||
    extractRawPhoneFromRecord(legacyProData || {});
  const normPhone = normalizePhoneNumber(resolvedPhoneRaw);
  const resolvedPhoneE164 = normPhone.isValid ? normPhone.e164 : '';

  if (!resolvedPhoneE164) {
    conflictsFound.push('A conta legada não possui número de telefone angolano válido (+244 + 9 dígitos).');
  }

  const resolvedEmail = (
    options.targetEmail?.trim() ||
    getPublicUserEmail(legacyUserData?.email || legacyProData?.email) ||
    ''
  ).toLowerCase();

  if (existingTargetUser) {
    const targetPhone = extractRawPhoneFromRecord(existingTargetUser);
    const targetEmail = getPublicUserEmail(existingTargetUser.email).toLowerCase();
    const sameLegacy = existingTargetUser.legacyUid === legacyUid;
    const samePhone = Boolean(resolvedPhoneE164 && targetPhone && areSamePhoneNumber(targetPhone, resolvedPhoneE164));
    const sameEmail = Boolean(resolvedEmail && targetEmail && targetEmail === resolvedEmail);
    if (!sameLegacy && !samePhone && !sameEmail) {
      conflictsFound.push(
        `CONFLITO CRÍTICO: Já existe outra conta em users/${newAuthUid} (${existingTargetUser.name || 'Sem nome'}) com telefone/e-mail diferente. Religação bloqueada.`
      );
    }
  }

  if (conflictsFound.length > 0) {
    return {
      success: false,
      dryRun,
      message: `Religação bloqueada por segurança (${conflictsFound.length} conflito(s) encontrado(s)). Nenhum documento foi alterado.`,
      legacyUid,
      newAuthUid,
      resolvedEmail,
      resolvedPhoneE164,
      plannedOrAppliedSteps: [],
      deletedDocumentsCount: 0,
      conflictsFound
    };
  }

  const nowIso = new Date().toISOString();

  if (legacyUserData) {
    steps.push({ collection: 'users', action: 'copy_profile', count: 1, docIds: [newAuthUid] });
    steps.push({ collection: 'users', action: 'archive_legacy_non_destructive', count: 1, docIds: [legacyUid] });
  }
  if (legacyProData) {
    steps.push({ collection: 'professionals', action: 'copy_profile', count: 1, docIds: [newAuthUid] });
    steps.push({ collection: 'professionals', action: 'archive_legacy_non_destructive', count: 1, docIds: [legacyUid] });
  }
  if (legacyPublicProData) {
    steps.push({ collection: 'professionals_public', action: 'copy_profile', count: 1, docIds: [newAuthUid] });
    steps.push({ collection: 'professionals_public', action: 'archive_legacy_non_destructive', count: 1, docIds: [legacyUid] });
  }

  const pendingRelinkWrites: Array<{
    collectionName: string;
    docId: string;
    patch: Record<string, any>;
  }> = [];

  const relResults = await Promise.allSettled(
    RELATIONAL_COLLECTION_SPECS.map(spec => getDocs(collection(db, spec.collectionName)))
  );

  RELATIONAL_COLLECTION_SPECS.forEach((spec, idx) => {
    const snapRes = relResults[idx];
    if (snapRes.status !== 'fulfilled') return;
    const matchedDocIds: string[] = [];

    snapRes.value.forEach(docSnap => {
      const data = stripSensitiveFields(docSnap.data() || {});
      const patch = buildRelinkedDocumentPatch(data, legacyUid, newAuthUid, spec, nowIso);
      if (patch) {
        matchedDocIds.push(docSnap.id);
        pendingRelinkWrites.push({
          collectionName: spec.collectionName,
          docId: docSnap.id,
          patch
        });
      }
    });

    if (matchedDocIds.length > 0) {
      steps.push({
        collection: spec.collectionName,
        action: 'relink_references',
        count: matchedDocIds.length,
        docIds: matchedDocIds
      });
    }
  });

  const phoneIndexId = resolvedPhoneE164 ? await computePhoneIndexId(resolvedPhoneE164) : null;
  if (phoneIndexId) {
    steps.push({
      collection: 'phone_login_index',
      action: 'update_phone_index',
      count: 1,
      docIds: [phoneIndexId]
    });
  }
  steps.push({
    collection: 'admin_audit_logs',
    action: 'audit_log',
    count: 1,
    docIds: [`audit-relink-${legacyUid}`]
  });

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: `Simulação (Dry-Run) concluída sem alterar nenhum dado: ${steps.length} etapa(s) planeada(s), ${pendingRelinkWrites.length} referência(s) histórica(s) a preservar e 0 documentos a eliminar.`,
      legacyUid,
      newAuthUid,
      resolvedEmail,
      resolvedPhoneE164,
      plannedOrAppliedSteps: steps,
      deletedDocumentsCount: 0,
      conflictsFound: []
    };
  }

  const authEmailForIndex =
    resolvedEmail || (resolvedPhoneE164 ? phoneToSyntheticAuthEmail(resolvedPhoneE164) || '' : '');
  const hasRealEmail = Boolean(resolvedEmail && !isSyntheticPhoneAuthEmail(resolvedEmail));

  if (legacyUserData) {
    const nextUserPayload: Record<string, any> = stripSensitiveFields({
      ...legacyUserData,
      id: newAuthUid,
      ownerId: newAuthUid,
      legacyUid,
      migratedFromLegacyUid: legacyUid,
      migratedAt: nowIso,
      phoneE164: resolvedPhoneE164 || legacyUserData.phoneE164,
      ...(phoneIndexId ? { phoneHash: phoneIndexId } : {}),
      updatedAt: nowIso
    });
    delete nextUserPayload.migratedToUid;
    delete nextUserPayload.legacyArchiveOnly;
    await setDoc(doc(db, 'users', newAuthUid), nextUserPayload, { merge: true });
  }

  if (legacyProData) {
    const nextProPayload: Record<string, any> = stripSensitiveFields({
      ...legacyProData,
      id: newAuthUid,
      ownerId: newAuthUid,
      legacyUid,
      migratedFromLegacyUid: legacyUid,
      migratedAt: nowIso,
      phoneE164: resolvedPhoneE164 || legacyProData.phoneE164,
      ...(phoneIndexId ? { phoneHash: phoneIndexId } : {}),
      updatedAt: nowIso
    });
    delete nextProPayload.migratedToUid;
    delete nextProPayload.legacyArchiveOnly;
    await setDoc(doc(db, 'professionals', newAuthUid), nextProPayload, { merge: true });
  }

  if (legacyPublicProData) {
    const nextPublicProPayload: Record<string, any> = stripSensitiveFields({
      ...legacyPublicProData,
      id: newAuthUid,
      ownerId: newAuthUid,
      legacyUid,
      migratedFromLegacyUid: legacyUid,
      migratedAt: nowIso,
      updatedAt: nowIso
    });
    delete nextPublicProPayload.migratedToUid;
    delete nextPublicProPayload.legacyArchiveOnly;
    await setDoc(doc(db, 'professionals_public', newAuthUid), nextPublicProPayload, { merge: true });
  }

  for (const w of pendingRelinkWrites) {
    await setDoc(doc(db, w.collectionName, w.docId), w.patch, { merge: true });
  }

  if (phoneIndexId && authEmailForIndex) {
    await setDoc(
      doc(db, 'phone_login_index', phoneIndexId),
      {
        uid: newAuthUid,
        authMode: hasRealEmail ? 'legacy_email' : 'phone_synthetic',
        authEmail: authEmailForIndex,
        hasRealEmail,
        updatedAt: nowIso
      },
      { merge: true }
    );
  }

  const archiveMarker = {
    migratedToUid: newAuthUid,
    migratedAt: nowIso,
    legacyArchiveOnly: true,
    updatedAt: nowIso
  };
  if (legacyUserData) {
    await setDoc(doc(db, 'users', legacyUid), archiveMarker, { merge: true });
  }
  if (legacyProData) {
    await setDoc(doc(db, 'professionals', legacyUid), archiveMarker, { merge: true });
  }
  if (legacyPublicProData) {
    await setDoc(doc(db, 'professionals_public', legacyUid), archiveMarker, { merge: true });
  }

  const safeLegacySuffix = legacyUid.slice(-6).replace(/[^a-zA-Z0-9_-]/g, '') || 'legacy';
  const auditId = `audit-relink-${Date.now()}-${safeLegacySuffix}`;
  await setDoc(doc(db, 'admin_audit_logs', auditId), {
    id: auditId,
    adminId: options.adminUid,
    adminName: options.adminEmail,
    action: `Religação segura de conta legada ${legacyUid} -> ${newAuthUid} (0 documentos eliminados)`.slice(0, 195),
    targetId: newAuthUid,
    targetType: 'legacy_account_relink',
    details: `Referências religadas: ${pendingRelinkWrites.length}. Documento legado preservado como arquivo.`,
    timestamp: nowIso
  }).catch(() => {});

  return {
    success: true,
    dryRun: false,
    message: `Religação segura concluída com sucesso (${legacyUid} → ${newAuthUid}): ${pendingRelinkWrites.length} referência(s) preservada(s), 0 documentos eliminados.`,
    legacyUid,
    newAuthUid,
    resolvedEmail,
    resolvedPhoneE164,
    plannedOrAppliedSteps: steps,
    deletedDocumentsCount: 0,
    conflictsFound: []
  };
}

/**
 * Post-relink integrity verification: confirms new profile(s) exist with legacyUid across users/professionals,
 * phone_login_index points to newAuthUid, and the original legacy document(s) still exist intact.
 */
export async function verifyRelinkIntegritySafe(
  db: Firestore,
  legacyUid: string,
  newAuthUid: string,
  phoneE164: string
): Promise<{ ok: boolean; details: string }> {
  try {
    const phoneIndexId = await computePhoneIndexId(phoneE164);
    const [newUserSnap, oldUserSnap, newProSnap, oldProSnap, idxSnap] = await Promise.all([
      getDoc(doc(db, 'users', newAuthUid)),
      getDoc(doc(db, 'users', legacyUid)),
      getDoc(doc(db, 'professionals', newAuthUid)),
      getDoc(doc(db, 'professionals', legacyUid)),
      phoneIndexId ? getDoc(doc(db, 'phone_login_index', phoneIndexId)) : Promise.resolve(null)
    ]);

    const hasOldUser = oldUserSnap.exists();
    const hasOldPro = oldProSnap.exists();
    const userOk = !hasOldUser || (
      newUserSnap.exists() &&
      newUserSnap.data()?.legacyUid === legacyUid &&
      oldUserSnap.data()?.migratedToUid === newAuthUid
    );
    const proOk = !hasOldPro || (
      newProSnap.exists() &&
      newProSnap.data()?.legacyUid === legacyUid &&
      oldProSnap.data()?.migratedToUid === newAuthUid
    );
    const hasAnyProfile = hasOldUser || hasOldPro;
    const idxOk = Boolean(idxSnap && idxSnap.exists() && idxSnap.data()?.uid === newAuthUid);

    if (hasAnyProfile && userOk && proOk && idxOk) {
      return { ok: true, details: 'Integridade confirmada (novo perfil + índice telefone + arquivo original intacto).' };
    }
    return {
      ok: false,
      details: `Verificação incompleta: usersOk=${userOk}, prosOk=${proOk}, indiceTelefone=${idxOk}.`
    };
  } catch {
    return { ok: false, details: 'Falha de leitura ao verificar integridade pós-lote.' };
  }
}

/**
 * Starter-Tier-native Batch Migration Worker:
 * Uses an isolated in-memory secondary Firebase Client App (NEVER signs out the Super Admin,
 * NEVER uses Admin SDK, NEVER uses service account keys, NEVER calls deleteDoc).
 * - Pre-batch conflict check via live read-only scan
 * - Supports safe interruption between accounts (shouldAbort)
 * - Post-account integrity verification + immutable admin_audit_logs
 * - Optional official Firebase sendPasswordResetEmail for each migrated user
 */
export async function executeLegacyBatchMigrationSafe(
  db: Firestore,
  primaryAuth: Auth,
  options: {
    batchNumber: number;
    batchSize?: number;
    dryRun: boolean;
    sendPasswordResetEmails: boolean;
    adminUid: string;
    adminEmail: string;
    stopOnCriticalError?: boolean;
    shouldAbort?: () => boolean;
    onProgress?: (current: number, total: number, currentName: string) => void;
  }
): Promise<BatchMigrationResult> {
  const batchSize = Math.max(1, Math.min(20, options.batchSize || DEFAULT_MIGRATION_BATCH_SIZE));
  const dryRun = options.dryRun !== false;
  const stopOnCriticalError = options.stopOnCriticalError === true;

  // 1. Fresh live pre-batch conflict scan
  const liveReport = await generateLegacyAccountsReadOnlyReport(db);
  const eligible = liveReport.eligibleBatchList;
  const targetSlice = eligible.slice(0, batchSize);

  if (targetSlice.length === 0) {
    return {
      success: true,
      dryRun,
      aborted: false,
      batchNumber: options.batchNumber,
      batchSize,
      processedCount: 0,
      migratedCount: 0,
      alreadyInAuthCount: 0,
      skippedConflictCount: 0,
      failedCount: 0,
      integrityPassedCount: 0,
      passwordResetsSentCount: 0,
      deletedDocumentsCount: 0,
      outcomes: [],
      message: 'Não existem contas legadas elegíveis pendentes para este lote.'
    };
  }

  // DRY-RUN MODE: 0 Firebase Auth creations and 0 Firestore writes
  if (dryRun) {
    const outcomes: BatchAccountMigrationOutcome[] = targetSlice.map(acc => ({
      legacyUid: acc.uid,
      name: acc.name,
      role: acc.role,
      phoneE164: acc.phoneE164,
      email: acc.email,
      status: 'dry_run_ready',
      relinkedReferencesCount: acc.totalReferences,
      integrityVerified: false,
      passwordResetSent: false,
      detail: `Pronto para lote #${options.batchNumber}: ${acc.totalReferences} referência(s) histórica(s) a preservar, 0 conflitos, 0 documentos a eliminar.`
    }));

    return {
      success: true,
      dryRun: true,
      aborted: false,
      batchNumber: options.batchNumber,
      batchSize,
      processedCount: outcomes.length,
      migratedCount: 0,
      alreadyInAuthCount: 0,
      skippedConflictCount: 0,
      failedCount: 0,
      integrityPassedCount: 0,
      passwordResetsSentCount: 0,
      deletedDocumentsCount: 0,
      outcomes,
      message: `Simulação do Lote #${options.batchNumber} concluída (0 alterações): ${outcomes.length} conta(s) elegível(is) validada(s) sem conflitos.`
    };
  }

  // LIVE BATCH EXECUTION (only when explicitly authorized with dryRun=false)
  const workerName = `jsmart-starter-migration-worker-${Date.now()}-${options.batchNumber}`;
  const secondaryApp = initializeApp(firebaseConfig, workerName);
  const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });

  const outcomes: BatchAccountMigrationOutcome[] = [];
  let migratedCount = 0;
  let alreadyInAuthCount = 0;
  let skippedConflictCount = 0;
  let failedCount = 0;
  let integrityPassedCount = 0;
  let passwordResetsSentCount = 0;
  let aborted = false;
  let criticalStopReason: string | undefined;

  try {
    for (let i = 0; i < targetSlice.length; i += 1) {
      const acc = targetSlice[i];
      if (options.shouldAbort && options.shouldAbort()) {
        aborted = true;
        criticalStopReason = 'Interrupção manual segura solicitada pelo Administrador.';
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'aborted',
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: 'Lote interrompido com segurança antes de processar esta conta.'
        });
        break;
      }

      options.onProgress?.(i + 1, targetSlice.length, acc.name);

      // Defense-in-depth runtime guard: NEVER touch protected admin accounts or existing Firebase Auth UIDs
      if (isProtectedAdminAccount(acc.uid, acc.role, acc.email) || looksLikeFirebaseAuthUid(acc.uid)) {
        skippedConflictCount += 1;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'skipped_conflict',
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: 'Conta protegida (admin oficial ou UID já no Firebase Auth) — excluída da migração automática.'
        });
        if (stopOnCriticalError) {
          aborted = true;
          criticalStopReason = `Paragem de segurança: conta protegida detetada no lote (${acc.uid}).`;
          break;
        }
        continue;
      }

      // Re-check single account not already archived in users OR professionals before creating Auth user
      const [liveLegacyUserCheck, liveLegacyProCheck] = await Promise.all([
        getDoc(doc(db, 'users', acc.uid)),
        getDoc(doc(db, 'professionals', acc.uid))
      ]);
      if (
        (liveLegacyUserCheck.exists() && liveLegacyUserCheck.data()?.migratedToUid) ||
        (liveLegacyProCheck.exists() && liveLegacyProCheck.data()?.migratedToUid)
      ) {
        skippedConflictCount += 1;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'skipped_conflict',
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: 'Conta já migrada/arquivada anteriormente.'
        });
        continue;
      }

      // Create Firebase Auth user in isolated in-memory secondary client app with ephemeral secret (never stored/logged)
      let newAuthUid = '';
      try {
        const ephemeralSecret = generateEphemeralCryptoPassword();
        const cred = await createUserWithEmailAndPassword(secondaryAuth, acc.email, ephemeralSecret);
        newAuthUid = cred.user.uid;
        await signOut(secondaryAuth).catch(() => {});
      } catch (authErr: any) {
        const code = authErr?.code || 'unknown';
        await signOut(secondaryAuth).catch(() => {});
        if (code === 'auth/email-already-in-use') {
          alreadyInAuthCount += 1;
          outcomes.push({
            legacyUid: acc.uid,
            name: acc.name,
            role: acc.role,
            phoneE164: acc.phoneE164,
            email: acc.email,
            status: 'already_in_firebase_auth',
            relinkedReferencesCount: 0,
            integrityVerified: false,
            passwordResetSent: false,
            detail: `Conflito detetado: o e-mail ${acc.email} já existe no Firebase Authentication (nenhum duplicado criado). Use a religação individual (Fase 2B) com o UID existente.`
          });
          if (stopOnCriticalError) {
            aborted = true;
            criticalStopReason = `Conflito de e-mail já existente no Firebase Auth (${acc.email} / ${acc.uid}). Execução pausada automaticamente para evitar duplicações.`;
            break;
          }
          continue;
        }
        if (code === 'auth/too-many-requests') {
          aborted = true;
          failedCount += 1;
          criticalStopReason = 'Limite temporário do Firebase atingido (auth/too-many-requests). Execução pausada automaticamente com segurança — aguarde 2-3 minutos e retome para continuar das contas pendentes.';
          outcomes.push({
            legacyUid: acc.uid,
            name: acc.name,
            role: acc.role,
            phoneE164: acc.phoneE164,
            email: acc.email,
            status: 'failed',
            relinkedReferencesCount: 0,
            integrityVerified: false,
            passwordResetSent: false,
            detail: criticalStopReason
          });
          break;
        }
        failedCount += 1;
        const authFailureDetail = `Falha ao provisionar no Firebase Auth (${code}). Nenhum documento no Firestore foi alterado.`;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'failed',
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: authFailureDetail
        });
        if (stopOnCriticalError) {
          aborted = true;
          criticalStopReason = `${acc.name} (${acc.uid}): ${authFailureDetail}`;
          break;
        }
        continue;
      }

      // Non-destructive relink across all 23 Firestore collections using primary Super Admin session
      let relinkRes: RelinkLegacyAccountResult;
      try {
        relinkRes = await relinkSingleLegacyAccountSafe(db, {
          legacyUid: acc.uid,
          newAuthUid,
          targetEmail: acc.email,
          expectedPhone: acc.phoneE164,
          dryRun: false,
          adminUid: options.adminUid,
          adminEmail: options.adminEmail
        });
      } catch (relinkErr: any) {
        const permCode = relinkErr?.code || relinkErr?.message || 'erro_firestore';
        failedCount += 1;
        const relinkDetail = `Erro de permissões ou escrita no Firestore (${permCode}) ao religar ${acc.uid} → ${newAuthUid}. Documentos antigos preservados intactos.`;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'failed',
          newAuthUid,
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: relinkDetail
        });
        if (stopOnCriticalError) {
          aborted = true;
          criticalStopReason = relinkDetail;
          break;
        }
        continue;
      }

      if (!relinkRes.success) {
        failedCount += 1;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'failed',
          newAuthUid,
          relinkedReferencesCount: 0,
          integrityVerified: false,
          passwordResetSent: false,
          detail: relinkRes.message
        });
        if (stopOnCriticalError) {
          aborted = true;
          criticalStopReason = `Religação bloqueada para ${acc.name} (${acc.uid}): ${relinkRes.message}`;
          break;
        }
        continue;
      }

      const relinkedByCollection: Record<string, number> = {};
      let relinkedRefsCount = 0;
      for (const s of relinkRes.plannedOrAppliedSteps) {
        if (s.action === 'relink_references') {
          relinkedRefsCount += s.count;
          relinkedByCollection[s.collection] = (relinkedByCollection[s.collection] || 0) + s.count;
        }
      }

      // Post-account integrity verification (Firebase Auth UID + Firestore profile + phone_login_index + intact legacy archive)
      const integrity = await verifyRelinkIntegritySafe(db, acc.uid, newAuthUid, acc.phoneE164);
      if (integrity.ok) {
        integrityPassedCount += 1;
      } else {
        failedCount += 1;
        const integrityErr = `Falha na validação de integridade pós-migração para ${acc.name} (${acc.uid} → ${newAuthUid}): ${integrity.details}`;
        outcomes.push({
          legacyUid: acc.uid,
          name: acc.name,
          role: acc.role,
          phoneE164: acc.phoneE164,
          email: acc.email,
          status: 'failed',
          newAuthUid,
          relinkedReferencesCount: relinkedRefsCount,
          relinkedByCollection,
          integrityVerified: false,
          passwordResetSent: false,
          detail: integrityErr
        });
        if (stopOnCriticalError) {
          aborted = true;
          criticalStopReason = integrityErr;
          break;
        }
        continue;
      }

      // Official Firebase password setup / recovery email
      let resetSent = false;
      let resetError: string | undefined;
      if (options.sendPasswordResetEmails) {
        const resetRes = await sendLegacyPasswordResetEmailSafe(primaryAuth, acc.email);
        resetSent = resetRes.success;
        if (resetSent) {
          passwordResetsSentCount += 1;
        } else {
          resetError = resetRes.message;
        }
      }

      migratedCount += 1;
      outcomes.push({
        legacyUid: acc.uid,
        name: acc.name,
        role: acc.role,
        phoneE164: acc.phoneE164,
        email: acc.email,
        status: 'migrated_verified',
        newAuthUid,
        relinkedReferencesCount: relinkedRefsCount,
        relinkedByCollection,
        integrityVerified: true,
        passwordResetSent: resetSent,
        passwordResetError: resetError,
        detail: `${integrity.details}${resetSent ? ' Link de definição de palavra-passe enviado.' : resetError ? ' (Link de palavra-passe falhou — reenvio disponível na Fase 3).' : ''}`
      });

      // Gentle throttle between Starter Tier Auth calls to avoid auth/too-many-requests
      if (i < targetSlice.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
  } finally {
    await signOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }

  // Immutable batch summary audit entry
  const batchAuditId = `audit-batch-${options.batchNumber}-${Date.now()}`;
  await setDoc(doc(db, 'admin_audit_logs', batchAuditId), {
    id: batchAuditId,
    adminId: options.adminUid,
    adminName: options.adminEmail,
    action: `Lote #${options.batchNumber} de migração legada Starter Tier concluído (${migratedCount} migradas, 0 eliminadas)`.slice(0, 195),
    targetId: `batch-${options.batchNumber}`,
    targetType: 'legacy_batch_migration',
    details: `Processadas: ${outcomes.length} | Migradas: ${migratedCount} | Integridade OK: ${integrityPassedCount} | Já no Auth: ${alreadyInAuthCount} | Falhas: ${failedCount} | Interrompido: ${aborted}`,
    timestamp: new Date().toISOString()
  }).catch(() => {});

  return {
    success: failedCount === 0 && alreadyInAuthCount === 0 && !aborted,
    dryRun: false,
    aborted,
    criticalStopReason,
    batchNumber: options.batchNumber,
    batchSize,
    processedCount: outcomes.length,
    migratedCount,
    alreadyInAuthCount,
    skippedConflictCount,
    failedCount,
    integrityPassedCount,
    passwordResetsSentCount,
    deletedDocumentsCount: 0,
    outcomes,
    message: `Lote #${options.batchNumber} ${aborted ? 'interrompido automaticamente por segurança' : 'concluído'}: ${migratedCount} migrada(s) (${integrityPassedCount} integridade verificada), ${alreadyInAuthCount} já existente(s) no Auth, ${failedCount} falha(s), 0 documentos eliminados.`
  };
}

/**
 * Automatic Sequential Global Multi-Batch Orchestrator (Starter Tier, 100% Client SDK):
 * Runs ALL eligible accounts sequentially in controlled batches of 5 (e.g. 37 -> 7x5 + 1x2 = 8 batches)
 * without requiring manual re-authorization between batches:
 * - Automatic Dry-Run before EVERY batch
 * - Per-account Auth + Firestore integrity validation
 * - Automatic stop on ANY conflict, integrity failure, permission error, or rate limit
 * - Refreshes the full Read-Only Global Diagnostic at completion and produces a complete auditable report
 */
export async function executeGlobalSequentialLegacyMigrationSafe(
  db: Firestore,
  primaryAuth: Auth,
  options: {
    batchSize?: number;
    sendPasswordResetEmails?: boolean;
    interBatchDelayMs?: number;
    adminUid: string;
    adminEmail: string;
    shouldAbort?: () => boolean;
    onProgress?: (progress: GlobalMigrationProgress) => void;
  }
): Promise<GlobalSequentialMigrationResult> {
  const startedAt = new Date().toISOString();
  const batchSize = Math.max(1, Math.min(20, options.batchSize || DEFAULT_MIGRATION_BATCH_SIZE));
  const sendPasswordResetEmails = options.sendPasswordResetEmails !== false;
  const interBatchDelayMs = Math.max(500, options.interBatchDelayMs ?? 2500);

  options.onProgress?.({
    phase: 'initial_audit',
    currentBatch: 0,
    totalEstimatedBatches: 0,
    accountInBatch: 0,
    batchTotalAccounts: 0,
    currentAccountName: 'A carregar Diagnóstico Global inicial...',
    cumulativeMigrated: 0,
    cumulativeIntegrityOk: 0,
    cumulativeResetsSent: 0,
    cumulativeResetsFailed: 0,
    cumulativeErrors: 0,
    initialEligibleTotal: 0
  });

  const initialReport = await generateLegacyAccountsReadOnlyReport(db);
  const initialEligibleCount = initialReport.eligibleBatchList.length;
  const totalEstimatedBatches = initialEligibleCount > 0 ? Math.ceil(initialEligibleCount / batchSize) : 0;

  const batchResults: BatchMigrationResult[] = [];
  const recoveredAccounts: BatchAccountMigrationOutcome[] = [];
  const errorOrConflictAccounts: BatchAccountMigrationOutcome[] = [];
  const passwordResetsSentList: BatchAccountMigrationOutcome[] = [];
  const passwordResetsFailedList: BatchAccountMigrationOutcome[] = [];
  const relinkedTotalsByCollection: Record<string, number> = {};
  let totalReferencesRelinked = 0;

  let stoppedEarly = false;
  let stopReason: string | undefined;
  const maxBatches = Math.max(totalEstimatedBatches + 2, 20);

  for (let batchNumber = 1; batchNumber <= maxBatches; batchNumber += 1) {
    if (options.shouldAbort?.()) {
      stoppedEarly = true;
      stopReason = 'Interrupção manual segura solicitada pelo Super Administrador.';
      break;
    }

    // 1. Automatic Dry-Run before EVERY batch
    options.onProgress?.({
      phase: 'batch_dry_run',
      currentBatch: batchNumber,
      totalEstimatedBatches: Math.max(totalEstimatedBatches, batchNumber),
      accountInBatch: 0,
      batchTotalAccounts: batchSize,
      currentAccountName: `Dry-Run automático do Lote #${batchNumber}...`,
      cumulativeMigrated: recoveredAccounts.length,
      cumulativeIntegrityOk: recoveredAccounts.filter(a => a.integrityVerified).length,
      cumulativeResetsSent: passwordResetsSentList.length,
      cumulativeResetsFailed: passwordResetsFailedList.length,
      cumulativeErrors: errorOrConflictAccounts.length,
      initialEligibleTotal: initialEligibleCount
    });

    const dryRunRes = await executeLegacyBatchMigrationSafe(db, primaryAuth, {
      batchNumber,
      batchSize,
      dryRun: true,
      sendPasswordResetEmails,
      adminUid: options.adminUid,
      adminEmail: options.adminEmail
    });

    if (dryRunRes.processedCount === 0) {
      break;
    }

    if (!dryRunRes.success) {
      stoppedEarly = true;
      stopReason = `Dry-Run automático do Lote #${batchNumber} detetou erro/conflito: ${dryRunRes.message}`;
      break;
    }

    // 2. Execute live batch with stopOnCriticalError = true
    const batchRes = await executeLegacyBatchMigrationSafe(db, primaryAuth, {
      batchNumber,
      batchSize,
      dryRun: false,
      sendPasswordResetEmails,
      stopOnCriticalError: true,
      adminUid: options.adminUid,
      adminEmail: options.adminEmail,
      shouldAbort: options.shouldAbort,
      onProgress: (current, total, currentName) => {
        options.onProgress?.({
          phase: 'migrating_account',
          currentBatch: batchNumber,
          totalEstimatedBatches: Math.max(totalEstimatedBatches, batchNumber),
          accountInBatch: current,
          batchTotalAccounts: total,
          currentAccountName: currentName,
          cumulativeMigrated: recoveredAccounts.length,
          cumulativeIntegrityOk: recoveredAccounts.filter(a => a.integrityVerified).length,
          cumulativeResetsSent: passwordResetsSentList.length,
          cumulativeResetsFailed: passwordResetsFailedList.length,
          cumulativeErrors: errorOrConflictAccounts.length,
          initialEligibleTotal: initialEligibleCount
        });
      }
    });

    batchResults.push(batchRes);

    for (const outcome of batchRes.outcomes) {
      if (outcome.status === 'migrated_verified') {
        recoveredAccounts.push(outcome);
        totalReferencesRelinked += outcome.relinkedReferencesCount;
        if (outcome.relinkedByCollection) {
          for (const [col, cnt] of Object.entries(outcome.relinkedByCollection)) {
            relinkedTotalsByCollection[col] = (relinkedTotalsByCollection[col] || 0) + cnt;
          }
        }
        if (outcome.passwordResetSent) {
          passwordResetsSentList.push(outcome);
        } else if (sendPasswordResetEmails) {
          passwordResetsFailedList.push(outcome);
        }
      } else if (
        outcome.status === 'failed' ||
        outcome.status === 'already_in_firebase_auth' ||
        outcome.status === 'skipped_conflict'
      ) {
        errorOrConflictAccounts.push(outcome);
      }
    }

    // Automatic stop if ANY conflict, permission error, integrity failure, rate limit, or manual abort occurred
    if (
      batchRes.aborted ||
      batchRes.failedCount > 0 ||
      batchRes.alreadyInAuthCount > 0 ||
      batchRes.skippedConflictCount > 0 ||
      batchRes.integrityPassedCount < batchRes.migratedCount
    ) {
      stoppedEarly = true;
      stopReason =
        batchRes.criticalStopReason ||
        `Paragem automática de segurança no Lote #${batchNumber}: ${batchRes.message}`;
      break;
    }

    // Check if there are still more batches expected before cooling down
    if (recoveredAccounts.length < initialEligibleCount) {
      options.onProgress?.({
        phase: 'cooling_down',
        currentBatch: batchNumber,
        totalEstimatedBatches: Math.max(totalEstimatedBatches, batchNumber),
        accountInBatch: batchRes.processedCount,
        batchTotalAccounts: batchRes.processedCount,
        currentAccountName: `Lote #${batchNumber} verificado com 100% integridade. Pausa de segurança antes do Lote #${batchNumber + 1}...`,
        cumulativeMigrated: recoveredAccounts.length,
        cumulativeIntegrityOk: recoveredAccounts.filter(a => a.integrityVerified).length,
        cumulativeResetsSent: passwordResetsSentList.length,
        cumulativeResetsFailed: passwordResetsFailedList.length,
        cumulativeErrors: errorOrConflictAccounts.length,
        initialEligibleTotal: initialEligibleCount
      });

      const steps = Math.ceil(interBatchDelayMs / 250);
      for (let s = 0; s < steps; s += 1) {
        if (options.shouldAbort?.()) {
          stoppedEarly = true;
          stopReason = 'Interrupção manual segura solicitada durante pausa entre lotes.';
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 250));
      }
      if (stoppedEarly) break;
    }
  }

  // 3. Final refreshed Read-Only Global Diagnostic
  options.onProgress?.({
    phase: 'final_audit',
    currentBatch: batchResults.length,
    totalEstimatedBatches: Math.max(totalEstimatedBatches, batchResults.length),
    accountInBatch: 0,
    batchTotalAccounts: 0,
    currentAccountName: 'A gerar Diagnóstico Global atualizado pós-execução...',
    cumulativeMigrated: recoveredAccounts.length,
    cumulativeIntegrityOk: recoveredAccounts.filter(a => a.integrityVerified).length,
    cumulativeResetsSent: passwordResetsSentList.length,
    cumulativeResetsFailed: passwordResetsFailedList.length,
    cumulativeErrors: errorOrConflictAccounts.length,
    initialEligibleTotal: initialEligibleCount
  });

  const finalReport = await generateLegacyAccountsReadOnlyReport(db);
  const finishedAt = new Date().toISOString();
  const completedAll = !stoppedEarly && finalReport.eligibleBatchList.length === 0;

  // Immutable global summary audit log
  const globalAuditId = `audit-global-mig-${Date.now()}`;
  await setDoc(doc(db, 'admin_audit_logs', globalAuditId), {
    id: globalAuditId,
    adminId: options.adminUid,
    adminName: options.adminEmail,
    action: `Recuperação global automática (${recoveredAccounts.length}/${initialEligibleCount} contas, ${batchResults.length} lotes, 0 eliminadas)`.slice(0, 195),
    targetId: 'global-legacy-recovery',
    targetType: 'legacy_global_sequential_migration',
    details: `Recuperadas: ${recoveredAccounts.length} | Pendentes elegíveis: ${finalReport.eligibleBatchList.length} | Erros/Conflitos: ${errorOrConflictAccounts.length} | Links enviados: ${passwordResetsSentList.length} | Links falhados: ${passwordResetsFailedList.length} | Paragem antecipada: ${stoppedEarly}`,
    timestamp: finishedAt
  }).catch(() => {});

  const requestsRelinked =
    (relinkedTotalsByCollection.service_requests || 0) + (relinkedTotalsByCollection.pedidos || 0);
  const convAndChatRelinked =
    (relinkedTotalsByCollection.conversations || 0) +
    (relinkedTotalsByCollection.chat_messages || 0) +
    (relinkedTotalsByCollection.mensagens || 0);

  const lines: string[] = [
    '=== RELATÓRIO FINAL — RECUPERAÇÃO GLOBAL DE CONTAS ANTIGAS (J SMART SERVICES) ===',
    `Início: ${startedAt} | Fim: ${finishedAt}`,
    `Estado: ${completedAll ? 'CONCLUÍDO COM SUCESSO (100% ELEGÍVEIS RECUPERADAS)' : stoppedEarly ? 'INTERROMPIDO AUTOMATICAMENTE POR SEGURANÇA' : 'CONCLUÍDO COM PENDENTES'}`,
    ...(stopReason ? [`Motivo da paragem: ${stopReason}`] : []),
    '',
    '--- 1. RESUMO DA EXECUÇÃO (STARTER TIER • 0 DOCUMENTOS ELIMINADOS) ---',
    `• Lotes executados: ${batchResults.length} (tamanho de lote: ${batchSize})`,
    `• Elegíveis iniciais: ${initialEligibleCount}`,
    `• Contas recuperadas com sucesso e integridade validada: ${recoveredAccounts.length}`,
    `• Contas elegíveis ainda pendentes: ${finalReport.eligibleBatchList.length}`,
    `• Contas com erros ou conflitos: ${errorOrConflictAccounts.length}`,
    `• Links oficiais de palavra-passe enviados: ${passwordResetsSentList.length}`,
    `• Links oficiais de palavra-passe falhados: ${passwordResetsFailedList.length}`,
    `• Documentos antigos eliminados: 0 (100% preservados em arquivo não destrutivo)`,
    '',
    '--- 2. PRESERVAÇÃO DE PEDIDOS, CONVERSAS E HISTÓRICO ---',
    `• Total de referências históricas religadas nas 23 coleções: ${totalReferencesRelinked}`,
    `• Pedidos de serviço preservados/religados (service_requests + pedidos): ${requestsRelinked}`,
    `• Conversas e mensagens preservadas/religadas (conversations + chat_messages + mensagens): ${convAndChatRelinked}`,
    `• Detalhe por coleção: ${
      Object.keys(relinkedTotalsByCollection).length > 0
        ? Object.entries(relinkedTotalsByCollection)
            .map(([col, cnt]) => `${col}:${cnt}`)
            .join(', ')
        : '0 referências externas adicionais'
    }`,
    '',
    `--- 3. CONTAS RECUPERADAS COM SUCESSO (${recoveredAccounts.length}) ---`,
    ...(recoveredAccounts.length > 0
      ? recoveredAccounts.map(
          a =>
            `- ${a.name} (${a.role}) | ${a.phoneE164} | ${a.email} | ${a.legacyUid} -> ${a.newAuthUid} | Refs: ${a.relinkedReferencesCount} | Integridade: OK | Reset: ${a.passwordResetSent ? 'ENVIADO' : 'FALHOU'}`
        )
      : ['Nenhuma.']),
    '',
    `--- 4. CONTAS COM ERROS OU CONFLITOS (${errorOrConflictAccounts.length}) ---`,
    ...(errorOrConflictAccounts.length > 0
      ? errorOrConflictAccounts.map(
          e => `- [${e.status}] ${e.name} (${e.legacyUid}) | ${e.phoneE164} | ${e.email} | ${e.detail}`
        )
      : ['Nenhum erro ou conflito detetado.']),
    '',
    `--- 5. LINKS DE RECUPERAÇÃO FALHADOS (${passwordResetsFailedList.length}) ---`,
    ...(passwordResetsFailedList.length > 0
      ? passwordResetsFailedList.map(
          f => `- ${f.name} | ${f.phoneE164} | ${f.email} | Novo UID: ${f.newAuthUid} | ${f.passwordResetError || 'Reenviar na Fase 3'}`
        )
      : ['Nenhum link falhado.']),
    '',
    `--- 6. CONTAS PROTEGIDAS / INTERVENÇÃO MANUAL INTACTAS (${finalReport.manualInterventionList.length}) ---`,
    ...(finalReport.manualInterventionList.length > 0
      ? finalReport.manualInterventionList.map(
          m => `- ${m.name} (${m.uid}) | ${m.phoneE164 || m.phoneRaw || 'N/D'} | Motivos: ${m.manualInterventionReasons.join('; ')}`
        )
      : ['Nenhuma.']),
    '',
    '--- 7. DIAGNÓSTICO GLOBAL ATUALIZADO PÓS-EXECUÇÃO ---',
    `• Contas com UID Firebase Auth funcional: ${finalReport.summary.firebaseAuthUidAccounts}`,
    `• Contas legadas elegíveis pendentes: ${finalReport.summary.eligibleStarterTierBatchCount}`,
    `• Contas de intervenção manual / protegidas intactas: ${finalReport.summary.manualInterventionRequiredCount}`,
    `• Registos antigos preservados como arquivo (migratedToUid): ${finalReport.summary.migratedArchiveAccounts}`,
    `• Entradas ativas em phone_login_index: ${finalReport.summary.totalIndexedPhones}`,
    `• Conflitos ativos: ${finalReport.summary.totalConflicts}`
  ];

  const message = completedAll
    ? `Recuperação global concluída com sucesso em ${batchResults.length} lote(s): ${recoveredAccounts.length} conta(s) recuperada(s) com integridade verificada, ${passwordResetsSentList.length} link(s) enviado(s), 0 documentos eliminados.`
    : `Recuperação global ${stoppedEarly ? 'interrompida por segurança' : 'finalizada'} após ${batchResults.length} lote(s): ${recoveredAccounts.length} recuperada(s), ${finalReport.eligibleBatchList.length} pendente(s), ${errorOrConflictAccounts.length} erro(s)/conflito(s), 0 documentos eliminados.`;

  return {
    success: completedAll && errorOrConflictAccounts.length === 0,
    completedAll,
    stoppedEarly,
    stopReason,
    startedAt,
    finishedAt,
    batchSize,
    batchesExecuted: batchResults.length,
    totalEstimatedBatches,
    initialEligibleCount,
    recoveredAccounts,
    pendingEligibleAccounts: finalReport.eligibleBatchList,
    manualInterventionAccounts: finalReport.manualInterventionList,
    errorOrConflictAccounts,
    passwordResetsSentList,
    passwordResetsFailedList,
    totalReferencesRelinked,
    relinkedTotalsByCollection,
    deletedDocumentsCount: 0,
    batchResults,
    finalReport,
    plainTextFinalReport: lines.join('\n'),
    message
  };
}

/**
 * Triggers Firebase Auth's official password setup / recovery email for a migrated legacy account.
 */
export async function sendLegacyPasswordResetEmailSafe(
  auth: Auth,
  rawEmail: string
): Promise<{ success: boolean; message: string }> {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@') || isSyntheticPhoneAuthEmail(email)) {
    return {
      success: false,
      message: 'Informe um endereço de e-mail real associado à conta no Firebase Authentication para enviar o link oficial de definição de palavra-passe.'
    };
  }

  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${OFFICIAL_APP_URL}/?login=true`,
      handleCodeInApp: false
    });
    return {
      success: true,
      message: `Link oficial de definição/recuperação de palavra-passe enviado para ${email} via Firebase Authentication. Peça ao utilizador para verificar a caixa de entrada e Spam.`
    };
  } catch (err: any) {
    if (err?.code === 'auth/unauthorized-continue-uri' || err?.code === 'auth/invalid-continue-uri') {
      try {
        await sendPasswordResetEmail(auth, email);
        return {
          success: true,
          message: `Link oficial de definição/recuperação de palavra-passe enviado para ${email} via Firebase Authentication.`
        };
      } catch (fallbackErr: any) {
        return {
          success: false,
          message: `Não foi possível enviar o link oficial (${fallbackErr?.code || 'erro Firebase'}). Confirme se ${email} já existe em Firebase Console → Authentication → Users.`
        };
      }
    }
    return {
      success: false,
      message: `Não foi possível enviar o link oficial (${err?.code || 'erro Firebase'}). Confirme se ${email} já existe em Firebase Console → Authentication → Users.`
    };
  }
}
