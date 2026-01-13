/**
 * Impact Detection Module
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C2: Downstream Impact Detection
 * 
 * Provides:
 * - ImpactService: Detect and propagate impacts
 * 
 * Import this in OpsModule for impact detection features.
 */

import { Module } from '@nestjs/common';
import { ImpactService } from './impact.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../audit/audit.module';
import { OpsJobsModule } from '../jobs/ops-jobs.module';

@Module({
  imports: [
    PrismaModule,    // For ImpactEvent persistence
    AuditModule,     // For IMPACT_DETECTED audit events
    OpsJobsModule,   // For enqueuing recompute jobs
  ],
  providers: [ImpactService],
  exports: [ImpactService],
})
export class ImpactModule {}
