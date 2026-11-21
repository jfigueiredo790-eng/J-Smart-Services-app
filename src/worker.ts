export interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
  ALLOWED_ORIGIN?: string;
  ENABLE_API_DOCS?: string;
  API_DOCS_TOKEN?: string;
}

const OFFICIAL_URL = 'https://jsmartservices.com';

const DEFAULT_ALLOWED_ORIGINS = new Set<string>([
  'https://jsmartservices.com',
  'https://www.jsmartservices.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const ipRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = ipRateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipRateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function getSecurityHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const extraOrigin = env.ALLOWED_ORIGIN?.trim();
  const allowedOrigin =
    DEFAULT_ALLOWED_ORIGINS.has(origin) || (extraOrigin && origin === extraOrigin)
      ? origin
      : OFFICIAL_URL;

  return {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(self), microphone=(), geolocation=(self)',
    'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
    'content-security-policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; media-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.firebasestorage.app https://jsmartservices.com https://www.jsmartservices.com wss://*.firebaseio.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none';",
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization, X-Docs-Token',
    'vary': 'Origin'
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Canonical redirect: www.jsmartservices.com or http://jsmartservices.com -> https://jsmartservices.com
    if (
      url.hostname === 'www.jsmartservices.com' ||
      (url.hostname === 'jsmartservices.com' && url.protocol === 'http:')
    ) {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const canonicalTarget = `${OFFICIAL_URL}${url.pathname}${url.search}`;
        return Response.redirect(canonicalTarget, 301);
      }
    }

    const secHeaders = getSecurityHeaders(request, env);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: secHeaders });
    }

    if (url.pathname.startsWith('/api/')) {
      const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
      if (!checkRateLimit(clientIp)) {
        return new Response(
          JSON.stringify({ error: 'Too many requests. Try again later.' }),
          {
            status: 429,
            headers: {
              ...secHeaders,
              'content-type': 'application/json;charset=UTF-8',
              'retry-after': '60'
            }
          }
        );
      }
    }

    // 1. Health check & Backend Status (no internal DB IDs exposed)
    if (url.pathname === '/api/v1/health') {
      return new Response(
        JSON.stringify({
          status: 'online',
          service: 'J Smart Services Backend API',
          version: '1.0.0',
          targetPlatforms: ['Web App', 'Android Native App'],
          environment: 'production',
          timestamp: new Date().toISOString()
        }),
        {
          status: 200,
          headers: {
            ...secHeaders,
            'content-type': 'application/json;charset=UTF-8',
            'cache-control': 'no-store'
          }
        }
      );
    }

    // 1.1 Authoritative Server Clock Endpoint
    if (url.pathname === '/api/v1/time') {
      const now = new Date();
      return new Response(
        JSON.stringify({
          success: true,
          nowIso: now.toISOString(),
          nowMs: now.getTime()
        }),
        {
          status: 200,
          headers: {
            ...secHeaders,
            'content-type': 'application/json;charset=UTF-8',
            'cache-control': 'no-store'
          }
        }
      );
    }

    // 2. Remote Config / App Settings Endpoint
    if (url.pathname === '/api/v1/config') {
      return new Response(
        JSON.stringify({
          success: true,
          appName: 'J Smart Services',
          officialUrl: OFFICIAL_URL,
          platformVersion: '1.0.0-android-ready',
          minAndroidBuildVersion: 100,
          forceUpdateNeeded: false,
          maintenanceMode: false,
          supportEmail: 'jfigueiredo790@gmail.com',
          supportPhoneWhatsapp: '+244 956011985',
          supportPhoneExpress: '+244 956011985',
          defaultCommissionPercent: 0,
          freeTrialDays: 30,
          proPlanMonthlyPriceKz: 3000,
          proPlans: [
            { key: 'plan_14d', label: 'Semanal', durationLabel: '2 semanas', days: 14, priceKz: 1500 },
            { key: 'plan_30d', label: 'Mensal', durationLabel: '1 mês', days: 30, priceKz: 3000 },
            { key: 'plan_90d', label: 'Trimestral', durationLabel: '3 meses', days: 90, priceKz: 8000 }
          ],
          currency: 'AOA (Kz)',
          provinces: [
            'Luanda', 'Bengo', 'Benguela', 'Bié', 'Cabinda', 'Cuando Cubango',
            'Cuanza Norte', 'Cuanza Sul', 'Cunene', 'Huambo', 'Huíla',
            'Lunda Norte', 'Lunda Sul', 'Malanje', 'Moxico', 'Namibe', 'Uíge', 'Zaire'
          ],
          apiEndpoints: {
            health: '/api/v1/health',
            time: '/api/v1/time',
            config: '/api/v1/config'
          }
        }),
        {
          status: 200,
          headers: {
            ...secHeaders,
            'content-type': 'application/json;charset=UTF-8'
          }
        }
      );
    }

    // 3. API Documentation Endpoint (gated in production)
    if (url.pathname === '/api/v1/docs') {
      const docsEnabled = env.ENABLE_API_DOCS === 'true';
      const requiredToken = env.API_DOCS_TOKEN?.trim();
      const providedToken = request.headers.get('x-docs-token')?.trim();

      if (!docsEnabled || (requiredToken && providedToken !== requiredToken)) {
        return new Response(
          JSON.stringify({ error: 'Endpoint desativado ou requer autorização.' }),
          {
            status: 403,
            headers: {
              ...secHeaders,
              'content-type': 'application/json;charset=UTF-8',
              'cache-control': 'no-store'
            }
          }
        );
      }

      return new Response(
        JSON.stringify({
          openapi: '3.0.0',
          info: {
            title: 'J Smart Services API - Web & Mobile Android Backend Spec',
            version: '1.0.0',
            description: 'Especificação da API para sincronização da plataforma J Smart Services.'
          },
          androidFirebaseConfig: {
            projectId: 'tuned-xray-hxctm',
            authMethodsSupported: ['Email/Password', 'Phone Auth']
          }
        }),
        {
          status: 200,
          headers: {
            ...secHeaders,
            'content-type': 'application/json;charset=UTF-8',
            'cache-control': 'no-store'
          }
        }
      );
    }

    // Serve SPA static assets with security headers attached
    const assetResponse = await env.ASSETS.fetch(request);
    const mergedHeaders = new Headers(assetResponse.headers);
    for (const [k, v] of Object.entries(secHeaders)) {
      if (!k.startsWith('access-control-')) {
        mergedHeaders.set(k, v);
      }
    }
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: mergedHeaders
    });
  }
};
