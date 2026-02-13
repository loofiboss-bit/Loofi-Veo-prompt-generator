/**
 * Error Types
 * Shared TypeScript interfaces for structured error handling across the application.
 * v1.5.0 - Sprint 1: Centralized Error Handling
 */

import type { ReactNode } from 'react';

/**
 * Extended Error with application-specific metadata.
 * Use `recoverable` to determine whether the UI can continue rendering
 * after this error or must show a hard failure state.
 */
export interface AppError extends Error {
  /** Machine-readable error code, e.g. "RENDER_FAILED", "IDB_WRITE_ERROR" */
  code: string;
  /** Optional human-readable context describing where the error occurred */
  context?: string;
  /** Whether the application can recover from this error without a full reload */
  recoverable: boolean;
}

/**
 * Error state for a single panel/region of the UI.
 * Stored per-panel so that one failing panel does not cascade to siblings.
 */
export interface PanelErrorState {
  hasError: boolean;
  error: AppError | null;
  /** Identifies which panel owns this error state */
  panelId: string;
}

/**
 * Props for a React Error Boundary component wrapping a panel.
 */
export interface ErrorBoundaryProps {
  /** Must match the panelId used in PanelErrorState */
  panelId: string;
  /** Custom fallback UI shown when the boundary catches an error */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Internal React class component state for ErrorBoundary.
 */
export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}
