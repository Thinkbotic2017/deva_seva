import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { Donation } from '../../database/entities/donation.entity';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';

/**
 * SuperAdminModule wires platform-level administration.
 * No tenant scoping — intentionally sees all Temple and Donation data.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Temple, Donation])],
  providers: [SuperAdminService],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
