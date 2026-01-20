import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { TradingReadinessFactsModule } from "./trading-readiness-facts/trading-readiness-facts.module";
import { ExplainabilityModule } from "./explainability/explainability.module";
import { EsgKpiFactsModule } from "./esg-kpi-facts/esg-kpi-facts.module";
import { CovenantFactsModule } from "./covenant-facts/covenant-facts.module";
import { PortfolioIntelligenceModule } from "./portfolio-intelligence/portfolio-intelligence.module";
import { EsgModule } from "./esg/esg.module";
import { PortfolioModule } from "./portfolio/portfolio.module";
import { AuditModule } from "./audit/audit.module";
import { MeModule } from "./me/me.module";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware";
import { GlobalExceptionFilter } from "./common/global-exception.filter";
import { UserOrIpThrottlerGuard } from "./security/throttler-user-or-ip.guard";
import { BullMQRootModule } from "./config/bullmq.config";
import { AiJobsModule } from "./ai/jobs/ai-jobs.module";
import { OpsModule } from "./ops/ops.module";
import { ObligationsModule } from "./obligations/obligations.module";

/**
 * Root application module.
 * 
 * Request Pipeline (execution order):
 * 1. CorrelationIdMiddleware - Assigns/propagates correlation ID for tracing
 * 2. UserOrIpThrottlerGuard - Rate limiting (user-based or IP-based)
 * 3. JwtAuthGuard - Validates JWT and populates req.user
 * 4. TenantInterceptor - Sets AsyncLocalStorage context for tenant enforcement
 * 5. RolesGuard - Validates user roles against @Roles() decorator
 */
@Module({
  imports: [
    // Rate limiting configuration
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000, // 60s window
        limit: 120,  // 120 req/min per identity (user or IP)
      },
    ]),
    // BullMQ for async job processing (Week 3 - Track B Step B7, Track C Step C1)
    BullMQRootModule,
    AiJobsModule,
    OpsModule, // Week 3 - Track C: Operational Intelligence
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
    TradingReadinessFactsModule,
    ExplainabilityModule,
    EsgKpiFactsModule,
    CovenantFactsModule,
    PortfolioIntelligenceModule,
    EsgModule,
    PortfolioModule,
    MeModule,
    ObligationsModule,
  ],
  providers: [
    // Global exception filter (catches all exceptions)
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    // Guards run before interceptors, in order of registration
    // 1. Rate limiting (runs first, before auth)
    {
      provide: APP_GUARD,
      useClass: UserOrIpThrottlerGuard,
    },
    // 2. Authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Interceptor runs after guards, wraps handler execution in ALS context
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
    // 3. Authorization (runs after tenant context is set)
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

