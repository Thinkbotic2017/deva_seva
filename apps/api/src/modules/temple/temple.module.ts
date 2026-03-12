import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Temple } from '../../database/entities/temple.entity';
import { DonationCategory } from '../../database/entities/donation-category.entity';
import { FinanceCategory } from '../../database/entities/finance-category.entity';
import { TempleService } from './temple.service';
import { TempleController } from './temple.controller';

/**
 * TempleModule owns the temple management domain.
 * S3Service comes from the global CommonModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Temple, DonationCategory, FinanceCategory]),
  ],
  providers: [TempleService],
  controllers: [TempleController],
  exports: [TempleService],
})
export class TempleModule {}
