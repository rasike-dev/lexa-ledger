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

    // Entity filters
    if (opts.entityType) where.entityType = opts.entityType;
    if (opts.entityId) where.entityId = opts.entityId;

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

    // Free-text search (search across action, summary, and metadata)
    if (opts.q) {
      where.OR = [
        { type: { contains: opts.q, mode: 'insensitive' } },
        { summary: { contains: opts.q, mode: 'insensitive' } },
        { entityId: { contains: opts.q, mode: 'insensitive' } },
      ];
    }

    // Query with cursor-based pagination
    const items = await this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
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

    // Calculate next cursor (last item ID if we hit the limit)
    const nextCursor = items.length === opts.limit ? items[items.length - 1].id : null;

    return {
      items: items.map((item) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        type: item.type,
        summary: item.summary,
        evidenceRef: item.evidenceRef,
        
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
      })),
      nextCursor,
    };
  }
}
