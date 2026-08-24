/**
 * Safe local storage utility with quota protection and fallback management.
 * Prevents "Setting the value of '...' exceeded the quota" errors from crashing the app.
 */

// Self-healing check on module initialization: sanitize any bloated keys left in localStorage
(() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const feedKey = 'j_smart_services_data_v6_feed_posts';
      const existingFeed = window.localStorage.getItem(feedKey);
      if (existingFeed && existingFeed.length > 300000) {
        try {
          const parsed = JSON.parse(existingFeed);
          if (Array.isArray(parsed)) {
            const sanitized = sanitizeFeedPostsForStorage(parsed).slice(0, 15);
            window.localStorage.setItem(feedKey, JSON.stringify(sanitized));
            console.info('[SafeStorage] Otimização preventiva do cache de publicações realizada com sucesso.');
          }
        } catch (e) {
          window.localStorage.removeItem(feedKey);
        }
      }
    }
  } catch (e) {
    console.warn('[SafeStorage] Aviso na verificação inicial de quota:', e);
  }
})();

export const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Erro ao ler a chave "${key}":`, err);
    return null;
  }
};

export const safeStorageRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Erro ao remover a chave "${key}":`, err);
  }
};

/**
 * Strips heavy data URLs (> 15KB) from feed posts before storing in local cache.
 * Firebase/Firestore holds the true full media, while localStorage only needs a lightweight cache.
 */
export const sanitizeFeedPostsForStorage = <T extends any[]>(posts: T): any[] => {
  if (!Array.isArray(posts)) return [];
  // Keep only the most recent 30 posts in local storage cache
  const slice = posts.slice(0, 30);
  return slice.map((item: any) => {
    if (!item || typeof item !== 'object') return item;
    const clean = { ...item };
    
    // If mediaUrl is an oversized base64 data url (> 20KB), avoid storing giant string in localStorage
    if (typeof clean.mediaUrl === 'string' && clean.mediaUrl.startsWith('data:image/') && clean.mediaUrl.length > 25000) {
      // Keep a notice or truncated reference; Firestore contains the true data
      clean.mediaUrl = '';
    }
    if (typeof clean.beforeImageUrl === 'string' && clean.beforeImageUrl.startsWith('data:image/') && clean.beforeImageUrl.length > 25000) {
      clean.beforeImageUrl = '';
    }
    if (typeof clean.afterImageUrl === 'string' && clean.afterImageUrl.startsWith('data:image/') && clean.afterImageUrl.length > 25000) {
      clean.afterImageUrl = '';
    }
    return clean;
  });
};

/**
 * Safely saves data to localStorage without crashing when browser storage quota is exceeded.
 */
export const safeStorageSet = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] Falha inicial ao gravar "${key}" (Quota ou restrição):`, err?.message || err);

    // Attempt Recovery Step 1: Evict temporary / non-critical cached keys
    try {
      const nonCriticalKeys = [
        'j_smart_services_data_v6_audit_logs',
        'j_smart_services_data_v6_reports',
        'j_smart_services_data_v6_recovery_sessions'
      ];
      for (const k of nonCriticalKeys) {
        if (k !== key) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(key, value);
      return true;
    } catch (e1) {
      // Attempt Recovery Step 2: If the key itself is feed posts, aggressively prune value
      if (key.includes('feed_posts')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const pruned = sanitizeFeedPostsForStorage(parsed).slice(0, 10);
            localStorage.setItem(key, JSON.stringify(pruned));
            return true;
          }
        } catch (e2) {}
      }

      // Attempt Recovery Step 3: If key is messages or requests, keep only latest 20
      if (key.includes('_msgs') || key.includes('_reqs') || key.includes('_txs') || key.includes('_notifications')) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            localStorage.setItem(key, JSON.stringify(parsed.slice(0, 20)));
            return true;
          }
        } catch (e3) {}
      }

      console.warn(`[SafeStorage] Não foi possível persistir "${key}" no localStorage após tentativas de limpeza. Os dados continuam seguros em memória e no Firestore.`);
      return false;
    }
  }
};
