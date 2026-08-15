import { ProfessionalProfile, User, ProSubscriptionPlan } from '../types';

export const PLAN_PRICES = {
  plan_7d: { days: 7, priceKz: 1500, label: 'Plano Semanal', badgeColor: 'emerald', description: 'Plano Semanal (7 Dias — 1.500 Kz)' },
  plan_14d: { days: 14, priceKz: 2000, label: 'Plano Quinzenal', badgeColor: 'blue', description: 'Plano Quinzenal (14 Dias — 2.000 Kz)' },
  plan_30d: { days: 30, priceKz: 5000, label: 'Plano Mensal', badgeColor: 'purple', description: 'Plano Mensal (30 Dias — 5.000 Kz)' },
} as const;

export interface PlanStatusResult {
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  isBlocked?: boolean;
  daysRemaining: number;
  hoursRemaining?: number;
  alertStage?: '7_days' | '3_days' | '24_hours' | 'expired' | 'normal';
  planType: ProSubscriptionPlan;
  expiresAtIso?: string;
  message: string;
}

export function getProPlanStatus(pro: Partial<ProfessionalProfile | User> | null | undefined): PlanStatusResult {
  if (!pro) {
    return {
      isTrial: true,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      alertStage: 'expired',
      planType: 'free_trial',
      message: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.'
    };
  }

  // 0. Check if account is blocked by Admin
  if (pro.blocked === true || pro.status === 'bloqueado' || (pro as any).accountStatus === 'BLOCKED') {
    return {
      isTrial: false,
      isActive: false,
      isExpired: false,
      isBlocked: true,
      daysRemaining: 0,
      planType: pro.subscriptionPlan || 'free_trial',
      message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
    };
  }

  const now = new Date();

  // 1. Check if user has an active paid plan that hasn't expired
  if (pro.planExpiresAt && pro.subscriptionPlan && pro.subscriptionPlan !== 'free_trial') {
    const expiresAt = new Date(pro.planExpiresAt);
    if (expiresAt > now) {
      const diffTime = expiresAt.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let planName = 'Plano Ativo';
      if (pro.subscriptionPlan === 'plan_7d') planName = 'Plano Semanal (7 Dias)';
      if (pro.subscriptionPlan === 'plan_14d') planName = 'Plano Quinzenal (14 Dias)';
      if (pro.subscriptionPlan === 'plan_30d') planName = 'Plano Mensal (30 Dias)';

      return {
        isTrial: false,
        isActive: true,
        isExpired: false,
        daysRemaining: Math.max(1, daysLeft),
        alertStage: 'normal',
        planType: pro.subscriptionPlan,
        expiresAtIso: pro.planExpiresAt,
        message: `${planName} ativo. Restam ${Math.max(1, daysLeft)} dia(s).`
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
        expiresAtIso: pro.planExpiresAt,
        message: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.'
      };
    }
  }

  // 2. Otherwise calculate 14-day Free Trial
  const startDate = new Date(pro.trialStartDate || pro.createdAt || new Date());
  const trialEnd = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffTime > 0) {
    let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
    let alertMsg = `Faltam ${Math.max(1, daysRemaining)} dias do seu período gratuito.`;

    if (hoursRemaining <= 24) {
      alertStage = '24_hours';
      alertMsg = `⚠️ Lembrete urgente: Faltam menos de 24 horas do seu período gratuito!`;
    } else if (daysRemaining <= 3) {
      alertStage = '3_days';
      alertMsg = `⚠️ Atenção: Faltam apenas ${daysRemaining} dias do seu período gratuito!`;
    } else if (daysRemaining <= 7) {
      alertStage = '7_days';
      alertMsg = `🔔 Lembrete: Faltam ${daysRemaining} dias do seu período gratuito.`;
    }

    return {
      isTrial: true,
      isActive: true,
      isExpired: false,
      daysRemaining: Math.max(1, daysRemaining),
      hoursRemaining: Math.max(1, hoursRemaining),
      alertStage,
      planType: 'free_trial',
      expiresAtIso: trialEnd.toISOString(),
      message: alertMsg
    };
  } else {
    return {
      isTrial: true,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      hoursRemaining: 0,
      alertStage: 'expired',
      planType: 'free_trial',
      expiresAtIso: trialEnd.toISOString(),
      message: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.'
    };
  }
}

/**
 * Validação de Segurança em 4 Etapas Obrigatórias para qualquer ação Profissional:
 * 1. Conta bloqueada?
 * 2. Conta ativa / não eliminada?
 * 3. Subscrição válida?
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

  // 1. Verificar se a conta está bloqueada pelo Administrador
  if (pro.blocked === true || pro.status === 'bloqueado' || (pro as any).accountStatus === 'BLOCKED') {
    return {
      allowed: false,
      reason: 'blocked',
      message: 'Conta bloqueada. O acesso à J Smart Services foi bloqueado pelo Administrador. Entre em contacto com o suporte para obter mais informações.'
    };
  }

  // 2. Verificar se a conta está ativa / não eliminada
  if (pro.isDeleted === true || pro.status === 'deleted') {
    return {
      allowed: false,
      reason: 'deleted',
      message: 'Esta conta foi desativada ou eliminada e não pode realizar ações na plataforma.'
    };
  }

  // 3 & 4. Verificar se existe uma subscrição válida e se a data de expiração não foi ultrapassada
  const planStatus = getProPlanStatus(pro);
  if (!planStatus.isActive || planStatus.isExpired) {
    return {
      allowed: false,
      reason: 'expired',
      message: 'O seu período gratuito terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.',
      planStatus
    };
  }

  return {
    allowed: true,
    message: 'Ação profissional autorizada com sucesso.',
    planStatus
  };
}
