/**
 * ESG KPI Explanation Schema
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Validates AI output for ESG KPI explanations.
 */

import { z } from 'zod';
import { ExplainResultBaseSchema } from './explain.common';

/**
 * Schema for EXPLAIN_ESG_KPI output (v1)
 * 
 * Enforces:
 * - All base fields (summary, explanation, recommendations, confidence)
 * - Version must be exactly 1
 */
export const ExplainEsgKpiOutputSchema = ExplainResultBaseSchema.extend({
  version: z.literal(1),
});

/**
 * TypeScript type for ESG KPI explanation output
 */
export type ExplainEsgKpiOutput = z.infer<typeof ExplainEsgKpiOutputSchema>;
