/**
 * Audit Link Builder
 * 
 * Helper to generate deep links to the Audit Viewer with pre-populated filters.
 * 
 * Week 3 - Track A.1: Explainable Trading Readiness
 */

/**
 * Build a link to the Audit Viewer filtered for Trading Readiness events
 * 
 * @param params - Loan ID and optional fact hash
 * @returns URL path with query parameters for the Audit Viewer
 */
export function buildTradingReadinessAuditLink(params: {
  loanId: string;
  factHash?: string;
}) {
  const sp = new URLSearchParams();
  sp.set("module", "TRADING");
  sp.set("entityType", "LOAN");
  sp.set("entityId", params.loanId);

  // Optional: if Audit viewer supports a global search box param
  // This allows filtering by factHash in the free-text search
  if (params.factHash) {
    sp.set("q", `factHash:${params.factHash}`);
  }

  return `/audit?${sp.toString()}`;
}

/**
 * Build a generic audit link for any entity
 * 
 * @param params - Module, entity type, entity ID, and optional filters
 * @returns URL path with query parameters for the Audit Viewer
 */
export function buildAuditLink(params: {
  module?: string;
  entityType?: string;
  entityId?: string;
  actorType?: 'USER' | 'SERVICE';
  action?: string;
  correlationId?: string;
  q?: string;
}) {
  const sp = new URLSearchParams();
  
  if (params.module) sp.set("module", params.module);
  if (params.entityType) sp.set("entityType", params.entityType);
  if (params.entityId) sp.set("entityId", params.entityId);
  if (params.actorType) sp.set("actorType", params.actorType);
  if (params.action) sp.set("action", params.action);
  if (params.correlationId) sp.set("correlationId", params.correlationId);
  if (params.q) sp.set("q", params.q);

  return `/audit?${sp.toString()}`;
}
