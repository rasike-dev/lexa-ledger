import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";

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
    'https://your-production-domain.com',
    'https://app.your-production-domain.com',
  ];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.setGlobalPrefix("api");

  // Week 2.5 - C3: Restrict CORS origins (no wildcard in production)
  // This prevents unauthorized domains from making API requests
  app.enableCors({
    origin: getAllowedOrigins(),
    credentials: false, // We use Bearer tokens, not cookies
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-request-id',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    maxAge: 86400, // 24 hours preflight cache
  });

  await app.listen(3000);
  console.log("🚀 API running on http://localhost:3000/api");
  console.log(`🔒 Security: Helmet enabled, CORS restricted to: ${JSON.stringify(getAllowedOrigins())}`);
}

bootstrap();

