import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // UNIFIED REST API ENDPOINTS (WEB & ANDROID)
  // ==========================================

  // 1. Health check & Backend Status
  app.get("/api/v1/health", (req, res) => {
    res.json({
      status: "online",
      service: "J Smart Services Backend API",
      version: "1.0.0",
      targetPlatforms: ["Web App", "Android Native App"],
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      database: "Firebase Firestore Unified Database",
      firestoreDatabaseId: "ai-studio-jsmartservices-dd54ef3d-8456-4336-a85a-7d7350f4594e"
    });
  });

  // 2. Remote Config / App Settings Endpoint (Sincronização Dinâmica sem Atualizar APK)
  app.get("/api/v1/config", (req, res) => {
    res.json({
      success: true,
      appName: "J Smart Services",
      platformVersion: "1.0.0-android-ready",
      minAndroidBuildVersion: 100,
      forceUpdateNeeded: false,
      maintenanceMode: false,
      supportEmail: "jfigueiredo790@gmail.com",
      supportPhoneWhatsapp: "+244 956011985",
      supportPhoneExpress: "+244 956011985",
      defaultCommissionPercent: 10,
      proPlanMonthlyPriceKz: 5000,
      currency: "AOA (Kz)",
      provinces: [
        "Luanda", "Bengo", "Benguela", "Bié", "Cabinda", "Cuando Cubango", 
        "Cuanza Norte", "Cuanza Sul", "Cunene", "Huambo", "Huíla", 
        "Lunda Norte", "Lunda Sul", "Malanje", "Moxico", "Namibe", "Uíge", "Zaire"
      ],
      apiEndpoints: {
        health: "/api/v1/health",
        config: "/api/v1/config",
        docs: "/api/v1/docs"
      }
    });
  });

  // 3. API Documentation / Specification Endpoint for Android Developers
  app.get("/api/v1/docs", (req, res) => {
    res.json({
      openapi: "3.0.0",
      info: {
        title: "J Smart Services API - Web & Mobile Android Backend Spec",
        version: "1.0.0",
        description: "Especificação de API e Banco de Dados para sincronização unificada da aplicação Web e futura App Android do J Smart Services."
      },
      collections: {
        users: {
          description: "Perfis de utilizadores unificados (Clientes, Profissionais, Profissionais Clientes e Administradores)",
          fields: ["uid", "name", "email", "phone", "role", "province", "isVerified", "walletBalance", "proPlan"]
        },
        requests: {
          description: "Pedidos de serviços efetuados no sistema",
          fields: ["id", "clientId", "categoryId", "description", "status", "province", "priceKz", "createdAt"]
        },
        categories: {
          description: "Categorias e subcategorias de serviços geridas pelo Administrador",
          fields: ["id", "name", "description", "icon", "subcategories"]
        },
        wallet_transactions: {
          description: "Movimentos de carteira, pagamentos e comissões do sistema",
          fields: ["id", "userId", "type", "amountKz", "status", "proofUrl", "date"]
        },
        reviews: {
          description: "Avaliações e reputação de prestadores de serviços",
          fields: ["id", "proId", "clientId", "rating", "comment", "date"]
        }
      },
      androidFirebaseConfig: {
        projectId: "ai-studio-jsmartservices",
        firestoreDatabaseId: "ai-studio-jsmartservices-dd54ef3d-8456-4336-a85a-7d7350f4594e",
        authMethodsSupported: ["Email/Password", "Phone Auth", "Anonymous"]
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`J Smart Services Backend running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
