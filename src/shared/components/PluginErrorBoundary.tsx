import React, { Component, ErrorInfo, ReactNode } from 'react';
import { pluginService } from '@core/services/pluginService';
import { errorLoggingService } from '@core/services';
import { logger } from '@core/services/loggerService';

interface PluginErrorBoundaryProps {
  pluginId: string;
  pluginName: string;
  children: ReactNode;
}

interface PluginErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  crashCount: number;
  isDisabled: boolean;
}

/**
 * Error boundary specialized for plugin crash isolation.
 * Reports crashes to pluginService health tracking and auto-disables
 * plugins after repeated failures.
 *
 * @example
 * <PluginErrorBoundary pluginId="video-studio" pluginName="Video Studio">
 *   <VideoStudioComponent />
 * </PluginErrorBoundary>
 */
export class PluginErrorBoundary extends Component<
  PluginErrorBoundaryProps,
  PluginErrorBoundaryState
> {
  state: PluginErrorBoundaryState = {
    hasError: false,
    error: null,
    crashCount: 0,
    isDisabled: false,
  };

  static getDerivedStateFromError(error: Error): Partial<PluginErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { pluginId } = this.props;
    const crashCount = this.state.crashCount + 1;

    // Log to error service
    void errorLoggingService.logError(error, `PluginErrorBoundary:${pluginId}`);

    // Report crash to plugin service health tracker
    void pluginService.reportCrash(pluginId, error);

    // Check if plugin was auto-disabled (3+ crashes)
    const health = pluginService.getHealth(pluginId);
    const isDisabled = health?.status === 'crashed';

    this.setState({ crashCount, isDisabled });

    logger.error(`[PluginErrorBoundary] Plugin "${pluginId}" crash #${crashCount}`, {
      error: error.message,
      componentStack: info.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleDisable = () => {
    const { pluginId } = this.props;
    void pluginService.deactivate(pluginId).then(() => {
      this.setState({ isDisabled: true });
    });
  };

  private handleReset = () => {
    const { pluginId } = this.props;
    pluginService.resetHealth(pluginId);
    this.setState({ hasError: false, error: null, crashCount: 0, isDisabled: false });
  };

  render() {
    const { pluginName } = this.props;
    const { hasError, error, crashCount, isDisabled } = this.state;

    if (isDisabled) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-gray-600/30 bg-gray-800/20 text-center gap-3">
          <div className="text-2xl">🔌</div>
          <p className="text-sm font-medium text-gray-400">
            {pluginName} has been disabled due to repeated crashes.
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-1.5 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition-colors"
          >
            Re-enable Plugin
          </button>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-amber-500/30 bg-amber-500/5 text-center gap-3">
          <div className="text-xl">⚠️</div>
          <p className="text-sm font-medium text-amber-400">{pluginName} encountered an error.</p>
          {error && (
            <p className="text-xs text-gray-500 font-mono max-w-xs truncate">{error.message}</p>
          )}
          <p className="text-xs text-gray-500">
            Crash {crashCount}/3 — plugin will be auto-disabled after 3 crashes.
          </p>
          <div className="flex gap-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1 text-xs rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={this.handleDisable}
              className="px-3 py-1 text-xs rounded bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 transition-colors"
            >
              Disable Plugin
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
