import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantALS } from './tenant-als';

/**
 * Tenant Interceptor - Sets AsyncLocalStorage context for tenant enforcement.
 * 
 * This interceptor runs after JwtAuthGuard and wraps the request handler
 * in AsyncLocalStorage.run() to propagate tenant context to all async operations,
 * including Prisma queries.
 * 
 * Execution order:
 * 1. JwtAuthGuard (populates req.user)
 * 2. TenantInterceptor (sets ALS context) ← THIS
 * 3. RolesGuard (checks permissions)
 * 4. Controller Handler (executes with ALS context)
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Public routes or unauthenticated requests proceed without tenant context
    if (!user?.tenantId) {
      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `Request to ${request.url} proceeding without tenant context (public route or unauthenticated)`
        );
      }
      return next.handle();
    }

    // Validate user object has required fields
    if (!user.userId) {
      this.logger.warn(
        `User object missing userId for tenant ${user.tenantId}. This may indicate an issue with JWT claims.`
      );
    }

    // Wrap handler execution in AsyncLocalStorage context
    // This ensures all async operations (including Prisma queries) have access to tenant context
    return new Observable((subscriber) => {
      tenantALS.run(
        {
          tenantId: user.tenantId,
          userId: user.userId || 'unknown',
          roles: user.roles ?? [],
        },
        () => {
          // Subscribe to handler and forward all events to the outer subscriber
          const subscription = next.handle().subscribe({
            next: (value) => subscriber.next(value),
            error: (err) => {
              // Log tenant context for debugging errors
              if (process.env.NODE_ENV !== 'production') {
                this.logger.error(
                  `Error in request for tenant ${user.tenantId}: ${err.message}`,
                  err.stack
                );
              }
              subscriber.error(err);
            },
            complete: () => subscriber.complete(),
          });

          // Cleanup: Unsubscribe from inner observable when outer unsubscribes
          return () => subscription.unsubscribe();
        }
      );
    });
  }
}
