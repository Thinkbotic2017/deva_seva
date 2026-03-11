import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@devaseva/types';

/**
 * HttpExceptionFilter catches all HttpExceptions and formats them into the
 * standard API error envelope: { success: false, error: { code, message }, requestId }.
 *
 * Unexpected (non-HTTP) errors return 500 with a generic message to avoid
 * leaking internal details to the client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        message =
          typeof res['message'] === 'string'
            ? res['message']
            : Array.isArray(res['message'])
              ? (res['message'] as string[]).join('; ')
              : message;
      }
      code = this.statusToCode(status);
    } else {
      // Non-HTTP error — log full error server-side but never expose internals
      this.logger.error('Unhandled exception', exception);
    }

    const body: ApiErrorResponse = {
      success: false,
      error: { code, message },
      requestId: request.requestId ?? 'unknown',
    };

    response.status(status).json(body);
  }

  /** Maps HTTP status codes to application error code strings. */
  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHENTICATED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'BUSINESS_LOGIC_ERROR',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
