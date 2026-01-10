import { Module } from '@nestjs/common';
import { TenantContext } from './tenant-context';

/**
 * TenantModule provides tenant context services.
 * 
 * Exports:
 * - TenantContext: Injectable service for accessing current tenant information
 */
@Module({
  providers: [TenantContext],
  exports: [TenantContext],
})
export class TenantModule {}
