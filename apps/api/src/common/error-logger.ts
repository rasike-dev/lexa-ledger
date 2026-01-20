/**
 * Error Logger Utility
 * 
 * Provides structured error logging with context for easy identification
 * and debugging in production environments.
 */

export interface ErrorContext {
  component?: string;
  event?: string;
  correlationId?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  loanId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

export interface LoggedError {
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  context: ErrorContext;
}

/**
 * Format error for logging
 */
function formatError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

/**
 * Log error with structured context
 */
export function logError(
  error: unknown,
  context: ErrorContext = {},
  level: 'ERROR' | 'WARN' = 'ERROR'
): void {
  const errorInfo = formatError(error);
  const loggedError: LoggedError = {
    timestamp: new Date().toISOString(),
    level,
    message: errorInfo.message,
    error: errorInfo,
    context,
  };

  // Format for console output (human-readable)
  const contextStr = Object.entries(context)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');

  const logMessage = `[${loggedError.level}] ${loggedError.message}${contextStr ? ` | Context: ${contextStr}` : ''}`;
  
  if (level === 'ERROR') {
    console.error(logMessage);
    if (errorInfo.stack) {
      console.error('Stack trace:', errorInfo.stack);
    }
  } else {
    console.warn(logMessage);
  }

  // In production, you would also send to monitoring service:
  // - Sentry: Sentry.captureException(error, { extra: context })
  // - DataDog: tracer.setError(error, { context })
  // - CloudWatch: CloudWatchLogs.putLogEvents(...)
  // - etc.
  
  // For now, we log as JSON for easy parsing
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(loggedError));
  }
}

/**
 * Log API error with request context
 */
export function logApiError(
  error: unknown,
  context: ErrorContext = {}
): void {
  logError(error, {
    ...context,
    component: 'API',
  }, 'ERROR');
}

/**
 * Log warning with context
 */
export function logWarning(
  message: string,
  context: ErrorContext = {}
): void {
  const loggedError: LoggedError = {
    timestamp: new Date().toISOString(),
    level: 'WARN',
    message,
    error: {
      name: 'Warning',
      message,
    },
    context,
  };

  const contextStr = Object.entries(context)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');

  console.warn(`[WARN] ${message}${contextStr ? ` | Context: ${contextStr}` : ''}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(loggedError));
  }
}
