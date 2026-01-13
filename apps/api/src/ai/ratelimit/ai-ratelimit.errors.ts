/**
 * AI Rate Limit Errors
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B10.2: AI Rate Limits
 * 
 * Thrown when AI call exceeds rate limit.
 * Includes retry-after hint for client.
 */

/**
 * AI Rate Limit Exceeded Error
 * 
 * Thrown when an AI call exceeds the rate limit for:
 * - Tenant + Actor + Module + Template
 * 
 * Client should:
 * - Show user-friendly message
 * - Wait `retryAfterSeconds` before retrying
 * - Surface in UI as 429 Too Many Requests
 * 
 * Audit trail will show:
 * - AI_RATE_LIMIT_DENIED event
 * - Which limit was exceeded
 * - When user can retry
 */
export class AiRateLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
    public readonly key: string,
  ) {
    super(message);
    this.name = 'AiRateLimitExceededError';
  }
}
