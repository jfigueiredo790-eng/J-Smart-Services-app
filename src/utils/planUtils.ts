import { ProfessionalProfile, User, ProSubscriptionPlan } from '../types';

export const PLAN_PRICES = {
  plan_7d: { days: 7, priceKz: 1500, label: 'Plano Semanal', badgeColor: 'emerald', description: 'Plano Semanal (7 Dias)' },
  plan_14d: { days: 14, priceKz: 3000, label: 'Plano Quinzenal', badgeColor: 'blue', description: 'Plano Quinzenal (14 Dias)' },
  plan_30d: { days: 30, priceKz: 5000, label: 'Plano Mensal', badgeColor: 'purple', description: 'Plano Mensal (30 Dias - Mais Vendido)' },
} as const;

export interface PlanStatusResult {
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
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
      message: 'O seu período gratuito terminou. Escolha um plano para continuar a receber clientes.'
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
        message: 'O seu plano profissional expirou. Escolha um novo plano (Semanal, Quinzenal ou Mensal) para continuar a receber trabalhos.'
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
      message: 'O seu período gratuito terminou. Escolha um plano para continuar a receber clientes.'
    };
  }
}
