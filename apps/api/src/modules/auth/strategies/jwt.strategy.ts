import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@devaseva/types';

/**
 * JwtStrategy is the single authoritative RS256 JWT verification path.
 * Passport calls validate() after verifying the signature and expiry.
 * The returned value is attached to req.user by Passport.
 *
 * TenantMiddleware performs a best-effort decode for middleware-layer access
 * to req.user, but JwtAuthGuard + this strategy is what ENFORCES authentication.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: config.getOrThrow<string>('JWT_PUBLIC_KEY').replace(/\\n/g, '\n'),
    });
  }

  /**
   * Called by Passport after signature verification.
   * Returns the payload as-is — it becomes req.user.
   * templeId is already in the payload — no DB lookup needed per-request.
   */
  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
