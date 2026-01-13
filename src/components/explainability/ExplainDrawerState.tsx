/**
 * Explain Drawer State Component
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.2: Explain Drawer Polish
 * 
 * Provides consistent UX for all explain drawers:
 * - Loading skeletons
 * - Empty states
 * - Error handling (including AI rate limits)
 * - Retry-After messaging
 * - No raw error dumps
 * 
 * Usage:
 * ```tsx
 * <ExplainDrawerState
 *   title="Trading Readiness Explanation"
 *   isLoading={query.isLoading}
 *   error={query.error}
 *   isEmpty={!query.data}
 *   emptyTitle="No explanation yet"
 *   emptyBody="Generate facts first, then request an explanation."
 *   onRetry={() => query.refetch()}
 * >
 *   {children}
 * </ExplainDrawerState>
 * ```
 */

import React from 'react';
import { AlertCircle, RefreshCw, Clock } from 'lucide-react';

export type ExplainDrawerStateProps = {
  title: string;
  isLoading?: boolean;
  error?: any;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyBody?: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

/**
 * Explain Drawer State
 * 
 * Handles loading, empty, and error states for explain drawers.
 * Only renders children when data is successfully loaded.
 */
export function ExplainDrawerState({
  title,
  isLoading,
  error,
  isEmpty,
  emptyTitle = 'No explanation yet',
  emptyBody = 'Generate facts first, then request an explanation.',
  onRetry,
  children,
}: ExplainDrawerStateProps) {
  // Loading State
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-sm font-semibold text-slate-700 mb-4">{title}</div>
        <div className="space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    const msg = extractErrorMessage(error);
    const retryAfter = extractRetryAfter(error);
    const isRateLimit = error?.response?.status === 429 || 
                        error?.status === 429 ||
                        msg.toLowerCase().includes('rate limit');

    return (
      <div className="p-6">
        <div className="text-sm font-semibold text-slate-700 mb-4">{title}</div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-red-900 text-sm mb-1">
                {isRateLimit ? 'AI Rate Limit Reached' : 'Could not load explanation'}
              </div>
              <div className="text-sm text-red-800">{msg}</div>
              
              {retryAfter && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-700">
                  <Clock className="w-4 h-4" />
                  <span>
                    Try again in <span className="font-semibold">{retryAfter}s</span>
                  </span>
                </div>
              )}

              {onRetry && !retryAfter && (
                <button
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 underline transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              )}

              {onRetry && retryAfter && (
                <div className="mt-3 text-xs text-red-600">
                  You can retry after the wait period expires.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty State
  if (isEmpty) {
    return (
      <div className="p-6">
        <div className="text-sm font-semibold text-slate-700 mb-4">{title}</div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-3">
              <AlertCircle className="w-6 h-6 text-slate-600" />
            </div>
            <div className="font-medium text-slate-900 mb-1">{emptyTitle}</div>
            <div className="text-sm text-slate-600">{emptyBody}</div>
          </div>
        </div>
      </div>
    );
  }

  // Success State - Render Children
  return <>{children}</>;
}

/**
 * Extract user-friendly error message from error object
 * 
 * Handles various error shapes:
 * - Axios errors
 * - Fetch errors
 * - Custom API errors
 * - Rate limit errors
 * 
 * @param error Error object from query
 * @returns User-friendly error message (no stack traces or technical jargon)
 */
function extractErrorMessage(error: any): string {
  // Priority 1: Check for custom error message from backend
  if (error?.response?.data?.message) {
    return cleanErrorMessage(error.response.data.message);
  }

  // Priority 2: Check for standard message property
  if (error?.message) {
    return cleanErrorMessage(error.message);
  }

  // Priority 3: Check for error string in response data
  if (typeof error?.response?.data === 'string') {
    return cleanErrorMessage(error.response.data);
  }

  // Priority 4: Check for error property in response data
  if (error?.response?.data?.error) {
    return cleanErrorMessage(error.response.data.error);
  }

  // Priority 5: Status-based fallback messages
  const status = error?.response?.status || error?.status;
  if (status === 429) {
    return 'AI limit reached for this module. Please wait before trying again.';
  }
  if (status === 404) {
    return 'Explanation not found. Generate facts first.';
  }
  if (status === 403) {
    return 'You do not have permission to view this explanation.';
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status >= 500) {
    return 'Server error. Please try again later.';
  }

  // Fallback
  return 'Failed to load explanation. Please try again.';
}

/**
 * Extract Retry-After value from error response
 * 
 * Checks:
 * - Retry-After header (standard HTTP header)
 * - retryAfterSeconds in response body (custom backend field)
 * 
 * @param error Error object from query
 * @returns Number of seconds to retry after, or undefined
 */
function extractRetryAfter(error: any): number | undefined {
  // Check Retry-After header
  const retryAfterHeader = 
    error?.response?.headers?.['retry-after'] ||
    error?.response?.headers?.['Retry-After'];

  if (retryAfterHeader) {
    const parsed = parseInt(retryAfterHeader, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Check custom retryAfterSeconds field in response body
  const retryAfterBody = error?.response?.data?.retryAfterSeconds;
  if (typeof retryAfterBody === 'number' && retryAfterBody > 0) {
    return retryAfterBody;
  }

  return undefined;
}

/**
 * Clean error message for display
 * 
 * Removes technical jargon:
 * - Stack traces
 * - "AxiosError" prefix
 * - "Error:" prefix
 * - Network error codes
 * 
 * @param message Raw error message
 * @returns Clean, user-friendly message
 */
function cleanErrorMessage(message: string): string {
  if (!message) return 'An error occurred';

  let cleaned = message;

  // Remove common error prefixes
  cleaned = cleaned.replace(/^AxiosError:\s*/i, '');
  cleaned = cleaned.replace(/^Error:\s*/i, '');
  cleaned = cleaned.replace(/^TypeError:\s*/i, '');
  cleaned = cleaned.replace(/^NetworkError:\s*/i, '');

  // Remove "Network Error" (too technical)
  if (cleaned === 'Network Error') {
    return 'Connection failed. Please check your internet connection.';
  }

  // Truncate very long messages (likely stack traces)
  if (cleaned.length > 200) {
    cleaned = cleaned.substring(0, 200) + '...';
  }

  return cleaned;
}
