import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  compact?: boolean;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch() {
    // Intentionally suppressed from browser console to keep production console clean
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4 text-center space-y-2 my-2">
            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
              {this.props.fallbackTitle || 'Unable to display this section cleanly.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        );
      }

      return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 rounded-2xl p-8 max-w-lg mx-auto my-8 text-center space-y-3 shadow-sm">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="font-serif-heading text-base font-bold text-stone-900 dark:text-stone-100">
            {this.props.fallbackTitle || 'Display Interrupted'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
            A display glitch occurred while rendering this archive section. Your data and session remain safe.
          </p>
          <div className="pt-1 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 dark:bg-amber-400 dark:text-stone-950 text-white rounded-xl transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore View</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
