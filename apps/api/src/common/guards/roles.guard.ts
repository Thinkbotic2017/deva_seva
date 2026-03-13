import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { UserRole, JwtPayload } from '@devaseva/types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard checks that the authenticated user's role is in the @Roles() whitelist.
 * Must be used after JwtAuthGuard so req.user is already populated.
 * If no @Roles() is declared on the route, access is allowed (guard is a no-op).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();

    const user = request.user;
    if (!user) throw new ForbiddenException('Access denied');

    if (!requiredRoles.includes(user.role)) {
      // Generic message — do not surface the user's role in 403 responses.
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
