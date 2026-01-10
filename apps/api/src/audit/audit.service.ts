import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

/**
 * Actor type discriminators for audit events
 */
type ActorUser = {
  type: 'USER';
  userId: string;
  roles: string[];
};

type ActorService = {
  type: 'SERVICE';
  clientId: string;
};

type Actor = ActorUser | ActorService;

/**
 * Central Audit Service (Enterprise-Grade)
 * 
 * Single entry point for ALL audit writes across the application.
 * 
 * Guarantees:
 * - No audit event is missing tenantId
 * - No audit event is missing actor context
 * - All USER events capture role snapshot
 * - All requests capture correlationId for tracing
 * - Web requests capture ip/userAgent for forensics
 * 
 * Usage:
 * 
 * // In API Controllers (USER actions):
 * const context = this.auditService.actorFromRequest(req);
 * await this.auditService.record({
 *   ...context,
 *   type: 'LOAN_CREATED',
 *   summary: 'Created loan for borrower XYZ',
 *   evidenceRef: loanId,
 *   payload: { loanId, borrower: 'XYZ' },
 * });
 * 
 * // In Workers (SERVICE actions):
 * await this.auditService.record({
 *   tenantId: job.data.tenantId,
 *   actor: { type: 'SERVICE', clientId: 'lexa-ledger-worker' },
 *   correlationId: job.data.correlationId,
 *   type: 'ESG_VERIFICATION_COMPLETED',
 *   summary: 'ESG evidence verified',
 *   evidenceRef: evidenceId,
 *   payload: { status, confidence },
 * });
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an audit event with full context
   * 
   * @param opts - Audit event options
   * @returns Created audit event
   */
  async record(opts: {
    tenantId: string;
    type: string;
    summary: string;
    evidenceRef?: string | null;
    payload?: Record<string, any> | null;
    actor: Actor;
    correlationId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    const actorType = opts.actor.type;
    const actorUserId = actorType === 'USER' ? opts.actor.userId : null;
    const actorClientId = actorType === 'SERVICE' ? opts.actor.clientId : null;
    const actorRoles = actorType === 'USER' ? opts.actor.roles : [];

    return this.prisma.auditEvent.create({
      data: {
        tenantId: opts.tenantId,
        type: opts.type,
        summary: opts.summary,
        evidenceRef: opts.evidenceRef ?? null,
        payload: opts.payload ?? null,
        
        // Actor context (compliance-grade)
        actorType,
        actorUserId,
        actorClientId,
        actorRoles,
        
        // Request tracing (forensics)
        correlationId: opts.correlationId ?? null,
        ip: opts.ip ?? null,
        userAgent: opts.userAgent ?? null,
      },
    });
  }

  /**
   * Convenience helper for API request handlers
   * 
   * Extracts all audit context from the request object:
   * - tenantId from req.user (populated by JwtAuthGuard)
   * - userId and roles from req.user
   * - correlationId from req.correlationId (populated by CorrelationIdMiddleware)
   * - ip from x-forwarded-for or socket
   * - userAgent from headers
   * 
   * @param req - Express Request object
   * @returns Audit context ready for record()
   * @throws Error if req.user is missing (auth guard should prevent this)
   */
  actorFromRequest(req: Request): {
    tenantId: string;
    actor: Actor;
    correlationId?: string;
    ip?: string;
    userAgent?: string;
  } {
    const u = (req as any).user;
    if (!u?.tenantId || !u?.userId) {
      throw new Error('Missing req.user tenant/user for audit. Ensure JwtAuthGuard is applied.');
    }

    return {
      tenantId: u.tenantId,
      actor: { 
        type: 'USER', 
        userId: u.userId, 
        roles: u.roles ?? [] 
      },
      correlationId: (req as any).correlationId,
      ip: (req.headers['x-forwarded-for'] as string | undefined) ?? (req.socket?.remoteAddress ?? null),
      userAgent: (req.headers['user-agent'] as string | undefined) ?? null,
    };
  }
}
