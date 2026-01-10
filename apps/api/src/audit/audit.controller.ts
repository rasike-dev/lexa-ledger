import { Controller, Get, Query } from '@nestjs/common';
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
   * @param limit - Max items per page (default 50, max 200)
   * @param cursor - Pagination cursor (ID of last item from previous page)
   * 
   * Returns:
   * {
   *   items: AuditEvent[],
   *   nextCursor: string | null  // null if no more pages
   * }
   */
  @Get('events')
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.auditQuery.list({
      from,
      to,
      entityType,
      entityId,
      action,
      limit: limit ? Math.min(parseInt(limit, 10), 200) : 50,
      cursor: cursor ?? null,
    });
  }
}
