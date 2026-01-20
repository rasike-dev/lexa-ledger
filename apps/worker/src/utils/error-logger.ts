/**
 * Error Logger Utility
 * 
 * Provides structured error logging with context for easy identification
 * and debugging in production environments.
 */

export interface ErrorContext {
  workerName?: string;
  queueName?: string;
  jobId?: string;
  jobName?: string;
  tenantId?: string;
  loanId?: string;
  evidenceId?: string;
  kpiId?: string;
  covenantId?: string;
  documentVersionId?: string;
  correlationId?: string;
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
 * Log worker error with job context
 */
export function logWorkerError(
  error: unknown,
  workerName: string,
  context: ErrorContext = {}
): void {
  logError(error, {
    ...context,
    workerName,
  }, 'ERROR');
}

/**
 * Log job failure with full context
 */
export function logJobFailure(
  error: unknown,
  workerName: string,
  jobId: string | undefined,
  jobName: string | undefined,
  jobData: unknown,
  context: ErrorContext = {}
): void {
  // Safely stringify jobData, handling circular references and errors
  let jobDataStr: string;
  try {
    if (jobData === null || jobData === undefined) {
      jobDataStr = String(jobData);
    } else if (typeof jobData === 'object') {
      // Use a replacer function to handle circular references
      const seen = new WeakSet();
      jobDataStr = JSON.stringify(jobData, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    } else {
      jobDataStr = String(jobData);
    }
  } catch (stringifyError) {
    jobDataStr = `[Error stringifying jobData: ${stringifyError instanceof Error ? stringifyError.message : String(stringifyError)}]`;
  }

  logError(error, {
    ...context,
    workerName,
    jobId,
    jobName,
    jobData: jobDataStr,
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
