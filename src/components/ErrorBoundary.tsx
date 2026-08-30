import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleSoftReset = () => {
    // Preserve authentication and crucial accounts while cleaning corrupted UI temporary state
    try {
      const userKey = 'j_smart_services_data_v6_user';
      const loggedKey = 'j_smart_services_data_v6_is_logged_in';
      const savedUser = localStorage.getItem(userKey);
      const savedLogged = localStorage.getItem(loggedKey);

      localStorage.removeItem('j_smart_services_data_v6_audit_logs');
      localStorage.removeItem('j_smart_services_data_v6_reports');
      localStorage.removeItem('j_smart_services_data_v6_recovery_sessions');

      if (savedUser) localStorage.setItem(userKey, savedUser);
      if (savedLogged) localStorage.setItem(loggedKey, savedLogged);
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if ((this as any).state?.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-rose-950 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <AlertCircle className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">J Smart Services Angola 🇦🇴</h2>
              <p className="text-sm font-bold text-slate-300 mt-1">
                Recuperação de Estabilidade do Sistema
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Os seus dados e conta permanecem guardados em segurança. Clique abaixo para recarregar e restabelecer a ligação.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar e Restabelecer Ligação</span>
              </button>

              <button
                onClick={this.handleSoftReset}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Atualizar Sessão e Voltar ao Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
