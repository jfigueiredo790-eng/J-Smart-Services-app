export interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
  ALLOWED_ORIGIN?: string;
  ENABLE_API_DOCS?: string;
  API_DOCS_TOKEN?: string;
  SMS_PROVIDER_URL?: string;
  SMS_API_KEY?: string;
  SMS_SENDER_ID?: string;
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

const RECOVERY_WINDOW_MS = 15 * 60_000;
const RECOVERY_MAX_REQUESTS = 5;
const recoveryBuckets = new Map<string, { count: number; resetAt: number }>();

interface WorkerOtpSession {
  phoneE164: string;
  saltHex: string;
  hashHex: string;
  expiresAt: number;
  attemptsLeft: number;
  verified: boolean;
}
const workerOtpSessions = new Map<string, WorkerOtpSession>();

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

function checkRecoveryRateLimitWorker(key: string): boolean {
  const now = Date.now();
  const bucket = recoveryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    recoveryBuckets.set(key, { count: 1, resetAt: now + RECOVERY_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RECOVERY_MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

const ANGOLA_PHONE_STRICT_REGEX_WORKER = /^\+244[0-9]{9}$/;
const INVALID_ANGOLA_PHONE_MSG_WORKER = 'Introduza um número de telefone válido de Angola.';

function validateAngolaPhoneWorker(raw: unknown): { isValid: boolean; e164: string; national9: string; masked: string } {
  if (typeof raw !== 'string') return { isValid: false, e164: '', national9: '', masked: '' };
  if (!ANGOLA_PHONE_STRICT_REGEX_WORKER.test(raw)) {
    return { isValid: false, e164: '', national9: '', masked: '' };
  }
  const national9 = raw.slice(4);
  return {
    isValid: true,
    e164: raw,
    national9,
    masked: `+244${national9.slice(0, 3)}••••${national9.slice(-2)}`
  };
}

function isSafeGatewayUrlWorker(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function hashOtpWebCrypto(code: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(saltHex), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function generateCryptoSixDigitCode(): string {
  const range = 900000;
  const maxValid = Math.floor(0xffffffff / range) * range;
  const buf = new Uint32Array(1);
  let v = 0;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= maxValid);
  return String(100000 + (v % range));
}

function randomHex(byteCount: number): string {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
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

    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';

    if (url.pathname.startsWith('/api/')) {
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

    // 1.1.5 Authoritative Backend Phone Format Validation (+244XXXXXXXXX)
    if (url.pathname === '/api/v1/auth/validate-phone' && request.method === 'POST') {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const parsedPhone = validateAngolaPhoneWorker(body?.phone);
      if (!parsedPhone.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            message: INVALID_ANGOLA_PHONE_MSG_WORKER
          }),
          {
            status: 400,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          phone: parsedPhone.e164,
          countryCode: '+244',
          nationalDigits: parsedPhone.national9
        }),
        {
          status: 200,
          headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
        }
      );
    }

    // 1.2 Phone Password Recovery - Request OTP
    if (url.pathname === '/api/v1/auth/recovery/request' && request.method === 'POST') {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const parsedPhone = validateAngolaPhoneWorker(body?.phone);
      if (!parsedPhone.isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            message: INVALID_ANGOLA_PHONE_MSG_WORKER
          }),
          {
            status: 400,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }

      if (!checkRecoveryRateLimitWorker(`ip:${clientIp}`) || !checkRecoveryRateLimitWorker(`phone:${parsedPhone.e164}`)) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Demasiadas tentativas de recuperação. Por segurança, aguarde 15 minutos antes de tentar novamente.'
          }),
          {
            status: 429,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }

      const smsUrl = env.SMS_PROVIDER_URL?.trim() || '';
      const smsKey = env.SMS_API_KEY?.trim() || '';
      const smsSender = env.SMS_SENDER_ID?.trim() || 'JSmart';

      if (smsUrl && smsKey && isSafeGatewayUrlWorker(smsUrl)) {
        const otpCode = generateCryptoSixDigitCode();
        const saltHex = randomHex(16);
        const sessionId = `rec_${randomHex(16)}`;
        const hashHex = await hashOtpWebCrypto(otpCode, saltHex);

        workerOtpSessions.set(sessionId, {
          phoneE164: parsedPhone.e164,
          saltHex,
          hashHex,
          expiresAt: Date.now() + 10 * 60_000,
          attemptsLeft: 3,
          verified: false
        });

        try {
          const smsRes = await fetch(smsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${smsKey}`
            },
            body: JSON.stringify({
              to: parsedPhone.e164,
              from: smsSender,
              message: `J Smart Services: o seu código de verificação é ${otpCode}. Válido por 10 minutos.`
            })
          });
          if (smsRes.ok) {
            return new Response(
              JSON.stringify({
                success: true,
                deliveryChannel: 'sms',
                sessionId,
                maskedPhone: parsedPhone.masked,
                message: `Enviámos um código SMS de 6 dígitos para ${parsedPhone.masked}.`
              }),
              {
                status: 200,
                headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
              }
            );
          }
          workerOtpSessions.delete(sessionId);
        } catch {
          workerOtpSessions.delete(sessionId);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          deliveryChannel: 'fallback_verified',
          maskedPhone: parsedPhone.masked,
          message: 'A iniciar verificação segura para o número informado.'
        }),
        {
          status: 200,
          headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
        }
      );
    }

    // 1.3 Phone Password Recovery - Verify OTP
    if (url.pathname === '/api/v1/auth/recovery/verify' && request.method === 'POST') {
      let body: any = {};
      try {
        body = await request.json();
      } catch {
        body = {};
      }
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
      const code = typeof body?.code === 'string' ? body.code.replace(/\D/g, '') : '';

      const session = workerOtpSessions.get(sessionId);
      if (!sessionId || code.length !== 6 || !session || Date.now() > session.expiresAt) {
        if (sessionId) workerOtpSessions.delete(sessionId);
        return new Response(
          JSON.stringify({ success: false, message: 'O código informado expirou ou é inválido. Solicite um novo código.' }),
          {
            status: 400,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }

      if (session.attemptsLeft <= 0) {
        workerOtpSessions.delete(sessionId);
        return new Response(
          JSON.stringify({ success: false, message: 'Número máximo de tentativas excedido. Solicite um novo código.' }),
          {
            status: 429,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }

      const candidateHash = await hashOtpWebCrypto(code, session.saltHex);
      if (!constantTimeEqualHex(candidateHash, session.hashHex)) {
        session.attemptsLeft -= 1;
        return new Response(
          JSON.stringify({
            success: false,
            attemptsRemaining: session.attemptsLeft,
            message: `Código incorreto. Restam ${session.attemptsLeft} tentativa(s).`
          }),
          {
            status: 400,
            headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
          }
        );
      }

      session.verified = true;
      return new Response(
        JSON.stringify({ success: true, message: 'Código validado com sucesso.' }),
        {
          status: 200,
          headers: { ...secHeaders, 'content-type': 'application/json;charset=UTF-8', 'cache-control': 'no-store' }
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
          supportPhoneWhatsapp: '+244956011985',
          supportPhoneExpress: '+244956011985',
          authPrimaryIdentifier: 'phone',
          phoneCountryCode: '+244',
          phoneNationalDigits: 9,
          phoneFormat: '+244XXXXXXXXX',
          emailOptionalOnSignup: true,
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
            config: '/api/v1/config',
            validatePhone: '/api/v1/auth/validate-phone',
            recoveryRequest: '/api/v1/auth/recovery/request',
            recoveryVerify: '/api/v1/auth/recovery/verify'
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
            authMethodsSupported: ['Phone/Password (Angola +244)']
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
