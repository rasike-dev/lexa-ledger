/**
 * Operations Module
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Provides:
 * - OpsController: Manual trigger endpoints
 * - OpsJobsModule: Job scheduling
 * 
 * Import this in app.module for operational features.
 */

import { Module } from '@nestjs/common';
import { OpsController } from './ops.controller';
import { OpsJobsModule } from './jobs/ops-jobs.module';
import { ImpactModule } from './impact/impact.module';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,  // For ops summary queries (C3)
    OpsJobsModule, // Job scheduling
    ImpactModule,  // Impact detection (C2)
    TenantModule,  // Tenant context
  ],
  controllers: [OpsController],
  exports: [OpsJobsModule, ImpactModule],
})
export class OpsModule {}
