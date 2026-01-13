/**
 * BullMQ Configuration
 * 
 * Centralized Redis connection config for BullMQ queues.
 * 
 * Week 3 - Track B: AI-Ready Architecture (Step B7)
 */

import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const BullMQRootModule = BullModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    connection: {
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get('REDIS_PORT', 6379),
      password: config.get('REDIS_PASSWORD'),
      db: config.get('REDIS_DB', 0),
    },
  }),
  inject: [ConfigService],
});
