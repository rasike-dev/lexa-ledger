import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { IS_PUBLIC_KEY } from '../common/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public endpoints bypass RBAC
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no @Roles decorator, allow authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    const userRoles: string[] = user?.roles ?? [];

    const allowed = requiredRoles.some(role =>
      userRoles.includes(role),
    );

    if (!allowed) {
      throw new ForbiddenException({
        code: 'RBAC_FORBIDDEN',
        requiredRoles,
        userRoles,
      });
    }

    return true;
  }
}
