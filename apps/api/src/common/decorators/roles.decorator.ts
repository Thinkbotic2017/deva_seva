import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@devaseva/types';

export const ROLES_KEY = 'roles';

/**
 * Declares which roles are permitted to access a route.
 * Used in conjunction with RolesGuard.
 * Usage: @Roles(UserRole.ADMIN, UserRole.COUNTER_STAFF)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
