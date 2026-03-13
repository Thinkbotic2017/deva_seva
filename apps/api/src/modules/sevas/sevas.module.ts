import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { SevaType } from '../../database/entities/seva-type.entity';
import { Temple } from '../../database/entities/temple.entity';
import { FinanceModule } from '../finance/finance.module';
import { SevaBookingService } from './seva-booking.service';
import { SevaBookingController } from './seva-booking.controller';
import { SevaTypeService } from './seva-type.service';
import { SevaTypeController } from './seva-type.controller';

/**
 * SevasModule wires both the seva type catalogue and the seva booking domain.
 * FiscalYearUtil and ReceiptNumberUtil come from the global CommonModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SevaBooking, SevaType, Temple]),
    FinanceModule,
  ],
  providers: [SevaBookingService, SevaTypeService],
  controllers: [SevaBookingController, SevaTypeController],
  exports: [SevaBookingService, SevaTypeService],
})
export class SevasModule {}
