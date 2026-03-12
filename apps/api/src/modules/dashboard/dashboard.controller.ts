import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@devaseva/types';
import {
  DashboardService,
  DashboardStats,
  ActivityItem,
} from './dashboard.service';

/**
 * DashboardController — thin routing layer for dashboard endpoints.
 *
 * Route prefix: /api/v1/dashboard
 * templeId always comes from req.user.templeId (JWT) — never from params.
 */
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/stats
   * Returns the 4 key metrics for the temple dashboard.
   * All queries run in parallel — fast single-round-trip response.
   */
  @Get('stats')
  async getStats(@CurrentUser() user: JwtPayload): Promise<DashboardStats> {
    return this.dashboardService.getStats(user.templeId);
  }

  /**
   * GET /dashboard/activity?limit=20
   * Returns a unified activity feed: last N donations + seva bookings
   * merged and sorted by created_at descending.
   */
  @Get('activity')
  async getRecentActivity(
    @CurrentUser() user: JwtPayload,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<ActivityItem[]> {
    return this.dashboardService.getRecentActivity(user.templeId, limit);
  }
}
