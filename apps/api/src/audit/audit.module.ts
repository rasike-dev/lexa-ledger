import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryService } from './audit.query.service';
import { AuditController } from './audit.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Audit Module
 * 
 * Provides centralized audit logging and querying for enterprise-grade
 * compliance and forensic traceability.
 * 
 * Features:
 * - AuditService: Write audit events (exported for all modules)
 * - AuditQueryService: Read audit events (RBAC-protected)
 * - AuditController: REST API for audit export (COMPLIANCE_AUDITOR only)
 * 
 * Export this module from any module that needs to write audit events:
 * - LoansModule
 * - DocumentsModule
 * - TradingModule
 * - ServicingModule
 * - ESGModule
 * - OriginationModule
 * - etc.
 */
@Module({
  imports: [PrismaModule],
  providers: [AuditService, AuditQueryService],
  controllers: [AuditController],
  exports: [AuditService],
})
export class AuditModule {}
