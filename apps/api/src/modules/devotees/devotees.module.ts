import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Devotee } from '../../database/entities/devotee.entity';
import { Donation } from '../../database/entities/donation.entity';
import { SevaBooking } from '../../database/entities/seva-booking.entity';
import { DevoteesService } from './devotees.service';
import { DevoteesController } from './devotees.controller';

/**
 * DevoteesModule wires the devotee CRM domain.
 * EncryptionUtil comes from the global CommonModule.
 * Donation and SevaBooking repositories are needed for computing stats.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Devotee, Donation, SevaBooking]),
  ],
  providers: [DevoteesService],
  controllers: [DevoteesController],
  exports: [DevoteesService],
})
export class DevoteesModule {}
