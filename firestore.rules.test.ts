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
    expect(rulesText).toContain("!('password' in data) && !('adminPin' in data) && !('otpCode' in data)");
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
});
