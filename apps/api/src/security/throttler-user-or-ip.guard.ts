import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Enterprise throttling guard
 * 
 * Throttles by userId (if authenticated) or IP (if anonymous)
 * 
 * This prevents:
 * - NAT/shared IP problems (many users behind same IP)
 * - Account-specific brute force attempts
 * 
 * Rules:
 * - Authenticated: limit per userId
 * - Anonymous: limit per IP
 */
@Injectable()
export class UserOrIpThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    // If authenticated, rate limit per user (prevents NAT/IP sharing problems)
    const userId = req.user?.userId || req.user?.sub;
    if (userId) {
      return `user:${userId}`;
    }

    // Otherwise fallback to IP
    const ip =
      req.ip ||
      req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      'unknown';

    return `ip:${ip}`;
  }
}
