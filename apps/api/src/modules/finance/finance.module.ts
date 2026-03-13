import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { FinanceCategory } from '../../database/entities/finance-category.entity';
import { FinanceService } from './finance.service';
import { FinanceCategoryService } from './finance-category.service';
import { FinanceController } from './finance.controller';

/**
 * FinanceModule owns the finance ledger and category domains.
 * Exports FinanceService so DonationsModule and SevasModule can call autoPostIncome().
 */
@Module({
  imports: [TypeOrmModule.forFeature([FinanceLedger, FinanceCategory])],
  providers: [FinanceService, FinanceCategoryService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
