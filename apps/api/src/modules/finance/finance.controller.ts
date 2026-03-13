import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload, UserRole, PaginatedResult, FinanceCategoryType } from '@devaseva/types';
import { FinanceService, LedgerSummary } from './finance.service';
import { FinanceCategoryService } from './finance-category.service';
import { CreateFinanceCategoryDto } from './dto/create-finance-category.dto';
import { UpdateFinanceCategoryDto } from './dto/update-finance-category.dto';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { ListLedgerQueryDto } from './dto/list-ledger-query.dto';
import { FinanceSummaryQueryDto } from './dto/finance-summary-query.dto';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { FinanceCategory } from '../../database/entities/finance-category.entity';

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
  constructor(
    private readonly financeService: FinanceService,
    private readonly financeCategoryService: FinanceCategoryService,
  ) {}

  // ─── Finance Categories ────────────────────────────────────────────────────

  /**
   * GET /finance/categories
   * Returns finance categories for the temple.
   * ?type=INCOME|EXPENSE filters by type. ?includeInactive=true for admin/settings.
   * Declared before /ledger and /summary to avoid any possible NestJS route shadowing.
   */
  @Get('categories')
  async findCategories(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: string,
    @Query('includeInactive') includeInactive?: string,
  ): Promise<FinanceCategory[]> {
    return this.financeCategoryService.findAll(
      user.templeId,
      type as FinanceCategoryType | undefined,
      includeInactive === 'true',
    );
  }

  /**
   * POST /finance/categories
   * Creates a new finance category. Admin only.
   */
  @Post('categories')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFinanceCategoryDto,
  ): Promise<FinanceCategory> {
    return this.financeCategoryService.create(user.templeId, dto);
  }

  /**
   * PATCH /finance/categories/:id
   * Updates a finance category. Admin only.
   */
  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  async updateCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCategoryDto,
  ): Promise<FinanceCategory> {
    return this.financeCategoryService.update(user.templeId, id, dto);
  }

  /**
   * DELETE /finance/categories/:id
   * Soft-deletes a finance category (sets isActive=false). Admin only.
   */
  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategory(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.financeCategoryService.deactivate(user.templeId, id);
  }

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
