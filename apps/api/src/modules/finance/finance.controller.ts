import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload, UserRole, PaginatedResult } from '@devaseva/types';
import { FinanceService, LedgerSummary } from './finance.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';

/**
 * FinanceController — thin routing layer for manual ledger entry and queries.
 * All business logic lives in FinanceService.
 *
 * Route prefix: /api/v1/finance
 * isAutoPosted=true entries are NEVER created through these endpoints.
 */
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  /**
   * POST /finance/ledger
   * Records a manual INCOME or EXPENSE entry.
   * isAutoPosted is always false for staff-recorded entries.
   * templeId taken from JWT — never from the request body.
   */
  @Post('ledger')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNTANT)
  @HttpCode(HttpStatus.CREATED)
  async createEntry(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLedgerEntryDto,
  ): Promise<FinanceLedger> {
    return this.financeService.createManualEntry(user.templeId, dto, user.sub);
  }

  /**
   * GET /finance/ledger
   * Returns paginated ledger entries with optional filters.
   */
  @Get('ledger')
  async findLedger(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListLedgerQueryDto,
  ): Promise<PaginatedResult<FinanceLedger>> {
    return this.financeService.findLedger(user.templeId, query);
  }

  /**
   * GET /finance/summary
   * Returns income vs expense totals and net balance for a date range or fiscal year.
   * All aggregation is performed in SQL — never in JavaScript.
   */
  @Get('summary')
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() query: FinanceSummaryQueryDto,
  ): Promise<LedgerSummary> {
    return this.financeService.getLedgerSummary(user.templeId, query);
  }
}
