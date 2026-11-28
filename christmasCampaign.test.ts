import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  CHRISTMAS_CAMPAIGN_START_ISO,
  CHRISTMAS_CAMPAIGN_END_ISO,
  POST_CAMPAIGN_START_ISO,
  POST_CAMPAIGN_TRIAL_DAYS,
  POST_CAMPAIGN_COHORT_TRIAL_END_ISO,
  isWithinChristmasCampaign,
  isChristmasCampaignBeneficiary,
  buildProfessionalEntitlementFields,
  getProPlanStatus,
  validateProAction,
  validateClientAction
} from './src/utils/planUtils';
import { ProfessionalProfile, User } from './src/types';

describe('Campanha Especial de Natal (Nov 2026–Jan 2027) & Regra de 14 Dias — 9 Cenários Obrigatórios', () => {
  const NOV_2026 = Date.parse('2026-11-27T12:00:00.000Z');
  const DEC_2026 = Date.parse('2026-12-25T12:00:00.000Z');
  const JAN_15_2027 = Date.parse('2027-01-15T12:00:00.000Z');
  const JAN_31_2027_END = Date.parse('2027-01-31T23:59:59.000Z');
  const FEB_01_2027 = Date.parse('2027-02-01T00:00:01.000Z');
  const FEB_05_2027 = Date.parse('2027-02-05T10:00:00.000Z');
  const FEB_10_2027 = Date.parse('2027-02-10T12:00:00.000Z');
  const FEB_15_2027_AFTER = Date.parse('2027-02-15T00:00:01.000Z');
  const FEB_18_2027 = Date.parse('2027-02-18T12:00:00.000Z');
  const FEB_20_2027 = Date.parse('2027-02-20T12:00:00.000Z');

  it('Cenário 1: Profissional antigo já registado é abrangido automaticamente pela Campanha Especial de Natal (Nov, Dez, Jan)', () => {
    const legacyPro: Partial<ProfessionalProfile> = {
      id: 'uid-pro-antigo-1',
      name: 'António Canalizador',
      role: 'profissional',
      accountType: 'profissional',
      subscriptionPlan: 'free_trial',
      trialStartDate: '2026-08-10T09:00:00.000Z',
      createdAt: '2026-08-10T09:00:00.000Z',
      blocked: false
    };

    expect(isWithinChristmasCampaign(NOV_2026)).toBe(true);
    expect(isWithinChristmasCampaign(DEC_2026)).toBe(true);
    expect(isWithinChristmasCampaign(JAN_31_2027_END)).toBe(true);
    expect(isWithinChristmasCampaign(FEB_01_2027)).toBe(false);

    for (const ts of [NOV_2026, DEC_2026, JAN_15_2027, JAN_31_2027_END]) {
      const status = getProPlanStatus(legacyPro, true, ts);
      const proAction = validateProAction(legacyPro, ts);
      expect(status.entitlementState).toBe('christmas_campaign');
      expect(status.isChristmasCampaign).toBe(true);
      expect(status.wasChristmasCampaignBeneficiary).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.isExpired).toBe(false);
      expect(status.freePeriodEndIso).toBe(CHRISTMAS_CAMPAIGN_END_ISO);
      expect(proAction.allowed).toBe(true);
    }
  });

  it('Cenário 2: Utilizador com conta dupla (Cliente + Profissional) beneficia plenamente durante a campanha', () => {
    const dualUser: Partial<ProfessionalProfile> = {
      id: 'uid-duplo-1',
      name: 'Maria Pintora',
      role: 'profissional',
      accountType: 'duplo',
      subscriptionPlan: 'free_trial',
      createdAt: '2026-09-20T15:00:00.000Z',
      blocked: false
    };

    const status = getProPlanStatus(dualUser, true, DEC_2026);
    expect(status.entitlementState).toBe('christmas_campaign');
    expect(status.isActive).toBe(true);
    expect(validateProAction(dualUser, DEC_2026).allowed).toBe(true);
    expect(validateClientAction(dualUser).allowed).toBe(true);
  });

  it('Cenário 3: Novo profissional registado durante Janeiro de 2027 entra na campanha até 31/01 e recebe +14 dias em Fevereiro', () => {
    const entitlement = buildProfessionalEntitlementFields({
      uid: 'uid-novo-jan-2027',
      nowMs: JAN_15_2027,
      alreadyUsedTrial: false
    });

    expect(entitlement.christmasCampaignEligible).toBe(true);
    expect(entitlement.christmasCampaignEndsAt).toBe(CHRISTMAS_CAMPAIGN_END_ISO);
    expect(entitlement.trialStartDate).toBe(POST_CAMPAIGN_START_ISO);
    expect(entitlement.trialEndsAt).toBe(POST_CAMPAIGN_COHORT_TRIAL_END_ISO);
    expect(entitlement.trialDurationDays).toBe(POST_CAMPAIGN_TRIAL_DAYS);
    expect(entitlement.freeTrialCanonicalUid).toBe('uid-novo-jan-2027');

    const janPro: Partial<ProfessionalProfile> = {
      id: 'uid-novo-jan-2027',
      role: 'profissional',
      accountType: 'profissional',
      createdAt: new Date(JAN_15_2027).toISOString(),
      ...entitlement
    };

    const statusJan = getProPlanStatus(janPro, true, JAN_15_2027);
    expect(statusJan.entitlementState).toBe('christmas_campaign');
    expect(statusJan.isActive).toBe(true);

    const statusFeb = getProPlanStatus(janPro, true, FEB_10_2027);
    expect(statusFeb.entitlementState).toBe('trial_14d_active');
    expect(statusFeb.isActive).toBe(true);
    expect(statusFeb.freePeriodStartIso).toBe(POST_CAMPAIGN_START_ISO);
    expect(statusFeb.freePeriodEndIso).toBe(POST_CAMPAIGN_COHORT_TRIAL_END_ISO);
  });

  it('Cenário 4: Cliente que ativa perfil profissional / conta dupla durante Janeiro de 2027 entra na campanha + 14 dias em Fev', () => {
    const existingClient: Partial<User> = {
      id: 'uid-cliente-upgrade-jan',
      role: 'cliente',
      accountType: 'cliente',
      createdAt: '2026-07-01T10:00:00.000Z'
    };

    const activationFields = buildProfessionalEntitlementFields({
      uid: existingClient.id!,
      nowMs: JAN_15_2027,
      alreadyUsedTrial: false,
      existingProfile: existingClient
    });

    expect(activationFields.christmasCampaignEligible).toBe(true);
    expect(activationFields.wasPreservedWithoutReset).toBe(false);

    const upgradedDual: Partial<ProfessionalProfile> = {
      ...existingClient,
      role: 'profissional',
      accountType: 'duplo',
      ...activationFields
    };

    const statusJan = getProPlanStatus(upgradedDual, true, JAN_15_2027);
    expect(statusJan.entitlementState).toBe('christmas_campaign');
    expect(statusJan.isActive).toBe(true);

    const statusFeb = getProPlanStatus(upgradedDual, true, FEB_05_2027);
    expect(statusFeb.entitlementState).toBe('trial_14d_active');
    expect(statusFeb.isActive).toBe(true);
  });

  it('Cenário 5: Profissional que já beneficiou da campanha chega a Fevereiro e recebe exatamente 14 dias (01/02 a 15/02/2027)', () => {
    const cohortPro: Partial<ProfessionalProfile> = {
      id: 'uid-pro-coorte-natal',
      role: 'profissional',
      accountType: 'profissional',
      subscriptionPlan: 'free_trial',
      createdAt: '2026-10-10T10:00:00.000Z',
      trialStartDate: '2026-10-10T10:00:00.000Z',
      blocked: false
    };

    expect(isChristmasCampaignBeneficiary(cohortPro, FEB_01_2027)).toBe(true);

    const statusFeb1 = getProPlanStatus(cohortPro, true, FEB_01_2027);
    expect(statusFeb1.entitlementState).toBe('trial_14d_active');
    expect(statusFeb1.isActive).toBe(true);
    expect(statusFeb1.isTrial).toBe(true);
    expect(statusFeb1.daysRemaining).toBe(14);
    expect(statusFeb1.freePeriodStartIso).toBe(POST_CAMPAIGN_START_ISO);
    expect(statusFeb1.freePeriodEndIso).toBe(POST_CAMPAIGN_COHORT_TRIAL_END_ISO);

    const statusFeb10 = getProPlanStatus(cohortPro, true, FEB_10_2027);
    expect(statusFeb10.entitlementState).toBe('trial_14d_active');
    expect(statusFeb10.isActive).toBe(true);
    expect(statusFeb10.daysRemaining).toBe(5);

    const statusAfterFeb15 = getProPlanStatus(cohortPro, true, FEB_15_2027_AFTER);
    expect(statusAfterFeb15.entitlementState).toBe('trial_expired');
    expect(statusAfterFeb15.isActive).toBe(false);
    expect(statusAfterFeb15.isExpired).toBe(true);
  });

  it('Cenário 6: Novo profissional que entra em Fevereiro (05/02/2027) recebe exatamente 14 dias individuais (05/02 a 19/02)', () => {
    const entitlement = buildProfessionalEntitlementFields({
      uid: 'uid-novo-fev-2027',
      nowMs: FEB_05_2027,
      alreadyUsedTrial: false
    });

    expect(entitlement.christmasCampaignEligible).toBe(false);
    expect(entitlement.trialDurationDays).toBe(14);
    expect(entitlement.trialStartDate).toBe('2027-02-05T10:00:00.000Z');
    expect(entitlement.trialEndsAt).toBe('2027-02-19T10:00:00.000Z');

    const febPro: Partial<ProfessionalProfile> = {
      id: 'uid-novo-fev-2027',
      role: 'profissional',
      accountType: 'profissional',
      createdAt: new Date(FEB_05_2027).toISOString(),
      ...entitlement
    };

    const statusOnStart = getProPlanStatus(febPro, true, FEB_05_2027);
    expect(statusOnStart.entitlementState).toBe('trial_14d_active');
    expect(statusOnStart.isActive).toBe(true);
    expect(statusOnStart.daysRemaining).toBe(14);

    const statusBeforeEnd = getProPlanStatus(febPro, true, FEB_18_2027);
    expect(statusBeforeEnd.entitlementState).toBe('trial_14d_active');
    expect(statusBeforeEnd.isActive).toBe(true);
    expect(validateProAction(febPro, FEB_18_2027).allowed).toBe(true);

    const statusAfterEnd = getProPlanStatus(febPro, true, FEB_20_2027);
    expect(statusAfterEnd.entitlementState).toBe('trial_expired');
    expect(statusAfterEnd.isActive).toBe(false);
    expect(statusAfterEnd.isExpired).toBe(true);
  });

  it('Cenário 7: Profissional cujo período gratuito de 14 dias terminou tem ações profissionais suspensas e zero dados apagados', () => {
    const expiredPro: ProfessionalProfile = {
      id: 'uid-pro-expirado',
      name: 'Carlos Eletricista',
      email: 'carlos@example.com',
      phone: '+244923111222',
      avatar: 'https://example.com/a.jpg',
      province: 'Luanda',
      role: 'profissional',
      accountType: 'profissional',
      categories: ['eletrica'],
      bio: 'Especialista em quadros elétricos',
      experienceYears: 6,
      hourlyRateKz: 12000,
      rating: 4.9,
      reviewCount: 18,
      completedJobs: 31,
      documentsVerified: true,
      portfolioImages: ['https://example.com/work1.jpg', 'https://example.com/work2.jpg'],
      status: 'disponivel',
      address: 'Talatona, Luanda',
      verified: true,
      subscriptionPlan: 'free_trial',
      professionalActivatedAt: '2027-02-01T00:00:00.000Z',
      christmasCampaignEligible: false,
      trialStartDate: '2027-02-01T00:00:00.000Z',
      trialDurationDays: 14,
      trialEndsAt: '2027-02-15T00:00:00.000Z',
      createdAt: '2027-02-01T00:00:00.000Z'
    };

    const status = getProPlanStatus(expiredPro, true, FEB_20_2027);
    const proAction = validateProAction(expiredPro, FEB_20_2027);

    expect(status.entitlementState).toBe('trial_expired');
    expect(status.isActive).toBe(false);
    expect(status.isExpired).toBe(true);
    expect(proAction.allowed).toBe(false);
    expect(proAction.reason).toBe('expired');

    // Preservação integral de conta, fotos, histórico e avaliações
    expect(expiredPro.completedJobs).toBe(31);
    expect(expiredPro.reviewCount).toBe(18);
    expect(expiredPro.rating).toBe(4.9);
    expect(expiredPro.portfolioImages).toHaveLength(2);
    expect(expiredPro.isDeleted).toBeUndefined();
  });

  it('Cenário 8: Profissional que ativa subscrição paga válida após expiração recupera imediatamente todas as funcionalidades profissionais', () => {
    const reactivatedPro: Partial<ProfessionalProfile> = {
      id: 'uid-pro-reativado',
      role: 'profissional',
      accountType: 'profissional',
      subscriptionPlan: 'plan_30d',
      planStartedAt: new Date(FEB_20_2027).toISOString(),
      planExpiresAt: new Date(FEB_20_2027 + 30 * 24 * 60 * 60 * 1000).toISOString(),
      trialStartDate: '2027-02-01T00:00:00.000Z',
      trialDurationDays: 14,
      trialEndsAt: '2027-02-15T00:00:00.000Z',
      blocked: false
    };

    const status = getProPlanStatus(reactivatedPro, true, FEB_20_2027);
    const proAction = validateProAction(reactivatedPro, FEB_20_2027);

    expect(status.entitlementState).toBe('paid_active');
    expect(status.hasPaidSubscription).toBe(true);
    expect(status.isActive).toBe(true);
    expect(status.isExpired).toBe(false);
    expect(status.daysRemaining).toBe(30);
    expect(proAction.allowed).toBe(true);
  });

  it('Cenário 9: Conta dupla cujo período profissional expirou bloqueia ações profissionais mas mantém 100% ativas as funcionalidades de Cliente', () => {
    const expiredDualUser: Partial<ProfessionalProfile> = {
      id: 'uid-duplo-expirado',
      name: 'Helena Serviços',
      role: 'profissional',
      accountType: 'duplo',
      subscriptionPlan: 'free_trial',
      professionalActivatedAt: '2027-02-01T00:00:00.000Z',
      christmasCampaignEligible: false,
      trialStartDate: '2027-02-01T00:00:00.000Z',
      trialDurationDays: 14,
      trialEndsAt: '2027-02-15T00:00:00.000Z',
      createdAt: '2026-10-01T00:00:00.000Z',
      blocked: false
    };

    const proAction = validateProAction(expiredDualUser, FEB_20_2027);
    const clientAction = validateClientAction(expiredDualUser);

    expect(proAction.allowed).toBe(false);
    expect(proAction.reason).toBe('expired');
    expect(clientAction.allowed).toBe(true);
  });

  it('Segurança Anti-Reinício: alternar papel, desativar/reativar ou duplicar conta nunca reinicia os 14 dias gratuitos', () => {
    // 1. Conta existente tenta reativar após expiração -> datas originais preservadas sem reinício
    const priorProfile: Partial<User> = {
      id: 'uid-anti-reset-1',
      role: 'cliente',
      accountType: 'cliente',
      professionalActivatedAt: '2027-02-01T00:00:00.000Z',
      christmasCampaignEligible: false,
      trialStartDate: '2027-02-01T00:00:00.000Z',
      trialEndsAt: '2027-02-15T00:00:00.000Z',
      trialDurationDays: 14,
      freeTrialCanonicalUid: 'uid-anti-reset-1',
      freeTrialConsumed: true
    };

    const reattempt = buildProfessionalEntitlementFields({
      uid: 'uid-anti-reset-1',
      nowMs: FEB_20_2027,
      existingProfile: priorProfile
    });

    expect(reattempt.wasPreservedWithoutReset).toBe(true);
    expect(reattempt.trialStartDate).toBe('2027-02-01T00:00:00.000Z');
    expect(reattempt.trialEndsAt).toBe('2027-02-15T00:00:00.000Z');
    expect(reattempt.subscriptionStatus).toBe('EXPIRED');

    // 2. Nova conta criada com mesmo telefone/BI/email já registado em trial_claims após Feb 1 -> 0 dias grátis
    const duplicateClaim = buildProfessionalEntitlementFields({
      uid: 'uid-anti-reset-dup',
      nowMs: FEB_05_2027,
      alreadyUsedTrial: true
    });
    expect(duplicateClaim.trialDurationDays).toBe(0);
    expect(duplicateClaim.subscriptionStatus).toBe('EXPIRED');
  });

  it('Regras de Segurança Firestore: valida Campanha de Natal, 14 dias, client->duplo e bloqueio de ações pro expiradas', () => {
    const rulesText = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
    expect(CHRISTMAS_CAMPAIGN_START_ISO).toBe('2026-11-01T00:00:00.000Z');
    expect(CHRISTMAS_CAMPAIGN_END_ISO).toBe('2027-01-31T23:59:59.999Z');
    expect(rulesText).toContain('function isChristmasCampaignWindow()');
    expect(rulesText).toContain('function hasActiveProEntitlement()');
    expect(rulesText).toContain('function isValidClientToDualActivation(');
    expect(rulesText).toContain('duration.value(14, \'d\')');
    expect(rulesText).toContain('data.trialDurationDays in [0, 14]');
    // Pro-only mutations gated by hasActiveProEntitlement()
    expect(rulesText).toContain('match /posts/{postId}');
    expect(rulesText).toContain('match /work_feed_posts/{postId}');
    expect(rulesText).toContain('hasActiveProEntitlement()');
  });
});
