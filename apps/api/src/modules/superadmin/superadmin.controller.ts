import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@devaseva/types';
import { MembershipPlan } from '../../database/entities/membership-plan.entity';
import {
  SuperAdminService,
  TempleSummary,
  SystemStats,
  CreatePlanDto,
  UpdatePlanDto,
  ChargePlanDto,
  ExtendPlanDto,
  ChargeResult,
  InviteTempleAdminDto,
  InviteAdminResult,
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

  // ─── Temple listing ────────────────────────────────────────────────────────

  /**
   * GET /superadmin/temples
   * Lists all temples on the platform with plan, billing, and aggregate counts.
   */
  @Get('temples')
  async listTemples(): Promise<TempleSummary[]> {
    return this.superAdminService.listTemples();
  }

  // ─── Temple actions ────────────────────────────────────────────────────────

  /**
   * PATCH /superadmin/temples/:id/suspend
   * Suspends a temple — all its users lose access on next request.
   * Body: { reason?: string }
   */
  @Patch('temples/:id/suspend')
  @HttpCode(HttpStatus.OK)
  async suspendTemple(
    @Param('id') templeId: string,
    @Body() body: { reason?: string },
  ): Promise<TempleSummary> {
    return this.superAdminService.suspendTemple(templeId, body.reason);
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
   * POST /superadmin/temples/:id/invite-admin
   * Creates an ADMIN user for a temple and returns a one-time invite token.
   * Used to onboard the first (or additional) ADMIN for a temple.
   * Body: { phone: string, fullName: string, email?: string }
   */
  @Post('temples/:id/invite-admin')
  @HttpCode(HttpStatus.CREATED)
  async inviteTempleAdmin(
    @Param('id') templeId: string,
    @Body() dto: InviteTempleAdminDto,
  ): Promise<InviteAdminResult> {
    return this.superAdminService.inviteTempleAdmin(templeId, dto);
  }

  /**
   * POST /superadmin/temples/:id/charge
   * Creates a Razorpay payment link for a temple's plan subscription.
   * Body: { planId: string, billingCycle: string }
   */
  @Post('temples/:id/charge')
  @HttpCode(HttpStatus.OK)
  async chargeTemple(
    @Param('id') templeId: string,
    @Body() dto: ChargePlanDto,
  ): Promise<ChargeResult> {
    return this.superAdminService.chargeTemple(templeId, dto);
  }

  /**
   * POST /superadmin/temples/:id/extend
   * Manually extends a temple's plan validity.
   * Body: { months: number, reason: string }
   */
  @Post('temples/:id/extend')
  @HttpCode(HttpStatus.OK)
  async extendTemple(
    @Param('id') templeId: string,
    @Body() dto: ExtendPlanDto,
  ): Promise<TempleSummary> {
    return this.superAdminService.extendTemple(templeId, dto);
  }

  // ─── Membership plan CRUD ──────────────────────────────────────────────────

  /**
   * GET /superadmin/plans
   * Returns all membership plans ordered by sort_order.
   */
  @Get('plans')
  async listPlans(): Promise<MembershipPlan[]> {
    return this.superAdminService.listPlans();
  }

  /**
   * POST /superadmin/plans
   * Creates a new membership plan.
   */
  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto): Promise<MembershipPlan> {
    return this.superAdminService.createPlan(dto);
  }

  /**
   * PATCH /superadmin/plans/:id
   * Updates an existing membership plan.
   */
  @Patch('plans/:id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id') planId: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<MembershipPlan> {
    return this.superAdminService.updatePlan(planId, dto);
  }

  /**
   * DELETE /superadmin/plans/:id
   * Deactivates a plan (soft delete — preserves historical temple references).
   */
  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivatePlan(@Param('id') planId: string): Promise<void> {
    return this.superAdminService.deactivatePlan(planId);
  }

  // ─── System stats ──────────────────────────────────────────────────────────

  /**
   * GET /superadmin/stats
   * Platform-wide metrics: temples, donations, revenue, devotees.
   */
  @Get('stats')
  async getSystemStats(): Promise<SystemStats> {
    return this.superAdminService.getSystemStats();
  }
}
