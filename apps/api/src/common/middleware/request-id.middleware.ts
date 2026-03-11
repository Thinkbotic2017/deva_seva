import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/** RFC 4122 UUID v4 pattern. Only this form is accepted from callers. */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * RequestIdMiddleware attaches a unique requestId to every incoming request.
 * The requestId propagates to response envelopes and audit logs for tracing.
 *
 * Security: the caller-supplied x-request-id header is validated as a UUID v4
 * before being trusted. Any non-conforming value (e.g. log-injection payloads,
 * oversized strings) is discarded and replaced with a server-generated UUID.
 * This prevents log-injection and HTTP response splitting via that header.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'] as string | undefined;
    const requestId =
      incoming && UUID_REGEX.test(incoming) ? incoming : randomUUID();

    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
