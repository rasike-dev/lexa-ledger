import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Correlation ID Middleware
 * 
 * Ensures every HTTP request has a unique correlation ID for end-to-end tracing.
 * 
 * Enterprise benefits:
 * - Request tracing across services
 * - Log aggregation and correlation
 * - Audit trail linkage
 * - Forensic investigation
 * 
 * Flow:
 * 1. Check if client sent x-correlation-id header
 * 2. If yes, use it (preserves trace from upstream)
 * 3. If no, generate new UUID
 * 4. Attach to req.correlationId for downstream use
 * 5. Return header to client for response correlation
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const headerName = 'x-correlation-id';
    
    // Check both cases (express normalizes headers to lowercase)
    const incoming =
      (req.headers[headerName] as string | undefined) ||
      (req.headers[headerName.toLowerCase()] as string | undefined);

    // Use incoming ID if valid, otherwise generate new one
    const correlationId = incoming && incoming.trim().length > 0 ? incoming : randomUUID();

    // Attach to request for later use (audit/logging)
    (req as any).correlationId = correlationId;

    // Return back to caller (helps front-end/log stitching)
    res.setHeader(headerName, correlationId);

    next();
  }
}
