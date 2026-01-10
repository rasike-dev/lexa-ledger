import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenant: TenantContext) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const u = (req as any).user;

    // If route is Public(), user might be undefined.
    if (u?.tenantId) {
      this.tenant.tenantId = u.tenantId;
      this.tenant.userId = u.userId;
      this.tenant.roles = u.roles ?? [];
    }

    next();
  }
}

