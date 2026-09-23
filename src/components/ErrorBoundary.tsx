import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Uncaught Application Error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#FFFDF8] border border-[#EADFCE] rounded-2xl p-6 sm:p-8 shadow-md text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F4DF9E]/50 border border-[#E8CE82] flex items-center justify-center text-[#8B6508]">
              <AlertTriangle className="w-7 h-7 text-[#E2A72E]" />
            </div>

            <div>
              <h1 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#40281D] tracking-tight">
                Application Recovered Safely
              </h1>
              <p className="text-xs sm:text-sm text-[#78675E] mt-1.5 leading-relaxed">
                The application encountered an unexpected display issue, but your session is protected.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-left text-xs text-[#78675E] font-mono break-words max-h-32 overflow-y-auto">
                <span className="font-bold text-[#40281D]">Notice: </span>
                {this.state.error.message}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#40281D] text-[#FFFDF8] text-xs font-bold hover:bg-[#523325] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#E2A72E]" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleResetCache}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#EADFCE] text-[#5C463B] text-xs font-bold hover:bg-[#FBF7ED] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#8B6508]" />
                <span>Clear Cache & Restart</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
