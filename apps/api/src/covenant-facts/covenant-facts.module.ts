import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ExplainabilityModule } from '../explainability/explainability.module';
import { AiJobsModule } from '../ai/jobs/ai-jobs.module';
import { CovenantFactsService } from './covenant-facts.service';
import { CovenantFactsController } from './covenant-facts.controller';

@Module({
  imports: [PrismaModule, AuditModule, ExplainabilityModule, AiJobsModule],
  providers: [CovenantFactsService],
  controllers: [CovenantFactsController],
  exports: [CovenantFactsService],
})
export class CovenantFactsModule {}
