import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  MANDATORY_RECOVERY_GENERIC_MESSAGE,
  validateRecoverySubmissionInput,
  resolveRecoveryRequestAccount,
  submitAccountRecoveryRequestPublicSafe,
  updateAccountRecoveryStatusAdminSafe,
  approveAccountRecoveryAdminSafe,
  verifyResetLinkCodeSafe,
  confirmPasswordResetSafe,
  verifySingleUseRecoveryTokenState,
  isAuthorizedAdminActor,
  PhoneIndexSnapshotEntry
} from './src/utils/accountRecoveryService';
import {
  validateStrictAngolaPhone,
  normalizePhoneNumber,
  OFFICIAL_ADMIN_EMAIL
} from './src/utils/phoneAuthUtils';
import { AccountRecoveryRequest, User } from './src/types';

// Isolated synthetic fixtures in memory ONLY — zero interaction with production Firestore or real user accounts
const FIXTURE_USERS: User[] = [
  {
    id: 'LegacyMigratedUid00000000001',
    legacyUid: 'user-1700000000001',
    migratedFromLegacyUid: 'user-1700000000001',
    name: 'Cliente Antigo Teste',
    email: 'cliente.antigo.teste@gmail.com',
    phone: '+244911111111',
    phoneE164: '+244911111111',
    role: 'cliente',
    avatar: '',
    province: 'Luanda',
    verified: true,
    createdAt: '2025-02-01T10:00:00.000Z'
  },
  {
    id: 'user-1700000000001',
    migratedToUid: 'LegacyMigratedUid00000000001',
    legacyArchiveOnly: true,
    name: 'Cliente Antigo Teste',
    email: 'cliente.antigo.teste@gmail.com',
    phone: '911 111 111',
    role: 'cliente',
    avatar: '',
    province: 'Luanda',
    verified: true,
    createdAt: '2025-02-01T10:00:00.000Z'
  },
  {
    id: 'NewAccountWithEmailUid000002',
    name: 'Profissional Novo Email',
    email: 'pro.novo.teste@gmail.com',
    phone: '+244922222222',
    phoneE164: '+244922222222',
    role: 'profissional',
    avatar: '',
    province: 'Benguela',
    verified: true,
    createdAt: '2026-11-10T10:00:00.000Z'
  },
  {
    id: 'NewAccountPhoneOnlyUid000003',
    name: 'Cliente Novo Sem Email',
    email: 'u_244933333333@phone.jsmartservices.com',
    phone: '+244933333333',
    phoneE164: '+244933333333',
    role: 'cliente',
    avatar: '',
    province: 'Luanda',
    verified: true,
    createdAt: '2026-11-15T10:00:00.000Z'
  }
];

const FIXTURE_PHONE_INDEX: PhoneIndexSnapshotEntry[] = [
  {
    id: 'ph_1111111111111111',
    uid: 'LegacyMigratedUid00000000001',
    authMode: 'legacy_email',
    authEmail: 'cliente.antigo.teste@gmail.com',
    hasRealEmail: true
  },
  {
    id: 'ph_2222222222222222',
    uid: 'NewAccountWithEmailUid000002',
    authMode: 'legacy_email',
    authEmail: 'pro.novo.teste@gmail.com',
    hasRealEmail: true
  },
  {
    id: 'ph_3333333333333333',
    uid: 'NewAccountPhoneOnlyUid000003',
    authMode: 'phone_synthetic',
    authEmail: 'u_244933333333@phone.jsmartservices.com',
    hasRealEmail: false
  }
];

const ADMIN_ACTOR = {
  uid: 'UK0UyCKLjcNgLUlBAJch8U9BADM2',
  name: 'Super Administrador',
  role: 'admin',
  email: OFFICIAL_ADMIN_EMAIL,
  emailVerified: true
};

const NORMAL_USER_ACTOR = {
  uid: 'NewAccountPhoneOnlyUid000003',
  name: 'Cliente Comum',
  role: 'cliente',
  email: 'u_244933333333@phone.jsmartservices.com',
  emailVerified: false
};

function makeRecoveryRequest(
  id: string,
  submittedPhone?: string,
  submittedEmail?: string
): AccountRecoveryRequest {
  const nowIso = new Date().toISOString();
  return {
    id,
    submittedPhone,
    submittedEmail,
    identifierType: submittedPhone && submittedEmail ? 'both' : submittedPhone ? 'phone' : 'email',
    status: 'pendente',
    createdAt: nowIso,
    updatedAt: nowIso
  };
}

describe('Sistema de Recuperação de Contas — J Smart Services Angola (11 Cenários Obrigatórios)', () => {
  it('Cenário 1: Recuperação por telefone de conta antiga (aceita +244XXXXXXXXX, mensagem genérica ao utilizador, verificação interna encontra conta migrada)', async () => {
    const check = validateRecoverySubmissionInput({ phone: '+244911111111' });
    expect(check.isValid).toBe(true);
    expect(check.identifierType).toBe('phone');
    expect(check.submittedPhone).toBe('+244911111111');

    const submitRes = await submitAccountRecoveryRequestPublicSafe(
      null,
      { phone: '+244911111111' },
      { fetchImpl: undefined, skipRateLimit: true }
    );
    expect(submitRes.success).toBe(true);
    expect(submitRes.message).toBe(MANDATORY_RECOVERY_GENERIC_MESSAGE);

    const matched = resolveRecoveryRequestAccount(
      { submittedPhone: '+244911111111' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matched.matched).toBe(true);
    expect(matched.matchSource).toBe('phone');
    expect(matched.accountOrigin).toBe('legacy_migrated');
    expect(matched.uid).toBe('LegacyMigratedUid00000000001');
    expect(matched.legacyUid).toBe('user-1700000000001');
    expect(matched.holderName).toBe('Cliente Antigo Teste');
    expect(matched.role).toBe('cliente');
    expect(matched.hasVerifiableEmail).toBe(true);
    expect(matched.authEmail).toBe('cliente.antigo.teste@gmail.com');
  });

  it('Cenário 2: Recuperação por e-mail Gmail de conta antiga (sem preencher telefone)', async () => {
    const check = validateRecoverySubmissionInput({ email: 'CLIENTE.ANTIGO.TESTE@GMAIL.COM' });
    expect(check.isValid).toBe(true);
    expect(check.identifierType).toBe('email');
    expect(check.submittedEmail).toBe('cliente.antigo.teste@gmail.com');

    const submitRes = await submitAccountRecoveryRequestPublicSafe(
      null,
      { email: 'cliente.antigo.teste@gmail.com' },
      { fetchImpl: undefined, skipRateLimit: true }
    );
    expect(submitRes.success).toBe(true);
    expect(submitRes.message).toBe(MANDATORY_RECOVERY_GENERIC_MESSAGE);

    const matched = resolveRecoveryRequestAccount(
      { submittedEmail: 'cliente.antigo.teste@gmail.com' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matched.matched).toBe(true);
    expect(matched.matchSource).toBe('email');
    expect(matched.accountOrigin).toBe('legacy_migrated');
    expect(matched.uid).toBe('LegacyMigratedUid00000000001');
    expect(matched.phone).toBe('+244911111111');
  });

  it('Cenário 3: Recuperação de conta nova (com e-mail opcional e apenas com telefone sem e-mail)', async () => {
    // 3a) Conta nova de profissional com e-mail opcional registado
    const matchedWithEmail = resolveRecoveryRequestAccount(
      { submittedPhone: '+244922222222' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matchedWithEmail.matched).toBe(true);
    expect(matchedWithEmail.accountOrigin).toBe('new_account');
    expect(matchedWithEmail.role).toBe('profissional');
    expect(matchedWithEmail.hasVerifiableEmail).toBe(true);

    // 3b) Conta nova apenas com telefone (sem e-mail) -> sem gateway SMS configurado, mantém pendente/em análise sem simular envio
    const matchedPhoneOnly = resolveRecoveryRequestAccount(
      { submittedPhone: '+244933333333' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matchedPhoneOnly.matched).toBe(true);
    expect(matchedPhoneOnly.accountOrigin).toBe('new_account');
    expect(matchedPhoneOnly.hasVerifiableEmail).toBe(false);
    expect(matchedPhoneOnly.hasPhone).toBe(true);

    const reqPhoneOnly = makeRecoveryRequest('rec_newphoneonly001', '+244933333333');
    const approveRes = await approveAccountRecoveryAdminSafe(
      null,
      null,
      ADMIN_ACTOR,
      reqPhoneOnly,
      matchedPhoneOnly
    );
    expect(approveRes.success).toBe(false);
    expect(approveRes.status).toBe('em_analise');
    expect(approveRes.deliveryMethod).toBe('manual_pending');
    expect(approveRes.requiresExternalSmsConfig).toBe(true);
  });

  it('Cenário 4: Número inexistente devolve exatamente a mesma mensagem genérica (anti-enumeração)', async () => {
    const resExisting = await submitAccountRecoveryRequestPublicSafe(
      null,
      { phone: '+244911111111' },
      { fetchImpl: undefined, skipRateLimit: true }
    );
    const resNonExistent = await submitAccountRecoveryRequestPublicSafe(
      null,
      { phone: '+244999888777' },
      { fetchImpl: undefined, skipRateLimit: true }
    );

    expect(resNonExistent.success).toBe(true);
    expect(resNonExistent.message).toBe(MANDATORY_RECOVERY_GENERIC_MESSAGE);
    expect(resNonExistent.message).toBe(resExisting.message);

    const matched = resolveRecoveryRequestAccount(
      { submittedPhone: '+244999888777' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matched.matched).toBe(false);
    expect(matched.accountOrigin).toBe('none');
  });

  it('Cenário 5: E-mail inexistente devolve exatamente a mesma mensagem genérica (anti-enumeração)', async () => {
    const resExisting = await submitAccountRecoveryRequestPublicSafe(
      null,
      { email: 'cliente.antigo.teste@gmail.com' },
      { fetchImpl: undefined, skipRateLimit: true }
    );
    const resNonExistent = await submitAccountRecoveryRequestPublicSafe(
      null,
      { email: 'nao.existe.jsmart@gmail.com' },
      { fetchImpl: undefined, skipRateLimit: true }
    );

    expect(resNonExistent.success).toBe(true);
    expect(resNonExistent.message).toBe(MANDATORY_RECOVERY_GENERIC_MESSAGE);
    expect(resNonExistent.message).toBe(resExisting.message);

    const matched = resolveRecoveryRequestAccount(
      { submittedEmail: 'nao.existe.jsmart@gmail.com' },
      FIXTURE_USERS,
      [],
      FIXTURE_PHONE_INDEX
    );
    expect(matched.matched).toBe(false);
  });

  it('Cenário 6: Aprovação administrativa dispara link oficial temporário Firebase sem criar/expor palavra-passe', async () => {
    const req = makeRecoveryRequest('rec_approve_test_001', '+244911111111');
    const matched = resolveRecoveryRequestAccount(req, FIXTURE_USERS, [], FIXTURE_PHONE_INDEX);

    const sentLinks: Array<{ email: string; continueUrl: string }> = [];
    const sendResetEmailImpl = vi.fn(async (email: string, continueUrl: string) => {
      sentLinks.push({ email, continueUrl });
    });

    const approveRes = await approveAccountRecoveryAdminSafe(
      null,
      null,
      ADMIN_ACTOR,
      req,
      matched,
      { sendResetEmailImpl }
    );

    expect(approveRes.success).toBe(true);
    expect(approveRes.status).toBe('aprovado');
    expect(approveRes.deliveryMethod).toBe('firebase_email_link');
    expect(sendResetEmailImpl).toHaveBeenCalledTimes(1);
    expect(sentLinks[0].email).toBe('cliente.antigo.teste@gmail.com');
    expect(sentLinks[0].continueUrl).toContain('https://jsmartservices.com');
    expect(approveRes.updatedFields?.reviewedBy).toBe(ADMIN_ACTOR.uid);
    expect(approveRes.updatedFields?.approvedAt).toBeTruthy();
    expect(approveRes.updatedFields && 'password' in approveRes.updatedFields).toBe(false);
  });

  it('Cenário 7: Rejeição administrativa atualiza estado para rejeitado com motivo e auditoria', async () => {
    const req = makeRecoveryRequest('rec_reject_test_001', '+244999888777');
    const matched = resolveRecoveryRequestAccount(req, FIXTURE_USERS, [], FIXTURE_PHONE_INDEX);

    const rejectRes = await updateAccountRecoveryStatusAdminSafe(
      null,
      ADMIN_ACTOR,
      req.id,
      'rejeitado',
      {
        rejectionReason: 'Nenhuma conta associada encontrada após verificação.',
        matchedAccount: matched
      }
    );

    expect(rejectRes.success).toBe(true);
    expect(rejectRes.updatedFields?.status).toBe('rejeitado');
    expect(rejectRes.updatedFields?.rejectionReason).toBe(
      'Nenhuma conta associada encontrada após verificação.'
    );
    expect(rejectRes.updatedFields?.reviewedBy).toBe(ADMIN_ACTOR.uid);
  });

  it('Cenário 8: Código/link expirado é rejeitado (tanto oobCode Firebase como token temporário)', async () => {
    // 8a) Link Firebase expirado (auth/expired-action-code)
    const verifyExpired = await verifyResetLinkCodeSafe(null, 'EXPIRED_OOB_CODE', async () => {
      const err: any = new Error('Expired');
      err.code = 'auth/expired-action-code';
      throw err;
    });
    expect(verifyExpired.valid).toBe(false);
    expect(verifyExpired.errorCode).toBe('expired');

    const confirmExpired = await confirmPasswordResetSafe(
      null,
      'EXPIRED_OOB_CODE',
      'NovaSenha2026!',
      'NovaSenha2026!',
      {
        confirmImpl: async () => {
          const err: any = new Error('Expired');
          err.code = 'auth/expired-action-code';
          throw err;
        }
      }
    );
    expect(confirmExpired.success).toBe(false);
    expect(confirmExpired.errorCode).toBe('expired');

    // 8b) Código temporário expirado
    const expiredToken = {
      id: 'tok_exp',
      code: '482910',
      expiresAt: 1_700_000_000_000,
      usedAt: null,
      attemptsLeft: 3
    };
    const tokenRes = verifySingleUseRecoveryTokenState(expiredToken, '482910', 1_700_000_060_000);
    expect(tokenRes.valid).toBe(false);
    expect(tokenRes.reason).toBe('expired');
  });

  it('Cenário 9: Código/link já utilizado é rejeitado (uso único + limite de tentativas)', async () => {
    // 9a) Link Firebase já utilizado (auth/invalid-action-code)
    const verifyUsed = await verifyResetLinkCodeSafe(null, 'USED_OOB_CODE', async () => {
      const err: any = new Error('Already used');
      err.code = 'auth/invalid-action-code';
      throw err;
    });
    expect(verifyUsed.valid).toBe(false);
    expect(verifyUsed.errorCode).toBe('used_or_invalid');

    // 9b) Token temporário usado uma vez -> segunda tentativa bloqueada imediatamente
    const now = 1_700_000_000_000;
    const singleUseToken = {
      id: 'tok_once',
      code: '654321',
      expiresAt: now + 15 * 60_000,
      usedAt: null as number | null,
      attemptsLeft: 3
    };

    const firstUse = verifySingleUseRecoveryTokenState(singleUseToken, '654321', now + 1000);
    expect(firstUse.valid).toBe(true);
    expect(singleUseToken.usedAt).toBe(now + 1000);

    const secondUse = verifySingleUseRecoveryTokenState(singleUseToken, '654321', now + 2000);
    expect(secondUse.valid).toBe(false);
    expect(secondUse.reason).toBe('already_used');
  });

  it('Cenário 10: Tentativa de acesso administrativo por utilizador normal é bloqueada em lógica, Firestore rules e backend', async () => {
    // 10a) Guardas de ator administrativo rejeitam utilizador comum
    expect(isAuthorizedAdminActor(NORMAL_USER_ACTOR)).toBe(false);
    expect(isAuthorizedAdminActor(null)).toBe(false);
    expect(isAuthorizedAdminActor(ADMIN_ACTOR)).toBe(true);

    const req = makeRecoveryRequest('rec_unauth_test_001', '+244911111111');
    const matched = resolveRecoveryRequestAccount(req, FIXTURE_USERS, [], FIXTURE_PHONE_INDEX);

    const unauthStatusUpdate = await updateAccountRecoveryStatusAdminSafe(
      null,
      NORMAL_USER_ACTOR,
      req.id,
      'em_analise'
    );
    expect(unauthStatusUpdate.success).toBe(false);
    expect(unauthStatusUpdate.message).toContain('Acesso negado');

    const unauthApprove = await approveAccountRecoveryAdminSafe(
      null,
      null,
      NORMAL_USER_ACTOR,
      req,
      matched
    );
    expect(unauthApprove.success).toBe(false);
    expect(unauthApprove.message).toContain('Acesso negado');

    // 10b) Regras Firestore permitem apenas create write-only com schema válido, e bloqueiam get/list/update/delete a não-admins
    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    expect(rulesText).toContain('match /account_recovery_requests/{requestId}');
    expect(rulesText).toContain('allow get: if isValidId(requestId) && isAdmin();');
    expect(rulesText).toContain('allow list: if isAdmin();');
    expect(rulesText).toContain('allow update: if isValidId(requestId) && isAdmin() && hasNoSecrets(incoming());');
    expect(rulesText).toContain('allow delete: if isValidId(requestId) && isAdmin();');

    // 10c) Backend exige verificação de token Bearer administrativo em /issue-code (retorna 403)
    const serverText = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    expect(serverText).toContain('/api/v1/auth/recovery-requests/:id/issue-code');
    expect(serverText).toContain('verifyFirebaseAdminBearerToken');
    expect(serverText).toContain('res.status(403)');
  });

  it('Cenário 11: Redefinição conclui na conta existente, limpa sessão anterior e permite login posterior exclusivamente com telefone angolano (+244) + nova palavra-passe', async () => {
    let updatedPasswordOnExistingAccount = '';
    let signedOutOldSession = false;

    const resetRes = await confirmPasswordResetSafe(
      null,
      'VALID_SINGLE_USE_OOB_CODE',
      'NovaSenhaSegura2026',
      'NovaSenhaSegura2026',
      {
        confirmImpl: async (_code, pass) => {
          updatedPasswordOnExistingAccount = pass;
        },
        signOutImpl: async () => {
          signedOutOldSession = true;
        }
      }
    );

    expect(resetRes.success).toBe(true);
    expect(updatedPasswordOnExistingAccount).toBe('NovaSenhaSegura2026');
    expect(signedOutOldSession).toBe(true);

    // Simular validação de login posterior com telefone angolano (+244 + 9 dígitos) + nova palavra-passe
    const loginPhone = validateStrictAngolaPhone('+244911111111');
    expect(loginPhone.isValid).toBe(true);
    expect(normalizePhoneNumber('+244911111111').e164).toBe('+244911111111');

    // Verificar que o ecrã de início de sessão permanece estritamente telefone + palavra-passe (sem login por e-mail / sem botão Entrar com Gmail)
    const authModalText = fs.readFileSync(
      path.resolve(process.cwd(), 'src/components/AuthModal.tsx'),
      'utf8'
    );
    expect(authModalText).toContain('Número de telefone *');
    expect(authModalText).toContain('Palavra-passe *');
    expect(authModalText).toContain('Esqueci a palavra-passe');
    expect(authModalText).not.toContain('Entrar com Gmail');
    expect(authModalText).not.toContain('Entrar com Google');
    expect(authModalText).not.toContain('Endereço de e-mail *');
  });
});
