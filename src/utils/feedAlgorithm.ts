import { WorkFeedPost, ProfessionalProfile, User } from '../types';
import { getProPlanStatus } from './planUtils';

export interface FeedRankingParams {
  post: WorkFeedPost;
  currentUser?: User | null;
  professionals: ProfessionalProfile[];
  selectedCategoryFilter?: string;
}

/**
 * Algoritmo de Classificação do Feed de Trabalhos da J Smart Services:
 * 
 * 1. Recência da publicação (maior peso inicial);
 * 2. Relevância da categoria de serviço para o utilizador;
 * 3. Localização aproximada (proximidade da província);
 * 4. Interações com a publicação (número de gostos/engagement);
 * 5. Qualidade/relevância do conteúdo (descrição detalhada, foto/vídeo, selo de verificação);
 * 6. Disponibilidade do profissional ('disponivel' vs 'ocupado');
 * 7. Estado da subscrição do profissional (subscrição ativa vs inativa).
 * 
 * NOTA DE SEGURANÇA: As publicações antigas mantêm sempre a sua data original (createdAt)
 * e nunca são duplicadas ou alteradas.
 */
export function calculateFeedScore(params: FeedRankingParams): number {
  const { post, currentUser, professionals, selectedCategoryFilter } = params;

  // Encontrar o profissional real autor da publicação
  const pro = professionals.find(p => p.id === post.professionalId);
  const proPlan = pro ? getProPlanStatus(pro) : null;

  // Se a conta do profissional estiver bloqueada pelo Administrador, não pontuar
  if (pro?.blocked === true || (pro as any)?.accountStatus === 'BLOCKED') {
    return -99999;
  }

  // 1. Recência da publicação
  const now = Date.now();
  const postTime = new Date(post.createdAt).getTime();
  const diffHours = Math.max(0, (now - postTime) / (1000 * 60 * 60));
  
  // Decaimento suave da recência: 
  // 0h: 100 pts, 24h: 50 pts, 48h: 33 pts, 7 dias: ~12.5 pts, 30 dias: ~3.2 pts
  const recencyScore = 100 / (1 + (diffHours / 24));

  // 2. Relevância da categoria para o utilizador
  let categoryScore = 0;
  if (selectedCategoryFilter && selectedCategoryFilter !== 'Todas') {
    if (post.categoryName?.toLowerCase() === selectedCategoryFilter.toLowerCase()) {
      categoryScore += 75;
    }
  } else if (currentUser?.categories && currentUser.categories.length > 0) {
    if (currentUser.categories.includes(post.categoryName)) {
      categoryScore += 40;
    }
  }

  // 3. Localização aproximada (Província)
  let locationScore = 0;
  const userProvince = currentUser?.province?.toLowerCase();
  const proProvince = pro?.province?.toLowerCase();
  if (userProvince && proProvince && userProvince === proProvince && userProvince !== 'todas') {
    locationScore += 30;
  }

  // 4. Interações com a publicação (Gostos)
  const likes = post.likesCount || (post.likedBy?.length || 0);
  const interactionScore = Math.min(likes * 6, 60);

  // 5. Qualidade do conteúdo & Verificação
  let qualityScore = 0;
  if (post.description && post.description.trim().length >= 35) {
    qualityScore += 15;
  }
  if (post.mediaUrl && post.mediaUrl.trim().length > 0) {
    qualityScore += 15;
  }
  if (post.professionalVerified || pro?.verified) {
    qualityScore += 20;
  }

  // 6. Disponibilidade do profissional
  let availabilityScore = 0;
  if (pro?.status === 'disponivel') {
    availabilityScore += 20;
  } else if (pro?.status === 'ocupado') {
    availabilityScore += 5;
  }

  // 7. Estado da subscrição do profissional
  let subscriptionScore = 0;
  if (proPlan?.isActive) {
    subscriptionScore += 35;
  } else {
    // Profissional com plano expirado: publicação permanece visível, com pontuação ligeiramente inferior
    subscriptionScore -= 10;
  }

  // Pontuação Total: Recência tem multiplicador prioritário (2.2x)
  const totalScore = (recencyScore * 2.2)
    + categoryScore
    + locationScore
    + interactionScore
    + qualityScore
    + availabilityScore
    + subscriptionScore;

  return totalScore;
}

/**
 * Organiza e ordena as publicações reais do Feed pelo algoritmo de relevância.
 * Preserva integralmente todas as publicações originais sem duplicação nem alteração de dados.
 */
export function rankWorkFeedPosts(
  posts: WorkFeedPost[],
  currentUser: User | null | undefined,
  professionals: ProfessionalProfile[],
  selectedCategoryFilter: string = 'Todas'
): WorkFeedPost[] {
  if (!posts || posts.length === 0) return [];

  // Filtragem por categoria ou Minhas Publicações
  const filtered = posts.filter(post => {
    if (selectedCategoryFilter === 'Todas' || !selectedCategoryFilter) return true;
    if (selectedCategoryFilter === 'Minhas') {
      if (!currentUser?.id) return false;
      return post.professionalId === currentUser.id || (post.ownerId && post.ownerId === currentUser.id);
    }
    return post.categoryName?.toLowerCase() === selectedCategoryFilter.toLowerCase();
  });

  // Garantir unicidade estrita de publicações (sem duplicados por ID)
  const uniquePostsMap = new Map<string, WorkFeedPost>();
  filtered.forEach(p => {
    if (!uniquePostsMap.has(p.id)) {
      uniquePostsMap.set(p.id, p);
    }
  });

  const uniquePosts = Array.from(uniquePostsMap.values());

  // Ordenar pelo algoritmo de score
  return uniquePosts.sort((a, b) => {
    const scoreA = calculateFeedScore({
      post: a,
      currentUser,
      professionals,
      selectedCategoryFilter
    });

    const scoreB = calculateFeedScore({
      post: b,
      currentUser,
      professionals,
      selectedCategoryFilter
    });

    // Em caso de pontuações muito próximas, priorizar a data mais recente
    if (Math.abs(scoreB - scoreA) < 0.001) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    return scoreB - scoreA;
  });
}

/**
 * Formata a data original de forma amigável em português de Angola sem nunca alterar o timestamp.
 */
export function formatPostDateFriendly(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Data não disponível';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Menos de 1 hora
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;

    // Hoje
    const isToday = date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' });

    if (isToday) {
      return `Hoje às ${timeStr}`;
    }

    // Ontem
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) {
      return `Ontem às ${timeStr}`;
    }

    // Menos de 7 dias
    if (diffDays < 7) {
      return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} às ${timeStr}`;
    }

    // Data completa
    return date.toLocaleDateString('pt-AO', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  } catch {
    return 'Data original registada';
  }
}
