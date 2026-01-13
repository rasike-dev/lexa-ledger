/**
 * Operational Jobs Types
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Queue: ops
 * Jobs: NIGHTLY_REFRESH_TENANT, HOURLY_REFRESH_TENANT
 * 
 * Purpose: Background refresh of facts + explanations for all tenants
 */

export const OPS_QUEUE = 'ops' as const;

export type OpsJobName =
  | 'NIGHTLY_REFRESH_TENANT'
  | 'HOURLY_REFRESH_TENANT';

/**
 * Nightly Refresh Tenant Payload
 * 
 * Triggers complete tenant refresh:
 * - Portfolio facts
 * - Trading readiness facts (demo loans)
 * - ESG KPI facts (demo KPIs)
 * - Covenant facts (demo covenants)
 * 
 * Drift detection (Track B) automatically triggers explanation recompute.
 */
export type NightlyRefreshTenantPayload = {
  tenantId: string;
  correlationId?: string;
  reason: 'SCHEDULED_NIGHTLY' | 'MANUAL';
};

/**
 * Hourly Refresh Tenant Payload
 * 
 * Future: Lighter-weight refresh for high-priority entities
 */
export type HourlyRefreshTenantPayload = {
  tenantId: string;
  correlationId?: string;
  reason: 'SCHEDULED_HOURLY' | 'MANUAL';
};

export type OpsJobPayload =
  | { name: 'NIGHTLY_REFRESH_TENANT'; data: NightlyRefreshTenantPayload }
  | { name: 'HOURLY_REFRESH_TENANT'; data: HourlyRefreshTenantPayload };
