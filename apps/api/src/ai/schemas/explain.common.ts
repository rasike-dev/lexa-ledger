/**
 * Common Explain Schemas
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Shared base schema for all explainability outputs.
 * Ensures consistency across all AI-generated explanations.
 */

import { z } from 'zod';

/**
 * Confidence level enum
 * 
 * Represents the AI's confidence in the explanation quality:
 * - HIGH: All required information present, clear explanation
 * - MEDIUM: Some information missing or ambiguity present
 * - LOW: Limited information, significant gaps in facts
 */
export const ExplainConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

/**
 * Base schema for all explainability outputs
 * 
 * This is the foundation that all specific explain schemas extend.
 * Enforces the minimum required structure for any AI explanation.
 */
export const ExplainResultBaseSchema = z.object({
  /**
   * One-sentence summary of the explanation
   * Must be non-empty
   */
  summary: z.string().min(1),

  /**
   * Array of explanation points
   * At least one explanation point required
   */
  explanation: z.array(z.string().min(1)).min(1),

  /**
   * Array of actionable recommendations
   * Optional (defaults to empty array)
   */
  recommendations: z.array(z.string().min(1)).default([]),

  /**
   * AI confidence level
   */
  confidence: ExplainConfidenceSchema,

  /**
   * Schema version for this output
   * Must be positive integer
   */
  version: z.number().int().positive(),
});

/**
 * TypeScript type for base explain result
 */
export type ExplainResultBase = z.infer<typeof ExplainResultBaseSchema>;
