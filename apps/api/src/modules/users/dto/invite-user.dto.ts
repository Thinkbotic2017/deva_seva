import {
  IsString,
  IsNotEmpty,
  IsIn,
  MaxLength,
  Matches,
  IsOptional,
  IsEmail,
} from 'class-validator';

/**
 * Roles that a temple ADMIN is permitted to assign to invited staff.
 * SUPER_ADMIN is intentionally excluded — it is a platform role, not a temple role.
 * It can only be created by another SUPER_ADMIN via the platform admin console.
 */
export const INVITABLE_ROLES = [
  'ADMIN',
  'ACCOUNTANT',
  'COUNTER_STAFF',
  'INVENTORY_MANAGER',
  'HEAD_PRIEST',
  'PRIEST',
  'TRUSTEE',
] as const;

export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export class InviteUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName: string;

  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Phone must be a valid 10-digit Indian mobile number' })
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * Role to assign. Only temple-scoped roles are allowed.
   * SUPER_ADMIN cannot be assigned via this endpoint — use the platform admin console.
   */
  @IsIn(INVITABLE_ROLES, {
    message: `Role must be one of: ${INVITABLE_ROLES.join(', ')}`,
  })
  role: InvitableRole;
}
