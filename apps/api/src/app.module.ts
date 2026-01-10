import { Module } from "@nestjs/common";
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

/**
 * Root application module.
 * 
 * Security Stack (execution order):
 * 1. JwtAuthGuard - Validates JWT and populates req.user
 * 2. TenantInterceptor - Sets AsyncLocalStorage context for tenant enforcement
 * 3. RolesGuard - Validates user roles against @Roles() decorator
 */
@Module({
  imports: [
    AuthModule,
    TenantModule,
    PrismaModule,
    StorageModule,
    QueueModule,
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
export class AppModule {}

