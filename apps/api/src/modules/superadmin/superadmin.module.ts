import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { Donation } from '../../database/entities/donation.entity';
import { Devotee } from '../../database/entities/devotee.entity';
import { User } from '../../database/entities/user.entity';
import { MembershipPlan } from '../../database/entities/membership-plan.entity';
import { RazorpayModule } from '../razorpay/razorpay.module';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminController } from './superadmin.controller';
import { SuperAdminScheduler } from './superadmin.scheduler';

/**
 * SuperAdminModule wires platform-level administration.
 * No tenant scoping — intentionally sees all Temple and Donation data.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Temple, Donation, Devotee, MembershipPlan, User]),
    RazorpayModule,
  ],
  providers: [SuperAdminService, SuperAdminScheduler],
  controllers: [SuperAdminController],
})
export class SuperAdminModule {}
