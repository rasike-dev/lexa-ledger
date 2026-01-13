import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { AiJobsModule } from '../ai/jobs/ai-jobs.module';
import { EsgKpiFactsService } from './esg-kpi-facts.service';
import { EsgKpiFactsController } from './esg-kpi-facts.controller';

@Module({
  imports: [PrismaModule, AuditModule, ExplainabilityModule, AiJobsModule],
  providers: [EsgKpiFactsService],
  controllers: [EsgKpiFactsController],
  exports: [EsgKpiFactsService],
})
export class EsgKpiFactsModule {}
