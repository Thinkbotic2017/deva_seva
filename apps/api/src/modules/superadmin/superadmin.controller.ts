import {
  Controller,
  Get,
  Patch,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@devaseva/types';
import {
  SuperAdminService,
  TempleSummary,
  SystemStats,
} from './superadmin.service';

/**
 * SuperAdminController — platform administration endpoints.
 *
 * Route prefix: /api/v1/superadmin
 * ALL routes require SUPER_ADMIN role — enforced by @Roles() + RolesGuard.
 * No templeId scoping — these endpoints see ALL tenant data.
 */
@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  /**
   * GET /superadmin/temples
   * Lists all temples on the platform with plan and status.
   */
  @Get('temples')
  async listTemples(): Promise<TempleSummary[]> {
    return this.superAdminService.listTemples();
  }

  /**
   * PATCH /superadmin/temples/:id/suspend
   * Suspends a temple — all its users lose access on next request.
   */
  @Patch('temples/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendTemple(@Param('id') templeId: string): Promise<TempleSummary> {
    return this.superAdminService.suspendTemple(templeId);
  }

  /**
   * PATCH /superadmin/temples/:id/activate
   * Re-activates a suspended temple.
   */
  @Patch('temples/:id/activate')
  @HttpCode(HttpStatus.OK)
  async activateTemple(@Param('id') templeId: string): Promise<TempleSummary> {
    return this.superAdminService.activateTemple(templeId);
  }

  /**
   * GET /superadmin/stats
   * Platform-wide metrics: total temples, total donations, total revenue.
   */
  @Get('stats')
  async getSystemStats(): Promise<SystemStats> {
    return this.superAdminService.getSystemStats();
  }
}
