import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { SevaType } from '../../database/entities/seva-type.entity';
import { Temple } from '../../database/entities/temple.entity';
import { FinanceModule } from '../finance/finance.module';
import { SevaBookingService } from './seva-booking.service';
import { SevaBookingController } from './seva-booking.controller';

/**
 * SevasModule wires the seva booking domain.
 * FiscalYearUtil and ReceiptNumberUtil come from the global CommonModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SevaBooking, SevaType, Temple]),
    FinanceModule,
  ],
  providers: [SevaBookingService],
  controllers: [SevaBookingController],
  exports: [SevaBookingService],
})
export class SevasModule {}
