import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

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
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      // Key enterprise bit: verify via rotating keys from JWKS
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: process.env.KEYCLOAK_JWKS_URI!,
      }),

      issuer: process.env.KEYCLOAK_ISSUER,
      // audience: process.env.KEYCLOAK_AUDIENCE, // Optional: Keycloak doesn't add aud by default
      algorithms: ['RS256'],
    });
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

