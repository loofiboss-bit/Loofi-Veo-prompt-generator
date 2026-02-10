import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorLoggingService } from '@core/services';
import { incrementCrashCounterFromComponentDidCatch } from '@core/services/crashCounterService';

interface Props {
    panelId: string;
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, _info: ErrorInfo) {
        void errorLoggingService.logError(error, `ErrorBoundary:${this.props.panelId}`);
        incrementCrashCounterFromComponentDidCatch();
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-red-500/30 bg-red-500/5 text-center gap-3">
                    <p className="text-sm font-medium text-red-400">
                        Something went wrong in this panel.
                    </p>
                    {this.state.error && (
                        <p className="text-xs text-gray-500 font-mono max-w-xs truncate">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={this.handleRetry}
                        className="px-3 py-1 text-xs rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
