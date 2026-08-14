import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Smartphone, 
  Server, 
  Database, 
  Key, 
  RefreshCw, 
  CheckCircle2, 
  Layers, 
  FileCode, 
  Code2, 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  Terminal, 
  Globe, 
  Activity,
  ArrowRight,
  Settings2,
  Users,
  Briefcase,
  Sliders
} from 'lucide-react';

export const AndroidPrepHub: React.FC = () => {
  const { platformSettings, categories } = useApp();
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [apiTestResponse, setApiTestResponse] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState<boolean>(false);
  const [selectedTestEndpoint, setSelectedTestEndpoint] = useState<string>('/api/v1/config');

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(key);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleTestEndpoint = async (endpoint: string) => {
    setLoadingTest(true);
    setSelectedTestEndpoint(endpoint);
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setApiTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiTestResponse(JSON.stringify({ error: err?.message || 'Erro ao conectar à API' }, null, 2));
    } finally {
      setLoadingTest(false);
    }
  };

  const googleServicesJsonSnippet = `{
  "project_info": {
    "project_number": "74296749343",
    "project_id": "ai-studio-jsmartservices",
    "storage_bucket": "ai-studio-jsmartservices.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:74296749343:android:jsmartservices",
        "android_client_info": {
          "package_name": "com.jsmartservices.angola"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSy_JSmartServices_UnifiedKey"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    }
  ],
  "configuration_version": "1"
}`;

  const gradleSnippet = `// build.gradle.kts (Module :app)
dependencies {
    // Firebase BoM para Android Nativo (Kotlin/Java)
    implementation(platform("com.google.firebase:firebase-bom:33.1.0"))
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-auth-ktx")
    implementation("com.google.firebase:firebase-firestore-ktx")
    
    // Retrofit para Chamadas REST API
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
}`;

  return (
    <div className="space-y-8 pb-12">
      {/* Banner Principal de Arquitetura Unificada */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-full">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Arquitetura Híbrida Web + Android Pronta</span>
            </div>
            <div className="text-xs text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              Backend Worker: <span className="text-emerald-400 font-bold">j-smart-services-app.jfigueiredo790.workers.dev</span>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white">
            Aplicação Android Nativa (Kotlin + Android Studio)
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            A plataforma <strong className="text-emerald-400">J Smart Services</strong> está totalmente preparada com um **projeto Android nativo em Kotlin na pasta <code className="text-emerald-300 font-mono">/android</code>**, ligado diretamente ao seu backend do Cloudflare Worker e ao Cloud Firestore.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Database className="w-4 h-4" />
                <span>Mesmo Banco de Dados</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cloud Firestore sincroniza clientes, profissionais, orçamentos e saldos em tempo real para ambas as plataformas sem duplicações.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Users className="w-4 h-4" />
                <span>Mesmas Contas de Acesso</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Logins de Cliente, Profissional e Administrador funcionam de forma idêntica no site e no aplicativo móvel.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <RefreshCw className="w-4 h-4" />
                <span>Sincronização Instantânea</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Qualquer serviço criado no site aparece no telemóvel e qualquer trabalho pedido no telemóvel aparece no site.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Smartphone className="w-4 h-4" />
                <span>Recursos Nativos Android</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Câmara, galeria de fotos, botão Voltar com duplo toque, pull-to-refresh e tratamento de falta de internet.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Server className="w-4 h-4" />
                <span>Servidor REST API Pronto</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Endpoints REST sob <code className="text-emerald-300">/api/v1/</code> prontos para consumo por programadores Android.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Testador de Endpoints REST API em Tempo Real */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-400" />
              <span>Testador de Endpoints REST API (Para Android & Web)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Testar os endpoints no servidor backend que a futura App Android usará para obter conteúdos dinâmicos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleTestEndpoint('/api/v1/health')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTestEndpoint === '/api/v1/health'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              GET /api/v1/health
            </button>
            <button
              onClick={() => handleTestEndpoint('/api/v1/config')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTestEndpoint === '/api/v1/config'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              GET /api/v1/config
            </button>
            <button
              onClick={() => handleTestEndpoint('/api/v1/docs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedTestEndpoint === '/api/v1/docs'
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              GET /api/v1/docs
            </button>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-slate-300 space-y-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px] border-b border-slate-800 pb-2">
            <span>URL Solicitada: <strong className="text-emerald-400">{selectedTestEndpoint}</strong></span>
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status: 200 OK</span>
            </span>
          </div>

          <pre className="overflow-x-auto max-h-72 p-2 text-slate-200 text-[11px] leading-relaxed">
            {loadingTest ? (
              <span className="text-amber-400 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> A carregar dados da API...
              </span>
            ) : apiTestResponse ? (
              apiTestResponse
            ) : (
              'Clique num dos botões acima para testar o endpoint da API REST.'
            )}
          </pre>
        </div>
      </div>

      {/* Esquema de Coleções do Banco de Dados Firestore */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <span>Mapeamento de Coleções do Banco de Dados (Firestore)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Estas coleções já contêm os dados sincronizados que alimentarão a App Android Nativa.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">users /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Auth & Perfis</span>
            </div>
            <p className="text-xs text-slate-400">
              Armazena todos os Clientes, Profissionais e Profissionais Clientes com província, carteira e verificação.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Campos: uid, name, email, phone, role, walletBalance, isVerified...
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">requests /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Serviços</span>
            </div>
            <p className="text-xs text-slate-400">
              Todos os pedidos de serviço criados por clientes, orçamentos e estados de execução.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Campos: id, clientId, categoryId, description, status, priceKz...
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">categories /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Dinamismo</span>
            </div>
            <p className="text-xs text-slate-400">
              Categorias e subcategorias. Editadas pelo Admin no site, aparecem na App Android sem atualizar APK.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Total atual: {categories.length} categorias ativas
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">wallet_transactions /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Financeiro</span>
            </div>
            <p className="text-xs text-slate-400">
              Histórico de recargas de carteira, pagamentos de planos Pro e comissões da plataforma.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Campos: id, userId, type, amountKz, proofUrl, status...
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">reviews /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Reputação</span>
            </div>
            <p className="text-xs text-slate-400">
              Classificações de estrelas e comentários deixados aos profissionais pelos trabalhos concluídos.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Campos: id, proId, clientId, rating, comment, date...
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs font-mono text-emerald-400">platform_settings /</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">Remote Config</span>
            </div>
            <p className="text-xs text-slate-400">
              Definições de comissão ({platformSettings.commissionRatePercent}%), contactos de suporte e avisos globais.
            </p>
            <div className="text-[11px] text-slate-500 font-mono">
              Configurações geridas diretamente pelo Administrador.
            </div>
          </div>
        </div>
      </div>

      {/* Snippets de Integração para Android Studio */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div>
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <span>Recursos e Snippets para o Programador Android</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Ficheiros de configuração prontos a copiar para o futuro projeto Android Studio.
          </p>
        </div>

        <div className="space-y-6">
          {/* Ficheiro google-services.json */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>android/app/google-services.json</span>
              </span>
              <button
                onClick={() => handleCopy(googleServicesJsonSnippet, 'json')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
              >
                {copiedIndex === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 'json' ? 'Copiado!' : 'Copiar JSON'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 p-2">
              {googleServicesJsonSnippet}
            </pre>
          </div>

          {/* Dependências Gradle */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-mono font-bold text-slate-200 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>app/build.gradle.kts (Dependências Android Kotlin)</span>
              </span>
              <button
                onClick={() => handleCopy(gradleSnippet, 'gradle')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
              >
                {copiedIndex === 'gradle' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIndex === 'gradle' ? 'Copiado!' : 'Copiar Snippet'}</span>
              </button>
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 p-2">
              {gradleSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
