import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiSuccessResponse } from '@devaseva/types';

/**
 * ResponseInterceptor wraps every successful controller return value in the
 * standard API envelope: { success: true, data: T, requestId: string }.
 *
 * Error responses are handled separately by HttpExceptionFilter.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { requestId?: string }>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        requestId: request.requestId ?? 'unknown',
      })),
    );
  }
}
