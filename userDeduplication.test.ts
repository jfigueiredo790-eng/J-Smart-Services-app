import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isArchivedOrDeletedAccountRecord,
  deduplicateCanonicalUsers,
  deduplicateCanonicalProfessionals
} from './src/utils/userDeduplicationUtils';
import { ProfessionalProfile, User } from './src/types';

function makeAuthUid(index: number): string {
  // 28-character Firebase Auth style UID
  const suffix = String(index).padStart(6, '0');
  return `FbAuthUidJSmartUser202${suffix}`;
}

function makeBaseUser(overrides: Partial<User> & { id: string }): User {
  return {
    name: 'Utilizador Teste',
    email: 'user@example.com',
    phone: '+244923000000',
    phoneE164: '+244923000000',
    avatar: '',
    role: 'cliente',
    accountType: 'cliente',
    province: 'Luanda',
    address: 'Luanda',
    verified: true,
    createdAt: '2026-10-01T10:00:00.000Z',
    ...overrides
  };
}

function makeBasePro(overrides: Partial<ProfessionalProfile> & { id: string }): ProfessionalProfile {
  return {
    ...makeBaseUser({
      role: 'profissional',
      accountType: 'duplo',
      ...overrides
    }),
    address: overrides.address ?? 'Luanda',
    categories: ['Eletricista'],
    bio: 'Profissional qualificado em Angola.',
    experienceYears: 3,
    hourlyRateKz: 5000,
    rating: 4.9,
    reviewCount: 5,
    completedJobs: 10,
    verified: true,
    documentsVerified: true,
    isAutoApproved: true,
    portfolioImages: [],
    status: 'disponivel',
    plan: 'gratuito',
    ...overrides
  };
}

describe('userDeduplicationUtils — Correção Definitiva de Contas Duplicadas (39 -> 77)', () => {
  it('reproduz exatamente o cenário real 39 -> 77 (37 migrados + 37 arquivos + par admin + 1 legado pendente) e consolida para 39 utilizadores únicos', () => {
    const rawDocs: User[] = [];

    // 37 contas migradas ativas (Firebase Auth UID) + 37 arquivos históricos preservados (legacyArchiveOnly + migratedToUid)
    for (let i = 1; i <= 37; i++) {
      const legacyId = `user-178648515${String(i).padStart(4, '0')}`;
      const newUid = makeAuthUid(i);
      const phone = `+244923${String(100000 + i)}`;
      const email = `conta${i}@gmail.com`;
      const isPro = i <= 15;

      rawDocs.push(
        makeBaseUser({
          id: newUid,
          legacyUid: legacyId,
          migratedFromLegacyUid: legacyId,
          name: `Utilizador Real ${i}`,
          phone,
          phoneE164: phone,
          email,
          role: isPro ? 'profissional' : 'cliente',
          accountType: isPro ? 'duplo' : 'cliente'
        })
      );

      rawDocs.push(
        makeBaseUser({
          id: legacyId,
          name: `Utilizador Real ${i}`,
          phone,
          phoneE164: phone,
          email,
          role: isPro ? 'profissional' : 'cliente',
          accountType: isPro ? 'duplo' : 'cliente',
          legacyArchiveOnly: true,
          migratedToUid: newUid
        })
      );
    }

    // 1 conta legada pendente de intervenção manual (sem arquivo nem migração ainda)
    rawDocs.push(
      makeBaseUser({
        id: 'user-1786489999999',
        name: 'Cesaltino Lucas Manuel',
        phone: '+244944111222',
        phoneE164: '+244944111222',
        email: '',
        role: 'profissional',
        accountType: 'duplo'
      })
    );

    // Par administrativo: UID Firebase Auth do Super Admin + documento legado user-admin-1
    rawDocs.push(
      makeBaseUser({
        id: 'UK0UyCKLjcNgLUlBAJch8U9BADM2',
        name: 'Super Admin J Smart',
        email: 'jfigueiredo790@gmail.com',
        phone: '+244923456789',
        phoneE164: '+244923456789',
        role: 'admin',
        accountType: 'cliente'
      })
    );
    rawDocs.push(
      makeBaseUser({
        id: 'user-admin-1',
        name: 'Admin Legado J Smart',
        email: 'jfigueiredo790@gmail.com',
        phone: '+244923456789',
        phoneE164: '+244923456789',
        role: 'admin',
        accountType: 'cliente'
      })
    );

    // Total bruto exato de 77 documentos (37*2 + 1 + 2 = 77)
    expect(rawDocs.length).toBe(77);

    const result = deduplicateCanonicalUsers(rawDocs);

    expect(result.uniqueUsers.length).toBe(39);
    expect(result.excludedArchiveCount).toBe(37);
    expect(result.excludedAdminPairCount).toBe(1);
    expect(result.excludedDeletedCount).toBe(0);
    expect(result.excludedSupersededCount).toBe(0);

    // O único grupo sinalizado deve ser o par administrativo legado, mantendo UK0UyCKLjcNgLUlBAJch8U9BADM2 como canónico
    expect(result.activeDuplicateGroups.length).toBe(1);
    expect(result.activeDuplicateGroups[0].reason).toBe('legacy_admin_pair');
    expect(result.activeDuplicateGroups[0].canonicalUid).toBe('UK0UyCKLjcNgLUlBAJch8U9BADM2');
    expect(result.activeDuplicateGroups[0].duplicateUids).toEqual(['user-admin-1']);

    // Nenhuma conta ativa duplicada de cliente/profissional
    const trueActiveDuplicates = result.activeDuplicateGroups.filter(
      g => g.reason === 'same_phone' || g.reason === 'same_email' || g.reason === 'legacy_unarchived_pair'
    );
    expect(trueActiveDuplicates.length).toBe(0);

    // Garante que o UID Firebase Auth do admin foi preservado e user-admin-1 não aparece duplicado
    expect(result.uniqueUsers.some(u => u.id === 'UK0UyCKLjcNgLUlBAJch8U9BADM2')).toBe(true);
    expect(result.uniqueUsers.some(u => u.id === 'user-admin-1')).toBe(false);
    // Garante que Cesaltino continua preservado
    expect(result.uniqueUsers.some(u => u.id === 'user-1786489999999')).toBe(true);
  });

  it('garante que um utilizador com conta dupla / perfil profissional associado pelo mesmo UID conta exatamente como 1 utilizador e 1 profissional', () => {
    const sharedUid = makeAuthUid(101);
    const archivedLegacyUid = 'user-178600000101';

    const usersResult = deduplicateCanonicalUsers([
      makeBaseUser({
        id: sharedUid,
        legacyUid: archivedLegacyUid,
        name: 'João Eletricista',
        phone: '+244931222333',
        phoneE164: '+244931222333',
        email: 'joao.eletricista@gmail.com',
        role: 'profissional',
        accountType: 'duplo'
      }),
      makeBaseUser({
        id: archivedLegacyUid,
        name: 'João Eletricista',
        phone: '+244931222333',
        phoneE164: '+244931222333',
        email: 'joao.eletricista@gmail.com',
        role: 'profissional',
        accountType: 'duplo',
        legacyArchiveOnly: true,
        migratedToUid: sharedUid
      })
    ]);

    const prosResult = deduplicateCanonicalProfessionals([
      makeBasePro({
        id: sharedUid,
        legacyUid: archivedLegacyUid,
        name: 'João Eletricista',
        phone: '+244931222333',
        phoneE164: '+244931222333',
        email: 'joao.eletricista@gmail.com'
      }),
      makeBasePro({
        id: archivedLegacyUid,
        name: 'João Eletricista',
        phone: '+244931222333',
        phoneE164: '+244931222333',
        email: 'joao.eletricista@gmail.com',
        legacyArchiveOnly: true,
        migratedToUid: sharedUid
      })
    ]);

    expect(usersResult.uniqueUsers).toHaveLength(1);
    expect(prosResult.uniqueProfessionals).toHaveLength(1);
    expect(prosResult.excludedArchiveCount).toBe(1);
    expect(usersResult.uniqueUsers[0].id).toBe(sharedUid);
    expect(prosResult.uniqueProfessionals[0].id).toBe(sharedUid);
  });

  it('deteta e deduplica duplicação ativa real (mesmo telefone +244 ou mesmo e-mail real) preferindo o UID Firebase Auth e gerando proposta segura', () => {
    const authUid = makeAuthUid(202);
    const secondUid = 'user-179000000202';

    const result = deduplicateCanonicalUsers([
      makeBaseUser({
        id: secondUid,
        name: 'Maria Kumeso (Antigo)',
        phone: '944926697',
        phoneE164: '+244944926697',
        email: 'mariakumeso1966@gmail.com'
      }),
      makeBaseUser({
        id: authUid,
        name: 'Maria Kumeso (Auth)',
        phone: '+244 944 926 697',
        phoneE164: '+244944926697',
        email: 'mariakumeso1966@gmail.com'
      })
    ]);

    expect(result.uniqueUsers).toHaveLength(1);
    expect(result.uniqueUsers[0].id).toBe(authUid);
    expect(result.activeDuplicateGroups).toHaveLength(1);
    expect(result.activeDuplicateGroups[0].reason).toBe('same_phone');
    expect(result.activeDuplicateGroups[0].canonicalUid).toBe(authUid);
    expect(result.activeDuplicateGroups[0].duplicateUids).toEqual([secondUid]);
    expect(result.activeDuplicateGroups[0].consolidationProposal).toContain(authUid);
  });

  it('apanha um par legado não arquivado quando o documento ativo já referencia o antigo em legacyUid', () => {
    const authUid = makeAuthUid(303);
    const unarchivedLegacyUid = 'user-178655500303';

    const result = deduplicateCanonicalUsers([
      makeBaseUser({
        id: authUid,
        legacyUid: unarchivedLegacyUid,
        name: 'Carlos Domingos',
        phone: '+244924555666',
        phoneE164: '+244924555666',
        email: 'carlos.d@gmail.com'
      }),
      makeBaseUser({
        id: unarchivedLegacyUid,
        name: 'Carlos Domingos',
        phone: '+244924555666',
        phoneE164: '+244924555666',
        email: 'carlos.d@gmail.com'
      })
    ]);

    expect(result.uniqueUsers).toHaveLength(1);
    expect(result.uniqueUsers[0].id).toBe(authUid);
    expect(result.excludedSupersededCount).toBe(1);
    expect(result.activeDuplicateGroups).toHaveLength(1);
    expect(result.activeDuplicateGroups[0].reason).toBe('legacy_unarchived_pair');
  });

  it('classifica corretamente documentos arquivados ou eliminados em isArchivedOrDeletedAccountRecord', () => {
    expect(isArchivedOrDeletedAccountRecord({ legacyArchiveOnly: true })).toBe(true);
    expect(isArchivedOrDeletedAccountRecord({ migratedToUid: 'abc1234567890123456789012345' })).toBe(true);
    expect(isArchivedOrDeletedAccountRecord({ isDeleted: true })).toBe(true);
    expect(isArchivedOrDeletedAccountRecord({ status: 'deleted' })).toBe(true);
    expect(isArchivedOrDeletedAccountRecord(null)).toBe(true);
    expect(isArchivedOrDeletedAccountRecord({ id: makeAuthUid(1), name: 'Ativo' })).toBe(false);
  });

  it('verificação estática: userDeduplicationUtils é 100% somente leitura e AppContext filtra arquivos em todos os pontos de leitura/sincronização', () => {
    const dedupSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/utils/userDeduplicationUtils.ts'),
      'utf8'
    );
    // Zero operações de escrita ou eliminação na auditoria
    expect(dedupSource).not.toMatch(/\b(deleteDoc|setDoc|updateDoc|addDoc|writeBatch)\b/);

    const appContextSource = fs.readFileSync(
      path.resolve(process.cwd(), 'src/context/AppContext.tsx'),
      'utf8'
    );

    // Todos os fluxos críticos (hidratação, onSnapshot, forceSyncWithFirestore, migrateLegacyAccountsPhoneIndexAsync) devem usar isArchivedOrDeletedAccountRecord
    const archivedCheckMatches = appContextSource.match(/isArchivedOrDeletedAccountRecord\(/g) || [];
    expect(archivedCheckMatches.length).toBeGreaterThanOrEqual(8);

    // Deduplicação canónica aplicada em users e professionals no AppContext
    expect(appContextSource).toMatch(/deduplicateCanonicalUsers\(/);
    expect(appContextSource).toMatch(/deduplicateCanonicalProfessionals\(/);
    expect(appContextSource).toMatch(/generateLiveDuplicateAuditReportSafe\(/);
  });
});
