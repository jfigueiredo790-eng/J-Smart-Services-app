import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      supportPhoneWhatsapp: "+244 956011985",
      supportPhoneExpress: "+244 956011985",
      defaultCommissionPercent: 0,
      freeTrialDays: 30,
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
        config: "/api/v1/config"
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
        authMethodsSupported: ["Email/Password", "Phone Auth"]
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`J Smart Services Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
