import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * TenantUser Decorator
 * 
 * Extracts tenant and user context from the authenticated request.
 * Used in controllers to get tenant/user info for audit trails and business logic.
 */
export const TenantUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return {
      userId: user.userId,
      tenantId: user.tenantId,
      roles: user.roles ?? [],
      correlationId: (request as any).correlationId,
    };
  },
);
