import { ProfessionalProfile, User, ProSubscriptionPlan } from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎄 CAMPANHA ESPECIAL DE NATAL & CONTROLO GLOBAL DE SUBSCRIÇÕES — J SMART SERVICES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1) Campanha Especial de Natal (Novembro 2026, Dezembro 2026 e Janeiro 2027):
 *    - De 01/11/2026 até 31/01/2027 (23:59:59 UTC), todos os profissionais
 *      (atuais, novos, contas duplas e clientes que ativarem o perfil profissional)
 *      têm utilização gratuita completa das funcionalidades profissionais.
 *
 * 2) Nova Regra a partir de 01/02/2027 (14 Dias Gratuitos Corridos):
 *    - Profissionais que beneficiaram da Campanha de Natal recebem +14 dias gratuitos
 *      a contar de 01/02/2027 (até 15/02/2027 00:00:00 UTC).
 *    - Novos profissionais ou clientes que ativarem o perfil profissional a partir de
 *      01/02/2027 recebem exatamente 14 dias gratuitos corridos a contar da data de
 *      ativação do perfil profissional, vinculados ao seu UID canónico.
 *    - Bloqueio anti-reinício: criar outra conta, alternar entre cliente e profissional
 *      ou desativar/reativar o perfil NUNCA reinicia o período gratuito.
 *
 * 3) Expiração & Preservação Total de Dados:
 *    - Quando o período gratuito ou a subscrição termina sem plano ativo, apenas as
 *      funcionalidades profissionais ficam suspensas.
 *    - Nenhum dado é apagado (conta, fotos, publicações, conversas, avaliações, histórico).
 *    - Contas duplas continuam a utilizar normalmente todas as funcionalidades de Cliente.
 */
export const GLOBAL_SUBSCRIPTIONS_ACTIVE: boolean = true;

export const CHRISTMAS_CAMPAIGN_START_ISO = '2026-11-01T00:00:00.000Z';
export const CHRISTMAS_CAMPAIGN_END_ISO = '2027-01-31T23:59:59.999Z';
export const POST_CAMPAIGN_START_ISO = '2027-02-01T00:00:00.000Z';
export const POST_CAMPAIGN_TRIAL_DAYS = 14;
export const POST_CAMPAIGN_COHORT_TRIAL_END_ISO = '2027-02-15T00:00:00.000Z';

// Mantemos NEW_TRIAL_DAYS = 14 como constante canónica para o período gratuito individual pós-campanha
export const NEW_TRIAL_DAYS = POST_CAMPAIGN_TRIAL_DAYS;
export const LEGACY_TRIAL_DAYS = 14;
export const TRIAL_30D_EFFECTIVE_ISO = '2026-11-21T00:00:00.000Z';

export const CHRISTMAS_CAMPAIGN_START_MS = Date.parse(CHRISTMAS_CAMPAIGN_START_ISO);
export const CHRISTMAS_CAMPAIGN_END_MS = Date.parse(CHRISTMAS_CAMPAIGN_END_ISO);
export const POST_CAMPAIGN_START_MS = Date.parse(POST_CAMPAIGN_START_ISO);
export const POST_CAMPAIGN_COHORT_TRIAL_END_MS = Date.parse(POST_CAMPAIGN_COHORT_TRIAL_END_ISO);

export type ActivePaidPlanKey = 'plan_14d' | 'plan_30d' | 'plan_90d';

export const PLAN_PRICES: Record<ActivePaidPlanKey, {
  key: ActivePaidPlanKey;
  days: number;
  durationLabel: string;
  priceKz: number;
  priceStr: string;
  label: string;
  fullLabel: string;
  badgeColor: 'emerald' | 'blue' | 'purple';
  description: string;
}> = {
  plan_14d: {
    key: 'plan_14d',
    days: 14,
    durationLabel: '2 semanas',
    priceKz: 1500,
    priceStr: '1.500 Kz',
    label: 'Semanal',
    fullLabel: 'Plano Semanal',
    badgeColor: 'emerald',
    description: 'Plano Semanal (2 semanas — 1.500 Kz)'
  },
  plan_30d: {
    key: 'plan_30d',
    days: 30,
    durationLabel: '1 mês',
    priceKz: 3000,
    priceStr: '3.000 Kz',
    label: 'Mensal',
    fullLabel: 'Plano Mensal',
    badgeColor: 'blue',
    description: 'Plano Mensal (1 mês — 3.000 Kz)'
  },
  plan_90d: {
    key: 'plan_90d',
    days: 90,
    durationLabel: '3 meses',
    priceKz: 8000,
    priceStr: '8.000 Kz',
    label: 'Trimestral',
    fullLabel: 'Plano Trimestral',
    badgeColor: 'purple',
    description: 'Plano Trimestral (3 meses — 8.000 Kz)'
  }
};

export const ORDERED_PAID_PLANS = [
  PLAN_PRICES.plan_14d,
  PLAN_PRICES.plan_30d,
  PLAN_PRICES.plan_90d
] as const;

export function isWithinChristmasCampaign(nowMs: number = Date.now()): boolean {
  return nowMs >= CHRISTMAS_CAMPAIGN_START_MS && nowMs <= CHRISTMAS_CAMPAIGN_END_MS;
}

export function getPlanDisplayInfo(planType?: ProSubscriptionPlan | string | null): {
  label: string;
  durationLabel: string;
  days: number;
  priceKz: number;
} {
  if (planType === 'plan_14d') {
    return {
      label: PLAN_PRICES.plan_14d.fullLabel,
      durationLabel: PLAN_PRICES.plan_14d.durationLabel,
      days: PLAN_PRICES.plan_14d.days,
      priceKz: PLAN_PRICES.plan_14d.priceKz
    };
  }
  if (planType === 'plan_30d') {
    return {
      label: PLAN_PRICES.plan_30d.fullLabel,
      durationLabel: PLAN_PRICES.plan_30d.durationLabel,
      days: PLAN_PRICES.plan_30d.days,
      priceKz: PLAN_PRICES.plan_30d.priceKz
    };
  }
  if (planType === 'plan_90d') {
    return {
      label: PLAN_PRICES.plan_90d.fullLabel,
      durationLabel: PLAN_PRICES.plan_90d.durationLabel,
      days: PLAN_PRICES.plan_90d.days,
      priceKz: PLAN_PRICES.plan_90d.priceKz
    };
  }
  if (planType === 'plan_7d') {
    return {
      label: 'Plano Semanal (Histórico)',
      durationLabel: '7 dias',
      days: 7,
      priceKz: 1500
    };
  }
  if (isWithinChristmasCampaign()) {
    return {
      label: 'Campanha Especial de Natal',
      durationLabel: 'Grátis até 31/01/2027',
      days: 92,
      priceKz: 0
    };
  }
  return {
    label: 'Período Gratuito Inicial',
    durationLabel: `${POST_CAMPAIGN_TRIAL_DAYS} dias corridos`,
    days: POST_CAMPAIGN_TRIAL_DAYS,
    priceKz: 0
  };
}

export function isValidPaidPlanKey(plan: unknown): plan is ActivePaidPlanKey {
  return plan === 'plan_14d' || plan === 'plan_30d' || plan === 'plan_90d';
}

export function normalizeTimestampIso(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTs = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      const d = maybeTs.toDate();
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
    }
    if (typeof maybeTs.seconds === 'number') {
      return new Date(maybeTs.seconds * 1000).toISOString();
    }
  }
  return undefined;
}

export function isProfessionalCapableAccount(user: Partial<User & ProfessionalProfile> | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'profissional' ||
    user.accountType === 'profissional' ||
    user.accountType === 'duplo'
  );
}

/**
 * Determina se um profissional (pelo seu UID canónico) beneficiou da Campanha Especial de Natal
 * (registado ou com perfil profissional ativado até 31 de janeiro de 2027).
 */
export function isChristmasCampaignBeneficiary(
  pro: Partial<ProfessionalProfile | User> | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!pro) return false;
  if (pro.christmasCampaignEligible === true) return true;
  if (pro.christmasCampaignEligible === false) return false;

  const activationIso =
    normalizeTimestampIso(pro.professionalActivatedAt) ||
    normalizeTimestampIso((pro as any).trialStartServerTimestamp) ||
    normalizeTimestampIso(pro.trialStartDate) ||
    normalizeTimestampIso(pro.createdAt);

  if (activationIso) {
    return Date.parse(activationIso) <= CHRISTMAS_CAMPAIGN_END_MS;
  }

  return isWithinChristmasCampaign(nowMs);
}

/**
 * Gera os campos canónicos de campanha / período gratuito ao registar um profissional
 * ou ao ativar pela primeira vez o perfil profissional numa conta de cliente.
 * GARANTE ZERO REINÍCIO caso a conta já tenha ativado o perfil profissional anteriormente.
 */
export function buildProfessionalEntitlementFields(params: {
  uid: string;
  nowMs?: number;
  alreadyUsedTrial?: boolean;
  existingProfile?: Partial<User & ProfessionalProfile> | null;
}): {
  subscriptionPlan: ProSubscriptionPlan;
  professionalActivatedAt: string;
  christmasCampaignEligible: boolean;
  christmasCampaignEndsAt?: string;
  trialStartDate: string;
  trialEndsAt: string;
  trialDurationDays: number;
  freeTrialCanonicalUid: string;
  freeTrialConsumed: boolean;
  subscriptionStatus: 'ACTIVE' | 'EXPIRED';
  wasPreservedWithoutReset: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const existing = params.existingProfile;

  // Regra Anti-Reinício: se a conta já teve ativação profissional ou período gratuito atribuído,
  // preserva estritamente os campos originais sem reiniciar o período gratuito.
  const hasPriorProEntitlement = Boolean(
    existing &&
    (
      existing.professionalActivatedAt ||
      existing.freeTrialConsumed === true ||
      existing.trialStartDate ||
      existing.trialEndsAt ||
      typeof existing.trialDurationDays === 'number'
    )
  );

  if (hasPriorProEntitlement && existing) {
    const existingStartIso =
      normalizeTimestampIso(existing.professionalActivatedAt) ||
      normalizeTimestampIso(existing.trialStartDate) ||
      normalizeTimestampIso(existing.createdAt) ||
      nowIso;
    const wasCampaign = isChristmasCampaignBeneficiary(existing, nowMs);
    const existingDuration = typeof existing.trialDurationDays === 'number'
      ? Math.max(0, Math.min(POST_CAMPAIGN_TRIAL_DAYS, existing.trialDurationDays))
      : POST_CAMPAIGN_TRIAL_DAYS;
    const existingTrialStart =
      normalizeTimestampIso(existing.trialStartDate) ||
      (wasCampaign ? POST_CAMPAIGN_START_ISO : existingStartIso);
    const existingTrialEnd =
      normalizeTimestampIso(existing.trialEndsAt) ||
      (wasCampaign
        ? (existingDuration > 0 ? POST_CAMPAIGN_COHORT_TRIAL_END_ISO : CHRISTMAS_CAMPAIGN_END_ISO)
        : new Date(Date.parse(existingTrialStart) + existingDuration * 24 * 60 * 60 * 1000).toISOString());

    const simulated = getProPlanStatus({
      ...existing,
      id: params.uid,
      professionalActivatedAt: existingStartIso,
      christmasCampaignEligible: wasCampaign,
      trialStartDate: existingTrialStart,
      trialEndsAt: existingTrialEnd,
      trialDurationDays: existingDuration,
      freeTrialCanonicalUid: existing.freeTrialCanonicalUid || params.uid,
      freeTrialConsumed: true
    }, true, nowMs);

    return {
      subscriptionPlan: existing.subscriptionPlan || 'free_trial',
      professionalActivatedAt: existingStartIso,
      christmasCampaignEligible: wasCampaign,
      ...(wasCampaign ? { christmasCampaignEndsAt: CHRISTMAS_CAMPAIGN_END_ISO } : {}),
      trialStartDate: existingTrialStart,
      trialEndsAt: existingTrialEnd,
      trialDurationDays: existingDuration,
      freeTrialCanonicalUid: existing.freeTrialCanonicalUid || params.uid,
      freeTrialConsumed: true,
      subscriptionStatus: simulated.isActive ? 'ACTIVE' : 'EXPIRED',
      wasPreservedWithoutReset: true
    };
  }

  const inChristmas = isWithinChristmasCampaign(nowMs);
  const blockedDuplicate = params.alreadyUsedTrial === true;

  if (inChristmas) {
    // Durante Nov/Dez 2026 e Jan 2027: Campanha Especial de Natal até 31/01/2027
    // + 14 dias gratuitos a partir de 01/02/2027 (salvo tentativa duplicada de 2.º trial)
    const trialDuration = blockedDuplicate ? 0 : POST_CAMPAIGN_TRIAL_DAYS;
    const trialEnds = blockedDuplicate
      ? CHRISTMAS_CAMPAIGN_END_ISO
      : POST_CAMPAIGN_COHORT_TRIAL_END_ISO;

    return {
      subscriptionPlan: 'free_trial',
      professionalActivatedAt: nowIso,
      christmasCampaignEligible: true,
      christmasCampaignEndsAt: CHRISTMAS_CAMPAIGN_END_ISO,
      trialStartDate: POST_CAMPAIGN_START_ISO,
      trialEndsAt: trialEnds,
      trialDurationDays: trialDuration,
      freeTrialCanonicalUid: params.uid,
      freeTrialConsumed: true,
      subscriptionStatus: 'ACTIVE',
      wasPreservedWithoutReset: false
    };
  }

  // A partir de 01/02/2027: exatamente 14 dias corridos a partir da ativação (ou 0 se já usou trial)
  const trialDuration = blockedDuplicate ? 0 : POST_CAMPAIGN_TRIAL_DAYS;
  const trialEnds = blockedDuplicate
    ? nowIso
    : new Date(nowMs + POST_CAMPAIGN_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  return {
    subscriptionPlan: 'free_trial',
    professionalActivatedAt: nowIso,
    christmasCampaignEligible: false,
    trialStartDate: nowIso,
    trialEndsAt: trialEnds,
    trialDurationDays: trialDuration,
    freeTrialCanonicalUid: params.uid,
    freeTrialConsumed: true,
    subscriptionStatus: trialDuration > 0 ? 'ACTIVE' : 'EXPIRED',
    wasPreservedWithoutReset: false
  };
}

export type ProEntitlementState =
  | 'admin'
  | 'blocked'
  | 'paid_active'
  | 'christmas_campaign'
  | 'trial_14d_active'
  | 'trial_expired'
  | 'paid_expired'
  | 'no_subscription';

export interface PlanStatusResult {
  entitlementState: ProEntitlementState;
  isTrial: boolean;
  isChristmasCampaign?: boolean;
  wasChristmasCampaignBeneficiary?: boolean;
  hasPaidSubscription?: boolean;
  isActive: boolean;
  isExpired: boolean;
  isBlocked?: boolean;
  isPromotionalPhase?: boolean;
  daysRemaining: number;
  hoursRemaining?: number;
  trialDurationDays?: number;
  alertStage?: '7_days' | '3_days' | '24_hours' | 'expired' | 'normal';
  planType: ProSubscriptionPlan;
  planLabel?: string;
  startedAtIso?: string;
  expiresAtIso?: string;
  freePeriodStartIso?: string;
  freePeriodEndIso?: string;
  canonicalUid?: string;
  message: string;
}

export function getProPlanStatus(
  pro: Partial<ProfessionalProfile | User> | null | undefined,
  enforceSubscriptions: boolean = GLOBAL_SUBSCRIPTIONS_ACTIVE,
  nowMs: number = Date.now()
): PlanStatusResult {
  if (!pro) {
    return {
      entitlementState: 'no_subscription',
      isTrial: true,
      isActive: false,
      isExpired: true,
      hasPaidSubscription: false,
      daysRemaining: 0,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Sem Sessão',
      message: 'Inicie sessão com uma conta profissional para aceder.'
    };
  }

  const canonicalUid = pro.freeTrialCanonicalUid || pro.id;

  // 0. Super Admin ou Administrador — sempre ativo
  if (
    pro.role === 'admin' ||
    (pro as any).adminSubRole ||
    pro.email === 'jfigueiredo790@gmail.com' ||
    pro.id === 'user-admin-1' ||
    pro.id === 'UK0UyCKLjcNgLUlBAJch8U9BADM2'
  ) {
    return {
      entitlementState: 'admin',
      isTrial: false,
      isActive: true,
      isExpired: false,
      hasPaidSubscription: true,
      daysRemaining: 9999,
      alertStage: 'normal',
      planType: 'plan_90d',
      planLabel: 'Administrador Oficial',
      canonicalUid,
      message: 'Administrador Oficial J Smart Services'
    };
  }

  // 0.1 Conta bloqueada pelo Administrador
  if (pro.blocked === true || pro.status === 'bloqueado' || (pro as any).accountStatus === 'BLOCKED') {
    return {
      entitlementState: 'blocked',
      isTrial: false,
      isActive: false,
      isExpired: false,
      isBlocked: true,
      hasPaidSubscription: false,
      daysRemaining: 0,
      planType: pro.subscriptionPlan || 'free_trial',
      planLabel: 'Conta Bloqueada',
      canonicalUid,
      message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
    };
  }

  // 0.2 Override promocional explícito (quando enforceSubscriptions === false)
  if (!enforceSubscriptions) {
    return {
      entitlementState: 'christmas_campaign',
      isTrial: false,
      isActive: true,
      isExpired: false,
      isPromotionalPhase: true,
      hasPaidSubscription: false,
      daysRemaining: 9999,
      alertStage: 'normal',
      planType: pro.subscriptionPlan || 'free_trial',
      planLabel: 'Acesso Promocional',
      canonicalUid,
      message: '100% gratuito durante a fase promocional — J Smart Services Angola'
    };
  }

  const now = new Date(nowMs);
  const wasChristmasBeneficiary = isChristmasCampaignBeneficiary(pro, nowMs);

  // 1. Subscrição paga ativa (sempre prioritária e preservada intacta)
  const planExpiresIso =
    normalizeTimestampIso((pro as any).planExpiresTimestamp) ||
    normalizeTimestampIso(pro.planExpiresAt);
  const planStartedIso = normalizeTimestampIso((pro as any).planStartedAt || (pro as any).planActivatedAt);
  const hasPaidPlanType = Boolean(pro.subscriptionPlan && pro.subscriptionPlan !== 'free_trial');

  if (planExpiresIso && hasPaidPlanType) {
    const expiresAt = new Date(planExpiresIso);
    const displayInfo = getPlanDisplayInfo(pro.subscriptionPlan);

    if (expiresAt.getTime() > now.getTime()) {
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const hoursLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60)));

      return {
        entitlementState: 'paid_active',
        isTrial: false,
        isChristmasCampaign: false,
        wasChristmasCampaignBeneficiary: wasChristmasBeneficiary,
        hasPaidSubscription: true,
        isActive: true,
        isExpired: false,
        daysRemaining: daysLeft,
        hoursRemaining: hoursLeft,
        alertStage: daysLeft <= 1 ? '24_hours' : daysLeft <= 3 ? '3_days' : daysLeft <= 7 ? '7_days' : 'normal',
        planType: pro.subscriptionPlan!,
        planLabel: `${displayInfo.label} (${displayInfo.durationLabel})`,
        startedAtIso: planStartedIso,
        expiresAtIso: planExpiresIso,
        canonicalUid,
        message: `${displayInfo.label} (${displayInfo.durationLabel}) ativo. Restam ${daysLeft} dia(s).`
      };
    }

    // Se a subscrição paga já expirou DEPOIS do fim da Campanha de Natal e do período de 14 dias pós-campanha
    // (ou se o utilizador entrou após fevereiro), marca como subscrição paga expirada.
    if (
      !isWithinChristmasCampaign(nowMs) &&
      (expiresAt.getTime() >= POST_CAMPAIGN_COHORT_TRIAL_END_MS || !wasChristmasBeneficiary)
    ) {
      return {
        entitlementState: 'paid_expired',
        isTrial: false,
        isChristmasCampaign: false,
        wasChristmasCampaignBeneficiary: wasChristmasBeneficiary,
        hasPaidSubscription: false,
        isActive: false,
        isExpired: true,
        daysRemaining: 0,
        hoursRemaining: 0,
        alertStage: 'expired',
        planType: pro.subscriptionPlan!,
        planLabel: `${displayInfo.label} (Expirado)`,
        startedAtIso: planStartedIso,
        expiresAtIso: planExpiresIso,
        canonicalUid,
        message: 'A sua subscrição profissional expirou. Os seus dados, publicações, conversas e avaliações continuam intactos. Escolha um plano de subscrição para reativar as funcionalidades profissionais.'
      };
    }
  }

  // 2. CAMPANHA ESPECIAL DE NATAL — Novembro 2026, Dezembro 2026 e Janeiro 2027 (até 31/01/2027)
  if (isWithinChristmasCampaign(nowMs)) {
    const activationIso =
      normalizeTimestampIso(pro.professionalActivatedAt) ||
      normalizeTimestampIso(pro.createdAt) ||
      CHRISTMAS_CAMPAIGN_START_ISO;
    const effectiveStartIso =
      Date.parse(activationIso) > CHRISTMAS_CAMPAIGN_START_MS
        ? activationIso
        : CHRISTMAS_CAMPAIGN_START_ISO;

    const diffTime = CHRISTMAS_CAMPAIGN_END_MS - now.getTime();
    const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const hoursLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60)));

    let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
    let msg = `🎄 Campanha Especial de Natal ativa: utilização profissional 100% gratuita até 31/01/2027 (faltam ${daysLeft} dia(s)). Em 01/02/2027 terá ainda 14 dias gratuitos.`;

    if (hoursLeft <= 24) {
      alertStage = '24_hours';
      msg = '🎄 A Campanha Especial de Natal termina hoje (31/01/2027). Amanhã, 01/02/2027, inicia o seu período gratuito adicional de 14 dias.';
    } else if (daysLeft <= 3) {
      alertStage = '3_days';
      msg = `🎄 Faltam ${daysLeft} dia(s) para terminar a Campanha Especial de Natal (31/01/2027). A partir de 01/02/2027 terá ainda 14 dias gratuitos.`;
    } else if (daysLeft <= 7) {
      alertStage = '7_days';
      msg = `🎄 Faltam ${daysLeft} dia(s) da Campanha Especial de Natal (até 31/01/2027). Depois terá 14 dias gratuitos a partir de 01/02/2027.`;
    }

    return {
      entitlementState: 'christmas_campaign',
      isTrial: true,
      isChristmasCampaign: true,
      wasChristmasCampaignBeneficiary: true,
      hasPaidSubscription: false,
      isActive: true,
      isExpired: false,
      daysRemaining: daysLeft,
      hoursRemaining: hoursLeft,
      trialDurationDays: 92,
      alertStage,
      planType: 'free_trial',
      planLabel: 'Campanha Especial de Natal (até 31/01/2027)',
      startedAtIso: effectiveStartIso,
      expiresAtIso: CHRISTMAS_CAMPAIGN_END_ISO,
      freePeriodStartIso: effectiveStartIso,
      freePeriodEndIso: CHRISTMAS_CAMPAIGN_END_ISO,
      canonicalUid,
      message: msg
    };
  }

  // 3. A PARTIR DE 1 DE FEVEREIRO DE 2027 — Período gratuito único de 14 dias corridos
  const explicitDuration = typeof (pro as any).trialDurationDays === 'number'
    ? Math.max(0, Number((pro as any).trialDurationDays))
    : undefined;

  // Bloqueio explícito contra 2.º período gratuito duplicado (trialDurationDays === 0)
  if (explicitDuration === 0) {
    const startIso =
      normalizeTimestampIso(pro.professionalActivatedAt) ||
      normalizeTimestampIso(pro.trialStartDate) ||
      normalizeTimestampIso(pro.createdAt);
    const endIso =
      normalizeTimestampIso(pro.trialEndsAt) ||
      startIso ||
      now.toISOString();

    return {
      entitlementState: 'trial_expired',
      isTrial: true,
      isChristmasCampaign: false,
      wasChristmasCampaignBeneficiary: wasChristmasBeneficiary,
      hasPaidSubscription: false,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      trialDurationDays: 0,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Período Gratuito Já Utilizado',
      startedAtIso: startIso,
      expiresAtIso: endIso,
      freePeriodStartIso: startIso,
      freePeriodEndIso: endIso,
      canonicalUid,
      message: 'Esta conta não é elegível para um segundo período gratuito. Os seus dados estão preservados — escolha um plano de subscrição para ativar as funcionalidades profissionais.'
    };
  }

  // 3a. Profissionais que beneficiaram da Campanha de Natal -> 14 dias gratuitos de 01/02/2027 até 15/02/2027
  if (wasChristmasBeneficiary) {
    const postStartMs = POST_CAMPAIGN_START_MS;
    const postEndMs = POST_CAMPAIGN_COHORT_TRIAL_END_MS;
    const diffTime = postEndMs - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffTime > 0 && now.getTime() >= postStartMs) {
      let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
      let alertMsg = `Período gratuito pós-Natal de 14 dias ativo (01/02/2027 a 14/02/2027): faltam ${Math.max(1, daysRemaining)} dia(s).`;

      if (hoursRemaining <= 24) {
        alertStage = '24_hours';
        alertMsg = '⚠️ Lembrete urgente: faltam menos de 24 horas para terminar o seu período gratuito de 14 dias!';
      } else if (daysRemaining <= 3) {
        alertStage = '3_days';
        alertMsg = `⚠️ Atenção: faltam apenas ${daysRemaining} dia(s) para terminar o seu período gratuito de 14 dias!`;
      } else if (daysRemaining <= 7) {
        alertStage = '7_days';
        alertMsg = `🔔 Lembrete: faltam ${daysRemaining} dia(s) do seu período gratuito de 14 dias.`;
      }

      return {
        entitlementState: 'trial_14d_active',
        isTrial: true,
        isChristmasCampaign: false,
        wasChristmasCampaignBeneficiary: true,
        hasPaidSubscription: false,
        isActive: true,
        isExpired: false,
        daysRemaining: Math.max(1, daysRemaining),
        hoursRemaining: Math.max(1, hoursRemaining),
        trialDurationDays: POST_CAMPAIGN_TRIAL_DAYS,
        alertStage,
        planType: 'free_trial',
        planLabel: 'Período Gratuito Pós-Natal (14 Dias)',
        startedAtIso: POST_CAMPAIGN_START_ISO,
        expiresAtIso: POST_CAMPAIGN_COHORT_TRIAL_END_ISO,
        freePeriodStartIso: POST_CAMPAIGN_START_ISO,
        freePeriodEndIso: POST_CAMPAIGN_COHORT_TRIAL_END_ISO,
        canonicalUid,
        message: alertMsg
      };
    }

    return {
      entitlementState: 'trial_expired',
      isTrial: true,
      isChristmasCampaign: false,
      wasChristmasCampaignBeneficiary: true,
      hasPaidSubscription: false,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      trialDurationDays: POST_CAMPAIGN_TRIAL_DAYS,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Período Gratuito Expirado (14 Dias)',
      startedAtIso: POST_CAMPAIGN_START_ISO,
      expiresAtIso: POST_CAMPAIGN_COHORT_TRIAL_END_ISO,
      freePeriodStartIso: POST_CAMPAIGN_START_ISO,
      freePeriodEndIso: POST_CAMPAIGN_COHORT_TRIAL_END_ISO,
      canonicalUid,
      message: 'O seu período gratuito de 14 dias terminou. As funcionalidades profissionais estão pausadas (a conta, publicações, avaliações e modo Cliente continuam 100% preservados). Escolha um plano de subscrição para reativar.'
    };
  }

  // 3b. Novos profissionais ou clientes que ativaram perfil profissional a partir de 01/02/2027
  const individualStartIso =
    normalizeTimestampIso(pro.professionalActivatedAt) ||
    normalizeTimestampIso((pro as any).trialStartServerTimestamp) ||
    normalizeTimestampIso(pro.trialStartDate) ||
    normalizeTimestampIso(pro.createdAt);

  if (!individualStartIso) {
    return {
      entitlementState: 'no_subscription',
      isTrial: true,
      isChristmasCampaign: false,
      wasChristmasCampaignBeneficiary: false,
      hasPaidSubscription: false,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      trialDurationDays: POST_CAMPAIGN_TRIAL_DAYS,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Sem Subscrição Ativa',
      canonicalUid,
      message: 'O seu período gratuito terminou. Escolha um plano de subscrição para ativar as funcionalidades profissionais.'
    };
  }

  const startMs = Date.parse(individualStartIso);
  const cappedDurationDays = explicitDuration !== undefined
    ? Math.min(POST_CAMPAIGN_TRIAL_DAYS, explicitDuration)
    : POST_CAMPAIGN_TRIAL_DAYS;
  const maxEndMs = startMs + cappedDurationDays * 24 * 60 * 60 * 1000;
  const explicitEndsIso = normalizeTimestampIso(pro.trialEndsAt);
  const effectiveEndMs = explicitEndsIso
    ? Math.min(Date.parse(explicitEndsIso), maxEndMs)
    : maxEndMs;
  const effectiveEndIso = new Date(effectiveEndMs).toISOString();

  const diffTime = effectiveEndMs - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffTime > 0 && cappedDurationDays > 0) {
    let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
    let alertMsg = `Período gratuito de ${cappedDurationDays} dias ativo: faltam ${Math.max(1, daysRemaining)} dia(s).`;

    if (hoursRemaining <= 24) {
      alertStage = '24_hours';
      alertMsg = '⚠️ Lembrete urgente: faltam menos de 24 horas para terminar o seu período gratuito de 14 dias!';
    } else if (daysRemaining <= 3) {
      alertStage = '3_days';
      alertMsg = `⚠️ Atenção: faltam apenas ${daysRemaining} dia(s) para terminar o seu período gratuito de 14 dias!`;
    } else if (daysRemaining <= 7) {
      alertStage = '7_days';
      alertMsg = `🔔 Lembrete: faltam ${daysRemaining} dia(s) do seu período gratuito de 14 dias.`;
    }

    return {
      entitlementState: 'trial_14d_active',
      isTrial: true,
      isChristmasCampaign: false,
      wasChristmasCampaignBeneficiary: false,
      hasPaidSubscription: false,
      isActive: true,
      isExpired: false,
      daysRemaining: Math.max(1, daysRemaining),
      hoursRemaining: Math.max(1, hoursRemaining),
      trialDurationDays: cappedDurationDays,
      alertStage,
      planType: 'free_trial',
      planLabel: `Período Gratuito (${cappedDurationDays} Dias)`,
      startedAtIso: individualStartIso,
      expiresAtIso: effectiveEndIso,
      freePeriodStartIso: individualStartIso,
      freePeriodEndIso: effectiveEndIso,
      canonicalUid,
      message: alertMsg
    };
  }

  return {
    entitlementState: 'trial_expired',
    isTrial: true,
    isChristmasCampaign: false,
    wasChristmasCampaignBeneficiary: false,
    hasPaidSubscription: false,
    isActive: false,
    isExpired: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    trialDurationDays: cappedDurationDays,
    alertStage: 'expired',
    planType: 'free_trial',
    planLabel: `Período Gratuito Expirado (${cappedDurationDays} Dias)`,
    startedAtIso: individualStartIso,
    expiresAtIso: effectiveEndIso,
    freePeriodStartIso: individualStartIso,
    freePeriodEndIso: effectiveEndIso,
    canonicalUid,
    message: 'O seu período gratuito de 14 dias terminou. As funcionalidades profissionais estão inativas (todos os seus dados e o modo Cliente permanecem preservados). Escolha um plano de subscrição para reativar.'
  };
}

/**
 * Valida se uma conta (incluindo conta dupla com perfil profissional expirado)
 * pode continuar a usar normalmente todas as funcionalidades de Cliente.
 */
export function validateClientAction(user: Partial<User | ProfessionalProfile> | null | undefined): {
  allowed: boolean;
  reason?: 'blocked' | 'deleted' | 'unauthorized';
  message: string;
} {
  if (!user) {
    return { allowed: false, reason: 'unauthorized', message: 'Inicie sessão para continuar.' };
  }
  if (user.blocked === true || user.status === 'bloqueado' || (user as any).accountStatus === 'BLOCKED') {
    return {
      allowed: false,
      reason: 'blocked',
      message: 'Conta bloqueada pelo Administrador.'
    };
  }
  if (user.isDeleted === true || user.status === 'deleted') {
    return {
      allowed: false,
      reason: 'deleted',
      message: 'Esta conta foi desativada.'
    };
  }
  return {
    allowed: true,
    message: 'Acesso de cliente autorizado normalmente.'
  };
}

/**
 * Validação de Segurança em 4 Etapas Obrigatórias para qualquer ação Profissional:
 * 1. Conta bloqueada?
 * 2. Conta ativa / não eliminada?
 * 3. Campanha Especial de Natal, período gratuito de 14 dias ou subscrição paga ativa?
 * 4. Data de expiração não ultrapassada?
 */
export function validateProAction(
  pro: Partial<ProfessionalProfile | User> | null | undefined,
  nowMs: number = Date.now()
): {
  allowed: boolean;
  reason?: 'blocked' | 'deleted' | 'expired' | 'unauthorized';
  message: string;
  planStatus?: PlanStatusResult;
} {
  if (!pro) {
    return {
      allowed: false,
      reason: 'unauthorized',
      message: 'Inicie sessão com uma conta profissional para realizar esta ação.'
    };
  }

  if (
    pro.role === 'admin' ||
    (pro as any).adminSubRole ||
    pro.email === 'jfigueiredo790@gmail.com' ||
    pro.id === 'user-admin-1' ||
    pro.id === 'UK0UyCKLjcNgLUlBAJch8U9BADM2'
  ) {
    return {
      allowed: true,
      message: 'Administrador autorizado.',
      planStatus: getProPlanStatus(pro, true, nowMs)
    };
  }

  if (pro.blocked === true || pro.status === 'bloqueado' || (pro as any).accountStatus === 'BLOCKED') {
    return {
      allowed: false,
      reason: 'blocked',
      message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
    };
  }

  if (pro.isDeleted === true || pro.status === 'deleted') {
    return {
      allowed: false,
      reason: 'deleted',
      message: 'Esta conta foi desativada ou eliminada e não pode realizar ações na plataforma.'
    };
  }

  const planStatus = getProPlanStatus(pro, GLOBAL_SUBSCRIPTIONS_ACTIVE, nowMs);
  if (!planStatus.isActive || planStatus.isExpired) {
    return {
      allowed: false,
      reason: 'expired',
      message: planStatus.message,
      planStatus
    };
  }

  return {
    allowed: true,
    message: 'Ação profissional autorizada com sucesso.',
    planStatus
  };
}
