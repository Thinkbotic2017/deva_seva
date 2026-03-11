import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@devaseva/types';

/**
 * TenantMiddleware performs a best-effort JWT decode and attaches the payload
 * to req.user when a valid Bearer token is present.
 *
 * It does NOT enforce authentication — that is the sole responsibility of
 * JwtAuthGuard (backed by Passport JwtStrategy, which is the single
 * authoritative RS256 verification path). Having one verification path
 * prevents silent disagreements if strategy options ever diverge.
 *
 * The middleware's job is only to make req.user available early so that
 * downstream middleware (e.g. AuditInterceptor) can read the actor without
 * duplicating Passport logic. On any decode failure, the request passes
 * through unmodified — JwtAuthGuard will reject it on protected routes.
 *
 * The templeId inside the payload is the ONLY source of truth for tenant
 * scoping — never read templeId from the request body or query params.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.slice(7);
    try {
      const publicKey = this.configService.getOrThrow<string>('JWT_PUBLIC_KEY');
      const payload = this.jwtService.verify<JwtPayload>(token, {
        algorithms: ['RS256'],
        publicKey: publicKey.replace(/\\n/g, '\n'),
      });
      (req as Request & { user: JwtPayload }).user = payload;
    } catch {
      // Best-effort only — do not throw. JwtAuthGuard will reject the request
      // on protected routes. Log at debug so token issues remain observable.
      this.logger.debug('TenantMiddleware: JWT decode failed — passing through');
    }

    next();
  }
}
