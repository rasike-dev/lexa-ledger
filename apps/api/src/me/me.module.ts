import { Module } from '@nestjs/common';
import { MeController } from './me.controller';

/**
 * MeModule — Identity Debug Endpoint (Week 2.5 - Step E1)
 * 
 * Provides /api/me endpoint for server-validated identity visibility
 */
@Module({
  controllers: [MeController],
})
export class MeModule {}
