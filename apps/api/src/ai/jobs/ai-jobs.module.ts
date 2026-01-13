/**
 * AI Jobs Module
 * 
 * Registers BullMQ queue for AI explanation recomputation jobs.
 * 
 * Week 3 - Track B: AI-Ready Architecture (Step B7)
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AI_EXPLAIN_QUEUE } from './ai-jobs.types';
import { AiJobsProducer } from './ai-jobs.producer';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    AuditModule,
    BullModule.registerQueue({
      name: AI_EXPLAIN_QUEUE,
    }),
  ],
  providers: [AiJobsProducer],
  exports: [AiJobsProducer],
})
export class AiJobsModule {}
