import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { TenantModule } from "./tenant/tenant.module";
import { TenantInterceptor } from "./tenant/tenant.interceptor";
import { PrismaModule } from "./prisma/prisma.module";
import { StorageModule } from "./storage/storage.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { LoansModule } from "./loans/loans.module";
import { OriginationModule } from "./origination/origination.module";
import { DocumentsModule } from "./documents/documents.module";
import { ServicingModule } from "./servicing/servicing.module";
import { TradingModule } from "./trading/trading.module";
import { EsgModule } from "./esg/esg.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { AuditModule } from "./audit/audit.module";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware";

/**
 * Root application module.
 * 
 * Request Pipeline (execution order):
 * 1. CorrelationIdMiddleware - Assigns/propagates correlation ID for tracing
 * 2. JwtAuthGuard - Validates JWT and populates req.user
 * 3. TenantInterceptor - Sets AsyncLocalStorage context for tenant enforcement
 * 4. RolesGuard - Validates user roles against @Roles() decorator
 */
@Module({
  imports: [
    AuthModule,
    TenantModule,
    PrismaModule,
    StorageModule,
    QueueModule,
    AuditModule,
    HealthModule,
    LoansModule,
    OriginationModule,
    DocumentsModule,
    ServicingModule,
    TradingModule,
    EsgModule,
    PortfolioModule,
  ],
  providers: [
    // Guards run before interceptors, in order of registration
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Interceptor runs after guards, wraps handler execution in ALS context
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // Additional guards run after interceptor setup
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply correlation ID middleware to all routes (runs before guards)
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

