import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { logError } from '../common/error-logger';

type JwtPayload = {
  sub: string;
  iss: string;
  aud?: string | string[];
  tenant_id?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const jwksUri = process.env.KEYCLOAK_JWKS_URI;
    const issuer = process.env.KEYCLOAK_ISSUER;

    if (!jwksUri) {
      throw new Error('KEYCLOAK_JWKS_URI environment variable is required');
    }
    if (!issuer) {
      throw new Error('KEYCLOAK_ISSUER environment variable is required');
    }

    // Wrap the JWKS client to add error logging
    const baseJwksClient = jwksRsa.passportJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
      jwksUri,
      timeout: 10000, // 10 second timeout
    });

    // Wrap secretOrKeyProvider to log errors (uses callback pattern)
    const secretOrKeyProvider = (request: any, rawJwtToken: any, done: any) => {
      // Call the original JWKS client with a wrapped done callback
      baseJwksClient(request, rawJwtToken, (err: Error | null, secretOrKey?: string | Buffer) => {
        if (err) {
          // Log detailed error information
          logError(err, {
            component: 'JwtStrategy',
            event: 'jwks_secret_retrieval_failed',
            jwksUri,
            issuer,
            errorMessage: err?.message,
            errorCode: (err as any)?.code,
            errorStack: err?.stack,
          });

          // If it's a network error or JWKS fetch error, provide helpful message
          if ((err as any)?.code === 'ECONNREFUSED' || (err as any)?.code === 'ENOTFOUND') {
            this.logger.error(`Failed to connect to Keycloak JWKS endpoint: ${jwksUri}`);
            this.logger.error('Please verify Keycloak is running and accessible');
            this.logger.error(`Try: curl ${jwksUri} to test connectivity`);
          } else if (err?.message?.includes('No matching key')) {
            this.logger.error('JWT token key ID (kid) does not match any key in JWKS');
            this.logger.error('Token may be from a different Keycloak instance or expired');
          } else {
            this.logger.error(`JWKS error: ${err.message}`);
          }

          // Pass error to original callback
          done(err, secretOrKey);
        } else {
          // Success - pass through to original callback
          done(null, secretOrKey);
        }
      });
    };

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // Key enterprise bit: verify via rotating keys from JWKS
      secretOrKeyProvider,

      issuer,
      // audience: process.env.KEYCLOAK_AUDIENCE, // Optional: Keycloak doesn't add aud by default
      algorithms: ['RS256'],
    });

    this.logger.log(`JWT Strategy initialized with issuer: ${issuer}`);
    this.logger.log(`JWKS URI: ${jwksUri}`);
  }

  validate(payload: JwtPayload) {
    // Hard requirement for Week 2 tenancy
    if (!payload?.sub) throw new UnauthorizedException('Missing sub');
    if (!payload?.tenant_id) throw new UnauthorizedException('Missing tenant_id claim');

    const roles = payload?.realm_access?.roles ?? [];

    return {
      userId: payload.sub,
      tenantId: payload.tenant_id,
      roles,
      raw: payload,
    };
  }
}

