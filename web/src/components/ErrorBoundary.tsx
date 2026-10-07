import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full max-w-2xl mx-auto p-6">
          <Card className="border border-slate-300 bg-white shadow-sm">
            <CardHeader className="py-4 px-6 border-b border-slate-100 flex flex-row items-center gap-3 space-y-0">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  {this.props.fallbackTitle || "Unable to display this view"}
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  An error occurred while rendering this component.
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {this.state.error && (
                <div className="space-y-2">
                  <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono overflow-auto max-h-40">
                    {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <pre className="p-3 rounded-md bg-slate-900 text-slate-200 text-[11px] font-mono overflow-auto max-h-60 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={this.handleRetry}
                  className="text-xs gap-1.5 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
