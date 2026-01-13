/**
 * LLM Gateway Errors
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B4: Provider Routing + Fallback
 * 
 * Error types for AI provider calls:
 * - Transient: Retry with fallback
 * - Permanent: Don't retry, fail immediately
 */

/**
 * Transient LLM Error
 * 
 * Indicates a temporary failure that should trigger fallback.
 * 
 * Examples:
 * - Rate limit hit (429)
 * - Service temporarily unavailable (503)
 * - Timeout
 * - Network errors
 * 
 * Gateway behavior:
 * - Catch this error
 * - Retry with fallback provider
 * - Log both attempts in audit
 */
export class LlmTransientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LlmTransientError';
  }
}

/**
 * Permanent LLM Error
 * 
 * Indicates a non-recoverable failure. Don't retry.
 * 
 * Examples:
 * - Invalid API key (401)
 * - Model not found (404)
 * - Bad request (400)
 * - Schema validation failure (after retry)
 * 
 * Gateway behavior:
 * - Don't retry
 * - Fail immediately
 * - Log error in audit
 * - Return error to caller
 */
export class LlmPermanentError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LlmPermanentError';
  }
}
