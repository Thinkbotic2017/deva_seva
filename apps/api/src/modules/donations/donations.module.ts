import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Donation } from '../../database/entities/donation.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { Temple } from '../../database/entities/temple.entity';
import { FinanceModule } from '../finance/finance.module';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';

/**
 * DonationsModule wires the donations domain.
 * S3Service, EncryptionUtil, FiscalYearUtil, ReceiptNumberUtil come from the global CommonModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCategory, Temple]),
    BullModule.registerQueue({ name: 'receipt_generation' }),
    FinanceModule,
  ],
  providers: [DonationsService],
  controllers: [DonationsController],
  exports: [DonationsService],
})
export class DonationsModule {}
