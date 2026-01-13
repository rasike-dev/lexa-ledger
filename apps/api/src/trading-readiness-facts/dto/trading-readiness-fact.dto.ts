/**
 * Trading Readiness Fact DTOs
 * 
 * Zod schemas for type-safe validation and inference.
 */

import { z } from 'zod';

/**
 * Readiness band enum (traffic light system)
 */
export const ReadinessBandSchema = z.enum(['GREEN', 'AMBER', 'RED']);
export type ReadinessBand = z.infer<typeof ReadinessBandSchema>;

/**
 * Trading Readiness Fact Snapshot
 * 
 * Immutable, deterministic snapshot of trading readiness assessment.
 */
export const TradingReadinessFactSnapshotSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string(),
  loanId: z.string(),
  readinessScore: z.number().int().min(0).max(100),
  readinessBand: ReadinessBandSchema,
  contributingFactors: z.record(z.string(), z.any()),
  blockingIssues: z.array(z.string()),
  computedAt: z.string().datetime().optional(),
  computedBy: z.string(),
  factVersion: z.number().int().min(1),
  factHash: z.string(),
  correlationId: z.string().optional().nullable(),
});

export type TradingReadinessFactSnapshot = z.infer<
  typeof TradingReadinessFactSnapshotSchema
>;

/**
 * Request to recompute readiness fact snapshot
 */
export const RecomputeFactRequestSchema = z.object({
  loanId: z.string(),
  correlationId: z.string().optional(),
});

export type RecomputeFactRequest = z.infer<typeof RecomputeFactRequestSchema>;

/**
 * List facts request (pagination)
 */
export const ListFactsRequestSchema = z.object({
  loanId: z.string(),
  take: z.number().int().min(1).max(100).optional().default(10),
  cursor: z.string().optional(),
});

export type ListFactsRequest = z.infer<typeof ListFactsRequestSchema>;
