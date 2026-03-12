import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PaginatedResult } from '@devaseva/types';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

/**
 * UsersController — thin routing layer for staff management endpoints.
 *
 * Route prefix: /api/v1/users
 * All routes require a valid JWT.
 * templeId always comes from req.user.templeId (JWT) — never from params or body.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * POST /users/invite
   * Invites a new staff member to the temple.
   * ADMIN only.
   */
  @Post('invite')
  @Roles(UserRole.ADMIN)
  async inviteUser(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteUserDto,
  ): Promise<User> {
    return this.usersService.inviteUser(user.templeId, dto, user.sub);
  }

  /**
   * GET /users
   * Lists all staff members of the temple with pagination.
   * ADMIN and ACCOUNTANT can view the staff list.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<User>> {
    return this.usersService.listUsers(user.templeId, query);
  }

  /**
   * PATCH /users/:id/role
   * Changes the role of a staff member.
   * ADMIN only. Cannot assign SUPER_ADMIN.
   */
  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateRole(user.templeId, userId, dto);
  }

  /**
   * POST /users/:id/deactivate
   * Deactivates a staff member (sets isActive=false).
   * ADMIN only. Cannot deactivate own account.
   */
  @Post(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  async deactivate(
    @CurrentUser() user: JwtPayload,
    @Param('id') userId: string,
  ): Promise<void> {
    return this.usersService.deactivate(user.templeId, userId, user.sub);
  }
}
