/**
 * Operational Intelligence API Client
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C3: Operational Dashboard Panel
 */

import { httpClient } from '@/shared/api/httpClient';

/**
 * Operational Summary Response
 * 
 * Provides system health metrics at a glance:
 * - Last refresh: When did the system last run automated refresh?
 * - Drift (24h): How many facts changed in the last 24 hours?
 * - Stale: How many explanations are outdated right now?
 * - AI (24h): How many AI calls + estimated cost in last 24 hours?
 */
export type OpsSummary = {
  lastRefresh: {
    completedAt: string;
    jobId: string;
  } | null;
  drift24h: number;
  staleNow: number;
  ai24h: {
    calls: number;
    costUsd: number;
  };
  links: {
    auditOps: string;
    auditDrift: string;
    auditAi: string;
    auditStale: string;
  };
};

/**
 * Get operational summary
 * 
 * @returns System health metrics + deep links to audit viewer
 * 
 * RBAC: TENANT_ADMIN, COMPLIANCE_AUDITOR
 * 
 * Example response:
 * ```json
 * {
 *   "lastRefresh": {
 *     "completedAt": "2026-01-13T02:15:30.123Z",
 *     "jobId": "12345"
 *   },
 *   "drift24h": 12,
 *   "staleNow": 3,
 *   "ai24h": {
 *     "calls": 45,
 *     "costUsd": 0.23
 *   },
 *   "links": {
 *     "auditOps": "/audit?module=OPS&action=OPS_JOB_COMPLETED",
 *     "auditDrift": "/audit?action=FACT_DRIFT_DETECTED",
 *     "auditAi": "/audit?module=AI&action=AI_CALL_COMPLETED",
 *     "auditStale": "/audit?module=TRADING&action=EXPLAIN_GENERATED"
 *   }
 * }
 * ```
 */
export async function getOpsSummary(): Promise<OpsSummary> {
  return await httpClient.get<OpsSummary>('/ops/summary');
}
