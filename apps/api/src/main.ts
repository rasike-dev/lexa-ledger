import "reflect-metadata";
// Load environment variables from .env file automatically
// This works in both development and production
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from the api-dist directory (production)
// Falls back to current directory (development)
dotenv.config({
  path: path.resolve(__dirname, '../../.env'), // Production: ~/lexa-ledger/api-dist/.env
});

import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { PrismaService } from "./prisma/prisma.service";
import { logError, logWarning } from "./common/error-logger";
import Redis from "ioredis";

/**
 * Get allowed CORS origins based on environment
 * 
 * Development: Allow localhost ports
 * Production: Restrict to specific domains
 */
function getAllowedOrigins(): string[] | boolean {
  const env = process.env.NODE_ENV || 'development';
  
  if (env === 'development') {
    // Development: Allow common localhost ports
    return [
      'http://localhost:5173', // Vite dev server
      'http://localhost:5174', // Vite alternate
      'http://localhost:3000', // Potential other dev server
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000',
      'tauri://localhost', // Tauri desktop app
      'https://tauri.localhost', // Tauri desktop app
    ];
  }
  
  // Production: Use environment variable or specific domains
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (allowedOrigins) {
    return allowedOrigins.split(',').map(origin => origin.trim());
  }
  
  // Fallback: Restrict to your production domains
  return [
    'https://app.lexaledger.com',
  ];
}

// Global error handlers (must be registered before bootstrap)
process.on('unhandledRejection', (reason, promise) => {
  logError(reason, {
    component: 'Process',
    event: 'unhandledRejection',
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logError(error, {
    component: 'Process',
    event: 'uncaughtException',
  });
  // Note: After logging, the process will exit, but PM2 will restart it
  // Give brief time for error to be logged, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Request timeout: 30 seconds
    // This prevents slow requests from consuming resources indefinitely
    bodyParser: true,
  });

  // Get HTTP adapter and set request timeout
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().set('timeout', 30000); // 30 seconds

  // Week 2.5 - C3: Security headers via Helmet
  // Provides baseline security headers (CSP, HSTS, X-Frame-Options, etc.)
  app.use(helmet({
    // Content Security Policy - can be tuned for your needs
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    // Cross-Origin-Embedder-Policy - disabled for dev convenience
    crossOriginEmbedderPolicy: false,
  }));

  // Enable trust proxy for correct IP handling behind reverse proxies
  // This ensures req.ip and x-forwarded-for headers work correctly
  // Set to 1 (trust first proxy) or true (trust all proxies)
  httpAdapter.getInstance().set('trust proxy', 1);

  app.setGlobalPrefix("api");

  // Week 2.5 - C3: Restrict CORS origins (no wildcard in production)
  // This prevents unauthorized domains from making API requests
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: true, // Allow credentials to match frontend (credentials: 'include')
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-request-id',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400, // 24 hours preflight cache
  });

  // Enable shutdown hooks for graceful shutdown
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  await app.listen(3000);
  console.log("🚀 API running on http://localhost:3000/api");
  console.log(`🔒 Security: Helmet enabled, CORS restricted to: ${JSON.stringify(getAllowedOrigins())}`);

  // Graceful shutdown handler
  let isShuttingDown = false;
  let shutdownTimeout: NodeJS.Timeout | null = null;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      console.log('Shutdown already in progress, forcing exit...');
      process.exit(1);
    }

    isShuttingDown = true;
    console.log(`Received ${signal}, shutting down gracefully...`);

    // Set a maximum shutdown timeout (30 seconds)
    shutdownTimeout = setTimeout(() => {
      console.error('Shutdown timeout exceeded, forcing exit...');
      process.exit(1);
    }, 30000);

    try {
      // Close NestJS application (closes HTTP server, waits for in-flight requests)
      console.log('Closing NestJS application...');
      await Promise.race([
        app.close(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('App close timeout')), 10000)
        ),
      ]);
      console.log('NestJS application closed');

      // Close Prisma client with timeout
      console.log('Closing Prisma client...');
      try {
        await Promise.race([
          prismaService.onModuleDestroy(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Prisma disconnect timeout')), 5000)
          ),
        ]);
        console.log('Prisma client closed');
      } catch (error) {
        logError(error, {
          component: 'Shutdown',
          event: 'prisma_disconnect_error',
        });
        // Continue with shutdown
      }

      // Close Redis connection if available
      try {
        const redis = app.get<Redis>('REDIS', { strict: false });
        if (redis && typeof redis.quit === 'function') {
          console.log('Closing Redis connection...');
          await Promise.race([
            redis.quit(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Redis quit timeout')), 5000)
            ),
          ]);
          console.log('Redis connection closed');
        }
      } catch (error) {
        // Redis might not be available or already closed, ignore error
        logWarning('Redis connection close error (may not be available)', {
          component: 'Shutdown',
          event: 'redis_close_error',
        });
      }

      // Clear shutdown timeout
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      logError(error, {
        component: 'Shutdown',
        event: 'shutdown_error',
      });
      
      // Clear timeout before exit
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
      }
      
      process.exit(1);
    }
  };

  // Register shutdown handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.log('✅ API started with error handling and graceful shutdown');
}

bootstrap();

