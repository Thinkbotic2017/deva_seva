import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable, firstValueFrom, isObservable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard protects all routes by default.
 * Routes decorated with @Public() bypass this guard.
 *
 * AuthGuard.canActivate() may return boolean | Promise<boolean> | Observable<boolean>.
 * The Observable case is normalised to Promise<boolean> via firstValueFrom so
 * we never accidentally treat an Observable object (which is truthy) as `true`.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const result = super.canActivate(context);

    if (isObservable(result)) {
      return firstValueFrom(result as Observable<boolean>);
    }

    return result;
  }

  handleRequest<TUser>(err: Error | null, user: TUser): TUser {
    if (err || !user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
