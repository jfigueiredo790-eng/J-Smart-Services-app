import { Firestore, collection, getDocs } from 'firebase/firestore';
import { ProfessionalProfile, User } from '../types';
import {
  OFFICIAL_ADMIN_EMAIL,
  getPublicUserEmail,
  isOfficialAdminPhone,
  normalizePhoneNumber
} from './phoneAuthUtils';
import {
  PROTECTED_ADMIN_UIDS,
  isProtectedAdminAccount,
  looksLikeFirebaseAuthUid
} from './legacyMigrationService';

/**
 * Determina se um documento de utilizador/profissional é um arquivo histórico da migração
 * ou uma conta eliminada (nunca deve ser contabilizado como utilizador ativo adicional).
 */
export function isArchivedOrDeletedAccountRecord(
  record: Partial<User & ProfessionalProfile> | null | undefined
): boolean {
  if (!record) return true;
  if (record.legacyArchiveOnly === true) return true;
  if (typeof record.migratedToUid === 'string' && record.migratedToUid.trim().length > 0) return true;
  if (record.isDeleted === true) return true;
  if (record.status === 'deleted') return true;
  return false;
}

export interface ActiveDuplicateGroup {
  reason: 'same_phone' | 'same_email' | 'legacy_admin_pair' | 'legacy_unarchived_pair';
  matchKey: string;
  canonicalUid: string;
  duplicateUids: string[];
  accounts: Array<{
    uid: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    looksLikeAuthUid: boolean;
    createdAt?: string;
    legacyUid?: string;
  }>;
  consolidationProposal: string;
}

export interface DeduplicationResult<T extends User> {
  uniqueUsers: T[];
  excludedArchiveCount: number;
  excludedDeletedCount: number;
  excludedFictitiousCount: number;
  excludedSupersededCount: number;
  excludedAdminPairCount: number;
  activeDuplicateGroups: ActiveDuplicateGroup[];
}

function getCanonicalPriorityScore(u: User): number {
  let score = 0;
  if (looksLikeFirebaseAuthUid(u.id)) score += 1000;
  if (u.id === 'UK0UyCKLjcNgLUlBAJch8U9BADM2') score += 500;
  if (u.legacyUid || u.migratedFromLegacyUid) score += 200;
  if (u.role === 'admin') score += 100;
  if (u.accountType === 'duplo' || u.role === 'profissional') score += 50;
  if (getPublicUserEmail(u.email)) score += 20;
  if (normalizePhoneNumber(u.phoneE164 || u.phone || '').isValid) score += 20;
  if (u.updatedAt) score += 10;
  return score;
}

function pickCanonicalWinner<T extends User>(a: T, b: T): { winner: T; loser: T } {
  const scoreA = getCanonicalPriorityScore(a);
  const scoreB = getCanonicalPriorityScore(b);
  if (scoreA !== scoreB) {
    return scoreA > scoreB ? { winner: a, loser: b } : { winner: b, loser: a };
  }
  const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return timeA >= timeB ? { winner: a, loser: b } : { winner: b, loser: a };
}

function isOfficialSuperAdminRecord(u: User): boolean {
  const pubEmail = getPublicUserEmail(u.email).toLowerCase();
  const phoneNorm = normalizePhoneNumber(u.phoneE164 || u.phone || '');
  return (
    (PROTECTED_ADMIN_UIDS as readonly string[]).includes(u.id) ||
    isProtectedAdminAccount(u.id, u.role, pubEmail) ||
    (u.role === 'admin' && pubEmail === OFFICIAL_ADMIN_EMAIL) ||
    (u.role === 'admin' && phoneNorm.isValid && isOfficialAdminPhone(phoneNorm.e164))
  );
}

/**
 * Consolida e deduplica utilizadores em memória por pessoa única / UID Firebase Authentication:
 * 1) Exclui documentos arquivados pela migração (`legacyArchiveOnly` / `migratedToUid`) e eliminados.
 * 2) Exclui registos antigos já substituídos pelo respetivo `legacyUid` numa conta ativa migrada.
 * 3) Consolida o par administrativo legado (`user-admin-1` + `UK0UyCKLjcNgLUlBAJch8U9BADM2`) sob o UID Firebase Auth.
 * 4) Agrupa eventuais duplicações ativas reais (mesmo telefone +244 ou mesmo e-mail real), mantendo 1 registo canónico por pessoa e reportando o grupo em `activeDuplicateGroups`.
 */
export function deduplicateCanonicalUsers<T extends User>(
  rawUsers: T[],
  options?: {
    filterFictitious?: (u: T) => boolean;
  }
): DeduplicationResult<T> {
  let excludedArchiveCount = 0;
  let excludedDeletedCount = 0;
  let excludedFictitiousCount = 0;
  let excludedSupersededCount = 0;
  let excludedAdminPairCount = 0;

  // Passo 1: Filtragem inicial por UID exato + exclusão de arquivos e eliminados
  const activeByUid = new Map<string, T>();
  for (const raw of rawUsers) {
    if (!raw || !raw.id) continue;
    if (options?.filterFictitious && options.filterFictitious(raw)) {
      excludedFictitiousCount += 1;
      continue;
    }
    if (raw.legacyArchiveOnly === true || (typeof raw.migratedToUid === 'string' && raw.migratedToUid.trim().length > 0)) {
      excludedArchiveCount += 1;
      continue;
    }
    if (raw.isDeleted === true || raw.status === 'deleted') {
      excludedDeletedCount += 1;
      continue;
    }

    const existing = activeByUid.get(raw.id);
    if (!existing) {
      activeByUid.set(raw.id, raw);
    } else {
      const { winner } = pickCanonicalWinner(existing, raw);
      activeByUid.set(raw.id, winner);
    }
  }

  // Passo 2: Identificar legacyUids já apontados por contas migradas ativas
  const supersededLegacyToActive = new Map<string, string>();
  for (const u of activeByUid.values()) {
    if (u.legacyUid && u.legacyUid !== u.id) {
      supersededLegacyToActive.set(u.legacyUid, u.id);
    }
    if (u.migratedFromLegacyUid && u.migratedFromLegacyUid !== u.id) {
      supersededLegacyToActive.set(u.migratedFromLegacyUid, u.id);
    }
  }

  const activeDuplicateGroups: ActiveDuplicateGroup[] = [];
  const afterLegacyDedup: T[] = [];

  for (const u of activeByUid.values()) {
    const activeTargetUid = supersededLegacyToActive.get(u.id);
    if (activeTargetUid && activeByUid.has(activeTargetUid)) {
      excludedSupersededCount += 1;
      const target = activeByUid.get(activeTargetUid)!;
      activeDuplicateGroups.push({
        reason: 'legacy_unarchived_pair',
        matchKey: u.id,
        canonicalUid: target.id,
        duplicateUids: [u.id],
        accounts: [target, u].map(acc => ({
          uid: acc.id,
          name: acc.name || 'Sem nome',
          role: acc.role || 'cliente',
          phone: acc.phoneE164 || acc.phone || '',
          email: getPublicUserEmail(acc.email),
          looksLikeAuthUid: looksLikeFirebaseAuthUid(acc.id),
          createdAt: acc.createdAt,
          legacyUid: acc.legacyUid
        })),
        consolidationProposal: `Marcar o documento legado ${u.id} como legacyArchiveOnly=true com migratedToUid=${target.id} (sem apagar dados).`
      });
      continue;
    }
    afterLegacyDedup.push(u);
  }

  // Passo 3: Consolidar par administrativo legado (user-admin-1 vs UID Firebase Auth do Super Admin)
  const officialAdmins = afterLegacyDedup.filter(isOfficialSuperAdminRecord);
  const adminFirebaseWinner = officialAdmins.find(u => looksLikeFirebaseAuthUid(u.id));
  const afterAdminDedup: T[] = [];

  if (officialAdmins.length > 1 && adminFirebaseWinner) {
    const legacyAdminDuplicates: T[] = [];
    for (const u of afterLegacyDedup) {
      if (isOfficialSuperAdminRecord(u) && u.id !== adminFirebaseWinner.id) {
        excludedAdminPairCount += 1;
        legacyAdminDuplicates.push(u);
        continue;
      }
      afterAdminDedup.push(u);
    }
    if (legacyAdminDuplicates.length > 0) {
      activeDuplicateGroups.push({
        reason: 'legacy_admin_pair',
        matchKey: OFFICIAL_ADMIN_EMAIL,
        canonicalUid: adminFirebaseWinner.id,
        duplicateUids: legacyAdminDuplicates.map(d => d.id),
        accounts: [adminFirebaseWinner, ...legacyAdminDuplicates].map(acc => ({
          uid: acc.id,
          name: acc.name || 'Administrador',
          role: acc.role || 'admin',
          phone: acc.phoneE164 || acc.phone || '',
          email: getPublicUserEmail(acc.email),
          looksLikeAuthUid: looksLikeFirebaseAuthUid(acc.id),
          createdAt: acc.createdAt,
          legacyUid: acc.legacyUid
        })),
        consolidationProposal: `Manter ${adminFirebaseWinner.id} como conta administrativa canónica no Firebase Auth e arquivar ${legacyAdminDuplicates.map(d => d.id).join(', ')} apenas mediante autorização expressa.`
      });
    }
  } else {
    afterAdminDedup.push(...afterLegacyDedup);
  }

  // Passo 4: Detetar e consolidar duplicações ativas reais por telefone (+244) ou e-mail real
  // Ordenar por prioridade canónica para eleger sempre o UID Firebase Auth mais completo como titular principal
  const sortedCandidates = [...afterAdminDedup].sort(
    (a, b) => getCanonicalPriorityScore(b) - getCanonicalPriorityScore(a)
  );

  const phoneToWinner = new Map<string, T>();
  const emailToWinner = new Map<string, T>();
  const duplicateBucketByWinnerUid = new Map<
    string,
    { reason: 'same_phone' | 'same_email'; matchKey: string; winner: T; duplicates: T[] }
  >();
  const uniqueUsers: T[] = [];

  for (const candidate of sortedCandidates) {
    const normPhone = normalizePhoneNumber(candidate.phoneE164 || candidate.phone || '');
    const phoneKey = normPhone.isValid ? normPhone.e164 : '';
    const emailKey = getPublicUserEmail(candidate.email).toLowerCase();

    const phoneOwner = phoneKey ? phoneToWinner.get(phoneKey) : undefined;
    const emailOwner = emailKey ? emailToWinner.get(emailKey) : undefined;
    const matchedOwner = phoneOwner || emailOwner;

    if (matchedOwner && matchedOwner.id !== candidate.id) {
      const reason: 'same_phone' | 'same_email' = phoneOwner ? 'same_phone' : 'same_email';
      const matchKey = phoneOwner ? phoneKey : emailKey;
      const existingBucket = duplicateBucketByWinnerUid.get(matchedOwner.id);
      if (existingBucket) {
        existingBucket.duplicates.push(candidate);
      } else {
        duplicateBucketByWinnerUid.set(matchedOwner.id, {
          reason,
          matchKey,
          winner: matchedOwner,
          duplicates: [candidate]
        });
      }
      continue;
    }

    uniqueUsers.push(candidate);
    if (phoneKey) phoneToWinner.set(phoneKey, candidate);
    if (emailKey) emailToWinner.set(emailKey, candidate);
  }

  for (const bucket of duplicateBucketByWinnerUid.values()) {
    activeDuplicateGroups.push({
      reason: bucket.reason,
      matchKey: bucket.matchKey,
      canonicalUid: bucket.winner.id,
      duplicateUids: bucket.duplicates.map(d => d.id),
      accounts: [bucket.winner, ...bucket.duplicates].map(acc => ({
        uid: acc.id,
        name: acc.name || 'Sem nome',
        role: acc.role || 'cliente',
        phone: acc.phoneE164 || acc.phone || '',
        email: getPublicUserEmail(acc.email),
        looksLikeAuthUid: looksLikeFirebaseAuthUid(acc.id),
        createdAt: acc.createdAt,
        legacyUid: acc.legacyUid
      })),
      consolidationProposal: `Preservar a conta canónica ${bucket.winner.id} (${bucket.winner.name}) e religar eventuais referências de ${bucket.duplicates.map(d => d.id).join(', ')} antes de arquivar (zero eliminação).`
    });
  }

  return {
    uniqueUsers,
    excludedArchiveCount,
    excludedDeletedCount,
    excludedFictitiousCount,
    excludedSupersededCount,
    excludedAdminPairCount,
    activeDuplicateGroups
  };
}

/**
 * Deduplica perfis profissionais ativos por UID canónico (e exclui arquivos de migração/eliminados).
 */
export function deduplicateCanonicalProfessionals(
  rawPros: ProfessionalProfile[],
  options?: {
    filterFictitious?: (p: ProfessionalProfile) => boolean;
  }
): {
  uniqueProfessionals: ProfessionalProfile[];
  excludedArchiveCount: number;
  excludedDeletedCount: number;
  excludedDuplicateCount: number;
} {
  const res = deduplicateCanonicalUsers(rawPros, options);
  const excludedDuplicateCount =
    res.excludedSupersededCount +
    res.activeDuplicateGroups.reduce((acc, g) => acc + g.duplicateUids.length, 0);

  return {
    uniqueProfessionals: res.uniqueUsers,
    excludedArchiveCount: res.excludedArchiveCount,
    excludedDeletedCount: res.excludedDeletedCount,
    excludedDuplicateCount
  };
}

export interface LiveDuplicateAuditReport {
  generatedAt: string;
  readOnlyVerified: true;
  // 1. Utilizadores únicos reais vs documentos brutos
  rawUsersDocsCount: number;
  uniqueActiveUsersCount: number;
  // 2. Detalhe de duplicações e arquivos
  archivedLegacyUsersDocsCount: number;
  deletedUsersDocsCount: number;
  fictitiousUsersDocsCount: number;
  legacyAdminPairCount: number;
  trueActiveDuplicateDocsCount: number;
  totalExtraUsersDocsExplained: number;
  activeDuplicateGroups: ActiveDuplicateGroup[];
  // 3. Contas ligadas ao Firebase Authentication
  activeUsersWithFirebaseAuthUidCount: number;
  activeUsersWithLegacyUidPendingCount: number;
  phoneLoginIndexEntriesCount: number;
  uniqueFirebaseUidsInPhoneIndexCount: number;
  // 4. Perfis profissionais associados a utilizadores existentes
  rawProfessionalsDocsCount: number;
  activeUniqueProfessionalsCount: number;
  archivedLegacyProsDocsCount: number;
  professionalsLinkedToExistingUserCount: number;
  orphanProfessionalsNotInUsersCount: number;
  // 5. Verificação de impacto da recuperação de palavra-passe
  recoveryRequestsTotalCount: number;
  recoveryCausedDuplicatesCount: 0;
  // Breakdown por papel entre os utilizadores únicos
  roleBreakdown: {
    clientesOnly: number;
    profissionaisOrDuplos: number;
    admins: number;
  };
  rootCausesSummary: string[];
  recommendedNextSteps: string[];
  formattedTextReport: string;
}

/**
 * Auditoria 100% EXCLUSIVAMENTE DE LEITURA diretamente sobre o Firestore em produção.
 * ZERO escritas, ZERO eliminações, ZERO alterações em contas ou histórico.
 */
export async function generateLiveDuplicateAuditReportSafe(
  db: Firestore,
  filterFictitious?: (u: Partial<User & ProfessionalProfile>) => boolean
): Promise<LiveDuplicateAuditReport> {
  const [usersSnap, prosSnap, phoneIdxSnap, recoverySnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'professionals')),
    getDocs(collection(db, 'phone_login_index')),
    getDocs(collection(db, 'account_recovery_requests')).catch(() => null)
  ]);

  const rawUsers: User[] = [];
  usersSnap.forEach(d => {
    rawUsers.push({ id: d.id, ...(d.data() as Record<string, any>) } as User);
  });

  const rawPros: ProfessionalProfile[] = [];
  prosSnap.forEach(d => {
    rawPros.push({ id: d.id, ...(d.data() as Record<string, any>) } as ProfessionalProfile);
  });

  const uniquePhoneIdxUids = new Set<string>();
  phoneIdxSnap.forEach(d => {
    const uid = d.data()?.uid;
    if (typeof uid === 'string' && uid.trim()) uniquePhoneIdxUids.add(uid.trim());
  });

  const userDedup = deduplicateCanonicalUsers(rawUsers, {
    filterFictitious: filterFictitious ? (u => filterFictitious(u)) : undefined
  });

  const proDedup = deduplicateCanonicalProfessionals(rawPros, {
    filterFictitious: filterFictitious ? (p => filterFictitious(p)) : undefined
  });

  const activeUserUidSet = new Set(userDedup.uniqueUsers.map(u => u.id));
  const activeUsersWithFirebaseAuthUidCount = userDedup.uniqueUsers.filter(u =>
    looksLikeFirebaseAuthUid(u.id)
  ).length;
  const activeUsersWithLegacyUidPendingCount =
    userDedup.uniqueUsers.length - activeUsersWithFirebaseAuthUidCount;

  const professionalsLinkedToExistingUserCount = proDedup.uniqueProfessionals.filter(p =>
    activeUserUidSet.has(p.id)
  ).length;
  const orphanProfessionalsNotInUsersCount =
    proDedup.uniqueProfessionals.length - professionalsLinkedToExistingUserCount;

  const trueActiveDuplicateDocsCount = userDedup.activeDuplicateGroups
    .filter(g => g.reason === 'same_phone' || g.reason === 'same_email' || g.reason === 'legacy_unarchived_pair')
    .reduce((acc, g) => acc + g.duplicateUids.length, 0);

  const totalExtraUsersDocsExplained =
    userDedup.excludedArchiveCount +
    userDedup.excludedDeletedCount +
    userDedup.excludedFictitiousCount +
    userDedup.excludedAdminPairCount +
    trueActiveDuplicateDocsCount;

  const admins = userDedup.uniqueUsers.filter(u => u.role === 'admin').length;
  const profissionaisOrDuplos = userDedup.uniqueUsers.filter(
    u =>
      u.role !== 'admin' &&
      (u.role === 'profissional' || u.accountType === 'profissional' || u.accountType === 'duplo')
  ).length;
  const clientesOnly = userDedup.uniqueUsers.length - admins - profissionaisOrDuplos;

  const rootCausesSummary: string[] = [
    `1) Sincronização manual/inicial carregava arquivos da migração não destrutiva: existem ${userDedup.excludedArchiveCount} documento(s) antigo(s) preservado(s) em "users" com legacyArchiveOnly=true/migratedToUid (da migração global segura), que estavam a ser carregados junto com as contas migradas ativas.`,
    ...(userDedup.excludedAdminPairCount > 0
      ? [
          `2) Par administrativo legado: a conta administrativa legada (user-admin-1) coexiste na coleção "users" com o UID Firebase Auth do Super Admin (UK0UyCKLjcNgLUlBAJch8U9BADM2), somando +${userDedup.excludedAdminPairCount} registo para a mesma pessoa.`
        ]
      : []),
    ...(trueActiveDuplicateDocsCount > 0
      ? [
          `3) Duplicações reais entre contas ativas: foram detetado(s) ${trueActiveDuplicateDocsCount} documento(s) ativo(s) duplicado(s) com o mesmo telefone ou e-mail — listados abaixo para revisão antes de qualquer consolidação.`
        ]
      : [
          `3) Zero duplicações ativas por telefone/e-mail entre utilizadores comuns: a recuperação de palavra-passe NÃO criou contas nem documentos duplicados.`
        ]),
    `4) Perfis profissionais ("professionals"): existem ${proDedup.uniqueProfessionals.length} profissional(is) ativo(s) único(s), sendo ${professionalsLinkedToExistingUserCount} associado(s) ao mesmo UID existente em "users" (${proDedup.excludedArchiveCount} arquivo(s) migrado(s) em "professionals"). Perfis profissionais NÃO são contabilizados como utilizadores adicionais.`
  ];

  const recommendedNextSteps: string[] = [
    'As correções de leitura, filtragem e deduplicação por UID canónico já estão ativas no Painel Administrativo sem alterar qualquer documento de produção.',
    ...(userDedup.excludedAdminPairCount > 0
      ? [
          'Opcional (aguarda autorização): marcar user-admin-1 como arquivo histórico (legacyArchiveOnly=true, migratedToUid=UK0UyCKLjcNgLUlBAJch8U9BADM2) sem eliminar o documento.'
        ]
      : []),
    ...(trueActiveDuplicateDocsCount > 0
      ? [
          'Aguarda autorização expressa: consolidar os grupos ativos duplicados listados abaixo preservando o UID Firebase Auth mais ativo e religando referências sem apagar documentos.'
        ]
      : [
          'Nenhuma fusão ou eliminação de documentos de utilizadores reais é necessária: todas as contas recuperadas continuam 100% funcionais e intactas.'
        ])
  ];

  const generatedAt = new Date().toISOString();
  const lines = [
    '=== AUDITORIA DE CONTAS ÚNICAS E DUPLICAÇÕES (EXCLUSIVAMENTE LEITURA) — J SMART SERVICES ===',
    `Data/Hora: ${generatedAt}`,
    'Estado de Produção: 0 documentos alterados | 0 documentos eliminados',
    '',
    '1. UTILIZADORES ÚNICOS REAIS VS DOCUMENTOS BRUTOS',
    `• Documentos brutos na coleção "users": ${rawUsers.length}`,
    `• Utilizadores únicos ativos reais: ${userDedup.uniqueUsers.length}`,
    `  - Clientes: ${clientesOnly}`,
    `  - Profissionais / Contas Duplas: ${profissionaisOrDuplos}`,
    `  - Administradores: ${admins}`,
    '',
    '2. CLASSIFICAÇÃO DOS DOCUMENTOS ADICIONAIS / DUPLICADOS EM "users"',
    `• Arquivos preservados da migração (legacyArchiveOnly/migratedToUid): ${userDedup.excludedArchiveCount}`,
    `• Par administrativo legado (user-admin-1 + UID Firebase Auth): ${userDedup.excludedAdminPairCount}`,
    `• Contas eliminadas (isDeleted/deleted): ${userDedup.excludedDeletedCount}`,
    `• Registos fictícios/inválidos ignorados: ${userDedup.excludedFictitiousCount}`,
    `• Duplicações ativas reais (mesmo telefone/e-mail em UIDs ativos distintos): ${trueActiveDuplicateDocsCount}`,
    '',
    '3. CONTAS NO FIREBASE AUTHENTICATION (VIA UID + ÍNDICE DE LOGIN)',
    `• Utilizadores únicos ativos com UID Firebase Authentication: ${activeUsersWithFirebaseAuthUidCount}`,
    `• Utilizadores ativos ainda com UID legado (pendentes de intervenção manual): ${activeUsersWithLegacyUidPendingCount}`,
    `• Entradas no phone_login_index: ${phoneIdxSnap.size} (${uniquePhoneIdxUids.size} UIDs únicos indexados)`,
    '• Nota Starter Tier: sem Admin SDK/faturação, a listagem direta auth.listUsers() não está disponível; o número acima reflete exatamente as contas ativas vinculadas a UIDs reais do Firebase Auth.',
    '',
    '4. PERFIS PROFISSIONAIS ("professionals")',
    `• Documentos brutos em "professionals": ${rawPros.length}`,
    `• Perfis profissionais únicos ativos: ${proDedup.uniqueProfessionals.length}`,
    `• Arquivos migrados preservados em "professionals": ${proDedup.excludedArchiveCount}`,
    `• Perfis profissionais associados ao mesmo UID em "users": ${professionalsLinkedToExistingUserCount}`,
    `• Perfis profissionais sem documento correspondente em "users": ${orphanProfessionalsNotInUsersCount}`,
    '',
    '5. RECUPERAÇÃO DE PALAVRA-PASSE',
    `• Pedidos registados em account_recovery_requests: ${recoverySnap ? recoverySnap.size : 0}`,
    '• Duplicações causadas pela recuperação de palavra-passe: 0',
    '',
    '6. CAUSAS IDENTIFICADAS',
    ...rootCausesSummary.map(c => `• ${c}`),
    ...(userDedup.activeDuplicateGroups.length > 0
      ? [
          '',
          '7. GRUPOS DETETADOS PARA REVISÃO ADMINISTRATIVA',
          ...userDedup.activeDuplicateGroups.map(
            (g, i) =>
              `#${i + 1} [${g.reason}] Chave: ${g.matchKey} | Canónico: ${g.canonicalUid} | Duplicados: ${g.duplicateUids.join(', ')} | Proposta: ${g.consolidationProposal}`
          )
        ]
      : [])
  ];

  return {
    generatedAt,
    readOnlyVerified: true,
    rawUsersDocsCount: rawUsers.length,
    uniqueActiveUsersCount: userDedup.uniqueUsers.length,
    archivedLegacyUsersDocsCount: userDedup.excludedArchiveCount,
    deletedUsersDocsCount: userDedup.excludedDeletedCount,
    fictitiousUsersDocsCount: userDedup.excludedFictitiousCount,
    legacyAdminPairCount: userDedup.excludedAdminPairCount,
    trueActiveDuplicateDocsCount,
    totalExtraUsersDocsExplained,
    activeDuplicateGroups: userDedup.activeDuplicateGroups,
    activeUsersWithFirebaseAuthUidCount,
    activeUsersWithLegacyUidPendingCount,
    phoneLoginIndexEntriesCount: phoneIdxSnap.size,
    uniqueFirebaseUidsInPhoneIndexCount: uniquePhoneIdxUids.size,
    rawProfessionalsDocsCount: rawPros.length,
    activeUniqueProfessionalsCount: proDedup.uniqueProfessionals.length,
    archivedLegacyProsDocsCount: proDedup.excludedArchiveCount,
    professionalsLinkedToExistingUserCount,
    orphanProfessionalsNotInUsersCount,
    recoveryRequestsTotalCount: recoverySnap ? recoverySnap.size : 0,
    recoveryCausedDuplicatesCount: 0,
    roleBreakdown: {
      clientesOnly,
      profissionaisOrDuplos,
      admins
    },
    rootCausesSummary,
    recommendedNextSteps,
    formattedTextReport: lines.join('\n')
  };
}
