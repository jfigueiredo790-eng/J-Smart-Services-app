import { ProfessionalProfile, User, ProSubscriptionPlan } from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👑 CONTROLO GLOBAL DE SUBSCRIÇÕES & PERÍODO EXPERIMENTAL — J SMART SERVICES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * - Novos profissionais registados a partir desta atualização recebem
 *   automaticamente 30 dias (1 mês) gratuitos a contar da data de criação da conta.
 * - Profissionais existentes mantêm os seus períodos pagos e registos atuais
 *   sem perda de dados, sem eliminação de contas e sem reinício automático
 *   indevido de períodos gratuitos.
 */
export const GLOBAL_SUBSCRIPTIONS_ACTIVE: boolean = true;

export const NEW_TRIAL_DAYS = 30;
export const LEGACY_TRIAL_DAYS = 14;
export const TRIAL_30D_EFFECTIVE_ISO = '2026-11-21T00:00:00.000Z';

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
    // Retrocompatibilidade apenas para exibição de registos históricos anteriores à atualização
    return {
      label: 'Plano Semanal (Histórico)',
      durationLabel: '7 dias',
      days: 7,
      priceKz: 1500
    };
  }
  return {
    label: 'Período Experimental Gratuito',
    durationLabel: `${NEW_TRIAL_DAYS} dias (1 mês)`,
    days: NEW_TRIAL_DAYS,
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

export interface PlanStatusResult {
  isTrial: boolean;
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
  message: string;
}

export function getProPlanStatus(
  pro: Partial<ProfessionalProfile | User> | null | undefined,
  enforceSubscriptions: boolean = GLOBAL_SUBSCRIPTIONS_ACTIVE,
  nowMs: number = Date.now()
): PlanStatusResult {
  if (!pro) {
    return {
      isTrial: true,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Sem Sessão',
      message: 'Inicie sessão com uma conta profissional para aceder.'
    };
  }

  // 0. Super Admin or Administrator check - Always active
  if (pro.role === 'admin' || (pro as any).adminSubRole || pro.email === 'jfigueiredo790@gmail.com' || pro.id === 'user-admin-1') {
    return {
      isTrial: false,
      isActive: true,
      isExpired: false,
      daysRemaining: 9999,
      alertStage: 'normal',
      planType: 'plan_90d',
      planLabel: 'Administrador Oficial',
      message: 'Administrador Oficial J Smart Services'
    };
  }

  // 0.1 Check if account is blocked by Admin
  if (pro.blocked === true || pro.status === 'bloqueado' || (pro as any).accountStatus === 'BLOCKED') {
    return {
      isTrial: false,
      isActive: false,
      isExpired: false,
      isBlocked: true,
      daysRemaining: 0,
      planType: pro.subscriptionPlan || 'free_trial',
      planLabel: 'Conta Bloqueada',
      message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
    };
  }

  // 0.2 Promotional Growth Override (when explicitly called with enforceSubscriptions = false)
  if (!enforceSubscriptions) {
    return {
      isTrial: false,
      isActive: true,
      isExpired: false,
      isPromotionalPhase: true,
      daysRemaining: 9999,
      alertStage: 'normal',
      planType: pro.subscriptionPlan || 'free_trial',
      planLabel: 'Fase de Crescimento',
      message: '100% gratuito durante a fase de crescimento — J Smart Services Angola'
    };
  }

  const now = new Date(nowMs);

  // 1. Check if user has a paid plan
  const planExpiresIso = normalizeTimestampIso(pro.planExpiresAt);
  const planStartedIso = normalizeTimestampIso((pro as any).planStartedAt || (pro as any).planActivatedAt);
  if (planExpiresIso && pro.subscriptionPlan && pro.subscriptionPlan !== 'free_trial') {
    const expiresAt = new Date(planExpiresIso);
    const displayInfo = getPlanDisplayInfo(pro.subscriptionPlan);

    if (expiresAt.getTime() > now.getTime()) {
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const hoursLeft = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60)));

      return {
        isTrial: false,
        isActive: true,
        isExpired: false,
        daysRemaining: daysLeft,
        hoursRemaining: hoursLeft,
        alertStage: daysLeft <= 1 ? '24_hours' : daysLeft <= 3 ? '3_days' : daysLeft <= 7 ? '7_days' : 'normal',
        planType: pro.subscriptionPlan,
        planLabel: `${displayInfo.label} (${displayInfo.durationLabel})`,
        startedAtIso: planStartedIso,
        expiresAtIso: planExpiresIso,
        message: `${displayInfo.label} (${displayInfo.durationLabel}) ativo. Restam ${daysLeft} dia(s).`
      };
    } else {
      return {
        isTrial: false,
        isActive: false,
        isExpired: true,
        daysRemaining: 0,
        hoursRemaining: 0,
        alertStage: 'expired',
        planType: pro.subscriptionPlan,
        planLabel: `${displayInfo.label} (Expirado)`,
        startedAtIso: planStartedIso,
        expiresAtIso: planExpiresIso,
        message: 'A sua subscrição expirou. Para continuar a publicar serviços, aparecer nas pesquisas e aceitar novos pedidos, escolha um dos nossos planos e envie o comprovativo.'
      };
    }
  }

  // 2. Calculate Free Trial anchored strictly to database timestamps (never client reset)
  const trialStartIso =
    normalizeTimestampIso((pro as any).trialStartServerTimestamp) ||
    normalizeTimestampIso(pro.trialStartDate) ||
    normalizeTimestampIso(pro.createdAt);

  if (!trialStartIso) {
    return {
      isTrial: true,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      trialDurationDays: NEW_TRIAL_DAYS,
      alertStage: 'expired',
      planType: 'free_trial',
      planLabel: 'Período Experimental Expirado',
      message: 'O seu período experimental gratuito terminou. Escolha um plano de subscrição e envie o comprovativo para continuar a trabalhar.'
    };
  }

  const startDate = new Date(trialStartIso);
  const createdIso = normalizeTimestampIso(pro.createdAt);
  const explicitDuration = typeof (pro as any).trialDurationDays === 'number'
    ? Math.max(0, Number((pro as any).trialDurationDays))
    : undefined;

  const isPostCutoffRegistration = createdIso
    ? new Date(createdIso).getTime() >= new Date(TRIAL_30D_EFFECTIVE_ISO).getTime()
    : startDate.getTime() >= new Date(TRIAL_30D_EFFECTIVE_ISO).getTime();

  const resolvedTrialDays = explicitDuration !== undefined
    ? explicitDuration
    : (isPostCutoffRegistration ? NEW_TRIAL_DAYS : LEGACY_TRIAL_DAYS);

  const explicitTrialEndsIso = normalizeTimestampIso((pro as any).trialEndsAt);
  const trialEnd = explicitTrialEndsIso
    ? new Date(explicitTrialEndsIso)
    : new Date(startDate.getTime() + resolvedTrialDays * 24 * 60 * 60 * 1000);

  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffTime > 0 && resolvedTrialDays > 0) {
    let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
    let alertMsg = `Período experimental gratuito de ${resolvedTrialDays} dias ativo: faltam ${Math.max(1, daysRemaining)} dia(s).`;

    if (hoursRemaining <= 24) {
      alertStage = '24_hours';
      alertMsg = '⚠️ Lembrete urgente: faltam menos de 24 horas para terminar o seu período experimental gratuito!';
    } else if (daysRemaining <= 3) {
      alertStage = '3_days';
      alertMsg = `⚠️ Atenção: faltam apenas ${daysRemaining} dia(s) para terminar o seu período gratuito!`;
    } else if (daysRemaining <= 7) {
      alertStage = '7_days';
      alertMsg = `🔔 Lembrete: faltam ${daysRemaining} dia(s) do seu período gratuito.`;
    }

    return {
      isTrial: true,
      isActive: true,
      isExpired: false,
      daysRemaining: Math.max(1, daysRemaining),
      hoursRemaining: Math.max(1, hoursRemaining),
      trialDurationDays: resolvedTrialDays,
      alertStage,
      planType: 'free_trial',
      planLabel: `Período Gratuito (${resolvedTrialDays} Dias)`,
      startedAtIso: trialStartIso,
      expiresAtIso: trialEnd.toISOString(),
      message: alertMsg
    };
  }

  return {
    isTrial: true,
    isActive: false,
    isExpired: true,
    daysRemaining: 0,
    hoursRemaining: 0,
    trialDurationDays: resolvedTrialDays,
    alertStage: 'expired',
    planType: 'free_trial',
    planLabel: resolvedTrialDays === 0 ? 'Período Gratuito Já Utilizado' : `Período Gratuito Terminado (${resolvedTrialDays} Dias)`,
    startedAtIso: trialStartIso,
    expiresAtIso: trialEnd.toISOString(),
    message:
      resolvedTrialDays === 0
        ? 'Esta conta não é elegível para um segundo período gratuito inicial. Escolha um plano de subscrição e envie o comprovativo para ativar o acesso profissional.'
        : `O seu período experimental gratuito de ${resolvedTrialDays} dias terminou. Escolha um dos planos disponíveis e submeta o comprovativo para continuar a trabalhar.`
  };
}

/**
 * Validação de Segurança em 4 Etapas Obrigatórias para qualquer ação Profissional:
 * 1. Conta bloqueada?
 * 2. Conta ativa / não eliminada?
 * 3. Subscrição ou período experimental válido?
 * 4. Data de expiração não ultrapassada?
 */
export function validateProAction(pro: Partial<ProfessionalProfile | User> | null | undefined): {
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

  if (pro.role === 'admin' || (pro as any).adminSubRole || pro.email === 'jfigueiredo790@gmail.com' || pro.id === 'user-admin-1') {
    return {
      allowed: true,
      message: 'Administrador autorizado.',
      planStatus: {
        isTrial: false,
        isActive: true,
        isExpired: false,
        daysRemaining: 9999,
        alertStage: 'normal',
        planType: 'plan_90d',
        planLabel: 'Administrador Oficial',
        message: 'Administrador Oficial J Smart Services'
      }
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

  const planStatus = getProPlanStatus(pro);
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
