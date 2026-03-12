import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '@devaseva/types';
import {
  ReportsService,
  DonationSummary,
  LedgerReport,
  EightyGReport,
  DaySheet,
} from './reports.service';
import { DonationSummaryQueryDto } from './dto/donation-summary-query.dto';
import { LedgerReportQueryDto } from './dto/ledger-report-query.dto';
import { EightyGReportQueryDto } from './dto/eighty-g-report-query.dto';
import { DaySheetQueryDto } from './dto/day-sheet-query.dto';

/**
 * ReportsController — thin routing layer for report endpoints.
 * All aggregation logic lives in ReportsService.
 *
 * Route prefix: /api/v1/reports
 * All routes require a valid JWT — templeId comes from the token, never from params.
 */
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/donations/summary
   * Returns donation grand total, breakdown by mode, and breakdown by category.
   * Filtered by optional date range; only confirmed donations are included.
   */
  @Get('donations/summary')
  async getDonationSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: DonationSummaryQueryDto,
  ): Promise<DonationSummary> {
    return this.reportsService.getDonationSummary(user.templeId, query);
  }

  /**
   * GET /reports/ledger
   * Returns income vs expense totals from the finance ledger, broken down by fund.
   * Requires a fiscal year — ledger reports are always scoped to a fiscal year.
   */
  @Get('ledger')
  async getLedgerReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: LedgerReportQueryDto,
  ): Promise<LedgerReport> {
    return this.reportsService.getLedgerReport(user.templeId, query);
  }

  /**
   * GET /reports/80g
   * Returns all 80G-eligible donations for a fiscal year.
   * Includes donorPanMasked — donorPanEncrypted is NEVER included in any report.
   * Only CONFIRMED/RECEIPT_GENERATED/RECEIPT_SENT donations appear.
   */
  @Get('80g')
  async get80GReport(
    @CurrentUser() user: JwtPayload,
    @Query() query: EightyGReportQueryDto,
  ): Promise<EightyGReport> {
    return this.reportsService.get80GReport(user.templeId, query);
  }

  /**
   * GET /reports/day-sheet
   * Returns all donations and seva bookings for a given date.
   * Used by counter staff to review the day's activity.
   */
  @Get('day-sheet')
  async getDaySheet(
    @CurrentUser() user: JwtPayload,
    @Query() query: DaySheetQueryDto,
  ): Promise<DaySheet> {
    return this.reportsService.getDaySheet(user.templeId, query);
  }
}
