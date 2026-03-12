import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from '../database/entities/donation.entity';
import { Temple } from '../database/entities/temple.entity';
import { ReceiptGenerationProcessor } from './receipt-generation.processor';
import { WhatsAppDeliveryProcessor } from './whatsapp-delivery.processor';

/**
 * QueuesModule registers and wires all BullMQ job processors.
 *
 * Queue names must match exactly what is used in @InjectQueue() and @Processor()
 * decorators across the codebase:
 *   - 'receipt_generation' — used by DonationsService and SevaBookingService
 *   - 'whatsapp_delivery'  — used by ReceiptGenerationProcessor after PDF upload
 *
 * Both processors are registered here only. CommonModule (global) provides
 * PdfService, GupshupService, and S3Service — no need to re-import.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'receipt_generation' },
      { name: 'whatsapp_delivery' },
    ),
    // Processors inject repositories directly — TypeORM entities declared here
    TypeOrmModule.forFeature([Donation, Temple]),
  ],
  providers: [ReceiptGenerationProcessor, WhatsAppDeliveryProcessor],
})
export class QueuesModule {}
