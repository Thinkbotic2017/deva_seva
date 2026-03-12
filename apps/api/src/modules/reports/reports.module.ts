import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from '../../database/entities/donation.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { FinanceLedger } from '../../database/entities/finance-ledger.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

/**
 * ReportsModule owns the reporting domain.
 * Reads from Donation, DonationCategory, FinanceLedger, and SevaBooking tables.
 * No writes — all methods are read-only aggregations.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donation,
      DonationCategory,
      FinanceLedger,
      SevaBooking,
    ]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
