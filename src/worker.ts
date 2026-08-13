export interface Env {
  ASSETS: {
    fetch: typeof fetch;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ==========================================
    // UNIFIED REST API ENDPOINTS (WEB & ANDROID)
    // ==========================================

    // 1. Health check & Backend Status
    if (url.pathname === '/api/v1/health') {
      return new Response(
        JSON.stringify({
          status: "online",
          service: "J Smart Services Backend API (Cloudflare Worker)",
          version: "1.0.0",
          targetPlatforms: ["Web App", "Android Native App"],
          environment: "production",
          timestamp: new Date().toISOString(),
          database: "Firebase Firestore Unified Database",
          firestoreDatabaseId: "ai-studio-jsmartservices-dd54ef3d-8456-4336-a85a-7d7350f4594e"
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "access-control-allow-origin": "*"
          }
        }
      );
    }

    // 2. Remote Config / App Settings Endpoint
    if (url.pathname === '/api/v1/config') {
      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "access-control-allow-origin": "*"
          }
        }
      );
    }

    // 3. API Documentation Endpoint
    if (url.pathname === '/api/v1/docs') {
      return new Response(
        JSON.stringify({
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
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "access-control-allow-origin": "*"
          }
        }
      );
    }

    // Serve SPA static assets using Workers Assets binding
    return env.ASSETS.fetch(request);
  }
};
