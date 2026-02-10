import React from 'react';
import { log } from '@core/services/loggerService';

interface PanelErrorBoundaryProps {
  panelName: string;
  children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
}

class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): PanelErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    log.error('Panel crashed', this.props.panelName, {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[210] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-red-500/30 bg-slate-900/95 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-lg font-semibold">{this.props.panelName} failed to render</h3>
            <p className="mt-2 text-sm text-slate-300">
              The rest of the workspace is still running. You can retry this panel now.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-5 inline-flex items-center rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
            >
              Retry panel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PanelErrorBoundary;
