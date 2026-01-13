/**
 * AI Audit Action Constants
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B5: Audit-Safe AI Calls
 * 
 * Constants for AI module audit events.
 * Used to track all AI calls for compliance and cost tracking.
 */

/**
 * AI Module Identifier
 * 
 * Used in audit events to identify AI-related actions.
 */
export const AI_AUDIT_MODULE = 'AI';

/**
 * AI Audit Actions
 * 
 * Lifecycle events for AI calls:
 * - REQUESTED: AI call initiated (before provider call)
 * - COMPLETED: AI call succeeded (after validation)
 * - FAILED: AI call failed (permanent or after fallback exhausted)
 * 
 * These enable:
 * - Cost tracking (tokens + model → cost)
 * - Performance monitoring (duration, success rate)
 * - Compliance auditing (prompt checksums, fact hashes)
 * - Provider performance (primary vs fallback usage)
 */
export const AI_AUDIT_ACTIONS = {
  REQUESTED: 'AI_CALL_REQUESTED',
  COMPLETED: 'AI_CALL_COMPLETED',
  FAILED: 'AI_CALL_FAILED',
} as const;
