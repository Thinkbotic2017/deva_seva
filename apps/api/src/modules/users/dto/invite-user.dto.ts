import {
  IsString,
  IsNotEmpty,
  IsEnum,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@devaseva/types';

/** Roles that an ADMIN is permitted to assign to invited staff. */
const INVITABLE_ROLES = [
  UserRole.ADMIN,
  UserRole.ACCOUNTANT,
  UserRole.COUNTER_STAFF,
  UserRole.INVENTORY_MANAGER,
  UserRole.HEAD_PRIEST,
  UserRole.PRIEST,
  UserRole.TRUSTEE,
];

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  /**
   * Role to assign. SUPER_ADMIN cannot be assigned via this endpoint.
   * Validated at service layer to prevent privilege escalation.
   */
  @IsEnum(UserRole, { message: `Role must be one of: ${INVITABLE_ROLES.join(', ')}` })
  role: UserRole;
}
