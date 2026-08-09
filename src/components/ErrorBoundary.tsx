import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-12 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Beklager, noe gikk galt</h1>
            <p className="text-neutral-500 mb-8 text-sm">
              En uventet feil har oppstått. Vi har logget hendelsen og jobber med å fikse det.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mb-8 p-4 bg-neutral-100 rounded-xl text-[10px] text-left overflow-auto max-h-40 font-mono text-red-600">
                {this.state.error?.message}
                {this.state.error?.stack}
              </pre>
            )}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-500 transition-all"
              >
                <RefreshCw size={18} />
                Prøv igjen
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center justify-center gap-2 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
              >
                <Home size={18} />
                Hjem
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
