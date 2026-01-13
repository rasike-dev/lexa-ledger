/**
 * Covenant Explanation Schema
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Validates AI output for covenant breach explanations.
 * Includes optional disclaimer field for legal safety.
 */

import { z } from 'zod';
import { ExplainResultBaseSchema } from './explain.common';

/**
 * Schema for EXPLAIN_COVENANT output (v1)
 * 
 * Enforces:
 * - All base fields (summary, explanation, recommendations, confidence)
 * - Version must be exactly 1
 * - Optional disclaimer field for legal safety notes
 * 
 * The disclaimer field encourages safe wording without blocking output.
 * Example: "Not legal interpretation" or "Based on evaluated metrics only"
 */
export const ExplainCovenantOutputSchema = ExplainResultBaseSchema.extend({
  version: z.literal(1),
  
  /**
   * Optional safety disclaimer
   * 
   * Encourages AI to include legal safety notes like:
   * - "This is not legal advice"
   * - "Based on evaluated thresholds only"
   * - "Does not interpret legal obligations"
   */
  disclaimer: z
    .string()
    .optional()
    .describe('Optional safety note, e.g. "Not legal interpretation".'),
});

/**
 * TypeScript type for covenant explanation output
 */
export type ExplainCovenantOutput = z.infer<typeof ExplainCovenantOutputSchema>;
