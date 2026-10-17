import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('KhetOS ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-card border border-rose-500/30 rounded-2xl p-6 sm:p-8 max-w-lg w-full text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-bold text-foreground">
              Component Render Warning
            </h3>
            
            <p className="text-xs text-muted-fg leading-relaxed">
              {this.state.error?.message || 'An unexpected state discrepancy occurred in this portal view.'}
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl flex items-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Portal
              </button>
              <a
                href="/"
                className="px-4 py-2 bg-secondary hover:bg-card border border-border text-foreground font-bold text-xs rounded-xl flex items-center gap-2 transition"
              >
                <Home className="w-3.5 h-3.5" />
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
