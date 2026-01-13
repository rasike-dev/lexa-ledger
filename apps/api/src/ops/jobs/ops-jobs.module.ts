/**
 * Operational Jobs Module
 * 
 * Week 3 - Track C: Operational Intelligence
 * Step C1: Scheduled Refresh Jobs
 * 
 * Provides:
 * - OpsJobsProducer: Schedule/enqueue refresh jobs
 * - BullMQ queue registration: 'ops'
 * 
 * Import this in app.module for operational job scheduling.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { OPS_QUEUE } from './ops-jobs.types';
import { OpsJobsProducer } from './ops-jobs.producer';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    AuditModule, // For audit.record()
    BullModule.registerQueue({ name: OPS_QUEUE }), // Register 'ops' queue
  ],
  providers: [OpsJobsProducer],
  exports: [OpsJobsProducer],
})
export class OpsJobsModule {}
