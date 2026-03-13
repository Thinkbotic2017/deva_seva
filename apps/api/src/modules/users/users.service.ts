import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UserRole, PaginatedResult } from '@devaseva/types';
import { toPaginatedResult } from '../../common/utils/pagination.util';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

/**
 * UsersService manages temple staff: invitations, role changes, and deactivation.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
 * - SUPER_ADMIN cannot call inviteUser() — they have no templeId and manage temples,
 *   not users. Use SuperAdminService.inviteTempleAdmin() to onboard the first admin.
 * - SUPER_ADMIN role cannot be assigned via inviteUser() or updateRole().
 * - A user cannot deactivate themselves (requestingUserId !== userId).
 * - Phone uniqueness is scoped per temple — same phone can exist in different temples.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Creates a new staff member record for the temple.
   *
   * The invited user authenticates via OTP on first login — no password.
   * Throws ConflictException if a user with the same phone already exists in this temple.
   * Throws ForbiddenException if the caller is a SUPER_ADMIN (wrong flow).
   *
   * @param templeId    From JWT — never from request body.
   * @param dto         Invite payload.
   * @param invitedBy   userId of the ADMIN issuing the invite.
   * @param callerRole  Role of the user making the request (from JWT).
   */
  async inviteUser(
    templeId: string,
    dto: InviteUserDto,
    invitedBy: string,
    callerRole: UserRole,
  ): Promise<User> {
    // SUPER_ADMIN has no temple_id — they must use the temple onboarding flow.
    if (callerRole === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Super Admin cannot invite temple users. Use the temple onboarding flow.',
      );
    }

    // templeId must be present — all temple-scoped roles must have one.
    if (!templeId) {
      throw new UnprocessableEntityException(
        'templeId is required for inviting a user',
      );
    }

    // Belt-and-suspenders: SUPER_ADMIN must not slip through via DTO either.
    // The DTO's @IsIn() already blocks it, but this is a defence-in-depth check.
    if ((dto.role as string) === UserRole.SUPER_ADMIN) {
      throw new UnprocessableEntityException(
        `Role '${dto.role}' cannot be assigned via invite`,
      );
    }

    // Check uniqueness: phone is unique per temple (not globally)
    const existing = await this.userRepo.findOne({
      where: { templeId, phone: dto.phone },
    });
    if (existing) {
      throw new ConflictException(
        `A user with phone ${dto.phone} already exists in this temple`,
      );
    }

    const user = this.userRepo.create({
      templeId,            // Always from parameter — never from dto
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email,
      role: dto.role as unknown as UserRole,
      isActive: true,
      invitedBy,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(
      `User invited: phone=${dto.phone} role=${dto.role} temple=${templeId} by=${invitedBy}`,
    );
    return saved;
  }

  /**
   * Returns a paginated list of staff members for the temple.
   * templeId guard is mandatory — never list users without it.
   */
  async listUsers(
    templeId: string,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.userRepo
      .createQueryBuilder('u')
      .where('u.temple_id = :templeId', { templeId })
      .andWhere('u.deleted_at IS NULL')
      .orderBy('u.full_name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.role !== undefined) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive: query.isActive });
    }

    const [data, total] = await qb.getManyAndCount();
    return toPaginatedResult(data, total, page, limit);
  }

  /**
   * Changes a staff member's role.
   *
   * Rules:
   * - Cannot assign SUPER_ADMIN — use the platform admin console for that.
   * - The target user must belong to the same temple as the requester.
   *
   * @param templeId   From JWT.
   * @param userId     Target user to update.
   * @param dto        New role.
   */
  async updateRole(
    templeId: string,
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<User> {
    // SUPER_ADMIN cannot be assigned — @IsIn() in the DTO already blocks it,
    // but this is a defence-in-depth guard.
    if ((dto.role as string) === UserRole.SUPER_ADMIN) {
      throw new UnprocessableEntityException(
        `Role '${dto.role}' cannot be assigned`,
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, templeId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    await this.userRepo.update(userId, { role: dto.role as unknown as UserRole });
    this.logger.log(
      `User ${userId} role changed to ${dto.role} in temple ${templeId}`,
    );

    return { ...user, role: dto.role as unknown as UserRole };
  }

  /**
   * Deactivates a staff member (sets isActive=false — not a hard delete).
   *
   * Rules:
   * - A user CANNOT deactivate themselves.
   * - The target user must belong to the same temple as the requester.
   *
   * @param templeId          From JWT.
   * @param userId            Target user to deactivate.
   * @param requestingUserId  The ADMIN making the request (from JWT sub).
   */
  async deactivate(
    templeId: string,
    userId: string,
    requestingUserId: string,
  ): Promise<void> {
    if (userId === requestingUserId) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, templeId },
    });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    if (!user.isActive) {
      // Already deactivated — idempotent, no error
      return;
    }

    await this.userRepo.update(userId, { isActive: false });
    this.logger.log(
      `User ${userId} deactivated in temple ${templeId} by ${requestingUserId}`,
    );
  }
}
