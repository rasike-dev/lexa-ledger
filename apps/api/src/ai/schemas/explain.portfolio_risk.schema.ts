/**
 * Portfolio Risk Explanation Schema
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Validates AI output for portfolio risk explanations.
 */

import { z } from 'zod';
import { ExplainResultBaseSchema } from './explain.common';

/**
 * Schema for EXPLAIN_PORTFOLIO_RISK output (v1)
 * 
 * Enforces:
 * - All base fields (summary, explanation, recommendations, confidence)
 * - Version must be exactly 1
 */
export const ExplainPortfolioRiskOutputSchema = ExplainResultBaseSchema.extend({
  version: z.literal(1),
});

/**
 * TypeScript type for portfolio risk explanation output
 */
export type ExplainPortfolioRiskOutput = z.infer<
  typeof ExplainPortfolioRiskOutputSchema
>;
