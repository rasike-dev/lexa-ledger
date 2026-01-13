/**
 * AI Output Validator
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Provides schema validation for AI outputs with clean error handling.
 * Used by LlmGateway to validate all AI responses before persisting.
 */

import { z } from 'zod';

/**
 * Custom error for AI schema validation failures
 * 
 * This error is thrown when AI output doesn't match the expected schema.
 * The error includes detailed validation issues for debugging and retry logic.
 * 
 * Usage in gateway:
 * - Catch this error
 * - Log to audit trail
 * - Retry once with "fix-to-schema" prompt
 * - If still fails, return safe error to user
 */
export class AiSchemaValidationError extends Error {
  constructor(
    message: string,
    public readonly details: unknown,
  ) {
    super(message);
    this.name = 'AiSchemaValidationError';
  }
}

/**
 * Validate AI JSON output against a Zod schema
 * 
 * @param schema - Zod schema to validate against
 * @param payload - Raw AI output (typically parsed JSON)
 * @param context - Optional context for better error messages
 * @returns Validated and typed data
 * @throws AiSchemaValidationError if validation fails
 * 
 * @example
 * ```typescript
 * const validated = validateAiJson(
 *   ExplainTradingReadinessOutputSchema,
 *   aiRawOutput,
 *   { templateId: 'EXPLAIN_TRADING_READINESS', templateVersion: 1 }
 * );
 * // validated is now typed as ExplainTradingReadinessOutput
 * ```
 */
export function validateAiJson<T>(
  schema: z.ZodSchema<T>,
  payload: unknown,
  context?: { templateId?: string; templateVersion?: number },
): T {
  const parsed = schema.safeParse(payload);
  
  if (!parsed.success) {
    const contextStr = context?.templateId 
      ? ` for ${context.templateId}@v${context.templateVersion ?? '?'}` 
      : '';
    
    throw new AiSchemaValidationError(
      `AI output failed schema validation${contextStr}`,
      parsed.error.flatten(),
    );
  }
  
  return parsed.data;
}
