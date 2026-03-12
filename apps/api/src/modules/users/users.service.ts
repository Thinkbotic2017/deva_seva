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

/** Roles that cannot be assigned via the invite/updateRole endpoints. */
const PROTECTED_ROLES: UserRole[] = [UserRole.SUPER_ADMIN];

/**
 * UsersService manages temple staff: invitations, role changes, and deactivation.
 *
 * Security invariants:
 * - templeId ALWAYS comes from the method parameter (decoded from JWT). Never from dto.
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
   * Throws UnprocessableEntityException if SUPER_ADMIN role is requested.
   *
   * @param templeId   From JWT — never from request body.
   * @param dto        Invite payload.
   * @param invitedBy  userId of the ADMIN issuing the invite.
   */
  async inviteUser(
    templeId: string,
    dto: InviteUserDto,
    invitedBy: string,
  ): Promise<User> {
    if (PROTECTED_ROLES.includes(dto.role)) {
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
      templeId,                // Always from parameter — never from dto
      fullName: dto.fullName,
      phone: dto.phone,
      role: dto.role,
      isActive: true,
      invitedBy,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(
      `User invited: phone=${dto.phone} role=${dto.role} temple=${templeId}`,
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
    if (PROTECTED_ROLES.includes(dto.role)) {
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

    await this.userRepo.update(userId, { role: dto.role });
    this.logger.log(
      `User ${userId} role changed to ${dto.role} in temple ${templeId}`,
    );

    return { ...user, role: dto.role };
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
