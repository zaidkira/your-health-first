import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogOut, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleFullReset = () => {
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } catch {}
    window.location.hash = "/login";
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = "/dashboard";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background relative overflow-hidden select-none">
          {/* iOS Liquid Glass Ambient Background Orbs */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-red-500/10 dark:bg-red-500/15 blur-[100px]" />
            <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-[100px]" />
          </div>

          <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/70 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl p-6 sm:p-8 shadow-[0_16px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.5)] text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-red-500 text-white flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(239,68,68,0.3)]">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Screen Display Issue
            </h2>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              We encountered a glitch displaying this view. Your account and health records remain safe.
            </p>

            {this.state.error && (
              <div className="mt-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-left overflow-hidden">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">
                  Technical Details
                </span>
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                onClick={this.handleReset}
                className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:from-sky-600 hover:to-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Display
              </Button>

              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="w-full rounded-xl border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5"
              >
                <Home className="h-4 w-4 mr-2 text-primary" />
                Return to Dashboard
              </Button>

              <Button
                variant="ghost"
                onClick={this.handleFullReset}
                className="w-full rounded-xl text-xs text-muted-foreground hover:text-red-600"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                Log Out & Clear Session Cache
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
