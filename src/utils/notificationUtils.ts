import { AppNotification, User } from '../types';

/**
 * Validates whether a notification is relevant and accessible for a given user
 * considering their role (Cliente, Profissional, Admin) and active mode (for dual-role users).
 */
export const isNotificationForUser = (notif: AppNotification, user: User): boolean => {
  if (!user) return false;

  const activeRole = user.role; // 'cliente' | 'profissional' | 'admin'
  const accountType = user.accountType || (user.role === 'admin' ? 'admin' : user.role === 'profissional' ? 'profissional' : 'cliente');

  // 1. ADMINISTRATOR ROLE
  if (activeRole === 'admin' || user.role === 'admin') {
    return notif.userId === 'admin' || notif.targetRoleScope === 'admin';
  }

  // Non-admins must never see admin notifications
  if (notif.userId === 'admin' || notif.targetRoleScope === 'admin') {
    return false;
  }

  // 2. EXCLUSIVE TARGET ROLE SCOPE
  if (notif.targetRoleScope === 'profissional') {
    if (accountType === 'cliente') return false;
    if (accountType === 'duplo' && activeRole !== 'profissional') return false;
    if (activeRole !== 'profissional') return false;
  }

  if (notif.targetRoleScope === 'cliente') {
    if (accountType === 'profissional' && activeRole !== 'cliente') return false;
    if (accountType === 'duplo' && activeRole !== 'cliente') return false;
    if (activeRole !== 'cliente') return false;
  }

  // 3. EXCLUSIVE NOTIFICATION TYPES
  const proExclusiveTypes = ['trial_aviso', 'plano_expira'];
  if (proExclusiveTypes.includes(notif.type)) {
    if (accountType === 'cliente') return false;
    if (activeRole !== 'profissional') return false;
  }

  // 4. CONTENT KEYWORD PROTECTION FOR CLIENTS
  const lowerContent = (notif.title + ' ' + notif.message).toLowerCase();
  const isProPlanKeyword = 
    lowerContent.includes('período gratuito de 14 dias para profissionais') ||
    lowerContent.includes('plano de profissionais') ||
    lowerContent.includes('assinatura profissional') ||
    lowerContent.includes('renovação de plano profissional') ||
    lowerContent.includes('pacote liberado pela administração');

  if (isProPlanKeyword) {
    if (accountType === 'cliente') return false;
    if (activeRole !== 'profissional') return false;
  }

  // 5. USER ID DIRECT TARGETING
  if (notif.userId === user.id) {
    if (accountType === 'duplo') {
      if (notif.targetRoleScope === 'profissional' && activeRole !== 'profissional') return false;
      if (notif.targetRoleScope === 'cliente' && activeRole !== 'cliente') return false;
    }
    return true;
  }

  // 6. BROADCAST GROUPS
  if (notif.userId === 'pro_all') {
    return activeRole === 'profissional' && accountType !== 'cliente';
  }

  if (notif.userId === 'client_all') {
    return activeRole === 'cliente' && accountType !== 'profissional';
  }

  if (notif.userId === 'all') {
    if (notif.targetRoleScope === 'profissional') {
      return activeRole === 'profissional' && accountType !== 'cliente';
    }
    if (notif.targetRoleScope === 'cliente') {
      return activeRole === 'cliente' && accountType !== 'profissional';
    }
    if (notif.targetRoleScope === 'todos') {
      return true;
    }
    if (isProPlanKeyword) {
      return activeRole === 'profissional';
    }
    return true;
  }

  return false;
};
