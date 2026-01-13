/**
 * Redis Module
 * 
 * Provides shared Redis connection for:
 * - BullMQ (job queues)
 * - AI rate limiting (B10.2)
 * - Future: caching, sessions, etc.
 * 
 * Uses same REDIS_URL as BullMQ for consistency.
 */

import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * Redis Module
 * 
 * Provides a singleton Redis connection.
 * 
 * Usage in other services:
 * ```typescript
 * constructor(@Inject('REDIS') private readonly redis: Redis) {}
 * ```
 * 
 * Benefits:
 * - Single connection pool (efficient)
 * - Consistent configuration
 * - Easy to mock in tests
 * - Global module (no need to import everywhere)
 */
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS',
      useFactory: () => {
        const redisUrl = must('REDIS_URL');
        return new Redis(redisUrl, {
          maxRetriesPerRequest: null, // Required for BullMQ compatibility
          enableReadyCheck: true,
          retryStrategy: (times) => {
            // Exponential backoff: 50ms, 100ms, 200ms, ..., max 2s
            return Math.min(times * 50, 2000);
          },
        });
      },
    },
  ],
  exports: ['REDIS'],
})
export class RedisModule {}
