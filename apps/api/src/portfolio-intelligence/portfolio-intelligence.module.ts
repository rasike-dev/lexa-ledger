import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { AiJobsModule } from '../ai/jobs/ai-jobs.module';
import { PortfolioIntelligenceService } from './portfolio-intelligence.service';
import { PortfolioIntelligenceController } from './portfolio-intelligence.controller';

@Module({
  imports: [PrismaModule, AuditModule, ExplainabilityModule, AiJobsModule],
  providers: [PortfolioIntelligenceService],
  controllers: [PortfolioIntelligenceController],
  exports: [PortfolioIntelligenceService],
})
export class PortfolioIntelligenceModule {}
