import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

/**
 * /api/me — Identity Debug Endpoint (Week 2.5 - Step E1)
 * 
 * Purpose:
 * - Support visibility: shows server-validated identity
 * - Demo-friendly: judges can verify JWT claims match client state
 * - Debugging: includes correlationId, IP, userAgent
 * 
 * Security:
 * - Protected by global JwtAuthGuard (auth required)
 * - Safe for any authenticated user (non-sensitive data)
 * - Returns server-side view of identity (from JWT + request context)
 */
@Controller('me')
export class MeController {
  @Get()
  me(@Req() req: Request) {
    // User populated by JwtAuthGuard
    const u: any = (req as any).user ?? {};

    return {
      // Identity (from JWT claims)
      userId: u.userId ?? u.sub ?? null,
      tenantId: u.tenantId ?? null,
      roles: u.roles ?? [],
      
      // JWT metadata
      issuer: u.iss ?? null,
      subject: u.sub ?? null,
      
      // Request context (for support/debugging)
      correlationId: (req.headers['x-correlation-id'] as string) ?? null,
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        (req as any).ip ??
        null,
      userAgent: (req.headers['user-agent'] as string) ?? null,
    };
  }
}
