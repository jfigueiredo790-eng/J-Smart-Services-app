export const OFFICIAL_HOSTNAME = 'jsmartservices.com';
export const OFFICIAL_WWW_HOSTNAME = 'www.jsmartservices.com';
export const OFFICIAL_APP_URL = `https://${OFFICIAL_HOSTNAME}`;

/**
 * Constrói um URL absoluto utilizando exclusivamente o domínio oficial da plataforma.
 */
export function buildOfficialUrl(pathAndQuery = ''): string {
  const clean = pathAndQuery.trim();
  if (!clean || clean === '/') {
    return OFFICIAL_APP_URL;
  }
  if (clean.startsWith('/')) {
    return `${OFFICIAL_APP_URL}${clean}`;
  }
  if (clean.startsWith('?')) {
    return `${OFFICIAL_APP_URL}/${clean}`;
  }
  return `${OFFICIAL_APP_URL}/${clean}`;
}

/**
 * Constrói links oficiais de partilha (registo, perfis, publicações, categorias ou páginas).
 */
export function buildShareUrl(params?: Record<string, string | undefined | null>): string {
  if (!params) return OFFICIAL_APP_URL;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      search.set(key, String(value).trim());
    }
  }
  const query = search.toString();
  return query ? `${OFFICIAL_APP_URL}/?${query}` : OFFICIAL_APP_URL;
}

/**
 * Garante que acessos via www.jsmartservices.com redirecionam para o domínio principal https://jsmartservices.com,
 * preservando caminhos, parâmetros e ambiente local/preview sem interferências.
 */
export function enforceCanonicalDomain(): void {
  if (typeof window === 'undefined') return;
  const { hostname, protocol, pathname, search, hash } = window.location;
  if (hostname === OFFICIAL_WWW_HOSTNAME || (hostname === OFFICIAL_HOSTNAME && protocol === 'http:')) {
    window.location.replace(`${OFFICIAL_APP_URL}${pathname}${search}${hash}`);
  }
}

/**
 * Partilha um link oficial via Web Share API (quando disponível) ou copia para a área de transferência.
 */
export async function shareOfficialLink(options: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied' | 'cancelled'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return 'shared';
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(options.url);
      return 'copied';
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = options.url;
      textarea.style.position = 'fixed';
      textarea.style.left = '-999999px';
      textarea.style.top = '-999999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) return 'copied';
    } catch {
      // Ignore fallback error
    }
  }

  return 'cancelled';
}
