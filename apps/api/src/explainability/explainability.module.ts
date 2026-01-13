/**
 * Explainability Module
 * 
 * Provides AI-powered explanation services with provider abstraction.
 */

import { Module } from '@nestjs/common';
import { ExplainabilityService, LLM_PROVIDER } from './explainability.service';
import { DemoLlmProvider } from './providers/demo-llm.provider';
import { AuditModule } from '../audit/audit.module';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuditModule, TenantModule, PrismaModule, AiModule],
  providers: [
    ExplainabilityService,
    {
      provide: LLM_PROVIDER,
      useClass: DemoLlmProvider, // V1: Demo provider (swap for OpenAIProvider in v2)
    },
  ],
  exports: [ExplainabilityService],
})
export class ExplainabilityModule {}
