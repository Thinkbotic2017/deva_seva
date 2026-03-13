import { IsIn } from 'class-validator';
import { INVITABLE_ROLES, InvitableRole } from './invite-user.dto';

export class UpdateUserRoleDto {
  /**
   * New role to assign. SUPER_ADMIN cannot be assigned via this endpoint.
   * Shares the same allow-list as InviteUserDto.
   */
  @IsIn(INVITABLE_ROLES, {
    message: `Role must be one of: ${INVITABLE_ROLES.join(', ')}`,
  })
  role: InvitableRole;
}
