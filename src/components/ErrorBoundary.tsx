'use client';

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
    // 🛡️ Auto-heal: If render failure is caused by corrupted localStorage cache, clear project caches
    if (typeof window !== 'undefined') {
      try {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('tolowercase') || msg.includes('name') || msg.includes('progress') || msg.includes('null') || msg.includes('undefined')) {
          localStorage.removeItem('ks_cache_projects');
          localStorage.removeItem('ks_cache_deviations');
          localStorage.removeItem('ks_cache_change_orders');
        }
      } catch {}
    }
  }

  private handleResetCacheAndReload = () => {
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('ks_cache_') || key.startsWith('mester_ai_')) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      } catch {}
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-10 text-center border border-red-100 space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900">Beklager, noe gikk galt</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                En midlertidig feil har oppstått i visningen. Du kan trykke på <strong>Gjenopprett</strong> for å nullstille hurtigminnet og laste inn siden på nytt.
              </p>
            </div>

            {/* Expandable error technical details */}
            {this.state.error && (
              <details className="text-left bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
                <summary className="font-bold text-slate-600 cursor-pointer hover:text-slate-900 select-none">
                  Vis tekniske detaljer
                </summary>
                <pre className="mt-2 p-2 bg-white rounded-lg text-[10px] overflow-auto max-h-36 font-mono text-red-600 whitespace-pre-wrap">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex flex-col gap-3">
              <button 
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-md cursor-pointer active:scale-98"
              >
                <RefreshCw size={18} />
                <span>Gjenopprett & Last på nytt</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <RefreshCw size={16} />
                  <span>Prøv igjen</span>
                </button>
                <button 
                  type="button"
                  onClick={() => window.location.href = '/'}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <Home size={16} />
                  <span>Hjem</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
