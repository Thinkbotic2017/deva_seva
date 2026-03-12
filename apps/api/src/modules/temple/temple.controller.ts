import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload } from '@devaseva/types';
import { TempleService, TempleProfile } from './temple.service';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';
import { Temple } from '../../database/entities/temple.entity';

/**
 * TempleController — thin routing layer for temple management endpoints.
 *
 * Route prefix: /api/v1/temples
 * All routes require a valid JWT.
 * templeId always comes from req.user.templeId (JWT) — never from request body.
 */
@Controller('temples')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TempleController {
  constructor(private readonly templeService: TempleService) {}

  /**
   * POST /temples
   * Creates a new temple and seeds default categories.
   * SUPER_ADMIN only — temple creation is a platform operation, not a self-service action.
   */
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateTempleDto): Promise<Temple> {
    return this.templeService.create(dto);
  }

  /**
   * GET /temples/profile
   * Returns the calling user's temple profile (no Razorpay secret).
   * logo_url and banner_url are returned as pre-signed S3 URLs.
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: JwtPayload): Promise<TempleProfile> {
    return this.templeService.getProfile(user.templeId);
  }

  /**
   * PATCH /temples/profile
   * Updates the calling user's temple profile.
   * ADMIN role required — counter staff cannot change temple settings.
   */
  @Patch('profile')
  @Roles(UserRole.ADMIN)
  async update(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateTempleDto,
  ): Promise<TempleProfile> {
    return this.templeService.update(user.templeId, dto);
  }
}
