import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

/**
 * FinanceModule owns the finance ledger domain.
 * Exports FinanceService so DonationsModule and SevasModule can call autoPostIncome().
 */
@Module({
  imports: [TypeOrmModule.forFeature([FinanceLedger])],
  providers: [FinanceService],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
