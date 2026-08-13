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

  private handleReset = () => {
    localStorage.clear();
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
              <h2 className="text-xl font-black text-white">J Smart Services</h2>
              <p className="text-sm font-bold text-slate-300 mt-1">
                Ocorreu um imprevisto temporário
              </p>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                A aplicação encontrou um problema inesperado. Por favor, tente recarregar a página para continuar a navegar.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Página</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 text-xs"
              >
                <Home className="w-4 h-4" />
                <span>Limpar Dados Locais e Voltar ao Início</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
