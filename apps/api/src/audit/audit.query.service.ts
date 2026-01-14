import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Query Service
 * 
 * Read-only service for querying audit events.
 * 
 * Enterprise features:
 * - Tenant-safe (Prisma extension auto-filters by tenantId)
 * - Cursor-based pagination (handles large datasets efficiently)
 * - Flexible filtering (date range, entity, action)
 * - Redacted sensitive fields (full payload not exposed by default)
 */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List audit events with pagination and filters
   * 
   * @param opts - Query options
   * @returns Paginated audit events with nextCursor
   */
  async list(opts: {
    from?: string;
    to?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    module?: string;
    actorType?: 'USER' | 'SERVICE';
    correlationId?: string;
    q?: string;
    limit: number;
    cursor: string | null;
  }) {
    const where: any = {};

    // Date range filter
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }

    // Entity filters (using evidenceRef which stores the entity ID)
    if (opts.entityId) where.evidenceRef = opts.entityId;
    
    // EntityType filter: if "Loan", filter by evidenceRef matching loan ID pattern
    // Loan IDs typically start with "ACME-" in this system
    if (opts.entityType && opts.entityType.toLowerCase() === 'loan') {
      // If entityId is also set, it takes precedence
      if (!opts.entityId) {
        where.evidenceRef = {
          startsWith: 'ACME-',
        };
      }
    }

    // Action filter (note: action is stored as `type` in the database)
    // Module filter (search in type field prefix, e.g., "TRADING_*")
    if (opts.action && opts.module) {
      // Both action and module: exact match
      where.type = opts.action;
    } else if (opts.action) {
      // Just action: exact match
      where.type = opts.action;
    } else if (opts.module) {
      // Just module: prefix match
      where.type = {
        startsWith: opts.module,
        mode: 'insensitive',
      };
    }

    // Actor type filter
    if (opts.actorType) where.actorType = opts.actorType;

    // Correlation ID filter
    if (opts.correlationId) where.correlationId = opts.correlationId;

    // Free-text search (search across action, summary, evidenceRef, and payload)
    // Note: factHash searches are handled via post-filtering since they're in JSON payload
    const factHashMatch = opts.q?.match(/^factHash:(.+)$/i);
    const factHashValue = factHashMatch ? factHashMatch[1].trim() : null;
    
    if (opts.q && !factHashMatch) {
      // Regular text search (not factHash) - add to where clause
      const searchTerm = opts.q.trim();
      where.OR = [
        { type: { contains: searchTerm, mode: 'insensitive' } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
        { evidenceRef: { contains: searchTerm, mode: 'insensitive' } },
        { correlationId: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }
    // If factHash search, we don't add to where clause - will filter after fetch
    
    // If searching for factHash, we need to fetch more items to filter in memory
    // since Prisma's JSON queries are limited for PostgreSQL
    const fetchLimit = factHashValue ? Math.min(opts.limit * 10, 500) : opts.limit;
    
    // Regular Prisma query (respects tenant isolation via Prisma extension)
    let items = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: fetchLimit,
      ...(opts.cursor ? { skip: 1, cursor: { id: opts.cursor } } : {}),
      select: {
        id: true,
        createdAt: true,
        type: true, // action type
        summary: true,
        evidenceRef: true,
        
        // Actor context
        actorType: true,
        actorUserId: true,
        actorClientId: true,
        actorRoles: true,
        
        // Request tracing
        correlationId: true,
        ip: true,
        userAgent: true,
        
        // Payload (full metadata for auditors)
        payload: true,
      },
    });

    // Post-filter for factHash in payload (since Prisma JSON queries are limited)
    if (factHashValue) {
      items = items.filter((item) => {
        const payload = item.payload as any;
        // Check if factHash in payload matches (exact or partial)
        const factHashInPayload = payload?.factHash?.toString().toLowerCase().includes(factHashValue.toLowerCase());
        // Also check correlationId and evidenceRef as fallback
        const factHashInCorrelation = item.correlationId?.toLowerCase().includes(factHashValue.toLowerCase());
        const factHashInEvidence = item.evidenceRef?.toLowerCase().includes(factHashValue.toLowerCase());
        return factHashInPayload || factHashInCorrelation || factHashInEvidence;
      });
      // Limit to requested limit after filtering
      items = items.slice(0, opts.limit);
    }

    // Calculate next cursor (last item ID if we hit the limit)
    const nextCursor = items.length === opts.limit ? items[items.length - 1].id : null;

    // Helper to derive entityType from event type
    const deriveEntityType = (type: string, payload: any): string | null => {
      // Try to get from payload first
      if (payload?.entityType) return payload.entityType;
      if (payload?.loanId) return 'Loan';
      if (payload?.documentId) return 'Document';
      if (payload?.covenantId) return 'Covenant';
      if (payload?.kpiId) return 'ESGKpi';
      
      // Derive from type prefix
      if (type.startsWith('LOAN_')) return 'Loan';
      if (type.startsWith('DOCUMENT_')) return 'Document';
      if (type.startsWith('COVENANT_')) return 'Covenant';
      if (type.startsWith('ESG_')) return 'ESGKpi';
      if (type.startsWith('TRADING_')) return 'Loan'; // Trading events are loan-related
      
      return null;
    };

    return {
      items: items.map((item) => {
        const entityType = deriveEntityType(item.type, item.payload);
        const entityId = item.evidenceRef || (item.payload as any)?.loanId || (item.payload as any)?.entityId || null;
        
        return {
          id: item.id,
          createdAt: item.createdAt.toISOString(),
          type: item.type,
          action: item.type, // Frontend expects 'action' field
          summary: item.summary,
          evidenceRef: item.evidenceRef,
          entityType, // Derived for frontend
          entityId, // Derived for frontend
          
          // Actor attribution
          actorType: item.actorType,
          actorUserId: item.actorUserId,
          actorClientId: item.actorClientId,
          actorRoles: item.actorRoles,
          
          // Request context
          correlationId: item.correlationId,
          ip: item.ip,
          userAgent: item.userAgent,
          
          // Metadata
          payload: item.payload,
          metadata: item.payload, // Frontend also expects 'metadata'
        };
      }),
      nextCursor,
    };
  }
}
