import { ProfessionalProfile, User, ProSubscriptionPlan } from '../types';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👑 CONTROLO GLOBAL DE ATIVAÇÃO DAS SUBSCRIÇÕES DOS PROFISSIONAIS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 🔴 false = FASE DE CRESCIMENTO & ANGARIAÇÃO (ATUAL / DESATIVADO):
 *            - Todas as subscrições e cobranças permanecem DESATIVADAS.
 *            - Todos os profissionais utilizam a plataforma 100% livremente.
 *            - Nenhum profissional é bloqueado por falta de pagamento.
 *            - Nenhum aviso de expiração ou bloqueio de funcionalidades é exibido.
 *            - Podem receber pedidos, conversar no chat, divulgar trabalhos e aceitar serviços.
 *            - Todos os dados, perfis, fotos e publicações permanecem 100% preservados.
 *            - Toda a arquitetura de planos, carteira e pagamentos continua pronta internamente.
 *
 * 🟢 true = ATIVAÇÃO TOTAL DAS SUBSCRIÇÕES (QUANDO O PROPRIETÁRIO ORDENAR:
 *           "ACTIVAR SUBSCRIÇÕES PARA OS PROFISSIONAIS"):
 *           - Inicia o ciclo de subscrições: 14 dias de período gratuito para todos os
 *             profissionais a partir da ativação, e posterior seleção de planos pagos.
 */
export const GLOBAL_SUBSCRIPTIONS_ACTIVE: boolean = false;

export const PLAN_PRICES = {
  plan_7d: { days: 7, priceKz: 1500, label: 'Plano Semanal', badgeColor: 'emerald', description: 'Plano Semanal (7 Dias — 1.500 Kz)' },
  plan_14d: { days: 14, priceKz: 3000, label: 'Plano Quinzenal', badgeColor: 'blue', description: 'Plano Quinzenal (14 Dias — 3.000 Kz)' },
  plan_30d: { days: 30, priceKz: 5000, label: 'Plano Mensal', badgeColor: 'purple', description: 'Plano Mensal (30 Dias — 5.000 Kz)' },
} as const;

export interface PlanStatusResult {
  isTrial: boolean;
  isActive: boolean;
  isExpired: boolean;
  isBlocked?: boolean;
  isPromotionalPhase?: boolean;
  daysRemaining: number;
  hoursRemaining?: number;
  alertStage?: '7_days' | '3_days' | '24_hours' | 'expired' | 'normal';
  planType: ProSubscriptionPlan;
  expiresAtIso?: string;
  message: string;
}

export function getProPlanStatus(
  pro: Partial<ProfessionalProfile | User> | null | undefined,
  enforceSubscriptions: boolean = GLOBAL_SUBSCRIPTIONS_ACTIVE
): PlanStatusResult {
  if (!pro) {
    return {
      isTrial: true,
      isActive: false,
      isExpired: true,
      daysRemaining: 0,
      alertStage: 'expired',
      planType: 'free_trial',
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
      planType: 'plan_30d',
      message: 'Administrador Oficial J Smart Services'
    };
  }

  // 0.1 Check if account is blocked by Admin (Segurança e moderação continuam sempre ativas)
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

  // 0.2 FASE DE CRESCIMENTO (Subscrições Globalmente Inativas por ordem da Administração)
  if (!enforceSubscriptions) {
    return {
      isTrial: false,
      isActive: true,
      isExpired: false,
      isPromotionalPhase: true,
      daysRemaining: 9999,
      alertStage: 'normal',
      planType: pro.subscriptionPlan || 'free_trial',
      message: '100% gratuito durante a fase de crescimento — J Smart Services Angola'
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
        message: 'O seu período de plano terminou. Para continuar a aceitar pedidos e utilizar todas as funcionalidades profissionais, escolha um plano e efetue o pagamento.'
      };
    }
  }

  // 2. Otherwise calculate Free Trial
  const hasExplicitTrial = !!pro.trialStartDate;
  const startDate = new Date(pro.trialStartDate || new Date());
  const trialEnd = new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  const diffTime = trialEnd.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffTime > 0 || !hasExplicitTrial) {
    let alertStage: '7_days' | '3_days' | '24_hours' | 'normal' = 'normal';
    let alertMsg = `Faltam ${Math.max(1, daysRemaining > 0 ? daysRemaining : 14)} dias do seu período gratuito.`;

    if (diffTime > 0 && hoursRemaining <= 24) {
      alertStage = '24_hours';
      alertMsg = `⚠️ Lembrete urgente: Faltam menos de 24 horas do seu período gratuito!`;
    } else if (diffTime > 0 && daysRemaining <= 3) {
      alertStage = '3_days';
      alertMsg = `⚠️ Atenção: Faltam apenas ${daysRemaining} dias do seu período gratuito!`;
    } else if (diffTime > 0 && daysRemaining <= 7) {
      alertStage = '7_days';
      alertMsg = `🔔 Lembrete: Faltam ${daysRemaining} dias do seu período gratuito.`;
    }

    return {
      isTrial: true,
      isActive: true,
      isExpired: false,
      daysRemaining: Math.max(1, daysRemaining > 0 ? daysRemaining : 14),
      hoursRemaining: Math.max(1, hoursRemaining > 0 ? hoursRemaining : 336),
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

  // 0. Super Admin or Administrator check - Always permitted
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
        planType: 'plan_30d',
        message: 'Administrador Oficial J Smart Services'
      }
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

  // 3 & 4. Verificar subscrição (se o controlo global estiver desativado, o acesso é 100% liberado)
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
