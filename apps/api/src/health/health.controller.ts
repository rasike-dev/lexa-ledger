import { Controller, Get } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/public.decorator";

/**
 * Health check controller
 * 
 * Public endpoints with modest throttling to prevent health check abuse
 */
@Controller("health")
export class HealthController {
  @Public()
  @Get("live")
  @Throttle({ default: { ttl: 60_000, limit: 30 } }) // 30 req/min for health checks
  live() {
    return { status: "ok" };
  }
}

