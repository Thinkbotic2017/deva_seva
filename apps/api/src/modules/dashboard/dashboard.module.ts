import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from '../../database/entities/donation.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { Devotee } from '../../database/entities/devotee.entity';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, SevaBooking, Devotee])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
