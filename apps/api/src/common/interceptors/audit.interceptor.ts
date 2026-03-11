import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { JwtPayload } from '@devaseva/types';

/**
 * AuditInterceptor logs mutating requests (POST, PATCH, DELETE, PUT) after
 * they succeed. It records the actor, entity, action, and requestId.
 *
 * Detailed before/after values are written by individual services via
 * the AuditLog entity — this interceptor only covers the access layer.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string; user?: JwtPayload }>();

    // Use req.path (not req.url) to exclude query strings, which could
    // carry phone numbers or other PII on poorly formed requests.
    const { method, path: url, user, requestId } = request;

    const isMutation = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);

    return next.handle().pipe(
      tap(() => {
        if (isMutation) {
          this.logger.log(
            `${method} ${url} | actor=${user?.sub ?? 'anonymous'} | temple=${user?.templeId ?? '-'} | reqId=${requestId ?? '-'}`,
          );
        }
      }),
    );
  }
}
