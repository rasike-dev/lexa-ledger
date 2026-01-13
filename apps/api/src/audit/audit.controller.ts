import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/roles.decorator';
import { AuditQueryService } from './audit.query.service';

/**
 * Audit Export Controller
 * 
 * RBAC-protected read-only access to audit events.
 * 
 * Only accessible to:
 * - COMPLIANCE_AUDITOR (read-only audit access)
 * - TENANT_ADMIN (full tenant management)
 * 
 * Features:
 * - Tenant-safe by default (Prisma extension enforces tenantId)
 * - Filterable (date range, entityType, entityId, action)
 * - Paginated (cursor-based for large datasets)
 * - Compliance-ready export format
 */
@Roles('COMPLIANCE_AUDITOR', 'TENANT_ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditQuery: AuditQueryService) {}

  /**
   * List audit events with optional filters
   * 
   * Query Parameters:
   * @param from - ISO 8601 date string (e.g., "2026-01-01T00:00:00Z")
   * @param to - ISO 8601 date string
   * @param entityType - Filter by entity type (e.g., "Loan", "Document")
   * @param entityId - Filter by specific entity ID
   * @param action - Filter by action type (e.g., "LOAN_CREATED")
   * @param module - Filter by module (e.g., "TRADING", "DOCUMENTS")
   * @param actorType - Filter by actor type ("USER" or "SERVICE")
   * @param correlationId - Filter by correlation ID
   * @param q - Free-text search across metadata/action/entity fields
   * @param limit - Max items per page (default 50, max 200)
   * @param cursor - Pagination cursor (ID of last item from previous page)
   * 
   * Returns:
   * {
   *   items: AuditEvent[],
   *   nextCursor: string | null  // null if no more pages
   * }
   * 
   * Rate limit: Stricter limits for high-value compliance data
   */
  @Get('events')
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // 30 req/min for audit export
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('module') module?: string,
    @Query('actorType') actorType?: 'USER' | 'SERVICE',
    @Query('correlationId') correlationId?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.auditQuery.list({
      from,
      to,
      entityType,
      entityId,
      action,
      module,
      actorType,
      correlationId,
      q,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
      cursor: cursor ?? null,
    });
  }
}
