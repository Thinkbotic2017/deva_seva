import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '@devaseva/types';

/**
 * Extracts the authenticated user's JWT payload from the request.
 * Usage: @CurrentUser() user: JwtPayload
 *
 * templeId comes exclusively from this decorator — never from the request body.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
