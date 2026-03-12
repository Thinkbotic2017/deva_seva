import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { FinanceService } from './finance.service';

/**
 * FinanceModule exposes FinanceService for use by other modules (Donations, etc.).
 * The TypeOrmModule.forFeature registration is included so future ledger query
 * methods can inject the repository directly.
 */
@Module({
  imports: [TypeOrmModule.forFeature([FinanceLedger])],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
