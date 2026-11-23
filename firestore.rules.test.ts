import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  sanitizeMediaUrl,
  isSafeExternalUrl,
  stripSensitiveFields,
  sanitizePlatformSettings
} from './src/utils/securityUtils';
import { generateSecureOTP } from './src/utils/recoveryUtils';
import {
  GLOBAL_SUBSCRIPTIONS_ACTIVE,
  NEW_TRIAL_DAYS,
  PLAN_PRICES,
  ORDERED_PAID_PLANS,
  getProPlanStatus,
  validateProAction,
  isValidPaidPlanKey
} from './src/utils/planUtils';
import { runFullSystemTestSuite } from './src/utils/systemTestSuite';
import {
  ALL_USER_REFERENCE_COLLECTIONS,
  PRIORITY_TEST_LEGACY_ACCOUNT,
  PROTECTED_ADMIN_UIDS,
  isProtectedAdminAccount,
  looksLikeFirebaseAuthUid
} from './src/utils/legacyMigrationService';
import {
  INVALID_ANGOLA_PHONE_MESSAGE,
  validateStrictAngolaPhone,
  sanitizeAngolaPhoneDigitsInput,
  extractAngolaNineDigits,
  buildFullAngolaPhone,
  normalizePhoneNumber,
  phoneToSyntheticAuthEmail,
  isSyntheticPhoneAuthEmail,
  isValidLoginEmail,
  getPublicUserEmail,
  computePhoneIndexId,
  areSamePhoneNumber,
  isOfficialAdminPhone,
  OFFICIAL_ADMIN_EMAIL
} from './src/utils/phoneAuthUtils';

describe('J Smart Services Security Rules & General Update Verification', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesText = fs.readFileSync(rulesPath, 'utf8');
  const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
  const storageRulesText = fs.readFileSync(storageRulesPath, 'utf8');

  it('1. Enforces global deny catch-all and contains zero open read/write bypasses', () => {
    expect(rulesText).toContain('match /{document=**}');
    expect(rulesText).toContain('allow read, write: if false;');
    expect(rulesText).not.toMatch(/allow\s+(read|write|create|update|delete|get|list)\s*:\s*if\s+true\b/);
    expect(rulesText).not.toContain('||\n            true');
    expect(rulesText).not.toMatch(/\|\|\s*true\b/);
  });

  it('2. Protects PII collections (users, professionals) strictly by owner or admin', () => {
    expect(rulesText).toContain('match /users/{userId}');
    expect(rulesText).toContain('allow get: if isValidId(userId) && (isOwner(userId) || isAdmin());');
    expect(rulesText).toContain('match /professionals/{proId}');
    expect(rulesText).toContain('allow get: if isValidId(proId) && (isOwner(proId) || isAdmin());');
  });

  it('3. Blocks privilege escalation & client tampering on role, wallet, blocked, trial dates, and plans', () => {
    expect(rulesText).toContain("data.role in ['cliente', 'profissional']");
    expect(rulesText).toContain("data.walletBalanceKz == 0");
    expect(rulesText).toContain("data.role == prev.role");
    expect(rulesText).toContain("data.walletBalanceKz == prev.walletBalanceKz");
    expect(rulesText).toContain("data.subscriptionPlan == prev.subscriptionPlan");
    expect(rulesText).toContain("data.planStartedAt == prev.planStartedAt");
    expect(rulesText).toContain("data.planExpiresAt == prev.planExpiresAt");
    expect(rulesText).toContain("data.trialStartDate == prev.trialStartDate");
    expect(rulesText).toContain("data.trialEndsAt == prev.trialEndsAt");
    expect(rulesText).toContain("data.trialDurationDays == prev.trialDurationDays");
    expect(rulesText).toContain("data.trialStartServerTimestamp == request.time");
    expect(rulesText).toContain("!('planExpiresAt' in data)");
    expect(rulesText).toContain("!('password' in data) && !('passwordHash' in data) && !('adminPin' in data) && !('otpCode' in data)");
  });

  it('4. Requires email_verified == true for bootstrapped admin email and blocks unverified spoofing', () => {
    expect(rulesText).toContain(
      "request.auth.token.email == 'jfigueiredo790@gmail.com' && request.auth.token.email_verified == true"
    );
  });

  it('5. Isolates PII-free and proof-free public directory professionals_public', () => {
    expect(rulesText).toContain('match /professionals_public/{proId}');
    expect(rulesText).toContain("!('email' in data)");
    expect(rulesText).toContain("!('phone' in data)");
    expect(rulesText).toContain("!('documentNumber' in data)");
    expect(rulesText).toContain("!('walletBalanceKz' in data)");
    expect(rulesText).toContain("!('proofUrl' in data)");
    expect(rulesText).toContain("!('proofFileName' in data)");
    expect(rulesText).toContain("!('paymentMethod' in data)");
    expect(rulesText).toContain("!('iban' in data)");
  });

  it('6. Secures chat_messages and conversations strictly to participants or admin', () => {
    expect(rulesText).toContain('match /chat_messages/{messageId}');
    expect(rulesText).toContain("request.auth.uid in existing().participants");
    expect(rulesText).toContain('match /conversations/{conversationId}');
    expect(rulesText).toContain("request.auth.uid in incoming().participants");
  });

  it('7. Enforces service_requests terminal state locking, no clientPhone exposure, and exclusive acceptance', () => {
    expect(rulesText).toContain("!('clientPhone' in data)");
    expect(rulesText).toContain("!(existing().status in ['concluido', 'cancelado'])");
    expect(rulesText).toContain("existing().clientId != request.auth.uid");
  });

  it('8. Restricts wallet_transactions to canonical 3-plan pricing, pendente create, and owner/admin privacy', () => {
    expect(rulesText).toContain("data.status == 'pendente'");
    expect(rulesText).toContain("(data.planId == 'plan_14d' && data.amountKz == 1500)");
    expect(rulesText).toContain("(data.planId == 'plan_30d' && data.amountKz == 3000)");
    expect(rulesText).toContain("(data.planId == 'plan_90d' && data.amountKz == 8000)");
    expect(rulesText).toContain("!('reviewedBy' in data)");
    expect(rulesText).toContain("!('subscriptionExpiresAt' in data)");
    expect(rulesText).toContain('allow get: if isValidId(txId) && (isAdmin() || (isSignedIn() && existing().userId == request.auth.uid));');
    expect(rulesText).toContain('allow update, delete: if isValidId(txId) && isAdmin();');
  });

  it('9. Secures Firebase Storage payment_proofs strictly to submitting owner and admin', () => {
    expect(storageRulesText).toContain('match /payment_proofs/{userId}/{allPaths=**}');
    expect(storageRulesText).toContain('allow read: if isSignedIn() && (request.auth.uid == userId || isStorageAdmin());');
    expect(storageRulesText).toContain('request.auth.uid == userId');
    expect(storageRulesText).toContain('request.resource.size <= 10 * 1024 * 1024');
    expect(storageRulesText).toContain('allow read, write: if false;');
  });

  it('10. Protects anti-duplicate trial_claims, locks recovery_otps, and enforces immutable audit logs', () => {
    expect(rulesText).toContain('match /trial_claims/{claimId}');
    expect(rulesText).toContain('allow list: if isAdmin();');
    expect(rulesText).toContain('incoming().claimedBy == request.auth.uid');
    expect(rulesText).toMatch(/match \/recovery_otps\/\{sessionId\}\s*\{\s*allow read, write: if false;/);
    expect(rulesText).toMatch(/match \/admin_audit_logs\/\{logId\}[\s\S]*?allow update, delete: if false;/);
  });

  it('11. Covers all blueprint collections in firestore.rules', () => {
    const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));
    const paths = Object.keys(blueprint.firestore || {});
    for (const p of paths) {
      const colName = p.split('/')[1];
      expect(rulesText).toContain(`match /${colName}/`);
    }
  });

  it('12. Sanitizes media/proof URLs and blocks javascript:/SVG XSS payloads', () => {
    expect(sanitizeMediaUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeMediaUrl('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizeMediaUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeMediaUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    expect(sanitizeMediaUrl('data:application/pdf;base64,JVBERi0=')).toBeNull();
    expect(sanitizeMediaUrl('data:application/pdf;base64,JVBERi0=', { allowPdfData: true })).toBe('data:application/pdf;base64,JVBERi0=');
    expect(sanitizeMediaUrl('https://images.unsplash.com/photo-1.jpg')).toBe('https://images.unsplash.com/photo-1.jpg');
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('https://jsmartservices.com')).toBe(true);
    expect(isSafeExternalUrl('https://www.jsmartservices.com')).toBe(true);
  });

  it('13. Strips plaintext secrets from user/settings objects and generates crypto 6-digit OTPs', () => {
    const cleanedUser = stripSensitiveFields({ id: 'u1', name: 'Ana', password: 'secret', adminPin: '1234' } as any);
    expect('password' in cleanedUser).toBe(false);
    expect('adminPin' in cleanedUser).toBe(false);

    const cleanedSettings = sanitizePlatformSettings({ commissionRatePercent: 0, minWithdrawalKz: 5000, autoApprovePros: true, adminPin: 'admin123' } as any);
    expect('adminPin' in cleanedSettings).toBe(false);

    const otp = generateSecureOTP();
    expect(otp).toMatch(/^\d{6}$/);
  });

  it('14. Enforces 30-day free trial, 3 exact plans, existing-user preservation, and blocks expired actions', () => {
    expect(GLOBAL_SUBSCRIPTIONS_ACTIVE).toBe(true);
    expect(NEW_TRIAL_DAYS).toBe(30);
    expect(ORDERED_PAID_PLANS).toHaveLength(3);
    expect(PLAN_PRICES.plan_14d.priceKz).toBe(1500);
    expect(PLAN_PRICES.plan_30d.priceKz).toBe(3000);
    expect(PLAN_PRICES.plan_90d.priceKz).toBe(8000);
    expect(isValidPaidPlanKey('plan_14d')).toBe(true);
    expect(isValidPaidPlanKey('plan_30d')).toBe(true);
    expect(isValidPaidPlanKey('plan_90d')).toBe(true);
    expect(isValidPaidPlanKey('plan_7d')).toBe(false);

    const now = new Date('2026-11-22T12:00:00.000Z').getTime();

    // New pro post-cutoff gets 30 days
    const newPro = getProPlanStatus({
      id: 'pro-new',
      role: 'profissional',
      subscriptionPlan: 'free_trial',
      trialStartDate: '2026-11-22T12:00:00.000Z',
      createdAt: '2026-11-22T12:00:00.000Z'
    }, true, now);
    expect(newPro.isTrial).toBe(true);
    expect(newPro.isActive).toBe(true);
    expect(newPro.trialDurationDays).toBe(30);
    expect(newPro.daysRemaining).toBe(30);

    // Pre-cutoff legacy user keeps historical 14-day baseline without reset
    const legacyPro = getProPlanStatus({
      id: 'pro-legacy',
      role: 'profissional',
      subscriptionPlan: 'free_trial',
      trialStartDate: '2026-11-01T12:00:00.000Z',
      createdAt: '2026-11-01T12:00:00.000Z'
    }, true, now);
    expect(legacyPro.isExpired).toBe(true);
    expect(legacyPro.trialDurationDays).toBe(14);

    // Existing paid pro keeps active remaining paid days
    const paidPro = getProPlanStatus({
      id: 'pro-paid',
      role: 'profissional',
      subscriptionPlan: 'plan_90d',
      planStartedAt: '2026-11-01T12:00:00.000Z',
      planExpiresAt: '2027-01-30T12:00:00.000Z'
    }, true, now);
    expect(paidPro.isActive).toBe(true);
    expect(paidPro.isTrial).toBe(false);
    expect(paidPro.daysRemaining).toBe(69);

    // Duplicate trial account (trialDurationDays === 0) cannot get a free trial
    const dupTrial = getProPlanStatus({
      id: 'pro-dup',
      role: 'profissional',
      subscriptionPlan: 'free_trial',
      trialStartDate: '2026-11-22T12:00:00.000Z',
      trialDurationDays: 0,
      trialEndsAt: '2026-11-22T12:00:00.000Z',
      createdAt: '2026-11-22T12:00:00.000Z'
    }, true, now);
    expect(dupTrial.isActive).toBe(false);
    expect(dupTrial.isExpired).toBe(true);

    // Expired pro action validation returns blocked/expired without losing data
    const expiredAction = validateProAction({
      id: 'pro-exp',
      role: 'profissional',
      subscriptionPlan: 'free_trial',
      trialStartDate: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z'
    });
    expect(expiredAction.allowed).toBe(false);
    expect(expiredAction.reason).toBe('expired');
  });

  it('15. Passes the entire internal J Smart Services system test suite', () => {
    const report = runFullSystemTestSuite();
    expect(report.failedCount).toBe(0);
    expect(report.status).toBe('ALL_PASSED');
  });

  it('16. Enforces official Angolan +244XXXXXXXXX format strictly while keeping legacy account normalization compatible', () => {
    // Strict validation: exact +244 + 9 digits
    const ok1 = validateStrictAngolaPhone('+244923456789');
    expect(ok1.isValid).toBe(true);
    expect(ok1.e164).toBe('+244923456789');
    expect(ok1.display).toBe('+244923456789');
    expect(ok1.digits).toBe('244923456789');
    expect(ok1.national9).toBe('923456789');

    const okAdmin = validateStrictAngolaPhone('+244956011985');
    expect(okAdmin.isValid).toBe(true);
    expect(isOfficialAdminPhone(okAdmin.e164)).toBe(true);

    // Reject 8 digits, 10 digits, spaces, letters, missing +244, non-Angola
    const bad8 = validateStrictAngolaPhone('+24492345678');
    expect(bad8.isValid).toBe(false);
    expect(bad8.error).toBe(INVALID_ANGOLA_PHONE_MESSAGE);

    const bad10 = validateStrictAngolaPhone('+2449234567890');
    expect(bad10.isValid).toBe(false);
    expect(bad10.error).toBe(INVALID_ANGOLA_PHONE_MESSAGE);

    expect(validateStrictAngolaPhone('+244 923 456 789').isValid).toBe(false);
    expect(validateStrictAngolaPhone('+24492345678a').isValid).toBe(false);
    expect(validateStrictAngolaPhone('923456789').isValid).toBe(false);
    expect(validateStrictAngolaPhone('+351912345678').isValid).toBe(false);
    expect(validateStrictAngolaPhone('user@gmail.com').isValid).toBe(false);
    expect(validateStrictAngolaPhone('').isValid).toBe(false);

    // Input sanitizer strips letters/spaces/symbols, limits to 9 digits, handles +244 paste
    expect(sanitizeAngolaPhoneDigitsInput('923 456 789abc')).toBe('923456789');
    expect(sanitizeAngolaPhoneDigitsInput('+244923456789')).toBe('923456789');
    expect(sanitizeAngolaPhoneDigitsInput('00244923456789')).toBe('923456789');
    expect(sanitizeAngolaPhoneDigitsInput('9234567890123')).toBe('923456789');
    expect(buildFullAngolaPhone('923456789')).toBe('+244923456789');
    expect(extractAngolaNineDigits('+244 956 011 985')).toBe('956011985');

    // Backward-compatible legacy reader normalization for existing Firestore docs
    const a = normalizePhoneNumber('956 011 985');
    expect(a.isValid).toBe(true);
    expect(a.e164).toBe('+244956011985');
    expect(a.display).toBe('+244956011985');
    expect(a.digits).toBe('244956011985');

    const b = normalizePhoneNumber('+244 923-111-222');
    expect(b.isValid).toBe(true);
    expect(b.e164).toBe('+244923111222');
    expect(b.display).toBe('+244923111222');

    const c = normalizePhoneNumber('00244 912345678');
    expect(c.isValid).toBe(true);
    expect(c.e164).toBe('+244912345678');
    expect(c.display).toBe('+244912345678');

    expect(areSamePhoneNumber('956011985', '+244956011985')).toBe(true);
    expect(areSamePhoneNumber('+244 956 011 985', '+244956011985')).toBe(true);
    expect(areSamePhoneNumber('+244923111222', '+244923111223')).toBe(false);

    // Reject email address or invalid short/long numbers
    expect(normalizePhoneNumber('user@gmail.com').isValid).toBe(false);
    expect(normalizePhoneNumber('12345').isValid).toBe(false);
    expect(normalizePhoneNumber('+24492345678').isValid).toBe(false);
    expect(normalizePhoneNumber('+2449234567890').isValid).toBe(false);
    expect(normalizePhoneNumber('').isValid).toBe(false);
  });

  it('17. Supports registration without email by hiding synthetic phone auth identifiers from public profiles', async () => {
    const synth = phoneToSyntheticAuthEmail('923 111 222');
    expect(synth).toBe('u_244923111222@phone.jsmartservices.com');
    expect(isSyntheticPhoneAuthEmail(synth)).toBe(true);
    expect(getPublicUserEmail(synth)).toBe('');
    expect(getPublicUserEmail('cliente@exemplo.ao')).toBe('cliente@exemplo.ao');

    const hashId1 = await computePhoneIndexId('923 111 222');
    const hashId2 = await computePhoneIndexId('+244923111222');
    expect(hashId1).toMatch(/^ph_[a-f0-9]{64}$/);
    expect(hashId1).toBe(hashId2);
    expect(hashId1).not.toContain('923111222');
  });

  it('18. Recognizes official Super Admin phones and enforces phone_login_index privacy & anti-hijacking rules', () => {
    expect(isOfficialAdminPhone('956011985')).toBe(true);
    expect(isOfficialAdminPhone('+244 956 011 985')).toBe(true);
    expect(isOfficialAdminPhone('924 835 279')).toBe(true);
    expect(isOfficialAdminPhone('923 111 222')).toBe(false);
    expect(OFFICIAL_ADMIN_EMAIL).toBe('jfigueiredo790@gmail.com');

    // Firestore rules enforce hashed phone_login_index without raw phone exposure or public listing
    expect(rulesText).toContain('match /phone_login_index/{phoneHash}');
    expect(rulesText).toContain("phoneHash.matches('^ph_[a-f0-9]{16,64}$')");
    expect(rulesText).toContain('allow list: if isAdmin();');
    expect(rulesText).toContain("!('phone' in data)");
    expect(rulesText).toContain("!('phoneE164' in data)");
    expect(rulesText).toContain("!('phoneHash' in data)");
    expect(rulesText).toContain("!('passwordHash' in data)");
  });

  it('19. Enforces single phone+password login UI (with or without +244 normalization), optional email on signup, and password toggle', () => {
    const authModalText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AuthModal.tsx'), 'utf8');
    const adminLoginText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminLoginPage.tsx'), 'utf8');
    const recoveryModalText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AccountRecoveryModal.tsx'), 'utf8');
    const appCtxText = fs.readFileSync(path.resolve(process.cwd(), 'src/context/AppContext.tsx'), 'utf8');

    // Phone normalization recognizes the exact same account with or without +244
    expect(normalizePhoneNumber('924835279').e164).toBe('+244924835279');
    expect(normalizePhoneNumber('+244924835279').e164).toBe('+244924835279');
    expect(normalizePhoneNumber('+244 924 835 279').e164).toBe('+244924835279');
    expect(normalizePhoneNumber('244924835279').e164).toBe('+244924835279');
    expect(isValidLoginEmail('cliente@exemplo.ao')).toBe(true);
    expect(isValidLoginEmail('u_244923456789@phone.jsmartservices.com')).toBe(false);

    // AuthModal login is strictly 2 fields: phone + password (no email login tab, no "Firebase Auth" label)
    expect(authModalText).not.toContain('Firebase Auth');
    expect(authModalText).not.toContain('Endereço de e-mail *');
    expect(authModalText).toContain('Número de telefone *');
    expect(authModalText).toContain('Palavra-passe *');
    expect(authModalText).toContain("aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}");
    expect(authModalText).toContain('(Opcional)');

    // AdminLoginPage uses strictly phone + password form (no email login tab, no hardcoded passwords)
    expect(adminLoginText).not.toContain('E-mail administrativo *');
    expect(adminLoginText).toContain('Número de telefone *');
    expect(adminLoginText).toContain('Palavra-passe *');
    expect(adminLoginText).toContain("aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}");
    expect(adminLoginText).toContain("res.role !== 'admin'");

    // AppContext supports non-destructive live migration of legacy accounts into phone_login_index
    expect(appCtxText).toContain('migrateLegacyAccountsPhoneIndexAsync');
    expect(appCtxText).toContain("getDocs(collection(db, 'users'))");
    expect(appCtxText).toContain("getDocs(collection(db, 'professionals'))");

    // AccountRecoveryModal is phone-first and never forces email or exposes OTP codes
    expect(recoveryModalText).toContain('Número de Telefone da Conta *');
    expect(recoveryModalText).toContain('Não precisa de introduzir e-mail');
    expect(recoveryModalText).not.toContain('demoOtp');
  });

  it('20. Secures server-side recovery OTP endpoints with salted scrypt/PBKDF2 hashing and zero OTP exposure', () => {
    const serverText = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const workerText = fs.readFileSync(path.resolve(process.cwd(), 'src/worker.ts'), 'utf8');

    expect(serverText).toContain('/api/v1/auth/recovery/request');
    expect(serverText).toContain('/api/v1/auth/recovery/verify');
    expect(serverText).toContain('crypto.scryptSync');
    expect(serverText).toContain('crypto.timingSafeEqual');
    expect(serverText).toContain('authPrimaryIdentifier: "phone"');

    expect(workerText).toContain('/api/v1/auth/recovery/request');
    expect(workerText).toContain('/api/v1/auth/recovery/verify');
    expect(workerText).toContain("name: 'PBKDF2'");
    expect(workerText).toContain("authPrimaryIdentifier: 'phone'");
  });

  it('21. Keeps SMS_PROVIDER_URL, SMS_API_KEY, and SMS_SENDER_ID commented/optional so setup, login, and deployment never block', () => {
    const envExampleText = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
    const serverText = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const workerText = fs.readFileSync(path.resolve(process.cwd(), 'src/worker.ts'), 'utf8');

    // Commented out in .env.example so deployment/setup does not prompt or block for SMS secrets
    expect(envExampleText).toContain('# SMS_PROVIDER_URL=""');
    expect(envExampleText).toContain('# SMS_API_KEY=""');
    expect(envExampleText).toContain('# SMS_SENDER_ID=""');
    expect(envExampleText).not.toMatch(/^SMS_PROVIDER_URL=/m);
    expect(envExampleText).not.toMatch(/^SMS_API_KEY=/m);
    expect(envExampleText).not.toMatch(/^SMS_SENDER_ID=/m);

    // Both backends keep SMS integration ready as strictly optional, never require SMS for login, and never fabricate SMS delivery
    expect(workerText).toContain('SMS_PROVIDER_URL?: string;');
    expect(workerText).toContain('SMS_API_KEY?: string;');
    expect(workerText).toContain('SMS_SENDER_ID?: string;');
    expect(serverText).toContain('smsVerificationRequiredForLogin: false');
    expect(workerText).toContain('smsVerificationRequiredForLogin: false');
    expect(serverText).toContain('deliveryChannel: "fallback_verified"');
    expect(workerText).toContain("deliveryChannel: 'fallback_verified'");
  });

  it('22. Enforces official +244[0-9]{9} phone format across Firestore rules, Express backend, and Cloudflare Worker', () => {
    const serverText = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf8');
    const workerText = fs.readFileSync(path.resolve(process.cwd(), 'src/worker.ts'), 'utf8');
    const blueprint = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'));

    // Firestore rules enforce +244[0-9]{9} on user create & changed phone updates while preserving legacy unchanged phones
    expect(rulesText).toContain("function isValidAngolaPhone(phone)");
    expect(rulesText).toContain("phone.matches('^\\\\+244[0-9]{9}$')");
    expect(rulesText).toContain("isValidAngolaPhone(data.phone)");
    expect(rulesText).toContain("('phone' in prev && data.phone == prev.phone) || isValidAngolaPhone(data.phone)");

    // Blueprint schema matches the strict regex pattern
    expect(blueprint.entities.Cliente.properties.phone.pattern).toBe('^\\+244[0-9]{9}$');
    expect(blueprint.entities.Profissional.properties.phone.pattern).toBe('^\\+244[0-9]{9}$');
    expect(blueprint.entities.Administrador.properties.phone.pattern).toBe('^\\+244[0-9]{9}$');

    // Both Express backend and Cloudflare Worker validate strict +244[0-9]{9} with the exact required message
    expect(serverText).toContain('/^\\+244[0-9]{9}$/');
    expect(serverText).toContain('/api/v1/auth/validate-phone');
    expect(serverText).toContain('Introduza um número de telefone válido de Angola.');

    expect(workerText).toContain('/^\\+244[0-9]{9}$/');
    expect(workerText).toContain('/api/v1/auth/validate-phone');
    expect(workerText).toContain('Introduza um número de telefone válido de Angola.');
  });

  it('23. Supports immediate verified Google Admin sign-in and secure admin phone password linking without hardcoded passwords', () => {
    const appCtxText = fs.readFileSync(path.resolve(process.cwd(), 'src/context/AppContext.tsx'), 'utf8');
    const adminLoginText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminLoginPage.tsx'), 'utf8');
    const adminDashText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/AdminDashboard.tsx'), 'utf8');

    // Both official admin phones are recognized
    expect(isOfficialAdminPhone('+244924835279')).toBe(true);
    expect(isOfficialAdminPhone('+244956011985')).toBe(true);

    // Verified Google Admin sign-in + password linking present, zero hardcoded passwords
    expect(appCtxText).toContain('loginAdminWithGoogleAsync');
    expect(appCtxText).toContain('setAdminPhonePasswordAsync');
    expect(appCtxText).toContain('auth/operation-not-allowed');
    expect(appCtxText).not.toContain('admin924');
    expect(adminLoginText).toContain('Entrar com Conta Google da Administração');
    expect(adminLoginText).not.toContain('admin924');
    expect(adminDashText).toContain('setAdminPhonePasswordAsync');
  });

  it('24. Enforces Starter Tier global diagnostic, batch migration safety, zero-deletion relink guarantees, and all 23 Firestore collections coverage', () => {
    const migrationServiceText = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/legacyMigrationService.ts'), 'utf8');
    const migrationHubText = fs.readFileSync(path.resolve(process.cwd(), 'src/components/LegacyMigrationHub.tsx'), 'utf8');

    // Strictly Starter Tier compatible: ZERO firebase-admin imports and ZERO deleteDoc calls anywhere in the migration engine
    expect(migrationServiceText).not.toContain('firebase-admin');
    expect(migrationServiceText).not.toContain('deleteDoc(');
    expect(migrationServiceText).toContain('deletedDocumentsCount: 0');
    expect(migrationServiceText).toContain('legacyArchiveOnly: true');

    // Starter Tier batch migration worker uses isolated in-memory secondary Auth app, cleans up with deleteApp, verifies integrity, and supports sequential auto-stop execution
    expect(migrationServiceText).toContain('executeLegacyBatchMigrationSafe');
    expect(migrationServiceText).toContain('executeGlobalSequentialLegacyMigrationSafe');
    expect(migrationServiceText).toContain('stopOnCriticalError');
    expect(migrationServiceText).toContain('inMemoryPersistence');
    expect(migrationServiceText).toContain('deleteApp(secondaryApp)');
    expect(migrationServiceText).toContain('verifyRelinkIntegritySafe');
    expect(migrationServiceText).toContain('eligibleStarterTierBatchCount');
    expect(migrationServiceText).toContain('manualInterventionRequiredCount');

    // Verifies ALL user-referencing collections are included in the audit
    expect(ALL_USER_REFERENCE_COLLECTIONS.length).toBeGreaterThanOrEqual(23);
    for (const col of [
      'users',
      'professionals',
      'professionals_public',
      'phone_login_index',
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
      'trial_claims'
    ]) {
      expect(ALL_USER_REFERENCE_COLLECTIONS).toContain(col);
    }

    // Accurately distinguishes legacy IDs from real Firebase Auth UIDs and strictly protects official admin accounts
    expect(looksLikeFirebaseAuthUid('user-1786485151147')).toBe(false);
    expect(looksLikeFirebaseAuthUid('user-admin-1')).toBe(false);
    expect(looksLikeFirebaseAuthUid('UK0UyCKLjcNgLUlBAJch8U9BADM2')).toBe(true);
    expect(PROTECTED_ADMIN_UIDS).toContain('user-admin-1');
    expect(PROTECTED_ADMIN_UIDS).toContain('UK0UyCKLjcNgLUlBAJch8U9BADM2');
    expect(isProtectedAdminAccount('user-admin-1', 'admin', 'jfigueiredo790@gmail.com')).toBe(true);
    expect(isProtectedAdminAccount('UK0UyCKLjcNgLUlBAJch8U9BADM2', 'admin', 'jfigueiredo790@gmail.com')).toBe(true);
    expect(isProtectedAdminAccount('user-1786485151147', 'cliente', 'mariakumeso1966@gmail.com')).toBe(false);

    // Priority test account metadata preserved and Dry-Run + safe abort + sequential global runner enforced in UI
    expect(PRIORITY_TEST_LEGACY_ACCOUNT.legacyUid).toBe('user-1786485151147');
    expect(PRIORITY_TEST_LEGACY_ACCOUNT.phone).toBe('+244944926697');
    expect(PRIORITY_TEST_LEGACY_ACCOUNT.email).toBe('mariakumeso1966@gmail.com');
    expect(migrationHubText).toContain('Exclusivamente Leitura');
    expect(migrationHubText).toContain('Executar Recuperação Global Automática');
    expect(migrationHubText).toContain('isBatchDryRunValid');
    expect(migrationHubText).toContain('Interromper Lote com Segurança');
    expect(migrationHubText).toContain('isDryRunValidForCurrentInputs');
    expect(migrationHubText).toContain('sendLegacyAccountPasswordResetAsync');
  });
});
