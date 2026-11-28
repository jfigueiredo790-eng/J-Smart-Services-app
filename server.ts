import express from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const ALLOWED_ORIGINS = new Set<string>([
  "https://jsmartservices.com",
  "https://www.jsmartservices.com",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : [])
]);

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const RECOVERY_WINDOW_MS = 15 * 60_000;
const RECOVERY_MAX_PER_WINDOW = 5;
const recoveryBuckets = new Map<string, { count: number; resetAt: number }>();

interface ServerOtpSession {
  phoneE164: string;
  requestId?: string;
  targetUid?: string;
  salt: string;
  codeHashHex: string;
  expiresAt: number;
  attemptsLeft: number;
  verified: boolean;
  usedAt: number | null;
}
const otpSessions = new Map<string, ServerOtpSession>();

const ANGOLA_PHONE_STRICT_REGEX = /^\+244[0-9]{9}$/;
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVALID_ANGOLA_PHONE_MSG = "Introduza um número de telefone válido de Angola.";
const MANDATORY_RECOVERY_GENERIC_MSG =
  "O seu pedido de recuperação foi recebido. Aguarde a verificação da sua conta pelo administrador da J Smart Services. Receberá uma resposta após a análise do pedido.";
const OFFICIAL_ADMIN_EMAIL_SERVER = "jfigueiredo790@gmail.com";
const PROTECTED_ADMIN_UID_SERVER = "UK0UyCKLjcNgLUlBAJch8U9BADM2";

function validateRecoveryEmailServer(raw: unknown): { isValid: boolean; email: string } {
  if (typeof raw !== "string") return { isValid: false, email: "" };
  const clean = raw.trim().toLowerCase();
  if (!clean || clean.length > 200 || clean.endsWith("@phone.jsmartservices.com") || !SIMPLE_EMAIL_REGEX.test(clean)) {
    return { isValid: false, email: "" };
  }
  return { isValid: true, email: clean };
}

function getFirebaseWebApiKeyServer(): string {
  if (process.env.FIREBASE_WEB_API_KEY?.trim()) {
    return process.env.FIREBASE_WEB_API_KEY.trim();
  }
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (typeof parsed?.apiKey === "string") return parsed.apiKey.trim();
    }
  } catch {
    // ignore
  }
  return "";
}

async function verifyFirebaseAdminBearerToken(
  authHeader: string | undefined
): Promise<{ authorized: boolean; uid?: string; email?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { authorized: false };
  }
  const idToken = authHeader.slice(7).trim();
  if (!idToken || idToken.length > 4096) {
    return { authorized: false };
  }
  const apiKey = getFirebaseWebApiKeyServer();
  if (!apiKey) {
    return { authorized: false };
  }
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken })
      }
    );
    if (!lookupRes.ok) return { authorized: false };
    const data = (await lookupRes.json().catch(() => null)) as {
      users?: Array<{ localId?: string; email?: string; emailVerified?: boolean }>;
    } | null;
    const user = data?.users?.[0];
    if (!user?.localId) return { authorized: false };
    const emailLower = (user.email || "").trim().toLowerCase();
    const isVerifiedSuperAdmin =
      (emailLower === OFFICIAL_ADMIN_EMAIL_SERVER && user.emailVerified === true) ||
      user.localId === PROTECTED_ADMIN_UID_SERVER;
    if (!isVerifiedSuperAdmin) {
      return { authorized: false };
    }
    return { authorized: true, uid: user.localId, email: emailLower };
  } catch {
    return { authorized: false };
  }
}

function validateAngolaPhoneServer(raw: unknown): { isValid: boolean; e164: string; national9: string; masked: string } {
  if (typeof raw !== "string") return { isValid: false, e164: "", national9: "", masked: "" };
  if (!ANGOLA_PHONE_STRICT_REGEX.test(raw)) {
    return { isValid: false, e164: "", national9: "", masked: "" };
  }
  const national9 = raw.slice(4);
  return {
    isValid: true,
    e164: raw,
    national9,
    masked: `+244${national9.slice(0, 3)}••••${national9.slice(-2)}`
  };
}

function isSafeHttpsGatewayUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getOptionalSmsGatewayConfig(): {
  configured: boolean;
  providerUrl: string;
  apiKey: string;
  senderId: string;
} {
  const providerUrl = process.env.SMS_PROVIDER_URL?.trim() || "";
  const apiKey = process.env.SMS_API_KEY?.trim() || "";
  const senderId = process.env.SMS_SENDER_ID?.trim() || "JSmart";
  const configured = Boolean(providerUrl && apiKey && isSafeHttpsGatewayUrl(providerUrl));
  return { configured, providerUrl, apiKey, senderId };
}

function hashOtpScrypt(code: string, salt: string): string {
  return crypto.scryptSync(code, salt, 32).toString("hex");
}

function checkRecoveryRate(key: string): boolean {
  const now = Date.now();
  const bucket = recoveryBuckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    recoveryBuckets.set(key, { count: 1, resetAt: now + RECOVERY_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RECOVERY_MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

async function startServer() {
  const app = express();
  const distPath = path.join(process.cwd(), "dist");
  const hasBuiltDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (process.env.NODE_ENV !== "development" && hasBuiltDist);
  const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  // Baseline HTTP security headers (iframe-compatible for preview environment)
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=(self)");

    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Docs-Token");
      res.setHeader("Vary", "Origin");
    }

    if (req.method === "OPTIONS" && req.path.startsWith("/api/")) {
      res.status(204).end();
      return;
    }
    next();
  });

  // In-memory rate limiter for /api/*
  app.use("/api/", (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      next();
      return;
    }
    if (bucket.count >= RATE_MAX) {
      res.status(429).json({ error: "Demasiados pedidos. Tente novamente em instantes." });
      return;
    }
    bucket.count += 1;
    next();
  });

  // 0. Lightweight Cloud Run readiness/liveness probe
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ status: "ok" });
  });

  // 1. Health check & Backend Status (no internal DB IDs exposed)
  app.get("/api/v1/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      status: "online",
      service: "J Smart Services Backend API",
      version: "1.0.0",
      targetPlatforms: ["Web App", "Android Native App"],
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString()
    });
  });

  // 1.1 Server Clock Endpoint (authoritative server time for trial & subscription validation)
  app.get("/api/v1/time", (_req, res) => {
    const now = new Date();
    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      nowIso: now.toISOString(),
      nowMs: now.getTime()
    });
  });

  // 1.1.5 Authoritative Backend Phone Format Validation (+244XXXXXXXXX)
  app.post("/api/v1/auth/validate-phone", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const parsedPhone = validateAngolaPhoneServer(req.body?.phone);
    if (!parsedPhone.isValid) {
      res.status(400).json({
        success: false,
        message: INVALID_ANGOLA_PHONE_MSG
      });
      return;
    }
    res.status(200).json({
      success: true,
      phone: parsedPhone.e164,
      countryCode: "+244",
      nationalDigits: parsedPhone.national9
    });
  });

  // 1.2 Phone Password Recovery - Request OTP (server-side scrypt hashed, never exposes OTP to client)
  app.post("/api/v1/auth/recovery/request", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const parsedPhone = validateAngolaPhoneServer(req.body?.phone);
    if (!parsedPhone.isValid) {
      res.status(400).json({
        success: false,
        message: INVALID_ANGOLA_PHONE_MSG
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkRecoveryRate(`ip:${ip}`) || !checkRecoveryRate(`phone:${parsedPhone.e164}`)) {
      res.status(429).json({
        success: false,
        message: "Demasiadas tentativas de recuperação. Por segurança, aguarde 15 minutos antes de tentar novamente."
      });
      return;
    }

    const smsConfig = getOptionalSmsGatewayConfig();

    if (smsConfig.configured) {
      const otpCode = String(crypto.randomInt(100000, 1000000));
      const salt = crypto.randomBytes(16).toString("hex");
      const sessionId = `rec_${crypto.randomBytes(16).toString("hex")}`;

      otpSessions.set(sessionId, {
        phoneE164: parsedPhone.e164,
        salt,
        codeHashHex: hashOtpScrypt(otpCode, salt),
        expiresAt: Date.now() + 10 * 60_000,
        attemptsLeft: 3,
        verified: false,
        usedAt: null
      });

      try {
        const smsRes = await fetch(smsConfig.providerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${smsConfig.apiKey}`
          },
          body: JSON.stringify({
            to: parsedPhone.e164,
            from: smsConfig.senderId,
            message: `J Smart Services: o seu código de verificação é ${otpCode}. Válido por 10 minutos.`
          })
        });

        if (!smsRes.ok) {
          otpSessions.delete(sessionId);
          res.status(200).json({
            success: true,
            deliveryChannel: "fallback_verified",
            maskedPhone: parsedPhone.masked,
            message: "A iniciar verificação segura alternativa para este número de telefone."
          });
          return;
        }

        res.status(200).json({
          success: true,
          deliveryChannel: "sms",
          sessionId,
          maskedPhone: parsedPhone.masked,
          message: `Enviámos um código SMS de 6 dígitos para ${parsedPhone.masked}.`
        });
        return;
      } catch {
        otpSessions.delete(sessionId);
      }
    }

    res.status(200).json({
      success: true,
      deliveryChannel: "fallback_verified",
      maskedPhone: parsedPhone.masked,
      message: "A iniciar verificação segura para o número informado."
    });
  });

  // 1.3 Phone Password Recovery - Verify OTP (constant-time scrypt comparison)
  app.post("/api/v1/auth/recovery/verify", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.replace(/\D/g, "") : "";

    if (!sessionId || code.length !== 6) {
      res.status(400).json({ success: false, message: "Código de verificação inválido." });
      return;
    }

    const session = otpSessions.get(sessionId);
    if (!session || session.verified || session.usedAt !== null) {
      res.status(400).json({
        success: false,
        message: "Este código já foi utilizado ou é inválido. Solicite um novo código."
      });
      return;
    }

    if (Date.now() > session.expiresAt) {
      otpSessions.delete(sessionId);
      res.status(400).json({
        success: false,
        message: "O código informado expirou ou é inválido. Solicite um novo código."
      });
      return;
    }

    if (session.attemptsLeft <= 0) {
      otpSessions.delete(sessionId);
      res.status(429).json({
        success: false,
        message: "Número máximo de tentativas excedido. Solicite um novo código."
      });
      return;
    }

    const candidateHash = Buffer.from(hashOtpScrypt(code, session.salt), "hex");
    const storedHash = Buffer.from(session.codeHashHex, "hex");
    const isMatch = candidateHash.length === storedHash.length && crypto.timingSafeEqual(candidateHash, storedHash);

    if (!isMatch) {
      session.attemptsLeft -= 1;
      res.status(400).json({
        success: false,
        attemptsRemaining: session.attemptsLeft,
        message: `Código incorreto. Restam ${session.attemptsLeft} tentativa(s).`
      });
      return;
    }

    session.verified = true;
    session.usedAt = Date.now();
    res.status(200).json({
      success: true,
      message: "Código validado com sucesso."
    });
  });

  // 1.4 Account Recovery System - Public Anti-Enumeration Submission (Phone +244XXXXXXXXX OR Email)
  app.post("/api/v1/auth/recovery-requests", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const rawPhone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    if (!rawPhone && !rawEmail) {
      res.status(400).json({
        success: false,
        message: "Preencha o número de telefone (+244 seguido de 9 dígitos) ou o endereço de e-mail utilizado no registo."
      });
      return;
    }

    const parsedPhone = rawPhone ? validateAngolaPhoneServer(rawPhone) : null;
    if (rawPhone && (!parsedPhone || !parsedPhone.isValid)) {
      res.status(400).json({
        success: false,
        message: INVALID_ANGOLA_PHONE_MSG
      });
      return;
    }

    const parsedEmail = rawEmail ? validateRecoveryEmailServer(rawEmail) : null;
    if (rawEmail && (!parsedEmail || !parsedEmail.isValid)) {
      res.status(400).json({
        success: false,
        message: "Introduza um endereço de e-mail válido."
      });
      return;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const idKey = parsedPhone?.e164 || parsedEmail?.email || "unknown";
    if (!checkRecoveryRate(`req_ip:${ip}`) || !checkRecoveryRate(`req_id:${idKey}`)) {
      res.status(429).json({
        success: false,
        message: "Demasiadas tentativas de recuperação. Por motivos de segurança, aguarde 15 minutos antes de tentar novamente."
      });
      return;
    }

    const requestId = `rec_${crypto.randomBytes(12).toString("hex")}`;
    // Anti-enumeration: response is identical regardless of whether phone/email exists
    res.status(200).json({
      success: true,
      requestId,
      message: MANDATORY_RECOVERY_GENERIC_MSG
    });
  });

  // 1.5 Account Recovery System - Admin-Only Single-Use SMS Code Dispatch (never fakes SMS if unconfigured)
  app.post("/api/v1/auth/recovery-requests/:id/issue-code", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const adminCheck = await verifyFirebaseAdminBearerToken(req.headers.authorization);
    if (!adminCheck.authorized) {
      res.status(403).json({
        success: false,
        message: "Acesso negado: apenas administradores verificados podem emitir códigos de recuperação."
      });
      return;
    }

    const requestId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    const parsedPhone = validateAngolaPhoneServer(req.body?.phone);
    if (!/^rec_[a-zA-Z0-9_-]{8,64}$/.test(requestId) || !parsedPhone.isValid) {
      res.status(400).json({
        success: false,
        message: "Identificador do pedido ou número de telefone angolano inválido."
      });
      return;
    }

    const smsConfig = getOptionalSmsGatewayConfig();
    if (!smsConfig.configured) {
      res.status(200).json({
        success: false,
        dispatched: false,
        requiresExternalSmsConfig: true,
        message: "Gateway SMS externo não configurado (SMS_PROVIDER_URL / SMS_API_KEY). Nenhum SMS foi simulado."
      });
      return;
    }

    const otpCode = String(crypto.randomInt(100000, 1000000));
    const salt = crypto.randomBytes(16).toString("hex");
    const sessionId = `rec_sms_${crypto.randomBytes(12).toString("hex")}`;

    otpSessions.set(sessionId, {
      phoneE164: parsedPhone.e164,
      requestId,
      targetUid: typeof req.body?.targetUid === "string" ? req.body.targetUid.slice(0, 128) : undefined,
      salt,
      codeHashHex: hashOtpScrypt(otpCode, salt),
      expiresAt: Date.now() + 15 * 60_000,
      attemptsLeft: 3,
      verified: false,
      usedAt: null
    });

    try {
      const smsRes = await fetch(smsConfig.providerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${smsConfig.apiKey}`
        },
        body: JSON.stringify({
          to: parsedPhone.e164,
          from: smsConfig.senderId,
          message: `J Smart Services: o seu pedido de recuperação foi aprovado. Código temporário (uso único, 15 min): ${otpCode}.`
        })
      });

      if (!smsRes.ok) {
        otpSessions.delete(sessionId);
        res.status(502).json({
          success: false,
          dispatched: false,
          message: "O fornecedor externo de SMS rejeitou o envio. Mantido pendente."
        });
        return;
      }

      res.status(200).json({
        success: true,
        dispatched: true,
        sessionId,
        maskedPhone: parsedPhone.masked,
        message: `Código temporário de uso único enviado por SMS para ${parsedPhone.masked}.`
      });
    } catch {
      otpSessions.delete(sessionId);
      res.status(502).json({
        success: false,
        dispatched: false,
        message: "Falha de ligação ao gateway SMS externo."
      });
    }
  });

  // 1.6 Account Recovery System - Single-Use Expiring Verification Code Check
  app.post("/api/v1/auth/recovery-requests/verify-code", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const sessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.replace(/\D/g, "") : "";

    if (!sessionId || code.length !== 6) {
      res.status(400).json({ success: false, message: "Código de recuperação inválido." });
      return;
    }

    const session = otpSessions.get(sessionId);
    if (!session) {
      res.status(400).json({ success: false, message: "Código de recuperação inválido ou inexistente." });
      return;
    }

    if (session.usedAt !== null || session.verified) {
      res.status(400).json({
        success: false,
        message: "Este código de recuperação já foi utilizado. Solicite uma nova aprovação."
      });
      return;
    }

    if (Date.now() > session.expiresAt) {
      otpSessions.delete(sessionId);
      res.status(400).json({
        success: false,
        message: "Este código de recuperação expirou. Solicite uma nova recuperação."
      });
      return;
    }

    if (session.attemptsLeft <= 0) {
      otpSessions.delete(sessionId);
      res.status(429).json({
        success: false,
        message: "Número máximo de tentativas excedido para este código."
      });
      return;
    }

    const candidateHash = Buffer.from(hashOtpScrypt(code, session.salt), "hex");
    const storedHash = Buffer.from(session.codeHashHex, "hex");
    const isMatch = candidateHash.length === storedHash.length && crypto.timingSafeEqual(candidateHash, storedHash);

    if (!isMatch) {
      session.attemptsLeft -= 1;
      res.status(400).json({
        success: false,
        attemptsRemaining: session.attemptsLeft,
        message: `Código incorreto. Restam ${session.attemptsLeft} tentativa(s).`
      });
      return;
    }

    session.verified = true;
    session.usedAt = Date.now();
    res.status(200).json({
      success: true,
      requestId: session.requestId,
      message: "Código de recuperação validado com sucesso."
    });
  });

  // 2. Remote Config / App Settings Endpoint
  app.get("/api/v1/config", (_req, res) => {
    res.json({
      success: true,
      appName: "J Smart Services",
      officialUrl: "https://jsmartservices.com",
      platformVersion: "1.0.0-android-ready",
      minAndroidBuildVersion: 100,
      forceUpdateNeeded: false,
      maintenanceMode: false,
      supportEmail: "jfigueiredo790@gmail.com",
      supportPhoneWhatsapp: "+244956011985",
      supportPhoneExpress: "+244956011985",
      authPrimaryIdentifier: "phone",
      authSupportedIdentifiers: ["phone"],
      phoneCountryCode: "+244",
      phoneNationalDigits: 9,
      phoneFormat: "+244XXXXXXXXX",
      emailOptionalOnSignup: true,
      smsVerificationRequiredForLogin: false,
      smsProviderConfigured: getOptionalSmsGatewayConfig().configured,
      defaultCommissionPercent: 0,
      freeTrialDays: 14,
      proPlanMonthlyPriceKz: 3000,
      proPlans: [
        { key: "plan_14d", label: "Semanal", durationLabel: "2 semanas", days: 14, priceKz: 1500 },
        { key: "plan_30d", label: "Mensal", durationLabel: "1 mês", days: 30, priceKz: 3000 },
        { key: "plan_90d", label: "Trimestral", durationLabel: "3 meses", days: 90, priceKz: 8000 }
      ],
      currency: "AOA (Kz)",
      provinces: [
        "Luanda", "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango",
        "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla",
        "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
      ],
      apiEndpoints: {
        health: "/api/v1/health",
        time: "/api/v1/time",
        config: "/api/v1/config",
        validatePhone: "/api/v1/auth/validate-phone",
        recoveryRequest: "/api/v1/auth/recovery/request",
        recoveryVerify: "/api/v1/auth/recovery/verify"
      }
    });
  });

  // 3. API Documentation Endpoint (gated by env flag and optional token)
  app.get("/api/v1/docs", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const docsEnabled = process.env.ENABLE_API_DOCS === "true";
    const requiredToken = process.env.API_DOCS_TOKEN?.trim();
    const providedToken = req.header("x-docs-token")?.trim();

    if (!docsEnabled || (requiredToken && providedToken !== requiredToken)) {
      res.status(403).json({ error: "Endpoint desativado ou requer autorização." });
      return;
    }

    res.json({
      openapi: "3.0.0",
      info: {
        title: "J Smart Services API - Web & Mobile Android Backend Spec",
        version: "1.0.0",
        description: "Especificação da API para sincronização da plataforma J Smart Services."
      },
      androidFirebaseConfig: {
        projectId: "tuned-xray-hxctm",
        authMethodsSupported: ["Phone/Password (Angola +244)"]
      }
    });
  });

  // Return JSON 404 for unknown /api/* endpoints instead of HTML
  app.use("/api/", (_req, res) => {
    res.status(404).json({ error: "Endpoint não encontrado." });
  });

  // Vite middleware for development; static dist serving for production (Cloud Run)
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`J Smart Services Backend running on http://0.0.0.0:${PORT} (env=${process.env.NODE_ENV || "development"})`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch((err) => {
  console.error("Failed to start J Smart Services server:", err);
  process.exit(1);
});
