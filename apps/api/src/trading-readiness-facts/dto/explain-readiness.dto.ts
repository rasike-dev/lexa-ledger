/**
 * Explain Readiness Request DTO
 * 
 * Zod schema for explain trading readiness endpoint.
 */

import { z } from 'zod';

export const ExplainVerbositySchema = z.enum(['SHORT', 'STANDARD', 'DETAILED']);

export const ExplainReadinessRequestSchema = z.object({
  verbosity: ExplainVerbositySchema.optional().default('STANDARD'),
});

export type ExplainReadinessRequest = z.infer<typeof ExplainReadinessRequestSchema>;
