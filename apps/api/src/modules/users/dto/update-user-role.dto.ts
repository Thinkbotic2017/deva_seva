import { IsEnum } from 'class-validator';
import { UserRole } from '@devaseva/types';

export class UpdateUserRoleDto {
  /** New role to assign. SUPER_ADMIN cannot be assigned via this endpoint. */
  @IsEnum(UserRole)
  role: UserRole;
}
