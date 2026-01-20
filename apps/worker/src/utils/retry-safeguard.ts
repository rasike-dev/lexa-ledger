/**
 * Retry Safeguard Utility
 * 
 * Prevents infinite retry loops by checking attempt limits
 * and providing consistent error handling for retry scenarios.
 */

import type { Job } from 'bullmq';
import { logError, logJobFailure } from './error-logger';

export interface RetryCheckResult {
  canRetry: boolean;
  attemptsMade: number;
  maxAttempts: number;
  isPermanentlyFailed: boolean;
}

/**
 * Check if job can be retried and log appropriately
 */
export function checkRetryLimit<T = unknown>(
  job: Job<T>,
  workerName: string,
  context: Record<string, unknown> = {}
): RetryCheckResult {
  // Note: BullMQ won't call processor if max attempts exceeded, but we check for safety
  const maxAttempts = job.opts?.attempts ?? 3;
  const attemptsMade = job.attemptsMade ?? 0;
  const canRetry = attemptsMade < maxAttempts;
  const isPermanentlyFailed = attemptsMade >= maxAttempts;

  if (isPermanentlyFailed) {
    const error = new Error(
      `Job exceeded maximum attempts (${maxAttempts}). Job will be marked as failed permanently.`
    );
    
    // Single log entry with all context
    logJobFailure(
      error,
      workerName,
      job.id,
      job.name,
      job.data,
      {
        ...context,
        attemptsMade,
        maxAttempts,
        status: 'PERMANENTLY_FAILED',
      }
    );
  }

  return {
    canRetry,
    attemptsMade,
    maxAttempts,
    isPermanentlyFailed,
  };
}

/**
 * Log job failure with retry information
 */
export function logJobFailureWithRetryInfo<T = unknown>(
  error: unknown,
  job: Job<T>,
  workerName: string,
  context: Record<string, unknown> = {}
): void {
  const maxAttempts = job.opts?.attempts ?? 3;
  const attemptsMade = job.attemptsMade ?? 0;
  const willRetry = (attemptsMade + 1) < maxAttempts;

  // Single log entry with retry context
  logJobFailure(
    error,
    workerName,
    job.id,
    job.name,
    job.data,
    {
      ...context,
      attemptsMade,
      maxAttempts,
      willRetry,
      status: attemptsMade >= maxAttempts ? 'PERMANENTLY_FAILED' : 'WILL_RETRY',
    }
  );
}
