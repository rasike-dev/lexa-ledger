/**
 * Trading Readiness Facts Module
 * 
 * Provides deterministic fact snapshot computation and AI-powered explanations.
 * Separate from the main Trading module for clear separation of concerns.
 */

import { Module } from '@nestjs/common';
import { TradingReadinessFactsService } from './trading-readiness-facts.service';
import { TradingReadinessFactsController } from './trading-readiness-facts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { TenantModule } from '../tenant/tenant.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { AiJobsModule } from '../ai/jobs/ai-jobs.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    TenantModule,
    ExplainabilityModule,
    AiJobsModule, // B7: Async explanation jobs
  ],
  providers: [TradingReadinessFactsService],
  controllers: [TradingReadinessFactsController],
  exports: [TradingReadinessFactsService],
})
export class TradingReadinessFactsModule {}
