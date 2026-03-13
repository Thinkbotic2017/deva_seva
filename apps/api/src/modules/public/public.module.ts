import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { SevaType } from '../../database/entities/seva-type.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { DonationsModule } from '../donations/donations.module';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

/**
 * PublicModule serves unauthenticated portal endpoints.
 * All routes use @Public() — no JwtAuthGuard applied.
 * FiscalYearUtil and ReceiptNumberUtil are provided by the global CommonModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Temple, DonationCategory, SevaType, SevaBooking]),
    DonationsModule,
    RazorpayModule,
  ],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
